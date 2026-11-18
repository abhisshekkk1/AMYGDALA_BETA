import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AMYGDALA AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "amygdala-super-secret-key-change-in-production-2025"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database: Supports SQLite locally or PostgreSQL in production SaaS
    DATABASE_URL: str = "sqlite:///./amygdala.db"
    
    # Storage
    STORAGE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage")
    UPLOAD_DIR: str = os.path.join(STORAGE_DIR, "uploads")
    EXPORTS_DIR: str = os.path.join(STORAGE_DIR, "exports")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]
    
    # Default AI Settings
    DEFAULT_AI_PROVIDER: str = "openai"  # "openai", "gemini", "ollama", "custom"
    DEFAULT_OPENAI_MODEL: str = "gpt-4o-mini"
    DEFAULT_GEMINI_MODEL: str = "gemini-1.5-flash"
    DEFAULT_OLLAMA_MODEL: str = "llama3:latest"
    DEFAULT_OLLAMA_BASE_URL: str = "http://localhost:11434"
    DEFAULT_TEMPERATURE: float = 0.3
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.EXPORTS_DIR, exist_ok=True)
