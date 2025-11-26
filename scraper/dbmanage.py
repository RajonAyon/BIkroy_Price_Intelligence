import sqlite3

def init_db():
    conn = sqlite3.connect("data/mobiles.db")
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS mobiles (
            URL TEXT PRIMARY KEY,
            Title TEXT,
            Price INTEGER,
            Published_time TEXT,
            Published_Date TEXT,
            Seller_name TEXT,
            Location TEXT,
            Division TEXT,
            Condition TEXT,
            Model TEXT,
            Brand TEXT,
            Features TEXT,
            Description TEXT,
            Img_urls TEXT,
            Date Text
        )
    """)
    conn.commit()
    conn.close()

def save_to_db(data):
    if isinstance(data.get("Img_urls"), list):
        data["Img_urls"] = json.dumps(data["Img_urls"])
    
    conn = sqlite3.connect("data/mobiles.db")
    c = conn.cursor()

    c.execute("""
        INSERT OR IGNORE INTO mobiles 
        (URL, Title, Price, Published_time, Published_Date,Seller_name, Location,Division, Condition, Model, Brand, Features, Description,Img_urls,Date)
        VALUES (:URL, :Title, :Price, :Published_time, :Published_Date,:Seller_name, :Location,:Division,:Condition, :Model, :Brand, :Features, :Description,:Img_urls,:Date)
    """, data)

    conn.commit()
    conn.close()
    
def get_existing_urls():
    """Get all URLs already in the database"""
    conn = sqlite3.connect("data/mobiles.db")
    c = conn.cursor()
    c.execute("SELECT URL FROM mobiles")
    urls = {row[0] for row in c.fetchall()}  # Use set for O(1) lookup
    conn.close()
    return urls

def filter_new_urls(all_urls):
    """Filter out URLs that already exist in database"""
    existing_urls = get_existing_urls()
    new_urls = [url for url in all_urls if url not in existing_urls]
    return new_urls
