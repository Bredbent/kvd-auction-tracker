import logging
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from scraper.kvd_scraper import KVDScraper
from shared.config import settings

logger = logging.getLogger(__name__)

async def run_scraper():
    logger.info("Starting scheduled scraping job")
    scraper = KVDScraper()
    try:
        await scraper.run()
        logger.info("Scheduled scraping job completed successfully")
    except Exception as e:
        logger.error(f"Error in scheduled scraping job: {str(e)}")

async def main():
    scheduler = AsyncIOScheduler()
    
    # Schedule the scraper to run according to the configured schedule
    scheduler.add_job(
        run_scraper,
        trigger=CronTrigger.from_crontab(settings.SCRAPER_SCHEDULE),
        id="kvd_scraper",
        name="KVD Auction Scraper",
        misfire_grace_time=3600  # Allow job to run up to 1 hour late
    )
    
    # Also run once at startup
    scheduler.add_job(run_scraper, trigger="date")
    
    try:
        scheduler.start()
        logger.info("Scheduler started")
        # Keep the script running
        while True:
            await asyncio.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler shutdown requested")
        scheduler.shutdown()

if __name__ == "__main__":
    asyncio.run(main())
