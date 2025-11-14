const express = require('express');
const Product = require('../models/Product');
const { InventoryLog } = require('../models/Inventory');
const { protect, restrictTo } = require('../middleware/auth');
const { validateInventoryAction } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get inventory overview
router.get('/overview', async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ isActive: true });
    const lowStockProducts = await Product.find({ isActive: true }).then(products =>
      products.filter(p => p.isLowStock).length
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        totalProducts,
        lowStockProducts,
        outOfStock: await Product.countDocuments({ stock: 0, isActive: true }),
        criticalStock: lowStockProducts
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch inventory overview'
    });
  }
});

// Add stock (admin/staff only)
router.post('/add-stock', restrictTo('admin', 'staff'), validateInventoryAction, async (req, res) => {
  try {
    const { productId, quantity, reason } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    const previousStock = product.stock;
    const newStock = previousStock + quantity;

    // Update product stock
    product.stock = newStock;
    await product.save();

    // Log the inventory change
    await InventoryLog.create({
      product: productId,
      action: 'add',
      quantity,
      previousStock,
      newStock,
      reason,
      performedBy: req.user._id,
      referenceType: 'manual'
    });

    res.status(200).json({
      status: 'success',
      message: 'Stock added successfully',
      data: {
        product: product.name,
        previousStock,
        newStock,
        quantityAdded: quantity
      }
    });
  } catch (error) {
    console.error('Add stock error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add stock'
    });
  }
});

// Remove stock (admin/staff only)
router.post('/remove-stock', restrictTo('admin', 'staff'), validateInventoryAction, async (req, res) => {
  try {
    const { productId, quantity, reason } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    const previousStock = product.stock;
    const newStock = Math.max(0, previousStock - quantity);

    // Update product stock
    product.stock = newStock;
    await product.save();

    // Log the inventory change
    await InventoryLog.create({
      product: productId,
      action: 'remove',
      quantity,
      previousStock,
      newStock,
      reason,
      performedBy: req.user._id,
      referenceType: 'manual'
    });

    res.status(200).json({
      status: 'success',
      message: 'Stock removed successfully',
      data: {
        product: product.name,
        previousStock,
        newStock,
        quantityRemoved: quantity
      }
    });
  } catch (error) {
    console.error('Remove stock error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove stock'
    });
  }
});

// Get detailed inventory list with filtering and sorting
router.get('/list', async (req, res) => {
  try {
    const { category, status, sort = '-createdAt', search } = req.query;
    
    // Build query
    const query = { isActive: true };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get products
    let products = await Product.find(query)
      .sort(sort)
      .select('name category price unit stock minStock images supplier createdAt')
      .lean();
    
    // Filter by status if specified
    if (status) {
      products = products.filter(p => {
        if (status === 'low') return p.stock <= p.minStock && p.stock > 0;
        if (status === 'out') return p.stock === 0;
        if (status === 'good') return p.stock > p.minStock;
        return true;
      });
    }
    
    // Add computed fields
    products = products.map(p => ({
      ...p,
      stockStatus: p.stock === 0 ? 'out' : p.stock <= p.minStock ? 'low' : 'good',
      stockPercentage: Math.round((p.stock / (p.minStock * 3)) * 100),
      imageUrl: p.images && p.images.length > 0 ? p.images[0].url : null
    }));
    
    res.status(200).json({
      status: 'success',
      results: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get inventory list error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch inventory list'
    });
  }
});

// Get low stock alerts
router.get('/alerts', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .select('name category stock minStock images')
      .lean();
    
    const lowStockProducts = products.filter(p => p.stock <= p.minStock && p.stock > 0);
    const outOfStockProducts = products.filter(p => p.stock === 0);
    
    const alerts = [
      ...outOfStockProducts.map(p => ({
        _id: p._id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        minStock: p.minStock,
        severity: 'critical',
        message: 'Out of stock',
        imageUrl: p.images && p.images.length > 0 ? p.images[0].url : null
      })),
      ...lowStockProducts.map(p => ({
        _id: p._id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        minStock: p.minStock,
        severity: 'warning',
        message: `Low stock (${p.stock} units remaining)`,
        imageUrl: p.images && p.images.length > 0 ? p.images[0].url : null
      }))
    ];
    
    res.status(200).json({
      status: 'success',
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch alerts'
    });
  }
});

// Get restock history
router.get('/history', async (req, res) => {
  try {
    const { limit = 50, productId } = req.query;
    
    const query = {};
    if (productId) {
      query.product = productId;
    }
    
    const logs = await InventoryLog.find(query)
      .populate('product', 'name category')
      .populate('performedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch restock history'
    });
  }
});

// Unified stock adjustment (replaces add/remove stock)
router.post('/adjust', restrictTo('admin', 'staff'), async (req, res) => {
  try {
    const { productId, adjustment, reason } = req.body;
    
    if (!productId || adjustment === undefined || adjustment === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Product ID and non-zero adjustment are required'
      });
    }
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }
    
    const previousStock = product.stock;
    const newStock = Math.max(0, previousStock + adjustment);
    
    product.stock = newStock;
    await product.save();
    
    // Log the adjustment
    await InventoryLog.create({
      product: productId,
      action: adjustment > 0 ? 'add' : 'remove',
      quantity: Math.abs(adjustment),
      previousStock,
      newStock,
      reason: reason || (adjustment > 0 ? 'Stock adjustment (increase)' : 'Stock adjustment (decrease)'),
      performedBy: req.user._id,
      referenceType: 'adjustment'
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Stock adjusted successfully',
      data: {
        product: product.name,
        previousStock,
        newStock,
        adjustment
      }
    });
  } catch (error) {
    console.error('Adjust stock error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to adjust stock'
    });
  }
});

// Export inventory to CSV
router.get('/export', restrictTo('admin', 'staff'), async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ name: 1 });

    // Create CSV content
    const headers = ['Product Name', 'Category', 'Current Stock', 'Min Stock', 'Unit', 'Price', 'Total Value', 'Status'];
    const rows = products.map(product => {
      const totalValue = (product.stock * product.price).toFixed(2);
      const status = product.stock <= 0 ? 'Out of Stock' : product.stock <= (product.minStock || 0) ? 'Low Stock' : 'In Stock';
      
      return [
        `"${product.name}"`,
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
      message: 'Failed to export inventory'
    });
  }
});

// Bulk import stock
router.post('/bulk-import', restrictTo('admin', 'staff'), async (req, res) => {
  try {
    const { items } = req.body;

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

    // Generate batch number prefix for this import
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    let batchCount = await Product.countDocuments({
      'batchInfo.batchNumber': new RegExp(`^BATCH-${today}`)
    });

    for (const item of items) {
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
        
        // Generate unique batch number
        batchCount++;
        const batchNumber = `BATCH-${today}-${String(batchCount).padStart(3, '0')}`;
        
        // Add batch info
        if (!product.batchInfo) product.batchInfo = [];
        product.batchInfo.push({
          batchNumber,
          quantity: item.quantity,
          receivedDate: new Date(),
          supplierReference: `Bulk Import - ${item.notes || ''}`,
          remainingQuantity: item.quantity
        });

        product.stock = newStock;
        await product.save();

        // Log the adjustment
        await InventoryLog.create({
          product: product._id,
          action: 'add',
          quantity: item.quantity,
          previousStock: oldStock,
          newStock,
          reason: item.reason || 'Bulk import',
          notes: item.notes,
          performedBy: req.user._id,
          referenceType: 'bulk_import',
          batchNumber
        });

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
      message: 'Failed to process bulk import'
    });
  }
});

// Get low stock products
router.get('/low-stock', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .select('name category stock minStock unit images price')
      .lean();
    
    const lowStockProducts = products.filter(p => p.stock <= p.minStock && p.stock > 0);
    
    res.status(200).json({
      status: 'success',
      count: lowStockProducts.length,
      products: lowStockProducts
    });
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch low stock products'
    });
  }
});

// Get expiring batches report
router.get('/expiring-batches', restrictTo('admin', 'staff'), async (req, res) => {
  try {
    const expiryChecker = require('../services/expiryChecker');
    const report = await expiryChecker.getExpiringBatchesReport();
    
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    console.error('Get expiring batches error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch expiring batches report'
    });
  }
});

// Manual expiry check
router.post('/check-expiry', restrictTo('admin', 'staff'), async (req, res) => {
  try {
    const expiryChecker = require('../services/expiryChecker');
    const result = await expiryChecker.manualCheck();
    
    res.status(200).json({
      status: 'success',
      message: 'Expiry check completed',
      data: result
    });
  } catch (error) {
    console.error('Manual expiry check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform expiry check'
    });
  }
});

module.exports = router;
