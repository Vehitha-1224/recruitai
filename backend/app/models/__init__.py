# # This file makes 'models' a Python package
# # Importing all models here ensures SQLAlchemy
# # knows about all tables when create_tables() runs

from app.models.job        import Job
from app.models.candidate  import Candidate
from app.models.interview  import Interview

# # Expose all models for easy importing elsewhere
__all__ = ["Job", "Candidate", "Interview"]