from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # API
    APP_NAME: str = "ClinicFlow"
    DEBUG: bool = False
    SECRET_KEY: str = "changeme-in-production"

    # Database — SQLite by default (free), swap for Supabase PostgreSQL URL
    DATABASE_URL: str = "sqlite+aiosqlite:///./clinicflow.db"

    # Model artifacts directory
    MODEL_DIR: str = "./artifacts"

    # Intervention costs (USD)
    COST_SMS: float = 0.05
    COST_CALL: float = 0.50
    COST_OVERBOOK: float = 2.00
    REVENUE_PER_APPOINTMENT: float = 150.0

    # Monitoring thresholds
    PSI_ALERT_THRESHOLD: float = 0.2   # >0.2 = significant drift
    CALIBRATION_DECAY_THRESHOLD: float = 0.05

    # GenAI (optional)
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
