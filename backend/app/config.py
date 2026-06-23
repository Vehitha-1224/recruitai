# # pydantic BaseSettings reads values from .env file automatically
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """
    All app configuration comes from .env file.
    Pydantic reads .env and maps values to these fields.
    If a value is missing from .env, it uses the default here.
    """

    # ── APP ───────────────────────────────────────────────────────
    APP_NAME: str        = "RecruitAI"
    APP_VERSION: str     = "1.0.0"
    DEBUG: bool          = False

    # ── DATABASE ──────────────────────────────────────────────────
    # # This is the full connection string PostgreSQL needs
    DATABASE_URL: str    = "postgresql://postgres:password@localhost:5432/recruitai"

    # ── FILE UPLOAD ───────────────────────────────────────────────
    UPLOAD_DIR: str      = "uploads"
    MAX_FILE_SIZE_MB: int = 5

    # ── CORS ──────────────────────────────────────────────────────
    # # List of frontend URLs allowed to call our API
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    class Config:
        # # Tell pydantic to read from .env file
        env_file = ".env"
        # # Allow extra fields without error
        extra   = "ignore"


# # Create one global settings instance
# # Import this wherever config values are needed
settings = Settings()