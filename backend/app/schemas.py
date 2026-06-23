from pydantic import BaseModel, EmailStr, Field, validator
from typing   import List, Optional, Any
from datetime import datetime


# ═══════════════════════════════════════════════════════════════════
#  JOB SCHEMAS
#  Define the shape of data for job-related API requests/responses
# ═══════════════════════════════════════════════════════════════════

class JobCreate(BaseModel):
    """Data required to CREATE a new job posting."""
    title:           str       = Field(..., min_length=2, max_length=255)
    description:     str       = Field(..., min_length=10)
    skills_required: List[str] = Field(..., min_items=1)
    salary_min:      Optional[int]   = None
    salary_max:      Optional[int]   = None
    location:        Optional[str]   = None
    job_type:        str             = Field(default="full-time")

    @validator("job_type")
    def validate_job_type(cls, v):
        # # Only accept these 4 values
        allowed = {"full-time", "part-time", "contract", "internship"}
        if v not in allowed:
            raise ValueError(f"job_type must be one of {allowed}")
        return v

    @validator("salary_max")
    def salary_max_gt_min(cls, v, values):
        # # Max salary must be greater than min
        if v and values.get("salary_min") and v < values["salary_min"]:
            raise ValueError("salary_max must be greater than salary_min")
        return v


class JobUpdate(BaseModel):
    """Data for UPDATING an existing job — all fields optional."""
    title:           Optional[str]       = None
    description:     Optional[str]       = None
    skills_required: Optional[List[str]] = None
    salary_min:      Optional[int]       = None
    salary_max:      Optional[int]       = None
    location:        Optional[str]       = None
    job_type:        Optional[str]       = None


class JobResponse(BaseModel):
    """Shape of data returned when reading a job."""
    id:              int
    title:           str
    description:     str
    skills_required: List[str]
    salary_min:      Optional[int]
    salary_max:      Optional[int]
    location:        Optional[str]
    job_type:        str
    candidate_count: Optional[int] = 0
    created_at:      datetime
    updated_at:      datetime

    class Config:
        # # Tells pydantic to read from SQLAlchemy model objects
        from_attributes = True


# ═══════════════════════════════════════════════════════════════════
#  CANDIDATE SCHEMAS
# ═══════════════════════════════════════════════════════════════════

class CandidateStatusUpdate(BaseModel):
    """Used when HR changes a candidate's hiring stage."""
    status: str

    @validator("status")
    def validate_status(cls, v):
        allowed = {
            "applied", "screening", "interview",
            "offered", "hired", "rejected"
        }
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


class CandidateResponse(BaseModel):
    """Shape of data returned when reading a candidate."""
    id:               int
    name:             str
    email:            str
    ai_score:         Optional[float]
    status:           str
    skills:           List[str]
    experience_years: Optional[float]
    education:        Optional[str]
    resume_path:      str
    job_id:           int
    job_title:        Optional[str] = None   # # From joined Job table
    created_at:       datetime
    updated_at:       datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════════
#  INTERVIEW SCHEMAS
# ═══════════════════════════════════════════════════════════════════

class InterviewCreate(BaseModel):
    """Data required to CREATE a new interview booking."""
    candidate_id:     int
    job_id:           int
    scheduled_at:     datetime
    interviewer_name: str = Field(..., min_length=2, max_length=255)
    notes:            Optional[str] = None


class InterviewUpdate(BaseModel):
    """Data for UPDATING an existing interview — all optional."""
    scheduled_at:     Optional[datetime] = None
    interviewer_name: Optional[str]      = None
    status:           Optional[str]      = None
    notes:            Optional[str]      = None

    @validator("status")
    def validate_status(cls, v):
        if v is None:
            return v
        allowed = {"scheduled", "completed", "cancelled", "no_show"}
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


class InterviewResponse(BaseModel):
    """Shape of data returned when reading an interview."""
    id:               int
    candidate_id:     int
    job_id:           int
    scheduled_at:     datetime
    interviewer_name: str
    status:           str
    notes:            Optional[str]
    candidate_name:   Optional[str] = None   # # From joined Candidate
    job_title:        Optional[str] = None   # # From joined Job
    created_at:       datetime
    updated_at:       datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════════
#  DASHBOARD SCHEMAS
# ═══════════════════════════════════════════════════════════════════

class PipelineCount(BaseModel):
    """One bar in the pipeline overview chart."""
    stage: str
    count: int


class ApplicationTrend(BaseModel):
    """One point on the applications over time chart."""
    date:  str
    count: int


class TopCandidate(BaseModel):
    """One row in the top candidates list."""
    id:        int
    name:      str
    email:     str
    ai_score:  float
    job_title: Optional[str]


class DashboardStats(BaseModel):
    """All numbers shown on the Dashboard page."""
    open_jobs:              int
    total_candidates:       int
    interviews_today:       int
    hired_this_month:       int
    new_jobs_this_week:     int
    new_candidates_today:   int
    offer_acceptance_rate:  float
    pipeline_counts:        List[PipelineCount]
    applications_trend:     List[ApplicationTrend]
    top_candidates:         List[TopCandidate]


class ActivityItem(BaseModel):
    """One item in the recent activity feed."""
    type:    str    # # "success" | "warning" | "info"
    message: str
    time:    str


# ─── GENERIC RESPONSE ─────────────────────────────────────────────
class MessageResponse(BaseModel):
    """Simple success/message response."""
    message: str
    success: bool = True
    data:    Optional[Any] = None