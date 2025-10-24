// Reports & Export System

/**
 * Load reports page
 */
function loadReportsPage() {
  const reportsSection = document.getElementById('reportsSection');
  if (!reportsSection) return;

  reportsSection.innerHTML = `
    <div class="page-header">
      <h2><i class="fas fa-chart-line"></i> Reports & Analytics</h2>
      <p>Generate and export business reports</p>
    </div>

    <!-- Report Type Selector -->
    <div class="card" style="margin-bottom: 2rem;">
      <div style="padding: 1.5rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <button class="report-type-btn active" onclick="selectReportType('sales')" id="reportBtn-sales">
            <i class="fas fa-dollar-sign"></i>
            <span>Sales Report</span>
          </button>
          <button class="report-type-btn" onclick="selectReportType('inventory')" id="reportBtn-inventory">
            <i class="fas fa-boxes"></i>
            <span>Inventory Report</span>
          </button>
          <button class="report-type-btn" onclick="selectReportType('customers')" id="reportBtn-customers">
            <i class="fas fa-users"></i>
            <span>Customer Report</span>
          </button>
          <button class="report-type-btn" onclick="selectReportType('transactions')" id="reportBtn-transactions">
            <i class="fas fa-receipt"></i>
            <span>Transaction Report</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Report Filters -->
    <div class="card" style="margin-bottom: 2rem;">
      <div class="card-header">
        <h3><i class="fas fa-filter"></i> Filters</h3>
      </div>
      <div style="padding: 1.5rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input type="date" class="form-input" id="reportStartDate">
          </div>
          <div class="form-group">
            <label class="form-label">End Date</label>
            <input type="date" class="form-input" id="reportEndDate">
          </div>
          <div class="form-group" style="display: flex; align-items: flex-end; gap: 0.5rem;">
            <button class="btn btn-primary" onclick="generateReport()" style="flex: 1;">
              <i class="fas fa-sync"></i> Generate
            </button>
            <button class="btn btn-success" onclick="exportReport()" style="flex: 1;">
              <i class="fas fa-download"></i> Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Report Content -->
    <div id="reportContent">
      <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
        <i class="fas fa-chart-bar" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.3;"></i>
        <p>Select filters and click "Generate" to view report</p>
      </div>
    </div>
  `;

  // Set default dates (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  document.getElementById('reportEndDate').valueAsDate = endDate;
  document.getElementById('reportStartDate').valueAsDate = startDate;
}

let currentReportType = 'sales';

/**
 * Select report type
 */
function selectReportType(type) {
  currentReportType = type;

  // Update button states
  document.querySelectorAll('.report-type-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`reportBtn-${type}`).classList.add('active');

  // Clear previous report
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
      <i class="fas fa-chart-bar" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.3;"></i>
      <p>Click "Generate" to view ${type} report</p>
    </div>
  `;
}

/**
 * Generate report
 */
async function generateReport() {
  const startDate = document.getElementById('reportStartDate').value;
  const endDate = document.getElementById('reportEndDate').value;

  if (!startDate || !endDate) {
    showToast('Please select date range', 'error');
    return;
  }

  showLoading();

  try {
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/reports/${currentReportType}?startDate=${startDate}&endDate=${endDate}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      displayReport(data.data, currentReportType);
    } else {
      showToast(data.message || 'Failed to generate report', 'error');
    }
  } catch (error) {
    console.error('Error generating report:', error);
    showToast('Error generating report', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Display report based on type
 */
function displayReport(data, type) {
  const container = document.getElementById('reportContent');

  switch (type) {
    case 'sales':
      displaySalesReport(data, container);
      break;
    case 'inventory':
      displayInventoryReport(data, container);
      break;
    case 'customers':
      displayCustomerReport(data, container);
      break;
    case 'transactions':
      displayTransactionReport(data, container);
      break;
  }
}

/**
 * Display sales report
 */
function displaySalesReport(data, container) {
  const stats = data.stats;

  container.innerHTML = `
    <!-- Statistics Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--primary);">
          <i class="fas fa-shopping-cart"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">${stats.totalOrders}</div>
          <div class="stat-label">Total Orders</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--success);">
          <i class="fas fa-dollar-sign"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">₱${stats.totalRevenue.toFixed(2)}</div>
          <div class="stat-label">Total Revenue</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--info);">
          <i class="fas fa-chart-line"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">₱${stats.averageOrderValue.toFixed(2)}</div>
          <div class="stat-label">Avg. Order Value</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--warning);">
          <i class="fas fa-tag"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">₱${stats.totalDiscount.toFixed(2)}</div>
          <div class="stat-label">Total Discounts</div>
        </div>
      </div>
    </div>

    <!-- Top Products -->
    <div class="card" style="margin-bottom: 2rem;">
      <div class="card-header">
        <h3><i class="fas fa-trophy"></i> Top Selling Products</h3>
      </div>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Product</th>
              <th>Quantity Sold</th>
            </tr>
          </thead>
          <tbody>
            ${stats.topProducts.map((product, index) => `
              <tr>
                <td><strong>#${index + 1}</strong></td>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Orders by Status -->
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-chart-pie"></i> Orders by Status</h3>
      </div>
      <div style="padding: 1.5rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
          ${Object.entries(stats.ordersByStatus).map(([status, count]) => `
            <div style="text-align: center; padding: 1rem; background: var(--background); border-radius: 0.5rem;">
              <div style="font-size: 2rem; font-weight: bold; color: var(--primary);">${count}</div>
              <div style="text-transform: capitalize; color: var(--text-muted);">${status}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Display inventory report
 */
function displayInventoryReport(data, container) {
  const stats = data.stats;

  container.innerHTML = `
    <!-- Statistics Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--primary);">
          <i class="fas fa-boxes"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">${stats.totalProducts}</div>
          <div class="stat-label">Total Products</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--success);">
          <i class="fas fa-dollar-sign"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">₱${stats.totalValue.toFixed(2)}</div>
          <div class="stat-label">Total Value</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--warning);">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">${stats.lowStockItems}</div>
          <div class="stat-label">Low Stock Items</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--error);">
          <i class="fas fa-times-circle"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">${stats.outOfStockItems}</div>
          <div class="stat-label">Out of Stock</div>
        </div>
      </div>
    </div>

    <!-- Products Table -->
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-list"></i> Product Inventory</h3>
      </div>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.products.map(product => {
              const value = product.stock * product.price;
              const status = product.stock === 0 ? 'Out of Stock' : 
                           product.stock <= product.minStock ? 'Low Stock' : 'In Stock';
              const statusClass = product.stock === 0 ? 'badge-error' : 
                                product.stock <= product.minStock ? 'badge-warning' : 'badge-success';
              
              return `
                <tr>
                  <td>${product.name}</td>
                  <td style="text-transform: capitalize;">${product.category}</td>
                  <td>${product.stock} ${product.unit}</td>
                  <td>₱${product.price.toFixed(2)}</td>
                  <td>₱${value.toFixed(2)}</td>
                  <td><span class="badge ${statusClass}">${status}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Display customer report
 */
function displayCustomerReport(data, container) {
  const stats = data.stats;

  container.innerHTML = `
    <!-- Statistics Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--primary);">
          <i class="fas fa-users"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">${stats.totalCustomers}</div>
          <div class="stat-label">Total Customers</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--success);">
          <i class="fas fa-dollar-sign"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">₱${stats.totalRevenue.toFixed(2)}</div>
          <div class="stat-label">Total Revenue</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--info);">
          <i class="fas fa-shopping-cart"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">${stats.averageOrdersPerCustomer.toFixed(1)}</div>
          <div class="stat-label">Avg. Orders/Customer</div>
        </div>
      </div>
    </div>

    <!-- Customers Table -->
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-list"></i> Customer Details</h3>
      </div>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Email</th>
              <th>Role</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Avg. Order Value</th>
              <th>Last Order</th>
            </tr>
          </thead>
          <tbody>
            ${data.customers.map(customer => `
              <tr>
                <td>${customer.business_name || customer.username}</td>
                <td>${customer.email}</td>
                <td><span class="badge badge-info" style="text-transform: uppercase;">${customer.role}</span></td>
                <td>${customer.orderCount}</td>
                <td>₱${customer.totalSpent.toFixed(2)}</td>
                <td>₱${customer.averageOrderValue.toFixed(2)}</td>
                <td>${customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'Never'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Display transaction report
 */
function displayTransactionReport(data, container) {
  const stats = data.stats;

  container.innerHTML = `
    <!-- Statistics Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--primary);">
          <i class="fas fa-receipt"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">${stats.totalTransactions}</div>
          <div class="stat-label">Total Transactions</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--success);">
          <i class="fas fa-dollar-sign"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">₱${stats.totalAmount.toFixed(2)}</div>
          <div class="stat-label">Total Amount</div>
        </div>
      </div>
    </div>

    <!-- Transactions Table -->
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-list"></i> Transaction Details</h3>
      </div>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.transactions.map(transaction => `
              <tr>
                <td><strong>${transaction.orderNumber}</strong></td>
                <td>${transaction.customer?.username || 'N/A'}</td>
                <td>${new Date(transaction.createdAt).toLocaleDateString()}</td>
                <td>₱${transaction.totalAmount.toFixed(2)}</td>
                <td style="text-transform: capitalize;">${transaction.payment.method.replace('_', ' ')}</td>
                <td><span class="badge badge-${getStatusColor(transaction.status)}" style="text-transform: capitalize;">${transaction.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Get status color for badge
 */
function getStatusColor(status) {
  const colors = {
    'pending': 'warning',
    'confirmed': 'info',
    'packed': 'info',
    'shipped': 'primary',
    'delivered': 'success',
    'cancelled': 'error',
    'refunded': 'secondary'
  };
  return colors[status] || 'secondary';
}

/**
 * Export report as CSV
 */
async function exportReport() {
  const startDate = document.getElementById('reportStartDate').value;
  const endDate = document.getElementById('reportEndDate').value;

  if (!startDate || !endDate) {
    showToast('Please select date range', 'error');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/reports/export/csv?type=${currentReportType}&startDate=${startDate}&endDate=${endDate}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${currentReportType}-report-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showToast('Report exported successfully!', 'success');
    } else {
      showToast('Failed to export report', 'error');
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    showToast('Error exporting report', 'error');
  }
}
