from sqlalchemy import Column, Integer, String, Text, DateTime, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

# # Import Base — all models inherit from this
from app.database.connection import Base


class Job(Base):
    """
    Represents the 'jobs' table in PostgreSQL.
    Each row = one job posting.
    """

    # # The actual table name in PostgreSQL
    __tablename__ = "jobs"

    # ── COLUMNS ───────────────────────────────────────────────────

    # # Primary key — auto-increments with each new job
    id = Column(Integer, primary_key=True, index=True)

    # # Job title — required, indexed for fast search
    title = Column(String(255), nullable=False, index=True)

    # # Full job description — can be very long
    description = Column(Text, nullable=False)

    # # Array of skill strings e.g. ["React", "Python", "SQL"]
    # # ARRAY(String) is a PostgreSQL-specific column type
    skills_required = Column(ARRAY(String), nullable=False, default=[])

    # # Salary range — both optional
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)

    # # Where the job is located
    location = Column(String(255), nullable=True)

    # # Type of employment
    # # CHECK constraint limits to valid values
    job_type = Column(
        String(50),
        nullable=False,
        default="full-time"
    )

    # # Timestamps — set automatically
    # # timezone.utc ensures consistent time regardless of server location
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
    # # One job can have many candidates
    # # back_populates links to Candidate.job
    # # cascade="all, delete-orphan" → deleting job deletes its candidates
    candidates = relationship(
        "Candidate",
        back_populates="job",
        cascade="all, delete-orphan",
        lazy="dynamic"         # # Don't load candidates until explicitly asked
    )

    # # One job can have many interviews
    interviews = relationship(
        "Interview",
        back_populates="job",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    def __repr__(self):
        # # Useful for debugging — shows in logs and Python shell
        return f"<Job id={self.id} title='{self.title}'>"

    @property
    def candidate_count(self):
        # # Count candidates for this job without loading them all
        return self.candidates.count()