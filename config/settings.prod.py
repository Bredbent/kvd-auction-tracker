"""Production environment settings."""
import os
from src.utils.config import Settings

class ProdSettings(Settings):
    """Production-specific settings."""
    # All values should be loaded from environment variables in production
    class Config:
        env_file = ".env"

settings = ProdSettings()
