// ============================================
// CART RENDERING WITH DISCOUNT INTEGRATION
// ============================================

// Enhanced renderCart function with full discount support
async function renderCart() {
    const cartContainer = document.getElementById('cartItems');
    const cartItemCount = document.getElementById('cartItemCount');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const cartTotal = document.getElementById('cartTotal');
    const cartDiscountInfo = document.getElementById('cartDiscountInfo');

    // Update cart count badge
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartItemCount) {
        cartItemCount.textContent = totalItems;
    }

    // Calculate subtotal
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (!cartContainer) return;

    // Empty cart state
    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="fas fa-shopping-cart" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <h3 style="color: var(--text-secondary); margin-bottom: 0.5rem;">Your cart is empty</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Start shopping to add items to your cart</p>
                <button onclick="switchTab('products')" class="btn btn-primary">
                    <i class="fas fa-shopping-bag"></i> Browse Products
                </button>
            </div>
        `;
        
        if (cartSubtotal) cartSubtotal.textContent = '₱0.00';
        if (cartTotal) cartTotal.textContent = '₱0.00';
        if (cartDiscountInfo) cartDiscountInfo.style.display = 'none';
        
        return;
    }

    // Render cart items
    cartContainer.innerHTML = cart.map(item => `
        <div class="cart-item" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--background-alt); border-radius: 12px; margin-bottom: 1rem;">
            <!-- Product Image -->
            <div style="width: 80px; height: 80px; background: var(--surface); border-radius: 8px; overflow: hidden; flex-shrink: 0;">
                ${item.image ? `
                    <img src="${item.image}" 
                         alt="${item.name}" 
                         style="width: 100%; height: 100%; object-fit: cover;">
                ` : `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 2rem; color: var(--text-muted);">
                        <i class="fas ${getCategoryIcon(item.category)}"></i>
                    </div>
                `}
            </div>
            
            <!-- Product Info -->
            <div style="flex: 1; min-width: 0;">
                <h4 style="margin: 0 0 0.5rem 0; font-weight: 600;">${item.name}</h4>
                <p style="margin: 0; color: var(--text-muted); font-size: 0.9rem;">
                    ₱${item.price.toFixed(2)} per ${item.unit}
                </p>
            </div>
            
            <!-- Quantity Controls -->
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
                <button onclick="updateCartQuantity('${item.productId}', ${item.quantity - 1})" 
                        class="btn btn-secondary btn-sm" 
                        style="width: 32px; height: 32px; padding: 0;">
                    <i class="fas fa-minus"></i>
                </button>
                <span style="min-width: 2rem; text-align: center; font-weight: 600;">${item.quantity}</span>
                <button onclick="updateCartQuantity('${item.productId}', ${item.quantity + 1})" 
                        class="btn btn-secondary btn-sm" 
                        style="width: 32px; height: 32px; padding: 0;">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            
            <!-- Item Total & Remove -->
            <div style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                <strong style="font-size: 1.1rem;">₱${(item.price * item.quantity).toFixed(2)}</strong>
                <button onclick="removeFromCart('${item.productId}')" 
                        class="btn btn-sm" 
                        style="width: 32px; height: 32px; padding: 0; background: var(--error); color: white;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Update subtotal
    if (cartSubtotal) {
        cartSubtotal.textContent = `₱${subtotal.toFixed(2)}`;
    }

    // Get and display discounts
    const discounts = JSON.parse(localStorage.getItem('cartDiscounts') || 'null');
    
    // Calculate total discount
    let totalDiscount = 0;
    let appliedPromotions = [];
    
    if (discounts) {
        // Get total discount
        totalDiscount = discounts.totalDiscount || discounts.totalSavings || 0;
        
        // Build appliedPromotions array from breakdown
        if (discounts.breakdown) {
            // Add bulk discounts
            if (discounts.breakdown.bulkDiscounts && discounts.breakdown.bulkDiscounts.length > 0) {
                discounts.breakdown.bulkDiscounts.forEach(discount => {
                    appliedPromotions.push({
                        name: discount.name || 'Bulk Discount',
                        discountAmount: discount.savings || 0
                    });
                });
            }
            
            // Add expiry discounts
            if (discounts.breakdown.expiryDiscounts && discounts.breakdown.expiryDiscounts.length > 0) {
                discounts.breakdown.expiryDiscounts.forEach(discount => {
                    appliedPromotions.push({
                        name: discount.name || 'Near Expiry Discount',
                        discountAmount: discount.savings || 0
                    });
                });
            }
            
            // Add other discounts
            if (discounts.breakdown.otherDiscounts && discounts.breakdown.otherDiscounts.length > 0) {
                discounts.breakdown.otherDiscounts.forEach(discount => {
                    appliedPromotions.push({
                        name: discount.name || discount.promotionName || 'Discount',
                        discountAmount: discount.savings || 0
                    });
                });
            }
        }
    }
    
    if (totalDiscount > 0 && appliedPromotions.length > 0) {
        // Show discount info
        if (cartDiscountInfo) {
            cartDiscountInfo.style.display = 'block';
            cartDiscountInfo.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 0.5rem;">
                    <i class="fas fa-tags"></i> Applied Discounts:
                </div>
                ${appliedPromotions.map(promo => `
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.25rem;">
                        <span>${promo.name}</span>
                        <span>-₱${promo.discountAmount.toFixed(2)}</span>
                    </div>
                `).join('')}
            `;
        }
        
        // Update total with discount
        const finalTotal = discounts.discountedTotal || (subtotal - totalDiscount);
        if (cartTotal) {
            cartTotal.textContent = `₱${finalTotal.toFixed(2)}`;
        }
    } else {
        // No discounts
        if (cartDiscountInfo) {
            cartDiscountInfo.style.display = 'none';
        }
        
        if (cartTotal) {
            cartTotal.textContent = `₱${subtotal.toFixed(2)}`;
        }
    }
}

// Make sure this function is available globally
window.renderCart = renderCart;
