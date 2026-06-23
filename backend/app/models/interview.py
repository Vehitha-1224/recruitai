from sqlalchemy import (
    Column, Integer, String,
    DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database.connection import Base


class Interview(Base):
    """
    Represents the 'interviews' table in PostgreSQL.
    Each row = one scheduled interview slot.
    """

    __tablename__ = "interviews"

    # ── COLUMNS ───────────────────────────────────────────────────

    id = Column(Integer, primary_key=True, index=True)

    # # Who is being interviewed
    candidate_id = Column(
        Integer,
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # # For which job position
    job_id = Column(
        Integer,
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # # When the interview is scheduled
    # # Stored in UTC — convert to local time in frontend
    scheduled_at = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True             # # Indexed — we query by date often
    )

    # # Who will conduct the interview
    interviewer_name = Column(String(255), nullable=False)

    # # Current state of the interview
    status = Column(
        String(50),
        nullable=False,
        default="scheduled"
    )

    # # Optional notes from HR about the interview
    notes = Column(Text, nullable=True)

    # # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # ── RELATIONSHIPS ─────────────────────────────────────────────

    # # Link back to candidate and job
    candidate = relationship("Candidate", back_populates="interviews")
    job       = relationship("Job",       back_populates="interviews")

    def __repr__(self):
        return (
            f"<Interview id={self.id} "
            f"candidate_id={self.candidate_id} "
            f"scheduled_at={self.scheduled_at}>"
        )