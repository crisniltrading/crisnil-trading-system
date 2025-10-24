const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductAnalytics,
  bulkUpdateProducts,
  bulkDeleteProducts,
  uploadProductImage,
  deleteProductImage
} = require('../controllers/productController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateProduct } = require('../middleware/validation');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes (no authentication required for browsing products)
router.get('/', getProducts);

// All other routes require authentication
router.use(protect);

// Bulk operations (must be before /:id routes to avoid conflicts)
router.post('/bulk/update', restrictTo('admin', 'staff', 'b2b'), bulkUpdateProducts);
router.post('/bulk/delete', restrictTo('admin', 'staff', 'b2b'), bulkDeleteProducts);

// Product detail routes
router.get('/:id', getProduct);
router.get('/:id/analytics', getProductAnalytics);

// Admin and staff only routes
router.use(restrictTo('admin', 'staff', 'b2b'));

router.post('/', validateProduct, createProduct);
router.put('/:id', validateProduct, updateProduct);

// Image upload routes
router.post('/:id/images', upload.single('image'), uploadProductImage);
router.delete('/:id/images/:imageId', deleteProductImage);

// Delete product - Admin ONLY (hard delete with audit log)
router.delete('/:id', restrictTo('admin'), deleteProduct);

module.exports = router;
