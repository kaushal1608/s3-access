from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    S3_BUCKET_NAME: str
    AWS_REGION: str = "ap-south-1"
    CORS_ORIGINS: str = "*"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra env variables

@lru_cache()
def get_settings():
    return Settings()
