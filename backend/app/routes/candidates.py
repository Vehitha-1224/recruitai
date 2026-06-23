import os
import uuid
import logging
from pathlib  import Path
from typing   import List, Optional

from fastapi  import (
    APIRouter, Depends, HTTPException,
    UploadFile, File, Form, status
)
from sqlalchemy.orm import Session

from app.database.connection   import get_db
from app.models.candidate      import Candidate
from app.models.job            import Job
from app.schemas               import (
    CandidateResponse, CandidateStatusUpdate, MessageResponse
)
from app.services.resume_parser import parse_resume
from app.services.ai_scorer     import score_candidate
from app.config                  import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/candidates", tags=["Candidates"])

# ─── ENSURE UPLOAD FOLDER EXISTS ─────────────────────────────────
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


# ─── GET ALL CANDIDATES ───────────────────────────────────────────
@router.get("/", response_model=List[CandidateResponse])
def get_all_candidates(
    status:    Optional[str] = None,   # # Filter by status
    job_id:    Optional[int] = None,   # # Filter by job
    min_score: Optional[float] = None, # # Filter by minimum AI score
    db:        Session = Depends(get_db)
):
    """
    Returns list of candidates with optional filters.
    Sorted by AI score highest first.

    Called by: Candidates page on load and after filter changes
    """
    query = db.query(Candidate)

    # # Apply filters if provided
    if status:
        # # Support comma-separated statuses e.g. "screening,interview"
        statuses = [s.strip() for s in status.split(",")]
        query = query.filter(Candidate.status.in_(statuses))

    if job_id:
        query = query.filter(Candidate.job_id == job_id)

    if min_score is not None:
        query = query.filter(Candidate.ai_score >= min_score)

    # # Sort by AI score descending (best candidates first)
    candidates = query.order_by(Candidate.ai_score.desc().nullslast()).all()

    # # Add job_title to each candidate response
    result = []
    for c in candidates:
        c_dict           = CandidateResponse.from_orm(c)
        c_dict.job_title = c.job.title if c.job else None
        result.append(c_dict)

    return result


# ─── GET SINGLE CANDIDATE ─────────────────────────────────────────
@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Returns one candidate's full profile."""
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id
    ).first()

    if not candidate:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"Candidate with id {candidate_id} not found"
        )

    response           = CandidateResponse.from_orm(candidate)
    response.job_title = candidate.job.title if candidate.job else None
    return response


# ─── UPLOAD RESUME ────────────────────────────────────────────────
@router.post("/upload", response_model=CandidateResponse,
             status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file:   UploadFile = File(...),     # # The PDF file
    job_id: int        = Form(...),     # # Which job they applied for
    db:     Session    = Depends(get_db)
):
    """
    The most important endpoint — handles resume upload and AI processing.

    Step 1: Validate file (PDF only, size limit)
    Step 2: Save PDF to uploads/ folder
    Step 3: Parse resume text with resume_parser
    Step 4: Score candidate with ai_scorer
    Step 5: Check for duplicate email
    Step 6: Save candidate to database
    Step 7: Return candidate data to frontend
    """

    # ── STEP 1: VALIDATE FILE ────────────────────────────────────
    # # Only accept PDF files
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = "Only PDF files are accepted"
        )

    # # Read file content to check size
    content = await file.read()

    # # Check file size
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit"
        )

    # ── STEP 2: VALIDATE JOB EXISTS ──────────────────────────────
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"Job with id {job_id} not found"
        )

    # ── STEP 3: SAVE PDF FILE ─────────────────────────────────────
    # # Generate unique filename to prevent collisions
    # # uuid4() creates a random unique ID e.g. "a3f2c1d4..."
    unique_id    = uuid.uuid4().hex[:8]
    safe_name    = "".join(
        c for c in file.filename if c.isalnum() or c in "._- "
    ).rstrip()
    filename     = f"{unique_id}_{safe_name}"
    file_path    = Path(settings.UPLOAD_DIR) / filename

    # # Write file to disk
    with open(file_path, "wb") as f:
        f.write(content)

    logger.info(f"Saved resume: {filename}")

    try:
        # ── STEP 4: PARSE RESUME ─────────────────────────────────
        parse_result = parse_resume(str(file_path))

        if parse_result.get("parse_error"):
            logger.warning(f"Parse warning: {parse_result['parse_error']}")

        # ── STEP 5: SCORE CANDIDATE ──────────────────────────────
        score_result = score_candidate(
            resume_data    = parse_result,
            job_skills     = job.skills_required,
            job_experience = None,    # # Add to Job model if needed
            job_education  = None,
        )

        # ── STEP 6: CHECK DUPLICATE EMAIL ────────────────────────
        email = parse_result.get("email")
        if email:
            existing = db.query(Candidate).filter(
                Candidate.email == email,
                Candidate.job_id == job_id
            ).first()

            if existing:
                # # Clean up the uploaded file since we won't use it
                os.remove(file_path)
                raise HTTPException(
                    status_code = status.HTTP_409_CONFLICT,
                    detail      = (
                        f"A candidate with email {email} "
                        f"already applied for this job"
                    )
                )

        # ── STEP 7: SAVE TO DATABASE ──────────────────────────────
        new_candidate = Candidate(
            name             = parse_result.get("name", file.filename),
            email            = email or f"unknown_{unique_id}@placeholder.com",
            resume_path      = str(file_path),
            ai_score         = score_result["ai_score"],
            skills           = parse_result.get("skills", []),
            experience_years = parse_result.get("experience_years"),
            education        = parse_result.get("education"),
            resume_text      = parse_result.get("raw_text", ""),
            job_id           = job_id,
            status           = "applied",
        )

        db.add(new_candidate)
        db.commit()
        db.refresh(new_candidate)

        logger.info(
            f"New candidate: {new_candidate.name} "
            f"score={new_candidate.ai_score}"
        )

        # # Build response with job title
        response           = CandidateResponse.from_orm(new_candidate)
        response.job_title = job.title
        return response

    except HTTPException:
        raise    # # Re-raise HTTP errors as-is

    except Exception as e:
        # # Something unexpected went wrong — clean up file and report
        if file_path.exists():
            os.remove(file_path)
        logger.error(f"Resume upload failed: {e}")
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail      = f"Failed to process resume: {str(e)}"
        )


# ─── UPDATE CANDIDATE STATUS ──────────────────────────────────────
@router.patch("/{candidate_id}/status", response_model=CandidateResponse)
def update_status(
    candidate_id: int,
    data:         CandidateStatusUpdate,
    db:           Session = Depends(get_db)
):
    """
    Updates candidate's hiring stage.
    Called when HR drags candidate in pipeline or changes status dropdown.
    """
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id
    ).first()

    if not candidate:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"Candidate {candidate_id} not found"
        )

    candidate.status = data.status
    db.commit()
    db.refresh(candidate)

    response           = CandidateResponse.from_orm(candidate)
    response.job_title = candidate.job.title if candidate.job else None
    return response


# ─── DELETE CANDIDATE ─────────────────────────────────────────────
@router.delete("/{candidate_id}", response_model=MessageResponse)
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """
    Removes a candidate from the system.
    Also deletes their resume PDF file from disk.
    """
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id
    ).first()

    if not candidate:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"Candidate {candidate_id} not found"
        )

    name = candidate.name

    # # Delete PDF file from disk
    resume_file = Path(candidate.resume_path)
    if resume_file.exists():
        os.remove(resume_file)
        logger.info(f"Deleted resume file: {resume_file}")

    db.delete(candidate)
    db.commit()

    return {"message": f"Candidate {name} removed", "success": True}