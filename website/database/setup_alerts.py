# Create a new file: setup_alerts.py
import sqlite3

CLEANED_DB_PATH = project_root / 'scraper' / 'data' / 'cleaned_mobiles.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute('''
CREATE TABLE IF NOT EXISTS price_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    target_price INTEGER NOT NULL,
    condition TEXT,
    location TEXT,
    min_ram TEXT,
    min_storage TEXT,
    needs_warranty INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_checked TIMESTAMP,
    times_triggered INTEGER DEFAULT 0
)
''')

conn.commit()
conn.close()
print("✅ Alerts table created!")