import logging
from datetime  import datetime, timezone, timedelta
from typing    import List

from fastapi       import APIRouter, Depends
from sqlalchemy    import func
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.job          import Job
from app.models.candidate    import Candidate
from app.models.interview    import Interview
from app.schemas             import (
    DashboardStats, ActivityItem,
    PipelineCount, ApplicationTrend, TopCandidate
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ─── GET DASHBOARD STATS ──────────────────────────────────────────
@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    """
    Calculates and returns all numbers shown on the Dashboard.
    Called by: Dashboard page on load.
    """
    now       = datetime.now(timezone.utc)
    today     = now.date()
    week_ago  = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # ── BASIC COUNTS ─────────────────────────────────────────────
    # # Total open jobs
    open_jobs = db.query(Job).count()

    # # Total candidates
    total_candidates = db.query(Candidate).count()

    # # Interviews scheduled for today
    interviews_today = db.query(Interview).filter(
        func.date(Interview.scheduled_at) == today,
        Interview.status == "scheduled"
    ).count()

    # # Hired this month
    hired_this_month = db.query(Candidate).filter(
        Candidate.status == "hired",
        Candidate.updated_at >= month_ago
    ).count()

    # # New jobs this week
    new_jobs_this_week = db.query(Job).filter(
        Job.created_at >= week_ago
    ).count()

    # # New candidates today
    new_candidates_today = db.query(Candidate).filter(
        func.date(Candidate.created_at) == today
    ).count()

    # ── OFFER ACCEPTANCE RATE ────────────────────────────────────
    # # What % of candidates who were offered actually got hired
    offered = db.query(Candidate).filter(
        Candidate.status.in_(["offered", "hired"])
    ).count()
    hired   = db.query(Candidate).filter(
        Candidate.status == "hired"
    ).count()
    acceptance_rate = round((hired / offered * 100) if offered > 0 else 0, 1)

    # ── PIPELINE COUNTS ───────────────────────────────────────────
    # # Count of candidates in each stage
    stages = ["applied", "screening", "interview", "offered", "hired", "rejected"]
    pipeline_counts = []

    for stage in stages:
        count = db.query(Candidate).filter(
            Candidate.status == stage
        ).count()
        pipeline_counts.append(
            PipelineCount(stage=stage.capitalize(), count=count)
        )

    # ── APPLICATIONS TREND (last 7 days) ─────────────────────────
    # # How many candidates applied each day
    applications_trend = []
    for i in range(6, -1, -1):  # # 6 days ago to today
        day       = now - timedelta(days=i)
        day_date  = day.date()
        day_count = db.query(Candidate).filter(
            func.date(Candidate.created_at) == day_date
        ).count()
        applications_trend.append(
            ApplicationTrend(
                date  = day.strftime("%d %b"),   # # e.g. "22 Jun"
                count = day_count
            )
        )

    # ── TOP 5 CANDIDATES ─────────────────────────────────────────
    # # Highest AI scores across all jobs
    top_candidates_db = (
        db.query(Candidate)
        .filter(Candidate.ai_score.isnot(None))
        .order_by(Candidate.ai_score.desc())
        .limit(5)
        .all()
    )

    top_candidates = [
        TopCandidate(
            id        = c.id,
            name      = c.name,
            email     = c.email,
            ai_score  = c.ai_score,
            job_title = c.job.title if c.job else None
        )
        for c in top_candidates_db
    ]

    return DashboardStats(
        open_jobs             = open_jobs,
        total_candidates      = total_candidates,
        interviews_today      = interviews_today,
        hired_this_month      = hired_this_month,
        new_jobs_this_week    = new_jobs_this_week,
        new_candidates_today  = new_candidates_today,
        offer_acceptance_rate = acceptance_rate,
        pipeline_counts       = pipeline_counts,
        applications_trend    = applications_trend,
        top_candidates        = top_candidates,
    )


# ─── GET RECENT ACTIVITY ──────────────────────────────────────────
@router.get("/activity", response_model=List[ActivityItem])
def get_activity(db: Session = Depends(get_db)):
    """
    Returns recent activity feed for dashboard.
    Shows last 10 events across candidates and interviews.
    """
    now         = datetime.now(timezone.utc)
    one_week_ago = now - timedelta(days=7)

    activities = []

    # ── RECENT HIRES ─────────────────────────────────────────────
    recent_hired = (
        db.query(Candidate)
        .filter(
            Candidate.status     == "hired",
            Candidate.updated_at >= one_week_ago
        )
        .order_by(Candidate.updated_at.desc())
        .limit(3)
        .all()
    )
    for c in recent_hired:
        activities.append(ActivityItem(
            type    = "success",
            message = f"{c.name} was hired!",
            time    = _time_ago(c.updated_at, now),
        ))

    # ── RECENT APPLICATIONS ───────────────────────────────────────
    recent_applied = (
        db.query(Candidate)
        .filter(Candidate.created_at >= one_week_ago)
        .order_by(Candidate.created_at.desc())
        .limit(5)
        .all()
    )
    for c in recent_applied:
        activities.append(ActivityItem(
            type    = "info",
            message = f"{c.name} applied — AI Score: {c.ai_score}%",
            time    = _time_ago(c.created_at, now),
        ))

    # ── UPCOMING INTERVIEWS ───────────────────────────────────────
    upcoming = (
        db.query(Interview)
        .filter(
            Interview.scheduled_at >= now,
            Interview.status       == "scheduled"
        )
        .order_by(Interview.scheduled_at.asc())
        .limit(3)
        .all()
    )
    for iv in upcoming:
        activities.append(ActivityItem(
            type    = "warning",
            message = (
                f"Interview: {iv.candidate.name} "
                f"with {iv.interviewer_name}"
            ),
            time    = _time_ago(iv.scheduled_at, now),
        ))

    # # Sort by most recent first
    return activities[:10]  # # Return max 10 items


# ─── HELPER: TIME AGO ─────────────────────────────────────────────
def _time_ago(dt: datetime, now: datetime) -> str:
    """
    Converts a datetime to human-readable relative time.
    e.g. "2 hours ago", "3 days ago", "in 1 hour"
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    diff = now - dt

    if diff.total_seconds() < 0:
        # # Future time
        future_diff = dt - now
        hours = int(future_diff.total_seconds() // 3600)
        if hours < 1:
            mins = int(future_diff.total_seconds() // 60)
            return f"in {mins} minutes"
        return f"in {hours} hour{'s' if hours != 1 else ''}"

    seconds = int(diff.total_seconds())
    if seconds < 60:     return "just now"
    if seconds < 3600:   return f"{seconds // 60} minutes ago"
    if seconds < 86400:  return f"{seconds // 3600} hours ago"
    return f"{seconds // 86400} days ago"