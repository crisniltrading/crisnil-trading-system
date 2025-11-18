const Product = require('../models/Product');
const expiryService = require('../services/expiryService');

// Get expiry dashboard
const getExpiryDashboard = async (req, res) => {
  try {
    const dashboard = await expiryService.getExpiryDashboard();
    
    res.status(200).json({
      status: 'success',
      data: dashboard
    });
  } catch (error) {
    console.error('Get expiry dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch expiry dashboard'
    });
  }
};

// Get products expiring within specified days
const getExpiringProducts = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const products = await expiryService.getProductsExpiringWithin(parseInt(days));
    
    res.status(200).json({
      status: 'success',
      results: products.length,
      products
    });
  } catch (error) {
    console.error('Get expiring products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch expiring products'
    });
  }
};

// Manually trigger expiry discount application
const applyExpiryDiscounts = async (req, res) => {
  try {
    // Pass the current user ID to the service
    const userId = req.user?._id || req.user?.id;
    const result = await expiryService.applyExpiryDiscounts(userId);
    
    res.status(200).json({
      status: 'success',
      message: `Applied ${result.discountsApplied} expiry discounts`,
      data: result
    });
  } catch (error) {
    console.error('Apply expiry discounts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to apply expiry discounts'
    });
  }
};

// Add batch info to product
const addBatchInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { batchNumber, expiryDate, quantity, receivedDate } = req.body;

    if (!batchNumber || !expiryDate || !quantity) {
      return res.status(400).json({
        status: 'error',
        message: 'Batch number, expiry date, and quantity are required'
      });
    }

    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Add new batch
    product.batchInfo.push({
      batchNumber,
      expiryDate: new Date(expiryDate),
      quantity: parseInt(quantity),
      receivedDate: receivedDate ? new Date(receivedDate) : new Date()
    });

    // Update total stock
    product.stock += parseInt(quantity);

    await product.save();

    res.status(200).json({
      status: 'success',
      message: 'Batch info added successfully',
      product
    });
  } catch (error) {
    console.error('Add batch info error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add batch info'
    });
  }
};

// Update batch info
const updateBatchInfo = async (req, res) => {
  try {
    const { id, batchId } = req.params;
    const { batchNumber, expiryDate, quantity } = req.body;

    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    const batch = product.batchInfo.id(batchId);
    
    if (!batch) {
      return res.status(404).json({
        status: 'error',
        message: 'Batch not found'
      });
    }

    // Calculate stock difference
    const oldQuantity = batch.quantity || 0;
    const newQuantity = quantity !== undefined ? parseInt(quantity) : oldQuantity;
    const stockDiff = newQuantity - oldQuantity;

    // Update batch
    if (batchNumber) batch.batchNumber = batchNumber;
    if (expiryDate) batch.expiryDate = new Date(expiryDate);
    if (quantity !== undefined) batch.quantity = newQuantity;

    // Update total stock
    product.stock += stockDiff;

    await product.save();

    res.status(200).json({
      status: 'success',
      message: 'Batch info updated successfully',
      product
    });
  } catch (error) {
    console.error('Update batch info error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update batch info'
    });
  }
};

// Delete batch info
const deleteBatchInfo = async (req, res) => {
  try {
    const { id, batchId } = req.params;

    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    const batch = product.batchInfo.id(batchId);
    
    if (!batch) {
      return res.status(404).json({
        status: 'error',
        message: 'Batch not found'
      });
    }

    // Update stock
    product.stock = Math.max(0, product.stock - (batch.quantity || 0));

    // Remove batch
    batch.remove();

    await product.save();

    res.status(200).json({
      status: 'success',
      message: 'Batch info deleted successfully',
      product
    });
  } catch (error) {
    console.error('Delete batch info error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete batch info'
    });
  }
};

// Cleanup expired batches
const cleanupExpiredBatches = async (req, res) => {
  try {
    const result = await expiryService.cleanupExpiredBatches();
    
    res.status(200).json({
      status: 'success',
      message: `Cleaned up ${result.batchesRemoved} expired batches`,
      data: result
    });
  } catch (error) {
    console.error('Cleanup expired batches error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cleanup expired batches'
    });
  }
};

module.exports = {
  getExpiryDashboard,
  getExpiringProducts,
  applyExpiryDiscounts,
  addBatchInfo,
  updateBatchInfo,
  deleteBatchInfo,
  cleanupExpiredBatches
};
