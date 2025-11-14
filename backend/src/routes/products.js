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
router.get('/featured-ad', async (req, res) => {
  try {
    const Product = require('../models/Product');
    const Promotion = require('../models/Promotion');
    
    console.log('=== FEATURED AD REQUEST ===');
    
    // Try to get a product with active promotion first
    const activePromotions = await Promotion.find({
      status: 'active',
      'validity.startDate': { $lte: new Date() },
      'validity.endDate': { $gte: new Date() }
    }).limit(1);
    
    console.log('Active promotions found:', activePromotions.length);
    
    if (activePromotions.length > 0) {
      const promo = activePromotions[0];
      let product = null;
      
      // Get a product from the promotion (prefer products with images)
      if (promo.rules?.products && promo.rules.products.length > 0) {
        product = await Product.findById(promo.rules.products[0])
          .where('isActive').equals(true)
          .where('stock').gt(0);
      } else if (promo.rules?.categories && promo.rules.categories.length > 0) {
        // Try to find product with images first
        product = await Product.findOne({
          category: { $in: promo.rules.categories },
          isActive: true,
          stock: { $gt: 0 },
          images: { $exists: true, $ne: [] }
        });
        
        // Fallback to any product in category
        if (!product) {
          product = await Product.findOne({
            category: { $in: promo.rules.categories },
            isActive: true,
            stock: { $gt: 0 }
          });
        }
      } else {
        // No specific products/categories - get any product with images
        product = await Product.findOne({
          isActive: true,
          stock: { $gt: 0 },
          images: { $exists: true, $ne: [] }
        }).sort({ createdAt: -1 });
      }
      
      if (product) {
        console.log('Product found with promotion:', product.name);
        console.log('Product images:', product.images);
        
        const productObj = product.toObject();
        
        // Calculate discount using new model structure
        let discountedPrice = product.price;
        if (promo.discount?.type === 'percentage') {
          discountedPrice = product.price * (1 - promo.discount.value / 100);
        } else if (promo.discount?.type === 'fixed_amount') {
          discountedPrice = Math.max(0, product.price - promo.discount.value);
        }
        
        productObj.originalPrice = product.price;
        productObj.price = discountedPrice;
        productObj.discount = promo.discount?.value || 0;
        productObj.discountType = promo.discount?.type || 'percentage';
        productObj.validUntil = promo.validity?.endDate;
        productObj.promotionName = promo.name;
        
        console.log('Returning product with images:', productObj.images);
        return res.json({ product: productObj });
      }
    }
    
    // Fallback: get a product with images (prefer recent products)
    console.log('No promotion, looking for featured product...');
    let featuredProduct = await Product.findOne({
      isActive: true,
      stock: { $gt: 0 },
      images: { $exists: true, $ne: [] }
    }).sort({ createdAt: -1 });
    
    console.log('Featured product with images:', featuredProduct ? featuredProduct.name : 'none');
    
    // If no product with images, get any product
    if (!featuredProduct) {
      console.log('No product with images, getting any product...');
      featuredProduct = await Product.findOne({
        isActive: true,
        stock: { $gt: 0 }
      }).sort({ createdAt: -1 });
    }
    
    if (featuredProduct) {
      console.log('Returning product:', featuredProduct.name);
      console.log('Product images:', featuredProduct.images);
      return res.json({ product: featuredProduct });
    }
    
    console.log('No products found at all');
    res.status(404).json({ message: 'No featured products available' });
  } catch (error) {
    console.error('Featured ad error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

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
