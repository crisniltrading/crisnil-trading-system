const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// Get inventory overview
const getInventoryOverview = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const lowStockProducts = await Product.countDocuments({ stock: { $lte: 10 } });
    const outOfStockProducts = await Product.countDocuments({ stock: 0 });
    const totalValue = await Product.aggregate([
      { $group: { _id: null, total: { $sum: { $multiply: ['$price', '$stock'] } } } }
    ]);

    const recentlyUpdated = await Product.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('name stock price updatedAt');

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalProducts,
          lowStockProducts,
          outOfStockProducts,
          totalValue: totalValue[0]?.total || 0
        },
        recentlyUpdated
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch inventory overview',
      error: error.message
    });
  }
};

// Update product stock
const updateStock = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { productId } = req.params;
    const { stock, reason } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    const oldStock = product.stock;
    product.stock = stock;
    await product.save();

    res.status(200).json({
      status: 'success',
      message: 'Stock updated successfully',
      data: {
        product,
        stockChange: {
          from: oldStock,
          to: stock,
          difference: stock - oldStock,
          reason
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update stock',
      error: error.message
    });
  }
};

// Get low stock alerts
const getLowStockAlerts = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    const lowStockProducts = await Product.find({ 
      stock: { $lte: threshold } 
    }).sort({ stock: 1 });

    res.status(200).json({
      status: 'success',
      data: { 
        products: lowStockProducts,
        threshold,
        count: lowStockProducts.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch low stock alerts',
      error: error.message
    });
  }
};

// Bulk stock update
const bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body; // Array of { productId, stock, reason }

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        status: 'error',
        message: 'Updates must be an array'
      });
    }

    const results = [];
    for (const update of updates) {
      try {
        const product = await Product.findById(update.productId);
        if (product) {
          const oldStock = product.stock;
          product.stock = update.stock;
          await product.save();
          
          results.push({
            productId: update.productId,
            success: true,
            oldStock,
            newStock: update.stock,
            reason: update.reason
          });
        } else {
          results.push({
            productId: update.productId,
            success: false,
            error: 'Product not found'
          });
        }
      } catch (error) {
        results.push({
          productId: update.productId,
          success: false,
          error: error.message
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Bulk stock update completed',
      data: { results }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform bulk stock update',
      error: error.message
    });
  }
};

module.exports = {
  getInventoryOverview,
  updateStock,
  getLowStockAlerts,
  bulkUpdateStock
};
