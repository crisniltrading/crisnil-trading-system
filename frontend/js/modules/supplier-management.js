// Enhanced Supplier Management System
// Allows manual supplier input and better product loading

// Supplier database - can be managed by admin
let SUPPLIER_DATABASE = JSON.parse(localStorage.getItem('supplierDatabase') || 'null') || {
    seafood: [
        { name: 'Ocean Fresh Suppliers', contact: '+63 917 123 4567', email: 'orders@oceanfresh.ph', rating: 4.8, pricePerUnit: 45 },
        { name: 'Manila Bay Seafood Co.', contact: '+63 918 234 5678', email: 'sales@manilabayseafood.com', rating: 4.6, pricePerUnit: 48 },
        { name: 'Pacific Marine Products', contact: '+63 919 345 6789', email: 'info@pacificmarine.ph', rating: 4.7, pricePerUnit: 50 }
    ],
    meat: [
        { name: 'Prime Meat Distributors', contact: '+63 920 456 7890', email: 'orders@primemeat.ph', rating: 4.9, pricePerUnit: 55 },
        { name: 'Quality Meats Inc.', contact: '+63 921 567 8901', email: 'sales@qualitymeats.com', rating: 4.5, pricePerUnit: 52 },
        { name: 'Fresh Cuts Wholesale', contact: '+63 922 678 9012', email: 'info@freshcuts.ph', rating: 4.7, pricePerUnit: 50 }
    ],
    vegetables: [
        { name: 'Farm Fresh Vegetables', contact: '+63 923 789 0123', email: 'orders@farmfresh.ph', rating: 4.8, pricePerUnit: 30 },
        { name: 'Green Valley Produce', contact: '+63 924 890 1234', email: 'sales@greenvalley.com', rating: 4.6, pricePerUnit: 28 },
        { name: 'Organic Harvest Co.', contact: '+63 925 901 2345', email: 'info@organicharvest.ph', rating: 4.9, pricePerUnit: 35 }
    ],
    dairy: [
        { name: 'Dairy Best Suppliers', contact: '+63 926 012 3456', email: 'orders@dairybest.ph', rating: 4.7, pricePerUnit: 40 },
        { name: 'Fresh Milk Products', contact: '+63 927 123 4567', email: 'sales@freshmilk.com', rating: 4.5, pricePerUnit: 38 },
        { name: 'Premium Dairy Inc.', contact: '+63 928 234 5678', email: 'info@premiumdairy.ph', rating: 4.8, pricePerUnit: 42 }
    ]
};

// Save supplier database to localStorage
function saveSupplierDatabase() {
    localStorage.setItem('supplierDatabase', JSON.stringify(SUPPLIER_DATABASE));
}

// Open supplier management modal
function openSupplierManagement() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1001;
    `;

    const categories = Object.keys(SUPPLIER_DATABASE);
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h3><i class="fas fa-users-cog"></i> Manage Suppliers</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                    <button type="button" class="btn btn-primary" onclick="addNewSupplier()">
                        <i class="fas fa-plus"></i> Add New Supplier
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="addNewCategory()">
                        <i class="fas fa-folder-plus"></i> Add Category
                    </button>
                </div>

                <div id="supplierManagementContent">
                    ${categories.map(category => `
                        <div class="supplier-category-section" style="margin-bottom: 2rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--primary);">
                                <h4 style="margin: 0; text-transform: capitalize;">
                                    <i class="fas fa-tag"></i> ${category}
                                </h4>
                                <button type="button" class="btn btn-sm btn-primary" onclick="addSupplierToCategory('${category}')">
                                    <i class="fas fa-plus"></i> Add Supplier
                                </button>
                            </div>
                            <div style="display: grid; gap: 1rem;">
                                ${SUPPLIER_DATABASE[category].map((supplier, index) => `
                                    <div style="background: var(--background-alt); padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--primary);">
                                        <div style="display: flex; justify-content: space-between; align-items: start;">
                                            <div style="flex: 1;">
                                                <h5 style="margin: 0 0 0.5rem 0;">${supplier.name}</h5>
                                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.875rem; color: var(--text-muted);">
                                                    <div><i class="fas fa-phone"></i> ${supplier.contact}</div>
                                                    <div><i class="fas fa-envelope"></i> ${supplier.email}</div>
                                                    <div><i class="fas fa-star"></i> Rating: ${supplier.rating}/5.0</div>
                                                    <div><i class="fas fa-money-bill"></i> ₱${supplier.pricePerUnit}/unit</div>
                                                </div>
                                            </div>
                                            <div style="display: flex; gap: 0.5rem;">
                                                <button type="button" class="btn btn-sm btn-secondary" onclick="editSupplier('${category}', ${index})">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button type="button" class="btn btn-sm btn-danger" onclick="deleteSupplier('${category}', ${index})">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Add new supplier to category
function addSupplierToCategory(category) {
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
                <h3><i class="fas fa-plus"></i> Add Supplier to ${category}</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="addSupplierForm">
                    <div class="form-group">
                        <label>Supplier Name *</label>
                        <input type="text" name="name" class="form-input" required placeholder="e.g., Fresh Seafood Co.">
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
                        <label>Rating (1-5)</label>
                        <input type="number" name="rating" class="form-input" min="1" max="5" step="0.1" value="4.5" required>
                    </div>
                    <div class="form-group">
                        <label>Price Per Unit (₱)</label>
                        <input type="number" name="pricePerUnit" class="form-input" min="0" step="0.01" value="50" required>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-save"></i> Add Supplier
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

    modal.querySelector('#addSupplierForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const newSupplier = {
            name: formData.get('name'),
            contact: formData.get('contact'),
            email: formData.get('email'),
            rating: parseFloat(formData.get('rating')),
            pricePerUnit: parseFloat(formData.get('pricePerUnit'))
        };

        if (!SUPPLIER_DATABASE[category]) {
            SUPPLIER_DATABASE[category] = [];
        }

        SUPPLIER_DATABASE[category].push(newSupplier);
        saveSupplierDatabase();
        
        modal.remove();
        showToast('Supplier added successfully!', 'success');
        
        // Refresh supplier management modal if open
        const managementModal = document.querySelector('.modal-overlay');
        if (managementModal) {
            managementModal.remove();
            openSupplierManagement();
        }
    });
}

// Edit existing supplier
function editSupplier(category, index) {
    const supplier = SUPPLIER_DATABASE[category][index];
    
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
                <h3><i class="fas fa-edit"></i> Edit Supplier</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editSupplierForm">
                    <div class="form-group">
                        <label>Supplier Name *</label>
                        <input type="text" name="name" class="form-input" required value="${supplier.name}">
                    </div>
                    <div class="form-group">
                        <label>Contact Number *</label>
                        <input type="tel" name="contact" class="form-input" required value="${supplier.contact}">
                    </div>
                    <div class="form-group">
                        <label>Email Address *</label>
                        <input type="email" name="email" class="form-input" required value="${supplier.email}">
                    </div>
                    <div class="form-group">
                        <label>Rating (1-5)</label>
                        <input type="number" name="rating" class="form-input" min="1" max="5" step="0.1" value="${supplier.rating}" required>
                    </div>
                    <div class="form-group">
                        <label>Price Per Unit (₱)</label>
                        <input type="number" name="pricePerUnit" class="form-input" min="0" step="0.01" value="${supplier.pricePerUnit}" required>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-save"></i> Save Changes
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

    modal.querySelector('#editSupplierForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        SUPPLIER_DATABASE[category][index] = {
            name: formData.get('name'),
            contact: formData.get('contact'),
            email: formData.get('email'),
            rating: parseFloat(formData.get('rating')),
            pricePerUnit: parseFloat(formData.get('pricePerUnit'))
        };

        saveSupplierDatabase();
        modal.remove();
        showToast('Supplier updated successfully!', 'success');
        
        // Refresh supplier management modal
        const managementModal = document.querySelector('.modal-overlay');
        if (managementModal) {
            managementModal.remove();
            openSupplierManagement();
        }
    });
}

// Delete supplier
function deleteSupplier(category, index) {
    if (confirm('Are you sure you want to delete this supplier?')) {
        SUPPLIER_DATABASE[category].splice(index, 1);
        saveSupplierDatabase();
        showToast('Supplier deleted successfully!', 'success');
        
        // Refresh supplier management modal
        const managementModal = document.querySelector('.modal-overlay');
        if (managementModal) {
            managementModal.remove();
            openSupplierManagement();
        }
    }
}

// Add new category
function addNewCategory() {
    const categoryName = prompt('Enter new category name:');
    if (categoryName && categoryName.trim()) {
        const normalizedName = categoryName.trim().toLowerCase();
        if (SUPPLIER_DATABASE[normalizedName]) {
            showToast('Category already exists!', 'error');
            return;
        }
        
        SUPPLIER_DATABASE[normalizedName] = [];
        saveSupplierDatabase();
        showToast('Category added successfully!', 'success');
        
        // Refresh supplier management modal
        const managementModal = document.querySelector('.modal-overlay');
        if (managementModal) {
            managementModal.remove();
            openSupplierManagement();
        }
    }
}

// Get suppliers for a category
function getSuppliersForCategory(category) {
    return SUPPLIER_DATABASE[category] || SUPPLIER_DATABASE.seafood || [];
}

// Export for use in main script
window.SUPPLIER_DATABASE = SUPPLIER_DATABASE;
window.openSupplierManagement = openSupplierManagement;
window.addSupplierToCategory = addSupplierToCategory;
window.editSupplier = editSupplier;
window.deleteSupplier = deleteSupplier;
window.addNewCategory = addNewCategory;
window.getSuppliersForCategory = getSuppliersForCategory;
window.saveSupplierDatabase = saveSupplierDatabase;
