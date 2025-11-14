// Configuration file for frontend
// This file handles environment-specific settings

/**
 * Determine API base URL based on environment
 */
function getApiBaseUrl() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Development environment
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5001/api';
    }
    
    // Production environment
    // Construct URL from current location
    const baseUrl = protocol + '//' + hostname + (port ? ':' + port : '');
    return baseUrl + '/api';
}

/**
 * Configuration object
 */
const CONFIG = {
    // API Configuration
    API_BASE_URL: getApiBaseUrl(),
    
    // Feature Flags
    FEATURES: {
        ENABLE_ANALYTICS: true,
        ENABLE_NOTIFICATIONS: true,
        ENABLE_REVIEWS: true,
        ENABLE_WISHLIST: true,
        ENABLE_COMPARE: true,
        ENABLE_RECENTLY_VIEWED: true,
        ENABLE_STOCK_NOTIFICATIONS: true
    },
    
    // UI Configuration
    UI: {
        ITEMS_PER_PAGE: 12,
        AUTO_REFRESH_INTERVAL: 120000, // 2 minutes
        TOAST_DURATION: 3000,
        SEARCH_DEBOUNCE: 300
    },
    
    // Cart Configuration
    CART: {
        MAX_QUANTITY: 999,
        ENABLE_DISCOUNTS: true,
        ENABLE_COUPONS: true
    },
    
    // Environment
    IS_DEVELOPMENT: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    IS_PRODUCTION: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
};

// Make config globally available
window.CONFIG = CONFIG;
window.API_BASE_URL = CONFIG.API_BASE_URL;

// Log configuration in development
if (CONFIG.IS_DEVELOPMENT) {
    console.log('🔧 Configuration loaded:', CONFIG);
    console.log('🌐 API Base URL:', CONFIG.API_BASE_URL);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
