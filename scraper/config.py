
import os
import logging
from logging.handlers import RotatingFileHandler


# ============================================================================
# SCRAPING CONFIGURATION
# ============================================================================

# Base URLs
BASE_URL = "https://bikroy.com"
BASE_PAGE_URL = BASE_URL + "/bn/ads/bangladesh/mobiles?sort=date&order=desc&buy_now=0&urgent=0&page="

# HTTP Headers
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/142.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Referer": "https://bikroy.com/",
}

# Scraping Parameters
MAX_PAGES = 300  # Number of pages to scrape
MAX_CONCURRENT_PAGE_REQUESTS = 15  # Concurrent requests for page scraping
MAX_CONCURRENT_DETAIL_REQUESTS = 30  # Concurrent requests for detail scraping
REQUEST_TIMEOUT = 30  # Timeout in seconds
MAX_RETRIES = 3  # Maximum retry attempts for failed requests
RETRY_WAIT_MIN = 60  # Minimum wait time between retries (seconds)
RETRY_WAIT_MAX = 120  # Maximum wait time between retries (seconds)

# Bangla to English number translation
BANGLA_TO_ENGLISH = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")

# Bangla to English month mapping
MONTH_MAP = {
    "জানু": "Jan",
    "ফেব": "Feb",
    "মার্চ": "Mar",
    "এপ্রি": "Apr",
    "মে": "May",
    "জুন": "Jun",
    "জুলা": "Jul",
    "আগ": "Aug",
    "সেপ্ট ": "Sep",
    "অক্টো": "Oct",
    "নভে": "Nov",
    "ডিসে": "Dec"
}

# Field mapping for data extraction
FIELD_MAP = {
    "কন্ডিশন:": "Condition",
    "মডেল:": "Model",
    "ব্র্যান্ড:": "Brand"
}

# File paths
DATA_DIR = "data"
LOGS_DIR = "logs"
FAILED_URLS_FILE = os.path.join(DATA_DIR, "failed_urls.txt")
LOG_FILE = os.path.join(LOGS_DIR, "scraper.log")

# Logging configuration
LOG_MAX_BYTES = 10 * 1024 * 1024  # 10MB
LOG_BACKUP_COUNT = 5
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


# ============================================================================
# LOGGER SETUP
# ============================================================================

def setup_logger(name="MobileScraper", level=logging.INFO):
    logger = logging.getLogger(name)
    logger.setLevel(level)

    if logger.handlers:
        return logger

    os.makedirs(LOGS_DIR, exist_ok=True)

    # File handler
    file_handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=LOG_MAX_BYTES,
        backupCount=LOG_BACKUP_COUNT,
        encoding="utf-8"
    )
    file_handler.setLevel(level)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)

    # Formatter
    formatter = logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT)
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger


