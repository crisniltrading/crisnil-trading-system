const express = require('express');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { calculateProductGrowth, calculateRevenueGrowth } = require('../utils/analyticsHelper');

const router = express.Router();

// Public routes (no auth required)
// Track advertisement view
router.post('/ad-view', async (req, res) => {
  try {
    // Log ad view (can be stored in database if needed)
    const { adId, type, timestamp } = req.body;
    console.log(`Ad viewed: ${type} - ${adId} at ${timestamp}`);
    
    // TODO: Store in analytics collection if needed
    // await AdView.create({ adId, type, timestamp, ip: req.ip });
    
    res.status(200).json({
      status: 'success',
      message: 'Ad view tracked'
    });
  } catch (error) {
    // Silently fail - analytics is not critical
    res.status(200).json({ status: 'success' });
  }
});

// Track advertisement close
router.post('/ad-close', async (req, res) => {
  try {
    // Log ad close (can be stored in database if needed)
    const { adId, type, dontShowAgain, timestamp } = req.body;
    console.log(`Ad closed: ${type} - ${adId}, Don't show again: ${dontShowAgain}`);
    
    // TODO: Store in analytics collection if needed
    // await AdClose.create({ adId, type, dontShowAgain, timestamp, ip: req.ip });
    
    res.status(200).json({
      status: 'success',
      message: 'Ad close tracked'
    });
  } catch (error) {
    // Silently fail - analytics is not critical
    res.status(200).json({ status: 'success' });
  }
});

// All other routes require authentication
router.use(protect);

// Get overview statistics
router.get('/overview', async (req, res) => {
  try {
    // Set timeout for slow operations
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        return res.status(408).json({
          status: 'error',
          message: 'Request timeout - analytics data loading slowly'
        });
      }
    }, 10000);

    const Order = require('../models/Order');

    // Get real data with fallbacks
    const [totalProducts, products, totalOrders, pendingOrders, todaySales] = await Promise.allSettled([
      Product.countDocuments({ isActive: true }),
      Product.find({ isActive: true, stock: { $exists: true } }).select('stock minStock').lean(),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().setHours(0, 0, 0, 0))
            },
            status: { $in: ['confirmed', 'shipped', 'delivered'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    clearTimeout(timeout);

    const lowStockItems = products.status === 'fulfilled'
      ? products.value.filter(p => p.stock <= (p.minStock || 10)).length
      : 0;

    // Get yesterday's sales for comparison
    const yesterdaySalesData = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000),
            $lt: new Date(new Date().setHours(0, 0, 0, 0))
          },
          status: { $in: ['confirmed', 'shipped', 'delivered'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const todaySalesAmount = todaySales.status === 'fulfilled' && todaySales.value[0] ? todaySales.value[0].total : 0;
    const yesterdaySalesAmount = yesterdaySalesData[0]?.total || 0;
    const salesGrowth = yesterdaySalesAmount > 0 
      ? Math.round(((todaySalesAmount - yesterdaySalesAmount) / yesterdaySalesAmount) * 100)
      : 0;

    const analyticsData = {
      totalProducts: (totalProducts.status === 'fulfilled' ? totalProducts.value : 0).toString(),
      lowStockItems: lowStockItems.toString(),
      totalOrders: (totalOrders.status === 'fulfilled' ? totalOrders.value : 0).toString(),
      pendingOrders: (pendingOrders.status === 'fulfilled' ? pendingOrders.value : 0).toString(),
      todaysSales: `₱${todaySalesAmount.toLocaleString()}`,
      yesterdaySales: `₱${yesterdaySalesAmount.toLocaleString()}`,
      salesGrowth: salesGrowth
    };

    res.status(200).json({
      status: 'success',
      data: analyticsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to load analytics from server',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get recent activities
router.get('/recent-activities', async (req, res) => {
  try {
    const Order = require('../models/Order');
    
    // Get real recent orders from database
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customer', 'business_name')
      .lean();
    
    const recentOrders = orders.map(order => {
      const timeDiff = Date.now() - new Date(order.createdAt).getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);
      const hoursAgo = Math.floor(timeDiff / 3600000);
      const daysAgo = Math.floor(timeDiff / 86400000);
      
      let timeAgo;
      if (minutesAgo < 60) {
        timeAgo = `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`;
      } else if (hoursAgo < 24) {
        timeAgo = `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`;
      } else {
        timeAgo = `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`;
      }
      
      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        timeAgo: timeAgo,
        createdAt: order.createdAt,
        customerName: order.customer?.business_name || 'Customer',
        items: order.items
      };
    });

    // Get actual inventory alerts
    const products = await Product.find({ isActive: true });
    const inventoryAlerts = products
      .filter(p => p.isLowStock || p.isNearExpiry)
      .slice(0, 3)
      .map(product => ({
        productName: product.name,
        message: product.stock <= 0 ? 'Out of Stock' :
          product.stock <= product.minStock ? `Low Stock (${product.stock} units)` :
            'Near Expiry',
        severity: product.stock <= 0 ? 'error' :
          product.stock <= product.minStock ? 'warning' : 'warning',
        action: product.stock <= product.minStock ? 'Reorder suggested' : 'Check expiry dates'
      }));

    res.status(200).json({
      status: 'success',
      data: {
        recentOrders,
        inventoryAlerts
      }
    });
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch recent activities'
    });
  }
});

// Get detailed analytics with real data
router.get('/detailed', async (req, res) => {
  try {
    const Order = require('../models/Order');
    const { days = 30 } = req.query;
    const daysAgo = parseInt(days);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    const endDate = new Date(); // Add missing endDate

    // Get sales trend data
    const salesTrend = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['confirmed', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get top selling products
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['confirmed', 'shipped', 'delivered'] }
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          productName: { $first: "$items.productName" },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.totalPrice" }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]).then(results =>
      Promise.all(results.map(async (item) => {
        const product = await Product.findById(item._id).select('name');
        const growth = await calculateProductGrowth(item._id, startDate, endDate);
        return {
          name: product?.name || item.productName || 'Unknown Product',
          unitsSold: item.totalQuantity,
          revenue: item.totalRevenue,
          growth: growth
        };
      }))
    );

    // Get category breakdown
    const categoryBreakdown = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['confirmed', 'shipped', 'delivered'] }
        }
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$productInfo.category",
          totalRevenue: { $sum: "$items.totalPrice" }
        }
      }
    ]);

    // Get revenue metrics
    const revenueMetrics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['confirmed', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    // Get order status distribution
    const orderStatusDist = await Order.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Format response
    const analytics = {
      salesTrend: {
        labels: salesTrend.map(s => new Date(s._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        data: salesTrend.map(s => s.totalSales),
        orderCounts: salesTrend.map(s => s.orderCount)
      },
      topProducts: topProducts,
      categoryBreakdown: categoryBreakdown.reduce((acc, cat) => {
        acc[cat._id || 'uncategorized'] = cat.totalRevenue;
        return acc;
      }, {}),
      revenueMetrics: revenueMetrics[0] || {
        totalRevenue: 0,
        averageOrderValue: 0,
        totalOrders: 0
      },
      orderStatusDistribution: orderStatusDist.reduce((acc, status) => {
        acc[status._id] = status.count;
        return acc;
      }, {}),
      insights: generateInsights(topProducts, categoryBreakdown, revenueMetrics[0])
    };

    res.status(200).json({
      status: 'success',
      data: analytics
    });
  } catch (error) {
    console.error('Detailed analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to load detailed analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get transaction history with filtering
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, paymentMethod, dateFrom, dateTo } = req.query;
    const Order = require('../models/Order');

    // Build query filters
    const query = {};
    if (status) query.status = status;
    if (paymentMethod) query['payment.method'] = paymentMethod;

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const transactions = await Order.find(query)
      .populate('customer', 'username email business_name')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const totalTransactions = await Order.countDocuments(query);

    // Format transactions for frontend
    const formattedTransactions = transactions.map(order => ({
      id: order._id,
      orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
      customer: order.customer,
      totalAmount: order.totalAmount,
      paymentMethod: order.payment?.method || 'cod',
      paymentStatus: order.payment?.status || 'pending',
      status: order.status,
      createdAt: order.createdAt,
      confirmedAt: order.confirmedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt
    }));

    res.status(200).json({
      status: 'success',
      data: {
        transactions: formattedTransactions,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalTransactions / Number(limit)),
          totalTransactions,
          limit: Number(limit)
        }
      }
    });
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch transaction history'
    });
  }
});

// Get client-focused analytics (no sensitive business data)
router.get('/client-insights', async (req, res) => {
  try {
    const Order = require('../models/Order');
    const Promotion = require('../models/Promotion');

    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        return res.status(408).json({
          status: 'error',
          message: 'Request timeout - loading analytics'
        });
      }
    }, 8000);

    const [productsData, ordersData, promotionsData] = await Promise.allSettled([
      // Best selling products (aggregated, no revenue shown)
      Order.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.productName' },
            totalSold: { $sum: '$items.quantity' },
            popularity: { $sum: 1 }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ]),

      // Order patterns for delivery insights
      Order.aggregate([
        { $match: { status: 'delivered', deliveredAt: { $exists: true } } },
        {
          $group: {
            _id: null,
            avgDeliveryTime: { $avg: { $subtract: ['$deliveredAt', '$createdAt'] } },
            totalDelivered: { $sum: 1 }
          }
        }
      ]),

      // Active promotions
      Promotion.find({
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      }).select('title description discountPercentage endDate').lean()
    ]);

    clearTimeout(timeout);

    // Get product insights from current inventory
    const products = await Product.find({ isActive: true }).select('name stock minStock category').lean();

    const stockInsights = {
      lowStock: products.filter(p => p.stock <= p.minStock && p.stock > 0).map(p => ({
        name: p.name,
        category: p.category,
        status: 'Low Stock'
      })),
      almostSoldOut: products.filter(p => p.stock <= 2 && p.stock > 0).map(p => ({
        name: p.name,
        category: p.category,
        status: 'Almost Sold Out'
      }))
    };

    // Category popularity based on available products
    const categoryStats = products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {});

    const clientAnalytics = {
      bestSellingProducts: productsData.status === 'fulfilled' ? productsData.value : [],
      stockInsights,
      categoryPopularity: Object.entries(categoryStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, productCount: count })),
      deliveryPerformance: {
        averageDeliveryTime: ordersData.status === 'fulfilled' && ordersData.value[0]
          ? Math.round(ordersData.value[0].avgDeliveryTime / (1000 * 60 * 60 * 24)) // Convert to days
          : 2, // Default 2 days
        totalDelivered: ordersData.status === 'fulfilled' && ordersData.value[0]
          ? ordersData.value[0].totalDelivered
          : 0
      },
      activePromotions: promotionsData.status === 'fulfilled' ? promotionsData.value : []
    };

    res.status(200).json({
      status: 'success',
      data: clientAnalytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Client insights error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to load insights'
    });
  }
});

// Helper function to generate insights
function generateInsights(topProducts, categoryBreakdown, revenueMetrics) {
  const insights = [];

  if (topProducts && topProducts.length > 0) {
    const topProduct = topProducts[0];
    insights.push({
      type: 'success',
      icon: 'fa-star',
      title: 'Top Performer',
      message: `${topProduct.name} is your best-selling product with ${topProduct.unitsSold} units sold and ₱${topProduct.revenue.toLocaleString()} in revenue.`
    });
  }

  if (categoryBreakdown && categoryBreakdown.length > 0) {
    const topCategory = categoryBreakdown.reduce((max, cat) =>
      cat.totalRevenue > (max.totalRevenue || 0) ? cat : max, {});
    if (topCategory._id) {
      insights.push({
        type: 'info',
        icon: 'fa-chart-pie',
        title: 'Popular Category',
        message: `${topCategory._id.charAt(0).toUpperCase() + topCategory._id.slice(1)} is your most popular category this month.`
      });
    }
  }

  if (revenueMetrics && revenueMetrics.averageOrderValue) {
    insights.push({
      type: 'info',
      icon: 'fa-money-bill-wave',
      title: 'Average Order Value',
      message: `Your average order value is ₱${Math.round(revenueMetrics.averageOrderValue).toLocaleString()}.`
    });
  }

  return insights;
}

// Get smart insights based on real data
router.get('/smart-insights', async (req, res) => {
  try {
    const Order = require('../models/Order');
    const insights = [];

    // 1. Low stock reorder suggestions
    const lowStockProducts = await Product.find({
      isActive: true,
      stock: { $gt: 0, $lte: 10 }
    })
      .sort({ stock: 1 })
      .limit(3)
      .select('name stock minStock')
      .lean();

    if (lowStockProducts.length > 0) {
      const product = lowStockProducts[0];
      insights.push({
        type: 'reorder',
        color: 'success',
        icon: 'fa-lightbulb',
        title: 'Reorder Suggestion',
        message: `${product.name} is running low (${product.stock} units left). Consider restocking soon.`,
        action: 'createPurchaseOrder',
        actionLabel: 'Create Purchase Order',
        productId: product._id
      });
    }

    // 2. Near expiry products alert
    const nearExpiryProducts = await Product.find({
      isActive: true,
      expiryDate: {
        $exists: true,
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        $gte: new Date()
      }
    })
      .select('name expiryDate')
      .lean();

    if (nearExpiryProducts.length > 0) {
      insights.push({
        type: 'promotion',
        color: 'warning',
        icon: 'fa-percentage',
        title: 'Promotion Alert',
        message: `${nearExpiryProducts.length} product${nearExpiryProducts.length > 1 ? 's are' : ' is'} nearing expiry. Consider applying discounts.`,
        action: 'switchTab',
        actionLabel: 'View Promotions',
        actionParam: 'promotions'
      });
    }

    // 3. Sales trend analysis (weekend vs weekday)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesByDayOfWeek = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: { $in: ['confirmed', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    if (salesByDayOfWeek.length > 0) {
      const weekendSales = salesByDayOfWeek
        .filter(d => d._id === 1 || d._id === 7)
        .reduce((sum, d) => sum + d.totalSales, 0);
      const weekdaySales = salesByDayOfWeek
        .filter(d => d._id !== 1 && d._id !== 7)
        .reduce((sum, d) => sum + d.totalSales, 0);

      const weekendAvg = weekendSales / 2;
      const weekdayAvg = weekdaySales / 5;

      if (weekendAvg > weekdayAvg * 1.15) {
        const percentHigher = Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100);
        insights.push({
          type: 'trend',
          color: 'info',
          icon: 'fa-chart-line',
          title: 'Sales Trend',
          message: `Weekend sales are ${percentHigher}% higher than weekdays. Consider weekend promotions.`,
          action: 'createWeekendPromotion',
          actionLabel: 'Create Weekend Promo'
        });
      } else if (weekdayAvg > weekendAvg * 1.15) {
        const percentHigher = Math.round(((weekdayAvg - weekendAvg) / weekendAvg) * 100);
        insights.push({
          type: 'trend',
          color: 'info',
          icon: 'fa-chart-line',
          title: 'Sales Trend',
          message: `Weekday sales are ${percentHigher}% higher. Your business thrives during the week!`,
          action: null,
          actionLabel: null
        });
      }
    }

    // 4. Customer purchase patterns
    const customerPatterns = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: { $in: ['confirmed', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: '$customer',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          repeatCustomers: {
            $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] }
          },
          avgOrderValue: { $avg: '$avgOrderValue' }
        }
      }
    ]);

    if (customerPatterns.length > 0) {
      const pattern = customerPatterns[0];
      const repeatRate = (pattern.repeatCustomers / pattern.totalCustomers) * 100;

      if (repeatRate > 40) {
        insights.push({
          type: 'customer',
          color: 'purple',
          icon: 'fa-users',
          title: 'Customer Loyalty',
          message: `${Math.round(repeatRate)}% of customers are repeat buyers. Consider loyalty rewards to maintain this!`,
          action: 'switchTab',
          actionLabel: 'Create Loyalty Program',
          actionParam: 'promotions'
        });
      } else if (repeatRate < 20) {
        insights.push({
          type: 'customer',
          color: 'purple',
          icon: 'fa-users',
          title: 'Customer Retention',
          message: `Only ${Math.round(repeatRate)}% repeat customers. Consider retention strategies and follow-up campaigns.`,
          action: 'switchTab',
          actionLabel: 'View Promotions',
          actionParam: 'promotions'
        });
      }
    }

    // 5. Slow-moving inventory
    const slowMovingProducts = await Product.aggregate([
      {
        $match: {
          isActive: true,
          stock: { $gt: 20 }
        }
      },
      {
        $lookup: {
          from: 'orders',
          let: { productId: '$_id' },
          pipeline: [
            { $unwind: '$items' },
            {
              $match: {
                $expr: { $eq: ['$items.product', '$$productId'] },
                createdAt: { $gte: thirtyDaysAgo },
                status: { $in: ['confirmed', 'shipped', 'delivered'] }
              }
            },
            {
              $group: {
                _id: null,
                totalSold: { $sum: '$items.quantity' }
              }
            }
          ],
          as: 'salesData'
        }
      },
      {
        $addFields: {
          totalSold: { $ifNull: [{ $arrayElemAt: ['$salesData.totalSold', 0] }, 0] }
        }
      },
      {
        $match: {
          totalSold: { $lt: 5 }
        }
      },
      { $limit: 5 }
    ]);

    if (slowMovingProducts.length > 0) {
      insights.push({
        type: 'inventory',
        color: 'warning',
        icon: 'fa-warehouse',
        title: 'Slow-Moving Inventory',
        message: `${slowMovingProducts.length} product${slowMovingProducts.length > 1 ? 's have' : ' has'} low sales velocity. Consider promotions to move inventory.`,
        action: 'switchTab',
        actionLabel: 'Create Clearance Sale',
        actionParam: 'promotions'
      });
    }

    // 6. Revenue growth trend
    const lastWeekRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          },
          status: { $in: ['confirmed', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    const thisWeekRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          status: { $in: ['confirmed', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    if (lastWeekRevenue.length > 0 && thisWeekRevenue.length > 0) {
      const lastWeek = lastWeekRevenue[0].total;
      const thisWeek = thisWeekRevenue[0].total;
      const growth = ((thisWeek - lastWeek) / lastWeek) * 100;

      if (Math.abs(growth) > 10) {
        insights.push({
          type: growth > 0 ? 'success' : 'alert',
          color: growth > 0 ? 'success' : 'warning',
          icon: growth > 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down',
          title: 'Revenue Trend',
          message: `Revenue is ${growth > 0 ? 'up' : 'down'} ${Math.abs(Math.round(growth))}% compared to last week. ${growth > 0 ? 'Great momentum!' : 'Consider promotional campaigns.'}`,
          action: growth < 0 ? 'switchTab' : null,
          actionLabel: growth < 0 ? 'Boost Sales' : null,
          actionParam: growth < 0 ? 'promotions' : null
        });
      }
    }

    // 7. High-value customers
    const highValueCustomers = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: { $in: ['confirmed', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: '$customer',
          totalSpent: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $match: {
          totalSpent: { $gte: 5000 }
        }
      },
      { $count: 'count' }
    ]);

    if (highValueCustomers.length > 0 && highValueCustomers[0].count > 0) {
      const count = highValueCustomers[0].count;
      insights.push({
        type: 'vip',
        color: 'purple',
        icon: 'fa-crown',
        title: 'VIP Customers',
        message: `You have ${count} high-value customer${count > 1 ? 's' : ''} (₱5,000+ spent this month). Consider VIP rewards or exclusive offers.`,
        action: 'switchTab',
        actionLabel: 'Create VIP Offer',
        actionParam: 'promotions'
      });
    }

    // If no insights, provide a default message
    if (insights.length === 0) {
      insights.push({
        type: 'info',
        color: 'info',
        icon: 'fa-info-circle',
        title: 'Getting Started',
        message: 'Start processing orders to see smart insights and recommendations based on your business data.',
        action: null,
        actionLabel: null
      });
    }

    res.status(200).json({
      status: 'success',
      data: insights
    });
  } catch (error) {
    console.error('Smart insights error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate insights'
    });
  }
});

module.exports = router;
