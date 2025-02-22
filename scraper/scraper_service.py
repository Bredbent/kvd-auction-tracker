# scraper_service.py
import asyncio
import logging
from datetime import datetime, timedelta
import time
from scraper.kvd_scraper import KVDScraper

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def run_at_midnight():
    while True:
        # Get current time
        now = datetime.now()
        
        # Calculate time until next midnight
        midnight = (now + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        seconds_until_midnight = (midnight - now).total_seconds()
        
        logger.info(f"Waiting {seconds_until_midnight} seconds until next run at midnight")
        await asyncio.sleep(seconds_until_midnight)
        
        # Run the scraper
        try:
            logger.info("Starting scheduled scrape")
            scraper = KVDScraper()
            await scraper.run()
            logger.info("Completed scheduled scrape")
        except Exception as e:
            logger.error(f"Error in scheduled scrape: {e}")

async def run_scraper_service():
    while True:
        try:
            logger.info("Starting scheduled scrape")
            scraper = KVDScraper()
            await scraper.run()
            logger.info("Completed scheduled scrape")
            
            # Wait for 1 hour before next run (for testing)
            await asyncio.sleep(3600)  # or any interval you prefer
        except Exception as e:
            logger.error(f"Error in scheduled scrape: {e}")
            await asyncio.sleep(60)  # Wait a minute before retrying on error

if __name__ == "__main__":
    logger.info("Starting KVD Scraper Service")
    asyncio.run(run_scraper_service())
    #asyncio.run(run_at_midnight())