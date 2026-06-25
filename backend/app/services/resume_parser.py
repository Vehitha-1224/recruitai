import re
import logging
from pathlib import Path
from typing  import Dict, List, Optional, Any

# # PyMuPDF — primary PDF text extractor
import fitz

# # pdfplumber — backup PDF reader
import pdfplumber

logger = logging.getLogger(__name__)

# ─── SKILLS DICTIONARY ────────────────────────────────────────────
KNOWN_SKILLS = {
    # # Frontend
    "react", "reactjs", "vue", "vuejs", "angular",
    "javascript", "typescript", "html", "css", "sass", "tailwind",
    "nextjs", "redux", "webpack",

    # # Backend
    "python", "fastapi", "django", "flask", "nodejs",
    "express", "java", "spring", "springboot", "golang",
    "php", "laravel", "ruby", "rails",

    # # Database
    "postgresql", "mysql", "mongodb", "redis", "sqlite",
    "elasticsearch", "cassandra", "dynamodb",

    # # Cloud & DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
    "jenkins", "linux",

    # # Data & AI
    "machine learning", "deep learning", "tensorflow", "pytorch",
    "pandas", "numpy", "scikit-learn", "nlp",
    "data analysis", "sql", "power bi", "tableau",

    # # Mobile
    "flutter", "react native", "swift", "kotlin", "android", "ios",
}

# ─── REGEX PATTERNS ───────────────────────────────────────────────
EMAIL_PATTERN = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
)

PHONE_PATTERN = re.compile(
    r'(\+91[\s\-]?)?[6-9]\d{9}'
    r'|(\+\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}'
)

EXPERIENCE_PATTERN = re.compile(
    r'(\d+\.?\d*)\s*\+?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp)?',
    re.IGNORECASE
)

DEGREE_KEYWORDS = [
    "b.tech", "btech", "b.e.", "be", "bachelor",
    "m.tech", "mtech", "m.e.", "me", "master",
    "mba", "bca", "mca", "b.sc", "bsc", "m.sc", "msc",
    "phd", "ph.d", "diploma",
]


class ResumeParser:
    """
    Reads a PDF resume and extracts structured information
    using regex patterns — no external AI library needed.
    """

    def __init__(self, file_path: str):
        self.file_path  = Path(file_path)
        self._raw_text: Optional[str] = None

    # ── EXTRACT TEXT FROM PDF ─────────────────────────────────────
    def _extract_text(self) -> str:
        """Tries PyMuPDF first, falls back to pdfplumber."""
        if self._raw_text:
            return self._raw_text

        text = ""

        # # Try PyMuPDF first — faster
        try:
            doc = fitz.open(str(self.file_path))
            for page in doc:
                text += page.get_text()
            doc.close()
            if text.strip():
                self._raw_text = text
                return text
        except Exception as e:
            logger.warning(f"PyMuPDF failed, trying pdfplumber: {e}")

        # # Fallback to pdfplumber
        try:
            with pdfplumber.open(str(self.file_path)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            logger.error(f"Both PDF extractors failed: {e}")
            return ""

        self._raw_text = text
        return text

    # ── EXTRACT NAME ──────────────────────────────────────────────
    def _extract_name(self, text: str) -> str:
        """Name is usually in first 3 lines of resume."""
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        for line in lines[:3]:
            words = line.split()
            if (
                2 <= len(words) <= 5 and
                len(line) <= 60 and
                not re.search(r'\d', line) and
                not re.search(r'@|http|www', line) and
                line[0].isupper()
            ):
                return line.title()
        return lines[0].title() if lines else "Unknown"

    # ── EXTRACT EMAIL ─────────────────────────────────────────────
    def _extract_email(self, text: str) -> Optional[str]:
        matches = EMAIL_PATTERN.findall(text)
        return matches[0].lower() if matches else None

    # ── EXTRACT PHONE ─────────────────────────────────────────────
    def _extract_phone(self, text: str) -> Optional[str]:
        matches = PHONE_PATTERN.findall(text)
        for match in matches:
            phone = match[0] if isinstance(match, tuple) else match
            if phone:
                return re.sub(r'\s+', '', phone)
        return None

    # ── EXTRACT SKILLS ────────────────────────────────────────────
    def _extract_skills(self, text: str) -> List[str]:
        """Scans resume for known skills using word boundary matching."""
        text_lower   = text.lower()
        found_skills = []
        for skill in KNOWN_SKILLS:
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, text_lower):
                found_skills.append(skill.title())
        return sorted(list(set(found_skills)))

    # ── EXTRACT EXPERIENCE ────────────────────────────────────────
    def _extract_experience(self, text: str) -> Optional[float]:
        """Finds years of experience mentioned in resume."""
        matches = EXPERIENCE_PATTERN.findall(text)
        if not matches:
            return None
        years = [float(m) for m in matches if m]
        return max(years) if years else None

    # ── EXTRACT EDUCATION ─────────────────────────────────────────
    def _extract_education(self, text: str) -> Optional[str]:
        """Looks for degree keywords in the resume."""
        text_lower = text.lower()
        for degree in DEGREE_KEYWORDS:
            if degree in text_lower:
                for line in text.split('\n'):
                    if degree in line.lower() and len(line) < 150:
                        return line.strip()
        return None

    # ── MAIN PARSE ────────────────────────────────────────────────
    def parse(self) -> Dict[str, Any]:
        """Runs all extraction steps and returns structured data."""
        logger.info(f"Parsing resume: {self.file_path.name}")
        text = self._extract_text()

        if not text.strip():
            return {
                "name":             "Unknown",
                "email":            None,
                "phone":            None,
                "skills":           [],
                "experience_years": None,
                "education":        None,
                "raw_text":         "",
                "parse_error":      "Could not extract text from PDF",
            }

        result = {
            "name":             self._extract_name(text),
            "email":            self._extract_email(text),
            "phone":            self._extract_phone(text),
            "skills":           self._extract_skills(text),
            "experience_years": self._extract_experience(text),
            "education":        self._extract_education(text),
            "raw_text":         text[:10000],
            "parse_error":      None,
        }

        logger.info(
            f"Parsed: name={result['name']} "
            f"skills={len(result['skills'])} found"
        )
        return result


def parse_resume(file_path: str) -> Dict[str, Any]:
    """Wrapper — creates parser and runs parse()."""
    return ResumeParser(file_path).parse()