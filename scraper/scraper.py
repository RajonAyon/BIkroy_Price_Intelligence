

import asyncio
import aiohttp
from bs4 import BeautifulSoup
import os
import re
import json
from datetime import datetime
import random

from config import (
    setup_logger,
    BASE_URL,
    BASE_PAGE_URL,
    HEADERS,
    MAX_PAGES,
    MAX_CONCURRENT_PAGE_REQUESTS,
    MAX_CONCURRENT_DETAIL_REQUESTS,
    REQUEST_TIMEOUT,
    MAX_RETRIES,
    RETRY_WAIT_MIN,
    RETRY_WAIT_MAX,
    BANGLA_TO_ENGLISH,
    MONTH_MAP,
    FIELD_MAP,
    DATA_DIR,
    FAILED_URLS_FILE,
)
from dbmanage import init_db, save_to_db, filter_new_urls


logger = setup_logger()


def extract_fields(soup):
    """
    Extract condition, model, and brand from soup
    
    Args:
        soup (BeautifulSoup): Parsed HTML content
    
    Returns:
        dict: Dictionary with Condition, Model, Brand keys
    """
    result = {v: None for v in FIELD_MAP.values()}
    all_divs = soup.find_all("div")

    for div in all_divs:
        text = div.get_text(strip=True)
        if text in FIELD_MAP:
            key = FIELD_MAP[text]
            next_div = div.find_next_sibling("div")
            if next_div:
                value = next_div.get_text(strip=True)
                result[key] = value

    return result


async def scrape_page(session, page_number):
    """
    Scrape a single page for mobile listing links
    
    Args:
        session (aiohttp.ClientSession): HTTP session
        page_number (int): Page number to scrape
    
    Returns:
        list: List of mobile listing URLs
    """
    url = BASE_PAGE_URL + str(page_number)
    
    try:
        async with session.get(url, timeout=REQUEST_TIMEOUT) as response:
            if response.status != 200:
                logger.warning(f"Skipping page {page_number}, HTTP status: {response.status}")
                return []

            html = await response.text()
            soup = BeautifulSoup(html, "html.parser")
            ul = soup.find("ul", {"data-testid": "list"})
            new_links = []

            if ul:
                for item in ul.find_all("li"):
                    link_tag = item.find("a", href=True)
                    if link_tag:
                        href = link_tag["href"]
                        full_link = BASE_URL + href if href.startswith("/") else href
                        new_links.append(full_link)
            
            logger.info(f"Page {page_number}: found {len(new_links)} links")
            return new_links

    except asyncio.TimeoutError:
        logger.error(f"Timeout error on page {page_number}")
        return []
    except Exception as e:
        logger.error(f"Error scraping page {page_number}: {str(e)}", exc_info=True)
        return []


async def scraping_mobile_links():
    """
    Scrape all mobile listing links from multiple pages
    
    Returns:
        list: List of all mobile listing URLs
    """
    logger.info("Starting mobile links scraping process")
    all_links = []

    async with aiohttp.ClientSession(headers=HEADERS) as session:
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_PAGE_REQUESTS)

        async def safe_scrape(page):
            async with semaphore:
                return await scrape_page(session, page)

        tasks = [safe_scrape(page) for page in range(1, MAX_PAGES + 1)]
        results = await asyncio.gather(*tasks)

        for result in results:
            all_links.extend(result)

    logger.info(f"Total links scraped: {len(all_links)}")
    return all_links


def parse_date_time(soup, url):
    """
    Parse published date and time from soup
    
    Args:
        soup (BeautifulSoup): Parsed HTML content
        url (str): URL being scraped (for logging)
    
    Returns:
        tuple: (published_time, published_date) as strings or (None, None)
    """
    div = soup.find("div")

    if not div:
        logger.warning(f"No div found for {url}")
        return None, None
    
    text = div.get_text(" ", strip=True)
    match = re.search(r"পোস্ট করা হয়েছে\s*(.*?)\s*,", text)
    
    if "post-ad?" in url:
        return None, None
    
    if not match:
        logger.debug(f"Date pattern not found for {url}")
        return None, None
    
    bangla_dt = match.group(1).strip()
    eng_dt = bangla_dt.translate(BANGLA_TO_ENGLISH)

    for bn, en in MONTH_MAP.items():
        eng_dt = eng_dt.replace(bn, en)

    eng_dt = eng_dt.replace("এএম", "AM").replace("পিএম", "PM")

    try:
        current_year = datetime.now().year
        eng_dt_with_year = f"{eng_dt} {current_year}"
        date_obj = datetime.strptime(eng_dt_with_year, "%d %b %I:%M %p %Y")
        date_str = date_obj.strftime("%Y-%m-%d")
        time_str = date_obj.strftime("%H:%M")
        return time_str, date_str
    except Exception as e:
        logger.debug(f"Date parsing error for {url}: {str(e)}")
        return None, None


def extract_images(soup):
    """
    Extract image URLs from soup
    
    Args:
        soup (BeautifulSoup): Parsed HTML content
    
    Returns:
        list: List of image URLs
    """
    all_imgs = soup.find_all("img", src=True)
    img_urls = []
    
    for img in all_imgs:
        if "https://i.bikroy-st.com/u/" not in img['src']:
            img_urls.append(img['src'])
    
    return img_urls


async def clean_html(session, url, retry_count=0):
    """
    Extract mobile data from a single listing URL
    
    Args:
        session (aiohttp.ClientSession): HTTP session
        url (str): URL to scrape
        retry_count (int): Current retry attempt number
    
    Returns:
        bool: True if successful, None if failed
    """
    try:
        async with session.get(url, timeout=REQUEST_TIMEOUT) as response:
            if response.status != 200:
                logger.warning(f"Skipping URL {url}, HTTP status: {response.status}")
                return None

            html = await response.text()
            soup = BeautifulSoup(html, "html.parser")
            
    except asyncio.TimeoutError:
        logger.error(f"Timeout error for {url} (attempt {retry_count + 1}/{MAX_RETRIES})")
        if retry_count < MAX_RETRIES:
            wait_time = random.randint(RETRY_WAIT_MIN, RETRY_WAIT_MAX)
            logger.info(f"Retrying {url} in {wait_time} seconds...")
            await asyncio.sleep(wait_time)
            return await clean_html(session, url, retry_count + 1)
        else:
            logger.error(f"Failed after {MAX_RETRIES} attempts: {url}")
            return None
            
    except Exception as e:
        logger.error(f"Error scraping {url} (attempt {retry_count + 1}/{MAX_RETRIES}): {str(e)}")
        if retry_count < MAX_RETRIES:
            wait_time = random.randint(RETRY_WAIT_MIN, RETRY_WAIT_MAX)
            logger.info(f"Retrying {url} in {wait_time} seconds...")
            await asyncio.sleep(wait_time)
            return await clean_html(session, url, retry_count + 1)
        else:
            logger.error(f"Failed after {MAX_RETRIES} attempts: {url}")
            return None

    # Extract title
    title_tag = soup.find("h1", class_=re.compile(r"^title--"))
    title = title_tag.get_text(strip=True) if title_tag else None
    
    # Extract price
    try:
        price_tag = soup.find("div", class_=re.compile(r"^amount"))
        price_text = price_tag.get_text(strip=True)
        price = int(re.sub(r"[৳,\s]", "", price_text).translate(BANGLA_TO_ENGLISH))
    except Exception as e:
        logger.debug(f"Could not extract price from {url}: {str(e)}")
        price = None
    
    # Extract date and time
    published_time, published_date = parse_date_time(soup, url)
    
    # Extract location
    subtitle_wrapper = soup.find("div", class_=re.compile(r"subtitle-wrapper"))
    if subtitle_wrapper:
        location_links = subtitle_wrapper.find_all("a", class_=re.compile(r"subtitle-location-link"))
        locations = [link.get_text(strip=True) for link in location_links]
    else:
        locations = []
    
    # Extract fields (Condition, Model, Brand)
    fields = extract_fields(soup)

    # Extract features
    feature_tag = soup.find("div", class_=re.compile(r"^features"))
    if feature_tag:
        p_tag = feature_tag.find("p")
        features = p_tag.get_text(strip=True) if p_tag else None
    else:
        features = None
    
    # Extract description
    desc_div = soup.find("div", class_=re.compile(r"^description"))
    paragraphs = desc_div.find_all("p") if desc_div else []
    description = "\n".join(p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True))
    
    # Extract seller name
    seller_div = soup.find("div", class_=re.compile(r"contact-name"))
    seller_name = seller_div.get_text(strip=True) if seller_div else None
    
    # Extract image URLs
    img_urls = extract_images(soup)
    
    # Prepare data
    current_date = datetime.now().strftime("%Y-%m-%d")
    
    data = {
        "URL": url,
        "Title": title,
        "Price": price,
        "Published_time": published_time,
        "Published_Date": published_date,
        "Seller_name": seller_name,
        "Condition": fields["Condition"],
        "Model": fields["Model"],
        "Brand": fields["Brand"],
        "Features": features,
        "Description": description,
        "Location": locations[0] if len(locations) > 0 else None,
        "Division": locations[1] if len(locations) > 1 else None,
        "Img_urls": json.dumps(img_urls),
        "Date": current_date
    }
    
    try:
        save_to_db(data)
        logger.debug(f"Successfully saved data for {url}")
        return True
    except Exception as e:
        logger.error(f"Failed to save data to database for {url}: {str(e)}", exc_info=True)
        return None


async def scrape_mobile_inf(urls):
    """
    Scrape mobile information from a list of URLs
    
    Args:
        urls (list): List of URLs to scrape
    """
    logger.info(f"Starting mobile information scraping for {len(urls)} URLs")
    failed_urls = []
    
    async with aiohttp.ClientSession(headers=HEADERS) as session:
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_DETAIL_REQUESTS)
        
        async def safe_clean(link):
            async with semaphore:
                result = await clean_html(session, link)
                if result is None:
                    failed_urls.append(link)
                    
        tasks = [safe_clean(link) for link in urls]
        await asyncio.gather(*tasks)
    
    if failed_urls:
        logger.warning(f"{len(failed_urls)} URLs failed after all retries")
        
        # Save failed URLs to file
        os.makedirs(DATA_DIR, exist_ok=True)
        
        try:
            with open(FAILED_URLS_FILE, "w", encoding="utf-8") as f:
                f.write("\n".join(failed_urls))
            logger.info(f"Failed URLs saved to {FAILED_URLS_FILE}")
        except Exception as e:
            logger.error(f"Could not save failed URLs: {str(e)}")
    else:
        logger.info("All URLs processed successfully")


def main():
    """Main entry point for the scraper"""
    logger.info("=" * 60)
    logger.info("Mobile Scraper Started")
    logger.info("=" * 60)
    
    try:
        # Initialize database
        logger.info("Initializing database...")
        init_db()
        
        # Scrape phone URLs
        logger.info("Scraping mobile listing URLs...")
        phone_urls = asyncio.run(scraping_mobile_links())
        
        # Filter new URLs
        logger.info("Filtering new URLs...")
        new_urls = filter_new_urls(phone_urls)
        logger.info(f"Found {len(new_urls)} new URLs to process")
        
        if new_urls:
            # Scrape mobile information
            logger.info("Scraping mobile information...")
            asyncio.run(scrape_mobile_inf(new_urls))
        else:
            logger.info("No new URLs to process")
        
        logger.info("=" * 60)
        logger.info("Mobile Scraper Completed Successfully")
        logger.info("=" * 60)
        
    except KeyboardInterrupt:
        logger.warning("Scraper interrupted by user")
    except Exception as e:
        logger.critical(f"Fatal error in main: {str(e)}", exc_info=True)
        raise


if __name__ == "__main__":
    main()