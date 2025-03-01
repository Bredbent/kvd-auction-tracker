import asyncio
import logging
from datetime import datetime, timedelta
import time
import os
from src.scraper.kvd_scraper import KVDScraper
from src.utils.config import settings  # This will ensure logging is configured

# Get a logger for this module 
# Logging is already configured in utils.config
logger = logging.getLogger(__name__)


async def run_scheduled(schedule_type="hourly"):
    """Run the scraper on a schedule
    
    Args:
        schedule_type: Type of schedule ("hourly", "daily", "midnight", "immediately", "hourly_immediate")
    """
    # Start with an immediate run if using hourly_immediate schedule
    if schedule_type == "hourly_immediate":
        try:
            logger.info("Starting immediate scrape on initialization")
            scraper = KVDScraper()
            await scraper.run()
            logger.info("Completed immediate scrape")
        except Exception as e:
            logger.error(f"Error in immediate scrape: {e}")
    
    while True:
        try:
            # Run the scraper first if not hourly_immediate (since we already ran it above)
            if schedule_type != "hourly_immediate":
                logger.info("Starting scheduled scrape")
                scraper = KVDScraper()
                await scraper.run()
                logger.info("Completed scheduled scrape")
            
            # Wait for next scheduled run
            if schedule_type == "midnight":
                # Get current time
                now = datetime.now()
                
                # Calculate time until next midnight
                midnight = (now + timedelta(days=1)).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
                seconds_until_next = (midnight - now).total_seconds()
                
                logger.info(f"Waiting {seconds_until_next:.1f} seconds until next run at midnight")
                await asyncio.sleep(seconds_until_next)
            
            elif schedule_type in ["hourly", "hourly_immediate"]:
                # Fixed 1-hour wait
                wait_time = 3600  # 1 hour in seconds
                logger.info(f"Waiting {wait_time} seconds (1 hour) until next run")
                await asyncio.sleep(wait_time)
            
            elif schedule_type == "daily":
                # Use cron expression from settings
                # This is a simplified implementation - for production use a proper scheduler
                logger.info(f"Waiting 24 hours until next run")
                await asyncio.sleep(24 * 60 * 60)  # 24 hours
            
            # For testing only - run immediately
            if schedule_type == "immediately":
                logger.info("Exiting after immediate run")
                break
            
            # Reset hourly_immediate to just hourly after first run
            if schedule_type == "hourly_immediate":
                schedule_type = "hourly"
                
        except Exception as e:
            logger.error(f"Error in scheduled scrape: {e}")
            # Wait 5 minutes before retrying on error
            await asyncio.sleep(300)


async def run_once():
    """Run the scraper once and exit"""
    try:
        logger.info("Starting one-time scrape")
        scraper = KVDScraper()
        await scraper.run()
        logger.info("Completed one-time scrape")
    except Exception as e:
        logger.error(f"Error in one-time scrape: {e}")
        raise


if __name__ == "__main__":
    import sys
    
    logger.info("Starting KVD Scraper Service")
    
    # Check for command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "once":
            asyncio.run(run_once())
        elif sys.argv[1] == "immediate":
            asyncio.run(run_scheduled("hourly_immediate"))
        else:
            asyncio.run(run_scheduled(sys.argv[1]))
    else:
        # Default to hourly_immediate schedule - run immediately and then hourly
        logger.info("Using hourly_immediate schedule - will run immediately, then hourly")
        asyncio.run(run_scheduled("hourly_immediate"))