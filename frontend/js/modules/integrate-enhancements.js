// Auto-integration script for supplier enhancements
// Add this script AFTER supplier-management.js and product-loading-fix.js

(function() {
    console.log('🚀 Integrating supplier enhancements...');

    // Override the original functions with enhanced versions
    if (typeof window.updateSupplierList !== 'undefined') {
        const originalUpdateSupplierList = window.updateSupplierList;
        window.updateSupplierList = function(productId) {
            if (typeof updateSupplierListEnhanced !== 'undefined') {
                updateSupplierListEnhanced(productId);
            } else {
                originalUpdateSupplierList(productId);
            }
        };
        console.log('✅ updateSupplierList enhanced');
    }

    // Override selectSupplier to handle manual entry
    if (typeof window.selectSupplier !== 'undefined') {
        const originalSelectSupplier = window.selectSupplier;
        window.selectSupplier = function(cardElement) {
            // Check if it's the manual supplier card
            if (cardElement.classList.contains('manual-supplier')) {
                if (typeof handleManualSupplierEntry !== 'undefined') {
                    handleManualSupplierEntry();
                }
                return;
            }
            
            // Use original logic for regular suppliers
            document.querySelectorAll('.supplier-card').forEach(card => {
                card.style.borderColor = 'var(--border)';
                card.style.background = 'var(--background-alt)';
                const radio = card.querySelector('input[type="radio"]');
                if (radio) radio.checked = false;
            });

            cardElement.style.borderColor = 'var(--success)';
            cardElement.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))';
            const radio = cardElement.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;

            const supplier = JSON.parse(cardElement.dataset.supplier);
            const quantity = parseInt(document.getElementById('orderQuantity')?.value) || 50;
            
            if (typeof updateEstimatedCostEnhanced !== 'undefined') {
                updateEstimatedCostEnhanced(quantity, supplier);
            } else if (typeof window.updateEstimatedCost !== 'undefined') {
                window.updateEstimatedCost(quantity, supplier);
            }
        };
        console.log('✅ selectSupplier enhanced');
    }

    // Override updateEstimatedCost
    if (typeof window.updateEstimatedCost !== 'undefined') {
        window.updateEstimatedCost = function(quantity, supplier = null) {
            if (typeof updateEstimatedCostEnhanced !== 'undefined') {
                updateEstimatedCostEnhanced(quantity, supplier);
            }
        };
        console.log('✅ updateEstimatedCost enhanced');
    }

    // Update SUPPLIERS constant to use the database
    if (typeof SUPPLIER_DATABASE !== 'undefined') {
        window.SUPPLIERS = SUPPLIER_DATABASE;
        console.log('✅ SUPPLIERS updated to use database');
    }

    // Patch createPurchaseOrder to use immediate loading
    const originalCreatePurchaseOrder = window.createPurchaseOrder;
    if (originalCreatePurchaseOrder) {
        window.createPurchaseOrder = function(productId) {
            // Call original function
            originalCreatePurchaseOrder(productId);
            
            // Replace the setTimeout with immediate loading
            setTimeout(() => {
                if (typeof loadProductsForRestockImmediate !== 'undefined') {
                    loadProductsForRestockImmediate(productId);
                    console.log('✅ Using immediate product loading');
                }
            }, 50); // Small delay to ensure DOM is ready
        };
        console.log('✅ createPurchaseOrder patched');
    }

    // Add supplier management button to inventory page if not exists
    function addSupplierManagementButton() {
        const inventorySection = document.querySelector('#inventory-section');
        if (inventorySection && !document.getElementById('supplierManagementBtn')) {
            const headerActions = inventorySection.querySelector('.section-header .header-actions');
            if (headerActions) {
                const btn = document.createElement('button');
                btn.id = 'supplierManagementBtn';
                btn.className = 'btn btn-secondary';
                btn.innerHTML = '<i class="fas fa-users-cog"></i> Manage Suppliers';
                btn.onclick = openSupplierManagement;
                headerActions.insertBefore(btn, headerActions.firstChild);
                console.log('✅ Supplier management button added');
            }
        }
    }

    // Try to add button when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addSupplierManagementButton);
    } else {
        addSupplierManagementButton();
    }

    // Add keyboard shortcut for supplier management (Ctrl+Shift+S)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            if (typeof openSupplierManagement !== 'undefined') {
                openSupplierManagement();
                console.log('🔑 Supplier management opened via keyboard shortcut');
            }
        }
    });

    console.log('✨ Supplier enhancements integrated successfully!');
    console.log('💡 Press Ctrl+Shift+S to open supplier management');
})();
