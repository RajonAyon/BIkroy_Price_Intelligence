"""
Configuration constants for the Bikroy Price Intelligence application.
"""

# Price Analysis Thresholds
GREAT_DEAL_THRESHOLD = 0.9  # 10% below market
FAIR_PRICE_THRESHOLD = 1.05  # Within 5% of market
AVERAGE_THRESHOLD = 1.15    # Within 15% of market
# Anything above is OVERPRICED

# Market Score Thresholds
BUYER_MARKET_SCORE = 20
SELLER_MARKET_SCORE = -20

# Price Trend Analysis
SIGNIFICANT_TREND_P_VALUE = 0.05
MEANINGFUL_CHANGE_PERCENT = 1.0

# Listing Freshness
FRESH_LISTING_DAYS = 7
STALE_MARKET_RATIO = 0.2
FRESH_MARKET_RATIO = 0.5

# Price Variance (Coefficient of Variation)
STABLE_MARKET_CV = 15
CHAOTIC_MARKET_CV = 30

# Recommendation Scoring
BUY_NOW_SCORE = 30
GOOD_TIME_SCORE = 10
NEUTRAL_SCORE = -10
WAIT_SCORE = -30

# Target Price Calculation
TARGET_PRICE_MIN_MULTIPLIER = 0.85
TARGET_PRICE_MAX_MULTIPLIER = 0.95

# Forecast Settings
MIN_FORECAST_DATA_POINTS = 3
FORECAST_DAYS = [7, 14, 21, 28]
STRONG_TREND_THRESHOLD = 2.0

# Email Settings
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

# Trust Score Weights
TRUST_SCORE_STORE = 30
TRUST_SCORE_WARRANTY = 40
TRUST_SCORE_NEW_CONDITION = 30

# Price Distribution Bins (in BDT)
PRICE_BINS = [0, 10000, 15000, 20000, 25000, 30000, 50000, 100000, 150000, 200000, 260000]

# Sample Size for Confidence Levels
HIGH_CONFIDENCE_SAMPLES = 20
MEDIUM_CONFIDENCE_SAMPLES = 10

# Alert Check Interval (hours)
ALERT_CHECK_INTERVAL = 1