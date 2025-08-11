import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "your-secret-key-here"
    DATABASE_URL: str = "sqlite:///./youtube_uploader.db"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # YouTube API
    YOUTUBE_API_KEY: str = ""
    
    # Proxy settings
    PROXY_ENABLED: bool = False
    PROXY_LIST: list = []
    
    # 2Captcha
    TWOCAPTCHA_API_KEY: str = ""
    
    # Redis for Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    
    class Config:
        env_file = ".env"

settings = Settings()