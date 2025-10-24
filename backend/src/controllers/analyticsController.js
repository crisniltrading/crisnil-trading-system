const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// Get dashboard analytics
const getDashboardAnalytics = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

    // Orders analytics
    const totalOrders = await Order.countDocuments();
    const monthlyOrders = await Order.countDocuments({ 
      createdAt: { $gte: startOfMonth } 
    });
    const weeklyOrders = await Order.countDocuments({ 
      createdAt: { $gte: startOfWeek } 
    });

    // Revenue analytics
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const monthlyRevenue = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startOfMonth },
          status: { $in: ['confirmed', 'shipped', 'delivered'] }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Product analytics
    const totalProducts = await Product.countDocuments();
    const lowStockProducts = await Product.countDocuments({ stock: { $lte: 10 } });
    const outOfStockProducts = await Product.countDocuments({ stock: 0 });

    // Customer analytics
    const totalCustomers = await User.countDocuments({ role: 'client' });
    const activeCustomers = await Order.distinct('customer').countDocuments();

    // Top selling products
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { 
        $group: { 
          _id: '$items.product',
          name: { $first: '$items.name' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    // Recent orders
    const recentOrders = await Order.find()
      .populate('customer', 'username businessInfo')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      status: 'success',
      data: {
        orders: {
          total: totalOrders,
          monthly: monthlyOrders,
          weekly: weeklyOrders
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          monthly: monthlyRevenue[0]?.total || 0
        },
        products: {
          total: totalProducts,
          lowStock: lowStockProducts,
          outOfStock: outOfStockProducts
        },
        customers: {
          total: totalCustomers,
          active: activeCustomers
        },
        topProducts,
        recentOrders
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

// Get sales trends
const getSalesTrends = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const salesTrends = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['confirmed', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: { salesTrends, period: days }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch sales trends',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardAnalytics,
  getSalesTrends
};
