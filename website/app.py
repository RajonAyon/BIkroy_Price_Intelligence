"""
Bikroy Price Intelligence Flask Application.
Provides API endpoints for phone price analysis, alerts, and predictions.
"""

from flask import Flask, jsonify, render_template, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
import logging
import re
import os
import pickle
import sqlite3
import pandas as pd
import atexit
from datetime import datetime

# Import local modules
from .utilities import (
    price_intelligence_tool,
    send_alert_email,
    get_db_connection,
    CLEANED_DB_PATH
)
from .queries import (
    GET_BRANDS,
    GET_MODELS,
    INSERT_ALERT,
    GET_USER_ALERTS,
    DELETE_ALERT,
    GET_ACTIVE_ALERTS,
    UPDATE_ALERT_TRIGGER,
    ALERT_MATCH_BASE,
    GET_DIVISIONS,
    GET_LOCATIONS_WITH_DIVISIONS,
    GET_TOP_CAMERAS,
    GET_MARKET_COMPARISON
)
from .config import (
    ALERT_CHECK_INTERVAL,
    HIGH_CONFIDENCE_SAMPLES,
    MEDIUM_CONFIDENCE_SAMPLES
)

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    filename='app.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")

# Setup rate limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)


# ============= HELPER FUNCTIONS =============

def is_valid_email(email: str) -> bool:
    """
    Validate email format.
    
    Args:
        email: Email string to validate
    
    Returns:
        True if valid, False otherwise
    """
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None


# ============= ROUTES =============

@app.route("/")
def homepage():
    """Render main application page."""
    return render_template("main.html")


@app.route('/get_Brands')
def get_brands():
    """
    Get list of all available phone brands.
    
    Returns:
        JSON array of brand names
    """
    try:
        with get_db_connection() as conn:
            df = pd.read_sql_query(GET_BRANDS, conn)
        
        brands = df['Brand'].tolist()
        return jsonify(brands)
    
    except Exception as e:
        logging.error(f"Error in get_brands: {e}", exc_info=True)
        return jsonify([])


@app.route('/get_Models')
def get_models():
    """
    Get list of models for a specific brand.
    
    Query Parameters:
        Brand: Phone brand name
    
    Returns:
        JSON array of model names
    """
    brand = request.args.get('Brand', '')
    
    if not brand:
        return jsonify({'error': 'Brand parameter required'}), 400
    
    try:
        with get_db_connection() as conn:
            df = pd.read_sql_query(GET_MODELS, conn, params=(brand,))
        
        models = df['Model'].tolist()
        logging.info(f"Retrieved {len(models)} models for brand: {brand}")
        return jsonify(models)
    
    except Exception as e:
        logging.error(f"Error in get_models: {e}", exc_info=True)
        return jsonify([])


@app.route('/search')
def search():
    """
    Search and analyze phone listings.
    
    Query Parameters:
        Brand: Phone brand name
        Model: Phone model name
    
    Returns:
        JSON with comprehensive market analysis
    """
    brand = request.args.get('Brand', '')
    model = request.args.get('Model', '')
    
    if not brand or not model:
        return jsonify({'error': 'Brand and Model parameters required'}), 400
    
    logging.info(f"Search request: {brand} {model}")
    return price_intelligence_tool(brand, model)


@app.route('/create_alert', methods=['POST'])
def create_alert():
    """
    Create a new price alert.
    
    Request Body (JSON):
        email: User email address
        brand: Phone brand
        model: Phone model
        target_price: Maximum price threshold
        condition: Phone condition (optional)
        location: Preferred location (optional)
        min_ram: Minimum RAM (optional)
        min_storage: Minimum storage (optional)
        needs_warranty: Warranty requirement (optional)
    
    Returns:
        JSON with success status and alert ID
    """
    try:
        data = request.json
        
        # Validate email
        if not is_valid_email(data.get('email', '')):
            return jsonify({
                'success': False, 
                'error': 'Invalid email address'
            }), 400
        
        # Validate required fields
        required = ['email', 'brand', 'model', 'target_price']
        for field in required:
            if not data.get(field):
                return jsonify({
                    'success': False, 
                    'error': f'Missing required field: {field}'
                }), 400
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(INSERT_ALERT, (
                data['email'],
                data['brand'],
                data['model'],
                data['target_price'],
                data.get('condition', 'Any'),
                data.get('location', 'Any'),
                data.get('min_ram', 'Any'),
                data.get('min_storage', 'Any'),
                data.get('needs_warranty', 0)
            ))
            conn.commit()
            alert_id = cursor.lastrowid
        
        logging.info(f"Alert created: ID={alert_id}, Email={data['email']}")
        return jsonify({
            'success': True, 
            'alert_id': alert_id, 
            'message': '✅ Alert created!'
        })
    
    except Exception as e:
        logging.error(f"Error creating alert: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/my_alerts', methods=['GET'])
def my_alerts():
    """
    Get all alerts for a user.
    
    Query Parameters:
        email: User email address
    
    Returns:
        JSON with list of user's alerts
    """
    email = request.args.get('email', '')
    
    if not is_valid_email(email):
        return jsonify({'success': False, 'error': 'Invalid email'}), 400
    
    try:
        with get_db_connection() as conn:
            df = pd.read_sql_query(GET_USER_ALERTS, conn, params=(email,))
        
        alerts = df.to_dict(orient='records')
        return jsonify({'success': True, 'alerts': alerts})
    
    except Exception as e:
        logging.error(f"Error fetching alerts: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/delete_alert/<int:alert_id>', methods=['DELETE'])
def delete_alert(alert_id: int):
    """
    Delete a price alert.
    
    Path Parameters:
        alert_id: Alert ID to delete
    
    Returns:
        JSON with success status
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(DELETE_ALERT, (alert_id,))
            conn.commit()
        
        logging.info(f"Alert deleted: ID={alert_id}")
        return jsonify({'success': True, 'message': 'Alert deleted'})
    
    except Exception as e:
        logging.error(f"Error deleting alert: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/check_alerts')
def check_alerts():
    """
    Background job to check all active alerts.
    This endpoint is called by the scheduler every hour.
    
    Returns:
        JSON with check summary
    """
    try:
        with get_db_connection() as conn:
            alerts_df = pd.read_sql_query(GET_ACTIVE_ALERTS, conn)
            
            triggered = 0
            
            for _, alert in alerts_df.iterrows():
                # Build dynamic query
                query = ALERT_MATCH_BASE
                params = [alert['brand'], alert['model'], alert['target_price']]
                
                # Add optional filters
                if alert['condition'] != 'Any':
                    query += ' AND Condition = ?'
                    params.append(alert['condition'])
                
                if alert['location'] != 'Any':
                    query += ' AND Location = ?'
                    params.append(alert['location'])
                
                if alert['min_ram'] != 'Any':
                    query += ' AND RAM >= ?'
                    params.append(alert['min_ram'])
                
                if alert['min_storage'] != 'Any':
                    query += ' AND Storage >= ?'
                    params.append(alert['min_storage'])
                
                if alert['needs_warranty'] == 1:
                    query += ' AND has_warranty = 1'
                
                # Find matches
                matches = pd.read_sql_query(query, conn, params=params)
                
                if len(matches) > 0:
                    send_alert_email(alert, matches)
                    
                    # Update alert
                    cursor = conn.cursor()
                    cursor.execute(
                        UPDATE_ALERT_TRIGGER, 
                        (datetime.now(), alert['id'])
                    )
                    conn.commit()
                    triggered += 1
        
        logging.info(f"Alert check completed: {len(alerts_df)} checked, {triggered} triggered")
        return jsonify({
            'success': True,
            'message': f'Checked {len(alerts_df)} alerts, triggered {triggered}'
        })
    
    except Exception as e:
        logging.error(f"Error checking alerts: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/get_form_options')
def get_form_options():
    """
    Get all dropdown options for price estimator form.
    
    Returns:
        JSON with brands, divisions, locations, cameras, etc.
    """
    try:
        with get_db_connection() as conn:
            # Get brands
            brands = pd.read_sql_query(GET_BRANDS, conn)['Brand'].tolist()
            
            # Get divisions
            divisions = pd.read_sql_query(GET_DIVISIONS, conn)['Division'].tolist()
            
            # Get locations grouped by division
            locations_df = pd.read_sql_query(GET_LOCATIONS_WITH_DIVISIONS, conn)
            location_map = locations_df.groupby('Division')['Location'].apply(list).to_dict()
            
            # Get top cameras
            cameras = pd.read_sql_query(GET_TOP_CAMERAS, conn)['Camera_Pixel'].tolist()
        
        return jsonify({
            'brands': brands,
            'divisions': divisions,
            'locations': location_map,
            'cameras': cameras,
            'networks': ['4G', '5G'],
            'camera_types': ['Single', 'Dual', 'Triple', 'Quad'],
            'conditions': ['New', 'Used']
        })
    
    except Exception as e:
        logging.error(f"Error in get_form_options: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/estimate_price', methods=['POST'])
@limiter.limit("10 per minute")
def estimate_price():
    """
    Predict phone price using machine learning model.
    Rate limited to 10 requests per minute.
    
    Request Body (JSON):
        Brand, Model, Battery, Storage, RAM, Camera_Type, 
        Camera_Pixel, has_warranty, is_store, etc.
    
    Returns:
        JSON with predicted price and confidence metrics
    """
    try:
        data = request.json
        
        # Load ML models
        model_dir = os.path.join(os.path.dirname(__file__), 'models')
        
        with open(os.path.join(model_dir, 'xgb_model.pkl'), 'rb') as f:
            xgb_model = pickle.load(f)
        
        with open(os.path.join(model_dir, 'encoders.pkl'), 'rb') as f:
            encoders = pickle.load(f)
        
        with open(os.path.join(model_dir, 'X_columns.pkl'), 'rb') as f:
            X_columns = pickle.load(f)
        
        with open(os.path.join(model_dir, 'data_stats.pkl'), 'rb') as f:
            data_stats = pickle.load(f)
        
        # Convert boolean fields
        data['has_warranty'] = 1 if data.get('has_warranty') in ['Yes', 'yes', True, 1] else 0
        data['is_store'] = 1 if data.get('is_store') in ['Yes', 'yes', True, 1] else 0
        
        # Prepare input
        df_input = pd.DataFrame([data])
        
        # Fill missing numeric values
        numeric_cols = ["Battery", "Storage", "RAM"]
        for col in numeric_cols:
            if col in df_input.columns:
                if pd.isna(df_input[col].iloc[0]) or df_input[col].iloc[0] == "" or df_input[col].iloc[0] is None:
                    df_input[col] = data_stats.get(f'{col.lower()}_median', 0)
        
        # Fill missing categorical values
        cat_cols = ["Camera_Type", "Camera_Pixel"]
        for col in cat_cols:
            if col in df_input.columns:
                if df_input[col].iloc[0] == "" or pd.isna(df_input[col].iloc[0]):
                    df_input[col] = "Unknown"
        
        # Apply label encoders
        for col, le in encoders.items():
            if col in df_input.columns:
                val = df_input[col].iloc[0]
                if val in le.classes_:
                    df_input[col] = le.transform([val])[0]
                else:
                    df_input[col] = -1
        
        # One-hot encode
        df_input = pd.get_dummies(df_input)
        df_input = df_input.reindex(columns=X_columns, fill_value=0)
        
        # Predict
        predicted_price = int(xgb_model.predict(df_input)[0])
        confidence_lower = int(predicted_price * 0.9)
        confidence_upper = int(predicted_price * 1.1)
        
        # Get market comparison
        with get_db_connection() as conn:
            result = pd.read_sql_query(
                GET_MARKET_COMPARISON, 
                conn, 
                params=(data['Brand'], data['Model'])
            )
        
        market_avg = int(result['avg_price'].iloc[0]) if result['count'].iloc[0] > 0 else predicted_price
        sample_size = int(result['count'].iloc[0])
        
        # Determine confidence level
        if sample_size > HIGH_CONFIDENCE_SAMPLES:
            confidence_level = "High"
        elif sample_size > MEDIUM_CONFIDENCE_SAMPLES:
            confidence_level = "Medium"
        else:
            confidence_level = "Low"
        
        logging.info(f"Price estimated for {data['Brand']} {data['Model']}: ৳{predicted_price}")
        
        return jsonify({
            'success': True,
            'predicted_price': predicted_price,
            'confidence_range': [confidence_lower, confidence_upper],
            'market_avg': market_avg,
            'confidence_level': confidence_level,
            'sample_size': sample_size,
            'note': f'Based on {sample_size} similar listings in our database'
        })
    
    except Exception as e:
        logging.error(f"Error in estimate_price: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 400


# ============= SCHEDULER SETUP =============

scheduler = BackgroundScheduler()
scheduler.add_job(
    func=check_alerts,
    trigger="interval",
    hours=ALERT_CHECK_INTERVAL,
    id='alert_checker',
    name='Check price alerts',
    replace_existing=True
)
scheduler.start()

# Shutdown scheduler on exit
atexit.register(lambda: scheduler.shutdown())

logging.info("Flask application started successfully")


# ============= ERROR HANDLERS =============

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors."""
    logging.error(f"Internal server error: {e}", exc_info=True)
    return jsonify({'error': 'Internal server error'}), 500


# ============= MAIN =============

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)