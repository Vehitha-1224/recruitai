from fastapi   import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing    import List

from app.database.connection import get_db
from app.models.job          import Job
from app.schemas             import JobCreate, JobUpdate, JobResponse, MessageResponse

# # APIRouter groups related routes together
# # prefix="/jobs" means all routes here start with /jobs
# # tags=["Jobs"] groups them in API documentation
router = APIRouter(prefix="/jobs", tags=["Jobs"])


# ─── GET ALL JOBS ─────────────────────────────────────────────────
@router.get("/", response_model=List[JobResponse])
def get_all_jobs(db: Session = Depends(get_db)):
    """
    Returns list of all job postings.
    Sorted by newest first.

    Called by: Jobs page on load, Candidates page for job filter
    """
    # # Query all jobs, newest first
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()

    # # Add candidate_count to each job
    result = []
    for job in jobs:
        job_dict              = JobResponse.from_orm(job)
        job_dict.candidate_count = job.candidate_count
        result.append(job_dict)

    return result


# ─── GET SINGLE JOB ───────────────────────────────────────────────
@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    """
    Returns one specific job by ID.
    Returns 404 if job doesn't exist.
    """
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"Job with id {job_id} not found"
        )

    return job


# ─── CREATE JOB ───────────────────────────────────────────────────
@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(job_data: JobCreate, db: Session = Depends(get_db)):
    """
    Creates a new job posting.
    Validates data using JobCreate schema before saving.

    Called by: Jobs page "Post Job" button
    """
    # # Create SQLAlchemy model from pydantic schema
    new_job = Job(**job_data.model_dump())

    db.add(new_job)
    db.commit()               # # Save to database
    db.refresh(new_job)       # # Reload to get auto-generated id, timestamps

    return new_job


# ─── UPDATE JOB ───────────────────────────────────────────────────
@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id:   int,
    job_data: JobUpdate,
    db:       Session = Depends(get_db)
):
    """
    Updates an existing job posting.
    Only updates fields that are provided (partial update).
    """
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"Job with id {job_id} not found"
        )

    # # Only update fields that were actually provided
    # # exclude_unset=True skips fields not included in request
    update_data = job_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(job, field, value)  # # Update each field on the model

    db.commit()
    db.refresh(job)

    return job


# ─── DELETE JOB ───────────────────────────────────────────────────
@router.delete("/{job_id}", response_model=MessageResponse)
def delete_job(job_id: int, db: Session = Depends(get_db)):
    """
    Deletes a job posting.
    Also deletes all candidates and interviews for this job
    (cascade delete defined in Job model).
    """
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"Job with id {job_id} not found"
        )

    title = job.title  # # Save before deleting
    db.delete(job)
    db.commit()

    return {"message": f'Job "{title}" deleted successfully', "success": True}