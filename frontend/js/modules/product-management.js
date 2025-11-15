// Enhanced Product Management Functions

let selectedProducts = new Set();
let currentProductFilters = {
    search: '',
    brand: '',
    category: '',
    stockStatus: '',
    priceMin: '',
    priceMax: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
};

// Load products with enhanced features
async function loadProducts(filters = {}) {
    try {
        const token = localStorage.getItem('token');
        currentProductFilters = { ...currentProductFilters, ...filters };

        const queryParams = new URLSearchParams();
        Object.keys(currentProductFilters).forEach(key => {
            if (currentProductFilters[key]) {
                queryParams.append(key, currentProductFilters[key]);
            }
        });

        const response = await fetch(`${API_BASE_URL}/products?${queryParams}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!response.ok) throw new Error('Failed to load products');

        const data = await response.json();
        renderProductsGrid(data.products);
        updateProductStats(data.products);
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Failed to load products', 'error');
    }
}

// Render products grid with enhanced UI
function renderProductsGrid(products) {
    const grid = document.getElementById('productsGrid');
    const userRole = (currentUser?.role || 'client').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'staff' || userRole === 'b2b';

    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-box-open" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <p style="color: var(--text-muted); font-size: 1.2rem;">No products found</p>
            </div>
        `;
        return;
    }

    // Use renderProductCard from client-shopping.js if available, otherwise use inline rendering
    if (typeof renderProductCard === 'function') {
        grid.innerHTML = products.map(product => renderProductCard(product, false)).join('');
    } else {
        // Fallback rendering for admin users
        grid.innerHTML = products.map(product => {
            const hasDiscount = product.discountedPrice && product.discountedPrice < product.price;
            const displayPrice = hasDiscount ? product.discountedPrice : product.price;
            const stockBadge = getStockBadge(product);
            // Get image URL - handle base64 data from database
            let imageUrl = null;
            if (product.images && product.images.length > 0) {
                imageUrl = window.ImageHelper ? window.ImageHelper.getImageUrl(product.images[0]) : null;
                
                // Fallback if ImageHelper not available
                if (!imageUrl) {
                    const img = product.images[0];
                    if (img.data && img.contentType) {
                        const dataStr = String(img.data);
                        imageUrl = dataStr.startsWith('data:') ? dataStr : `data:${img.contentType};base64,${dataStr}`;
                    }
                }
            }

            return `
                <div class="product-card interactive" data-product-id="${product._id}">
                    ${isAdmin ? `
                        <div class="product-checkbox">
                            <input type="checkbox" 
                                   onchange="toggleProductSelection('${product._id}')"
                                   ${selectedProducts.has(product._id) ? 'checked' : ''}>
                        </div>
                    ` : ''}
                    
                    <div class="product-image" style="position: relative; cursor: pointer;" onclick="viewProductDetails('${product._id}')">
                        ${imageUrl ? `
                            <img src="${imageUrl}" alt="${product.name}" 
                                 style="width: 100%; height: 100%; object-fit: cover;">
                        ` : `
                            <i class="fas ${getCategoryIcon(product.category)}"></i>
                        `}
                        ${hasDiscount ? `
                            <div class="discount-badge">
                                <i class="fas fa-tag"></i> ${product.discountPercentage}% OFF
                            </div>
                        ` : ''}
                    </div>

                    <div class="product-info">
                        <h3 class="product-name" onclick="viewProductDetails('${product._id}')" style="cursor: pointer;">${product.name}</h3>
                        ${product.brand ? `<p style="color: var(--text-muted); font-size: 0.9rem; margin: 0.25rem 0;"><i class="fas fa-tag"></i> ${product.brand}</p>` : ''}
                        
                        <div class="product-price-section">
                            ${hasDiscount ? `
                                <div class="product-price-original">₱${product.price.toFixed(2)}</div>
                                <div class="product-price">₱${displayPrice.toFixed(2)}/${product.unit}</div>
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

                        <div class="product-actions">
                            ${isAdmin ? `
                                <button class="btn btn-primary btn-sm" onclick="showEditProductModal('${product._id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="viewProductAnalytics('${product._id}')">
                                    <i class="fas fa-chart-line"></i> Analytics
                                </button>
                                ${userRole === 'admin' ? `
                                    <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product._id}', '${product.name.replace(/'/g, "\\'")}')">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                ` : ''}
                            ` : `
                                <button class="btn btn-primary btn-sm" onclick="addToCart('${product._id}')">
                                    <i class="fas fa-cart-plus"></i> Add to Cart
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="viewProductDetails('${product._id}')">
                                    <i class="fas fa-info-circle"></i> Details
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Get stock badge HTML
function getStockBadge(product) {
    const stock = product.stock || 0;
    const minStock = product.minStock || 0;

    if (stock <= 0) {
        return '<span class="badge badge-danger"><i class="fas fa-times-circle"></i> Out of Stock</span>';
    } else if (stock <= minStock) {
        return '<span class="badge badge-warning"><i class="fas fa-exclamation-triangle"></i> Low Stock</span>';
    } else {
        return '<span class="badge badge-success"><i class="fas fa-check-circle"></i> In Stock</span>';
    }
}

// Get category icon
function getCategoryIcon(category) {
    const icons = {
        chicken: 'fa-drumstick-bite',
        beef: 'fa-cow',
        pork: 'fa-bacon',
        seafood: 'fa-fish',
        vegetables: 'fa-carrot',
        dairy: 'fa-cheese',
        processed: 'fa-sausage',
        other: 'fa-box'
    };
    return icons[category] || 'fa-box';
}

// Apply product filters
function applyProductFilters() {
    const filters = {
        search: document.getElementById('productSearch')?.value || '',
        brand: document.getElementById('productBrand')?.value || '',
        category: document.getElementById('productCategory')?.value || '',
        stockStatus: document.getElementById('stockStatus')?.value || '',
        priceMin: document.getElementById('priceMin')?.value || '',
        priceMax: document.getElementById('priceMax')?.value || '',
        sortBy: document.getElementById('sortBy')?.value || 'createdAt',
        sortOrder: document.getElementById('sortOrder')?.value || 'desc'
    };
    updateFilterBadge();
    loadProducts(filters);
}

// Search products
function searchProducts(query) {
    // Show/hide clear button
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
        clearBtn.style.display = query ? 'flex' : 'none';
    }
    
    clearTimeout(window.productSearchTimeout);
    window.productSearchTimeout = setTimeout(() => {
        loadProducts({ search: query });
    }, 300);
}

// Toggle product selection for bulk operations
function toggleProductSelection(productId) {
    if (selectedProducts.has(productId)) {
        selectedProducts.delete(productId);
    } else {
        selectedProducts.add(productId);
    }
    updateBulkActionsUI();
}

// Select all products
function selectAllProducts() {
    const checkboxes = document.querySelectorAll('.product-card input[type="checkbox"]');
    checkboxes.forEach(cb => {
        const productId = cb.closest('.product-card').dataset.productId;
        selectedProducts.add(productId);
        cb.checked = true;
    });
    updateBulkActionsUI();
}

// Deselect all products
function deselectAllProducts() {
    selectedProducts.clear();
    document.querySelectorAll('.product-card input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    updateBulkActionsUI();
}

// Update bulk actions UI
function updateBulkActionsUI() {
    const bulkActionsBar = document.getElementById('bulkActionsBar');
    const selectedCount = document.getElementById('selectedCount');
    
    if (bulkActionsBar && selectedCount) {
        if (selectedProducts.size > 0) {
            bulkActionsBar.style.display = 'flex';
            selectedCount.textContent = selectedProducts.size;
        } else {
            bulkActionsBar.style.display = 'none';
        }
    }
}

// Bulk update products
async function bulkUpdateProducts() {
    if (selectedProducts.size === 0) {
        showToast('No products selected', 'warning');
        return;
    }

    const updates = {};
    const updateType = prompt('What would you like to update?\n1. Category\n2. Active Status\n3. Discount\nEnter number:');

    if (updateType === '1') {
        const category = prompt('Enter new category (chicken/beef/pork/seafood/vegetables/dairy/other):');
        if (category) updates.category = category.toLowerCase();
    } else if (updateType === '2') {
        const isActive = confirm('Set products as active?');
        updates.isActive = isActive;
    } else if (updateType === '3') {
        const discount = prompt('Enter bulk discount percentage (0-100):');
        if (discount) {
            updates['pricing.bulkDiscount'] = parseFloat(discount) / 100;
        }
    } else {
        return;
    }

    if (Object.keys(updates).length === 0) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products/bulk/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                productIds: Array.from(selectedProducts),
                updates
            })
        });

        if (!response.ok) throw new Error('Bulk update failed');

        const data = await response.json();
        showToast(data.message, 'success');
        deselectAllProducts();
        loadProducts();
    } catch (error) {
        console.error('Bulk update error:', error);
        showToast('Failed to update products', 'error');
    }
}

// Bulk delete products
async function bulkDeleteProducts() {
    if (selectedProducts.size === 0) {
        showToast('No products selected', 'warning');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedProducts.size} products? This action cannot be undone.`)) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products/bulk/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                productIds: Array.from(selectedProducts)
            })
        });

        if (!response.ok) throw new Error('Bulk delete failed');

        const data = await response.json();
        showToast(data.message, 'success');
        deselectAllProducts();
        loadProducts();
    } catch (error) {
        console.error('Bulk delete error:', error);
        showToast('Failed to delete products', 'error');
    }
}

// ========================================
// STANDALONE IMAGE UPLOAD MODAL (REMOVED)
// Image upload is now integrated into Add/Edit Product forms
// These functions are kept commented for reference
// ========================================

/*
// Show image upload modal
function showImageUploadModal(productId) {
    // This function is no longer used
    // Image upload is now in the Add/Edit Product forms
    console.log('⚠️ Standalone image upload is deprecated. Use Edit Product form instead.');
    showEditProductModal(productId);
}
*/

// Update product stats
function updateProductStats(products) {
    const statsContainer = document.getElementById('productStatsBar');
    if (!statsContainer) return;

    const totalProducts = products.length;
    const inStock = products.filter(p => (p.stock || 0) > (p.minStock || 0)).length;
    const lowStock = products.filter(p => p.isLowStock).length;
    const outOfStock = products.filter(p => (p.stock || 0) <= 0).length;
    
    // Check user role for appropriate labels
    const userRole = (currentUser?.role || 'client').toLowerCase();
    const isClient = userRole === 'client';

    statsContainer.innerHTML = `
        <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; padding: 1rem; background: var(--card-bg); border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-box" style="color: var(--primary-color);"></i>
                <span><strong>${totalProducts}</strong> ${isClient ? 'Products' : 'Total'}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
                <span><strong>${inStock}</strong> ${isClient ? 'Available' : 'In Stock'}</span>
            </div>
            ${!isClient ? `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-exclamation-triangle" style="color: var(--warning-color);"></i>
                    <span><strong>${lowStock}</strong> Low Stock</span>
                </div>
            ` : ''}
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-times-circle" style="color: var(--danger-color);"></i>
                <span><strong>${outOfStock}</strong> ${isClient ? 'Unavailable' : 'Out of Stock'}</span>
            </div>
        </div>
    `;
}

// Show edit product modal (enhanced)
async function showEditProductModal(productId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load product');

        const data = await response.json();
        const product = data.product;

        // Populate edit form
        document.getElementById('editProductId').value = product._id;
        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductDescription').value = product.description || '';
        document.getElementById('editProductBrand').value = product.brand || '';
        document.getElementById('editProductCategory').value = product.category;
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductUnit').value = product.unit;
        document.getElementById('editProductStock').value = product.stock;
        document.getElementById('editProductMinStock').value = product.minStock;

        // Display current images
        const currentImagesSection = document.getElementById('editProductCurrentImagesFirst');
        const imagesContainer = document.getElementById('editProductImagesContainerFirst');
        
        if (product.images && product.images.length > 0) {
            currentImagesSection.style.display = 'block';
            imagesContainer.innerHTML = product.images.map(img => {
                // Get image URL - handle base64 data
                let imgUrl = null;
                if (img.data && img.contentType) {
                    const dataStr = String(img.data);
                    imgUrl = dataStr.startsWith('data:') ? dataStr : `data:${img.contentType};base64,${dataStr}`;
                }
                return `
                <div style="position: relative; display: inline-block;">
                    ${imgUrl ? `
                        <img src="${imgUrl}" 
                             alt="${img.alt || product.name}" 
                             style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid var(--border-color);">
                    ` : `
                        <div style="width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 8px;">
                            <i class="fas fa-image" style="font-size: 2rem; color: #cbd5e1;"></i>
                        </div>
                    `}
                    <button type="button" 
                            onclick="deleteProductImageFromEdit('${product._id}', '${img._id}')"
                            style="position: absolute; top: -8px; right: -8px; background: var(--danger-color); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px;"
                            title="Delete image">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `}).join('');
        } else {
            currentImagesSection.style.display = 'none';
        }

        // Clear new image input and preview
        const imageInput = document.getElementById('editProductImageFirst');
        const imagePreview = document.getElementById('editProductImagePreviewFirst');
        if (imageInput) imageInput.value = '';
        if (imagePreview) imagePreview.style.display = 'none';

        document.getElementById('editProductModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading product:', error);
        showToast('Failed to load product details', 'error');
    }
}

// View product analytics
async function viewProductAnalytics(productId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products/${productId}/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load analytics');

        const data = await response.json();
        showProductAnalyticsModal(data.analytics);
    } catch (error) {
        console.error('Error loading analytics:', error);
        showToast('Failed to load product analytics', 'error');
    }
}

// Show product analytics modal
function showProductAnalyticsModal(analytics) {
    // Determine trend icon and color
    const trendIcons = {
        increasing: { icon: 'fa-arrow-trend-up', color: '#10b981' },
        decreasing: { icon: 'fa-arrow-trend-down', color: '#ef4444' },
        stable: { icon: 'fa-minus', color: '#6b7280' }
    };
    const trendInfo = trendIcons[analytics.trends.salesTrend] || trendIcons.stable;

    // Determine demand color
    const demandColors = {
        high: '#10b981',
        medium: '#f59e0b',
        low: '#6b7280'
    };
    const demandColor = demandColors[analytics.trends.seasonalDemand] || demandColors.low;

    const modalHTML = `
        <div id="productAnalyticsModal" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h3><i class="fas fa-chart-line"></i> Product Analytics: ${analytics.product.name}</h3>
                    <button class="close-btn" onclick="closeProductAnalyticsModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: var(--card-bg); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <p style="margin: 0; color: var(--text-muted);">
                            <i class="fas fa-calendar"></i> Analysis Period: <strong>${analytics.sales.period}</strong>
                        </p>
                    </div>

                    <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-shopping-cart"></i></div>
                            <div class="stat-value">${analytics.sales.totalSold || 0}</div>
                            <div class="stat-label">Units Sold</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-peso-sign"></i></div>
                            <div class="stat-value">₱${(analytics.sales.totalRevenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div class="stat-label">Total Revenue</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-receipt"></i></div>
                            <div class="stat-value">${analytics.sales.orderCount || 0}</div>
                            <div class="stat-label">Total Orders</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-chart-bar"></i></div>
                            <div class="stat-value">${analytics.sales.averageOrderSize || 0}</div>
                            <div class="stat-label">Avg Order Size</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-calendar-day"></i></div>
                            <div class="stat-value">${analytics.sales.avgDailySales || 0}</div>
                            <div class="stat-label">Avg Daily Sales</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-box"></i></div>
                            <div class="stat-value">${analytics.product.currentStock || 0}</div>
                            <div class="stat-label">Current Stock</div>
                        </div>
                    </div>

                    <div style="margin-top: 2rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
                        <div style="background: var(--card-bg); padding: 1.5rem; border-radius: 8px;">
                            <h4 style="margin-top: 0; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas ${trendInfo.icon}" style="color: ${trendInfo.color};"></i>
                                Sales Trend
                            </h4>
                            <p style="font-size: 1.5rem; font-weight: bold; color: ${trendInfo.color}; margin: 0.5rem 0;">
                                ${analytics.trends.salesTrend.charAt(0).toUpperCase() + analytics.trends.salesTrend.slice(1)}
                            </p>
                            <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0;">
                                First half: ${analytics.trends.firstHalfSales || 0} units<br>
                                Second half: ${analytics.trends.secondHalfSales || 0} units
                            </p>
                        </div>

                        <div style="background: var(--card-bg); padding: 1.5rem; border-radius: 8px;">
                            <h4 style="margin-top: 0; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-trophy" style="color: #f59e0b;"></i>
                                Popularity Rank
                            </h4>
                            <p style="font-size: 1.5rem; font-weight: bold; color: var(--primary-color); margin: 0.5rem 0;">
                                #${analytics.trends.popularityRank || 'N/A'}
                            </p>
                            <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0;">
                                Out of ${analytics.trends.totalProducts || 0} products
                            </p>
                        </div>

                        <div style="background: var(--card-bg); padding: 1.5rem; border-radius: 8px;">
                            <h4 style="margin-top: 0; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-fire" style="color: ${demandColor};"></i>
                                Seasonal Demand
                            </h4>
                            <p style="font-size: 1.5rem; font-weight: bold; color: ${demandColor}; margin: 0.5rem 0;">
                                ${analytics.trends.seasonalDemand.charAt(0).toUpperCase() + analytics.trends.seasonalDemand.slice(1)}
                            </p>
                            <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0;">
                                Based on sales velocity
                            </p>
                        </div>
                    </div>

                    ${analytics.sales.totalSold === 0 ? `
                        <div style="margin-top: 2rem; padding: 1.5rem; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                            <p style="margin: 0; color: #92400e;">
                                <i class="fas fa-info-circle"></i> <strong>No sales data available</strong> for this period. 
                                This product hasn't been ordered yet or has no completed orders in the last ${analytics.sales.period}.
                            </p>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeProductAnalyticsModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('productAnalyticsModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close product analytics modal
function closeProductAnalyticsModal() {
    const modal = document.getElementById('productAnalyticsModal');
    if (modal) modal.remove();
}


// Close edit product modal
function closeEditProductModal() {
    const modal = document.getElementById('editProductModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('editProductForm').reset();
    }
}

// Handle edit product form submission
async function handleEditProduct(e) {
    e.preventDefault();
    
    const productId = document.getElementById('editProductId').value;
    const formData = new FormData(e.target);
    
    const productData = {
        name: formData.get('name'),
        description: formData.get('description'),
        brand: formData.get('brand'),
        category: formData.get('category'),
        price: parseFloat(formData.get('price')),
        unit: formData.get('unit'),
        stock: parseInt(formData.get('stock')),
        minStock: parseInt(formData.get('minStock'))
    };

    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        // Update product details
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) throw new Error('Failed to update product');

        const data = await response.json();
        
        // Check if there's a new image to upload
        const imageFile = document.getElementById('editProductImageFirst').files[0];
        if (imageFile) {
            console.log('📤 Uploading new image for product:', productId);
            const imageFormData = new FormData();
            imageFormData.append('image', imageFile);
            imageFormData.append('alt', productData.name);
            
            const imageResponse = await fetch(`${API_BASE_URL}/products/${productId}/images`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: imageFormData
            });
            
            if (imageResponse.ok) {
                console.log('✅ Image uploaded successfully');
            } else {
                console.warn('⚠️ Image upload failed, but product was updated');
            }
        }
        
        hideLoading();
        showToast(data.message || 'Product updated successfully!', 'success');
        closeEditProductModal();
        loadProducts();
        if (typeof loadInventory === 'function') {
            loadInventory();
        }
    } catch (error) {
        console.error('Update product error:', error);
        hideLoading();
        showToast('Failed to update product', 'error');
    }
}

// View product details (for clients)
async function viewProductDetails(productId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!response.ok) throw new Error('Failed to load product');

        const data = await response.json();
        showProductDetailsModal(data.product);
    } catch (error) {
        console.error('Error loading product:', error);
        showToast('Failed to load product details', 'error');
    }
}

// Show product details modal
function showProductDetailsModal(product) {
    const hasDiscount = product.discountedPrice && product.discountedPrice < product.price;
    const displayPrice = hasDiscount ? product.discountedPrice : product.price;
    // Get image URL - handle base64 data from database
    let imageUrl = null;
    if (product.images && product.images.length > 0) {
        imageUrl = window.ImageHelper ? window.ImageHelper.getImageUrl(product.images[0]) : null;
        
        // Fallback if ImageHelper not available
        if (!imageUrl) {
            const img = product.images[0];
            if (img.data && img.contentType) {
                const dataStr = String(img.data);
                imageUrl = dataStr.startsWith('data:') ? dataStr : `data:${img.contentType};base64,${dataStr}`;
            }
        }
    }

    const modalHTML = `
        <div id="productDetailsModal" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-info-circle"></i> Product Details</h3>
                    <button class="close-btn" onclick="closeProductDetailsModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${imageUrl ? `
                        <div style="width: 100%; height: 300px; margin-bottom: 1.5rem; border-radius: 8px; overflow: hidden;">
                            <img src="${imageUrl}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    ` : ''}
                    
                    <h2 style="margin-bottom: 1rem;">${product.name}</h2>
                    ${product.brand ? `<p style="color: var(--text-muted); font-size: 1.1rem; margin-bottom: 1rem;"><i class="fas fa-tag"></i> Brand: <strong>${product.brand}</strong></p>` : ''}
                    
                    <div style="margin-bottom: 1.5rem;">
                        ${hasDiscount ? `
                            <div style="text-decoration: line-through; color: var(--text-muted); font-size: 1.2rem;">
                                ₱${product.price.toFixed(2)}/${product.unit}
                            </div>
                            <div style="font-size: 2rem; font-weight: bold; color: var(--success-color);">
                                ₱${displayPrice.toFixed(2)}/${product.unit}
                            </div>
                            <div class="badge badge-success" style="margin-top: 0.5rem;">
                                <i class="fas fa-tag"></i> ${product.discountPercentage}% OFF - ${product.promotionName}
                            </div>
                        ` : `
                            <div style="font-size: 2rem; font-weight: bold; color: var(--primary-color);">
                                ₱${displayPrice.toFixed(2)}/${product.unit}
                            </div>
                        `}
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <h4 style="margin-bottom: 0.5rem;">Description</h4>
                        <p style="color: var(--text-muted);">${product.description || 'No description available'}</p>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                        <div>
                            <strong>Category:</strong>
                            <div style="margin-top: 0.25rem;">
                                <span class="badge badge-secondary">
                                    <i class="fas ${getCategoryIcon(product.category)}"></i>
                                    ${product.category}
                                </span>
                            </div>
                        </div>
                        <div>
                            <strong>Stock Status:</strong>
                            <div style="margin-top: 0.25rem;">
                                ${getStockBadge(product)}
                            </div>
                        </div>
                    </div>

                    ${product.storage ? `
                        <div style="margin-bottom: 1.5rem;">
                            <h4 style="margin-bottom: 0.5rem;">Storage Information</h4>
                            <p style="color: var(--text-muted);">
                                <i class="fas fa-thermometer-half"></i> Temperature: ${product.storage.temperature}°C<br>
                                <i class="fas fa-calendar"></i> Shelf Life: ${product.storage.shelfLife} days
                            </p>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeProductDetailsModal()">Close</button>
                    <button class="btn btn-primary" onclick="addToCart('${product._id}'); closeProductDetailsModal();">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('productDetailsModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close product details modal
function closeProductDetailsModal() {
    const modal = document.getElementById('productDetailsModal');
    if (modal) modal.remove();
}

// Initialize product management on page load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        // Load products when products section is shown
        const productsTab = document.getElementById('tab-products');
        if (productsTab) {
            productsTab.addEventListener('click', function() {
                setTimeout(() => loadProducts(), 100);
            });
        }
    });
}


// ========================================
// ENHANCED ADD/EDIT PRODUCT WITH IMAGES
// ========================================

// Setup image preview for add product form
function setupAddProductImagePreview() {
    const fileInput = document.getElementById('productImageFirst');
    const preview = document.getElementById('addProductImagePreviewFirst');
    const previewImg = document.getElementById('addProductImagePreviewImgFirst');
    
    if (fileInput && preview && previewImg) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                if (!validTypes.includes(file.type)) {
                    showToast('Please select a valid image file (JPG, PNG, GIF, WEBP)', 'error');
                    fileInput.value = '';
                    preview.style.display = 'none';
                    return;
                }
                
                // Validate file size (5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showToast('Image must be less than 5MB', 'error');
                    fileInput.value = '';
                    preview.style.display = 'none';
                    return;
                }
                
                // Show preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                preview.style.display = 'none';
            }
        });
    }
}

// Setup image preview for edit product form
function setupEditProductImagePreview() {
    const fileInput = document.getElementById('editProductImageFirst');
    const preview = document.getElementById('editProductImagePreviewFirst');
    const previewImg = document.getElementById('editProductImagePreviewImgFirst');
    
    if (fileInput && preview && previewImg) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                if (!validTypes.includes(file.type)) {
                    showToast('Please select a valid image file (JPG, PNG, GIF, WEBP)', 'error');
                    fileInput.value = '';
                    preview.style.display = 'none';
                    return;
                }
                
                // Validate file size (5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showToast('Image must be less than 5MB', 'error');
                    fileInput.value = '';
                    preview.style.display = 'none';
                    return;
                }
                
                // Show preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                preview.style.display = 'none';
            }
        });
    }
}

// Delete product image
async function deleteProductImageFromEdit(productId, imageId) {
    if (!confirm('Are you sure you want to delete this image?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products/${productId}/images/${imageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete image');
        }
        
        showToast('Image deleted successfully', 'success');
        
        // Reload the edit modal to show updated images
        showEditProductModal(productId);
    } catch (error) {
        console.error('Error deleting image:', error);
        showToast('Failed to delete image', 'error');
    }
}

// Initialize image preview handlers when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setupAddProductImagePreview();
        setupEditProductImagePreview();
    });
} else {
    setupAddProductImagePreview();
    setupEditProductImagePreview();
}


// ========================================
// DELETE PRODUCT FUNCTIONALITY
// ========================================

// Delete product (Admin only, with confirmation and audit log)
async function deleteProduct(productId, productName) {
    // Double confirmation for safety
    const confirmFirst = confirm(`⚠️ WARNING: Delete Product?\n\nYou are about to PERMANENTLY delete:\n"${productName}"\n\nThis action CANNOT be undone!\n\nClick OK to continue, or Cancel to abort.`);
    
    if (!confirmFirst) {
        console.log('❌ Delete cancelled by user');
        return;
    }
    
    // Second confirmation with product name verification
    const confirmSecond = confirm(`⚠️ FINAL CONFIRMATION\n\nType the product name to confirm deletion:\n"${productName}"\n\nAre you absolutely sure you want to delete this product?\n\nThis will:\n✓ Remove product from database\n✓ Log deletion in audit history\n✓ Cannot be recovered\n\nClick OK to DELETE PERMANENTLY`);
    
    if (!confirmSecond) {
        console.log('❌ Delete cancelled by user (second confirmation)');
        return;
    }
    
    try {
        showLoading();
        console.log('🗑️  Deleting product:', productId, productName);
        
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('Not authenticated');
        }
        
        // Call delete API endpoint
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete product');
        }
        
        hideLoading();
        console.log('✅ Product deleted successfully');
        showToast(`Product "${productName}" has been permanently deleted`, 'success');
        
        // Refresh product list
        await loadProducts();
        
        // Refresh inventory if function exists
        if (typeof loadInventory === 'function') {
            await loadInventory();
        }
        
    } catch (error) {
        console.error('❌ Delete product error:', error);
        hideLoading();
        showToast(error.message || 'Failed to delete product', 'error');
    }
}


// Toggle filters panel
function toggleFilters() {
    const panel = document.getElementById('filtersPanel');
    const btn = document.getElementById('toggleFiltersBtn');
    
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-sliders-h"></i> Hide Filters <span class="filter-badge" id="filterBadge" style="display: none;">0</span>';
    } else {
        panel.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-sliders-h"></i> Filters <span class="filter-badge" id="filterBadge" style="display: none;">0</span>';
    }
}

// Clear search
function clearSearch() {
    document.getElementById('productSearch').value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    searchProducts('');
}

// Update filter badge count
function updateFilterBadge() {
    const filters = currentProductFilters;
    let count = 0;
    
    if (filters.brand) count++;
    if (filters.category) count++;
    if (filters.stockStatus) count++;
    if (filters.priceMin) count++;
    if (filters.priceMax) count++;
    
    const badge = document.getElementById('filterBadge');
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// Reset all product filters
function resetProductFilters() {
    document.getElementById('productSearch').value = '';
    document.getElementById('productBrand').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('stockStatus').value = '';
    document.getElementById('priceMin').value = '';
    document.getElementById('priceMax').value = '';
    document.getElementById('sortBy').value = 'createdAt';
    document.getElementById('sortOrder').value = 'desc';
    
    currentProductFilters = {
        search: '',
        brand: '',
        category: '',
        stockStatus: '',
        priceMin: '',
        priceMax: '',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    };
    
    updateFilterBadge();
    loadProducts();
}

// Export products to CSV
async function exportProductsCSV() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products?limit=1000`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch products');
        
        const data = await response.json();
        const products = data.products;
        
        // Create CSV content
        const headers = ['ID', 'Name', 'Brand', 'Category', 'Price', 'Unit', 'Stock', 'Min Stock', 'Status'];
        const rows = products.map(p => [
            p.productId || p._id,
            p.name,
            p.brand || '',
            p.category,
            p.price,
            p.unit,
            p.stock,
            p.minStock,
            p.isActive ? 'Active' : 'Inactive'
        ]);
        
        let csvContent = headers.join(',') + '\n';
        rows.forEach(row => {
            csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
        });
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showToast('Products exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export products', 'error');
    }
}
