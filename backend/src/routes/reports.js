const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const reportsController = require('../controllers/reportsController');

// @route   GET /api/reports/sales
// @desc    Get sales report
// @access  Private (Admin/Staff)
router.get('/sales', protect, authorize('admin', 'staff'), reportsController.getSalesReport);

// @route   GET /api/reports/inventory
// @desc    Get inventory report
// @access  Private (Admin/Staff)
router.get('/inventory', protect, authorize('admin', 'staff', 'b2b'), reportsController.getInventoryReport);

// @route   GET /api/reports/customers
// @desc    Get customer report
// @access  Private (Admin/Staff)
router.get('/customers', protect, authorize('admin', 'staff'), reportsController.getCustomerReport);

// @route   GET /api/reports/transactions
// @desc    Get transaction report
// @access  Private (Admin/Staff)
router.get('/transactions', protect, authorize('admin', 'staff'), reportsController.getTransactionReport);

// @route   GET /api/reports/export/csv
// @desc    Export report as CSV
// @access  Private (Admin/Staff)
router.get('/export/csv', protect, authorize('admin', 'staff'), reportsController.exportCSV);

module.exports = router;
