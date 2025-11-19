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

// Unified stock adjustment with FIFO batch tracking
const adjustStock = async (req, res) => {
  try {
    const { productId, adjustmentType, quantity, reason, notes, expiryDate, supplierRef } = req.body;

    if (!productId || !adjustmentType || !quantity || !reason) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: productId, adjustmentType, quantity, reason'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    const oldStock = product.stock;
    let newStock = oldStock;

    // Apply adjustment based on type
    switch (adjustmentType) {
      case 'add':
        newStock = oldStock + quantity;
        break;
      case 'remove':
        newStock = Math.max(0, oldStock - quantity);
        break;
      case 'set':
        newStock = quantity;
        break;
      default:
        return res.status(400).json({
          status: 'error',
          message: 'Invalid adjustment type. Use: add, remove, or set'
        });
    }

    product.stock = newStock;
    
    // Generate batch number for restock (FIFO tracking)
    let batchNumber = null;
    if (adjustmentType === 'add' && reason === 'restock') {
      const { generateUniqueBatchNumber } = require('../utils/batchGenerator');
      batchNumber = await generateUniqueBatchNumber();
      
      // Add batch info to product
      if (!product.batchInfo) product.batchInfo = [];
      product.batchInfo.push({
        batchNumber,
        quantity,
        remainingQuantity: quantity,
        receivedDate: new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        supplierReference: supplierRef || null,
        status: 'active',
        createdBy: req.user._id,
        notes: notes || `Restocked ${quantity} ${product.unit}`
      });
      
      // Set first stock date if this is the first time stock is added
      if (!product.firstStockDate) {
        product.firstStockDate = new Date();
      }
    }
    
    await product.save();

    // Log the adjustment
    const adjustment = {
      productId: product._id,
      productName: product.name,
      adjustmentType,
      quantity,
      oldStock,
      newStock,
      difference: newStock - oldStock,
      reason,
      notes,
      batchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      supplierReference: supplierRef || null,
      adjustedBy: req.user._id,
      adjustedAt: new Date()
    };

    // Log to InventoryLog for history tracking
    try {
      const { InventoryLog } = require('../models/Inventory');
      await InventoryLog.create({
        product: product._id,
        action: adjustmentType === 'add' ? 'add' : adjustmentType === 'remove' ? 'remove' : 'adjustment',
        quantity,
        previousStock: oldStock,
        newStock,
        reason,
        batchNumber,
        notes,
        performedBy: req.user._id,
        referenceType: 'manual'
      });
    } catch (logError) {
      console.error('Error logging inventory change:', logError);
      // Don't fail the request if logging fails
    }

    res.status(200).json({
      status: 'success',
      message: `Stock ${adjustmentType === 'add' ? 'added' : adjustmentType === 'remove' ? 'removed' : 'updated'} successfully${batchNumber ? ` (Batch: ${batchNumber})` : ''}`,
      data: {
        product: {
          id: product._id,
          name: product.name,
          oldStock,
          newStock,
          unit: product.unit,
          batchNumber
        },
        adjustment
      }
    });
  } catch (error) {
    console.error('Adjust stock error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to adjust stock',
      error: error.message
    });
  }
};

// Export inventory to CSV
const exportInventory = async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });

    // Create CSV content
    const headers = ['Product Name', 'Category', 'Current Stock', 'Min Stock', 'Unit', 'Price', 'Total Value', 'Status'];
    const rows = products.map(product => {
      const totalValue = (product.stock * product.price).toFixed(2);
      const status = product.stock <= 0 ? 'Out of Stock' : product.stock <= (product.minStock || 0) ? 'Low Stock' : 'In Stock';
      
      return [
        product.name,
        product.category,
        product.stock,
        product.minStock || 0,
        product.unit,
        product.price.toFixed(2),
        totalValue,
        status
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=inventory-${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export inventory error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export inventory',
      error: error.message
    });
  }
};

// Bulk import stock from CSV
const bulkImport = async (req, res) => {
  try {
    const { items } = req.body; // Array of { productName, quantity, reason, notes }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Items array is required'
      });
    }

    const results = {
      successful: 0,
      failed: 0,
      details: []
    };

    // Generate batch number for this import
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const batchCount = await Product.countDocuments({
      'batchInfo.batchNumber': new RegExp(`^BATCH-${today}`)
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        // Find product by name (case-insensitive)
        const product = await Product.findOne({
          name: new RegExp(`^${item.productName}$`, 'i')
        });

        if (!product) {
          results.failed++;
          results.details.push({
            productName: item.productName,
            success: false,
            error: 'Product not found'
          });
          continue;
        }

        const oldStock = product.stock;
        const newStock = oldStock + item.quantity;
        
        // Generate unique batch number for this item
        const batchNumber = `BATCH-${today}-${String(batchCount + i + 1).padStart(3, '0')}`;
        
        // Add batch info
        if (!product.batchInfo) product.batchInfo = [];
        product.batchInfo.push({
          batchNumber,
          quantity: item.quantity,
          receivedDate: new Date(),
          supplierReference: `Bulk Import ${new Date().toISOString()}`,
          remainingQuantity: item.quantity
        });

        product.stock = newStock;
        await product.save();

        results.successful++;
        results.details.push({
          productName: item.productName,
          success: true,
          oldStock,
          newStock,
          batchNumber,
          quantityAdded: item.quantity
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          productName: item.productName,
          success: false,
          error: error.message
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Bulk import completed: ${results.successful} successful, ${results.failed} failed`,
      successful: results.successful,
      failed: results.failed,
      data: results.details
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process bulk import',
      error: error.message
    });
  }
};

module.exports = {
  getInventoryOverview,
  updateStock,
  getLowStockAlerts,
  bulkUpdateStock,
  adjustStock,
  exportInventory,
  bulkImport
};
