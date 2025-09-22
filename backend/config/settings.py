"""
Central configuration - loads all environment variables
This is the SINGLE SOURCE OF TRUTH for all settings
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Render Services (these are automatically provided by Render)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://localhost/searchdb")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # External API Keys (set these manually in Render dashboard)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    EXA_API_KEY: str = os.getenv("EXA_API_KEY", "")
    
    # Authentication settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-this-secret-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = int(os.getenv("JWT_EXPIRE_HOURS", "720"))
    
    # Application settings
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

settings = Settings()

