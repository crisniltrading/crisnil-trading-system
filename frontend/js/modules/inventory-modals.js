// ============================================================================
// INVENTORY RESTOCK MODALS
// ============================================================================

// Open Restock with Batch Modal
function openRestockWithBatchModal() {
    const modal = document.createElement('div');
    modal.id = 'restockBatchModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3><i class="fas fa-boxes"></i> Restock with Batch</h3>
                <button class="close-btn" onclick="closeRestockBatchModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="restockBatchForm" onsubmit="handleRestockBatch(event)">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-box"></i> Select Product *
                        </label>
                        <select name="productId" class="form-input" required id="restockProductSelect">
                            <option value="">Loading products...</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-hashtag"></i> Batch Number *
                        </label>
                        <input type="text" name="batchNumber" class="form-input" 
                               placeholder="e.g., BATCH-2024-001" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-calculator"></i> Quantity *
                        </label>
                        <input type="number" name="quantity" class="form-input" 
                               placeholder="Enter quantity to add" min="1" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-calendar-alt"></i> Expiry Date *
                        </label>
                        <input type="date" name="expiryDate" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-sticky-note"></i> Notes (Optional)
                        </label>
                        <textarea name="notes" class="form-input" rows="2" 
                                  placeholder="Additional notes about this batch"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-check"></i> Add Batch
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="closeRestockBatchModal()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    loadProductsForSelect('restockProductSelect');
}

// Close Restock Batch Modal
function closeRestockBatchModal() {
    const modal = document.getElementById('restockBatchModal');
    if (modal) modal.remove();
}

// Handle Restock Batch Submit
async function handleRestockBatch(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const batchData = {
        productId: formData.get('productId'),
        batchNumber: formData.get('batchNumber'),
        quantity: parseInt(formData.get('quantity')),
        expiryDate: formData.get('expiryDate'),
        notes: formData.get('notes')
    };
    
    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.API_BASE_URL}/expiry/batches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(batchData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to add batch');
        }
        
        hideLoading();
        showToast('Batch added successfully!', 'success');
        closeRestockBatchModal();
        loadInventoryData();
    } catch (error) {
        hideLoading();
        console.error('Error adding batch:', error);
        showToast(error.message, 'error');
    }
}

// Open Add Stock Modal
function openAddStockModal() {
    const modal = document.createElement('div');
    modal.id = 'addStockModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-plus"></i> Add Stock</h3>
                <button class="close-btn" onclick="closeAddStockModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="addStockForm" onsubmit="handleAddStock(event)">
                    <div class="form-group">
                        <label class="form-label">Select Product *</label>
                        <select name="productId" class="form-input" required id="addStockProductSelect">
                            <option value="">Loading products...</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Quantity to Add *</label>
                        <input type="number" name="quantity" class="form-input" 
                               placeholder="Enter quantity" min="1" required>
                    </div>
                    
                    <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-check"></i> Add Stock
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="closeAddStockModal()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    loadProductsForSelect('addStockProductSelect');
}

function closeAddStockModal() {
    const modal = document.getElementById('addStockModal');
    if (modal) modal.remove();
}

// Open Remove Stock Modal
function openRemoveStockModal() {
    const modal = document.createElement('div');
    modal.id = 'removeStockModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-minus"></i> Remove Stock</h3>
                <button class="close-btn" onclick="closeRemoveStockModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="removeStockForm" onsubmit="handleRemoveStock(event)">
                    <div class="form-group">
                        <label class="form-label">Select Product *</label>
                        <select name="productId" class="form-input" required id="removeStockProductSelect">
                            <option value="">Loading products...</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Quantity to Remove *</label>
                        <input type="number" name="quantity" class="form-input" 
                               placeholder="Enter quantity" min="1" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Reason *</label>
                        <select name="reason" class="form-input" required>
                            <option value="">Select reason</option>
                            <option value="damaged">Damaged</option>
                            <option value="expired">Expired</option>
                            <option value="returned">Returned</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                        <button type="submit" class="btn btn-error" style="flex: 1;">
                            <i class="fas fa-check"></i> Remove Stock
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="closeRemoveStockModal()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    loadProductsForSelect('removeStockProductSelect');
}

function closeRemoveStockModal() {
    const modal = document.getElementById('removeStockModal');
    if (modal) modal.remove();
}

// Load products for select dropdown
async function loadProductsForSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error('Select element not found:', selectId);
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.API_BASE_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Products loaded:', data);
        
        if (data.products && data.products.length > 0) {
            select.innerHTML = '<option value="">Select a product</option>' +
                data.products.map(p => 
                    `<option value="${p._id}">${p.name} (Stock: ${p.stock})</option>`
                ).join('');
        } else {
            select.innerHTML = '<option value="">No products available</option>';
        }
    } catch (error) {
        console.error('Error loading products:', error);
        select.innerHTML = '<option value="">Error loading products</option>';
        showToast('Failed to load products. Please try again.', 'error');
    }
}

// Handle Add Stock
async function handleAddStock(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.API_BASE_URL}/products/${formData.get('productId')}/stock/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                quantity: parseInt(formData.get('quantity'))
            })
        });
        
        if (!response.ok) throw new Error('Failed to add stock');
        
        hideLoading();
        showToast('Stock added successfully!', 'success');
        closeAddStockModal();
        loadInventoryData();
    } catch (error) {
        hideLoading();
        console.error('Error adding stock:', error);
        showToast('Failed to add stock', 'error');
    }
}

// Handle Remove Stock
async function handleRemoveStock(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.API_BASE_URL}/products/${formData.get('productId')}/stock/remove`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                quantity: parseInt(formData.get('quantity')),
                reason: formData.get('reason')
            })
        });
        
        if (!response.ok) throw new Error('Failed to remove stock');
        
        hideLoading();
        showToast('Stock removed successfully!', 'success');
        closeRemoveStockModal();
        loadInventoryData();
    } catch (error) {
        hideLoading();
        console.error('Error removing stock:', error);
        showToast('Failed to remove stock', 'error');
    }
}
