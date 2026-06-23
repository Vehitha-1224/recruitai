import logging
from datetime import datetime, timezone, timedelta
from typing   import Optional, Tuple

from sqlalchemy.orm import Session

from app.models.interview import Interview

logger = logging.getLogger(__name__)

# # Minimum gap between interviews for the same interviewer (minutes)
MIN_GAP_MINUTES = 30

# # How long each interview is assumed to last (minutes)
INTERVIEW_DURATION_MINUTES = 60


class Scheduler:
    """
    Manages interview scheduling.
    Prevents double bookings and slot conflicts.
    """

    def __init__(self, db: Session):
        # # Database session — needed to check existing bookings
        self.db = db

    # ── CHECK SLOT AVAILABILITY ───────────────────────────────────
    def is_slot_available(
        self,
        interviewer_name: str,
        scheduled_at:     datetime,
        exclude_id:       Optional[int] = None,
    ) -> Tuple[bool, str]:
        """
        Checks if a time slot is free for the given interviewer.

        Returns:
            (True, "")                → slot is available
            (False, "reason string")  → slot is taken with reason
        """
        # # Define the time window this interview would occupy
        start_time = scheduled_at
        end_time   = scheduled_at + timedelta(minutes=INTERVIEW_DURATION_MINUTES)

        # # Buffer time — prevent back-to-back interviews
        buffer_start = start_time - timedelta(minutes=MIN_GAP_MINUTES)
        buffer_end   = end_time   + timedelta(minutes=MIN_GAP_MINUTES)

        # # Query for any conflicting interviews for this interviewer
        query = self.db.query(Interview).filter(
            Interview.interviewer_name == interviewer_name,
            Interview.status           != "cancelled",   # # Ignore cancelled
            Interview.scheduled_at     >= buffer_start,
            Interview.scheduled_at     <  buffer_end,
        )

        # # If editing an existing interview, exclude it from conflict check
        if exclude_id:
            query = query.filter(Interview.id != exclude_id)

        conflict = query.first()

        if conflict:
            conflict_time = conflict.scheduled_at.strftime("%I:%M %p")
            return False, (
                f"{interviewer_name} already has an interview at "
                f"{conflict_time}. Please choose a different time "
                f"(at least {MIN_GAP_MINUTES} minutes gap required)."
            )

        return True, ""

    # ── CHECK CANDIDATE AVAILABILITY ──────────────────────────────
    def is_candidate_available(
        self,
        candidate_id: int,
        scheduled_at: datetime,
        exclude_id:   Optional[int] = None,
    ) -> Tuple[bool, str]:
        """
        Checks if a candidate already has an interview at the same time.
        """
        start_time = scheduled_at
        end_time   = scheduled_at + timedelta(minutes=INTERVIEW_DURATION_MINUTES)

        query = self.db.query(Interview).filter(
            Interview.candidate_id == candidate_id,
            Interview.status       != "cancelled",
            Interview.scheduled_at >= start_time,
            Interview.scheduled_at <  end_time,
        )

        if exclude_id:
            query = query.filter(Interview.id != exclude_id)

        conflict = query.first()

        if conflict:
            conflict_time = conflict.scheduled_at.strftime("%I:%M %p on %b %d")
            return False, (
                f"Candidate already has an interview scheduled at {conflict_time}."
            )

        return True, ""

    # ── VALIDATE SLOT ─────────────────────────────────────────────
    def validate_slot(
        self,
        interviewer_name: str,
        candidate_id:     int,
        scheduled_at:     datetime,
        exclude_id:       Optional[int] = None,
    ) -> Tuple[bool, str]:
        """
        Runs both availability checks.
        Returns (True, "") if slot is valid, (False, reason) if not.
        """
        # # Check interviewer is free
        ok, reason = self.is_slot_available(
            interviewer_name, scheduled_at, exclude_id
        )
        if not ok:
            return False, reason

        # # Check candidate is free
        ok, reason = self.is_candidate_available(
            candidate_id, scheduled_at, exclude_id
        )
        if not ok:
            return False, reason

        # # Cannot schedule in the past
        if scheduled_at < datetime.now(timezone.utc):
            return False, "Cannot schedule an interview in the past."

        return True, ""


# ─── CONVENIENCE FUNCTION ─────────────────────────────────────────
def validate_interview_slot(
    db:               Session,
    interviewer_name: str,
    candidate_id:     int,
    scheduled_at:     datetime,
    exclude_id:       Optional[int] = None,
) -> Tuple[bool, str]:
    """
    Simple wrapper around Scheduler.validate_slot().
    This is what routes import and call.
    """
    s = Scheduler(db)
    return s.validate_slot(
        interviewer_name = interviewer_name,
        candidate_id     = candidate_id,
        scheduled_at     = scheduled_at,
        exclude_id       = exclude_id,
    )