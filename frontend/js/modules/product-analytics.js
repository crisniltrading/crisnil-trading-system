// ============================================================================
// PRODUCT ANALYTICS MODAL
// ============================================================================

/**
 * Show product analytics modal with improved design
 * @param {Object} product - Product object with analytics data
 */
function showProductAnalytics(product) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'analytics-modal-overlay';
    overlay.onclick = (e) => {
        if (e.target === overlay) closeProductAnalytics();
    };

    // Analytics data with fallbacks
    const analyticsData = {
        unitsSold: product.unitsSold || product.totalSold || 245,
        totalRevenue: product.totalRevenue || (product.price * (product.totalSold || 245)),
        totalOrders: product.totalOrders || 89,
        avgOrderSize: product.avgOrderSize || 2.75,
        avgDailySales: product.avgDailySales || 8.2,
        currentStock: product.stock || 0,
        change: {
            unitsSold: '+12%',
            revenue: '+8%',
            orders: '+15%'
        }
    };

    overlay.innerHTML = `
        <div class="analytics-modal">
            <!-- Header -->
            <div class="analytics-modal-header">
                <div class="analytics-modal-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Product Analytics: ${product.name}
                </div>
                <button class="analytics-modal-close" onclick="closeProductAnalytics()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Body -->
            <div class="analytics-modal-body">
                <!-- Analysis Period -->
                <div class="analysis-period">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Analysis Period: 30 days
                </div>

                <!-- Metrics Grid -->
                <div class="analytics-metrics-grid">
                    <!-- Units Sold -->
                    <div class="metric-card">
                        <div class="metric-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div class="metric-label">Units Sold</div>
                        <div class="metric-value">${analyticsData.unitsSold.toLocaleString()}</div>
                        <div class="metric-change positive">
                            ↑ ${analyticsData.change.unitsSold}
                        </div>
                    </div>

                    <!-- Total Revenue -->
                    <div class="metric-card">
                        <div class="metric-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div class="metric-label">Total Revenue</div>
                        <div class="metric-value">₱${analyticsData.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div class="metric-change positive">
                            ↑ ${analyticsData.change.revenue}
                        </div>
                    </div>

                    <!-- Total Orders -->
                    <div class="metric-card">
                        <div class="metric-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div class="metric-label">Total Orders</div>
                        <div class="metric-value">${analyticsData.totalOrders.toLocaleString()}</div>
                        <div class="metric-change positive">
                            ↑ ${analyticsData.change.orders}
                        </div>
                    </div>

                    <!-- Avg Order Size -->
                    <div class="metric-card">
                        <div class="metric-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <div class="metric-label">Avg Order Size</div>
                        <div class="metric-value">${analyticsData.avgOrderSize.toFixed(2)} units</div>
                    </div>

                    <!-- Avg Daily Sales -->
                    <div class="metric-card">
                        <div class="metric-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div class="metric-label">Avg Daily Sales</div>
                        <div class="metric-value">${analyticsData.avgDailySales.toFixed(1)} units</div>
                    </div>

                    <!-- Current Stock -->
                    <div class="metric-card">
                        <div class="metric-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <div class="metric-label">Current Stock</div>
                        <div class="metric-value">${analyticsData.currentStock.toLocaleString()} ${product.unit || 'units'}</div>
                    </div>
                </div>
            </div>

            <!-- Footer Tabs -->
            <div class="analytics-modal-footer">
                <button class="analytics-tab active">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    Sales Trend
                </button>
                <button class="analytics-tab">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Popularity Rank
                </button>
                <button class="analytics-tab">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    Seasonal Demand
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Add tab click handlers
    overlay.querySelectorAll('.analytics-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            overlay.querySelectorAll('.analytics-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

/**
 * Close product analytics modal
 */
function closeProductAnalytics() {
    const overlay = document.querySelector('.analytics-modal-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * View product analytics by product ID (fetches product data first)
 * @param {string} productId - Product ID
 */
async function viewProductAnalytics(productId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!response.ok) throw new Error('Failed to load product');

        const data = await response.json();
        showProductAnalytics(data.product);
    } catch (error) {
        console.error('Error loading product analytics:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to load product analytics', 'error');
        }
    }
}

// Make functions globally available
window.showProductAnalytics = showProductAnalytics;
window.closeProductAnalytics = closeProductAnalytics;
window.viewProductAnalytics = viewProductAnalytics;
