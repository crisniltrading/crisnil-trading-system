// ============================================
// CLIENT SHOPPING MODULE - Complete E-Commerce Features
// ============================================

// Helper function to get image URL (handles both base64 and file paths)
function getImageUrl(image) {
    if (!image || !image.url) return null;
    // If it's base64 (starts with data:image), return as is
    if (image.url.startsWith('data:image') || image.isBase64) {
        return image.url;
    }
    // Otherwise, it's a file path, prepend API base URL
    return `${API_BASE_URL.replace('/api', '')}${image.url}`;
}

// Global shopping state
let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
let compareList = JSON.parse(localStorage.getItem('compareList') || '[]');

// ============================================
// CART MANAGEMENT
// ============================================

// Add product to cart with discount calculation
async function addToCart(productId, quantity = 1) {
    try {
        const token = localStorage.getItem('token');
        
        // Fetch product details
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (!response.ok) throw new Error('Failed to fetch product');
        
        const data = await response.json();
        const product = data.product;
        
        // Check stock availability
        if (product.stock < quantity) {
            showToast(`Only ${product.stock} units available in stock`, 'warning');
            return;
        }
        
        // Check if product already in cart
        const existingIndex = cart.findIndex(item => item.productId === productId);
        
        if (existingIndex > -1) {
            // Update quantity
            const newQuantity = cart[existingIndex].quantity + quantity;
            if (newQuantity > product.stock) {
                showToast(`Cannot add more. Only ${product.stock} units available`, 'warning');
                return;
            }
            cart[existingIndex].quantity = newQuantity;
        } else {
            // Add new item
            cart.push({
                productId: product._id,
                name: product.name,
                price: product.price,
                unit: product.unit,
                quantity: quantity,
                image: product.images && product.images.length > 0 ? product.images[0].url : null,
                category: product.category,
                stock: product.stock
            });
        }
        
        // Save cart and recalculate discounts
        localStorage.setItem('cart', JSON.stringify(cart));
        await recalculateCartDiscounts();
        renderCart();
        updateCartBadge();
        
        showToast(`${product.name} added to cart!`, 'success');
        
        // Show mini cart preview
        showMiniCartPreview();
        
    } catch (error) {
        console.error('Add to cart error:', error);
        showToast('Failed to add product to cart', 'error');
    }
}

// Update cart item quantity
async function updateCartQuantity(productId, quantity) {
    const itemIndex = cart.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) return;
    
    if (quantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    // Check stock
    if (quantity > cart[itemIndex].stock) {
        showToast(`Only ${cart[itemIndex].stock} units available`, 'warning');
        return;
    }
    
    cart[itemIndex].quantity = quantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    
    await recalculateCartDiscounts();
    renderCart();
    updateCartBadge();
}

// Remove item from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    recalculateCartDiscounts();
    renderCart();
    updateCartBadge();
    
    showToast('Item removed from cart', 'info');
}

// Clear entire cart
function clearCart() {
    showConfirmDialog({
        title: 'Clear Shopping Cart',
        message: 'Are you sure you want to remove all items from your cart? Any applied discounts will also be removed.',
        icon: 'shopping-cart',
        iconColor: 'var(--warning)',
        confirmText: 'Yes, Clear Cart',
        confirmColor: 'var(--warning)',
        onConfirm: () => {
            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            localStorage.removeItem('cartDiscounts');
            
            renderCart();
            updateCartBadge();
            
            showToast('Cart cleared successfully', 'info');
        }
    });
}

// Recalculate cart discounts using backend
async function recalculateCartDiscounts() {
    if (cart.length === 0) {
        localStorage.removeItem('cartDiscounts');
        return null;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        const cartItems = cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
        }));
        
        const response = await fetch(`${API_BASE_URL}/promotions/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ cartItems })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('cartDiscounts', JSON.stringify(data.data));
            return data.data;
        }
    } catch (error) {
        console.error('Failed to calculate discounts:', error);
    }
    
    return null;
}

// Update cart badge count
function updateCartBadge() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cartBadge');
    
    if (badge) {
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'block' : 'none';
    }
}

// Show mini cart preview
function showMiniCartPreview() {
    const preview = document.getElementById('miniCartPreview');
    if (!preview) return;
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    preview.innerHTML = `
        <div class="mini-cart-content">
            <h4><i class="fas fa-shopping-cart"></i> Cart (${totalItems} items)</h4>
            <p>Subtotal: ₱${subtotal.toFixed(2)}</p>
            <button class="btn btn-primary btn-sm" onclick="switchTab('cart')">View Cart</button>
        </div>
    `;
    
    preview.style.display = 'block';
    setTimeout(() => {
        preview.style.display = 'none';
    }, 3000);
}

// ============================================
// WISHLIST MANAGEMENT
// ============================================

// Add to wishlist
function addToWishlist(productId) {
    // Check if already in wishlist
    if (wishlist.includes(productId)) {
        showToast('Product already in wishlist', 'info');
        return;
    }
    
    wishlist.push(productId);
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    
    updateWishlistUI(productId, true);
    showToast('Added to wishlist!', 'success');
    
    // Update wishlist badge
    updateWishlistBadge();
}

// Remove from wishlist
function removeFromWishlist(productId) {
    wishlist = wishlist.filter(id => id !== productId);
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    
    updateWishlistUI(productId, false);
    renderWishlist();
    showToast('Removed from wishlist', 'info');
    
    updateWishlistBadge();
}

// Toggle wishlist
function toggleWishlist(productId) {
    if (wishlist.includes(productId)) {
        removeFromWishlist(productId);
    } else {
        addToWishlist(productId);
    }
}

// Update wishlist UI (heart icon)
function updateWishlistUI(productId, isInWishlist) {
    const buttons = document.querySelectorAll(`[data-wishlist-product="${productId}"]`);
    buttons.forEach(btn => {
        if (isInWishlist) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-heart"></i>';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="far fa-heart"></i>';
        }
    });
}

// Update wishlist badge
function updateWishlistBadge() {
    const badge = document.getElementById('wishlistBadge');
    if (badge) {
        badge.textContent = wishlist.length;
        badge.style.display = wishlist.length > 0 ? 'block' : 'none';
    }
}

// Render wishlist section
async function renderWishlist() {
    const container = document.getElementById('wishlistGrid');
    if (!container) return;
    
    if (wishlist.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-heart-broken" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <p style="color: var(--text-muted); font-size: 1.2rem;">Your wishlist is empty</p>
                <button class="btn btn-primary" onclick="switchTab('products')">
                    <i class="fas fa-shopping-bag"></i> Browse Products
                </button>
            </div>
        `;
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        // Fetch all wishlist products
        const productPromises = wishlist.map(productId =>
            fetch(`${API_BASE_URL}/products/${productId}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            }).then(res => {
                if (res.ok) return res.json();
                // If product not found (404), remove from wishlist
                if (res.status === 404) {
                    wishlist = wishlist.filter(id => id !== productId);
                    localStorage.setItem('wishlist', JSON.stringify(wishlist));
                }
                return null;
            })
        );
        
        const results = await Promise.all(productPromises);
        const products = results.filter(r => r).map(r => r.product);
        
        container.innerHTML = products.map(product => renderProductCard(product, true)).join('');
        
    } catch (error) {
        console.error('Error loading wishlist:', error);
        showToast('Failed to load wishlist', 'error');
    }
}

// Move all wishlist items to cart
async function moveWishlistToCart() {
    if (wishlist.length === 0) {
        showToast('Wishlist is empty', 'info');
        return;
    }
    
    for (const productId of wishlist) {
        await addToCart(productId, 1);
    }
    
    wishlist = [];
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    renderWishlist();
    updateWishlistBadge();
    
    showToast('All items moved to cart!', 'success');
}

// ============================================
// PRODUCT DETAILS & QUICK VIEW
// ============================================

// View product details in modal
async function viewProductDetails(productId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (!response.ok) throw new Error('Failed to fetch product');
        
        const data = await response.json();
        const product = data.product;
        
        // Add to recently viewed
        addToRecentlyViewed(productId);
        
        // Show product details modal
        showProductDetailsModal(product);
        
    } catch (error) {
        console.error('Error loading product details:', error);
        showToast('Failed to load product details', 'error');
    }
}

// Show product details modal
function showProductDetailsModal(product) {
    const hasDiscount = product.discountedPrice && product.discountedPrice < product.price;
    const displayPrice = hasDiscount ? product.discountedPrice : product.price;
    const inWishlist = wishlist.includes(product._id);
    
    const images = product.images && product.images.length > 0 
        ? product.images 
        : [{ url: null, alt: product.name }];
    
    const modalHTML = `
        <div id="productDetailsModal" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3><i class="fas fa-box"></i> ${product.name}</h3>
                    <button class="close-btn" onclick="closeProductDetailsModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                        <!-- Image Gallery -->
                        <div>
                            <div id="productMainImage" style="width: 100%; height: 400px; background: var(--background-alt); border-radius: 12px; overflow: hidden; margin-bottom: 1rem; position: relative;">
                                ${images[0].url ? `
                                    <img src="${API_BASE_URL.replace('/api', '')}${images[0].url}"
                                         onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display: flex; align-items: center; justify-content: center; height: 100%; background: var(--background-alt);\\' ><i class=\\'fas fa-box\\' style=\\'font-size: 4rem; color: var(--text-muted); opacity: 0.3;\\'></i></div>';" 
                                         alt="${product.name}" 
                                         style="width: 100%; height: 100%; object-fit: cover; cursor: zoom-in;"
                                         onclick="zoomImage(this.src)">
                                ` : `
                                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 5rem; color: var(--text-muted);">
                                        <i class="fas ${getCategoryIcon(product.category)}"></i>
                                    </div>
                                `}
                            </div>
                            ${images.length > 1 ? `
                                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
                                    ${images.map((img, idx) => `
                                        <div style="height: 80px; background: var(--background-alt); border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid ${idx === 0 ? 'var(--primary)' : 'transparent'};"
                                             onclick="changeMainImage('${API_BASE_URL.replace('/api', '')}${img.url}', this)">
                                            ${img.url ? `
                                                <img src="${API_BASE_URL.replace('/api', '')}${img.url}" 
                                                     alt="${product.name}" 
                                                     style="width: 100%; height: 100%; object-fit: cover;">
                                            ` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                        
                        <!-- Product Info -->
                        <div>
                            <div class="product-badges" style="margin-bottom: 1rem;">
                                ${getStockBadge(product)}
                                <span class="badge badge-secondary">
                                    <i class="fas ${getCategoryIcon(product.category)}"></i>
                                    ${product.category}
                                </span>
                                ${hasDiscount ? `
                                    <span class="badge badge-success">
                                        <i class="fas fa-percentage"></i> ${product.discountPercentage}% OFF
                                    </span>
                                ` : ''}
                            </div>
                            
                            <div style="margin-bottom: 1.5rem;">
                                ${hasDiscount ? `
                                    <div style="text-decoration: line-through; color: var(--text-muted); font-size: 1.2rem;">
                                        ₱${product.price.toFixed(2)}
                                    </div>
                                    <div style="font-size: 2rem; font-weight: 700; color: var(--error);">
                                        ₱${displayPrice.toFixed(2)}/${product.unit}
                                    </div>
                                    <div style="color: var(--success); font-weight: 600; margin-top: 0.5rem;">
                                        You save ₱${(product.price - displayPrice).toFixed(2)}!
                                    </div>
                                ` : `
                                    <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">
                                        ₱${displayPrice.toFixed(2)}/${product.unit}
                                    </div>
                                `}
                            </div>
                            
                            <div style="margin-bottom: 1.5rem;">
                                <h4 style="margin-bottom: 0.5rem;">Description</h4>
                                <p style="color: var(--text-secondary); line-height: 1.6;">
                                    ${product.description || 'No description available'}
                                </p>
                            </div>
                            
                            <div style="margin-bottom: 1.5rem;">
                                <h4 style="margin-bottom: 0.5rem;">Stock Information</h4>
                                <p style="color: var(--text-secondary);">
                                    <i class="fas fa-box"></i> ${product.stock} units available
                                </p>
                            </div>
                            
                            <!-- Quantity Selector -->
                            ${(currentUser?.role === 'client' || !currentUser) ? `
                                <div style="margin-bottom: 1.5rem;">
                                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Quantity</label>
                                    <div style="display: flex; align-items: center; gap: 1rem;">
                                        <button class="btn btn-secondary" onclick="decrementQuantity('detailsQuantity')">
                                            <i class="fas fa-minus"></i>
                                        </button>
                                        <input type="number" id="detailsQuantity" value="1" min="1" max="${product.stock}" 
                                               style="width: 80px; text-align: center; font-size: 1.2rem; font-weight: 600;"
                                               class="form-input">
                                        <button class="btn btn-secondary" onclick="incrementQuantity('detailsQuantity', ${product.stock})">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    </div>
                                </div>
                            ` : ''}
                            
                            <!-- Action Buttons -->
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                ${(currentUser?.role === 'client' || !currentUser) ? `
                                    <button class="btn btn-primary" onclick="addToCartFromDetails('${product._id}')">
                                        <i class="fas fa-cart-plus"></i> Add to Cart
                                    </button>
                                    <button class="btn btn-secondary" onclick="toggleWishlist('${product._id}'); updateWishlistUI('${product._id}', ${!inWishlist})">
                                        <i class="fa${inWishlist ? 's' : 'r'} fa-heart"></i> ${inWishlist ? 'Remove from' : 'Add to'} Wishlist
                                    </button>
                                    <button class="btn btn-outline" onclick="shareProduct('${product._id}', '${product.name}')">
                                        <i class="fas fa-share-alt"></i> Share
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Reviews Section -->
                    <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                            <h3 style="margin: 0;"><i class="fas fa-star"></i> Customer Reviews</h3>
                            ${(currentUser?.role === 'client' || !currentUser) ? `
                                <button class="btn btn-primary btn-sm" onclick="showWriteReviewModal('${product._id}', '${product.name.replace(/'/g, "\\'")}')">
                                    <i class="fas fa-pen"></i> Write a Review
                                </button>
                            ` : ''}
                        </div>
                        
                        <!-- Rating Summary -->
                        <div id="ratingSummary"></div>
                        
                        <!-- Reviews List -->
                        <div id="reviewsList"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existing = document.getElementById('productDetailsModal');
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Load reviews for this product
    if (typeof displayProductReviews === 'function') {
        displayProductReviews(product._id);
    }
}

// Close product details modal
function closeProductDetailsModal() {
    const modal = document.getElementById('productDetailsModal');
    if (modal) modal.remove();
}

// Add to cart from details modal
function addToCartFromDetails(productId) {
    const quantity = parseInt(document.getElementById('detailsQuantity').value) || 1;
    addToCart(productId, quantity);
    closeProductDetailsModal();
}

// Change main image in gallery
function changeMainImage(imageUrl, thumbnail) {
    const mainImage = document.getElementById('productMainImage');
    if (mainImage) {
        mainImage.innerHTML = `
            <img src="${imageUrl}" 
                 alt="Product" 
                 style="width: 100%; height: 100%; object-fit: cover; cursor: zoom-in;"
                 onclick="zoomImage(this.src)">
        `;
    }
    
    // Update thumbnail borders
    const thumbnails = thumbnail.parentElement.children;
    Array.from(thumbnails).forEach(t => {
        t.style.border = '2px solid transparent';
    });
    thumbnail.style.border = '2px solid var(--primary)';
}

// Zoom image
function zoomImage(imageUrl) {
    const zoomModal = `
        <div id="imageZoomModal" class="modal" style="display: flex; background: rgba(0,0,0,0.95);" onclick="closeImageZoom()">
            <div style="position: relative; max-width: 90vw; max-height: 90vh;">
                <img src="${imageUrl}" style="max-width: 100%; max-height: 90vh; object-fit: contain;">
                <button class="close-btn" style="position: absolute; top: 1rem; right: 1rem; background: white; color: black;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', zoomModal);
}

// Close image zoom
function closeImageZoom() {
    const modal = document.getElementById('imageZoomModal');
    if (modal) modal.remove();
}

// Quantity controls
function incrementQuantity(inputId, max) {
    const input = document.getElementById(inputId);
    if (input) {
        const current = parseInt(input.value) || 1;
        if (current < max) {
            input.value = current + 1;
        }
    }
}

function decrementQuantity(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        const current = parseInt(input.value) || 1;
        if (current > 1) {
            input.value = current - 1;
        }
    }
}

// Share product
function shareProduct(productId, productName) {
    const url = `${window.location.origin}?product=${productId}`;
    
    if (navigator.share) {
        navigator.share({
            title: productName,
            text: `Check out ${productName} on Frozen Mart!`,
            url: url
        }).catch(err => console.log('Share failed:', err));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            showToast('Product link copied to clipboard!', 'success');
        });
    }
}

// ============================================
// RECENTLY VIEWED & RECOMMENDATIONS
// ============================================

// Add to recently viewed
function addToRecentlyViewed(productId) {
    // Remove if already exists
    recentlyViewed = recentlyViewed.filter(id => id !== productId);
    
    // Add to beginning
    recentlyViewed.unshift(productId);
    
    // Keep only last 10
    if (recentlyViewed.length > 10) {
        recentlyViewed = recentlyViewed.slice(0, 10);
    }
    
    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
}

// Render recently viewed products
async function renderRecentlyViewed() {
    const container = document.getElementById('recentlyViewed');
    if (!container || recentlyViewed.length === 0) return;
    
    // Only fetch products if user is authenticated to avoid 401 errors
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('⏭️ Skipping recently viewed - user not authenticated');
        return;
    }
    
    try {
        const productPromises = recentlyViewed.slice(0, 5).map(productId =>
            fetch(`${API_BASE_URL}/products/${productId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => {
                if (res.ok) return res.json();
                // If product not found (404), remove from recently viewed
                if (res.status === 404) {
                    recentlyViewed = recentlyViewed.filter(id => id !== productId);
                    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
                }
                return null;
            })
        );
        
        const results = await Promise.all(productPromises);
        const products = results.filter(r => r).map(r => r.product);
        
        container.innerHTML = products.map(product => `
            <div class="recent-product-item" onclick="viewProductDetails('${product._id}')" style="cursor: pointer;">
                <div style="display: flex; gap: 1rem; padding: 0.75rem; background: var(--surface); border-radius: 8px; transition: all 0.2s;">
                    <div style="width: 60px; height: 60px; background: var(--background-alt); border-radius: 8px; overflow: hidden; flex-shrink: 0;">
                        ${product.images && product.images.length > 0 ? `
                            <img src="${API_BASE_URL.replace('/api', '')}${product.images[0].url}" 
                                 style="width: 100%; height: 100%; object-fit: cover;">
                        ` : `
                            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">
                                <i class="fas ${getCategoryIcon(product.category)}"></i>
                            </div>
                        `}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${product.name}
                        </div>
                        <div style="color: var(--primary); font-weight: 600; margin-top: 0.25rem;">
                            ₱${(product.discountedPrice || product.price).toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recently viewed:', error);
    }
}

// ============================================
// PRODUCT COMPARISON
// ============================================

// Add to compare
function addToCompare(productId) {
    if (compareList.includes(productId)) {
        showToast('Product already in comparison', 'info');
        return;
    }
    
    if (compareList.length >= 4) {
        showToast('You can compare up to 4 products only', 'warning');
        return;
    }
    
    compareList.push(productId);
    localStorage.setItem('compareList', JSON.stringify(compareList));
    
    showToast('Added to comparison', 'success');
    updateCompareButton();
}

// Remove from compare
function removeFromCompare(productId) {
    compareList = compareList.filter(id => id !== productId);
    localStorage.setItem('compareList', JSON.stringify(compareList));
    
    if (compareList.length === 0) {
        closeCompareModal();
    } else {
        showCompareModal();
    }
}

// Show compare modal
async function showCompareModal() {
    if (compareList.length === 0) {
        showToast('No products to compare', 'info');
        return;
    }
    
    // Only fetch products if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Please log in to compare products', 'warning');
        return;
    }
    
    try {
        const productPromises = compareList.map(productId =>
            fetch(`${API_BASE_URL}/products/${productId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.ok ? res.json() : null)
        );
        
        const results = await Promise.all(productPromises);
        const products = results.filter(r => r).map(r => r.product);
        
        const modalHTML = `
            <div id="compareModal" class="modal" style="display: flex;">
                <div class="modal-content" style="max-width: 1200px; width: 95%;">
                    <div class="modal-header">
                        <h3><i class="fas fa-balance-scale"></i> Compare Products</h3>
                        <button class="close-btn" onclick="closeCompareModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr>
                                        <th style="padding: 1rem; text-align: left; border-bottom: 2px solid var(--border);">Feature</th>
                                        ${products.map(p => `
                                            <th style="padding: 1rem; text-align: center; border-bottom: 2px solid var(--border);">
                                                <div style="position: relative;">
                                                    ${p.name}
                                                    <button onclick="removeFromCompare('${p._id}')" 
                                                            style="position: absolute; top: -0.5rem; right: -0.5rem; background: var(--error); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer;">
                                                        <i class="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            </th>
                                        `).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style="padding: 1rem; font-weight: 600;">Image</td>
                                        ${products.map(p => `
                                            <td style="padding: 1rem; text-align: center;">
                                                <div style="width: 100px; height: 100px; margin: 0 auto; background: var(--background-alt); border-radius: 8px; overflow: hidden;">
                                                    ${p.images && p.images.length > 0 ? `
                                                        <img src="${API_BASE_URL.replace('/api', '')}${p.images[0].url}" 
                                                             style="width: 100%; height: 100%; object-fit: cover;">
                                                    ` : `
                                                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 2rem; color: var(--text-muted);">
                                                            <i class="fas ${getCategoryIcon(p.category)}"></i>
                                                        </div>
                                                    `}
                                                </div>
                                            </td>
                                        `).join('')}
                                    </tr>
                                    <tr style="background: var(--background-alt);">
                                        <td style="padding: 1rem; font-weight: 600;">Price</td>
                                        ${products.map(p => `
                                            <td style="padding: 1rem; text-align: center;">
                                                <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">
                                                    ₱${(p.discountedPrice || p.price).toFixed(2)}
                                                </div>
                                                ${p.discountedPrice ? `
                                                    <div style="text-decoration: line-through; color: var(--text-muted); font-size: 0.9rem;">
                                                        ₱${p.price.toFixed(2)}
                                                    </div>
                                                ` : ''}
                                            </td>
                                        `).join('')}
                                    </tr>
                                    <tr>
                                        <td style="padding: 1rem; font-weight: 600;">Category</td>
                                        ${products.map(p => `
                                            <td style="padding: 1rem; text-align: center;">
                                                <span class="badge badge-secondary">
                                                    <i class="fas ${getCategoryIcon(p.category)}"></i> ${p.category}
                                                </span>
                                            </td>
                                        `).join('')}
                                    </tr>
                                    <tr style="background: var(--background-alt);">
                                        <td style="padding: 1rem; font-weight: 600;">Stock</td>
                                        ${products.map(p => `
                                            <td style="padding: 1rem; text-align: center;">
                                                ${getStockBadge(p)}
                                                <div style="margin-top: 0.5rem; color: var(--text-secondary);">
                                                    ${p.stock} units
                                                </div>
                                            </td>
                                        `).join('')}
                                    </tr>
                                    <tr>
                                        <td style="padding: 1rem; font-weight: 600;">Unit</td>
                                        ${products.map(p => `
                                            <td style="padding: 1rem; text-align: center;">${p.unit}</td>
                                        `).join('')}
                                    </tr>
                                    <tr style="background: var(--background-alt);">
                                        <td style="padding: 1rem; font-weight: 600;">Description</td>
                                        ${products.map(p => `
                                            <td style="padding: 1rem; text-align: center; max-width: 200px;">
                                                <div style="max-height: 100px; overflow-y: auto; font-size: 0.9rem; color: var(--text-secondary);">
                                                    ${p.description || 'No description'}
                                                </div>
                                            </td>
                                        `).join('')}
                                    </tr>
                                    <tr>
                                        <td style="padding: 1rem; font-weight: 600;">Actions</td>
                                        ${products.map(p => `
                                            <td style="padding: 1rem; text-align: center;">
                                                <button class="btn btn-primary btn-sm" onclick="addToCart('${p._id}'); closeCompareModal();">
                                                    <i class="fas fa-cart-plus"></i> Add to Cart
                                                </button>
                                            </td>
                                        `).join('')}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existing = document.getElementById('compareModal');
        if (existing) existing.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
    } catch (error) {
        console.error('Error loading comparison:', error);
        showToast('Failed to load product comparison', 'error');
    }
}

// Close compare modal
function closeCompareModal() {
    const modal = document.getElementById('compareModal');
    if (modal) modal.remove();
}

// Update compare button
function updateCompareButton() {
    const btn = document.getElementById('compareButton');
    if (btn) {
        btn.textContent = `Compare (${compareList.length})`;
        
        // Only show button for logged-in client users in products section
        const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
        const userRole = currentUser ? (currentUser.role || 'client').toLowerCase() : null;
        const isDashboardVisible = document.getElementById('dashboard')?.classList.contains('active');
        const isProductsSection = document.getElementById('productsSection')?.classList.contains('active');
        
        // Show button only if: user is client, dashboard is active, products section is active, and there are items to compare
        const shouldShow = userRole === 'client' && isDashboardVisible && isProductsSection && compareList.length > 0;
        btn.style.display = shouldShow ? 'block' : 'none';
    }
}

// ============================================
// PAYMENT PROOF HANDLING
// ============================================

// Toggle payment proof fields based on selected payment method
function togglePaymentProofFields() {
    const paymentMethod = document.getElementById('paymentMethodSelect')?.value;
    const proofSection = document.getElementById('paymentProofSection');
    const refInput = document.getElementById('paymentReference');
    const proofInput = document.getElementById('paymentProofInput');
    
    if (!proofSection) return;
    
    if (paymentMethod === 'gcash' || paymentMethod === 'bank') {
        // Show payment proof section and make fields required
        proofSection.style.display = 'block';
        if (refInput) refInput.setAttribute('required', 'required');
        if (proofInput) proofInput.setAttribute('required', 'required');
    } else {
        // Hide payment proof section and remove required
        proofSection.style.display = 'none';
        if (refInput) {
            refInput.removeAttribute('required');
            refInput.value = '';
        }
        if (proofInput) {
            proofInput.removeAttribute('required');
            proofInput.value = '';
        }
        // Hide preview
        const preview = document.getElementById('paymentProofPreview');
        if (preview) preview.style.display = 'none';
    }
}

// Preview payment proof image
function previewPaymentProof(input) {
    const preview = document.getElementById('paymentProofPreview');
    const previewImage = document.getElementById('paymentProofImage');
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size must be less than 5MB', 'error');
            input.value = '';
            preview.style.display = 'none';
            return;
        }
        
        // Validate file type
        if (!file.type.match('image.*')) {
            showToast('Please upload an image file', 'error');
            input.value = '';
            preview.style.display = 'none';
            return;
        }
        
        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
    }
}

// Convert image file to base64
async function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================
// CHECKOUT PROCESS
// ============================================

// Proceed to checkout
async function proceedToCheckout() {
    console.log('🛒 proceedToCheckout called');
    console.log('Cart before checkout:', cart);
    
    if (cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }
    
    // Recalculate discounts before checkout
    console.log('Recalculating discounts...');
    await recalculateCartDiscounts();
    
    // Switch to checkout tab
    console.log('Switching to checkout tab...');
    switchTab('checkout');
    
    // Show checkout tab
    const checkoutTab = document.getElementById('tab-checkout');
    if (checkoutTab) {
        checkoutTab.style.display = 'flex';
    }
    
    // Render checkout summary
    console.log('Rendering checkout summary...');
    renderCheckoutSummary();
    
    // Initialize delivery date picker with minimum date (tomorrow)
    const deliveryDateInput = document.getElementById('preferredDeliveryDate');
    if (deliveryDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];
        deliveryDateInput.setAttribute('min', minDate);
        console.log('Set minimum delivery date to:', minDate);
    }
    
    // Load available coupons
    if (typeof loadAvailableCoupons === 'function') {
        console.log('Loading available coupons...');
        loadAvailableCoupons();
    }
    
    // Attach coupon button handlers
    if (typeof window.attachCouponButtonHandlers === 'function') {
        console.log('Attaching coupon button handlers...');
        window.attachCouponButtonHandlers();
    }
    
    console.log('✅ Checkout ready');
}

// Render checkout summary
// Export to window so coupon system can use it
window.renderCheckoutSummary = function renderCheckoutSummary() {
    console.log('🛒 renderCheckoutSummary called');
    console.log('Cart:', cart);
    console.log('Cart length:', cart.length);
    
    const container = document.getElementById('checkoutSummary');
    if (!container) {
        console.error('❌ checkoutSummary container not found!');
        return;
    }
    
    const discounts = JSON.parse(localStorage.getItem('cartDiscounts') || 'null');
    console.log('Discounts object:', discounts);
    console.log('Discounts keys:', discounts ? Object.keys(discounts) : 'null');
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    console.log('Calculated subtotal:', subtotal);
    
    // Handle different discount data structures
    let totalDiscount = 0;
    let finalTotal = subtotal; // Default to subtotal
    let appliedPromotions = [];
    
    if (discounts) {
        // Check for different possible property names
        if (discounts.totalDiscount !== undefined) {
            totalDiscount = discounts.totalDiscount;
        } else if (discounts.totalSavings !== undefined) {
            totalDiscount = discounts.totalSavings;
        }
        
        if (discounts.finalTotal !== undefined && discounts.finalTotal !== null) {
            finalTotal = discounts.finalTotal;
        } else if (discounts.grandTotal !== undefined && discounts.grandTotal !== null) {
            finalTotal = discounts.grandTotal;
        } else if (discounts.discountedTotal !== undefined && discounts.discountedTotal !== null) {
            finalTotal = discounts.discountedTotal;
        } else {
            finalTotal = subtotal - totalDiscount;
        }
        
        // Safety check: if finalTotal is 0 but subtotal > 0, recalculate
        if (finalTotal === 0 && subtotal > 0 && totalDiscount > 0) {
            finalTotal = subtotal - totalDiscount;
            console.warn('Fixed finalTotal from 0 to', finalTotal);
        }
        
        // Ensure finalTotal is never negative
        if (finalTotal < 0) {
            finalTotal = 0;
        }
        
        // Build appliedPromotions array from breakdown
        if (discounts.breakdown) {
            appliedPromotions = [];
            
            // Add bulk discounts
            if (discounts.breakdown.bulkDiscounts && discounts.breakdown.bulkDiscounts.length > 0) {
                discounts.breakdown.bulkDiscounts.forEach(discount => {
                    appliedPromotions.push({
                        name: discount.name || 'Bulk Discount',
                        discountAmount: discount.savings || 0,
                        type: 'bulk'
                    });
                });
            }
            
            // Add expiry discounts
            if (discounts.breakdown.expiryDiscounts && discounts.breakdown.expiryDiscounts.length > 0) {
                discounts.breakdown.expiryDiscounts.forEach(discount => {
                    appliedPromotions.push({
                        name: discount.name || 'Near Expiry Discount',
                        discountAmount: discount.savings || 0,
                        type: 'expiry'
                    });
                });
            }
            
            // Add other discounts
            if (discounts.breakdown.otherDiscounts && discounts.breakdown.otherDiscounts.length > 0) {
                discounts.breakdown.otherDiscounts.forEach(discount => {
                    appliedPromotions.push({
                        name: discount.name || discount.promotionName || 'Discount',
                        discountAmount: discount.savings || 0,
                        type: 'other'
                    });
                });
            }
        } else if (discounts.appliedPromotions) {
            appliedPromotions = discounts.appliedPromotions;
        } else if (discounts.appliedDiscounts) {
            appliedPromotions = discounts.appliedDiscounts;
        }
    }
    
    console.log('Subtotal:', subtotal);
    console.log('Total Discount:', totalDiscount);
    console.log('Final Total:', finalTotal);
    console.log('Applied Promotions:', appliedPromotions);
    console.log('Applied Promotions Length:', appliedPromotions.length);
    if (appliedPromotions.length > 0) {
        console.log('First promotion:', appliedPromotions[0]);
    }
    
    // Validate cart items
    if (!cart || cart.length === 0) {
        container.innerHTML = `
            <div class="card">
                <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-receipt"></i> Order Summary</h3>
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fas fa-shopping-cart" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Your cart is empty</p>
                    <button onclick="switchTab('products')" class="btn btn-primary">Browse Products</button>
                </div>
            </div>
        `;
        return;
    }
    
    console.log('Cart items:', cart.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        hasName: !!item.name,
        hasPrice: !!item.price,
        hasQuantity: !!item.quantity
    })));
    
    container.innerHTML = `
        <div class="card">
            <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-receipt"></i> Order Summary</h3>
            
            <!-- Cart Items -->
            <div style="margin-bottom: 1.5rem;">
                ${cart.map((item, index) => {
                    console.log(`Rendering item ${index}:`, item);
                    if (!item || !item.name || !item.price || !item.quantity) {
                        console.error(`Invalid item at index ${index}:`, item);
                        return '';
                    }
                    return `
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--background-alt); border-radius: 8px; margin-bottom: 0.5rem;">
                            <div>
                                <div style="font-weight: 600;">${item.name || 'Unknown Product'}</div>
                                <div style="color: var(--text-muted); font-size: 0.9rem;">
                                    ${item.quantity || 0} × ₱${(item.price || 0).toFixed(2)}
                                </div>
                            </div>
                            <div style="font-weight: 600;">
                                ₱${((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <!-- Price Breakdown -->
            <div style="border-top: 2px solid var(--border); padding-top: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Subtotal:</span>
                    <span>₱${subtotal.toFixed(2)}</span>
                </div>
                
                ${appliedPromotions && appliedPromotions.length > 0 ? `
                    <div style="margin: 1rem 0; padding: 1rem; background: var(--success); color: white; border-radius: 8px;">
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">
                            <i class="fas fa-tags"></i> Applied Discounts:
                        </div>
                        ${appliedPromotions.map(promo => {
                            console.log('Rendering promo:', promo);
                            console.log('Promo keys:', Object.keys(promo));
                            const promoName = promo.name || promo.promotionName || promo.title || promo.code || 'Discount';
                            
                            // Try multiple property names for the discount amount
                            let promoAmount = promo.discountAmount || promo.savings || promo.discount || promo.amount || promo.value || 0;
                            
                            // If still 0, calculate from totalSavings if there's only one promotion
                            if (promoAmount === 0 && appliedPromotions.length === 1 && totalDiscount > 0) {
                                promoAmount = totalDiscount;
                                console.log('Using totalDiscount as promoAmount:', promoAmount);
                            }
                            
                            console.log('Promo name:', promoName, 'Amount:', promoAmount);
                            
                            return `
                            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.25rem;">
                                <span>${promoName}</span>
                                <span>-₱${promoAmount.toFixed(2)}</span>
                            </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: var(--success); font-weight: 600;">
                        <span>Total Discount:</span>
                        <span>-₱${totalDiscount.toFixed(2)}</span>
                    </div>
                ` : ''}
                
                <div style="display: flex; justify-content: space-between; font-size: 1.5rem; font-weight: 700; color: var(--primary); margin-top: 1rem; padding-top: 1rem; border-top: 2px solid var(--border);">
                    <span>Total:</span>
                    <span>₱${finalTotal.toFixed(2)}</span>
                </div>
                
                ${totalDiscount > 0 ? `
                    <div style="text-align: center; margin-top: 1rem; padding: 0.75rem; background: var(--success); color: white; border-radius: 8px; font-weight: 600;">
                        <i class="fas fa-check-circle"></i> You saved ₱${totalDiscount.toFixed(2)}!
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Handle checkout form submission
let isSubmittingOrder = false;

async function handleCheckout(e) {
    e.preventDefault();
    console.log('📦 handleCheckout called');
    
    // Prevent double submission
    if (isSubmittingOrder) {
        console.log('⚠️ Order already being submitted, please wait...');
        showToast('Please wait, processing your order...', 'info');
        return;
    }
    
    if (cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }
    
    isSubmittingOrder = true;
    
    const formData = new FormData(e.target);
    const discounts = JSON.parse(localStorage.getItem('cartDiscounts') || 'null');
    
    console.log('Form data:', {
        address: formData.get('address'),
        phone: formData.get('phone'),
        paymentMethod: formData.get('paymentMethod'),
        notes: formData.get('notes')
    });
    console.log('Discounts for order:', discounts);
    
    // Extract promotion IDs safely
    let promotionIds = [];
    if (discounts) {
        if (discounts.appliedPromotions && Array.isArray(discounts.appliedPromotions)) {
            promotionIds = discounts.appliedPromotions
                .map(p => p.promotionId || p._id || p.id)
                .filter(id => id); // Remove undefined/null
        } else if (discounts.appliedDiscounts && Array.isArray(discounts.appliedDiscounts)) {
            promotionIds = discounts.appliedDiscounts
                .map(p => p.promotionId || p._id || p.id)
                .filter(id => id);
        }
    }
    
    console.log('Promotion IDs:', promotionIds);
    
    // Get form values
    const address = formData.get('address');
    const phone = formData.get('phone');
    const paymentMethod = formData.get('paymentMethod');
    const deliveryDate = formData.get('deliveryDate');
    const notes = formData.get('notes') || '';
    const paymentReference = formData.get('paymentReference');
    const paymentProofFile = formData.get('paymentProof');
    
    // Validate required fields
    if (!address || address.trim() === '') {
        isSubmittingOrder = false;
        showToast('Please enter delivery address', 'error');
        return;
    }
    
    if (!phone || phone.trim() === '') {
        isSubmittingOrder = false;
        showToast('Please enter contact number', 'error');
        return;
    }
    
    // Validate payment proof for GCash/Bank Transfer
    if (paymentMethod === 'gcash' || paymentMethod === 'bank') {
        if (!paymentReference || paymentReference.trim() === '') {
            isSubmittingOrder = false;
            showToast('Please enter payment reference number', 'error');
            return;
        }
        
        if (!paymentProofFile || paymentProofFile.size === 0) {
            isSubmittingOrder = false;
            showToast('Please upload payment proof image', 'error');
            return;
        }
    }
    
    console.log('✅ Validation passed, creating order...');
    
    // Convert payment proof image to base64 if provided
    let paymentProofUrl = null;
    if (paymentProofFile && paymentProofFile.size > 0) {
        try {
            paymentProofUrl = await convertImageToBase64(paymentProofFile);
            console.log('Payment proof converted to base64');
        } catch (error) {
            console.error('Error converting payment proof:', error);
            isSubmittingOrder = false;
            showToast('Failed to process payment proof image', 'error');
            return;
        }
    }
    
    // Calculate totals with discounts
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalDiscount = discounts ? (discounts.totalSavings || discounts.totalDiscount || 0) : 0;
    const finalTotal = discounts ? (discounts.discountedTotal || (subtotal - totalDiscount)) : subtotal;
    
    const orderData = {
        items: cart.map(item => ({
            product: item.productId,
            quantity: item.quantity,
            price: item.price
        })),
        address: address.trim(),           // Backend expects 'address'
        phone: phone.trim(),               // Backend expects 'phone' and saves as delivery.contactNumber
        paymentMethod: paymentMethod,      // Backend expects 'paymentMethod'
        paymentReference: paymentReference ? paymentReference.trim() : undefined,  // Payment reference for GCash/Bank
        paymentProofUrl: paymentProofUrl,  // Base64 encoded image
        deliveryDate: deliveryDate || undefined,  // Include preferred delivery date if provided
        notes: notes.trim(),
        appliedPromotions: promotionIds,
        // Include discount information
        subtotal: subtotal,
        totalDiscount: totalDiscount,
        totalAmount: finalTotal
    };
    
    console.log('Order data:', orderData);
    
    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        console.log('Sending order to backend...');
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
        
        console.log('Response status:', response.status);
        hideLoading();
        
        if (!response.ok) {
            const error = await response.json();
            console.error('Order error response:', error);
            throw new Error(error.message || `Failed to place order (${response.status})`);
        }
        
        const data = await response.json();
        console.log('Order response:', data);
        console.log('Order object:', data.order);
        
        // Clear cart and discounts ONLY on success
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        localStorage.removeItem('cartDiscounts');
        updateCartBadge();
        
        // Reset submission flag
        isSubmittingOrder = false;
        
        // Hide checkout tab
        const checkoutTab = document.getElementById('tab-checkout');
        if (checkoutTab) {
            checkoutTab.style.display = 'none';
        }
        
        // Show success message with safe data access
        const createdOrder = data.order || data.data || {};
        showOrderSuccessModal(createdOrder);
        
        // Show success toast
        showToast('Order placed successfully!', 'success');
        
        // Switch to overview tab (safer than orders tab)
        setTimeout(() => {
            switchTab('overview');
        }, 3000);
        
    } catch (error) {
        hideLoading();
        isSubmittingOrder = false; // Reset flag on error
        console.error('Checkout error:', error);
        showToast(error.message || 'Failed to place order', 'error');
        // DON'T clear cart on error - let user fix the issue and try again
    }
}

// Show order success modal
function showOrderSuccessModal(order) {
    console.log('Showing success modal for order:', order);
    
    // Safely extract order details
    const orderNumber = order?.orderNumber || order?._id || order?.id || 'N/A';
    const totalAmount = order?.total_amount || order?.totalAmount || order?.total || 0;
    
    // Remove any existing modal first
    const existingModal = document.getElementById('orderSuccessModal');
    if (existingModal) existingModal.remove();
    
    const modalHTML = `
        <div id="orderSuccessModal" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 500px; text-align: center;">
                <div style="font-size: 4rem; color: var(--success); margin-bottom: 1rem;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2 style="margin-bottom: 1rem;">Order Placed Successfully!</h2>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                    Your order has been placed successfully!
                </p>
                <div style="background: var(--background-alt); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
                    <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">Order Total</div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">
                        ₱${typeof totalAmount === 'number' ? totalAmount.toFixed(2) : totalAmount}
                    </div>
                </div>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem;">
                    We'll send you updates about your order status.
                </p>
                <button id="orderSuccessOkBtn" class="btn btn-primary">
                    <i class="fas fa-check"></i> OK
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listener to button (not inline onclick)
    const okBtn = document.getElementById('orderSuccessOkBtn');
    if (okBtn) {
        okBtn.addEventListener('click', closeOrderSuccessModal);
    }
    
    // Auto close after 5 seconds
    setTimeout(() => {
        closeOrderSuccessModal();
    }, 5000);
}

// Close order success modal
function closeOrderSuccessModal() {
    const modal = document.getElementById('orderSuccessModal');
    if (modal) {
        modal.remove();
    }
}

// ============================================
// ENHANCED PRODUCT CARD RENDERING
// ============================================

// Render product card with all features
function renderProductCard(product, isWishlistView = false) {
    const hasDiscount = product.discountedPrice && product.discountedPrice < product.price;
    const displayPrice = hasDiscount ? product.discountedPrice : product.price;
    const stockBadge = getStockBadge(product);
    const inWishlist = wishlist.includes(product._id);
    const imageUrl = product.images && product.images.length > 0 
        ? `${API_BASE_URL.replace('/api', '')}${product.images[0].url}`
        : null;
    
    const userRole = (currentUser?.role || 'client').toLowerCase();
    const isClient = userRole === 'client';
    
    return `
        <div class="product-card interactive" data-product-id="${product._id}">
            <!-- Wishlist Button -->
            ${isClient ? `
                <button class="wishlist-btn ${inWishlist ? 'active' : ''}" 
                        onclick="event.stopPropagation(); toggleWishlist('${product._id}')"
                        data-wishlist-product="${product._id}"
                        title="${inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">
                    <i class="fa${inWishlist ? 's' : 'r'} fa-heart"></i>
                </button>
            ` : ''}
            
            <!-- Product Image -->
            <div class="product-image" style="position: relative; cursor: pointer;" 
                 onclick="viewProductDetails('${product._id}')">
                ${imageUrl ? `
                    <img src="${imageUrl}" alt="${product.name}" 
                         onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-box\\' style=\\'font-size: 3rem; color: var(--text-muted); opacity: 0.3;\\'></i>';"
                         style="width: 100%; height: 100%; object-fit: cover;">
                ` : `
                    <i class="fas ${getCategoryIcon(product.category)}"></i>
                `}
                ${hasDiscount ? `
                    <div class="discount-badge">
                        <i class="fas fa-tag"></i> ${product.discountPercentage}% OFF
                    </div>
                ` : ''}
                ${product.stock <= 0 ? `
                    <div class="out-of-stock-overlay">
                        <span>OUT OF STOCK</span>
                    </div>
                ` : ''}
            </div>

            <!-- Product Info -->
            <div class="product-info">
                <h3 class="product-name" onclick="viewProductDetails('${product._id}')" style="cursor: pointer;">
                    ${product.name}
                </h3>
                
                <div class="product-price-section">
                    ${hasDiscount ? `
                        <div class="product-price-original">₱${product.price.toFixed(2)}</div>
                        <div class="product-price">₱${displayPrice.toFixed(2)}/${product.unit}</div>
                        <div class="product-savings">Save ₱${(product.price - displayPrice).toFixed(2)}</div>
                    ` : `
                        <div class="product-price">₱${displayPrice.toFixed(2)}/${product.unit}</div>
                    `}
                </div>

                <div class="product-badges">
                    ${stockBadge}
                    <span class="badge badge-secondary">
                        <i class="fas ${getCategoryIcon(product.category)}"></i>
                        ${product.category}
                    </span>
                    ${hasDiscount ? `
                        <span class="badge badge-success">
                            <i class="fas fa-percentage"></i> ${product.promotionName || 'Promo'}
                        </span>
                    ` : ''}
                </div>

                <p class="product-description">${product.description || 'No description available'}</p>

                <!-- Action Buttons -->
                <div class="product-actions">
                    ${isClient ? `
                        ${product.stock > 0 ? `
                            <button class="btn btn-primary btn-sm" onclick="addToCart('${product._id}')">
                                <i class="fas fa-cart-plus"></i> Add to Cart
                            </button>
                        ` : `
                            <button class="btn btn-secondary btn-sm" disabled>
                                <i class="fas fa-times-circle"></i> Out of Stock
                            </button>
                        `}
                        <button class="btn btn-outline btn-sm" onclick="viewProductDetails('${product._id}')">
                            <i class="fas fa-info-circle"></i> Details
                        </button>
                        ${!isWishlistView ? `
                            <button class="btn btn-outline btn-sm" onclick="addToCompare('${product._id}')">
                                <i class="fas fa-balance-scale"></i>
                            </button>
                        ` : `
                            <button class="btn btn-danger btn-sm" onclick="removeFromWishlist('${product._id}')">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                        `}
                    ` : `
                        <!-- Admin/Staff buttons -->
                        <button class="btn btn-primary btn-sm" onclick="showEditProductModal('${product._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="viewProductAnalytics('${product._id}')">
                            <i class="fas fa-chart-line"></i> Analytics
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

// ============================================
// ADVANCED SEARCH & FILTERS
// ============================================

// ============================================
// OVERVIEW SEARCH FUNCTIONALITY
// ============================================

// Handle overview search with Enter key
function handleOverviewSearch(event) {
    if (event.key === 'Enter') {
        performOverviewSearch();
    } else {
        // Show live suggestions
        const query = event.target.value.trim();
        if (query.length >= 2) {
            showOverviewSearchSuggestions(query);
        } else {
            hideOverviewSearchSuggestions();
        }
    }
}

// Perform overview search
function performOverviewSearch() {
    const query = document.getElementById('overviewSearchInput')?.value.trim();
    if (!query) {
        showToast('Please enter a search term', 'info');
        return;
    }
    
    // Switch to products tab and perform search
    switchTab('products');
    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.value = query;
        searchProducts(query);
    }
}

// Show search suggestions in overview
async function showOverviewSearchSuggestions(query) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products?search=${encodeURIComponent(query)}&limit=5`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const products = data.products || [];
        
        const container = document.getElementById('overviewSearchSuggestions');
        if (!container || products.length === 0) {
            hideOverviewSearchSuggestions();
            return;
        }
        
        container.innerHTML = `
            <div style="background: var(--background-alt); border-radius: 8px; padding: 0.5rem;">
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem; padding: 0 0.5rem;">
                    <i class="fas fa-lightbulb"></i> Quick Results:
                </div>
                ${products.map(product => `
                    <div onclick="viewProductDetails('${product._id}')" 
                         style="display: flex; gap: 1rem; padding: 0.75rem; background: var(--surface); border-radius: 6px; margin-bottom: 0.5rem; cursor: pointer; transition: all 0.2s;"
                         onmouseover="this.style.background='var(--surface-hover)'"
                         onmouseout="this.style.background='var(--surface)'">
                        <div style="width: 50px; height: 50px; background: var(--background-alt); border-radius: 6px; overflow: hidden; flex-shrink: 0;">
                            ${product.images && product.images.length > 0 ? `
                                <img src="${API_BASE_URL.replace('/api', '')}${product.images[0].url}" 
                                     style="width: 100%; height: 100%; object-fit: cover;">
                            ` : `
                                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">
                                    <i class="fas ${getCategoryIcon(product.category)}"></i>
                                </div>
                            `}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${product.name}
                            </div>
                            <div style="color: var(--primary); font-weight: 600; margin-top: 0.25rem;">
                                ₱${(product.discountedPrice || product.price).toFixed(2)}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <i class="fas fa-chevron-right" style="color: var(--text-muted);"></i>
                        </div>
                    </div>
                `).join('')}
                <button class="btn btn-sm btn-primary" onclick="performOverviewSearch()" style="width: 100%; margin-top: 0.5rem;">
                    <i class="fas fa-search"></i> View All Results
                </button>
            </div>
        `;
        
        container.style.display = 'block';
    } catch (error) {
        console.error('Error fetching search suggestions:', error);
    }
}

// Hide search suggestions
function hideOverviewSearchSuggestions() {
    const container = document.getElementById('overviewSearchSuggestions');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

// Enhanced product search with autocomplete
let searchTimeout;
function enhancedProductSearch(query) {
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(async () => {
        if (query.length < 2) {
            hideSearchSuggestions();
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/products?search=${encodeURIComponent(query)}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            if (response.ok) {
                const data = await response.json();
                showSearchSuggestions(data.products.slice(0, 5));
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }, 300);
}

// Show search suggestions
function showSearchSuggestions(products) {
    const container = document.getElementById('searchSuggestions');
    if (!container) return;
    
    if (products.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="search-suggestion-item" onclick="viewProductDetails('${product._id}'); hideSearchSuggestions();">
            <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem;">
                <div style="width: 50px; height: 50px; background: var(--background-alt); border-radius: 8px; overflow: hidden; flex-shrink: 0;">
                    ${product.images && product.images.length > 0 ? `
                        <img src="${API_BASE_URL.replace('/api', '')}${product.images[0].url}" 
                             style="width: 100%; height: 100%; object-fit: cover;">
                    ` : `
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">
                            <i class="fas ${getCategoryIcon(product.category)}"></i>
                        </div>
                    `}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600;">${product.name}</div>
                    <div style="color: var(--primary); font-weight: 600; font-size: 0.9rem;">
                        ₱${(product.discountedPrice || product.price).toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    container.style.display = 'block';
}

// Hide search suggestions
function hideSearchSuggestions() {
    const container = document.getElementById('searchSuggestions');
    if (container) {
        setTimeout(() => {
            container.style.display = 'none';
        }, 200);
    }
}

// ============================================
// STOCK NOTIFICATIONS
// ============================================

// Request stock notification
async function requestStockNotification(productId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Please login to receive stock notifications', 'warning');
            return;
        }
        
        // Store notification request locally (backend implementation needed)
        const notifications = JSON.parse(localStorage.getItem('stockNotifications') || '[]');
        if (!notifications.includes(productId)) {
            notifications.push(productId);
            localStorage.setItem('stockNotifications', JSON.stringify(notifications));
            showToast('You will be notified when this product is back in stock', 'success');
        } else {
            showToast('You are already subscribed to notifications for this product', 'info');
        }
        
    } catch (error) {
        console.error('Stock notification error:', error);
        showToast('Failed to set up stock notification', 'error');
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize shopping features on page load
function initializeClientShopping() {
    // Update badges
    updateCartBadge();
    updateWishlistBadge();
    updateCompareButton();
    
    // Render recently viewed
    renderRecentlyViewed();
    
    // Setup event listeners
    setupShoppingEventListeners();
    
    console.log('✅ Client shopping features initialized');
}

// Setup event listeners
function setupShoppingEventListeners() {
    // Checkout form
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
    }
    
    // Payment proof file input
    const paymentProofInput = document.getElementById('paymentProofInput');
    if (paymentProofInput) {
        paymentProofInput.addEventListener('change', function() {
            previewPaymentProof(this);
        });
    }
    
    // Search input with autocomplete
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            enhancedProductSearch(e.target.value);
        });
        
        searchInput.addEventListener('blur', () => {
            hideSearchSuggestions();
        });
    }
    
    // Click outside to close modals
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.remove();
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeClientShopping);
} else {
    initializeClientShopping();
}
