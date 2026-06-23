from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import logging

# # Import our settings so we get DATABASE_URL from .env
from app.config import settings

# # Set up Python logging — helps us see what's happening
logger = logging.getLogger(__name__)

# ─── CREATE ENGINE ────────────────────────────────────────────────
# # Engine = the actual connection to PostgreSQL
# # pool_pre_ping → tests connection before using it (prevents stale connections)
# # pool_size     → keep 5 connections ready at all times (faster responses)
# # max_overflow  → allow 10 extra connections during peak load
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping   = True,
    pool_size       = 5,
    max_overflow    = 10,
    echo            = settings.DEBUG,  # # Log all SQL queries in debug mode
)

# ─── SESSION FACTORY ──────────────────────────────────────────────
# # SessionLocal is a factory — call it to get a new database session
# # autocommit=False → we manually control when to save (safer)
# # autoflush=False  → we manually control when to send queries
SessionLocal = sessionmaker(
    autocommit = False,
    autoflush  = False,
    bind       = engine,
)

# ─── BASE CLASS ───────────────────────────────────────────────────
# # All our database models (tables) inherit from this Base
# # SQLAlchemy uses Base to know which classes represent DB tables
Base = declarative_base()


# ─── GET DB SESSION ───────────────────────────────────────────────
def get_db():
    """
    FastAPI dependency — gives a database session to each request.

    How it works:
    1. Request comes in → get_db() creates a new DB session
    2. Route handler uses the session to query/save data
    3. Request finishes → session closes automatically (finally block)

    The 'yield' makes this a generator — FastAPI handles the lifecycle.
    """
    db = SessionLocal()
    try:
        yield db           # # Give session to the route handler
    except Exception as e:
        db.rollback()      # # If anything went wrong, undo all changes
        logger.error(f"Database session error: {e}")
        raise
    finally:
        db.close()         # # Always close — even if error occurred


# ─── TEST CONNECTION ──────────────────────────────────────────────
def test_connection() -> bool:
    """
    Called on app startup to verify database is reachable.
    Returns True if connected, False if failed.
    """
    try:
        with engine.connect() as conn:
            # # Simple query just to test the connection works
            conn.execute(text("SELECT 1"))
        logger.info("✅ Database connected successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False


# ─── CREATE ALL TABLES ────────────────────────────────────────────
def create_tables():
    """
    Creates all database tables defined in our models.
    Only creates tables that don't exist yet — safe to run multiple times.
    """
    # # Import models here so Base knows about them before creating tables
    from app.models import job, candidate, interview   # noqa: F401
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created/verified")