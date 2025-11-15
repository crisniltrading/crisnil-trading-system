// Unified Inventory Management System

// Load inventory dashboard
async function loadInventoryDashboard() {
    try {
        const token = localStorage.getItem('token');
        
        // Load all data in parallel
        const [overviewRes, productsRes, alertsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/inventory/overview`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE_URL}/products?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE_URL}/inventory/low-stock`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        const overview = await overviewRes.json();
        const products = await productsRes.json();
        const alerts = await alertsRes.json();

        renderInventoryDashboard(overview, products, alerts);
    } catch (error) {
        console.error('Error loading inventory:', error);
        showToast('Failed to load inventory data', 'error');
    }
}

// Render inventory dashboard
function renderInventoryDashboard(overview, products, alerts) {
    const container = document.getElementById('inventoryDashboardContainer');
    if (!container) return;

    const stats = overview.data || {};
    const productList = products.products || [];
    const lowStockItems = alerts.products || [];

    container.innerHTML = `
        <!-- Statistics Overview -->
        <div class="inventory-stats-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <i class="fas fa-boxes"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-value">${stats.totalProducts || 0}</div>
                    <div class="stat-label">Total Products</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-value">${stats.lowStockCount || 0}</div>
                    <div class="stat-label">Low Stock Items</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-value">₱${(stats.totalValue || 0).toLocaleString()}</div>
                    <div class="stat-label">Total Inventory Value</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                    <i class="fas fa-times-circle"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-value">${stats.outOfStockCount || 0}</div>
                    <div class="stat-label">Out of Stock</div>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="inventory-actions">
            <button class="btn btn-primary" onclick="showUnifiedStockModal()">
                <i class="fas fa-edit"></i> Adjust Stock
            </button>
            <button class="btn btn-success" onclick="showBulkImportModal()">
                <i class="fas fa-file-import"></i> Bulk Import
            </button>
            <button class="btn btn-info" onclick="exportInventoryReport()">
                <i class="fas fa-file-export"></i> Export Report
            </button>
            <button class="btn btn-secondary" onclick="showStockHistoryModal()">
                <i class="fas fa-history"></i> Stock History
            </button>
        </div>

        <!-- Low Stock Alerts -->
        ${lowStockItems.length > 0 ? `
            <div class="low-stock-section">
                <h3><i class="fas fa-exclamation-triangle"></i> Low Stock Alerts</h3>
                <div class="low-stock-grid">
                    ${lowStockItems.slice(0, 6).map(product => `
                        <div class="low-stock-card">
                            <div class="product-image-small">
                                ${product.images && product.images.length > 0 ? `
                                    <img src="${window.ImageHelper ? window.ImageHelper.getImageUrl(product.images[0]) : (product.images[0].data ? `data:${product.images[0].contentType};base64,${product.images[0].data}` : '')}" alt="${product.name}">
                                ` : `
                                    <i class="fas fa-box"></i>
                                `}
                            </div>
                            <div class="product-info">
                                <h4>${product.name}</h4>
                                <p class="stock-status critical">
                                    <i class="fas fa-box"></i> ${product.stock} ${product.unit} left
                                </p>
                                <p class="min-stock">Min: ${product.minStock} ${product.unit}</p>
                            </div>
                            <button class="btn btn-sm btn-primary" onclick="quickRestock('${product._id}', '${product.name}', ${product.stock})">
                                <i class="fas fa-plus"></i> Restock
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        <!-- Inventory Table -->
        <div class="inventory-table-section">
            <div class="table-header">
                <h3><i class="fas fa-list"></i> All Products</h3>
                <div class="table-filters">
                    <input type="text" id="inventorySearch" placeholder="Search products..." onkeyup="filterInventoryTable()">
                    <select id="inventoryCategory" onchange="filterInventoryTable()">
                        <option value="">All Categories</option>
                        <option value="chicken">Chicken</option>
                        <option value="beef">Beef</option>
                        <option value="pork">Pork</option>
                        <option value="seafood">Seafood</option>
                        <option value="vegetables">Vegetables</option>
                        <option value="dairy">Dairy</option>
                        <option value="other">Other</option>
                    </select>
                    <select id="inventoryStockStatus" onchange="filterInventoryTable()">
                        <option value="">All Stock Status</option>
                        <option value="in-stock">In Stock</option>
                        <option value="low-stock">Low Stock</option>
                        <option value="out-of-stock">Out of Stock</option>
                    </select>
                </div>
            </div>
            
            <div class="inventory-table-container">
                <table class="inventory-table" id="inventoryTable">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Current Stock</th>
                            <th>Min Stock</th>
                            <th>Unit</th>
                            <th>Price</th>
                            <th>Value</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productList.map(product => renderInventoryRow(product)).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Store data for filtering
    window.inventoryData = productList;
}

// Render inventory table row
function renderInventoryRow(product) {
    const stockStatus = getStockStatusClass(product.stock, product.minStock);
    const stockValue = (product.stock * product.price).toFixed(2);
    
    return `
        <tr data-product-id="${product._id}" data-category="${product.category}" data-stock-status="${stockStatus}">
            <td>
                <div class="product-cell">
                    ${product.images && product.images.length > 0 ? `
                        <img src="${window.ImageHelper ? window.ImageHelper.getImageUrl(product.images[0]) : (product.images[0].data ? `data:${product.images[0].contentType};base64,${product.images[0].data}` : '')}" alt="${product.name}" class="product-thumb">
                    ` : `
                        <div class="product-thumb-placeholder"><i class="fas fa-box"></i></div>
                    `}
                    <strong>${product.name}</strong>
                </div>
            </td>
            <td><span class="category-badge">${product.category}</span></td>
            <td><strong>${product.stock}</strong></td>
            <td>${product.minStock || 0}</td>
            <td>${product.unit}</td>
            <td>₱${product.price.toFixed(2)}</td>
            <td>₱${stockValue}</td>
            <td><span class="status-badge status-${stockStatus}">${getStockStatusText(product.stock, product.minStock)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="quickAdjustStock('${product._id}', '${product.name}', ${product.stock})" title="Adjust Stock">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="viewProductHistory('${product._id}')" title="View History">
                        <i class="fas fa-history"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Get stock status class
function getStockStatusClass(stock, minStock) {
    if (stock <= 0) return 'out-of-stock';
    if (stock <= minStock) return 'low-stock';
    return 'in-stock';
}

// Get stock status text
function getStockStatusText(stock, minStock) {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= minStock) return 'Low Stock';
    return 'In Stock';
}

// Filter inventory table
function filterInventoryTable() {
    const search = document.getElementById('inventorySearch')?.value.toLowerCase() || '';
    const category = document.getElementById('inventoryCategory')?.value || '';
    const stockStatus = document.getElementById('inventoryStockStatus')?.value || '';
    
    const rows = document.querySelectorAll('#inventoryTable tbody tr');
    
    rows.forEach(row => {
        const productName = row.querySelector('.product-cell strong')?.textContent.toLowerCase() || '';
        const productCategory = row.dataset.category || '';
        const productStockStatus = row.dataset.stockStatus || '';
        
        const matchesSearch = productName.includes(search);
        const matchesCategory = !category || productCategory === category;
        const matchesStockStatus = !stockStatus || productStockStatus === stockStatus;
        
        if (matchesSearch && matchesCategory && matchesStockStatus) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Show unified stock adjustment modal
function showUnifiedStockModal(productId = null, productName = null, currentStock = null) {
    const modalHTML = `
        <div id="unifiedStockModal" class="modal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Adjust Stock</h3>
                    <button class="close-btn" onclick="closeUnifiedStockModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="unifiedStockForm" onsubmit="handleUnifiedStockAdjustment(event)">
                        <div class="form-group">
                            <label>Select Product *</label>
                            <select name="productId" id="stockProductSelect" required onchange="updateCurrentStock()">
                                <option value="">Choose a product...</option>
                            </select>
                        </div>
                        
                        <div id="currentStockDisplay" style="display: none; padding: 1rem; background: #f7fafc; border-radius: 8px; margin-bottom: 1rem;">
                            <p style="margin: 0; color: #718096;">
                                <strong>Current Stock:</strong> <span id="currentStockValue">0</span> <span id="currentStockUnit">units</span>
                            </p>
                        </div>
                        
                        <div class="form-group">
                            <label>Adjustment Type *</label>
                            <div class="radio-group">
                                <label class="radio-label">
                                    <input type="radio" name="adjustmentType" value="add" checked>
                                    <span><i class="fas fa-plus-circle"></i> Add Stock (Restock)</span>
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="adjustmentType" value="remove">
                                    <span><i class="fas fa-minus-circle"></i> Remove Stock (Damage/Loss)</span>
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="adjustmentType" value="set">
                                    <span><i class="fas fa-equals"></i> Set Exact Amount</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Quantity *</label>
                            <input type="number" name="quantity" required min="1" placeholder="Enter quantity">
                        </div>
                        
                        <div id="batchInfoSection" style="display: none;">
                            <div class="info-box">
                                <i class="fas fa-info-circle"></i>
                                <div>
                                    <strong>FIFO Batch Tracking</strong>
                                    <p>Batch number will be auto-generated to track First-In-First-Out inventory flow</p>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Batch Number (Auto-generated)</label>
                                <input type="text" name="batchNumber" readonly placeholder="Will be generated automatically" style="background: #f7fafc;">
                                <small>Format: BATCH-YYYYMMDD-XXX</small>
                            </div>
                            
                            <div class="form-group">
                                <label>Expiry Date (Optional)</label>
                                <input type="date" name="expiryDate" min="${new Date().toISOString().split('T')[0]}">
                                <small>For perishable items - helps with FIFO management</small>
                            </div>
                            
                            <div class="form-group">
                                <label>Supplier Reference (Optional)</label>
                                <input type="text" name="supplierRef" placeholder="PO number or invoice reference">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Reason *</label>
                            <select name="reason" required onchange="toggleBatchInfo(this.value)">
                                <option value="">Select reason...</option>
                                <option value="restock">Restock from supplier</option>
                                <option value="return">Customer return</option>
                                <option value="damage">Damaged goods</option>
                                <option value="expired">Expired products</option>
                                <option value="theft">Theft/Loss</option>
                                <option value="correction">Stock correction</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Notes (Optional)</label>
                            <textarea name="notes" rows="3" placeholder="Additional details..."></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-check"></i> Apply Adjustment
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="closeUnifiedStockModal()">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    loadProductsForStockAdjustment(productId);
}

// Load products for stock adjustment
async function loadProductsForStockAdjustment(selectedId = null) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products?limit=1000`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        const select = document.getElementById('stockProductSelect');
        
        if (select && data.products) {
            data.products.forEach(product => {
                const option = document.createElement('option');
                option.value = product._id;
                option.textContent = `${product.name} (${product.stock} ${product.unit})`;
                option.dataset.stock = product.stock;
                option.dataset.unit = product.unit;
                if (product._id === selectedId) option.selected = true;
                select.appendChild(option);
            });
            
            if (selectedId) updateCurrentStock();
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Update current stock display
function updateCurrentStock() {
    const select = document.getElementById('stockProductSelect');
    const display = document.getElementById('currentStockDisplay');
    const valueSpan = document.getElementById('currentStockValue');
    const unitSpan = document.getElementById('currentStockUnit');
    
    if (select && select.selectedOptions[0]) {
        const option = select.selectedOptions[0];
        const stock = option.dataset.stock;
        const unit = option.dataset.unit;
        
        if (stock !== undefined) {
            valueSpan.textContent = stock;
            unitSpan.textContent = unit;
            display.style.display = 'block';
        }
    } else {
        display.style.display = 'none';
    }
}

// Handle unified stock adjustment
async function handleUnifiedStockAdjustment(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const productId = formData.get('productId');
    const adjustmentType = formData.get('adjustmentType');
    const quantity = parseInt(formData.get('quantity'));
    const reason = formData.get('reason');
    const notes = formData.get('notes');
    
    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/inventory/adjust`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId,
                adjustmentType,
                quantity,
                reason,
                notes
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to adjust stock');
        }
        
        showToast(data.message || 'Stock adjusted successfully', 'success');
        closeUnifiedStockModal();
        loadInventoryDashboard();
    } catch (error) {
        hideLoading();
        console.error('Error adjusting stock:', error);
        showToast(error.message, 'error');
    }
}

// Quick restock function
function quickRestock(productId, productName, currentStock) {
    showUnifiedStockModal(productId, productName, currentStock);
}

// Quick adjust stock
function quickAdjustStock(productId, productName, currentStock) {
    showUnifiedStockModal(productId, productName, currentStock);
}

// Close unified stock modal
function closeUnifiedStockModal() {
    const modal = document.getElementById('unifiedStockModal');
    if (modal) modal.remove();
}

// Export inventory report
async function exportInventoryReport() {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/inventory/export`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to export');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        hideLoading();
        showToast('Inventory report exported successfully', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error exporting:', error);
        showToast('Failed to export inventory report', 'error');
    }
}

// Show stock history modal
async function showStockHistoryModal() {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/inventory/history?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load history');
        
        const data = await response.json();
        hideLoading();
        
        renderStockHistoryModal(data.data);
    } catch (error) {
        hideLoading();
        console.error('Error loading stock history:', error);
        showToast('Failed to load stock history', 'error');
    }
}

// Render stock history modal
function renderStockHistoryModal(logs) {
    const modalHTML = `
        <div id="stockHistoryModal" class="modal" style="display: flex;">
            <div class="modal-content large-modal" style="max-width: 1200px;">
                <div class="modal-header">
                    <h3><i class="fas fa-history"></i> Stock Movement History</h3>
                    <button class="close-btn" onclick="closeStockHistoryModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <!-- Filters -->
                    <div class="history-filters">
                        <input type="text" id="historySearch" placeholder="Search product..." onkeyup="filterStockHistory()">
                        <select id="historyAction" onchange="filterStockHistory()">
                            <option value="">All Actions</option>
                            <option value="add">Stock Added</option>
                            <option value="remove">Stock Removed</option>
                            <option value="adjustment">Adjustments</option>
                            <option value="sale">Sales</option>
                        </select>
                        <select id="historyPeriod" onchange="filterStockHistory()">
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                    </div>
                    
                    <!-- Summary Stats -->
                    <div class="history-stats">
                        <div class="history-stat-card">
                            <div class="stat-icon" style="background: #48bb78;">
                                <i class="fas fa-plus"></i>
                            </div>
                            <div class="stat-info">
                                <div class="stat-value">${logs.filter(l => l.action === 'add').length}</div>
                                <div class="stat-label">Stock Added</div>
                            </div>
                        </div>
                        <div class="history-stat-card">
                            <div class="stat-icon" style="background: #e53e3e;">
                                <i class="fas fa-minus"></i>
                            </div>
                            <div class="stat-info">
                                <div class="stat-value">${logs.filter(l => l.action === 'remove').length}</div>
                                <div class="stat-label">Stock Removed</div>
                            </div>
                        </div>
                        <div class="history-stat-card">
                            <div class="stat-icon" style="background: #4299e1;">
                                <i class="fas fa-exchange-alt"></i>
                            </div>
                            <div class="stat-info">
                                <div class="stat-value">${logs.length}</div>
                                <div class="stat-label">Total Movements</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- History Timeline -->
                    <div class="history-timeline" id="historyTimeline">
                        ${renderHistoryTimeline(logs)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    window.stockHistoryData = logs;
}

// Render history timeline
function renderHistoryTimeline(logs) {
    if (!logs || logs.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No stock history found</p>
            </div>
        `;
    }
    
    // Group by date
    const groupedByDate = {};
    logs.forEach(log => {
        const date = new Date(log.createdAt).toLocaleDateString();
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(log);
    });
    
    let html = '';
    Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a)).forEach(date => {
        html += `
            <div class="history-date-group">
                <div class="history-date-header">
                    <i class="fas fa-calendar"></i>
                    <span>${date}</span>
                    <span class="history-count">${groupedByDate[date].length} movements</span>
                </div>
                <div class="history-items">
                    ${groupedByDate[date].map(log => renderHistoryItem(log)).join('')}
                </div>
            </div>
        `;
    });
    
    return html;
}

// Render individual history item
function renderHistoryItem(log) {
    const time = new Date(log.createdAt).toLocaleTimeString();
    const actionIcon = log.action === 'add' ? 'fa-plus-circle' : 'fa-minus-circle';
    const actionColor = log.action === 'add' ? '#48bb78' : '#e53e3e';
    const productName = log.product?.name || 'Unknown Product';
    const userName = log.performedBy?.username || 'System';
    
    return `
        <div class="history-item" data-action="${log.action}" data-product="${productName.toLowerCase()}">
            <div class="history-icon" style="background: ${actionColor};">
                <i class="fas ${actionIcon}"></i>
            </div>
            <div class="history-content">
                <div class="history-main">
                    <strong>${productName}</strong>
                    <span class="history-action">${log.action === 'add' ? 'Added' : 'Removed'} ${log.quantity} units</span>
                </div>
                <div class="history-details">
                    <span class="history-time">
                        <i class="fas fa-clock"></i> ${time}
                    </span>
                    <span class="history-user">
                        <i class="fas fa-user"></i> ${userName}
                    </span>
                    ${log.reason ? `
                        <span class="history-reason">
                            <i class="fas fa-info-circle"></i> ${log.reason}
                        </span>
                    ` : ''}
                    ${log.batchNumber ? `
                        <span class="history-batch">
                            <i class="fas fa-box"></i> ${log.batchNumber}
                        </span>
                    ` : ''}
                </div>
                <div class="history-stock-change">
                    <span class="stock-before">${log.previousStock}</span>
                    <i class="fas fa-arrow-right"></i>
                    <span class="stock-after">${log.newStock}</span>
                    <span class="stock-diff ${log.action === 'add' ? 'positive' : 'negative'}">
                        ${log.action === 'add' ? '+' : '-'}${log.quantity}
                    </span>
                </div>
            </div>
        </div>
    `;
}

// Filter stock history
function filterStockHistory() {
    const search = document.getElementById('historySearch')?.value.toLowerCase() || '';
    const action = document.getElementById('historyAction')?.value || '';
    const period = document.getElementById('historyPeriod')?.value || 'all';
    
    const logs = window.stockHistoryData || [];
    
    // Filter by search
    let filtered = logs.filter(log => {
        const productName = log.product?.name?.toLowerCase() || '';
        return productName.includes(search);
    });
    
    // Filter by action
    if (action) {
        filtered = filtered.filter(log => log.action === action);
    }
    
    // Filter by period
    if (period !== 'all') {
        const now = new Date();
        filtered = filtered.filter(log => {
            const logDate = new Date(log.createdAt);
            switch (period) {
                case 'today':
                    return logDate.toDateString() === now.toDateString();
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return logDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    return logDate >= monthAgo;
                default:
                    return true;
            }
        });
    }
    
    // Re-render timeline
    const timeline = document.getElementById('historyTimeline');
    if (timeline) {
        timeline.innerHTML = renderHistoryTimeline(filtered);
    }
}

// Close stock history modal
function closeStockHistoryModal() {
    const modal = document.getElementById('stockHistoryModal');
    if (modal) modal.remove();
    window.stockHistoryData = null;
}

// Show bulk import modal
function showBulkImportModal() {
    const modalHTML = `
        <div id="bulkImportModal" class="modal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-file-import"></i> Bulk Import Stock</h3>
                    <button class="close-btn" onclick="closeBulkImportModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="import-instructions">
                        <h4><i class="fas fa-info-circle"></i> Instructions</h4>
                        <ol>
                            <li>Download the CSV template</li>
                            <li>Fill in product names and quantities</li>
                            <li>Upload the completed file</li>
                            <li>Review and confirm changes</li>
                        </ol>
                        
                        <div class="csv-format">
                            <strong>CSV Format:</strong>
                            <code>Product Name, Quantity, Reason, Notes</code>
                            <p style="font-size: 0.9rem; color: #718096; margin-top: 0.5rem;">
                                Example: "Chicken Breast, 100, restock, Fresh delivery"
                            </p>
                        </div>
                    </div>
                    
                    <div class="import-actions">
                        <button class="btn btn-secondary" onclick="downloadImportTemplate()">
                            <i class="fas fa-download"></i> Download Template
                        </button>
                    </div>
                    
                    <div class="file-upload-area">
                        <input type="file" id="bulkImportFile" accept=".csv" style="display: none;" onchange="handleBulkImportFile(event)">
                        <div class="upload-dropzone" onclick="document.getElementById('bulkImportFile').click()">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Click to upload CSV file</p>
                            <small>or drag and drop here</small>
                        </div>
                    </div>
                    
                    <div id="importPreview" style="display: none; margin-top: 1.5rem;">
                        <h4>Preview Changes</h4>
                        <div id="importPreviewTable"></div>
                        <div class="form-actions" style="margin-top: 1rem;">
                            <button class="btn btn-primary" onclick="confirmBulkImport()">
                                <i class="fas fa-check"></i> Confirm Import
                            </button>
                            <button class="btn btn-secondary" onclick="cancelBulkImport()">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupDragAndDrop();
}

// Close bulk import modal
function closeBulkImportModal() {
    const modal = document.getElementById('bulkImportModal');
    if (modal) modal.remove();
    window.bulkImportData = null;
}

// Download import template
function downloadImportTemplate() {
    const csv = 'Product Name,Quantity,Reason,Notes\n' +
                'Chicken Breast,100,restock,Fresh delivery\n' +
                'Beef Sirloin,50,restock,Weekly stock\n';
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showToast('Template downloaded successfully', 'success');
}

// Setup drag and drop
function setupDragAndDrop() {
    const dropzone = document.querySelector('.upload-dropzone');
    if (!dropzone) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.style.borderColor = '#667eea';
            dropzone.style.background = '#f7fafc';
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.style.borderColor = '#e2e8f0';
            dropzone.style.background = 'white';
        }, false);
    });
    
    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleBulkImportFile({ target: { files } });
        }
    }, false);
}

// Handle bulk import file
function handleBulkImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
        showToast('Please upload a CSV file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csv = e.target.result;
        parseBulkImportCSV(csv);
    };
    reader.readAsText(file);
}

// Parse CSV
function parseBulkImportCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 2) {
            data.push({
                productName: values[0],
                quantity: parseInt(values[1]) || 0,
                reason: values[2] || 'restock',
                notes: values[3] || ''
            });
        }
    }
    
    if (data.length === 0) {
        showToast('No valid data found in CSV', 'error');
        return;
    }
    
    window.bulkImportData = data;
    showImportPreview(data);
}

// Show import preview
function showImportPreview(data) {
    const preview = document.getElementById('importPreview');
    const table = document.getElementById('importPreviewTable');
    
    if (!preview || !table) return;
    
    table.innerHTML = `
        <table class="inventory-table">
            <thead>
                <tr>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Reason</th>
                    <th>Notes</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => `
                    <tr>
                        <td>${item.productName}</td>
                        <td>${item.quantity}</td>
                        <td>${item.reason}</td>
                        <td>${item.notes || '-'}</td>
                        <td><span class="status-badge status-in-stock">Ready</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    preview.style.display = 'block';
}

// Confirm bulk import
async function confirmBulkImport() {
    if (!window.bulkImportData) return;
    
    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/inventory/bulk-import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ items: window.bulkImportData })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to import');
        }
        
        showToast(`Successfully imported ${data.successful} items`, 'success');
        closeBulkImportModal();
        loadInventoryDashboard();
    } catch (error) {
        hideLoading();
        console.error('Bulk import error:', error);
        showToast(error.message, 'error');
    }
}

// Cancel bulk import
function cancelBulkImport() {
    window.bulkImportData = null;
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('bulkImportFile').value = '';
}

// View product history and batch details
async function viewProductHistory(productId) {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load product');
        
        const data = await response.json();
        hideLoading();
        
        showProductBatchModal(data.product);
    } catch (error) {
        hideLoading();
        console.error('Error loading product:', error);
        showToast('Failed to load product details', 'error');
    }
}

// Show product batch details modal
function showProductBatchModal(product) {
    const batches = product.batchInfo || [];
    const activeBatches = batches.filter(b => b.status === 'active' && b.remainingQuantity > 0);
    const depletedBatches = batches.filter(b => b.status === 'depleted');
    const expiredBatches = batches.filter(b => b.status === 'expired');
    
    // Sort active batches by FIFO order (oldest/expiring first)
    activeBatches.sort((a, b) => {
        if (a.expiryDate && b.expiryDate) {
            return new Date(a.expiryDate) - new Date(b.expiryDate);
        }
        return new Date(a.receivedDate) - new Date(b.receivedDate);
    });
    
    const modalHTML = `
        <div id="productBatchModal" class="modal" style="display: flex;">
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-boxes"></i> ${product.name} - Batch Details</h3>
                    <button class="close-btn" onclick="closeProductBatchModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <!-- Product Info -->
                    <div class="product-batch-info">
                        <div class="info-row">
                            <strong>Product ID:</strong> ${product.productId || 'Not assigned'}
                        </div>
                        <div class="info-row">
                            <strong>First Stock Date:</strong> ${product.firstStockDate ? new Date(product.firstStockDate).toLocaleDateString() : 'N/A'}
                        </div>
                        <div class="info-row">
                            <strong>Current Stock:</strong> ${product.stock} ${product.unit}
                        </div>
                        <div class="info-row">
                            <strong>Total Batches:</strong> ${batches.length}
                        </div>
                    </div>
                    
                    <!-- FIFO Order Info -->
                    ${activeBatches.length > 0 ? `
                        <div class="fifo-info-box">
                            <i class="fas fa-arrow-right"></i>
                            <div>
                                <strong>FIFO Order (First Out)</strong>
                                <p>Next batch to be used: <strong>${activeBatches[0].batchNumber}</strong></p>
                                <p>Received: ${new Date(activeBatches[0].receivedDate).toLocaleDateString()}</p>
                                ${activeBatches[0].expiryDate ? `<p>Expires: ${new Date(activeBatches[0].expiryDate).toLocaleDateString()}</p>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Active Batches -->
                    ${activeBatches.length > 0 ? `
                        <div class="batch-section">
                            <h4><i class="fas fa-check-circle"></i> Active Batches (${activeBatches.length})</h4>
                            <div class="batch-table-container">
                                <table class="batch-table">
                                    <thead>
                                        <tr>
                                            <th>FIFO Order</th>
                                            <th>Batch Number</th>
                                            <th>Remaining</th>
                                            <th>Original</th>
                                            <th>Received</th>
                                            <th>Expiry</th>
                                            <th>Supplier Ref</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${activeBatches.map((batch, index) => {
                                            const daysToExpiry = batch.expiryDate ? 
                                                Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                                            const expiryClass = daysToExpiry !== null && daysToExpiry <= 7 ? 'expiring-soon' : '';
                                            
                                            return `
                                                <tr class="${index === 0 ? 'next-batch' : ''}">
                                                    <td><span class="fifo-order">#${index + 1}</span></td>
                                                    <td><code>${batch.batchNumber}</code></td>
                                                    <td><strong>${batch.remainingQuantity} ${product.unit}</strong></td>
                                                    <td>${batch.quantity} ${product.unit}</td>
                                                    <td>${new Date(batch.receivedDate).toLocaleDateString()}</td>
                                                    <td class="${expiryClass}">
                                                        ${batch.expiryDate ? 
                                                            `${new Date(batch.expiryDate).toLocaleDateString()}${daysToExpiry !== null ? ` (${daysToExpiry}d)` : ''}` : 
                                                            'N/A'}
                                                    </td>
                                                    <td>${batch.supplierReference || '-'}</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : '<p class="empty-message">No active batches</p>'}
                    
                    <!-- Depleted Batches -->
                    ${depletedBatches.length > 0 ? `
                        <div class="batch-section">
                            <h4><i class="fas fa-box-open"></i> Depleted Batches (${depletedBatches.length})</h4>
                            <div class="batch-list-compact">
                                ${depletedBatches.map(batch => `
                                    <div class="batch-item-compact">
                                        <code>${batch.batchNumber}</code>
                                        <span>Received: ${new Date(batch.receivedDate).toLocaleDateString()}</span>
                                        <span class="badge badge-secondary">Depleted</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Expired Batches -->
                    ${expiredBatches.length > 0 ? `
                        <div class="batch-section">
                            <h4><i class="fas fa-exclamation-triangle"></i> Expired Batches (${expiredBatches.length})</h4>
                            <div class="batch-list-compact">
                                ${expiredBatches.map(batch => `
                                    <div class="batch-item-compact">
                                        <code>${batch.batchNumber}</code>
                                        <span>Expired: ${new Date(batch.expiryDate).toLocaleDateString()}</span>
                                        <span class="badge badge-danger">Expired</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close product batch modal
function closeProductBatchModal() {
    const modal = document.getElementById('productBatchModal');
    if (modal) modal.remove();
}

// Toggle batch info section
function toggleBatchInfo(reason) {
    const batchSection = document.getElementById('batchInfoSection');
    const adjustmentType = document.querySelector('input[name="adjustmentType"]:checked')?.value;
    
    // Show batch info only for "add" type and "restock" reason
    if (batchSection && adjustmentType === 'add' && reason === 'restock') {
        batchSection.style.display = 'block';
        // Generate batch number preview
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const batchInput = document.querySelector('input[name="batchNumber"]');
        if (batchInput) {
            batchInput.value = `BATCH-${today}-XXX (will be assigned)`;
        }
    } else if (batchSection) {
        batchSection.style.display = 'none';
    }
}

// Listen to adjustment type changes
document.addEventListener('change', function(e) {
    if (e.target.name === 'adjustmentType') {
        const reasonSelect = document.querySelector('select[name="reason"]');
        if (reasonSelect) {
            toggleBatchInfo(reasonSelect.value);
        }
    }
});

// Make functions globally available
window.loadInventoryDashboard = loadInventoryDashboard;
window.showUnifiedStockModal = showUnifiedStockModal;
window.closeUnifiedStockModal = closeUnifiedStockModal;
window.handleUnifiedStockAdjustment = handleUnifiedStockAdjustment;
window.filterInventoryTable = filterInventoryTable;
window.quickRestock = quickRestock;
window.quickAdjustStock = quickAdjustStock;
window.updateCurrentStock = updateCurrentStock;
window.exportInventoryReport = exportInventoryReport;
window.showStockHistoryModal = showStockHistoryModal;
window.showBulkImportModal = showBulkImportModal;
window.viewProductHistory = viewProductHistory;
window.toggleBatchInfo = toggleBatchInfo;
window.closeBulkImportModal = closeBulkImportModal;
window.downloadImportTemplate = downloadImportTemplate;
window.handleBulkImportFile = handleBulkImportFile;
window.confirmBulkImport = confirmBulkImport;
window.cancelBulkImport = cancelBulkImport;
window.showProductBatchModal = showProductBatchModal;
window.closeProductBatchModal = closeProductBatchModal;
window.renderStockHistoryModal = renderStockHistoryModal;
window.closeStockHistoryModal = closeStockHistoryModal;
window.filterStockHistory = filterStockHistory;
