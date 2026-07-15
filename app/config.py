"""
Centralized configuration, loaded from environment variables / .env file.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://resume_user:resume_pass@localhost:5432/resume_screening"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    semantic_weight: float = 0.65
    skill_overlap_weight: float = 0.35
    upload_dir: str = "./uploaded_resumes"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    os.makedirs(settings.upload_dir, exist_ok=True)
    return settings
