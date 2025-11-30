# BIkroy_Price_Intelligence

# 📱 Bikroy Price Intelligence System

> **A production-grade price intelligence platform for Bangladesh's secondhand phone market**

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)](https://flask.palletsprojects.com/)
[![ML](https://img.shields.io/badge/ML-XGBoost-orange.svg)](https://xgboost.readthedocs.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![image alt](https://github.com/RajonAyon/BIkroy_Price_Intelligence/blob/fcf2202d773ec8ab2ab01863781a7da4b7df5ad9/Screenshot%202025-11-28%20130446.png)
![image alt](https://github.com/RajonAyon/BIkroy_Price_Intelligence/blob/fcf2202d773ec8ab2ab01863781a7da4b7df5ad9/Screenshot%202025-11-28%20130506.png)
![image alt](https://github.com/RajonAyon/BIkroy_Price_Intelligence/blob/fcf2202d773ec8ab2ab01863781a7da4b7df5ad9/Screenshot%202025-11-28%20130546.png)
![image alt](https://github.com/RajonAyon/BIkroy_Price_Intelligence/blob/fcf2202d773ec8ab2ab01863781a7da4b7df5ad9/Screenshot%202025-11-28%20130602.png)
![image alt](https://github.com/RajonAyon/BIkroy_Price_Intelligence/blob/fcf2202d773ec8ab2ab01863781a7da4b7df5ad9/Screenshot%202025-11-28%20130614.png)


**Live Demo:** [bikroy-price-intelligence.onrender.com](https://bikroy-price-intelligence.onrender.com/)

---

## 🎯 Problem Statement

Buying a used phone in Bangladesh is risky:
- **No price transparency** - sellers can list at any price
- **Price manipulation** - hard to know if you're being scammed
- **Information asymmetry** - buyers don't know market rates
- **Scattered listings** - need to manually check multiple sites daily

**Solution:** An automated system that scrapes, cleans, analyzes, and predicts fair market prices using machine learning.

---

## 🚀 What This Project Does

### Core Features

1. **🤖 Automated Web Scraping**
   - Scrapes 10,000+ phone listings from Bikroy.com
   - Handles Bengali/English text, emojis, malformed data
   - Async scraping with retry logic and rate limiting
   - Designed to scale to 4+ marketplaces (Bikroy, OLX, Facebook Marketplace, ClickBD)

2. **🧹 Intelligent Data Cleaning**
   - Extracts RAM, Storage, Battery, Camera specs using regex
   - Handles Bengali numerals (০১২৩৪৫৬৭৮৯ → 0123456789)
   - Fuzzy matching for location names
   - Geocoding with OpenStreetMap API
   - Filters out accessories (chargers, cases, etc.)

3. **📊 Price Intelligence Tool**
   - Shows fair market price for any phone model
   - Identifies underpriced/overpriced listings
   - Market health score (buyer's vs seller's market)
   - Trust indicators (warranty, store seller, listing age)
   - Price distribution and geographic heatmap

4. **⚖️ Smart Phone Comparison**
   - Side-by-side spec and price comparison
   - Value-for-money scoring
   - Multiple variant support (different RAM/Storage configs)

5. **🔮 AI Price Estimator**
   - **XGBoost regression model** (R² = 0.81, MAE = ৳2,093)
   - Predicts prices based on specs, location, condition
   - Confidence intervals and sample size warnings
   - Handles missing data gracefully

6. **🔔 Price Alerts (Email Notifications)**
   - Set custom alerts for brand/model/price
   - Filters by condition, location, RAM, storage, warranty
   - Background scheduler checks hourly
   - Email sent when matching deals found

---

## 📁 Project Structure

```
bikroy/
├── scraper/
│   ├── scraper.py              # Main scraping logic (async)
│   ├── config.py               # Scraper configuration
│   ├── dbmanage.py             # Database operations
│   ├── run_pipeline.py         # End-to-end automation script
│   └── data_handling/
│       ├── data_clean.ipynb    # Data cleaning pipeline
│       └── prediction.ipynb    # ML model training
│   └── data/
│       ├── mobiles.db          # Raw scraped data
│       ├── cleaned_mobiles.db  # Cleaned + engineered features
│       └── osm_results.json    # Geocoding cache
│
├── website/
│   ├── app.py                  # Flask API backend
│   ├── utilities.py            # Helper functions
│   ├── queries.py              # SQL queries
│   ├── config.py               # App configuration
│   ├── models/                 # Trained ML models (XGBoost)
│   ├── templates/
│   │   └── main.html           # Frontend UI
│   └── static/
│       ├── style.css           # Styling
│       └── script.js           # Frontend logic (Charts, Maps, AJAX)
│
├── requirements.txt            # Dependencies
└── README.md                   # You are here
```

---

## 🛠️ Tech Stack

### Backend
- **Python 3.10+** - Core language
- **Flask** - REST API framework
- **SQLite** - Database (10K+ records, production ready for 50K+)
- **Pandas** - Data manipulation
- **XGBoost** - ML regression model
- **BeautifulSoup + aiohttp** - Async web scraping
- **APScheduler** - Background jobs (price alerts)

### Data Processing
- **Regex** - Spec extraction from messy text
- **RapidFuzz** - Fuzzy string matching
- **OpenStreetMap Nominatim** - Geocoding
- **FlashText** - Fast keyword matching for locations

### Frontend
- **Vanilla JavaScript** - No frameworks (performance)
- **Chart.js** - Price distribution charts
- **Leaflet.js** - Interactive maps with clustering
- **CSS Grid/Flexbox** - Responsive layout

### Machine Learning
- **scikit-learn** - Preprocessing, train-test split
- **LabelEncoder + One-Hot Encoding** - Categorical features
- **XGBoost** - Gradient boosting (n_estimators=400, max_depth=30)

---

## 📊 Data Pipeline

```
1. SCRAPE (scraper.py)
   ↓
   [Raw HTML] → BeautifulSoup → Extract fields
   ↓
2. STORE (mobiles.db)
   ↓
   [URL, Title, Price, Description, etc.]
   ↓
3. CLEAN (data_clean.ipynb)
   ↓
   - Remove emojis, unwanted keywords (charger, case)
   - Extract RAM, Storage, Battery, Camera with regex
   - Convert Bengali digits → English
   - Geocode locations (lat/lon)
   - Fill missing values (mode imputation)
   - Feature engineering (trust_score, is_store)
   ↓
4. EXPORT (cleaned_mobiles.db)
   ↓
   [25 columns, 10K rows]
   ↓
5. TRAIN MODEL (prediction.ipynb)
   ↓
   - Split 80/20 train-test
   - Label encode high-cardinality (Location, Model)
   - One-hot encode low-cardinality (Brand, Condition)
   - XGBoost training (R² = 0.81)
   ↓
6. DEPLOY (Flask app.py)
   ↓
   [REST API + Frontend on Render]
```

---

## 🧠 Machine Learning Details

### Model: XGBoost Regressor

**Training Results:**
- **R² Score:** 0.81 (explains 81% of price variance)
- **MAE:** ৳2,093 (average error ~12%)
- **MSE:** 11,105,025
- **Training Set:** 7,016 samples
- **Test Set:** 1,754 samples

**Feature Engineering:**
```python
# Numerical Features
RAM, Storage, Battery, lat, lon

# Categorical (One-Hot Encoded)
Brand, Condition, Network, Camera_Type, Division, has_warranty, is_store

# Categorical (Label Encoded)
Location, Model, Camera_Pixel  # Too many unique values for one-hot
```

**Hyperparameters:**
- `n_estimators=400` (more trees for stability)
- `max_depth=30` (deep trees for complex patterns)
- `learning_rate=0.02` (slow learning for accuracy)
- `subsample=0.8`, `colsample_bytree=0.8` (prevent overfitting)

**Feature Importance (Top 5):**
1. Network_5G (59.5%) - 5G phones are premium
2. Brand_Apple (26.2%) - Brand drives price
3. Network_4G (5.6%)
4. Brand_Google (1.9%)
5. Brand_OPPO (0.5%)

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.10+
- pip

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/bikroy-price-intelligence.git
cd bikroy-price-intelligence
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run Full Pipeline (Optional - Takes ~2 hours)
```bash
cd scraper
python run_pipeline.py
```

This will:
- Scrape Bikroy.com (saves to `mobiles.db`)
- Clean data (saves to `cleaned_mobiles.db`)
- Train ML model (saves to `website/models/`)

**Note:** Pre-trained models are included, so you can skip this step.

### 4. Run Flask App
```bash
cd website
python app.py
```

Visit: `http://localhost:5000`

---

## 🌐 API Endpoints

### Price Intelligence
```http
GET /search?Brand=Samsung&Model=A54
```
**Response:**
```json
{
  "stats": {"avg_price": 32500, "count": 45, ...},
  "listings": [...],
  "ai_recommendation": {"action": "BUY NOW", ...},
  "market_score": 18.5
}
```

### Price Estimator
```http
POST /estimate_price
Content-Type: application/json

{
  "Brand": "iPhone",
  "Model": "13",
  "RAM": 6,
  "Storage": 128,
  "Condition": "Used",
  "Network": "5G",
  ...
}
```

**Response:**
```json
{
  "predicted_price": 65000,
  "confidence_range": [58500, 71500],
  "confidence_level": "High"
}
```

### Price Alerts
```http
POST /create_alert
{
  "email": "user@example.com",
  "brand": "Samsung",
  "model": "S23",
  "target_price": 60000,
  ...
}
```

---

## 📈 Sample Insights

### Pricing Accuracy
| Phone Model | Actual Avg | Predicted | Error |
|-------------|-----------|-----------|-------|
| Samsung A54 | ৳32,500 | ৳33,200 | 2.1% |
| iPhone 13 | ৳68,000 | ৳65,500 | 3.7% |
| Xiaomi Note 12 | ৳18,500 | ৳19,100 | 3.2% |

### Market Distribution
- **67%** of listings are from individual sellers
- **33%** from stores (6+ listings)
- **49%** have warranty
- **Dhaka** has 62% of all listings

---

## 🎯 Future Improvements

### Planned Features (Not Implemented Due to Resource Constraints)

1. **Multi-Marketplace Scraping**
   - Target: OLX, Facebook Marketplace, ClickBD
   - Challenge: Each site has different HTML structure
   - Impact: 4x more data → better ML accuracy

2. **Automated Daily Updates**
   - **Current:** Manual scraping (~2 hours)
   - **Goal:** Cron job / Windows Task Scheduler daily at 2 AM
   - **Blocker:** Free hosting (Render) doesn't support background tasks
   - **Solution:** Deploy scraper separately on AWS EC2 / Heroku

3. **Price Trend Forecasting**
   - Predict if price will rise/fall in next 7/30 days
   - ARIMA or Prophet time-series model
   - Requires 6+ months of historical data

4. **Image Analysis (Computer Vision)**
   - Detect phone condition from listing photos
   - Classify as "New", "Good", "Fair", "Poor"
   - Use CNN (ResNet, EfficientNet)

5. **WhatsApp/Telegram Alerts**
   - Integrate Twilio / Telegram Bot API
   - Send instant notifications (faster than email)

6. **Chrome Extension**
   - Show "Fair Price: ৳X" overlay on Bikroy listing pages
   - Alert users in real-time while browsing

---

## ⚠️ Known Limitations

1. **Single Data Source**
   - Only Bikroy.com (400K monthly users)
   - Missing data from OLX, Facebook (larger markets)
   - **Impact:** May not reflect full market

2. **Manual Scraping**
   - Data updated weekly (should be daily)
   - **Reason:** No automated scheduler on free hosting

3. **Model Drift**
   - ML model trained on Nov 2024 data
   - Accuracy degrades if market changes (e.g., new iPhone launch)
   - **Solution:** Retrain monthly with fresh data

4. **No User Authentication**
   - Anyone can create unlimited alerts
   - **Risk:** Email spam / abuse
   - **Solution:** Add rate limiting + CAPTCHA

5. **Limited Geocoding**
   - Some locations not found in OpenStreetMap
   - Falls back to division-level coordinates
   - **Impact:** Less precise map clustering

---

## 🧪 Testing

### Manual Testing Checklist
- [x] Search for common phones (Samsung, iPhone, Xiaomi)
- [x] Test price alerts (create, view, delete)
- [x] Verify estimator accuracy (compare with actual listings)
- [x] Check map clustering on different zoom levels
- [x] Test on mobile devices (responsive design)

### Future: Automated Tests
```python
# tests/test_scraper.py
def test_extract_ram():
    text = "8/128 GB"
    assert extract_ram(text) == 8.0

def test_extract_storage():
    text = "6/256 GB"
    assert extract_storage(text) == 256.0
```

**Run with:** `pytest tests/`

---

## 📝 License

MIT License - Feel free to use for learning or commercial projects.

---

## 👨‍💻 Author

**Rajon Ahmed Ayon**
- 🎓 12th Grade Student
- 📧 Email: rajonayon143@gmail.com

---

## 🙏 Acknowledgments

- **Bikroy.com** - Data source
- **OpenStreetMap** - Geocoding API
- **Chart.js, Leaflet.js** - Visualizations
- **XGBoost Team** - ML library

---

## 📚 Learning Resources

If you're learning web scraping, ML, or Flask:
1. [BeautifulSoup Docs](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
2. [XGBoost Tutorial](https://xgboost.readthedocs.io/en/latest/tutorials/index.html)
3. [Flask Mega-Tutorial](https://blog.miguelgrinberg.com/post/the-flask-mega-tutorial-part-i-hello-world)

---

## 💡 Contributing

**Want to improve this project?**
- Open an issue for bugs
- Submit PRs for new features
- Star ⭐ the repo if you find it useful

---

*This project was built to solve a real problem and learn production-grade software development.*
