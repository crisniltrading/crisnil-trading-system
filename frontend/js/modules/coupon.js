// ============================================================================
// COUPON CODE FUNCTIONALITY
// ============================================================================

let appliedCoupon = null;

/**
 * Initialize coupon state from localStorage
 */
function initializeCouponState() {
    const discounts = JSON.parse(localStorage.getItem('cartDiscounts') || '{}');
    
    // Validate that cart still exists and has items
    if (!cart || cart.length === 0) {
        // Cart is empty, clear all discounts including coupon
        console.log('🧹 Cart is empty, clearing coupon and discounts');
        localStorage.removeItem('cartDiscounts');
        appliedCoupon = null;
        updateCouponUI();
        return;
    }
    
    if (discounts.coupon) {
        appliedCoupon = discounts.coupon;
        updateCouponUI();
    }
}

/**
 * Update coupon UI to reflect current state
 */
function updateCouponUI() {
    const input = document.getElementById('couponCodeInput');
    const messageDiv = document.getElementById('couponMessage');
    const applyBtn = document.getElementById('applyCouponBtn');
    
    if (!input || !messageDiv || !applyBtn) return;
    
    if (appliedCoupon) {
        // Show applied state
        input.value = appliedCoupon.code || '';
        input.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-check"></i> Applied';
        applyBtn.disabled = true;
        
        messageDiv.innerHTML = `
            <div style="color: var(--success); display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-check-circle"></i>
                <span><strong>${appliedCoupon.code}</strong> applied! You save ₱${appliedCoupon.discountAmount.toFixed(2)}</span>
                <button 
                    type="button" 
                    onclick="removeCoupon()" 
                    style="margin-left: auto; background: none; border: none; color: var(--error); cursor: pointer; padding: 0.25rem 0.5rem;"
                    title="Remove coupon"
                >
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    } else {
        // Show empty state
        input.value = '';
        input.disabled = false;
        applyBtn.innerHTML = '<i class="fas fa-check"></i> Apply';
        applyBtn.disabled = false;
        messageDiv.innerHTML = '';
    }
}

/**
 * Apply coupon code at checkout
 */
async function applyCouponCode() {
    const input = document.getElementById('couponCodeInput');
    const messageDiv = document.getElementById('couponMessage');
    const applyBtn = document.getElementById('applyCouponBtn');
    
    if (!input || !messageDiv) return;
    
    // Check if a coupon is already applied
    if (appliedCoupon) {
        messageDiv.innerHTML = '<span style="color: var(--warning);">A coupon is already applied. Remove it first to apply a different one.</span>';
        return;
    }
    
    const code = input.value.trim().toUpperCase();
    
    if (!code) {
        messageDiv.innerHTML = '<span style="color: var(--error);">Please enter a coupon code</span>';
        return;
    }
    
    // Disable button during request
    applyBtn.disabled = true;
    applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
    messageDiv.innerHTML = '<span style="color: var(--text-muted);">Validating coupon...</span>';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.API_BASE_URL}/promotions/apply-coupon`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                code: code,
                cartItems: cart.map(item => ({
                    productId: item._id,
                    price: item.price,
                    quantity: item.quantity
                }))
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success' && result.data) {
            // Coupon applied successfully
            appliedCoupon = {
                code: code,
                ...result.data
            };
            
            // Store coupon in cart discounts
            const currentDiscounts = JSON.parse(localStorage.getItem('cartDiscounts') || '{}');
            
            // Calculate subtotal
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            // Add coupon to existing discounts
            currentDiscounts.coupon = appliedCoupon;
            
            // Update total discount (add coupon discount to existing discounts)
            const previousDiscount = currentDiscounts.totalDiscount || currentDiscounts.totalSavings || 0;
            currentDiscounts.totalDiscount = previousDiscount + appliedCoupon.discountAmount;
            
            // Recalculate final total from subtotal minus all discounts
            currentDiscounts.finalTotal = Math.max(0, subtotal - currentDiscounts.totalDiscount);
            
            // Add coupon to applied promotions list
            if (!currentDiscounts.appliedPromotions) {
                currentDiscounts.appliedPromotions = [];
            }
            currentDiscounts.appliedPromotions.push({
                name: `Coupon: ${code}`,
                discountAmount: appliedCoupon.discountAmount
            });
            
            localStorage.setItem('cartDiscounts', JSON.stringify(currentDiscounts));
            
            // Update UI to show applied state
            updateCouponUI();
            
            // Refresh checkout summary
            if (typeof renderCheckoutSummary === 'function') {
                renderCheckoutSummary();
            }
            
            showToast(result.message || 'Coupon applied successfully!', 'success');
        } else {
            // Coupon invalid or error
            messageDiv.innerHTML = `<span style="color: var(--error);"><i class="fas fa-exclamation-circle"></i> ${result.message || result.error || 'Invalid coupon code'}</span>`;
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<i class="fas fa-check"></i> Apply';
        }
        
    } catch (error) {
        console.error('Apply coupon error:', error);
        messageDiv.innerHTML = '<span style="color: var(--error);"><i class="fas fa-exclamation-triangle"></i> Failed to apply coupon. Please try again.</span>';
        applyBtn.disabled = false;
        applyBtn.innerHTML = '<i class="fas fa-check"></i> Apply';
    }
}

/**
 * Remove applied coupon
 */
function removeCoupon() {
    const input = document.getElementById('couponCodeInput');
    const messageDiv = document.getElementById('couponMessage');
    const applyBtn = document.getElementById('applyCouponBtn');
    
    // Remove from cart discounts first
    const currentDiscounts = JSON.parse(localStorage.getItem('cartDiscounts') || '{}');
    if (currentDiscounts.coupon) {
        const couponDiscount = currentDiscounts.coupon.discountAmount || 0;
        
        // Subtract coupon discount from total discount
        currentDiscounts.totalDiscount = Math.max(0, (currentDiscounts.totalDiscount || 0) - couponDiscount);
        
        // Recalculate final total
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        currentDiscounts.finalTotal = Math.max(0, subtotal - currentDiscounts.totalDiscount);
        
        // Remove from applied promotions
        if (currentDiscounts.appliedPromotions) {
            currentDiscounts.appliedPromotions = currentDiscounts.appliedPromotions.filter(
                p => !p.name.startsWith('Coupon:')
            );
        }
        
        delete currentDiscounts.coupon;
        localStorage.setItem('cartDiscounts', JSON.stringify(currentDiscounts));
    }
    
    // Reset state
    appliedCoupon = null;
    
    // Update UI to show empty state
    updateCouponUI();
    
    // Refresh checkout summary
    if (typeof renderCheckoutSummary === 'function') {
        renderCheckoutSummary();
    }
    
    showToast('Coupon removed', 'info');
}

/**
 * Allow Enter key to apply coupon
 */
document.addEventListener('DOMContentLoaded', function() {
    const couponInput = document.getElementById('couponCodeInput');
    if (couponInput) {
        couponInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyCouponCode();
            }
        });
    }
});

/**
 * Clear coupon without UI updates (for programmatic clearing)
 */
function clearCouponState() {
    appliedCoupon = null;
    
    // Remove from localStorage
    const currentDiscounts = JSON.parse(localStorage.getItem('cartDiscounts') || '{}');
    if (currentDiscounts.coupon) {
        // Save coupon discount amount before deleting
        const couponDiscount = currentDiscounts.coupon.discountAmount || 0;
        
        // Delete coupon
        delete currentDiscounts.coupon;
        
        // Recalculate totals without coupon
        currentDiscounts.totalDiscount = Math.max(0, (currentDiscounts.totalDiscount || 0) - couponDiscount);
        
        // Remove from applied promotions
        if (currentDiscounts.appliedPromotions) {
            currentDiscounts.appliedPromotions = currentDiscounts.appliedPromotions.filter(
                p => !p.name || !p.name.startsWith('Coupon:')
            );
        }
        
        localStorage.setItem('cartDiscounts', JSON.stringify(currentDiscounts));
    }
}

// Make functions globally accessible
window.applyCouponCode = applyCouponCode;
window.removeCoupon = removeCoupon;
window.initializeCouponState = initializeCouponState;
window.updateCouponUI = updateCouponUI;
window.clearCouponState = clearCouponState;
