import re
import logging
from pathlib import Path
from typing  import Dict, List, Optional, Any

# # fitz = PyMuPDF — our primary PDF text extractor
import fitz

# # pdfplumber — backup PDF reader for complex layouts
import pdfplumber

logger = logging.getLogger(__name__)

# ─── SKILLS DICTIONARY ────────────────────────────────────────────
# # Master list of skills our parser looks for in resumes
# # Add more as needed for your industry
KNOWN_SKILLS = {
    # # Frontend
    "react", "reactjs", "react.js", "vue", "vuejs", "angular",
    "javascript", "typescript", "html", "css", "sass", "tailwind",
    "nextjs", "next.js", "redux", "webpack",

    # # Backend
    "python", "fastapi", "django", "flask", "node.js", "nodejs",
    "express", "java", "spring", "springboot", "golang", "go",
    "php", "laravel", "ruby", "rails",

    # # Database
    "postgresql", "mysql", "mongodb", "redis", "sqlite",
    "elasticsearch", "cassandra", "dynamodb",

    # # Cloud & DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
    "ci/cd", "jenkins", "github actions", "linux",

    # # Data & AI
    "machine learning", "deep learning", "tensorflow", "pytorch",
    "pandas", "numpy", "scikit-learn", "nlp", "computer vision",
    "data analysis", "sql", "power bi", "tableau",

    # # Mobile
    "flutter", "react native", "swift", "kotlin", "android", "ios",
}

# ─── EMAIL PATTERN ────────────────────────────────────────────────
EMAIL_PATTERN = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
)

# ─── PHONE PATTERN ────────────────────────────────────────────────
PHONE_PATTERN = re.compile(
    r'(\+91[\s\-]?)?[6-9]\d{9}'   # # Indian mobile numbers
    r'|(\+\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}'  # # International
)

# ─── EXPERIENCE PATTERN ───────────────────────────────────────────
# # Finds strings like "3 years", "5+ years", "2.5 years experience"
EXPERIENCE_PATTERN = re.compile(
    r'(\d+\.?\d*)\s*\+?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp)?',
    re.IGNORECASE
)

# ─── EDUCATION KEYWORDS ───────────────────────────────────────────
DEGREE_KEYWORDS = [
    "b.tech", "btech", "b.e.", "be", "bachelor",
    "m.tech", "mtech", "m.e.", "me", "master",
    "mba", "bca", "mca", "b.sc", "bsc", "m.sc", "msc",
    "phd", "ph.d", "diploma",
]


class ResumeParser:
    """
    Reads a PDF resume and extracts structured information:
    - Name
    - Email
    - Phone
    - Skills
    - Years of experience
    - Education
    - Raw text (for AI scoring)
    """

    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        # # Will hold all extracted text from PDF
        self._raw_text: Optional[str] = None

    # ── STEP 1: EXTRACT TEXT FROM PDF ────────────────────────────
    def _extract_text(self) -> str:
        """
        Tries PyMuPDF first (faster), falls back to pdfplumber.
        Returns all text from the PDF as one string.
        """
        if self._raw_text:
            # # Already extracted — don't repeat work
            return self._raw_text

        text = ""

        # # Try PyMuPDF first
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

    # ── STEP 2: EXTRACT NAME ──────────────────────────────────────
    def _extract_name(self, text: str) -> str:
        """
        Tries to find the candidate's name.
        Strategy: name is usually in the first 3 lines of a resume.
        """
        lines = [
            line.strip()
            for line in text.split('\n')
            if line.strip()          # # Skip empty lines
        ]

        # # Check first 3 non-empty lines
        for line in lines[:3]:
            # # Name line should be 2-5 words, no numbers, not too long
            words = line.split()
            if (
                2 <= len(words) <= 5 and
                len(line) <= 60 and
                not re.search(r'\d', line) and          # # No numbers in name
                not re.search(r'@|http|www', line) and  # # Not email/URL
                line[0].isupper()                        # # Starts with capital
            ):
                return line.title()  # # Capitalize each word

        # # Fallback — return first line
        return lines[0].title() if lines else "Unknown"

    # ── STEP 3: EXTRACT EMAIL ─────────────────────────────────────
    def _extract_email(self, text: str) -> Optional[str]:
        """Finds email address using regex pattern."""
        matches = EMAIL_PATTERN.findall(text)
        return matches[0].lower() if matches else None

    # ── STEP 4: EXTRACT PHONE ─────────────────────────────────────
    def _extract_phone(self, text: str) -> Optional[str]:
        """Finds phone number using regex pattern."""
        matches = PHONE_PATTERN.findall(text)
        # # findall returns tuples — get the full match string
        for match in matches:
            phone = match[0] if isinstance(match, tuple) else match
            if phone:
                return re.sub(r'\s+', '', phone)  # # Remove spaces
        return None

    # ── STEP 5: EXTRACT SKILLS ────────────────────────────────────
    def _extract_skills(self, text: str) -> List[str]:
        """
        Scans resume text for known skills from our KNOWN_SKILLS list.
        Case-insensitive matching.
        """
        text_lower = text.lower()
        found_skills = []

        for skill in KNOWN_SKILLS:
            # # Use word boundary to avoid partial matches
            # # e.g. "go" should not match inside "django"
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, text_lower):
                # # Store in proper case for display
                found_skills.append(skill.title())

        # # Sort alphabetically for consistency
        return sorted(list(set(found_skills)))

    # ── STEP 6: EXTRACT EXPERIENCE ───────────────────────────────
    def _extract_experience(self, text: str) -> Optional[float]:
        """
        Finds mentions of years of experience.
        Returns the highest number found (most likely total experience).
        """
        matches = EXPERIENCE_PATTERN.findall(text)
        if not matches:
            return None

        # # Convert all found numbers to float
        years = [float(m) for m in matches if m]

        # # Return highest value found
        # # (prevents picking up "1 year in college" over "5 years total")
        return max(years) if years else None

    # ── STEP 7: EXTRACT EDUCATION ────────────────────────────────
    def _extract_education(self, text: str) -> Optional[str]:
        """
        Looks for degree keywords in the resume.
        Returns the first degree found.
        """
        text_lower = text.lower()

        for degree in DEGREE_KEYWORDS:
            if degree in text_lower:
                # # Find the line containing this degree keyword
                for line in text.split('\n'):
                    if degree in line.lower() and len(line) < 150:
                        return line.strip()

        return None

    # ── MAIN PARSE METHOD ─────────────────────────────────────────
    def parse(self) -> Dict[str, Any]:
        """
        Main method — runs all extraction steps.
        Returns a dictionary with all extracted information.

        Called by: candidates.py route after file is saved
        Output passed to: ai_scorer.py for scoring
        """
        logger.info(f"Parsing resume: {self.file_path.name}")

        # # First extract all text from PDF
        text = self._extract_text()

        if not text.strip():
            logger.error(f"No text extracted from {self.file_path.name}")
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

        # # Run all extractors
        result = {
            "name":             self._extract_name(text),
            "email":            self._extract_email(text),
            "phone":            self._extract_phone(text),
            "skills":           self._extract_skills(text),
            "experience_years": self._extract_experience(text),
            "education":        self._extract_education(text),
            "raw_text":         text[:10000],  # # Store first 10k chars
            "parse_error":      None,
        }

        logger.info(
            f"Parsed: name={result['name']} "
            f"email={result['email']} "
            f"skills={len(result['skills'])} found"
        )

        return result


# ─── CONVENIENCE FUNCTION ─────────────────────────────────────────
def parse_resume(file_path: str) -> Dict[str, Any]:
    """
    Simple wrapper — creates a ResumeParser and runs parse().
    This is what other files import and call.
    """
    parser = ResumeParser(file_path)
    return parser.parse()