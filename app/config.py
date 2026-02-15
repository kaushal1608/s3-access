from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    S3_BUCKET_NAME: str
    AWS_REGION: str = "ap-south-1"
    CORS_ORIGINS: str = "http://localhost:8000"  # Override in .env for production
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"

    # LDAP bind password encryption key (derived from SECRET_KEY if not set)
    LDAP_ENCRYPTION_KEY: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra env variables

@lru_cache()
def get_settings():
    return Settings()
