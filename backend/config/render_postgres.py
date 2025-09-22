"""
PostgreSQL database connection
Connects to Render PostgreSQL (managed database service)
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .settings import settings

# Create database engine using Render PostgreSQL URL
engine = create_engine(settings.DATABASE_URL)

# Session maker for database operations
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()

def get_db():
    """
    Dependency function for routes
    Provides database session and ensures it's closed after use
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

