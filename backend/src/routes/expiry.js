const express = require('express');
const router = express.Router();
const expiryController = require('../controllers/expiryController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin/staff role
router.use(protect);
router.use(authorize('admin', 'staff'));

// Expiry dashboard and monitoring
router.get('/dashboard', expiryController.getExpiryDashboard);
router.get('/products', expiryController.getExpiringProducts);

// Manual actions
router.post('/apply-discounts', expiryController.applyExpiryDiscounts);
router.post('/cleanup-expired', expiryController.cleanupExpiredBatches);

// Batch management
router.post('/products/:id/batches', expiryController.addBatchInfo);
router.put('/products/:id/batches/:batchId', expiryController.updateBatchInfo);
router.delete('/products/:id/batches/:batchId', expiryController.deleteBatchInfo);

module.exports = router;
