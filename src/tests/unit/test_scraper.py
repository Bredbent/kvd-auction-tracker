"""Unit tests for the KVD scraper module."""
import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch
from bs4 import BeautifulSoup

from src.scraper.kvd_scraper import KVDScraper


class TestKVDScraper:
    """Test cases for KVDScraper class."""

    @pytest.mark.parametrize(
        "kvd_id, expected_brand, expected_model",
        [
            ("volvo-xc90", "volvo", "xc90"),
            ("bmw-x5", "bmw", "x5"),
            ("audi-a4-avant", "audi", "a4"),
            ("single-part", "single", "unknown"),
        ],
    )
    def test_get_brand_model(self, kvd_id, expected_brand, expected_model):
        """Test extracting brand and model from KVD ID."""
        scraper = KVDScraper()
        brand, model = scraper.get_brand_model(kvd_id)
        
        assert brand == expected_brand
        assert model == expected_model

    @pytest.mark.parametrize(
        "kvd_id, expected_result",
        [
            ("vinterhjul-pirelli-245-45-18", True),
            ("nokian-hakkapeliitta-9-205-55-16", True),
            ("losa-hjul-continental-225-40-18", True),
            ("volvo-xc90", False),
            ("bmw-x5", False),
        ],
    )
    def test_should_skip_auction(self, kvd_id, expected_result):
        """Test auction skipping logic for tire auctions."""
        scraper = KVDScraper()
        result = scraper.should_skip_auction(kvd_id)
        
        assert result == expected_result

    @pytest.mark.parametrize(
        "html_content, expected_result",
        [
            (
                """
                <html>
                <body>
                    <div>Såld</div>
                    <div>Reservationspris uppnått</div>
                </body>
                </html>
                """, 
                True
            ),
            (
                """
                <html>
                <body>
                    <div>Såld</div>
                    <div>Reservationspris</div>
                </body>
                </html>
                """, 
                False
            ),
            (
                """
                <html>
                <body>
                    <div>Reservationspris uppnått</div>
                </body>
                </html>
                """, 
                False
            ),
            (
                """
                <html>
                <body>
                    <div>Nothing relevant</div>
                </body>
                </html>
                """, 
                False
            ),
        ]
    )
    def test_is_sold(self, html_content, expected_result):
        """Test sold detection logic using both required indicators."""
        scraper = KVDScraper()
        # Patch logger to avoid output during tests
        scraper.logger = MagicMock()
        
        result = scraper.is_sold(html_content, "test-id")
        
        assert result == expected_result
        
        # Verify logging
        if expected_result:
            scraper.logger.info.assert_called_with(
                "Auction %s is SOLD (Detected both 'Såld' and 'Reservationspris uppnått')", 
                "test-id"
            )
        else:
            scraper.logger.info.assert_called_with(
                "Auction %s is NOT sold (Missing 'Såld' or 'Reservationspris uppnått').",
                "test-id"
            )