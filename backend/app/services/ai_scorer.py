import logging
import re
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class AIScorer:
    """
    Scores a candidate's resume against a job's requirements.

    Scoring breakdown:
    ─────────────────────────────────────
    Skills match        → 50% of total score
    Experience match    → 30% of total score
    Education match     → 20% of total score
    ─────────────────────────────────────
    Final score: 0 to 100
    """

    # # Weight for each scoring category (must add up to 1.0)
    WEIGHTS = {
        "skills":     0.50,
        "experience": 0.30,
        "education":  0.20,
    }

    # ── EDUCATION TIER MAP ────────────────────────────────────────
    # # Higher number = higher qualification
    EDUCATION_TIERS = {
        "phd":      5,
        "ph.d":     5,
        "master":   4,
        "m.tech":   4,
        "mtech":    4,
        "mba":      4,
        "mca":      3,
        "bachelor": 3,
        "b.tech":   3,
        "btech":    3,
        "b.e":      3,
        "bca":      2,
        "b.sc":     2,
        "diploma":  1,
    }

    def __init__(
        self,
        resume_data:    Dict[str, Any],
        job_skills:     List[str],
        job_experience: Optional[float] = None,
        job_education:  Optional[str]   = None,
    ):
        """
        Args:
            resume_data:    Output from resume_parser.parse()
            job_skills:     List of required skills from job posting
            job_experience: Minimum years of experience required
            job_education:  Minimum education level required
        """
        self.resume_data    = resume_data
        self.job_skills     = [s.lower() for s in (job_skills or [])]
        self.job_experience = job_experience or 0
        self.job_education  = (job_education or "").lower()

    # ── SCORE SKILLS ──────────────────────────────────────────────
    def _score_skills(self) -> float:
        """
        Compares candidate's skills with job's required skills.
        Returns a score from 0.0 to 100.0.

        Example:
            Job needs:       Python, React, SQL, Docker (4 skills)
            Candidate has:   Python, React, SQL (3 skills)
            Match:           3/4 = 75.0
        """
        if not self.job_skills:
            # # Job has no skill requirements — everyone gets full marks
            return 100.0

        candidate_skills = [
            s.lower()
            for s in self.resume_data.get("skills", [])
        ]

        if not candidate_skills:
            return 0.0

        matched = 0
        for required_skill in self.job_skills:
            # # Check for exact match or partial match
            # # e.g. "react" matches "reactjs" or "react.js"
            for candidate_skill in candidate_skills:
                if (
                    required_skill in candidate_skill or
                    candidate_skill in required_skill
                ):
                    matched += 1
                    break   # # Count each required skill only once

        score = (matched / len(self.job_skills)) * 100
        logger.debug(f"Skills score: {matched}/{len(self.job_skills)} = {score:.1f}")
        return round(score, 1)

    # ── SCORE EXPERIENCE ──────────────────────────────────────────
    def _score_experience(self) -> float:
        """
        Compares candidate's years of experience with job requirement.
        Returns a score from 0.0 to 100.0.

        Example:
            Job requires:   3 years
            Candidate has:  2 years
            Score:          (2/3) * 100 = 66.7

        Bonus: extra experience over requirement gets partial credit
        """
        if self.job_experience <= 0:
            # # No experience requirement — everyone gets full marks
            return 100.0

        candidate_exp = self.resume_data.get("experience_years") or 0

        if candidate_exp <= 0:
            return 0.0

        if candidate_exp >= self.job_experience:
            # # Meets or exceeds requirement
            # # Give small bonus for extra experience (max 10%)
            extra = candidate_exp - self.job_experience
            bonus = min(extra * 5, 10)          # # 5% per extra year, max 10%
            return min(100.0, 100.0 + bonus)

        # # Below requirement — proportional score
        score = (candidate_exp / self.job_experience) * 100
        logger.debug(f"Experience score: {candidate_exp}/{self.job_experience}y = {score:.1f}")
        return round(score, 1)

    # ── SCORE EDUCATION ───────────────────────────────────────────
    def _score_education(self) -> float:
        """
        Compares candidate's education level with job requirement.
        Returns a score from 0.0 to 100.0.
        """
        candidate_edu = (
            self.resume_data.get("education") or ""
        ).lower()

        if not self.job_education:
            # # No education requirement
            return 100.0

        if not candidate_edu:
            # # Cannot determine candidate's education
            return 50.0  # # Give benefit of doubt

        # # Get tier numbers for comparison
        candidate_tier = 0
        required_tier  = 0

        for keyword, tier in self.EDUCATION_TIERS.items():
            if keyword in candidate_edu:
                candidate_tier = max(candidate_tier, tier)
            if keyword in self.job_education:
                required_tier = max(required_tier, tier)

        if required_tier == 0:
            # # Cannot parse requirement
            return 100.0

        if candidate_tier >= required_tier:
            return 100.0

        if candidate_tier == 0:
            return 30.0  # # Has education but can't determine level

        # # Below requirement but has some education
        score = (candidate_tier / required_tier) * 100
        logger.debug(f"Education score: {candidate_tier}/{required_tier} = {score:.1f}")
        return round(score, 1)

    # ── MAIN SCORE METHOD ─────────────────────────────────────────
    def calculate(self) -> Dict[str, Any]:
        """
        Runs all scoring functions and combines them using weights.
        Returns final score and breakdown for transparency.

        Called by: candidates.py route after resume is parsed
        """
        skills_score     = self._score_skills()
        experience_score = self._score_experience()
        education_score  = self._score_education()

        # # Weighted average
        total = (
            skills_score     * self.WEIGHTS["skills"]     +
            experience_score * self.WEIGHTS["experience"] +
            education_score  * self.WEIGHTS["education"]
        )

        # # Round to 1 decimal place, cap at 100
        final_score = round(min(total, 100.0), 1)

        result = {
            "ai_score":    final_score,
            "breakdown": {
                "skills":     round(skills_score,     1),
                "experience": round(experience_score, 1),
                "education":  round(education_score,  1),
            }
        }

        logger.info(
            f"AI Score: {final_score} "
            f"(skills={skills_score}, "
            f"exp={experience_score}, "
            f"edu={education_score})"
        )

        return result


# ─── CONVENIENCE FUNCTION ─────────────────────────────────────────
def score_candidate(
    resume_data:    Dict[str, Any],
    job_skills:     List[str],
    job_experience: Optional[float] = None,
    job_education:  Optional[str]   = None,
) -> Dict[str, Any]:
    """
    Simple wrapper — creates scorer and runs calculate().
    This is what other files import and call.
    """
    scorer = AIScorer(
        resume_data    = resume_data,
        job_skills     = job_skills,
        job_experience = job_experience,
        job_education  = job_education,
    )
    return scorer.calculate()