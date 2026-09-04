import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Face Recognition Attendance System"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "super-secret-key-face-attendance-2026-production-secure"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = "sqlite:///./attendance.db"

    # Recognition & Anti-Spoofing Defaults
    MODEL_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "recognition", "models")
    DEFAULT_RECOGNITION_THRESHOLD: float = 0.45  # SFace Cosine similarity threshold (0.363 to 0.5)
    DEFAULT_DUPLICATE_INTERVAL_SECONDS: int = 86400  # 1 day default
    DEFAULT_LIVENESS_MODE: str = "passive"  # "active", "passive", "none"
    DEFAULT_LATE_CUTOFF_TIME: str = "09:30"
    DEFAULT_PRIVACY_CONSENT_TEXT: str = (
        "By registering, you consent to the collection and processing of your facial biometric data "
        "solely for organizational attendance verification in accordance with privacy policies."
    )

    # Initial Admin Seed
    ADMIN_DEFAULT_USERNAME: str = "admin"
    ADMIN_DEFAULT_PASSWORD: str = "admin123"
    ADMIN_DEFAULT_EMAIL: str = "admin@organization.local"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "*"]

    model_config = {"env_file": ".env", "case_sensitive": True}

settings = Settings()
