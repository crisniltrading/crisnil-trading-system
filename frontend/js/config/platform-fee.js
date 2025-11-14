// ============================================================================
// PLATFORM FEE CONFIGURATION
// ============================================================================

/**
 * Shipping Fee Settings
 * 
 * Configure how shipping fees are calculated and displayed to customers
 */

const PLATFORM_FEE_CONFIG = {
    // Enable or disable shipping fee
    enabled: true,  // Set to false to disable shipping fees completely
    
    // Fee percentage (e.g., 1.5 = 1.5%)
    percentage: 1.5,
    
    // Show fee to customers at checkout
    showToCustomers: true,  // Set to false to hide from customers
    
    // Fee description shown to customers
    description: 'Shipping Fee',
    
    // Tooltip/help text
    helpText: 'Delivery fee for your order',
    
    // Minimum fee amount (in pesos)
    minimumFee: 0,  // Set to 0 for no minimum
    
    // Maximum fee amount (in pesos)
    maximumFee: 0,  // Set to 0 for no maximum
};

/**
 * Calculate platform fee for a given amount
 * @param {number} amount - The order total amount
 * @returns {number} - The calculated platform fee
 */
function calculatePlatformFee(amount) {
    if (!PLATFORM_FEE_CONFIG.enabled) {
        return 0;
    }
    
    let fee = (amount * PLATFORM_FEE_CONFIG.percentage) / 100;
    
    // Apply minimum fee if configured
    if (PLATFORM_FEE_CONFIG.minimumFee > 0 && fee < PLATFORM_FEE_CONFIG.minimumFee) {
        fee = PLATFORM_FEE_CONFIG.minimumFee;
    }
    
    // Apply maximum fee if configured
    if (PLATFORM_FEE_CONFIG.maximumFee > 0 && fee > PLATFORM_FEE_CONFIG.maximumFee) {
        fee = PLATFORM_FEE_CONFIG.maximumFee;
    }
    
    return Math.round(fee * 100) / 100; // Round to 2 decimal places
}

// Make configuration globally accessible
window.PLATFORM_FEE_CONFIG = PLATFORM_FEE_CONFIG;
window.calculatePlatformFee = calculatePlatformFee;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PLATFORM_FEE_CONFIG,
        calculatePlatformFee
    };
}
