import logging
from pathlib import Path

from fastapi                  import FastAPI
from fastapi.middleware.cors  import CORSMiddleware
from fastapi.staticfiles      import StaticFiles

from app.config               import settings
from app.database.connection  import create_tables, test_connection
from app.routes               import jobs, candidates, interviews, dashboard

# ─── LOGGING SETUP ────────────────────────────────────────────────
# # Configure logging so we see useful messages in the terminal
logging.basicConfig(
    level  = logging.INFO,
    format = "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ─── CREATE FASTAPI APP ───────────────────────────────────────────
app = FastAPI(
    title       = settings.APP_NAME,
    version     = settings.APP_VERSION,
    description = "AI-Powered Recruitment & ATS Platform API",
    # # Swagger UI (API docs) available at /docs
    docs_url    = "/docs" if settings.DEBUG else None,
    redoc_url   = "/redoc" if settings.DEBUG else None,
)

# ─── CORS MIDDLEWARE ──────────────────────────────────────────────
# # CORS = Cross-Origin Resource Sharing
# # Without this, React (port 3000) cannot call our API (port 8000)
# # Browser blocks it for security unless we explicitly allow it
app.add_middleware(
    CORSMiddleware,
    allow_origins     = settings.ALLOWED_ORIGINS,  # # ["http://localhost:3000"]
    allow_credentials = True,
    allow_methods     = ["*"],    # # Allow GET, POST, PUT, DELETE, PATCH
    allow_headers     = ["*"],    # # Allow all headers
)

# ─── SERVE UPLOADED FILES ─────────────────────────────────────────
# # Makes PDF files in uploads/ accessible via URL
# # e.g. http://localhost:8000/uploads/resume.pdf
uploads_dir = Path(settings.UPLOAD_DIR)
uploads_dir.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=str(uploads_dir)),
    name="uploads"
)

# ─── REGISTER ALL ROUTES ──────────────────────────────────────────
# # Connect all our route files to the main app
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(interviews.router)
app.include_router(dashboard.router)


# ─── STARTUP EVENT ────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    """
    Runs automatically when the server starts.
    Checks database connection and creates tables.
    """
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # # Test database connection
    if not test_connection():
        logger.critical(
            "❌ Cannot connect to database! "
            "Check DATABASE_URL in .env file"
        )
        # # Don't crash — let FastAPI start so we can debug via /docs

    # # Create all database tables if they don't exist
    create_tables()
    logger.info("✅ App startup complete")


# ─── SHUTDOWN EVENT ───────────────────────────────────────────────
@app.on_event("shutdown")
async def on_shutdown():
    """Runs when server is stopping — clean up resources."""
    logger.info("👋 Shutting down RecruitAI")


# ─── HEALTH CHECK ─────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    """
    Simple endpoint to verify the API is running.
    Called by monitoring tools or deployment checks.
    Visit: http://localhost:8000/health
    """
    return {
        "status":  "healthy",
        "app":     settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


# ─── ROOT ENDPOINT ────────────────────────────────────────────────
@app.get("/", tags=["Root"])
def root():
    """
    Root endpoint — shows API info.
    Visit http://localhost:8000 to see this.
    """
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "version": settings.APP_VERSION,
        "docs":    "/docs",
        "health":  "/health",
    }