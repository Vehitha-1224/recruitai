import logging
from datetime import datetime, timezone
from typing   import List, Optional

from fastapi       import APIRouter, Depends, HTTPException, status
from sqlalchemy    import func
from sqlalchemy.orm import Session

from app.database.connection     import get_db
from app.models.interview        import Interview
from app.models.candidate        import Candidate
from app.models.job              import Job
from app.schemas                 import (
    InterviewCreate, InterviewUpdate,
    InterviewResponse, MessageResponse
)
from app.services.scheduler      import validate_interview_slot

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interviews", tags=["Interviews"])


# ─── HELPER: BUILD RESPONSE ───────────────────────────────────────
def _build_response(iv: Interview) -> InterviewResponse:
    """
    Adds candidate_name and job_title to interview response.
    These come from joined tables — not stored in interviews table.
    """
    resp                = InterviewResponse.from_orm(iv)
    resp.candidate_name = iv.candidate.name      if iv.candidate else None
    resp.job_title      = iv.job.title           if iv.job       else None
    return resp


# ─── GET ALL INTERVIEWS ───────────────────────────────────────────
@router.get("/", response_model=List[InterviewResponse])
def get_all_interviews(
    status_filter: Optional[str] = None,   # # Filter by status
    db:            Session       = Depends(get_db)
):
    """
    Returns all interviews sorted by scheduled date ascending.
    Called by: Schedule page on load.
    """
    query = (
        db.query(Interview)
        .join(Candidate, Interview.candidate_id == Candidate.id)
        .join(Job,       Interview.job_id       == Job.id)
    )

    if status_filter:
        query = query.filter(Interview.status == status_filter)

    # # Soonest first
    interviews = query.order_by(Interview.scheduled_at.asc()).all()
    return [_build_response(iv) for iv in interviews]


# ─── GET TODAY'S INTERVIEWS ───────────────────────────────────────
@router.get("/today", response_model=List[InterviewResponse])
def get_todays_interviews(db: Session = Depends(get_db)):
    """
    Returns only interviews scheduled for today.
    Used by: Dashboard stats.
    """
    now   = datetime.now(timezone.utc)
    today = now.date()

    interviews = (
        db.query(Interview)
        .filter(func.date(Interview.scheduled_at) == today)
        .order_by(Interview.scheduled_at.asc())
        .all()
    )
    return [_build_response(iv) for iv in interviews]


# ─── CREATE INTERVIEW ─────────────────────────────────────────────
@router.post("/", response_model=InterviewResponse,
             status_code=status.HTTP_201_CREATED)
def create_interview(
    data: InterviewCreate,
    db:   Session = Depends(get_db)
):
    """
    Books a new interview slot.

    Step 1: Verify candidate exists
    Step 2: Verify job exists
    Step 3: Check slot availability (no conflicts)
    Step 4: Save interview
    """

    # ── VERIFY CANDIDATE ─────────────────────────────────────────
    candidate = db.query(Candidate).filter(
        Candidate.id == data.candidate_id
    ).first()
    if not candidate:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"Candidate {data.candidate_id} not found"
        )

    # ── VERIFY JOB ───────────────────────────────────────────────
    job = db.query(Job).filter(Job.id == data.job_id).first()
    if not job:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"Job {data.job_id} not found"
        )

    # ── CHECK SLOT AVAILABILITY ───────────────────────────────────
    available, reason = validate_interview_slot(
        db               = db,
        interviewer_name = data.interviewer_name,
        candidate_id     = data.candidate_id,
        scheduled_at     = data.scheduled_at,
    )
    if not available:
        raise HTTPException(
            status_code = status.HTTP_409_CONFLICT,
            detail      = reason
        )

    # ── SAVE INTERVIEW ────────────────────────────────────────────
    new_interview = Interview(
        candidate_id     = data.candidate_id,
        job_id           = data.job_id,
        scheduled_at     = data.scheduled_at,
        interviewer_name = data.interviewer_name,
        notes            = data.notes,
        status           = "scheduled",
    )

    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)

    logger.info(
        f"Interview scheduled: {candidate.name} "
        f"on {data.scheduled_at} with {data.interviewer_name}"
    )

    return _build_response(new_interview)


# ─── UPDATE INTERVIEW ─────────────────────────────────────────────
@router.put("/{interview_id}", response_model=InterviewResponse)
def update_interview(
    interview_id: int,
    data:         InterviewUpdate,
    db:           Session = Depends(get_db)
):
    """Updates interview details or status."""
    interview = db.query(Interview).filter(
        Interview.id == interview_id
    ).first()

    if not interview:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"Interview {interview_id} not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    # # If rescheduling — check new slot is available
    if "scheduled_at" in update_data:
        available, reason = validate_interview_slot(
            db               = db,
            interviewer_name = update_data.get(
                "interviewer_name", interview.interviewer_name
            ),
            candidate_id     = interview.candidate_id,
            scheduled_at     = update_data["scheduled_at"],
            exclude_id       = interview_id,  # # Exclude self from conflict check
        )
        if not available:
            raise HTTPException(
                status_code = status.HTTP_409_CONFLICT,
                detail      = reason
            )

    for field, value in update_data.items():
        setattr(interview, field, value)

    db.commit()
    db.refresh(interview)
    return _build_response(interview)


# ─── CANCEL INTERVIEW ─────────────────────────────────────────────
@router.patch("/{interview_id}/cancel", response_model=InterviewResponse)
def cancel_interview(interview_id: int, db: Session = Depends(get_db)):
    """
    Cancels a scheduled interview.
    Changes status to 'cancelled' — does NOT delete the record.
    """
    interview = db.query(Interview).filter(
        Interview.id == interview_id
    ).first()

    if not interview:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"Interview {interview_id} not found"
        )

    if interview.status == "cancelled":
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = "Interview is already cancelled"
        )

    interview.status = "cancelled"
    db.commit()
    db.refresh(interview)

    logger.info(f"Interview {interview_id} cancelled")
    return _build_response(interview)


# ─── DELETE INTERVIEW ─────────────────────────────────────────────
@router.delete("/{interview_id}", response_model=MessageResponse)
def delete_interview(interview_id: int, db: Session = Depends(get_db)):
    """Permanently removes an interview record."""
    interview = db.query(Interview).filter(
        Interview.id == interview_id
    ).first()

    if not interview:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"Interview {interview_id} not found"
        )

    db.delete(interview)
    db.commit()

    return {"message": f"Interview {interview_id} deleted", "success": True}