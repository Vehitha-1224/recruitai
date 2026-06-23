from sqlalchemy import (
    Column, Integer, String, Float,
    DateTime, ForeignKey, Text, ARRAY
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database.connection import Base


class Candidate(Base):
    """
    Represents the 'candidates' table in PostgreSQL.
    Each row = one job applicant with their resume data and AI score.
    """

    __tablename__ = "candidates"

    # ── COLUMNS ───────────────────────────────────────────────────

    id = Column(Integer, primary_key=True, index=True)

    # # Applicant's full name — extracted from resume by AI
    name = Column(String(255), nullable=False, index=True)

    # # Email — extracted from resume, must be unique
    email = Column(String(255), nullable=False, unique=True, index=True)

    # # Path to PDF file on disk e.g. "uploads/john_doe_resume.pdf"
    resume_path = Column(String(500), nullable=False)

    # # AI match score — 0.0 to 100.0
    # # Calculated by ai_scorer.py after resume is parsed
    ai_score = Column(Float, nullable=True)

    # # Current hiring stage
    status = Column(
        String(50),
        nullable=False,
        default="applied",
        index=True             # # Indexed because we filter by status often
    )

    # # Skills extracted from resume e.g. ["Python", "React", "Docker"]
    skills = Column(ARRAY(String), nullable=False, default=[])

    # # Years of experience — extracted from resume
    experience_years = Column(Float, nullable=True)

    # # Highest education level found in resume
    education = Column(String(500), nullable=True)

    # # Raw text extracted from the PDF — stored for re-processing later
    resume_text = Column(Text, nullable=True)

    # # Which job this candidate applied for
    # # ForeignKey links this to the jobs table
    job_id = Column(
        Integer,
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

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

    # # Many candidates belong to one job
    job = relationship("Job", back_populates="candidates")

    # # One candidate can have many interviews
    interviews = relationship(
        "Interview",
        back_populates="candidate",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    def __repr__(self):
        return f"<Candidate id={self.id} name='{self.name}' score={self.ai_score}>"