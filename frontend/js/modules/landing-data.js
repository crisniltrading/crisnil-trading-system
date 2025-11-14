// Landing Page Dynamic Data Loader
// Fetches real products and promotions from database

// Function to get API URL (avoids duplicate declaration)
function getApiUrl() {
    return window.API_BASE_URL || 'http://localhost:5001/api';
}

// Category icons mapping
const categoryIcons = {
    chicken: 'fa-drumstick-bite',
    beef: 'fa-bacon',
    pork: 'fa-ham',
    seafood: 'fa-fish',
    vegetables: 'fa-carrot',
    dairy: 'fa-cheese',
    other: 'fa-box'
};

// Load featured products from database
async function loadFeaturedProducts() {
    try {
        const apiUrl = getApiUrl();
        console.log('Fetching featured products from:', `${apiUrl}/landing/featured-products`);
        const response = await fetch(`${apiUrl}/landing/featured-products`);
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Featured products data:', data);
        
        if (data.success && data.products.length > 0) {
            console.log(`Rendering ${data.products.length} featured products`);
            renderFeaturedProducts(data.products);
        } else {
            console.warn('No featured products found, keeping demo data');
        }
    } catch (error) {
        console.error('Error loading featured products:', error);
        console.warn('Using demo data as fallback');
    }
}

// Load active promotions from database
async function loadPromotions() {
    const container = document.querySelector('.discounts-grid');
    if (!container) {
        console.error('Discounts grid container not found!');
        return;
    }

    try {
        const apiUrl = getApiUrl();
        console.log('🎯 Fetching promotions from:', `${apiUrl}/landing/promotions`);
        const response = await fetch(`${apiUrl}/landing/promotions`);
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Promotions API response:', data);
        
        if (data.success) {
            if (data.promotions && data.promotions.length > 0) {
                console.log(`✅ Rendering ${data.promotions.length} promotions`);
                renderPromotions(data.promotions);
            } else {
                console.warn('⚠️ No promotions found in database');
                // Show "no promotions" message instead of keeping loading spinner
                container.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                        <i class="fas fa-tags" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
                        <h3 style="color: #64748b; margin-bottom: 0.5rem;">No Active Promotions</h3>
                        <p style="color: #94a3b8; margin-bottom: 1rem;">Check back soon for special offers and discounts!</p>
                        <p style="color: #cbd5e1; font-size: 0.875rem;">Tip: Create promotions in the admin dashboard to display them here.</p>
                    </div>
                `;
            }
        } else {
            console.error('❌ API returned success: false');
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                    <h3 style="color: #64748b; margin-bottom: 0.5rem;">Failed to Load Promotions</h3>
                    <p style="color: #94a3b8;">${data.message || 'Unknown error occurred'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Error loading promotions:', error);
        // Show error message
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                <h3 style="color: #64748b; margin-bottom: 0.5rem;">Unable to Connect</h3>
                <p style="color: #94a3b8; margin-bottom: 1rem;">Cannot reach the server. Please make sure the backend is running.</p>
                <button class="btn btn-primary" onclick="window.refreshLandingData()" style="margin-top: 1rem;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// Render featured products
function renderFeaturedProducts(products) {
    const container = document.querySelector('.featured-products-grid');
    console.log('Featured products container:', container);
    if (!container) {
        console.error('Featured products grid not found!');
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product-preview-card">
            <div class="product-image-preview">
                ${product.badge ? `<div class="product-badge ${product.badge.toLowerCase()}">${product.badge}</div>` : ''}
                ${product.image ? 
                    `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">` :
                    `<i class="fas ${categoryIcons[product.category] || 'fa-box'}"></i>`
                }
            </div>
            <div class="product-info-preview">
                <h3>${product.name}</h3>
                <p class="product-desc">${product.description || 'Premium quality product'}</p>
                <div class="product-specs">
                    <span><i class="fas fa-weight"></i> Per ${product.unit}</span>
                    <span><i class="fas fa-snowflake"></i> -18°C</span>
                    ${product.rating > 0 ? `<span><i class="fas fa-star"></i> ${product.rating.toFixed(1)}</span>` : ''}
                </div>
                <div class="product-price-preview">
                    <span class="price">₱${product.price.toLocaleString()}/${product.unit}</span>
                    <span class="stock ${product.isLowStock ? 'low-stock' : 'in-stock'}">
                        <i class="fas ${product.isLowStock ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
                        ${product.isLowStock ? 'Low Stock' : 'In Stock'}
                    </span>
                </div>
                <button class="btn btn-primary btn-block" onclick="showLogin()" aria-label="Add ${product.name} to cart">
                    <i class="fas fa-cart-plus" aria-hidden="true"></i>
                    Add to Cart
                </button>
            </div>
        </div>
    `).join('');
}

// Render promotions/discounts
function renderPromotions(promotions) {
    const container = document.querySelector('.discounts-grid');
    console.log('Promotions container:', container);
    if (!container) {
        console.error('Discounts grid not found!');
        return;
    }
    
    // If no promotions, show a message
    if (!promotions || promotions.length === 0) {
        console.warn('No promotions to display');
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-tags" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
                <h3 style="color: #64748b; margin-bottom: 0.5rem;">No Active Promotions</h3>
                <p style="color: #94a3b8;">Check back soon for special offers and discounts!</p>
            </div>
        `;
        return;
    }
    
    console.log('Rendering promotions:', promotions);
    container.innerHTML = promotions.map((promo, index) => `
        <div class="discount-card ${index === 0 ? 'featured' : ''}" style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid #f1f5f9; transition: all 0.3s ease; position: relative;" onmouseover="this.style.transform='translateY(-8px)'; this.style.boxShadow='0 12px 40px rgba(0,0,0,0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 20px rgba(0,0,0,0.08)'">
            ${index === 0 ? '<div class="discount-ribbon" style="position: absolute; top: 15px; left: -35px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 0.4rem 2.5rem; transform: rotate(-45deg); font-weight: 700; font-size: 0.75rem; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); z-index: 10;">BEST SELLER</div>' : ''}
            <div class="discount-badge" style="position: absolute; top: 20px; right: 20px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 0.6rem 1rem; border-radius: 50px; font-weight: 800; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4); z-index: 10;">-${promo.discountPercentage}%</div>
            <div class="discount-icon" style="width: 100%; height: 200px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                ${promo.image ? 
                    `<img src="${promo.image}" alt="${promo.name}" style="width: 100%; height: 100%; object-fit: cover;">` :
                    `<i class="fas ${categoryIcons[promo.category] || 'fa-box'}" style="font-size: 4rem; color: #cbd5e1;"></i>`
                }
            </div>
            <div style="padding: 1.5rem;">
                <h3 style="font-size: 1.5rem; font-weight: 800; color: #1e293b; margin-bottom: 0.75rem; line-height: 1.2;">${promo.name}</h3>
                <p class="discount-description" style="color: #64748b; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.25rem; min-height: 48px;">${promo.description || 'Special discount offer - Limited time only!'}</p>
                <div class="price-container" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                    <span class="old-price" style="text-decoration: line-through; color: #94a3b8; font-size: 1.1rem;">₱${promo.originalPrice.toLocaleString()}/${promo.unit}</span>
                    <span class="new-price" style="font-size: 2rem; font-weight: 900; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">₱${promo.discountedPrice.toLocaleString()}/${promo.unit}</span>
                </div>
                <div class="discount-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem;">
                    <div class="detail-item" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <i class="fas fa-box" style="color: #3b82f6; font-size: 1.1rem;"></i>
                        <span style="font-size: 0.875rem; color: #475569; font-weight: 600;">Min. ${promo.minQuantity}${promo.unit}</span>
                    </div>
                    <div class="detail-item" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: #fef3c7; border-radius: 10px; border: 1px solid #fde68a;">
                        <i class="fas fa-clock" style="color: #f59e0b; font-size: 1.1rem;"></i>
                        <span style="font-size: 0.875rem; color: #92400e; font-weight: 600;">${promo.daysRemaining} days left</span>
                    </div>
                </div>
                <button class="btn btn-primary btn-block" onclick="showLogin()" aria-label="Order ${promo.name}" style="width: 100%; padding: 1rem; background: linear-gradient(135deg, #C41E3A 0%, #a01629 100%); color: white; border: none; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(196, 30, 58, 0.3);" onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 6px 20px rgba(196, 30, 58, 0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 15px rgba(196, 30, 58, 0.3)'">
                    <i class="fas fa-shopping-cart" aria-hidden="true"></i>
                    Order Now
                </button>
            </div>
        </div>
    `).join('');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only load if we're on the landing page
    const landingPage = document.querySelector('.landing-page');
    console.log('DOM loaded, checking for landing page...', landingPage ? 'Found!' : 'Not found');
    
    if (landingPage) {
        console.log('Loading dynamic landing page data...');
        console.log('API URL:', getApiUrl());
        loadFeaturedProducts();
        loadPromotions();
    } else {
        console.log('Not on landing page, skipping dynamic data load');
    }
});

// Export functions for manual refresh if needed
window.refreshLandingData = function() {
    loadFeaturedProducts();
    loadPromotions();
};
