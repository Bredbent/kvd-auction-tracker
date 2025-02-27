from pydantic_settings import BaseSettings
from typing import Optional, List
import os
import json

class Settings(BaseSettings):
    # Database
    POSTGRES_USER: str = "kvd_user"
    POSTGRES_PASSWORD: str = "change_me_in_production"
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "kvd_auctions"
    
    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = "devredis123"
    
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "KVD Auction Tracker"
    
    # Security
    SECRET_KEY: str = "change_me_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]  # Frontend URL
    
    # Scraper
    SCRAPER_SCHEDULE: str = "0 0 * * *"  # Run at midnight
    SCRAPER_RATE_LIMIT: int = 1  # Seconds between requests
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def REDIS_URL(self) -> str:
        return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    class Config:
        case_sensitive = True
        env_file = ".env"
        
        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str) -> any:
            if field_name == "BACKEND_CORS_ORIGINS" and raw_val:
                try:
                    return json.loads(raw_val)
                except json.JSONDecodeError:
                    # If not a JSON array, treat as comma-separated string
                    return [origin.strip() for origin in raw_val.split(",")]
            return raw_val

settings = Settings()