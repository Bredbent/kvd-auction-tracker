from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import pandas as pd
import time
import logging
import re
from datetime import datetime
import os

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class KVDScraper:
    def __init__(self):
        self.base_url = "https://www.kvd.se"
        self.closed_auctions_url = f"{self.base_url}/stangda-auktioner"
        self.csv_filename = "kvd_auctions.csv"
        self.auctions_data = []
        self.processed_ids = set()
        
        self.load_existing_data()
        
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-notifications')
        chrome_prefs = {"profile.default_content_setting_values.notifications": 2}
        chrome_options.add_experimental_option("prefs", chrome_prefs)
        
        self.driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=chrome_options
        )

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

    def extract_model_from_id(self, kvd_id):
        parts = kvd_id.split('-')
        if len(parts) >= 2:
            return f"{parts[0]}-{parts[1]}"
        return parts[0]

    def should_skip_auction(self, kvd_id):
        skip_prefixes = [
            "vinterhjul",
            "losa-hjul",
            "nokian-hakkapeliitta",
        ]
        return any(kvd_id.lower().startswith(prefix) for prefix in skip_prefixes)

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
        
    def wait_for_element(self, by, value, timeout=10):
        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((by, value))
            )
            return element
        except Exception as e:
            logger.error(f"Error waiting for element {value}: {e}")
            return None

    def accept_cookies(self):
        try:
            cookie_button = self.wait_for_element(
                By.ID, 
                "CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll"
            )
            if cookie_button:
                cookie_button.click()
                logger.info("Cookies accepted")
                time.sleep(1)
        except Exception as e:
            logger.warning(f"No cookie prompt found or error accepting cookies: {e}")

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

    def parse_auction_details(self, auction_url, auction_date):
        try:
            kvd_id = auction_url.split('/')[-1]
            
            if self.should_skip_auction(kvd_id):
                logger.info(f"Skipping unwanted auction type: {kvd_id}")
                return None
            
            details = {
                'date': auction_date,
                'kvd_id': kvd_id,
                'url': auction_url,
                'model': self.extract_model_from_id(kvd_id)
            }

            if details['kvd_id'] in self.processed_ids:
                logger.info(f"Auction {details['kvd_id']} already processed, skipping...")
                return None

            self.driver.get(auction_url)
            time.sleep(2)

            try:
                meta_desc = self.driver.find_element(By.XPATH, "/html/head/meta[7]").get_attribute("content")
                if meta_desc:
                    mileage_match = re.search(r'(\d[\d\s]*mil)', meta_desc)
                    if mileage_match:
                        details['mileage'] = int(mileage_match.group(0).replace("mil", "").replace(" ", ""))
                    else:
                        details['mileage'] = None
            except:
                details['mileage'] = None
                
            try:
                price_text = self.driver.find_element(By.XPATH, "//span[contains(text(),' kr')]").text
                details['price'] = int(price_text.replace(" kr", "").replace(" ", ""))
            except:
                logger.error(f"Could not extract price for {auction_url}")
                details['price'] = None

            logger.info(f"Successfully parsed auction {details['kvd_id']} with model {details['model']}")
            return details
                
        except Exception as e:
            logger.error(f"Error parsing auction details for {auction_url}: {e}")
            return None

    def save_to_csv(self):
        try:
            df = pd.DataFrame(self.auctions_data)
            columns = ['date', 'model', 'price', 'mileage', 'kvd_id', 'url']
            df = df.reindex(columns=columns)
            df.to_csv(self.csv_filename, index=False)
            logger.info(f"Data saved to {self.csv_filename}, total records: {len(df)}")
        except Exception as e:
            logger.error(f"Error saving to CSV: {e}")


    def scrape(self, max_pages=1):
        try:
            logger.info(f"Opening {self.closed_auctions_url}")
            self.driver.get(self.closed_auctions_url)
            time.sleep(1)
            
            self.accept_cookies()
            time.sleep(1)
            
            self.handle_language_popup()
            time.sleep(1)
            
            page = 1
            new_auctions = 0
            
            while page <= max_pages:
                logger.info(f"Processing page {page}")
                auction_links = self.get_auction_links()
                logger.info(f"Found {len(auction_links)} auctions on page {page}")
                
                for link_data in auction_links:
                    try:
                        details = self.parse_auction_details(link_data['url'], link_data['date'])
                        if details and details.get('date'):
                            self.auctions_data.append(details)
                            self.processed_ids.add(details['kvd_id'])
                            new_auctions += 1
                            if new_auctions % 5 == 0:
                                self.save_to_csv()
                    except Exception as e:
                        logger.error(f"Error processing auction {link_data['url']}: {e}")
                
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
            if new_auctions > 0:
                self.save_to_csv()
            self.driver.quit()

if __name__ == "__main__":
    scraper = KVDScraper()
    scraper.scrape(max_pages=2)