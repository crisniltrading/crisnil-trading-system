// ============================================================================
// REPORTS MODULE
// ============================================================================

async function loadReportsPage() {
    const container = document.getElementById('reportsSection');
    if (!container) return;

    container.innerHTML = `
        <div class="reports-container">
            <div class="section-header">
                <h2><i class="fas fa-chart-line"></i> Business Reports & Analytics</h2>
                <p>Generate comprehensive reports for your business insights</p>
            </div>

            <!-- Report Type Selection -->
            <div class="report-types">
                <div class="report-card" onclick="generateSalesReport()">
                    <div class="report-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <h3>Sales Report</h3>
                    <p>Revenue, orders, and sales trends</p>
                    <button class="btn btn-primary btn-sm">
                        <i class="fas fa-file-download"></i> Generate
                    </button>
                </div>

                <div class="report-card" onclick="generateInventoryReport()">
                    <div class="report-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        <i class="fas fa-boxes"></i>
                    </div>
                    <h3>Inventory Report</h3>
                    <p>Stock levels, low stock alerts</p>
                    <button class="btn btn-primary btn-sm">
                        <i class="fas fa-file-download"></i> Generate
                    </button>
                </div>

                <div class="report-card" onclick="generateProductReport()">
                    <div class="report-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <h3>Product Performance</h3>
                    <p>Best sellers, product analytics</p>
                    <button class="btn btn-primary btn-sm">
                        <i class="fas fa-file-download"></i> Generate
                    </button>
                </div>

                <div class="report-card" onclick="generateCustomerReport()">
                    <div class="report-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                        <i class="fas fa-users"></i>
                    </div>
                    <h3>Customer Report</h3>
                    <p>Customer activity and insights</p>
                    <button class="btn btn-primary btn-sm">
                        <i class="fas fa-file-download"></i> Generate
                    </button>
                </div>

                <div class="report-card" onclick="generateExpiryReport()">
                    <div class="report-icon" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);">
                        <i class="fas fa-calendar-times"></i>
                    </div>
                    <h3>Expiry Report</h3>
                    <p>Near expiry and expired items</p>
                    <button class="btn btn-primary btn-sm">
                        <i class="fas fa-file-download"></i> Generate
                    </button>
                </div>

                <div class="report-card" onclick="generateFinancialReport()">
                    <div class="report-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                        <i class="fas fa-chart-pie"></i>
                    </div>
                    <h3>Financial Summary</h3>
                    <p>Profit, expenses, and margins</p>
                    <button class="btn btn-primary btn-sm">
                        <i class="fas fa-file-download"></i> Generate
                    </button>
                </div>
            </div>

            <!-- Report Display Area -->
            <div id="reportDisplay" style="margin-top: 2rem; display: none;">
                <div class="card">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 id="reportTitle">Report</h3>
                        <div>
                            <button class="btn btn-sm btn-secondary" onclick="printReport()">
                                <i class="fas fa-print"></i> Print
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="downloadReportPDF()">
                                <i class="fas fa-file-pdf"></i> Download PDF
                            </button>
                        </div>
                    </div>
                    <div class="card-body" id="reportContent">
                        <!-- Report content will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add styles
    addReportStyles();
}

function addReportStyles() {
    if (document.getElementById('reportStyles')) return;

    const style = document.createElement('style');
    style.id = 'reportStyles';
    style.textContent = `
        .reports-container {
            padding: 2rem;
        }

        .report-types {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }

        .report-card {
            background: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }

        .report-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
            border-color: var(--primary);
        }

        .report-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
            color: white;
            font-size: 2rem;
        }

        .report-card h3 {
            margin: 0.5rem 0;
            color: var(--text);
        }

        .report-card p {
            color: var(--text-muted);
            font-size: 0.9rem;
            margin-bottom: 1rem;
        }

        @media (max-width: 768px) {
            .report-types {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(style);
}

// Report Generation Functions
async function generateSalesReport() {
    showReportLoading('Sales Report');
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/reports/sales`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            displaySalesReport(data);
        } else {
            showToast('Failed to generate sales report', 'error');
        }
    } catch (error) {
        console.error('Sales report error:', error);
        showToast('Error generating report', 'error');
    }
}

async function generateInventoryReport() {
    showReportLoading('Inventory Report');
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/reports/inventory`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayInventoryReport(data);
        } else {
            showToast('Failed to generate inventory report', 'error');
        }
    } catch (error) {
        console.error('Inventory report error:', error);
        showToast('Error generating report', 'error');
    }
}

async function generateProductReport() {
    showReportLoading('Product Performance Report');
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/reports/sales`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayProductReport(data);
        } else {
            showToast('Failed to generate product report', 'error');
        }
    } catch (error) {
        console.error('Product report error:', error);
        showToast('Error generating report', 'error');
    }
}

async function generateCustomerReport() {
    showReportLoading('Customer Report');
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/reports/customers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayCustomerReport(data);
        } else {
            showToast('Failed to generate customer report', 'error');
        }
    } catch (error) {
        console.error('Customer report error:', error);
        showToast('Error generating report', 'error');
    }
}

async function generateExpiryReport() {
    showReportLoading('Expiry Report');
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/expiry/report`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayExpiryReport(data);
        } else {
            showToast('Failed to generate expiry report', 'error');
        }
    } catch (error) {
        console.error('Expiry report error:', error);
        showToast('Error generating report', 'error');
    }
}

async function generateFinancialReport() {
    showReportLoading('Financial Summary');
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/reports/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayFinancialReport(data);
        } else {
            showToast('Failed to generate financial report', 'error');
        }
    } catch (error) {
        console.error('Financial report error:', error);
        showToast('Error generating report', 'error');
    }
}

// Display Functions
function showReportLoading(title) {
    const display = document.getElementById('reportDisplay');
    const titleEl = document.getElementById('reportTitle');
    const content = document.getElementById('reportContent');

    titleEl.textContent = title;
    content.innerHTML = '<div style="text-align: center; padding: 3rem;"><i class="fas fa-spinner fa-spin fa-3x"></i><p>Generating report...</p></div>';
    display.style.display = 'block';
    display.scrollIntoView({ behavior: 'smooth' });
}

function displaySalesReport(data) {
    const stats = data.data.stats;
    const orders = data.data.orders;

    const content = document.getElementById('reportContent');
    content.innerHTML = `
        <div class="report-summary">
            <h4>Sales Summary</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0;">
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--success);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--success);">₱${stats.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Total Revenue</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--primary);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--primary);">${stats.totalOrders}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Total Orders</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--warning);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--warning);">₱${stats.averageOrderValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Avg Order Value</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--error);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--error);">₱${stats.totalDiscount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Total Discounts</div>
                </div>
            </div>

            <div style="margin-top: 2rem;">
                <h4>Top Products</h4>
                <div style="overflow-x: auto;">
                    <table class="table" style="width: 100%; margin-top: 1rem;">
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>Quantity Sold</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.topProducts.map(p => `
                                <tr>
                                    <td>${p.name}</td>
                                    <td>${p.quantity}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style="margin-top: 2rem;">
                <h4>Orders by Status</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem;">
                    ${Object.entries(stats.ordersByStatus).map(([status, count]) => `
                        <div style="padding: 1rem; background: var(--background); border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${count}</div>
                            <div style="color: var(--text-muted); text-transform: capitalize; margin-top: 0.5rem;">${status}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function displayInventoryReport(data) {
    const stats = data.data.stats;
    const products = data.data.products;

    const content = document.getElementById('reportContent');
    content.innerHTML = `
        <div class="report-summary">
            <h4>Inventory Summary</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0;">
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--primary);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--primary);">${stats.totalProducts}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Total Products</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--success);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--success);">₱${stats.totalValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Total Inventory Value</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--warning);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--warning);">${stats.lowStockItems}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Low Stock Items</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--error);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--error);">${stats.outOfStockItems}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Out of Stock</div>
                </div>
            </div>

            <div style="margin-top: 2rem;">
                <h5>Inventory by Category</h5>
                <div style="overflow-x: auto; margin-top: 1rem;">
                    <table class="table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Products</th>
                                <th>Total Stock</th>
                                <th>Total Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(stats.byCategory).map(([category, data]) => `
                                <tr>
                                    <td style="text-transform: capitalize;">${category}</td>
                                    <td>${data.count}</td>
                                    <td>${data.totalStock}</td>
                                    <td>₱${data.totalValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            ${stats.lowStockItems > 0 ? `
                <div style="margin-top: 2rem;">
                    <h5>Low Stock Alert</h5>
                    <div style="overflow-x: auto; margin-top: 1rem;">
                        <table class="table" style="width: 100%;">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Category</th>
                                    <th>Current Stock</th>
                                    <th>Min Stock</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${products.filter(p => p.stock <= p.minStock).slice(0, 10).map(p => `
                                    <tr>
                                        <td>${p.name}</td>
                                        <td style="text-transform: capitalize;">${p.category}</td>
                                        <td>${p.stock}</td>
                                        <td>${p.minStock || 10}</td>
                                        <td><span class="badge badge-${p.stock === 0 ? 'error' : 'warning'}">${p.stock === 0 ? 'Out of Stock' : 'Low Stock'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function displayExpiryReport(data) {
    const content = document.getElementById('reportContent');
    const reportData = data.data || data;

    content.innerHTML = `
        <div class="report-summary">
            <h4>Expiry Summary</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0;">
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--warning);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--warning);">${reportData.expiringSoon || 0}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Expiring Soon (30 days)</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--error);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--error);">${reportData.expired || 0}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Expired Items</div>
                </div>
            </div>
        </div>
    `;
}

function displayProductReport(data) {
    const stats = data.data.stats;
    const content = document.getElementById('reportContent');

    content.innerHTML = `
        <div class="report-summary">
            <h4>Product Performance</h4>
            <div style="margin-top: 1.5rem;">
                <h5>Top Selling Products</h5>
                <div style="overflow-x: auto; margin-top: 1rem;">
                    <table class="table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Product Name</th>
                                <th>Units Sold</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.topProducts.map((p, index) => `
                                <tr>
                                    <td><strong>#${index + 1}</strong></td>
                                    <td>${p.name}</td>
                                    <td>${p.quantity}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style="margin-top: 2rem;">
                <h5>Revenue by Category</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                    ${Object.entries(stats.revenueByCategory).map(([category, revenue]) => `
                        <div style="padding: 1.5rem; background: var(--background); border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">₱${revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                            <div style="color: var(--text-muted); text-transform: capitalize; margin-top: 0.5rem;">${category}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function displayCustomerReport(data) {
    const stats = data.data.stats;
    const customers = data.data.customers;

    const content = document.getElementById('reportContent');
    content.innerHTML = `
        <div class="report-summary">
            <h4>Customer Summary</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0;">
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--primary);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--primary);">${stats.totalCustomers}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Total Customers</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--success);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--success);">₱${stats.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Total Revenue</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--warning);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--warning);">${stats.averageOrdersPerCustomer.toFixed(1)}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Avg Orders/Customer</div>
                </div>
            </div>

            <div style="margin-top: 2rem;">
                <h5>Top Customers</h5>
                <div style="overflow-x: auto; margin-top: 1rem;">
                    <table class="table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Orders</th>
                                <th>Total Spent</th>
                                <th>Avg Order Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${customers.slice(0, 10).sort((a, b) => b.totalSpent - a.totalSpent).map(c => `
                                <tr>
                                    <td>${c.business_name || c.username}</td>
                                    <td>${c.orderCount}</td>
                                    <td>₱${c.totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                    <td>₱${c.averageOrderValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function displayFinancialReport(data) {
    const stats = data.data.stats;
    const transactions = data.data.transactions;

    const content = document.getElementById('reportContent');
    content.innerHTML = `
        <div class="report-summary">
            <h4>Financial Summary</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0;">
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--success);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--success);">₱${stats.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Total Amount</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05)); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--primary);">
                    <div class="stat-value" style="font-size: 2rem; font-weight: bold; color: var(--primary);">${stats.totalTransactions}</div>
                    <div class="stat-label" style="color: var(--text-muted); margin-top: 0.5rem;">Total Transactions</div>
                </div>
            </div>

            <div style="margin-top: 2rem;">
                <h5>Payment Methods</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                    ${Object.entries(stats.byPaymentMethod).map(([method, data]) => `
                        <div style="padding: 1.5rem; background: var(--background); border-radius: 8px;">
                            <div style="font-size: 1.2rem; font-weight: bold; color: var(--text); text-transform: capitalize; margin-bottom: 0.5rem;">${method}</div>
                            <div style="color: var(--text-muted); margin-bottom: 0.25rem;">${data.count} transactions</div>
                            <div style="font-size: 1.3rem; font-weight: bold; color: var(--primary);">₱${data.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="margin-top: 2rem;">
                <h5>Recent Transactions</h5>
                <div style="overflow-x: auto; margin-top: 1rem;">
                    <table class="table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Payment Method</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions.slice(0, 20).map(t => `
                                <tr>
                                    <td>${t.orderNumber}</td>
                                    <td>${t.customer?.business_name || t.customer?.username || 'N/A'}</td>
                                    <td>₱${t.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                    <td style="text-transform: capitalize;">${t.payment.method}</td>
                                    <td><span class="badge badge-${t.status === 'completed' ? 'success' : t.status === 'pending' ? 'warning' : 'info'}">${t.status}</span></td>
                                    <td>${new Date(t.createdAt).toLocaleDateString('en-PH')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function printReport() {
    window.print();
}

function downloadReportPDF() {
    showToast('PDF download coming soon!', 'info');
}
