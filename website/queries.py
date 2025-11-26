"""
SQL queries for the Bikroy Price Intelligence application.
Centralized query management for better maintainability.
"""

# Brand and Model Queries
GET_BRANDS = """
    SELECT DISTINCT Brand 
    FROM cleaned_mobiles 
    WHERE Brand IS NOT NULL 
    ORDER BY Brand;
"""

GET_MODELS = """
    SELECT DISTINCT Model 
    FROM cleaned_mobiles 
    WHERE Brand = ? AND Model IS NOT NULL 
    ORDER BY Model;
"""

# Search and Price Intelligence
GET_PHONE_LISTINGS = """
    SELECT * 
    FROM cleaned_mobiles 
    WHERE Brand = ? AND Model = ?;
"""

# Form Options Queries
GET_DIVISIONS = """
    SELECT DISTINCT Division 
    FROM cleaned_mobiles 
    ORDER BY Division;
"""

GET_LOCATIONS_WITH_DIVISIONS = """
    SELECT DISTINCT Location, Division 
    FROM cleaned_mobiles 
    ORDER BY Location;
"""

GET_TOP_CAMERAS = """
    SELECT Camera_Pixel, COUNT(*) as freq 
    FROM cleaned_mobiles 
    GROUP BY Camera_Pixel 
    ORDER BY freq DESC 
    LIMIT 20;
"""

# Price Estimation Query
GET_MARKET_COMPARISON = """
    SELECT AVG(Price) as avg_price, COUNT(*) as count
    FROM cleaned_mobiles 
    WHERE Brand = ? AND Model = ?;
"""

# Alert Queries
INSERT_ALERT = """
    INSERT INTO price_alerts 
    (email, brand, model, target_price, condition, location, min_ram, min_storage, needs_warranty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
"""

GET_USER_ALERTS = """
    SELECT id, brand, model, target_price, condition, location, 
           min_ram, min_storage, needs_warranty, is_active, 
           created_at, times_triggered
    FROM price_alerts 
    WHERE email = ? 
    ORDER BY created_at DESC;
"""

GET_ACTIVE_ALERTS = """
    SELECT * 
    FROM price_alerts 
    WHERE is_active = 1;
"""

DELETE_ALERT = """
    DELETE FROM price_alerts 
    WHERE id = ?;
"""

UPDATE_ALERT_TRIGGER = """
    UPDATE price_alerts 
    SET last_checked = ?, times_triggered = times_triggered + 1
    WHERE id = ?;
"""

# Dynamic Alert Matching Query Base
ALERT_MATCH_BASE = """
    SELECT * FROM cleaned_mobiles 
    WHERE Brand = ? AND Model = ? AND Price <= ?
"""