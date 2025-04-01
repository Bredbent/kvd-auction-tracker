"""Test environment settings."""
import os
from src.utils.config import Settings

class TestSettings(Settings):
    """Test-specific settings."""
    # Database
    POSTGRES_USER: str = "kvd_user"
    POSTGRES_PASSWORD: str = "devpassword123"
    POSTGRES_HOST: str = "postgres-test"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "kvd_test"
    
    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = "testredis123"
    
    # API
    SECRET_KEY: str = "test_secret_key"
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000"]

settings = TestSettings()
