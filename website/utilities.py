"""
Utility functions for Bikroy Price Intelligence Application.
Handles price analysis, market intelligence, forecasting, and email alerts.
"""

import sqlite3
import pandas as pd
import numpy as np
from scipy import stats
from flask import jsonify
from datetime import datetime, timedelta
from collections import Counter
from contextlib import contextmanager
import os
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging
from statsmodels.tsa.holtwinters import ExponentialSmoothing

# Import configuration
from config import *
from queries import GET_PHONE_LISTINGS

# Setup logging
logging.basicConfig(
    filename='app.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Database path setup
current_dir = Path.cwd()
project_root = current_dir.parent
CLEANED_DB_PATH = project_root / 'scraper' / 'data' / 'cleaned_mobiles.db'


@contextmanager
def get_db_connection():
    """
    Context manager for database connections.
    Ensures connections are properly closed.
    
    Usage:
        with get_db_connection() as conn:
            df = pd.read_sql_query(query, conn)
    """
    conn = sqlite3.connect(CLEANED_DB_PATH)
    try:
        yield conn
    except Exception as e:
        logging.error(f"Database error: {e}", exc_info=True)
        raise
    finally:
        conn.close()


def get_variant_info(listings: List[Dict]) -> Dict:
    """
    Extract all available RAM/Storage variants from listings.
    
    Args:
        listings: List of phone listing dictionaries
    
    Returns:
        Dictionary containing mode config and all variants
    """
    rams = [l.get('ram') for l in listings if l.get('ram') and l.get('ram') != 'N/A']
    storages = [l.get('storage') for l in listings if l.get('storage') and l.get('storage') != 'N/A']
    
    # Get mode (most common)
    mode_ram = Counter(rams).most_common(1)[0][0] if rams else 'N/A'
    mode_storage = Counter(storages).most_common(1)[0][0] if storages else 'N/A'
    
    # Get all unique variants sorted numerically
    unique_rams = sorted(
        set(rams), 
        key=lambda x: float(x) if str(x).replace('.', '').isdigit() else 0
    )
    unique_storages = sorted(
        set(storages), 
        key=lambda x: float(x) if str(x).replace('.', '').isdigit() else 0
    )
    
    return {
        'mode_ram': mode_ram,
        'mode_storage': mode_storage,
        'all_rams': unique_rams,
        'all_storages': unique_storages,
        'variant_count': len(set(f"{r}/{s}" for r, s in zip(rams, storages)))
    }


def generate_ai_recommendation(
    df: pd.DataFrame, 
    avg_price: float, 
    timeline_data: List[Dict], 
    market_score: float, 
    great_deals: int
) -> Dict:
    """
    Generate smart buy/wait recommendation based on market analysis.
    
    Args:
        df: DataFrame of phone listings
        avg_price: Average market price
        timeline_data: Historical price data
        market_score: Market health score (-100 to 100)
        great_deals: Number of great deals available
    
    Returns:
        Dictionary with recommendation, confidence, and reasoning
    """
    recommendation = {
        'action': '',
        'confidence': 0,
        'reasons': [],
        'target_price_min': 0,
        'target_price_max': 0,
        'urgency': '',
        'emoji': ''
    }
    
    score = 0
    reasons = []
    
    # FACTOR 1: Price Trend Analysis
    if len(timeline_data) > 7:
        prices = [row['price'] for row in timeline_data]
        x = np.arange(len(prices))
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, prices)
        
        avg_timeline_price = np.mean(prices)
        pct_change = (slope / avg_timeline_price) * 100
        
        if p_value < SIGNIFICANT_TREND_P_VALUE:
            if pct_change < -3:
                score += 30
                reasons.append(f"📉 Prices dropped ~{abs(pct_change):.1f}% recently")
            elif pct_change < -1:
                score += 15
                reasons.append(f"📉 Prices declining ~{abs(pct_change):.1f}%")
            elif pct_change > 3:
                score -= 30
                reasons.append(f"📈 Prices rising ~{pct_change:.1f}% - may increase further")
            elif pct_change > 1:
                score -= 15
                reasons.append(f"📈 Prices trending up ~{pct_change:.1f}%")
    
    # FACTOR 2: Great Deals Availability
    if great_deals >= 5:
        score += 25
        reasons.append(f"🔥 {great_deals} great deals available")
    elif great_deals >= 3:
        score += 15
        reasons.append(f"✓ {great_deals} good deals found")
    elif great_deals >= 1:
        score += 5
        reasons.append(f"⚠️ Only {great_deals} deal(s) available")
    else:
        score -= 20
        reasons.append("❌ No great deals currently")
    
    # FACTOR 3: Market Health
    if market_score > BUYER_MARKET_SCORE:
        score += 20
        reasons.append("💰 Buyer's market - lots of competition")
    elif market_score > 0:
        score += 10
        reasons.append("⚖️ Balanced market")
    elif market_score > SELLER_MARKET_SCORE:
        score -= 10
        reasons.append("⚠️ Slightly overpriced market")
    else:
        score -= 20
        reasons.append("🔴 Seller's market - prices high")
    
    # FACTOR 4: Listing Freshness
    df['Published_Date'] = pd.to_datetime(df['Published_Date'])
    recent_listings = len(df[df['Published_Date'] >= datetime.now() - timedelta(days=FRESH_LISTING_DAYS)])
    
    if recent_listings >= len(df) * FRESH_MARKET_RATIO:
        score += 10
        reasons.append(f"🆕 {recent_listings} new listings this week")
    elif recent_listings <= len(df) * STALE_MARKET_RATIO:
        score -= 10
        reasons.append("⏳ Few new listings - market stagnant")
    
    # FACTOR 5: Price Variance
    price_std = df['Price'].std()
    price_cv = (price_std / avg_price) * 100
    
    if price_cv < STABLE_MARKET_CV:
        score += 10
        reasons.append("✓ Stable pricing across listings")
    elif price_cv > CHAOTIC_MARKET_CV:
        score -= 5
        reasons.append("⚠️ High price variance - shop carefully")
    
    # DECISION LOGIC
    confidence = min(max(50 + score, 0), 100)
    
    if score >= BUY_NOW_SCORE:
        recommendation['action'] = 'BUY NOW'
        recommendation['emoji'] = '✅'
        recommendation['urgency'] = '3-5 days'
    elif score >= GOOD_TIME_SCORE:
        recommendation['action'] = 'GOOD TIME TO BUY'
        recommendation['emoji'] = '✅'
        recommendation['urgency'] = '1 week'
    elif score >= NEUTRAL_SCORE:
        recommendation['action'] = 'NEUTRAL'
        recommendation['emoji'] = '⚖️'
        recommendation['urgency'] = '2 weeks'
    elif score >= WAIT_SCORE:
        recommendation['action'] = 'CONSIDER WAITING'
        recommendation['emoji'] = '⏳'
        recommendation['urgency'] = '2-3 weeks'
    else:
        recommendation['action'] = 'WAIT'
        recommendation['emoji'] = '🛑'
        recommendation['urgency'] = '1 month'
    
    # TARGET PRICE CALCULATION
    recommendation['target_price_min'] = int(avg_price * TARGET_PRICE_MIN_MULTIPLIER)
    recommendation['target_price_max'] = int(avg_price * TARGET_PRICE_MAX_MULTIPLIER)
    recommendation['confidence'] = confidence
    recommendation['reasons'] = reasons[:4]
    
    return recommendation

def generate_price_forecast(timeline_data: List[Dict], avg_price: float) -> Dict:
    """Price forecast using Holt-Winters Exponential Smoothing"""
    
    if len(timeline_data) < MIN_FORECAST_DATA_POINTS:
        return {'has_forecast': False, 'summary': "Not enough data"}
    
    prices = np.array([row['price'] for row in timeline_data])
    
    # Need at least 2 weeks for seasonal pattern
    if len(prices) < 14:
        # Fallback to simple exponential smoothing (no seasonality)
        try:
            model = ExponentialSmoothing(prices, trend='add', seasonal=None)
            fitted = model.fit()
            forecast_values = fitted.forecast(steps=30)
        except:
            # If that fails too, use moving average
            ma = np.mean(prices[-7:])
            forecast_values = np.full(30, ma)
    else:
        # Full Holt-Winters with weekly seasonality
        try:
            model = ExponentialSmoothing(
                prices, 
                trend='add',           # Additive trend
                seasonal='add',        # Additive seasonality
                seasonal_periods=7     # Weekly pattern (7 days)
            )
            fitted = model.fit()
            forecast_values = fitted.forecast(steps=30)
        except:
            # Fallback if seasonality detection fails
            model = ExponentialSmoothing(prices, trend='add', seasonal=None)
            fitted = model.fit()
            forecast_values = fitted.forecast(steps=30)
    
    # Calculate uncertainty from recent volatility
    recent_std = np.std(prices[-7:])
    
    # Generate forecast points
    forecast_points = []
    for days in [3, 7, 14, 30]:
        idx = days - 1
        expected = forecast_values[idx]
        uncertainty = recent_std * (1 + days * 0.02)  # Uncertainty grows with time
        
        # Apply realistic bounds
        expected = np.clip(expected, avg_price * 0.6, avg_price * 1.4)
        
        forecast_points.append({
            'days': days,
            'label': f"+{days}d",
            'expected': int(expected),
            'optimistic': int(max(expected - uncertainty, avg_price * 0.6)),
            'pessimistic': int(min(expected + uncertainty, avg_price * 1.4))
        })
    
    # Trend analysis
    current_price = prices[-1]
    week2_price = forecast_points[2]['expected']  # 14-day forecast
    pct_change = ((week2_price - current_price) / current_price) * 100
    
    # Determine trend
    if abs(pct_change) < 2:
        direction = 'stable'
        strength = ''
        summary = f"Prices stable around ৳{week2_price:,}"
    elif pct_change < -5:
        direction = 'falling'
        strength = 'strongly'
        savings = int(current_price - week2_price)
        summary = f"Prices falling. Could save ৳{savings:,} in 2 weeks"
    elif pct_change < 0:
        direction = 'falling'
        strength = 'slightly'
        savings = int(current_price - week2_price)
        summary = f"Slight downward trend. Potential ৳{savings:,} savings"
    elif pct_change > 5:
        direction = 'rising'
        strength = 'strongly'
        increase = int(week2_price - current_price)
        summary = f"Prices rising fast. May increase ৳{increase:,} soon"
    else:
        direction = 'rising'
        strength = 'slightly'
        increase = int(week2_price - current_price)
        summary = f"Slight upward trend. Consider buying now"
    
    return {
        'has_forecast': True,
        'trend_direction': direction,
        'trend_strength': strength,
        'forecast_points': forecast_points,
        'summary': summary,
        'confidence': 'medium' if len(prices) < 30 else 'high'
    }


def price_intelligence_tool(Brand: str, Model: str):
    """
    Analyze market intelligence for a specific phone model.
    
    Args:
        Brand: Phone brand name
        Model: Phone model name
    
    Returns:
        JSON response with comprehensive market analysis
    """
    try:
        with get_db_connection() as conn:
            df = pd.read_sql_query(GET_PHONE_LISTINGS, conn, params=(Brand, Model))
        
        if len(df) == 0:
            return jsonify({'error': 'No listings found'})
        
        # Calculate statistics
        avg_price = df['Price'].mean()
        min_price = df['Price'].min()
        max_price = df['Price'].max()
        
        # Price distribution
        price_distribution = df.groupby(pd.cut(df['Price'], bins=PRICE_BINS)).size().to_dict()
        distribution_data = [{'range': str(k), 'count': v} for k, v in price_distribution.items()]
        
        # Price timeline
        df['Published_Date'] = pd.to_datetime(df['Published_Date'])
        timeline = df.groupby(df['Published_Date'].dt.date)['Price'].mean().reset_index()
        timeline_data = [
            {'date': str(row['Published_Date']), 'price': int(row['Price'])} 
            for _, row in timeline.iterrows()
        ]
        
        # Deal radar
        great_deals = len(df[df['Price'] < avg_price * GREAT_DEAL_THRESHOLD])
        overpriced = len(df[df['Price'] > avg_price * AVERAGE_THRESHOLD])
        market_score = (great_deals - overpriced) / len(df) * 100
        
        # Market insights
        insights = generate_market_insights(df, timeline_data, avg_price)
        
        # Location data
        location_data = generate_location_data(df)
        
        # Categorize listings
        listings = categorize_listings(df, avg_price)
        
        # AI recommendation and forecast
        ai_recommendation = generate_ai_recommendation(
            df, avg_price, timeline_data, market_score, great_deals
        )
        price_forecast = generate_price_forecast(timeline_data, avg_price)
        
        return jsonify({
            'success': True,
            'stats': {
                'avg_price': int(avg_price),
                'min_price': int(min_price),
                'max_price': int(max_price),
                'count': len(df),
                'brand': Brand,
                'model': Model
            },
            'distribution': distribution_data,
            'timeline': timeline_data,
            'market_score': round(market_score, 1),
            'insights': insights,
            'listings': listings,
            'locationdata': location_data,
            'ai_recommendation': ai_recommendation,
            'price_forecast': price_forecast,
            'variant_info': get_variant_info(listings)
        })
        
    except Exception as e:
        logging.error(f"Error in price_intelligence_tool: {e}", exc_info=True)
        return jsonify({'error': str(e)})


def generate_market_insights(df: pd.DataFrame, timeline_data: List[Dict], avg_price: float) -> List[str]:
    """Generate market insights from data analysis."""
    insights = []
    
    # Price trend insight
    if len(timeline_data) > 2:
        prices = [row['price'] for row in timeline_data]
        x = np.arange(len(prices))
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, prices)
        
        pct_change = (slope / np.mean(prices)) * 100
        
        if p_value < SIGNIFICANT_TREND_P_VALUE and abs(pct_change) > MEANINGFUL_CHANGE_PERCENT:
            if pct_change < 0:
                insights.append(f"📉 Prices dropping ~{abs(pct_change):.1f}% per period")
            else:
                insights.append(f"📈 Prices rising ~{pct_change:.1f}% per period")
        else:
            insights.append("➡️ No clear price trend")
    
    # Location insights
    if 'Location' in df.columns:
        location_prices = df.groupby('Location')['Price'].mean().sort_values()
        if len(location_prices) > 1:
            cheapest = location_prices.index[0]
            insights.append(f"📍 Cheapest area: {cheapest} (avg ৳{int(location_prices.iloc[0])})")
    
    # Store vs Individual
    if 'is_store' in df.columns:
        store_avg = df[df['is_store'] == 1]['Price'].mean()
        individual_avg = df[df['is_store'] == 0]['Price'].mean()
        if not pd.isna(store_avg) and not pd.isna(individual_avg):
            diff = int(store_avg - individual_avg)
            if diff > 0:
                insights.append(f"🏪 Stores charge ৳{diff} more on average")
    
    # Warranty insight
    if 'has_warranty' in df.columns:
        warranty_avg = df[df['has_warranty'] == 1]['Price'].mean()
        no_warranty_avg = df[df['has_warranty'] == 0]['Price'].mean()
        if not pd.isna(warranty_avg) and not pd.isna(no_warranty_avg):
            diff = int(warranty_avg - no_warranty_avg)
            insights.append(f"📋 Warranty adds ৳{diff} to price")
    
    return insights


def generate_location_data(df: pd.DataFrame) -> List[Dict]:
    """Generate location-based price data with coordinates."""
    latlon_path = project_root / 'scraper' / 'data' / 'osm_results.json'
    
    try:
        with open(latlon_path, 'r', encoding='utf-8') as f:
            lat_lon_dict = json.load(f)
    except FileNotFoundError:
        logging.warning(f"Location data file not found: {latlon_path}")
        lat_lon_dict = {}
    
    location_data = df.groupby('Location').agg(
        count=('Price', 'count'),
        avg_price=('Price', 'mean')
    ).reset_index()
    
    location_data['avg_price'] = location_data['avg_price'].round(2)
    location_data['lat'] = location_data['Location'].map(
        lambda x: lat_lon_dict.get(x, [None, None])[0]
    )
    location_data['lon'] = location_data['Location'].map(
        lambda x: lat_lon_dict.get(x, [None, None])[1]
    )
    
    return location_data.to_dict(orient='records')


def categorize_listings(df: pd.DataFrame, avg_price: float) -> List[Dict]:
    """Categorize each listing by deal quality and trust score."""
    listings = []
    
    for _, row in df.iterrows():
        price_diff = ((row['Price'] - avg_price) / avg_price) * 100
        
        # Determine deal type
        if price_diff < -10:
            deal_type, deal_label = 'great', 'GREAT DEAL'
            deal_msg = f"🔥 {abs(int(price_diff))}% below market - Grab fast!"
        elif price_diff < 5:
            deal_type, deal_label = 'fair', 'FAIR PRICE'
            deal_msg = '✓ Reasonable deal'
        elif price_diff < 15:
            deal_type, deal_label = 'average', 'AVERAGE'
            deal_msg = 'ℹ️ Slightly high but acceptable'
        else:
            deal_type, deal_label = 'overpriced', 'OVERPRICED'
            deal_msg = f"⚠️ AVOID - {int(price_diff)}% above market"
        
        # Calculate trust score
        trust_score = 0
        trust_badges = []
        
        if row.get('is_store') == 1:
            trust_score += TRUST_SCORE_STORE
            trust_badges.append('🏪 Verified Store')
        if row.get('has_warranty') == 1:
            trust_score += TRUST_SCORE_WARRANTY
            trust_badges.append('✅ Warranty')
        if row.get('Condition') == 'New':
            trust_score += TRUST_SCORE_NEW_CONDITION
        
        listings.append({
            'price': int(row['Price']),
            'location': row.get('Location', 'N/A'),
            'condition': row.get('Condition', 'N/A'),
            'url': row.get('URL', '#'),
            'deal_type': deal_type,
            'deal_label': deal_label,
            'deal_msg': deal_msg,
            'price_diff': int(price_diff),
            'trust_score': trust_score,
            'trust_badges': trust_badges,
            'seller_name': row.get('Seller_name', 'Unknown'),
            'published_date': str(row.get('Published_Date', '')),
            'ram': row.get('RAM', 'N/A'),
            'storage': row.get('Storage', 'N/A'),
            'battery': row.get('Battery', 'N/A'),
            'Camera_Pixel': row.get('Camera_Pixel', 'N/A'),
            'Network': row.get('Network', 'N/A')
        })
    
    listings.sort(key=lambda x: x['price'])
    return listings


def send_alert_email(alert: Dict, matches: pd.DataFrame) -> None:
    """
    Send email notification when price alert is triggered.
    
    Args:
        alert: Alert configuration dictionary
        matches: DataFrame of matching listings
    """
    try:
        sender_email = os.getenv("SENDER_EMAIL")
        sender_password = os.getenv("SENDER_PASSWORD")
        
        if not sender_email or not sender_password:
            logging.error("Email credentials not configured")
            return
        
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = alert['email']
        msg['Subject'] = f"🔥 Price Alert: {alert['brand']} {alert['model']} under ৳{alert['target_price']:,}"
        
        # Build email body
        body = f"""
        <h2>Your Price Alert Was Triggered! 🎉</h2>
        <p>We found <strong>{len(matches)}</strong> listings matching your criteria:</p>
        
        <h3>Your Alert:</h3>
        <ul>
            <li>Phone: {alert['brand']} {alert['model']}</li>
            <li>Max Price: ৳{alert['target_price']:,}</li>
            <li>Condition: {alert['condition']}</li>
            <li>Location: {alert['location']}</li>
        </ul>
        
        <h3>Top 3 Matches:</h3>
        """
        
        for idx, listing in matches.head(3).iterrows():
            body += f"""
            <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0;">
                <strong>৳{listing['Price']:,}</strong> - {listing['Condition']}<br>
                📍 {listing['Location']}<br>
                💾 {listing['RAM']}/{listing['Storage']}<br>
                👤 {listing['Seller_name']}<br>
                <a href="{listing['URL']}" style="color: #667eea;">View Listing →</a>
            </div>
            """
        
        body += f"""
        <p><a href="http://localhost:5000" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View All {len(matches)} Matches</a></p>
        <p style="color: #666; font-size: 12px;">This alert has been triggered {alert['times_triggered'] + 1} times.</p>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        
        logging.info(f"Alert email sent to {alert['email']}")
    
    except Exception as e:
        logging.error(f"Failed to send alert email: {e}", exc_info=True)