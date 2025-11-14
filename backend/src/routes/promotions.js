const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const Promotion = require('../models/Promotion');
const { body, validationResult } = require('express-validator');

// Import discount service with error handling
let discountService;
try {
  discountService = require('../services/discountService');
} catch (error) {
  console.warn('⚠️  Discount service not available in routes:', error.message);
  discountService = null;
}

const router = express.Router();

// Validation middleware
const validateDiscountCalculation = [
  body('cartItems').isArray().withMessage('Cart items must be an array'),
  body('cartItems.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('cartItems.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('customerType').optional().isIn(['all', 'new', 'returning', 'vip']).withMessage('Invalid customer type')
];

const validatePromotionCreation = [
  body('name').notEmpty().withMessage('Promotion name is required'),
  body('category').optional().isIn(['bulk', 'expiry', 'seasonal', 'flash_sale', 'clearance', 'loyalty', 'special']).withMessage('Invalid promotion category'),
  body('validity.startDate').isISO8601().withMessage('Invalid start date'),
  body('validity.endDate').isISO8601().withMessage('Invalid end date'),
  body('discount.type').isIn(['percentage', 'fixed_amount', 'per_unit', 'bogo']).withMessage('Invalid discount type'),
  body('discount.value').isFloat({ min: 0 }).withMessage('Discount value must be a positive number')
];

// Auth required for all
router.use(protect);

// POST /api/promotions/calculate - Calculate discounts for cart items
router.post('/calculate', validateDiscountCalculation, async (req, res) => {
  try {
    if (!discountService) {
      return res.status(503).json({
        status: 'error',
        message: 'Discount service not available'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { cartItems, customerType = 'all' } = req.body;
    const userId = req.user ? req.user._id : null;

    const result = await discountService.calculateCartDiscounts(cartItems, {
      customerType,
      userId
    });

    if (result.success) {
      res.status(200).json({
        status: 'success',
        data: result.data,
        message: result.message
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Calculate discounts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to calculate discounts'
    });
  }
});

// GET /api/promotions/available/:productIds - Get available discounts for products
router.get('/available/:productIds', async (req, res) => {
  try {
    const productIds = req.params.productIds.split(',');
    const quantity = parseInt(req.query.quantity) || 1;

    const result = await discountService.getAvailableDiscounts(productIds, quantity);

    if (result.success) {
      res.status(200).json({
        status: 'success',
        data: result.data
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Get available discounts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch available discounts'
    });
  }
});

// GET /api/promotions - list all promotions
router.get('/', async (req, res) => {
  try {
    const promos = await Promotion.find().sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: promos });
  } catch (e) {
    console.error('List promotions error', e);
    res.status(500).json({ status: 'error', message: 'Failed to fetch promotions' });
  }
});

// GET /api/promotions/active - list active promotions
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const promos = await Promotion.find({
      status: 'active',
      'validity.startDate': { $lte: now },
      'validity.endDate': { $gte: now }
    })
      .sort({ createdAt: -1 })
      .populate('rules.products', 'name price unit category');

    res.status(200).json({ status: 'success', promotions: promos });
  } catch (e) {
    console.error('List promotions error', e);
    res.status(500).json({ status: 'error', message: 'Failed to fetch promotions' });
  }
});

// POST /api/promotions/apply-coupon - Apply a coupon code
router.post('/apply-coupon', async (req, res) => {
  try {
    const { code, cartItems } = req.body;
    
    if (!code) {
      return res.status(400).json({
        status: 'error',
        message: 'Coupon code is required'
      });
    }
    
    const result = await discountService.applyCouponCode(code, cartItems, {
      customerId: req.user._id,
      customerType: req.user.role
    });
    
    if (result.success) {
      res.status(200).json({
        status: 'success',
        data: result.data,
        message: result.message
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to apply coupon'
    });
  }
});

// GET /api/promotions/analytics - Get discount analytics
router.get('/analytics', async (req, res) => {
  try {
    const timeRange = parseInt(req.query.days) || 30;
    const result = await discountService.getDiscountAnalytics(timeRange);

    if (result.success) {
      res.status(200).json({
        status: 'success',
        data: result.data
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch analytics'
    });
  }
});

// Admin/staff only
router.use(restrictTo('admin', 'staff'));

// POST /api/promotions/setup-automatic - Setup automatic discount promotions
router.post('/setup-automatic', async (req, res) => {
  try {
    const { createBulkDiscount = true, createExpiryDiscount = true } = req.body;
    const userId = req.user._id;

    const result = await discountService.setupAutomaticDiscounts({
      createBulkDiscount,
      createExpiryDiscount,
      userId
    });

    if (result.success) {
      res.status(201).json({
        status: 'success',
        data: result.data,
        message: result.message
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Setup automatic discounts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to setup automatic discounts'
    });
  }
});

// POST /api/promotions/generate-expiry - Generate expiry promotions
router.post('/generate-expiry', async (req, res) => {
  try {
    const generatedPromotions = await discountService.generateExpiryPromotions();

    res.status(201).json({
      status: 'success',
      data: generatedPromotions,
      message: `Generated ${generatedPromotions.length} expiry promotions`
    });
  } catch (error) {
    console.error('Generate expiry promotions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate expiry promotions'
    });
  }
});

// POST /api/promotions/cleanup-expired - Cleanup expired promotions
router.post('/cleanup-expired', async (req, res) => {
  try {
    const result = await discountService.cleanupExpiredPromotions();

    if (result.success) {
      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Cleanup expired promotions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cleanup expired promotions'
    });
  }
});

// POST /api/promotions - create
router.post('/', validatePromotionCreation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const promo = await Promotion.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ status: 'success', promotion: promo });
  } catch (e) {
    console.error('Create promotion error', e);
    res.status(400).json({ status: 'error', message: 'Failed to create promotion', details: e.message });
  }
});

// PUT /api/promotions/:id - update
router.put('/:id', async (req, res) => {
  try {
    const promo = await Promotion.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!promo) return res.status(404).json({ status: 'error', message: 'Promotion not found' });
    res.status(200).json({ status: 'success', promotion: promo });
  } catch (e) {
    console.error('Update promotion error', e);
    res.status(400).json({ status: 'error', message: 'Failed to update promotion' });
  }
});

// PATCH /api/promotions/:id - partial update (for toggling active status)
router.patch('/:id', async (req, res) => {
  try {
    const promo = await Promotion.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!promo) return res.status(404).json({ status: 'error', message: 'Promotion not found' });
    res.status(200).json({ status: 'success', promotion: promo });
  } catch (e) {
    console.error('Update promotion error', e);
    res.status(400).json({ status: 'error', message: 'Failed to update promotion' });
  }
});

// DELETE /api/promotions/:id - delete
router.delete('/:id', async (req, res) => {
  try {
    await Promotion.findByIdAndDelete(req.params.id);
    res.status(200).json({ status: 'success', message: 'Promotion deleted' });
  } catch (e) {
    console.error('Delete promotion error', e);
    res.status(400).json({ status: 'error', message: 'Failed to delete promotion' });
  }
});

module.exports = router;


