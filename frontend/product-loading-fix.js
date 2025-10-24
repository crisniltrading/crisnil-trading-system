// Fix for product loading issues in restock modal
// This ensures products load immediately without delay

// Enhanced product loading with immediate display
async function loadProductsForRestockImmediate(selectedProductId) {
    const select = document.getElementById('restockProductSelect');
    if (!select) {
        console.error('Restock product select not found');
        return;
    }

    // Show loading state
    select.innerHTML = '<option value="">Loading products...</option>';
    select.disabled = true;

    try {
        const token = localStorage.getItem('token');
        
        // Fetch products immediately
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const products = result.products || result.data || [];

        // If no products, show message
        if (products.length === 0) {
            select.innerHTML = '<option value="">No products available</option>';
            select.disabled = false;
            return;
        }

        // Filter for low stock products (optional - can show all)
        const lowStock = products.filter(p => {
            const minStock = p.minStock || 10;
            return p.stock <= minStock * 2; // Show products at or below 2x minimum
        });

        // If showing only low stock and none found, show all products instead
        const productsToShow = lowStock.length > 0 ? lowStock : products;

        // Build options HTML
        const optionsHTML = productsToShow.map(p => {
            const stockStatus = p.stock <= (p.minStock || 10) ? '🔴 CRITICAL' : 
                                p.stock <= (p.minStock || 10) * 1.5 ? '🟡 LOW' : '🟢 OK';
            
            return `
                <option value="${p._id}" 
                        data-product='${JSON.stringify({ 
                            stock: p.stock, 
                            minStock: p.minStock || 10, 
                            category: p.category || 'seafood',
                            price: p.price || 50,
                            name: p.name
                        })}'>
                    ${p.name} - Stock: ${p.stock} ${p.unit || 'units'} ${stockStatus}
                </option>
            `;
        }).join('');

        // Update select with products
        select.innerHTML = '<option value="">Select a product...</option>' + optionsHTML;
        select.disabled = false;

        // If a product was pre-selected, select it
        if (selectedProductId) {
            select.value = selectedProductId;
            // Trigger change event to load suppliers
            const event = new Event('change', { bubbles: true });
            select.dispatchEvent(event);
        }

        console.log(`✅ Loaded ${productsToShow.length} products for restock`);

    } catch (error) {
        console.error('Error loading products for restock:', error);
        select.innerHTML = '<option value="">Error loading products - Click to retry</option>';
        select.disabled = false;
        
        // Add retry functionality
        select.addEventListener('click', function retryLoad() {
            select.removeEventListener('click', retryLoad);
            loadProductsForRestockImmediate(selectedProductId);
        }, { once: true });
    }
}

// Enhanced supplier list update with manual supplier option
function updateSupplierListEnhanced(productId) {
    const select = document.getElementById('restockProductSelect');
    const supplierCards = document.getElementById('supplierCards');
    const productInfo = document.getElementById('productInfoCard');

    if (!productId) {
        productInfo.style.display = 'none';
        supplierCards.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>Select a product to see available suppliers</p>
            </div>
        `;
        return;
    }

    // Get product details
    const option = select.querySelector(`option[value="${productId}"]`);
    if (!option) return;

    const productData = JSON.parse(option.dataset.product || '{}');
    const category = productData.category || 'seafood';
    const currentStock = productData.stock || 0;
    const minStock = productData.minStock || 10;
    const productPrice = productData.price || 50;

    // Calculate suggested quantity and stock status
    const suggested = Math.max(50, minStock * 5);
    const stockPercentage = (currentStock / minStock) * 100;
    let stockStatus = 'Good';
    let stockBadgeClass = 'badge-success';

    if (stockPercentage <= 25) {
        stockStatus = 'Critical';
        stockBadgeClass = 'badge-danger';
    } else if (stockPercentage <= 50) {
        stockStatus = 'Low';
        stockBadgeClass = 'badge-warning';
    } else if (stockPercentage <= 100) {
        stockStatus = 'Fair';
        stockBadgeClass = 'badge-info';
    }

    // Show product info
    productInfo.style.display = 'block';
    document.getElementById('currentStock').textContent = currentStock;
    document.getElementById('minStock').textContent = minStock;
    document.getElementById('suggestedQty').textContent = suggested;
    document.getElementById('recommendedQty').textContent = suggested;
    document.getElementById('orderQuantity').value = suggested;
    document.getElementById('stockStatusBadge').textContent = stockStatus;
    document.getElementById('stockStatusBadge').className = `badge ${stockBadgeClass}`;

    // Get suppliers for category
    const suppliers = getSuppliersForCategory(category);

    // Create supplier cards with manual entry option
    supplierCards.innerHTML = `
        <!-- Manual Supplier Entry Option -->
        <div class="supplier-card manual-supplier" onclick="selectSupplier(this)" style="
            border: 2px dashed var(--primary);
            border-radius: 0.75rem;
            padding: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            background: var(--background-alt);
            text-align: center;
        ">
            <div style="padding: 1rem;">
                <i class="fas fa-plus-circle" style="font-size: 2rem; color: var(--primary); margin-bottom: 0.5rem;"></i>
                <h4 style="margin: 0 0 0.5rem 0; color: var(--primary);">Add Custom Supplier</h4>
                <p style="margin: 0; font-size: 0.875rem; color: var(--text-muted);">
                    Enter supplier details manually
                </p>
            </div>
            <input type="radio" name="selectedSupplier" value="manual" style="display: none;">
        </div>

        ${suppliers.map((supplier, index) => {
            const isRecommended = index === 0;
            const estimatedCost = suggested * supplier.pricePerUnit;
            
            return `
                <div class="supplier-card" data-supplier='${JSON.stringify(supplier)}' onclick="selectSupplier(this)" style="
                    border: 2px solid ${isRecommended ? 'var(--success)' : 'var(--border)'};
                    border-radius: 0.75rem;
                    padding: 1rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: ${isRecommended ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))' : 'var(--background-alt)'};
                    position: relative;
                ">
                    ${isRecommended ? `
                        <div style="position: absolute; top: -8px; right: 1rem; background: var(--success); color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: bold;">
                            RECOMMENDED
                        </div>
                    ` : ''}
                    
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                        <div>
                            <h4 style="margin: 0 0 0.25rem 0; color: var(--text);">${supplier.name}</h4>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="color: var(--warning); font-weight: bold;">
                                    ${'★'.repeat(Math.floor(supplier.rating))}${'☆'.repeat(5 - Math.floor(supplier.rating))}
                                </span>
                                <span style="font-weight: bold; color: var(--text);">${supplier.rating}</span>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Delivery</div>
                            <div style="font-weight: bold; color: var(--success);">${3 + index} days</div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.875rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted);">
                            <i class="fas fa-phone"></i>
                            <span>${supplier.contact}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted);">
                            <i class="fas fa-envelope"></i>
                            <span>${supplier.email}</span>
                        </div>
                    </div>
                    
                    <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.875rem; color: var(--text-muted);">Est. Cost (${suggested} units @ ₱${supplier.pricePerUnit}/unit):</span>
                            <span style="font-weight: bold; color: var(--success);">₱${estimatedCost.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <input type="radio" name="selectedSupplier" value='${JSON.stringify(supplier)}' style="display: none;" ${isRecommended ? 'checked' : ''}>
                </div>
            `;
        }).join('')}

        <!-- Manage Suppliers Button -->
        <div style="text-align: center; padding: 1rem;">
            <button type="button" class="btn btn-secondary" onclick="openSupplierManagement()">
                <i class="fas fa-cog"></i> Manage Suppliers
            </button>
        </div>
    `;

    // Auto-select first (recommended) supplier if available
    if (suppliers.length > 0) {
        const firstCard = supplierCards.querySelector('.supplier-card:not(.manual-supplier)');
        if (firstCard) {
            firstCard.style.borderColor = 'var(--success)';
            firstCard.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))';
            updateEstimatedCostEnhanced(suggested, JSON.parse(firstCard.dataset.supplier));
        }
    }
}

// Enhanced cost calculation
function updateEstimatedCostEnhanced(quantity, supplier = null) {
    const costElement = document.getElementById('estimatedCost');
    if (!costElement) return;

    let unitCost = 50; // Default
    if (supplier && supplier.pricePerUnit) {
        unitCost = supplier.pricePerUnit;
    }

    const totalCost = quantity * unitCost;
    costElement.textContent = totalCost.toLocaleString();
}

// Handle manual supplier selection
function handleManualSupplierEntry() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1002;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-user-plus"></i> Enter Supplier Details</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="manualSupplierForm">
                    <div class="form-group">
                        <label>Supplier Name *</label>
                        <input type="text" name="name" class="form-input" required placeholder="e.g., ABC Trading Co.">
                    </div>
                    <div class="form-group">
                        <label>Contact Number *</label>
                        <input type="tel" name="contact" class="form-input" required placeholder="+63 917 123 4567">
                    </div>
                    <div class="form-group">
                        <label>Email Address *</label>
                        <input type="email" name="email" class="form-input" required placeholder="orders@supplier.com">
                    </div>
                    <div class="form-group">
                        <label>Price Per Unit (₱)</label>
                        <input type="number" name="pricePerUnit" class="form-input" min="0" step="0.01" value="50" required>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-check"></i> Use This Supplier
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#manualSupplierForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const customSupplier = {
            name: formData.get('name'),
            contact: formData.get('contact'),
            email: formData.get('email'),
            rating: 0,
            pricePerUnit: parseFloat(formData.get('pricePerUnit')),
            isCustom: true
        };

        // Create a hidden input with the custom supplier data
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'customSupplierData';
        hiddenInput.value = JSON.stringify(customSupplier);
        document.getElementById('restockOrderForm').appendChild(hiddenInput);

        // Update the selected supplier radio
        const manualCard = document.querySelector('.manual-supplier');
        if (manualCard) {
            const radio = manualCard.querySelector('input[type="radio"]');
            radio.value = JSON.stringify(customSupplier);
            radio.checked = true;
            
            // Update card display
            manualCard.innerHTML = `
                <div style="padding: 1rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: var(--success);">
                        <i class="fas fa-check-circle"></i> ${customSupplier.name}
                    </h4>
                    <div style="font-size: 0.875rem; color: var(--text-muted);">
                        <div><i class="fas fa-phone"></i> ${customSupplier.contact}</div>
                        <div><i class="fas fa-envelope"></i> ${customSupplier.email}</div>
                        <div><i class="fas fa-money-bill"></i> ₱${customSupplier.pricePerUnit}/unit</div>
                    </div>
                </div>
                <input type="radio" name="selectedSupplier" value='${JSON.stringify(customSupplier)}' checked style="display: none;">
            `;
            manualCard.style.borderColor = 'var(--success)';
            manualCard.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))';
        }

        modal.remove();
        showToast('Custom supplier added!', 'success');
    });
}

// Export functions
window.loadProductsForRestockImmediate = loadProductsForRestockImmediate;
window.updateSupplierListEnhanced = updateSupplierListEnhanced;
window.updateEstimatedCostEnhanced = updateEstimatedCostEnhanced;
window.handleManualSupplierEntry = handleManualSupplierEntry;
