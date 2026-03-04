# 📱 Bikroy Price Intelligence

> A production-grade price intelligence platform for Bangladesh's secondhand phone market — scraping, cleaning, and analyzing 10,000+ listings with ML-powered predictions and real-time alerts.

**[Live Demo](https://bikroy-price-intelligence.onrender.com)** · **[Source Code](https://github.com/RajonAyon/BIkroy_Price_Intelligence)**

---

## 🧠 What It Does

Buyers in Bangladesh's secondhand phone market have no reliable way to know if a listing is fairly priced. This platform solves that by continuously scraping Bikroy.com, cleaning messy bilingual (Bengali/English) data, and surfacing actionable price intelligence — including an XGBoost model that predicts fair market value within **৳2,093 MAE**.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🕷️ Async Scraper | Concurrently scrapes 300+ pages (~10K listings) with retry logic and semaphore-based rate limiting |
| 🧹 Data Cleaning | Regex + fuzzy matching extracts RAM, storage, battery, camera specs from noisy Bengali/English text |
| 🗺️ Geocoding | Resolves 200+ Bangladeshi location names to coordinates via OpenStreetMap, with division-level fallback |
| 🤖 ML Predictions | XGBoost regressor (R²=0.81, MAE=৳2,093) trained on 11K+ listings with 51 features |
| 🔔 Price Alerts | Users set target prices; hourly background scheduler sends email when matches are found |
| 📊 Dashboards | Chart.js price distribution, Leaflet.js geographic heatmaps, market health radar gauge |
| 🧭 Buy/Wait Recommendation | Confidence-scored action combining price trend, deal availability, market score, listing freshness |
| 📈 Price Forecasting | Holt-Winters Exponential Smoothing on historical price timelines |
| ⚖️ Phone Comparison | Side-by-side market comparison with weighted scoring across specs, price, and market health |
| 🔮 Price Estimator | Enter any phone specs and get an instant ML-powered price estimate |

---

## 🏗️ Architecture

```
bikroy/
├── scraper/
│   ├── scraper.py                  # Async scraper (aiohttp + BeautifulSoup)
│   ├── dbmanage.py                 # SQLite DB initialization and URL deduplication
│   ├── config.py                   # Scraping config, logging, Bengali→English maps
│   ├── run_pipeline.py             # Orchestrates full scrape → clean → train pipeline
│   └── data_handling/
│       ├── data_clean.ipynb        # Cleaning: regex, geocoding, feature engineering
│       └── prediction.ipynb        # XGBoost training, evaluation, model serialization
│
├── website/
│   ├── app.py                      # Flask app, all routes, scheduler setup
│   ├── utilities.py                # Price intelligence, forecasting, email alerts
│   ├── queries.py                  # Centralized SQL queries
│   ├── config.py                   # Thresholds, scoring weights, constants
│   ├── models/                     # Serialized XGBoost model + encoders (Git LFS)
│   ├── static/
│   │   ├── script.js               # Frontend logic (charts, comparison, estimator)
│   │   └── style.css               # Responsive styles
│   ├── templates/
│   │   └── main.html               # Single-page app with 3 tabs
│   └── database/
│       └── setup_alerts.py         # Alerts table initialization
│
├── Procfile                        # Gunicorn entry point for Render deployment
└── requirements.txt
```

---

## ⚙️ How The Pipeline Works

```
Windows Task Scheduler
        │
        ▼
  scraper.py          ← Async scrape 300 pages, ~10K listings
        │
        ▼
  data_clean.ipynb    ← Clean, extract features, geocode locations
        │
        ▼
  prediction.ipynb    ← Train XGBoost, serialize model to /models
        │
        ▼
  Flask API           ← Serve predictions, alerts, market analysis
        │
        ▼
  Render (web)        ← Weekly deployment with updated database
```

The scraper runs **locally on Windows Task Scheduler** daily. The cleaned database grows incrementally (deduplication via URL primary key) and is deployed to Render weekly as the model improves with more data.

---

## 🤖 ML Model Details

### Training Data
- **11,268 listings** after cleaning (from ~15K+ scraped)
- Outlier removal: 7th–93rd percentile price range
- Train/test split: 80/20, random state 42

### Features (51 total)

| Category | Features |
|---|---|
| Specs | RAM, Storage, Battery |
| Brand/Model | Label encoded (high cardinality) |
| Location/Division | Label encoded + one-hot |
| Condition | New / Used (one-hot) |
| Network | 4G / 5G / Unknown (one-hot) |
| Camera | Type (Dual/Triple/Quad), Pixel count |
| Seller | is_store, has_warranty |

### Model Performance

| Metric | Value |
|---|---|
| R² Score | **0.81** |
| MAE | **৳2,093** |
| MSE | 10,884,800 |

### Top Feature Importances

```
Network_5G      62.4%   ← Dominant price signal
Brand_Apple     21.6%
Network_4G       6.9%
Brand_Google     1.7%
RAM              0.4%
```

### XGBoost Config

```python
XGBRegressor(
    n_estimators=400,
    max_depth=30,
    learning_rate=0.02,
    subsample=0.8,
    colsample_bytree=0.8,
    objective='reg:squarederror'
)
```

---

## 🧹 Data Cleaning Pipeline

Raw Bikroy listings are in mixed Bengali/English with no structured spec fields. The cleaning notebook handles:

**Bengali digit translation**
```python
str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
```

**Multi-pattern RAM/Storage extraction** — handles formats like `8/128`, `8GB RAM`, `র‍্যাম ৮জিবি`, `8+256GB`, etc. with priority ordering and plausibility checks (RAM must be 1–24GB, storage must be 16–1024GB)

**Camera extraction** — strips RAM/storage lookalike values (e.g. `6+128` misread as camera spec) using context-aware filtering with RAM and storage exclusion

**Location geocoding** — 200+ Bengali place names resolved to lat/lon via OSM Nominatim, cached to `osm_results.json`, with division-level fallback for unknown places

**Group-level imputation** — fills missing Network, Battery, Camera_Type, Camera_Pixel using the mode within Brand+Model groups

**Store detection** — sellers with more than 5 listings are classified as stores (`is_store = True`)

**Condition normalization** — Bengali `ব্যবহৃত` → `Used`, `নতুন` → `New`

---

## 📡 API Reference

### `GET /search`
Fetch full market analysis for a phone model.

| Param | Type | Description |
|---|---|---|
| `Brand` | string | e.g. `Samsung` |
| `Model` | string | e.g. `Galaxy A55` |

**Response includes:** stats, listings with deal classification, price distribution, timeline, market score, AI recommendation, price forecast, location data, variant info.

---

### `POST /estimate_price`
ML-powered price prediction. Rate limited to 10 requests/minute.

```json
{
  "Brand": "Samsung",
  "Model": "Galaxy A55",
  "RAM": 8,
  "Storage": 128,
  "Condition": "Used",
  "Network": "5G",
  "Division": "ঢাকা",
  "Location": "গুলশান",
  "has_warranty": "Yes",
  "is_store": "No"
}
```

**Response:**
```json
{
  "success": true,
  "predicted_price": 28500,
  "confidence_range": [25650, 31350],
  "market_avg": 27800,
  "confidence_level": "High",
  "sample_size": 47,
  "note": "Based on 47 similar listings in our database"
}
```

---

### `POST /create_alert`
Create a price drop alert.

```json
{
  "email": "user@example.com",
  "brand": "Apple",
  "model": "iPhone 13",
  "target_price": 55000,
  "condition": "Used",
  "location": "Any",
  "min_ram": "Any",
  "min_storage": "128GB",
  "needs_warranty": 1
}
```

---

### Other Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/get_Brands` | GET | List all available brands |
| `/get_Models?Brand=X` | GET | Models for a given brand |
| `/get_form_options` | GET | All dropdown options for price estimator |
| `/my_alerts?email=X` | GET | User's active alerts |
| `/delete_alert/<id>` | DELETE | Remove an alert by ID |

---

## 🚀 Local Setup

### Prerequisites
- Python 3.10+
- Node.js (for `gsmarena-api`)

### Installation

```bash
# Clone the repo
git clone https://github.com/RajonAyon/BIkroy_Price_Intelligence.git
cd BIkroy_Price_Intelligence

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Install Python dependencies
pip install -r requirements.txt

# Install Node dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
FLASK_SECRET_KEY=your_secret_key_here
SENDER_EMAIL=your_gmail@gmail.com
SENDER_PASSWORD=your_app_password_here
```

> For Gmail alerts, use an [App Password](https://support.google.com/accounts/answer/185833) — not your regular account password.

### Running the Pipeline

```bash
cd scraper

# Step 1: Scrape listings
python scraper.py

# Step 2: Clean data
jupyter nbconvert --to notebook --execute data_handling/data_clean.ipynb

# Step 3: Train model
jupyter nbconvert --to notebook --execute data_handling/prediction.ipynb

# Or run all three steps at once
python run_pipeline.py
```

### Running the Web App

```bash
# From project root (production)
gunicorn website.app:app --bind 0.0.0.0:5000

# Development mode
python -m flask --app website.app run --debug
```

Visit `http://localhost:5000`

---

## ☁️ Deployment (Render)

The app is deployed on [Render](https://render.com) using the included `Procfile`:

```
web: gunicorn website.app:app --bind 0.0.0.0:$PORT
```

**Large files** (trained model, cleaned database) are tracked with **Git LFS**:

```
scraper/data/cleaned_mobiles.db
website/models/xgb_model.pkl
scraper/website/models/encoders.pkl
scraper/website/models/X_columns.pkl
```

**Deployment workflow:**
1. Scraper runs locally on schedule → database grows daily
2. Retrain model on updated data weekly
3. Push updated LFS files → Render auto-deploys

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Scraping | `aiohttp`, `BeautifulSoup4`, `asyncio` |
| Data Processing | `pandas`, `numpy`, `regex`, `rapidfuzz` |
| Geocoding | OpenStreetMap Nominatim via `requests` |
| ML | `XGBoost`, `scikit-learn`, `statsmodels` |
| Backend | `Flask`, `Flask-Limiter`, `APScheduler` |
| Database | SQLite |
| Frontend | Vanilla JS, Chart.js, Leaflet.js, Leaflet.MarkerCluster |
| Deployment | Render, Git LFS, Gunicorn |

---

## 🗺️ Roadmap

This is the **first of three planned projects** in this series — each targeting a different segment of the Bangladesh online market:

- [x] **Bikroy Phone Price Intelligence** ← You are here
- [ ] **Project 2** *(coming soon)*
- [ ] **Project 3** *(coming soon)*

Each project follows the same pattern: real Bangladesh market data, production-quality scraping and cleaning, ML-powered insights, and a deployed web interface.

---

## 📊 Data Notes

- Scraper runs locally (Windows Task Scheduler) and currently holds **10K+ listings**
- Target: **50K+ samples** for improved model generalization across more phone models
- Database uses URL as primary key — re-scraping the same listings is safely skipped via deduplication
- Failed URLs from each scrape run are saved to `data/failed_urls.txt` for retry on next run

---

## ⚠️ Disclaimer

This project is for educational and personal use. Scraping is done respectfully with concurrency limits and request delays. All data is sourced from publicly available listings on Bikroy.com.

---

## 👤 Author

**Rajon Ayon**  
GitHub: [@RajonAyon](https://github.com/RajonAyon)

---

## 📄 License

[MIT](LICENSE) — free to use, modify, and distribute.
