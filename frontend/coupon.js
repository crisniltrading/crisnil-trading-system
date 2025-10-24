// ============================================================================
// COUPON CODE FUNCTIONALITY
// ============================================================================

let appliedCoupon = null;

/**
 * Apply coupon code at checkout
 */
async function applyCouponCode() {
    const input = document.getElementById('couponCodeInput');
    const messageDiv = document.getElementById('couponMessage');
    const applyBtn = document.getElementById('applyCouponBtn');
    
    if (!input || !messageDiv) return;
    
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
            currentDiscounts.coupon = appliedCoupon;
            currentDiscounts.totalDiscount = (currentDiscounts.totalDiscount || 0) + appliedCoupon.discountAmount;
            currentDiscounts.finalTotal = (currentDiscounts.finalTotal || cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)) - appliedCoupon.discountAmount;
            
            if (!currentDiscounts.appliedPromotions) {
                currentDiscounts.appliedPromotions = [];
            }
            currentDiscounts.appliedPromotions.push({
                name: `Coupon: ${code}`,
                discountAmount: appliedCoupon.discountAmount
            });
            
            localStorage.setItem('cartDiscounts', JSON.stringify(currentDiscounts));
            
            // Show success message
            messageDiv.innerHTML = `
                <div style="color: var(--success); display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-check-circle"></i>
                    <span><strong>${code}</strong> applied! You save ₱${appliedCoupon.discountAmount.toFixed(2)}</span>
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
            
            // Disable input and change button
            input.disabled = true;
            applyBtn.innerHTML = '<i class="fas fa-check"></i> Applied';
            applyBtn.disabled = true;
            
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
    
    // Reset state
    appliedCoupon = null;
    
    if (input) {
        input.value = '';
        input.disabled = false;
    }
    
    if (applyBtn) {
        applyBtn.disabled = false;
        applyBtn.innerHTML = '<i class="fas fa-check"></i> Apply';
    }
    
    if (messageDiv) {
        messageDiv.innerHTML = '';
    }
    
    // Remove from cart discounts
    const currentDiscounts = JSON.parse(localStorage.getItem('cartDiscounts') || '{}');
    if (currentDiscounts.coupon) {
        const couponDiscount = currentDiscounts.coupon.discountAmount || 0;
        currentDiscounts.totalDiscount = (currentDiscounts.totalDiscount || 0) - couponDiscount;
        currentDiscounts.finalTotal = (currentDiscounts.finalTotal || 0) + couponDiscount;
        
        // Remove from applied promotions
        if (currentDiscounts.appliedPromotions) {
            currentDiscounts.appliedPromotions = currentDiscounts.appliedPromotions.filter(
                p => !p.name.startsWith('Coupon:')
            );
        }
        
        delete currentDiscounts.coupon;
        localStorage.setItem('cartDiscounts', JSON.stringify(currentDiscounts));
    }
    
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
