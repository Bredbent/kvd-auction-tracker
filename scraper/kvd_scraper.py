import logging
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
import asyncio
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
from bs4 import BeautifulSoup
from sqlalchemy.ext import asyncio as sql_asyncio
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import pandas as pd
from shared.database import engine, Car
from shared.config import settings
import re

logging.basicConfig(
   level=logging.INFO,
   format='%(asctime)s - %(levelname)s - %(message)s',
   handlers=[
       logging.FileHandler(f"logs/scraper_{datetime.now().strftime('%Y%m%d')}.log"),
       logging.StreamHandler()
   ]
)
logger = logging.getLogger(__name__)

class KVDScraper:
   def __init__(self):
        self.base_url = "https://www.kvd.se"
        self.closed_auctions_url = f"{self.base_url}/stangda-auktioner"
        self.csv_filename = "kvd_auctions.csv"
        self.auctions_data = []
        self.processed_ids = set()
        self.async_session = sessionmaker(engine, class_=sql_asyncio.AsyncSession)
        
        self.load_existing_data()
        
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-notifications')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument("--disable-features=VizDisplayCompositor")
        chrome_options.add_argument('--pageLoadStrategy=normal')
        chrome_prefs = {
            "profile.default_content_setting_values.notifications": 2,
            "profile.managed_default_content_settings.images": 2,
        }
        chrome_options.add_experimental_option("prefs", chrome_prefs)
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.set_page_load_timeout(30)
        self.driver.implicitly_wait(10)

   def load_existing_data(self):
       try:
           if os.path.exists(self.csv_filename):
               df = pd.read_csv(self.csv_filename)
               self.auctions_data = df.to_dict('records')
               self.processed_ids = set(df['kvd_id'].astype(str))
               logger.info(f"Loaded {len(self.processed_ids)} existing auction records")
           else:
               logger.info("No existing auction data found")
       except Exception as e:
           logger.error(f"Error loading existing data: {e}")
           self.auctions_data = []
           self.processed_ids = set()

   def get_brand_model(self, kvd_id: str) -> tuple:
       parts = kvd_id.split('-')
       brand = parts[0]
       model = parts[1] if len(parts) > 1 else 'unknown'
       return brand, model

   def should_skip_auction(self, kvd_id: str) -> bool:
       skip_prefixes = [
           "vinterhjul",
           "losa-hjul",
           "nokian-hakkapeliitta",
       ]
       return any(kvd_id.lower().startswith(prefix) for prefix in skip_prefixes)
   


   def sold(self, page_source: str, kvd_id: str) -> bool:
        """Check if the vehicle is sold by looking for both 'Såld' and 'Reservationspris uppnått'."""
        
        soup = BeautifulSoup(page_source, "html.parser")

        # Extract text once for faster checking
        page_text = soup.get_text()

        # Check for both 'Såld' and 'Reservationspris uppnått' in the page text
        sold_detected = "Såld" in page_text
        reservation_detected = "Reservationspris uppnått" in page_text

        if sold_detected and reservation_detected:
            logger.info(f"Auction {kvd_id} is SOLD (Detected both 'Såld' and 'Reservationspris uppnått')")
            return True

        logger.info(f"Auction {kvd_id} is NOT sold (Missing 'Såld' or 'Reservationspris uppnått').")
        return False
   

   def accept_cookies(self):
       try:
           cookie_button = WebDriverWait(self.driver, 10).until(
               EC.element_to_be_clickable((By.ID, "CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll"))
           )
           if cookie_button:
               cookie_button.click()
               logger.info("Cookies accepted")
               time.sleep(1)
       except Exception as e:
           logger.warning(f"No cookie prompt found or error accepting cookies: {e}")

   def handle_language_popup(self):
       try:
           swedish_button = WebDriverWait(self.driver, 10).until(
               EC.element_to_be_clickable((By.CSS_SELECTOR, ".sc-kAyceB"))
           )
           swedish_button.click()
           logger.info("Selected Swedish language")
           time.sleep(1)
       except Exception as e:
           try:
               swedish_button = self.driver.find_element(By.XPATH, 
                   "/html/body/div/div/div[9]/div[2]/div[2]/div/button/span[2]")
               swedish_button.click()
               logger.info("Selected Swedish language using alternate method")
               time.sleep(1)
           except Exception as e2:
               logger.warning(f"Could not handle language popup: {e2}")

   def get_auction_links(self):
       links = []
       try:
           time.sleep(2)
           rows = WebDriverWait(self.driver, 10).until(
               EC.presence_of_all_elements_located(
                   (By.CSS_SELECTOR, ".App__ContentContainer-sc-1p21c8x-1 > ul > table > tbody > tr")
               )
           )
           
           for row in rows:
               try:
                   link_elem = row.find_element(By.CSS_SELECTOR, "td:nth-child(2) a")
                   title = link_elem.text.strip()
                   link = link_elem.get_attribute("href")
                   
                   date_text = row.find_element(By.CSS_SELECTOR, "td:nth-child(3)").text.strip()
                   if date_text and ' ' in date_text:
                       date_only = date_text.split(' ')[0]
                       links.append({
                           'url': link,
                           'title': title,
                           'date': date_only
                       })
                   else:
                       logger.warning(f"Invalid date format for auction: {title}")
                       
               except Exception as e:
                   logger.error(f"Error extracting row data: {str(e)}")
                   continue
                   
       except Exception as e:
           logger.error(f"Error getting auction links: {str(e)}")
           
       return links

   def parse_auction_details(self, auction_url: str, auction_date: str) -> dict:
    try:
        kvd_id = auction_url.split('/')[-1]

        if self.should_skip_auction(kvd_id):
            logger.info(f"Skipping unwanted auction type: {kvd_id}")
            return None
        
        # If already processed, skip
        if kvd_id in self.processed_ids:
            logger.info(f"Auction {kvd_id} already processed, skipping...")
            return None

        # Load the auction page ONCE
        self.driver.get(auction_url)
        time.sleep(1)  # Reduce unnecessary wait

        page_source = self.driver.page_source  # Get full HTML source

        # Check if the auction is sold (uses soup for faster parsing)
        if not self.sold(page_source, kvd_id):
            logger.info(f"Skipping unsold auction {kvd_id}")
            return None

        brand, model = self.get_brand_model(kvd_id)
        details = {
            'kvd_id': kvd_id,
            'url': auction_url,
            'sale_date': auction_date,
            'brand': brand,
            'model': model,
            'mileage': None,
            'price': None,
            'year': None
        }

        # -----------------------------
        # Extract mileage
        # -----------------------------
        try:
            mileage_text = self.driver.find_element(By.XPATH, "//span[contains(text(),' mil') or contains(text(),' km')]").text
            mileage_match = re.search(r'(\d[\d\s]*)\s*(mil|km)', mileage_text.lower())

            if mileage_match:
                mileage_value = int(mileage_match.group(1).replace(" ", ""))
                mileage_unit = mileage_match.group(2)

                if mileage_unit == "mil":
                    details['mileage'] = mileage_value  # Assuming 'mil' is already in the correct format
                elif mileage_unit == "km":
                    details['mileage'] = mileage_value // 10  # Adjust 10km -> 1mil

            else:
                logger.warning(f"No mileage found in element text: {mileage_text}")
                details['mileage'] = None

        except Exception as e:
            logger.error(f"Error extracting mileage: {e}")
            details['mileage'] = None

        # -----------------------------
        # Extract price
        # -----------------------------
        try:
            price_text = self.driver.find_element(By.XPATH, "//span[contains(text(),' kr')]").text
            details['price'] = int(price_text.replace(" kr", "").replace(" ", ""))
        except Exception as e:
            logger.error(f"Could not extract price for {auction_url}: {e}")
            details['price'] = None

        # -----------------------------
        # Extract year
        # -----------------------------
        try:
            year_element = self.driver.find_element(
                By.CSS_SELECTOR,
                ".Summary__SpecLabels-sc-f1qdrz-4 > span:nth-child(1) > span:nth-child(1)"
            )
            year_text = year_element.text.strip()
            details['year'] = int(year_text)
            logger.info(f"Extracted year directly: {details['year']}")
        except Exception as e:
            logger.warning(f"Error extracting year via direct selector: {e}")
            details['year'] = None

        return details

    except Exception as e:
        logger.error(f"Error parsing auction details for {auction_url}: {e}")
        return None

   async def save_auction(self, details: Dict[str, Any], db_session):
    try:
        # 1) Check if this kvd_id already exists in the DB
        existing_car_result = await db_session.execute(
            select(Car).where(Car.kvd_id == details['kvd_id'])
        )
        existing_car = existing_car_result.scalars().first()
        if existing_car:
            logger.info(f"Car with kvd_id {details['kvd_id']} already exists in DB, skipping insertion.")
            return  # <--- Early return to avoid duplicate insert

        # 2) If not in DB, create a new record
        car = Car(
            kvd_id=details['kvd_id'],
            brand=details['brand'],
            model=details['model'],
            year=details.get('year'),
            price=details.get('price'),
            mileage=details.get('mileage'),
            sale_date=datetime.strptime(details['sale_date'], '%Y-%m-%d').date(),
            url=details['url']
        )
        db_session.add(car)
        await db_session.commit()

        # 3) Update local CSV data
        self.auctions_data.append(details)
        self.save_to_csv()

    except Exception as e:
        await db_session.rollback()
        logger.error(f"Error saving auction {details.get('kvd_id')}: {e}")

   def save_to_csv(self):
       try:
           df = pd.DataFrame(self.auctions_data)
           columns = ['sale_date', 'brand', 'model','year', 'price', 'mileage', 'kvd_id', 'url']
           df = df.reindex(columns=columns)
           df.to_csv(self.csv_filename, index=False)
           logger.info(f"Data saved to {self.csv_filename}, total records: {len(df)}")
       except Exception as e:
           logger.error(f"Error saving to CSV: {e}")

   async def load_kvd_ids_from_db(self) -> set:
        async with self.async_session() as db_session:
            result = await db_session.execute(select(Car.kvd_id))
            # result.all() returns a list of rows, each row is a tuple (kvd_id,)
            rows = result.all()
            existing_ids = {row[0] for row in rows}
            return existing_ids
        
   async def run(self):
    try:
        logger.info(f"Opening {self.closed_auctions_url}")
        self.driver.get(self.closed_auctions_url)
        time.sleep(1)
        
        self.accept_cookies()
        time.sleep(1)
        
        self.handle_language_popup()
        time.sleep(1)

        # ------------------------------------------------
        # Load all existing kvd_ids from the database once
        # ------------------------------------------------
        db_ids = await self.load_kvd_ids_from_db()
        self.processed_ids |= db_ids  # union them with any CSV-loaded IDs
        logger.info(f"Loaded {len(db_ids)} existing records from DB. "
                    f"Combined processed set has {len(self.processed_ids)} items.")
        
        page = 1
        new_auctions = 0

        async with self.async_session() as db_session:
            while True:
                logger.info(f"Processing page {page}")
                auction_links = self.get_auction_links()

                if not auction_links:
                    logger.info("No more auctions found")
                    break

                for link_data in auction_links:
                    # We skip if the kvd_id is already in self.processed_ids
                    kvd_id = link_data['url'].split('/')[-1]
                    if kvd_id not in self.processed_ids:
                        details = self.parse_auction_details(link_data['url'], link_data['date'])
                        if details:
                            # Only new auctions get inserted
                            await self.save_auction(details, db_session)
                            # Mark as processed so we don't re-insert
                            self.processed_ids.add(details['kvd_id'])
                            new_auctions += 1

                # Attempt to go to the next page of auctions
                try:
                    next_button = self.driver.find_element(By.XPATH, "//a[@rel='next']")
                    next_button.click()
                    time.sleep(2)
                    page += 1
                except:
                    logger.info("No more pages available")
                    break

        logger.info(f"Scraping completed. Added {new_auctions} new auctions.")

    except Exception as e:
        logger.error(f"Error in main scraping routine: {e}")
    finally:
        self.driver.quit()

if __name__ == "__main__":
   scraper = KVDScraper()
   asyncio.run(scraper.run())