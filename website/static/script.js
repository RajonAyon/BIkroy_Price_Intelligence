// Tab functionality
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        if (tab.classList.contains('disabled')) return;
        
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

// Get elements
const brandSelect = document.getElementById('brandSelect');
const modelSelect = document.getElementById('modelSelect');
const searchBtn = document.getElementById('searchBtn');
const resultsSection = document.getElementById('resultsSection');
const emptyState = document.getElementById('emptyState');

// Load brands when page loads
fetch('/get_Brands')
    .then(response => response.json())
    .then(data => {
        brandSelect.innerHTML = '<option value="">Select a brand</option>';
        data.forEach(brand => {
            brandSelect.innerHTML += `<option value="${brand}">${brand}</option>`;
        });
    })
    .catch(error => console.error('Error:', error));

// When brand selected, get models
brandSelect.addEventListener('change', function() {
    const brand = this.value;
    
    if (!brand) {
        modelSelect.disabled = true;
        modelSelect.innerHTML = '<option value="">First select a brand</option>';
        return;
    }
    
    fetch(`/get_Models?Brand=${brand}`)
        .then(response => response.json())
        .then(data => {
            modelSelect.disabled = false;
            modelSelect.innerHTML = '<option value="">Select a model</option>';
            data.forEach(model => {
                modelSelect.innerHTML += `<option value="${model}">${model}</option>`;
            });
        })
        .catch(error => console.error('Error:', error));
});

// Search button
searchBtn.addEventListener('click', function() {
    const brand = brandSelect.value;
    const model = modelSelect.value;
    
    if (!brand || !model) {
        alert('Please select both brand and model');
        return;
    }
    
    // Show loading
    resultsSection.innerHTML = '<div style="text-align:center;padding:40px;"><div class="loading-spinner"></div><p>Analyzing market data...</p></div>';
    resultsSection.classList.add('show');
    emptyState.style.display = 'none';
    
    fetch(`/search?Brand=${brand}&Model=${model}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                resultsSection.innerHTML = '<div class="empty-state"><h3>No listings found</h3></div>';
                return;
            }
            
            displayResults(data);
        })
        .catch(error => {
            console.error('Error:', error);
            resultsSection.innerHTML = '<div class="empty-state"><h3>Error loading results</h3></div>';
        });
});

function getRecommendationGradient(action) {
    if (action.includes('BUY NOW') || action.includes('GOOD TIME')) {
        return '#10b981, #059669'; // Green
    } else if (action.includes('NEUTRAL')) {
        return '#f59e0b, #d97706'; // Orange
    } else {
        return '#ef4444, #dc2626'; // Red
    }
}


function getConfidenceEmoji(confidence) {
    if (confidence >= 80) return '🟢';
    if (confidence >= 60) return '🟡';
    return '🟠';
}

function displayResults(data) {
    const { stats, listings, distribution, timeline, market_score, insights,locationdata, ai_recommendation,} = data;
    
    let html = `
        <!-- Stats Card -->
        <div class="stats-card">
            <h3>${stats.brand} ${stats.model}</h3>
            <div class="price-display">৳${stats.avg_price.toLocaleString()}</div>
            <div class="price-range">Fair Market Price (±৳1,500)</div>
            <div style="margin-top:15px;opacity:0.9;">
                Range: ৳${stats.min_price.toLocaleString()} - ৳${stats.max_price.toLocaleString()} | ${stats.count} listings
            </div>
        </div>

        <!-- AI RECOMMENDATION CARD (NEW!) -->
        ${ai_recommendation ? `
        <div class="ai-recommendation-card" style="background: linear-gradient(135deg, ${getRecommendationGradient(ai_recommendation.action)}); 
            border-radius: 15px; padding: 25px; margin: 20px 0; color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
            <h3 style="margin:0 0 15px 0; font-size: 1.2em;">RECOMMENDATION</h3>
            
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <div style="font-size: 2.5em;">${ai_recommendation.emoji}</div>
                <div>
                    <div style="font-size: 1.8em; font-weight: bold; margin-bottom: 5px;">
                        ${ai_recommendation.action}
                    </div>
                    <div style="opacity: 0.9;">Confidence: ${ai_recommendation.confidence}% ${getConfidenceEmoji(ai_recommendation.confidence)}</div>
                </div>
            </div>

            <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                <strong style="display: block; margin-bottom: 10px;">Why now ${ai_recommendation.action.includes('BUY') ? 'is good' : 'to consider'}:</strong>
                ${ai_recommendation.reasons.map(reason => `<div style="margin: 8px 0; padding-left: 10px;">• ${reason}</div>`).join('')}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px;">
                    <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 5px;">🎯 Target Price Range</div>
                    <div style="font-size: 1.3em; font-weight: bold;">
                        ৳${ai_recommendation.target_price_min.toLocaleString()} - ৳${ai_recommendation.target_price_max.toLocaleString()}
                    </div>
                </div>
                <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px;">
                    <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 5px;">⏰ Best to act within</div>
                    <div style="font-size: 1.3em; font-weight: bold;">${ai_recommendation.urgency}</div>
                </div>
            </div>
        </div>
        ` : ''}

                <!-- Price Forecast Section -->
        ${data.price_forecast && data.price_forecast.has_forecast ? `
        <div class="forecast-card">
            <h3>📈 Price Trend Forecast</h3>
            <p class="forecast-disclaimer">Based on recent market trends. Actual prices may vary.</p>
            
            <div class="trend-indicator ${data.price_forecast.trend_direction}">
                <span class="trend-icon">
                    ${data.price_forecast.trend_direction === 'falling' ? '📉' : 
                    data.price_forecast.trend_direction === 'rising' ? '📈' : '➡️'}
                </span>
                <span class="trend-text">
                    ${data.price_forecast.trend_strength} ${data.price_forecast.trend_direction}
                </span>
            </div>
            
            <div class="forecast-summary">${data.price_forecast.summary}</div>
            
            <div class="forecast-chart-container">
                <canvas id="forecastChart"></canvas>
            </div>
            
            <div class="forecast-grid">
                ${data.price_forecast.forecast_points.map(point => `
                    <div class="forecast-point">
                        <div class="forecast-label">${point.label}</div>
                        <div class="forecast-expected">৳${point.expected.toLocaleString()}</div>
                        <div class="forecast-range">
                            ৳${point.optimistic.toLocaleString()} - ৳${point.pessimistic.toLocaleString()}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}


        <!-- Deal Radar -->
        <div class="deal-radar-container">
            <h3 style="text-align:center;margin-bottom:20px;">📊 Market Health Radar</h3>
            <div class="deal-radar">
                <canvas id="dealRadarCanvas"></canvas>
                <div class="radar-label">${getMarketLabel(market_score)}</div>
            </div>
        </div>
        
        <!-- Map Section -->
        <div class="charts-section">
            <div class="chart-container">
                <h3>🗺️ Market Listings Map</h3>
                <div id="marketMap" style="height:500px; width:100%;"></div>
            </div>
        </div>

        <!-- Market Insights -->
        ${insights.length > 0 ? `
        <div class="insights-section">
            <h3>💡 Market Insights</h3>
            <div class="insights-grid">
                ${insights.map(insight => `<div class="insight-card">${insight}</div>`).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Charts Section -->
        <div class="charts-section">
            <div class="chart-container">
                <h3>📊 Price Distribution</h3>
                <canvas id="distributionChart"></canvas>
            </div>
        </div>

        <!-- Listings -->
        <div class="listings-header">
            <h3>All Listings (${listings.length})</h3>
            <div class="quick-stats">
                <span class="stat-badge great">🟢 ${listings.filter(l => l.deal_type === 'great').length} Great Deals</span>
                <span class="stat-badge overpriced">🔴 ${listings.filter(l => l.deal_type === 'overpriced').length} Overpriced</span>
            </div>
        </div>
        
        <div class="listings">
    `;
    
    listings.forEach(listing => {
        html += `
            <div class="listing-card">
                <span class="deal-badge ${listing.deal_type}">${listing.deal_label}</span>
                
                <div class="listing-header">
                    <div>
                        <div class="listing-price">৳${listing.price.toLocaleString()}</div>
                        <div style="color:#666;margin-top:5px;">${listing.deal_msg}</div>
                    </div>
                    ${listing.trust_score > 0 ? `
                    <div class="trust-indicator">
                        <div class="trust-score" style="background: linear-gradient(90deg, #4caf50 ${listing.trust_score}%, #e0e0e0 ${listing.trust_score}%);">
                            <span>${listing.trust_score}% Trust</span>
                        </div>
                    </div>
                    ` : ''}
                </div>

                ${listing.trust_badges.length > 0 ? `
                <div class="trust-badges">
                    ${listing.trust_badges.map(badge => `<span class="badge">${badge}</span>`).join('')}
                </div>
                ` : ''}
                
                <div class="listing-details">
                    <div class="detail-item">
                        <span>📍</span>
                        <span>${listing.location}</span>
                    </div>
                    <div class="detail-item">
                        <span>📦</span>
                        <span>${listing.condition}</span>
                    </div>
                    <div class="detail-item">
                        <span>💾</span>
                        <span>${listing.ram}/${listing.storage}</span>
                    </div>
                    <div class="detail-item">
                        <span>📊</span>
                        <span>${listing.price_diff > 0 ? '+' : ''}${listing.price_diff}% vs avg</span>
                    </div>
                    <div class="detail-item">
                        <span>👤</span>
                        <span>${listing.seller_name}</span>
                    </div>
                    <div class="detail-item">
                        <span>📅</span>
                        <span>${formatDate(listing.published_date)}</span>
                    </div>
                </div>
                
                <a href="${listing.url}" target="_blank" class="view-listing-btn">
                    View Listing →
                </a>
            </div>
        `;
    });
    
    html += '</div>';
    resultsSection.innerHTML = html;
    resultsSection.classList.add('show');
    
    // Draw charts after DOM is updated
    setTimeout(() => {
        drawDealRadar(market_score);
        drawDistributionChart(distribution);
        if (data.locationdata) {
            drawMarketMap(locationdata);
        }

        if (data.price_forecast && data.price_forecast.has_forecast) {
            drawForecastChart(timeline, data.price_forecast, stats.avg_price);
        }
    }, 100);
}

function getMarketLabel(score) {
    if (score > 20) return '🟢 Buyer\'s Market - Lots of deals!';
    if (score > 0) return '🟡 Balanced Market';
    if (score > -20) return '🟠 Slightly Overpriced';
    return '🔴 Seller\'s Market - Prices high';
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
    return `${Math.floor(diff / 30)} months ago`;
}

// Chart.js drawing functions
function drawDealRadar(score) {
    const canvas = document.getElementById('dealRadarCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background arc (gray)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#e0e0e0';
    ctx.stroke();
    
    // Draw score arc (colored)
    const normalizedScore = (score + 100) / 200; // Convert -100 to 100 into 0 to 1
    const endAngle = Math.PI + (normalizedScore * Math.PI);
    
    let color;
    if (score > 20) color = '#4caf50';
    else if (score > 0) color = '#ffc107';
    else if (score > -20) color = '#ff9800';
    else color = '#f44336';
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, endAngle);
    ctx.lineWidth = 20;
    ctx.strokeStyle = color;
    ctx.stroke();
    
    // Draw needle
    const needleAngle = Math.PI + (normalizedScore * Math.PI);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
        centerX + Math.cos(needleAngle) * (radius - 10),
        centerY + Math.sin(needleAngle) * (radius - 10)
    );
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#333';
    ctx.stroke();
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
    
    // Draw labels
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText('Overpriced', 10, centerY + 5);
    ctx.fillText('Great Deals', canvas.width - 70, centerY + 5);
}


function drawMarketMap(locationdata) {
    const mapDiv = document.getElementById('marketMap');
    if (!mapDiv) return;

    if (mapDiv._leaflet_id) {
        mapDiv._leaflet_id = null;
        mapDiv.innerHTML = "";
    }

    const map = L.map('marketMap').setView([23.8103, 90.4125], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Create a cluster group
    const markers = L.markerClusterGroup();

    locationdata.forEach(loc => {
        if (loc.lat && loc.lon) {
            const marker = L.circleMarker([loc.lat, loc.lon], {
                radius: 10 + Math.sqrt(loc.count) * 25, // size by count
                color: '#3388ff',
                fillColor: '#3388ff',
                fillOpacity: 0.6
            });

            marker.bindPopup(`
                <b>${loc.Location}</b><br>
                Listings: ${loc.count}<br>
                Avg Price: ৳${loc.avg_price.toLocaleString()}
            `);

            markers.addLayer(marker);
        }
    });

    map.addLayer(markers);
}


function drawDistributionChart(distribution) {
    const canvas = document.getElementById('distributionChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Parse distribution data
    const labels = distribution.map(d => {
        const range = d.range.replace('(', '').replace(']', '').split(',');
        return `৳${parseInt(range[0])/1000}K-${parseInt(range[1])/1000}K`;
    });
    const counts = distribution.map(d => d.count);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Listings',
                data: counts,
                backgroundColor: 'rgba(102, 126, 234, 0.6)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}


function drawForecastChart(timeline, forecast, avgPrice) {
    const canvas = document.getElementById('forecastChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Historical data
    const histLabels = timeline.slice(-7).map(t => {
        const date = new Date(t.date);
        return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    });
    const histPrices = timeline.slice(-7).map(t => t.price);
    
    // Forecast data
    const forecastLabels = forecast.forecast_points.map(p => `+${p.days}d`);
    const forecastExpected = forecast.forecast_points.map(p => p.expected);
    const forecastOptimistic = forecast.forecast_points.map(p => p.optimistic);
    const forecastPessimistic = forecast.forecast_points.map(p => p.pessimistic);
    
    // Combined labels
    const allLabels = [...histLabels, 'Today', ...forecastLabels];
    
    // Historical line (solid)
    const histData = [...histPrices, histPrices[histPrices.length-1], ...Array(4).fill(null)];
    
    // Forecast line (dashed)
    const forecastData = [...Array(histPrices.length).fill(null), histPrices[histPrices.length-1], ...forecastExpected];
    
    // Confidence bands
    const upperBand = [...Array(histPrices.length + 1).fill(null), ...forecastPessimistic];
    const lowerBand = [...Array(histPrices.length + 1).fill(null), ...forecastOptimistic];
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: allLabels,
            datasets: [
                {
                    label: 'Historical',
                    data: histData,
                    borderColor: '#667eea',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    pointRadius: 4,
                    tension: 0.3
                },
                {
                    label: 'Forecast',
                    data: forecastData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    pointRadius: 4,
                    tension: 0.3
                },
                {
                    label: 'Upper Bound',
                    data: upperBand,
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    fill: '+1',
                    pointRadius: 0
                },
                {
                    label: 'Lower Bound',
                    data: lowerBand,
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    ticks: {
                        callback: val => '৳' + val.toLocaleString()
                    }
                }
            }
        }
    });
}


document.addEventListener('DOMContentLoaded', function() {
    
    const alertBtn = document.getElementById('alertBtn');
    const alertModal = document.getElementById('alertModal');
    const closeModal = document.querySelector('.close-modal');
    const alertForm = document.getElementById('alertForm');
    const alertBrandSelect = document.getElementById('alertBrand');
    const alertModelSelect = document.getElementById('alertModel');

    // Check if elements exist
    if (!alertBtn || !alertModal) {
        console.error('Alert elements not found');
        return;
    }

    // Open modal
    alertBtn.addEventListener('click', () => {
        alertModal.style.display = 'flex';
        loadBrandsForAlert();
    });

    // Close modal
    closeModal.addEventListener('click', () => {
        alertModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === alertModal) {
            alertModal.style.display = 'none';
        }
    });

    // Tab switching
    document.querySelectorAll('.alert-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.alert-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.alert-tab-content').forEach(tc => tc.classList.remove('active'));
            
            tab.classList.add('active');
            const tabName = tab.getAttribute('data-tab');
            document.getElementById(`${tabName}AlertTab`).classList.add('active');
        });
    });

    // Load brands for alert form
    function loadBrandsForAlert() {
        fetch('/get_Brands')
            .then(response => response.json())
            .then(data => {
                alertBrandSelect.innerHTML = '<option value="">Select Brand</option>';
                data.forEach(brand => {
                    alertBrandSelect.innerHTML += `<option value="${brand}">${brand}</option>`;
                });
            })
            .catch(error => console.error('Error loading brands:', error));
    }

    // Load models when brand selected
    alertBrandSelect.addEventListener('change', function() {
        const brand = this.value;
        
        if (!brand) {
            alertModelSelect.disabled = true;
            alertModelSelect.innerHTML = '<option value="">First select brand</option>';
            return;
        }
        
        fetch(`/get_Models?Brand=${brand}`)
            .then(response => response.json())
            .then(data => {
                alertModelSelect.disabled = false;
                alertModelSelect.innerHTML = '<option value="">Select Model</option>';
                data.forEach(model => {
                    alertModelSelect.innerHTML += `<option value="${model}">${model}</option>`;
                });
            })
            .catch(error => console.error('Error loading models:', error));
    });

    // Submit alert form
    alertForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const alertData = {
            email: document.getElementById('alertEmail').value,
            brand: alertBrandSelect.value,
            model: alertModelSelect.value,
            target_price: parseInt(document.getElementById('alertPrice').value),
            condition: document.getElementById('alertCondition').value,
            location: document.getElementById('alertLocation').value,
            min_ram: document.getElementById('alertRam').value,
            min_storage: document.getElementById('alertStorage').value,
            needs_warranty: document.getElementById('alertWarranty').checked ? 1 : 0
        };
        
        fetch('/create_alert', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(alertData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('✅ Alert created! You\'ll get an email when we find matching deals.');
                alertForm.reset();
                alertModal.style.display = 'none';
            } else {
                alert('❌ Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error creating alert:', error);
            alert('❌ Failed to create alert');
        });
    });

    // Load user's alerts
    document.getElementById('loadAlertsBtn').addEventListener('click', function() {
        const email = document.getElementById('manageEmail').value;
        
        if (!email) {
            alert('Please enter your email');
            return;
        }
        
        fetch(`/my_alerts?email=${email}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayUserAlerts(data.alerts);
                    document.getElementById('alertCount').textContent = data.alerts.length;
                }
            })
            .catch(error => console.error('Error loading alerts:', error));
    });

    function displayUserAlerts(alerts) {
        const alertsList = document.getElementById('alertsList');
        
        if (alerts.length === 0) {
            alertsList.innerHTML = '<p style="text-align:center; color:#666; padding: 40px;">No active alerts</p>';
            return;
        }
        
        let html = '';
        alerts.forEach(alert => {
            html += `
                <div class="alert-item">
                    <div class="alert-info">
                        <strong>${alert.brand} ${alert.model}</strong>
                        <div class="alert-details">
                            <span>Max: ৳${alert.target_price.toLocaleString()}</span>
                            <span>📍 ${alert.location}</span>
                            <span>📦 ${alert.condition}</span>
                            ${alert.needs_warranty ? '<span>✅ Warranty</span>' : ''}
                        </div>
                        <small style="color:#666;">Triggered ${alert.times_triggered} times</small>
                    </div>
                    <button class="delete-alert-btn" data-id="${alert.id}">Delete</button>
                </div>
            `;
        });
        
        alertsList.innerHTML = html;
        
        // Delete button handlers
        document.querySelectorAll('.delete-alert-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const alertId = this.getAttribute('data-id');
                
                if (confirm('Delete this alert?')) {
                    fetch(`/delete_alert/${alertId}`, {method: 'DELETE'})
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                this.closest('.alert-item').remove();
                                alert('Alert deleted');
                                
                                // Update count
                                const remaining = document.querySelectorAll('.alert-item').length;
                                document.getElementById('alertCount').textContent = remaining;
                            }
                        })
                        .catch(error => console.error('Error deleting alert:', error));
                }
            });
        });
    }

}); // End DOMContentLoaded


// ========== PHONE COMPARISON LOGIC ==========

// Load brands for comparison dropdowns
fetch('/get_Brands')
    .then(response => response.json())
    .then(data => {
        const compare1 = document.getElementById('compareBrand1');
        const compare2 = document.getElementById('compareBrand2');
        
        if (compare1 && compare2) {
            const options = '<option value="">Select Brand</option>' + 
                          data.map(b => `<option value="${b}">${b}</option>`).join('');
            compare1.innerHTML = options;
            compare2.innerHTML = options;
        }
    });

// Handle brand selection for Phone 1
const compareBrand1 = document.getElementById('compareBrand1');
const compareModel1 = document.getElementById('compareModel1');

if (compareBrand1) {
    compareBrand1.addEventListener('change', function() {
        if (!this.value) {
            compareModel1.disabled = true;
            compareModel1.innerHTML = '<option value="">Select Model</option>';
            return;
        }
        
        fetch(`/get_Models?Brand=${this.value}`)
            .then(response => response.json())
            .then(data => {
                compareModel1.disabled = false;
                compareModel1.innerHTML = '<option value="">Select Model</option>' +
                    data.map(m => `<option value="${m}">${m}</option>`).join('');
            });
    });
}

// Handle brand selection for Phone 2
const compareBrand2 = document.getElementById('compareBrand2');
const compareModel2 = document.getElementById('compareModel2');

if (compareBrand2) {
    compareBrand2.addEventListener('change', function() {
        if (!this.value) {
            compareModel2.disabled = true;
            compareModel2.innerHTML = '<option value="">Select Model</option>';
            return;
        }
        
        fetch(`/get_Models?Brand=${this.value}`)
            .then(response => response.json())
            .then(data => {
                compareModel2.disabled = false;
                compareModel2.innerHTML = '<option value="">Select Model</option>' +
                    data.map(m => `<option value="${m}">${m}</option>`).join('');
            });
    });
}

// Compare button logic
const compareBtn = document.getElementById('compareBtn');
if (compareBtn) {
    compareBtn.addEventListener('click', function() {
        const brand1 = compareBrand1.value;
        const model1 = compareModel1.value;
        const brand2 = compareBrand2.value;
        const model2 = compareModel2.value;
        
        if (!brand1 || !model1 || !brand2 || !model2) {
            alert('Please select both phones to compare');
            return;
        }
        
        const resultsDiv = document.getElementById('comparisonResults');
        resultsDiv.innerHTML = '<div style="text-align:center;padding:40px;"><div class="loading-spinner"></div><p>Loading comparison...</p></div>';
        
        // Fetch both phones
        Promise.all([
            fetch(`/search?Brand=${brand1}&Model=${model1}`).then(r => r.json()),
            fetch(`/search?Brand=${brand2}&Model=${model2}`).then(r => r.json())
        ])
        .then(([phone1, phone2]) => {
            if (phone1.error || phone2.error) {
                resultsDiv.innerHTML = '<div class="empty-state"><h3>One or both phones not found</h3></div>';
                return;
            }
            displayComparison(phone1, phone2);
        })
        .catch(error => {
            console.error('Comparison error:', error);
            resultsDiv.innerHTML = '<div class="empty-state"><h3>Error loading comparison</h3></div>';
        });
    });
}

function displayComparison(phone1, phone2) {
    const resultsDiv = document.getElementById('comparisonResults');
    
    const p1 = phone1.stats;
    const p2 = phone2.stats;
    
    // Get most common specs from all listings (mode)
    const p1Specs = getCommonSpecs(phone1.listings, phone1.variant_info);
    const p2Specs = getCommonSpecs(phone2.listings, phone2.variant_info);
    
    // Price difference
    const priceDiff = Math.abs(p1.avg_price - p2.avg_price);
    const cheaperPhone = p1.avg_price < p2.avg_price ? p1 : p2;
    
    // Count great deals
    const p1GreatDeals = phone1.listings.filter(l => l.deal_type === 'great').length;
    const p2GreatDeals = phone2.listings.filter(l => l.deal_type === 'great').length;
    
    // Warranty percentage
    const p1Warranty = (phone1.listings.filter(l => l.trust_badges.includes('✅ Warranty')).length / phone1.listings.length * 100).toFixed(0);
    const p2Warranty = (phone2.listings.filter(l => l.trust_badges.includes('✅ Warranty')).length / phone2.listings.length * 100).toFixed(0);
    
    let html = `

        <!-- Source Disclaimer Banner -->
        <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; padding:20px; border-radius:12px; margin-bottom:25px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
            <div style="display:flex; align-items:center; gap:15px;">
                <div style="font-size:2em;">📊</div>
                <div>
                    <strong style="font-size:1.1em; display:block; margin-bottom:5px;">Data Source: Bikroy.com</strong>
                    <small style="opacity:0.95;">
                        Specifications shown represent the most common configuration from available listings. 
                        Multiple variants may exist for each model (shown below).
                    </small>
                </div>
            </div>
        </div>


        <!-- Price Comparison Header -->
        <div class="price-comparison">
            <h2>💰 Price Comparison</h2>
            <div class="price-row">
                <div class="price-box">
                    <h4>${p1.brand} ${p1.model}</h4>
                    <div class="price">৳${p1.avg_price.toLocaleString()}</div>
                    <small style="opacity:0.8;">${p1.count} listings available</small>
                </div>
                
                <div class="price-difference">
                    <strong>${cheaperPhone.brand} ${cheaperPhone.model}</strong><br>
                    is cheaper by<br>
                    <strong style="font-size:1.3em;">৳${priceDiff.toLocaleString()}</strong>
                    <div style="margin-top:10px;opacity:0.9;">
                        (${((priceDiff / Math.max(p1.avg_price, p2.avg_price)) * 100).toFixed(1)}% difference)
                    </div>
                </div>
                
                <div class="price-box">
                    <h4>${p2.brand} ${p2.model}</h4>
                    <div class="price">৳${p2.avg_price.toLocaleString()}</div>
                    <small style="opacity:0.8;">${p2.count} listings available</small>
                </div>
            </div>
        </div>
        
        <!-- Detailed Comparison Grid -->
        <div class="comparison-grid">
            <!-- Phone 1 Card -->
            <div class="comparison-card">
                <h3>📱 ${p1.brand} ${p1.model}</h3>
                
                <!-- PRICE SECTION -->
                <h4 style="margin-top:20px; color:#667eea; border-bottom:2px solid #f0f0f0; padding-bottom:8px;">
                    💵 Pricing
                </h4>
                
                <div class="spec-row">
                    <span class="spec-label">Average Price</span>
                    <span class="spec-value ${p1.avg_price < p2.avg_price ? 'better' : ''}">
                        ৳${p1.avg_price.toLocaleString()}
                    </span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">Price Range</span>
                    <span class="spec-value">৳${p1.min_price.toLocaleString()} - ৳${p1.max_price.toLocaleString()}</span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">Great Deals</span>
                    <span class="spec-value ${p1GreatDeals > p2GreatDeals ? 'better' : ''}">
                        🔥 ${p1GreatDeals} deals
                    </span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">Market Score</span>
                    <span class="spec-value ${phone1.market_score > phone2.market_score ? 'better' : ''}">
                        ${phone1.market_score > 0 ? '🟢' : phone1.market_score > -20 ? '🟡' : '🔴'} 
                        ${phone1.market_score.toFixed(1)}
                    </span>
                </div>
                
                <!-- SPECS SECTION -->
                <h4 style="margin-top:20px; color:#667eea; border-bottom:2px solid #f0f0f0; padding-bottom:8px;">
                    ⚙️ Specifications
                </h4>
                
                <div class="spec-row">
                <span class="spec-label">RAM</span>
                <span class="spec-value ${parseFloat(p1Specs.ram) > parseFloat(p2Specs.ram) ? 'better' : ''}">
                    ${p1Specs.ram}GB
                    ${p1Specs.all_rams.length > 1 ? 
                        `<small style="opacity:0.7; display:block; font-weight:normal; margin-top:3px;">Also: ${p1Specs.all_rams.filter(r => r !== p1Specs.ram).join(', ')}GB</small>` 
                        : ''}
                </span>
            </div>
                
            <div class="spec-row">
            <span class="spec-label">Storage</span>
            <span class="spec-value ${parseFloat(p1Specs.storage) > parseFloat(p2Specs.storage) ? 'better' : ''}">
                ${p1Specs.storage}GB
                ${p1Specs.all_storages.length > 1 ? 
                    `<small style="opacity:0.7; display:block; font-weight:normal; margin-top:3px;">Also: ${p1Specs.all_storages.filter(s => s !== p1Specs.storage).join(', ')}GB</small>` 
                    : ''}
            </span>
        </div>
                
                <div class="spec-row">
                    <span class="spec-label">Battery</span>
                    <span class="spec-value ${parseFloat(p1Specs.battery) > parseFloat(p2Specs.battery) ? 'better' : ''}">
                        ${p1Specs.battery ? p1Specs.battery + ' mAh' : 'N/A'}
                    </span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">Camera</span>
                    <span class="spec-value">
                        ${p1Specs.Camera_Pixel}MP
                    </span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">Network</span>
                    <span class="spec-value ${p1Specs.Network === '5G' && p2Specs.Network !== '5G' ? 'better' : ''}">
                        ${p1Specs.Network}
                    </span>
                </div>
                
                <!-- MARKET SECTION -->
                <h4 style="margin-top:20px; color:#667eea; border-bottom:2px solid #f0f0f0; padding-bottom:8px;">
                    📊 Market Info
                </h4>
                
                <div class="spec-row">
                    <span class="spec-label">Available Listings</span>
                    <span class="spec-value ${p1.count > p2.count ? 'better' : ''}">
                        ${p1.count} listings
                    </span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">Condition</span>
                    <span class="spec-value">${p1Specs.condition}</span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">With Warranty</span>
                    <span class="spec-value ${parseInt(p1Warranty) > parseInt(p2Warranty) ? 'better' : ''}">
                        ${p1Warranty}% of listings
                    </span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">AI Recommendation</span>
                    <span class="spec-value">
                        ${phone1.ai_recommendation.emoji} ${phone1.ai_recommendation.action}
                    </span>
                </div>
                
                <!-- Winner Badge -->
                ${determineWinner(p1, p2, phone1, phone2, p1Specs, p2Specs) === 1 ? 
                    '<div class="winner-badge">🏆 Better Overall Value</div>' : ''}
            </div>
            
            <!-- Phone 2 Card (Same structure) -->
            <div class="comparison-card">
                <h3>📱 ${p2.brand} ${p2.model}</h3>
                
                <!-- PRICE SECTION -->
                <h4 style="margin-top:20px; color:#667eea; border-bottom:2px solid #f0f0f0; padding-bottom:8px;">
                    💵 Pricing
                </h4>
                
                <div class="spec-row">
                    <span class="spec-label">Average Price</span>
                    <span class="spec-value ${p2.avg_price < p1.avg_price ? 'better' : ''}">
                        ৳${p2.avg_price.toLocaleString()}
                    </span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">Price Range</span>
                    <span class="spec-value">৳${p2.min_price.toLocaleString()} - ৳${p2.max_price.toLocaleString()}</span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">Great Deals</span>
                    <span class="spec-value ${p2GreatDeals > p1GreatDeals ? 'better' : ''}">
                        🔥 ${p2GreatDeals} deals
                    </span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">Market Score</span>
                    <span class="spec-value ${phone2.market_score > phone1.market_score ? 'better' : ''}">
                        ${phone2.market_score > 0 ? '🟢' : phone2.market_score > -20 ? '🟡' : '🔴'} 
                        ${phone2.market_score.toFixed(1)}
                    </span>
                </div>
                
                <!-- SPECS SECTION -->
                <h4 style="margin-top:20px; color:#667eea; border-bottom:2px solid #f0f0f0; padding-bottom:8px;">
                    ⚙️ Specifications
                </h4>
                
                <div class="spec-row">
                    <span class="spec-label">RAM</span>
                    <span class="spec-value ${parseFloat(p2Specs.ram) > parseFloat(p1Specs.ram) ? 'better' : ''}">
                        ${p2Specs.ram}GB
                    </span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">Storage</span>
                    <span class="spec-value ${parseFloat(p2Specs.storage) > parseFloat(p1Specs.storage) ? 'better' : ''}">
                        ${p2Specs.storage}GB
                    </span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">Battery</span>
                    <span class="spec-value ${parseFloat(p2Specs.battery) > parseFloat(p1Specs.battery) ? 'better' : ''}">
                        ${p2Specs.battery ? p2Specs.battery + ' mAh' : 'N/A'}
                    </span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">Camera</span>
                    <span class="spec-value">
                        ${p2Specs.Camera_Pixel}MP
                    </span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">Network</span>
                    <span class="spec-value ${p2Specs.Network === '5G' && p1Specs.Network !== '5G' ? 'better' : ''}">
                        ${p2Specs.Network}
                    </span>
                </div>
                
                <!-- MARKET SECTION -->
                <h4 style="margin-top:20px; color:#667eea; border-bottom:2px solid #f0f0f0; padding-bottom:8px;">
                    📊 Market Info
                </h4>
                
                <div class="spec-row">
                    <span class="spec-label">Available Listings</span>
                    <span class="spec-value ${p2.count > p1.count ? 'better' : ''}">
                        ${p2.count} listings
                    </span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">Condition</span>
                    <span class="spec-value">${p2Specs.condition}</span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">With Warranty</span>
                    <span class="spec-value ${parseInt(p2Warranty) > parseInt(p1Warranty) ? 'better' : ''}">
                        ${p2Warranty}% of listings
                    </span>
                </div>
                
                <div class="spec-row">
                    <span class="spec-label">AI Recommendation</span>
                    <span class="spec-value">
                        ${phone2.ai_recommendation.emoji} ${phone2.ai_recommendation.action}
                    </span>
                </div>
                
                <!-- Winner Badge -->
                ${determineWinner(p1, p2, phone1, phone2, p1Specs, p2Specs) === 2 ? 
                    '<div class="winner-badge">🏆 Better Overall Value</div>' : ''}
            </div>
        </div>
        
        <!-- Best For Recommendations -->
        <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; padding:25px; border-radius:12px; margin-top:30px;">
            <h3 style="margin:0 0 20px 0; font-size:1.3em;">🏆 Best For...</h3>
            ${generateBestForRecommendations(phone1, phone2, p1, p2, p1Specs, p2Specs)}
        </div>
        
        <!-- Quick Insights -->
        <div style="background:#f8f9fa; padding:20px; border-radius:12px; margin-top:20px;">
            <h3 style="margin:0 0 15px 0;">💡 Market Insights</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:15px;">
                ${generateInsights(phone1, phone2, p1, p2, p1Specs, p2Specs)}
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
}

// Helper: Get most common specs from listings
function getCommonSpecs(listings, variantInfo) {
    const getMostCommon = (arr) => {
        if (!arr.length) return 'N/A';
        const counts = {};
        arr.forEach(val => counts[val] = (counts[val] || 0) + 1);
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    };
    
    // Use variant_info from backend if available
    const ram = variantInfo?.mode_ram || getMostCommon(listings.map(l => l.ram).filter(Boolean));
    const storage = variantInfo?.mode_storage || getMostCommon(listings.map(l => l.storage).filter(Boolean));
    
    return {
        ram: ram,
        storage: storage,
        all_rams: variantInfo?.all_rams || [ram],
        all_storages: variantInfo?.all_storages || [storage],
        battery: listings[0]?.battery || 'N/A',
        Camera_Pixel: listings[0]?.Camera_Pixel || 'N/A',
        Network: listings[0]?.Network || 'N/A',
        condition: getMostCommon(listings.map(l => l.condition))
    };
}
// Helper: Determine overall winner
function determineWinner(p1, p2, phone1, phone2, p1Specs, p2Specs) {
    let p1Score = 0;
    let p2Score = 0;
    
    // ========== 1. PRICE SCORING (40% weight) ==========
    const priceDiff = Math.abs(p1.avg_price - p2.avg_price);
    const maxPrice = Math.max(p1.avg_price, p2.avg_price);
    const priceAdvantage = (priceDiff / maxPrice) * 100; // % difference
    
    if (p1.avg_price < p2.avg_price) {
        p1Score += Math.min(priceAdvantage * 0.4, 40); // Cap at 40 points
    } else {
        p2Score += Math.min(priceAdvantage * 0.4, 40);
    }
    
    // ========== 2. SPECS SCORING (30% weight) ==========
    // RAM (10 points)
    const ramDiff = Math.abs(parseFloat(p1Specs.ram) - parseFloat(p2Specs.ram));
    if (parseFloat(p1Specs.ram) > parseFloat(p2Specs.ram)) {
        p1Score += Math.min(ramDiff * 2, 10);
    } else if (parseFloat(p2Specs.ram) > parseFloat(p1Specs.ram)) {
        p2Score += Math.min(ramDiff * 2, 10);
    }
    
    // Storage (10 points)
    const storageDiff = Math.abs(parseFloat(p1Specs.storage) - parseFloat(p2Specs.storage));
    if (parseFloat(p1Specs.storage) > parseFloat(p2Specs.storage)) {
        p1Score += Math.min(storageDiff / 10, 10);
    } else if (parseFloat(p2Specs.storage) > parseFloat(p1Specs.storage)) {
        p2Score += Math.min(storageDiff / 10, 10);
    }
    
    // Battery (10 points)
    const bat1 = parseFloat(p1Specs.battery) || 0;
    const bat2 = parseFloat(p2Specs.battery) || 0;
    if (bat1 > bat2) {
        p1Score += Math.min((bat1 - bat2) / 100, 10);
    } else if (bat2 > bat1) {
        p2Score += Math.min((bat2 - bat1) / 100, 10);
    }
    
    // ========== 3. FEATURES (20% weight) ==========
    // Camera (10 points)
    const cam1 = parseFloat(p1Specs.Camera_Pixel) || 0;
    const cam2 = parseFloat(p2Specs.Camera_Pixel) || 0;
    if (cam1 > cam2) {
        p1Score += Math.min((cam1 - cam2) / 5, 10);
    } else if (cam2 > cam1) {
        p2Score += Math.min((cam2 - cam1) / 5, 10);
    }
    
    // 5G Bonus (10 points)
    if (p1Specs.Network === '5G' && p2Specs.Network !== '5G') {
        p1Score += 10;
    } else if (p2Specs.Network === '5G' && p1Specs.Network !== '5G') {
        p2Score += 10;
    }
    
    // ========== 4. MARKET HEALTH (10% weight) ==========
    if (phone1.market_score > phone2.market_score) {
        p1Score += Math.min((phone1.market_score - phone2.market_score) / 5, 5);
    } else {
        p2Score += Math.min((phone2.market_score - phone1.market_score) / 5, 5);
    }
    
    // More listings = better (5 points)
    if (p1.count > p2.count) {
        p1Score += 5;
    } else {
        p2Score += 5;
    }
    
    // Determine winner
    if (p1Score > p2Score + 5) return 1; // 5 point buffer for ties
    if (p2Score > p1Score + 5) return 2;
    return 0; // Tie
}

// Helper: Generate insights
function generateInsights(phone1, phone2, p1, p2, p1Specs, p2Specs) {
    const insights = [];
    
    // ========== 1. VALUE FOR MONEY ==========
    const p1Value = (parseFloat(p1Specs.ram) * parseFloat(p1Specs.storage) * (parseFloat(p1Specs.battery) || 4000)) / p1.avg_price;
    const p2Value = (parseFloat(p2Specs.ram) * parseFloat(p2Specs.storage) * (parseFloat(p2Specs.battery) || 4000)) / p2.avg_price;
    
    if (p1Value > p2Value * 1.15) {
        const advantage = ((p1Value / p2Value - 1) * 100).toFixed(0);
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">💎 <strong>${p1.brand} ${p1.model}</strong> offers ${advantage}% better value for money</div>`);
    } else if (p2Value > p1Value * 1.15) {
        const advantage = ((p2Value / p1Value - 1) * 100).toFixed(0);
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">💎 <strong>${p2.brand} ${p2.model}</strong> offers ${advantage}% better value for money</div>`);
    } else {
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">⚖️ Both phones offer similar value for money</div>`);
    }
    
    // ========== 2. BATTERY CHAMPION ==========
    const bat1 = parseFloat(p1Specs.battery) || 0;
    const bat2 = parseFloat(p2Specs.battery) || 0;
    
    if (bat1 > bat2 * 1.1) {
        const diff = bat1 - bat2;
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">🔋 <strong>${p1.brand} ${p1.model}</strong> has ${diff}mAh more battery (${((diff/bat2)*100).toFixed(0)}% better)</div>`);
    } else if (bat2 > bat1 * 1.1) {
        const diff = bat2 - bat1;
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">🔋 <strong>${p2.brand} ${p2.model}</strong> has ${diff}mAh more battery (${((diff/bat1)*100).toFixed(0)}% better)</div>`);
    }
    
    // ========== 3. CAMERA QUALITY ==========
    const cam1 = parseFloat(p1Specs.Camera_Pixel) || 0;
    const cam2 = parseFloat(p2Specs.Camera_Pixel) || 0;
    
    if (cam1 > cam2 * 1.2) {
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">📸 <strong>${p1.brand} ${p1.model}</strong> has superior camera (${cam1}MP vs ${cam2}MP)</div>`);
    } else if (cam2 > cam1 * 1.2) {
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">📸 <strong>${p2.brand} ${p2.model}</strong> has superior camera (${cam2}MP vs ${cam1}MP)</div>`);
    }
    
    // ========== 4. 5G CONNECTIVITY ==========
    if (p1Specs.Network === '5G' && p2Specs.Network !== '5G') {
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">⚡ <strong>${p1.brand} ${p1.model}</strong> is future-proof with 5G support</div>`);
    } else if (p2Specs.Network === '5G' && p1Specs.Network !== '5G') {
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">⚡ <strong>${p2.brand} ${p2.model}</strong> is future-proof with 5G support</div>`);
    }
    
    // ========== 5. MARKET AVAILABILITY ==========
    if (p1.count > p2.count * 1.5) {
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">📊 <strong>${p1.brand} ${p1.model}</strong> has ${p1.count} listings vs ${p2.count} - more options available</div>`);
    } else if (p2.count > p1.count * 1.5) {
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">📊 <strong>${p2.brand} ${p2.model}</strong> has ${p2.count} listings vs ${p1.count} - more options available</div>`);
    }
    
    // ========== 6. DEAL AVAILABILITY ==========
    const p1GreatDeals = phone1.listings.filter(l => l.deal_type === 'great').length;
    const p2GreatDeals = phone2.listings.filter(l => l.deal_type === 'great').length;
    
    if (p1GreatDeals > p2GreatDeals && p1GreatDeals > 0) {
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">🔥 <strong>${p1.brand} ${p1.model}</strong> has more great deals (${p1GreatDeals} vs ${p2GreatDeals})</div>`);
    } else if (p2GreatDeals > p1GreatDeals && p2GreatDeals > 0) {
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">🔥 <strong>${p2.brand} ${p2.model}</strong> has more great deals (${p2GreatDeals} vs ${p1GreatDeals})</div>`);
    }
    
    // ========== 7. WARRANTY COVERAGE ==========
    const p1Warranty = (phone1.listings.filter(l => l.trust_badges.includes('✅ Warranty')).length / phone1.listings.length * 100).toFixed(0);
    const p2Warranty = (phone2.listings.filter(l => l.trust_badges.includes('✅ Warranty')).length / phone2.listings.length * 100).toFixed(0);
    
    if (parseInt(p1Warranty) > parseInt(p2Warranty) * 1.3) {
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">✅ <strong>${p1.brand} ${p1.model}</strong> has better warranty coverage (${p1Warranty}% vs ${p2Warranty}%)</div>`);
    } else if (parseInt(p2Warranty) > parseInt(p1Warranty) * 1.3) {
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">✅ <strong>${p2.brand} ${p2.model}</strong> has better warranty coverage (${p2Warranty}% vs ${p1Warranty}%)</div>`);
    }
    
    // ========== 8. PRICE PER GB STORAGE ==========
    const p1PricePerGB = p1.avg_price / parseFloat(p1Specs.storage);
    const p2PricePerGB = p2.avg_price / parseFloat(p2Specs.storage);
    
    if (p1PricePerGB < p2PricePerGB * 0.8) {
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">💾 <strong>${p1.brand} ${p1.model}</strong> offers cheaper storage (৳${p1PricePerGB.toFixed(0)}/GB vs ৳${p2PricePerGB.toFixed(0)}/GB)</div>`);
    } else if (p2PricePerGB < p1PricePerGB * 0.8) {
        insights.push(`<div style="padding:10px; background:white; border-radius:8px;">💾 <strong>${p2.brand} ${p2.model}</strong> offers cheaper storage (৳${p2PricePerGB.toFixed(0)}/GB vs ৳${p1PricePerGB.toFixed(0)}/GB)</div>`);
    }
    
    return insights.join('');
}

function generateBestForRecommendations(phone1, phone2, p1, p2, p1Specs, p2Specs) {
    const recommendations = [];
    
    // Budget
    const cheaperPhone = p1.avg_price < p2.avg_price ? 
        { name: `${p1.brand} ${p1.model}`, price: p1.avg_price } : 
        { name: `${p2.brand} ${p2.model}`, price: p2.avg_price };
    
    recommendations.push(`
        <div style="background:rgba(255,255,255,0.15); padding:15px; border-radius:10px; margin-bottom:12px;">
            <strong style="font-size:1.1em;">💰 Best for Budget</strong>
            <div style="margin-top:8px; font-size:0.95em;">${cheaperPhone.name} (৳${cheaperPhone.price.toLocaleString()})</div>
        </div>
    `);
    
    // Battery Life
    const bat1 = parseFloat(p1Specs.battery) || 0;
    const bat2 = parseFloat(p2Specs.battery) || 0;
    const batteryWinner = bat1 > bat2 ? 
        { name: `${p1.brand} ${p1.model}`, value: `${bat1}mAh` } : 
        { name: `${p2.brand} ${p2.model}`, value: `${bat2}mAh` };
    
    recommendations.push(`
        <div style="background:rgba(255,255,255,0.15); padding:15px; border-radius:10px; margin-bottom:12px;">
            <strong style="font-size:1.1em;">🔋 Best for Battery Life</strong>
            <div style="margin-top:8px; font-size:0.95em;">${batteryWinner.name} (${batteryWinner.value})</div>
        </div>
    `);
    
    // Photography
    const cam1 = parseFloat(p1Specs.Camera_Pixel) || 0;
    const cam2 = parseFloat(p2Specs.Camera_Pixel) || 0;
    const cameraWinner = cam1 > cam2 ? 
        { name: `${p1.brand} ${p1.model}`, value: `${cam1}MP` } : 
        { name: `${p2.brand} ${p2.model}`, value: `${cam2}MP` };
    
    recommendations.push(`
        <div style="background:rgba(255,255,255,0.15); padding:15px; border-radius:10px; margin-bottom:12px;">
            <strong style="font-size:1.1em;">📸 Best for Photography</strong>
            <div style="margin-top:8px; font-size:0.95em;">${cameraWinner.name} (${cameraWinner.value} camera)</div>
        </div>
    `);
    
    // Performance (RAM + Storage)
    const perf1 = parseFloat(p1Specs.ram) * parseFloat(p1Specs.storage);
    const perf2 = parseFloat(p2Specs.ram) * parseFloat(p2Specs.storage);
    const perfWinner = perf1 > perf2 ? 
        { name: `${p1.brand} ${p1.model}`, ram: p1Specs.ram, storage: p1Specs.storage } : 
        { name: `${p2.brand} ${p2.model}`, ram: p2Specs.ram, storage: p2Specs.storage };
    
    recommendations.push(`
        <div style="background:rgba(255,255,255,0.15); padding:15px; border-radius:10px; margin-bottom:12px;">
            <strong style="font-size:1.1em;">⚡ Best for Performance</strong>
            <div style="margin-top:8px; font-size:0.95em;">${perfWinner.name} (${perfWinner.ram}GB/${perfWinner.storage}GB)</div>
        </div>
    `);
    
    // Future Proofing
    if (p1Specs.Network === '5G' || p2Specs.Network === '5G') {
        const futureWinner = p1Specs.Network === '5G' ? `${p1.brand} ${p1.model}` : `${p2.brand} ${p2.model}`;
        recommendations.push(`
            <div style="background:rgba(255,255,255,0.15); padding:15px; border-radius:10px; margin-bottom:12px;">
                <strong style="font-size:1.1em;">🚀 Best for Future-Proofing</strong>
                <div style="margin-top:8px; font-size:0.95em;">${futureWinner} (5G support)</div>
            </div>
        `);
    }
    
    // Deals
    const p1GreatDeals = phone1.listings.filter(l => l.deal_type === 'great').length;
    const p2GreatDeals = phone2.listings.filter(l => l.deal_type === 'great').length;
    
    if (p1GreatDeals > 0 || p2GreatDeals > 0) {
        const dealWinner = p1GreatDeals > p2GreatDeals ? 
            { name: `${p1.brand} ${p1.model}`, deals: p1GreatDeals } : 
            { name: `${p2.brand} ${p2.model}`, deals: p2GreatDeals };
        
        recommendations.push(`
            <div style="background:rgba(255,255,255,0.15); padding:15px; border-radius:10px;">
                <strong style="font-size:1.1em;">🔥 Best for Finding Deals</strong>
                <div style="margin-top:8px; font-size:0.95em;">${dealWinner.name} (${dealWinner.deals} great deals available)</div>
            </div>
        `);
    }
    
    return recommendations.join('');
}


// ========== PRICE ESTIMATOR LOGIC ==========

let formOptions = {};
let locationMap = {};

// Load form options when page loads
fetch('/get_form_options')
    .then(response => response.json())
    .then(data => {
        formOptions = data;
        locationMap = data.locations;
        
        // Populate Brand dropdown
        const brandSelect = document.getElementById('estBrand');
        if (brandSelect) {
            data.brands.forEach(brand => {
                brandSelect.innerHTML += `<option value="${brand}">${brand}</option>`;
            });
        }
        
        // Populate Division dropdown
        const divisionSelect = document.getElementById('estDivision');
        if (divisionSelect) {
            data.divisions.forEach(division => {
                divisionSelect.innerHTML += `<option value="${division}">${division}</option>`;
            });
        }
        
        // Populate Camera Pixel dropdown
        const cameraSelect = document.getElementById('estCameraPixel');
        if (cameraSelect) {
            data.cameras.forEach(camera => {
                cameraSelect.innerHTML += `<option value="${camera}">${camera} MP</option>`;
            });
        }
    })
    .catch(error => console.error('Error loading form options:', error));

// Handle Brand selection -> Load Models
const estBrand = document.getElementById('estBrand');
const estModel = document.getElementById('estModel');

if (estBrand) {
    estBrand.addEventListener('change', function() {
        const brand = this.value;
        
        if (!brand) {
            estModel.disabled = true;
            estModel.innerHTML = '<option value="">First select brand</option>';
            return;
        }
        
        fetch(`/get_Models?Brand=${brand}`)
            .then(response => response.json())
            .then(data => {
                estModel.disabled = false;
                estModel.innerHTML = '<option value="">Select Model</option>';
                data.forEach(model => {
                    estModel.innerHTML += `<option value="${model}">${model}</option>`;
                });
            })
            .catch(error => console.error('Error loading models:', error));
    });
}

// Handle Division selection -> Load Locations
const estDivision = document.getElementById('estDivision');
const estLocation = document.getElementById('estLocation');

if (estDivision) {
    estDivision.addEventListener('change', function() {
        const division = this.value;
        
        if (!division || !locationMap[division]) {
            estLocation.disabled = true;
            estLocation.innerHTML = '<option value="">First select division</option>';
            return;
        }
        
        estLocation.disabled = false;
        estLocation.innerHTML = '<option value="">Select Location</option>';
        locationMap[division].forEach(location => {
            estLocation.innerHTML += `<option value="${location}">${location}</option>`;
        });
    });
}

// Handle form submission
const estimatorForm = document.getElementById('estimatorForm');
if (estimatorForm) {
    estimatorForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            Brand: document.getElementById('estBrand').value,
            Model: document.getElementById('estModel').value,
            RAM: parseFloat(document.getElementById('estRAM').value),
            Storage: parseFloat(document.getElementById('estStorage').value),
            Condition: document.getElementById('estCondition').value,
            Network: document.getElementById('estNetwork').value,
            Division: document.getElementById('estDivision').value,
            Location: document.getElementById('estLocation').value,
            Battery: document.getElementById('estBattery').value || null,
            Camera_Type: document.getElementById('estCameraType').value || null,
            Camera_Pixel: document.getElementById('estCameraPixel').value || null,
            has_warranty: document.getElementById('estWarranty').checked ? 'Yes' : 'No',
            is_store: document.getElementById('estStore').checked ? 'Yes' : 'No'
        };
        
        // Show loading
        const resultsDiv = document.getElementById('estimatorResults');
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = '<div style="text-align:center;padding:40px;"><div class="loading-spinner"></div><p>Calculating price...</p></div>';
        
        fetch('/estimate_price', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayEstimateResults(data);
            } else {
                resultsDiv.innerHTML = `<div class="error-message">❌ ${data.error}</div>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            resultsDiv.innerHTML = '<div class="error-message">❌ Failed to estimate price</div>';
        });
    });
}

function displayEstimateResults(data) {
    const resultsDiv = document.getElementById('estimatorResults');
    
    let html = `
        <div class="estimate-results-card">
            <h3>📊 Price Estimate</h3>
            
            <div class="estimate-main-price">
                ৳${data.predicted_price.toLocaleString()}
            </div>
            
            <div class="estimate-range">
                Expected Range: ৳${data.confidence_range[0].toLocaleString()} - ৳${data.confidence_range[1].toLocaleString()}
            </div>
            
            <div class="estimate-stats">
                <div class="stat-item">
                    <span class="stat-label">Market Average:</span>
                    <span class="stat-value">৳${data.market_avg.toLocaleString()}</span>
                </div>
                
                <div class="stat-item">
                    <span class="stat-label">Confidence Level:</span>
                    <span class="stat-value ${data.confidence_level.toLowerCase()}">${data.confidence_level}</span>
                </div>
                
                <div class="stat-item">
                    <span class="stat-label">Sample Size:</span>
                    <span class="stat-value">${data.sample_size} listings</span>
                </div>
            </div>
            
            <div class="estimate-note">
                ${data.note}
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
}