from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    # App
    APP_NAME: str = "PagePersona"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:3000"
    # Cloudflare R2
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_BUCKET_NAME: str = "chov-media"
    R2_PUBLIC_URL: Optional[str] = None
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    # Amazon SES
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    SES_SENDER_EMAIL: str = "noreply@usepagepersona.com"
    SES_SENDER_NAME: str = "PagePersona"
    # Mautic
    MAUTIC_API_URL: Optional[str] = None
    MAUTIC_API_TOKEN: Optional[str] = None
    MAUTIC_PAGEPERSONA_SEGMENT_ID: int = 5
    # JVZoo
    JVZOO_SECRET_KEY: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
