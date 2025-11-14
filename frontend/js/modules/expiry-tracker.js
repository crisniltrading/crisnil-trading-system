// Expiry Tracker Module
// Note: API_BASE_URL is defined globally in script.js

// Load expiry dashboard
async function loadExpiryDashboard() {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            // Silently return if not logged in (expected on landing page)
            return;
        }
        
        // Check user role - only allow admin/staff/b2b
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const userRole = (currentUser?.role || 'client').toLowerCase();
        
        if (userRole === 'client') {
            // Silently return for client users - they don't have access
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/expiry/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            // Silently fail if unauthorized (user might not have permission)
            if (response.status === 401 || response.status === 403) {
                return;
            }
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || 'Failed to load expiry dashboard');
        }

        const data = await response.json();
        renderExpiryDashboard(data.data);
    } catch (error) {
        // Only show error if it's not an auth issue
        if (error.message && !error.message.includes('401') && !error.message.includes('403')) {
            console.error('Error loading expiry dashboard:', error);
            if (typeof showToast === 'function') {
                showToast('Failed to load expiry dashboard', 'error');
            }
        }
    }
}

// Render expiry dashboard
function renderExpiryDashboard(dashboard) {
    const container = document.getElementById('expiryDashboardContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="expiry-stats-grid">
            <div class="stat-card critical">
                <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="stat-value">${dashboard.critical}</div>
                <div class="stat-label">Critical (≤7 days)</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-icon"><i class="fas fa-clock"></i></div>
                <div class="stat-value">${dashboard.warning}</div>
                <div class="stat-label">Warning (≤30 days)</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-icon"><i class="fas fa-times-circle"></i></div>
                <div class="stat-value">${dashboard.expired}</div>
                <div class="stat-label">Expired</div>
            </div>
        </div>

        <div class="expiry-actions">
            <button class="btn btn-primary" onclick="applyExpiryDiscounts()">
                <i class="fas fa-tag"></i> Apply Discounts
            </button>
            <button class="btn btn-secondary" onclick="cleanupExpiredBatches()">
                <i class="fas fa-broom"></i> Cleanup Expired
            </button>
            <button class="btn btn-info" onclick="loadExpiryDashboard()">
                <i class="fas fa-sync"></i> Refresh
            </button>
        </div>

        <div class="expiry-tabs">
            <button class="tab-btn active" onclick="showExpiryTab('critical')">
                Critical (${dashboard.critical})
            </button>
            <button class="tab-btn" onclick="showExpiryTab('warning')">
                Warning (${dashboard.warning})
            </button>
            <button class="tab-btn" onclick="showExpiryTab('expired')">
                Expired (${dashboard.expired})
            </button>
        </div>

        <div id="expiryProductsList" class="expiry-products-list">
            ${renderExpiryProducts(dashboard.criticalProducts, 'critical')}
        </div>
    `;

    // Store dashboard data for tab switching
    window.expiryDashboardData = dashboard;
}

// Show expiry tab
function showExpiryTab(tab) {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    const dashboard = window.expiryDashboardData;
    const listContainer = document.getElementById('expiryProductsList');

    if (tab === 'critical') {
        listContainer.innerHTML = renderExpiryProducts(dashboard.criticalProducts, 'critical');
    } else if (tab === 'warning') {
        listContainer.innerHTML = renderExpiryProducts(dashboard.warningProducts, 'warning');
    } else if (tab === 'expired') {
        listContainer.innerHTML = renderExpiryProducts(dashboard.expiredProducts, 'expired');
    }
}

// Render expiry products list
function renderExpiryProducts(products, type) {
    if (!products || products.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>No products ${type === 'expired' ? 'expired' : 'expiring in this range'}. Great job!</p>
            </div>
        `;
    }

    return products.map(product => {
        const daysToExpiry = product.daysToExpiry;
        const statusClass = daysToExpiry <= 7 ? 'critical' : daysToExpiry <= 30 ? 'warning' : 'expired';
        const statusText = daysToExpiry < 0 ? 'Expired' : `${daysToExpiry} days left`;
        
        const imageUrl = product.images && product.images.length > 0 
            ? `${API_BASE_URL.replace('/api', '')}${product.images[0].url}`
            : null;

        // FIFO information
        const hasFifoOrder = product.fifoOrder && product.fifoOrder.length > 0;
        const totalExpiringQty = product.totalExpiringQuantity || product.nearestExpiry?.remainingQuantity || 0;

        return `
            <div class="expiry-product-card ${statusClass}">
                <div class="product-image-small">
                    ${imageUrl ? `
                        <img src="${imageUrl}" alt="${product.name}">
                    ` : `
                        <i class="fas ${getCategoryIcon(product.category)}"></i>
                    `}
                </div>
                <div class="product-info-expiry">
                    <h4>${product.name}</h4>
                    <p class="product-category">
                        <i class="fas ${getCategoryIcon(product.category)}"></i>
                        ${product.category}
                    </p>
                    <p class="product-stock">
                        Total Stock: ${product.stock} ${product.unit}
                        ${totalExpiringQty > 0 ? `<br><span class="expiring-qty">Expiring: ${totalExpiringQty} ${product.unit}</span>` : ''}
                    </p>
                    <p class="expiry-date">
                        <i class="fas fa-calendar-alt"></i>
                        Next Expiry: ${new Date(product.nearestExpiry.expiryDate).toLocaleDateString()}
                    </p>
                    <p class="batch-info">
                        <i class="fas fa-box"></i> FIFO Batch: ${product.nearestExpiry.batchNumber || 'N/A'} 
                        (${product.nearestExpiry.remainingQuantity || product.nearestExpiry.quantity} ${product.unit} left)
                    </p>
                    ${hasFifoOrder && product.fifoOrder.length > 1 ? `
                        <p class="fifo-summary">
                            <i class="fas fa-layer-group"></i> ${product.fifoOrder.length} batches expiring
                        </p>
                    ` : ''}
                </div>
                <div class="expiry-status ${statusClass}">
                    <i class="fas ${daysToExpiry < 0 ? 'fa-times-circle' : 'fa-clock'}"></i>
                    <span>${statusText}</span>
                </div>
                <div class="product-actions-expiry">
                    ${hasFifoOrder ? `
                        <button class="btn btn-sm btn-info" onclick="viewProductHistory('${product._id}')" title="View FIFO Order">
                            <i class="fas fa-arrow-right"></i> FIFO Details
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-primary" onclick="showBatchManagementModal('${product._id}')">
                        <i class="fas fa-boxes"></i> Manage Batches
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="showEditProductModal('${product._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Apply expiry discounts
async function applyExpiryDiscounts() {
    if (!confirm('Apply automatic discounts to all products nearing expiration?')) {
        return;
    }

    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/expiry/apply-discounts`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to apply discounts');

        const data = await response.json();
        hideLoading();
        showToast(data.message, 'success');
        loadExpiryDashboard();
    } catch (error) {
        hideLoading();
        console.error('Error applying discounts:', error);
        showToast('Failed to apply discounts', 'error');
    }
}

// Cleanup expired batches
async function cleanupExpiredBatches() {
    if (!confirm('Remove all expired batches and update stock? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/expiry/cleanup-expired`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to cleanup expired batches');

        const data = await response.json();
        hideLoading();
        showToast(data.message, 'success');
        loadExpiryDashboard();
    } catch (error) {
        hideLoading();
        console.error('Error cleaning up batches:', error);
        showToast('Failed to cleanup expired batches', 'error');
    }
}

// Show batch management modal
async function showBatchManagementModal(productId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load product');

        const data = await response.json();
        const product = data.product;

        const modalHTML = `
            <div id="batchManagementModal" class="modal" style="display: flex;">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-boxes"></i> Batch Management: ${product.name}</h3>
                        <button class="close-btn" onclick="closeBatchManagementModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="batch-list">
                            ${product.batchInfo && product.batchInfo.length > 0 ? `
                                <table class="batch-table">
                                    <thead>
                                        <tr>
                                            <th>Batch #</th>
                                            <th>Quantity</th>
                                            <th>Received</th>
                                            <th>Expiry Date</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${product.batchInfo.map(batch => {
                                            const expiryDate = new Date(batch.expiryDate);
                                            const now = new Date();
                                            const daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                                            const status = daysToExpiry < 0 ? 'expired' : daysToExpiry <= 7 ? 'critical' : daysToExpiry <= 30 ? 'warning' : 'good';
                                            const statusText = daysToExpiry < 0 ? 'Expired' : `${daysToExpiry} days`;
                                            
                                            return `
                                                <tr class="batch-row ${status}">
                                                    <td>${batch.batchNumber || 'N/A'}</td>
                                                    <td>${batch.quantity} ${product.unit}</td>
                                                    <td>${new Date(batch.receivedDate).toLocaleDateString()}</td>
                                                    <td>${expiryDate.toLocaleDateString()}</td>
                                                    <td><span class="badge badge-${status}">${statusText}</span></td>
                                                    <td>
                                                        <button class="btn btn-sm btn-secondary" onclick="editBatch('${product._id}', '${batch._id}')">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                        <button class="btn btn-sm btn-danger" onclick="deleteBatch('${product._id}', '${batch._id}')">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            ` : `
                                <p class="empty-state">No batches recorded for this product.</p>
                            `}
                        </div>

                        <div class="add-batch-form">
                            <h4>Add New Batch</h4>
                            <form id="addBatchForm" onsubmit="handleAddBatch(event, '${product._id}')">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Batch Number</label>
                                        <input type="text" name="batchNumber" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Quantity</label>
                                        <input type="number" name="quantity" min="1" required>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Received Date</label>
                                        <input type="date" name="receivedDate" value="${new Date().toISOString().split('T')[0]}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Expiry Date</label>
                                        <input type="date" name="expiryDate" required>
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-plus"></i> Add Batch
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('batchManagementModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } catch (error) {
        console.error('Error loading batch management:', error);
        showToast('Failed to load batch management', 'error');
    }
}

// Close batch management modal
function closeBatchManagementModal() {
    const modal = document.getElementById('batchManagementModal');
    if (modal) modal.remove();
}

// Handle add batch
async function handleAddBatch(event, productId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const batchData = {
        batchNumber: formData.get('batchNumber'),
        quantity: parseInt(formData.get('quantity')),
        receivedDate: formData.get('receivedDate'),
        expiryDate: formData.get('expiryDate')
    };

    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/expiry/products/${productId}/batches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(batchData)
        });

        if (!response.ok) throw new Error('Failed to add batch');

        hideLoading();
        showToast('Batch added successfully', 'success');
        closeBatchManagementModal();
        loadExpiryDashboard();
    } catch (error) {
        hideLoading();
        console.error('Error adding batch:', error);
        showToast('Failed to add batch', 'error');
    }
}

// Delete batch
async function deleteBatch(productId, batchId) {
    if (!confirm('Delete this batch? Stock will be updated accordingly.')) {
        return;
    }

    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/expiry/products/${productId}/batches/${batchId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to delete batch');

        hideLoading();
        showToast('Batch deleted successfully', 'success');
        closeBatchManagementModal();
        showBatchManagementModal(productId);
        loadExpiryDashboard();
    } catch (error) {
        hideLoading();
        console.error('Error deleting batch:', error);
        showToast('Failed to delete batch', 'error');
    }
}

// Helper function
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

// Update dashboard expiry alert (integrates with existing dashboard notification)
async function updateDashboardExpiryAlert() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/expiry/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Silently fail if endpoint not available (404) or other errors
        if (!response.ok) {
            if (response.status === 404) {
                console.log('Expiry dashboard endpoint not available');
            }
            return;
        }

        const data = await response.json();
        const dashboard = data.data;
        
        const alertCard = document.getElementById('expiryAlertCard');
        const alertText = document.getElementById('expiryAlertText');
        
        if (!alertCard || !alertText) return;

        const totalExpiring = dashboard.critical + dashboard.warning;
        
        if (totalExpiring > 0) {
            alertCard.style.display = 'block';
            
            let message = '';
            if (dashboard.critical > 0) {
                message = `🔴 ${dashboard.critical} product${dashboard.critical > 1 ? 's' : ''} expiring within 7 days! `;
            }
            if (dashboard.warning > 0) {
                message += `🟡 ${dashboard.warning} product${dashboard.warning > 1 ? 's' : ''} expiring within 30 days. `;
            }
            message += 'Auto-discounts are being applied.';
            
            alertText.textContent = message;
        } else {
            alertCard.style.display = 'none';
        }
    } catch (error) {
        console.error('Error updating dashboard expiry alert:', error);
    }
}

// Quick apply discounts from dashboard
async function quickApplyExpiryDiscounts() {
    if (!confirm('Apply automatic discounts to all products nearing expiration?')) {
        return;
    }

    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/expiry/apply-discounts`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to apply discounts');

        const data = await response.json();
        hideLoading();
        showToast(data.message, 'success');
        
        // Update dashboard alert
        updateDashboardExpiryAlert();
        
        // If on expiry tracker page, reload it
        if (document.getElementById('expiryDashboardContainer')) {
            loadExpiryDashboard();
        }
    } catch (error) {
        hideLoading();
        console.error('Error applying discounts:', error);
        showToast('Failed to apply discounts', 'error');
    }
}

// Make functions globally available
window.quickApplyExpiryDiscounts = quickApplyExpiryDiscounts;
window.updateDashboardExpiryAlert = updateDashboardExpiryAlert;

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeExpiryTracker();
    });
} else {
    initializeExpiryTracker();
}

// Initialize expiry tracker (called once)
function initializeExpiryTracker() {
    // Only initialize if user is logged in
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Check user role - only load for admin/staff
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = (currentUser?.role || 'client').toLowerCase();
    
    // Load expiry tracker if on that page AND user has permission
    if (document.getElementById('expiryDashboardContainer')) {
        if (userRole === 'admin' || userRole === 'staff' || userRole === 'b2b') {
            loadExpiryDashboard();
        }
    }
    
    // Update dashboard alert if user is admin/staff
    if (userRole === 'admin' || userRole === 'staff') {
        updateDashboardExpiryAlert();
        
        // Refresh alert every 10 minutes (reduced from 5 to reduce API calls)
        // Only set interval once
        if (!window.expiryAlertInterval) {
            window.expiryAlertInterval = setInterval(updateDashboardExpiryAlert, 10 * 60 * 1000);
        }
    }
}
