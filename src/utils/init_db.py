import asyncio
import logging
from src.utils.database import init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def main():
    """Initialize the database schema"""
    logger.info("Initializing database schema...")
    try:
        await init_db()
        logger.info("Database schema initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database schema: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())