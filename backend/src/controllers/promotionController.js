const Promotion = require('../models/Promotion');
const discountService = require('../services/discountService');

/**
 * Calculate discounts for cart items
 */
exports.calculateDiscounts = async (req, res) => {
  try {
    const { cartItems, customerType = 'all' } = req.body;
    const userId = req.user ? req.user._id : null;

    const result = await discountService.calculateCartDiscounts(cartItems, {
      customerType,
      userId
    });

    if (result.success) {
      res.json({
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
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get available promotions for products
 */
exports.getAvailablePromotions = async (req, res) => {
  try {
    const { productIds } = req.query;
    const quantity = parseInt(req.query.quantity) || 1;

    const result = await discountService.getAvailablePromotions(productIds, quantity);

    if (result.success) {
      res.json({
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
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Apply coupon code
 */
exports.applyCoupon = async (req, res) => {
  try {
    const { code, cartItems } = req.body;

    const result = await discountService.applyCouponCode(code, cartItems, {
      customerId: req.user._id,
      customerType: req.user.role
    });

    if (result.success) {
      res.json({
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
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get discount analytics
 */
exports.getAnalytics = async (req, res) => {
  try {
    const timeRange = parseInt(req.query.days) || 30;
    const result = await discountService.getDiscountAnalytics(timeRange);

    if (result.success) {
      res.json({
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
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Setup automatic discounts
 */
exports.setupAutomaticDiscounts = async (req, res) => {
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
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get all promotions
 */
exports.getAllPromotions = async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;

    const promotions = await Promotion.find(filter)
      .sort({ createdAt: -1 })
      .populate('rules.products', 'name price');

    res.json({
      status: 'success',
      results: promotions.length,
      data: promotions
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Create promotion
 */
exports.createPromotion = async (req, res) => {
  try {
    const promotion = await Promotion.create({
      ...req.body,
      createdBy: req.user._id
    });

    res.status(201).json({
      status: 'success',
      data: promotion
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Update promotion
 */
exports.updatePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!promotion) {
      return res.status(404).json({
        status: 'error',
        message: 'Promotion not found'
      });
    }

    res.json({
      status: 'success',
      data: promotion
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Delete promotion
 */
exports.deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);

    if (!promotion) {
      return res.status(404).json({
        status: 'error',
        message: 'Promotion not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Promotion deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
