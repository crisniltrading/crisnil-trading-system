// Analytics Helper Functions
const Order = require('../models/Order');

/**
 * Calculate product growth percentage comparing current period to previous period
 * @param {String} productId - Product ID
 * @param {Date} currentStartDate - Start date of current period
 * @param {Date} currentEndDate - End date of current period
 * @returns {Number} Growth percentage (rounded)
 */
async function calculateProductGrowth(productId, currentStartDate, currentEndDate) {
  try {
    // Calculate the previous period (same duration)
    const currentPeriodDays = Math.ceil((new Date(currentEndDate) - new Date(currentStartDate)) / (1000 * 60 * 60 * 24));
    const previousEndDate = new Date(currentStartDate);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - currentPeriodDays);
    
    // Get current period sales
    const currentSales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(currentStartDate), $lte: new Date(currentEndDate) },
          status: { $in: ['completed', 'delivered', 'confirmed', 'shipped'] }
        }
      },
      { $unwind: '$items' },
      {
        $match: { 'items.product': productId }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$items.quantity' }
        }
      }
    ]);
    
    // Get previous period sales
    const previousSales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: previousStartDate, $lt: new Date(currentStartDate) },
          status: { $in: ['completed', 'delivered', 'confirmed', 'shipped'] }
        }
      },
      { $unwind: '$items' },
      {
        $match: { 'items.product': productId }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$items.quantity' }
        }
      }
    ]);
    
    const currentQty = currentSales[0]?.totalQuantity || 0;
    const previousQty = previousSales[0]?.totalQuantity || 0;
    
    // Calculate growth percentage
    if (previousQty === 0) {
      return currentQty > 0 ? 100 : 0;
    }
    
    const growth = ((currentQty - previousQty) / previousQty) * 100;
    return Math.round(growth);
    
  } catch (error) {
    console.error('Error calculating product growth:', error);
    return 0;
  }
}

/**
 * Calculate revenue growth for a given period
 * @param {Date} currentStartDate - Start date of current period
 * @param {Date} currentEndDate - End date of current period
 * @returns {Object} Growth data with current, previous, and percentage
 */
async function calculateRevenueGrowth(currentStartDate, currentEndDate) {
  try {
    const currentPeriodDays = Math.ceil((new Date(currentEndDate) - new Date(currentStartDate)) / (1000 * 60 * 60 * 24));
    const previousEndDate = new Date(currentStartDate);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - currentPeriodDays);
    
    // Current period revenue
    const currentRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(currentStartDate), $lte: new Date(currentEndDate) },
          status: { $in: ['completed', 'delivered', 'confirmed', 'shipped'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    // Previous period revenue
    const previousRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: previousStartDate, $lt: new Date(currentStartDate) },
          status: { $in: ['completed', 'delivered', 'confirmed', 'shipped'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    const current = currentRevenue[0]?.total || 0;
    const previous = previousRevenue[0]?.total || 0;
    
    const growth = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
    
    return {
      current,
      previous,
      growth: Math.round(growth * 10) / 10 // Round to 1 decimal
    };
  } catch (error) {
    console.error('Error calculating revenue growth:', error);
    return { current: 0, previous: 0, growth: 0 };
  }
}

module.exports = {
  calculateProductGrowth,
  calculateRevenueGrowth
};
