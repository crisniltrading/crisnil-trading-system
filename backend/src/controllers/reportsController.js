const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Inventory = require('../models/Inventory');

/**
 * Generate Sales Report Data
 */
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get orders
    const orders = await Order.find(query)
      .populate('customer', 'username email business_name')
      .populate('items.product', 'name category')
      .sort('-createdAt')
      .lean();

    // Calculate statistics
    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      totalDiscount: orders.reduce((sum, order) => sum + (order.totalDiscount || 0), 0),
      averageOrderValue: 0,
      ordersByStatus: {},
      ordersByPaymentMethod: {},
      topProducts: {},
      revenueByCategory: {}
    };

    // Calculate average
    if (stats.totalOrders > 0) {
      stats.averageOrderValue = stats.totalRevenue / stats.totalOrders;
    }

    // Group by status
    orders.forEach(order => {
      stats.ordersByStatus[order.status] = (stats.ordersByStatus[order.status] || 0) + 1;
      stats.ordersByPaymentMethod[order.payment.method] = (stats.ordersByPaymentMethod[order.payment.method] || 0) + 1;

      // Count products
      order.items.forEach(item => {
        const productName = item.productName || item.product?.name || 'Unknown';
        const category = item.product?.category || 'other';
        
        stats.topProducts[productName] = (stats.topProducts[productName] || 0) + item.quantity;
        stats.revenueByCategory[category] = (stats.revenueByCategory[category] || 0) + item.totalPrice;
      });
    });

    // Sort top products
    const topProductsArray = Object.entries(stats.topProducts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, quantity]) => ({ name, quantity }));

    stats.topProducts = topProductsArray;

    res.json({
      success: true,
      data: {
        orders,
        stats,
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Now'
        }
      }
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating sales report',
      error: error.message
    });
  }
};

/**
 * Generate Inventory Report Data
 */
exports.getInventoryReport = async (req, res) => {
  try {
    const { category, status } = req.query;

    const query = { isActive: true };
    if (category) query.category = category;

    const products = await Product.find(query)
      .populate('createdBy', 'username')
      .sort('name')
      .lean();

    // Calculate statistics
    const stats = {
      totalProducts: products.length,
      totalValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      expiringItems: 0,
      byCategory: {}
    };

    products.forEach(product => {
      const value = product.stock * (product.pricing?.costPrice || product.price);
      stats.totalValue += value;

      if (product.stock === 0) {
        stats.outOfStockItems++;
      } else if (product.stock <= product.minStock) {
        stats.lowStockItems++;
      }

      // Check expiry
      if (product.batchInfo && product.batchInfo.length > 0) {
        const hasExpiring = product.batchInfo.some(batch => {
          const daysToExpiry = Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
          return daysToExpiry <= 30 && daysToExpiry > 0;
        });
        if (hasExpiring) stats.expiringItems++;
      }

      // Group by category
      if (!stats.byCategory[product.category]) {
        stats.byCategory[product.category] = {
          count: 0,
          totalStock: 0,
          totalValue: 0
        };
      }
      stats.byCategory[product.category].count++;
      stats.byCategory[product.category].totalStock += product.stock;
      stats.byCategory[product.category].totalValue += value;
    });

    res.json({
      success: true,
      data: {
        products,
        stats
      }
    });
  } catch (error) {
    console.error('Error generating inventory report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating inventory report',
      error: error.message
    });
  }
};

/**
 * Generate Customer Report Data
 */
exports.getCustomerReport = async (req, res) => {
  try {
    const { role } = req.query;

    const query = {};
    if (role) query.role = role;
    else query.role = { $in: ['client', 'b2b'] };

    const customers = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .lean();

    // Get order statistics for each customer
    const customerStats = await Promise.all(
      customers.map(async (customer) => {
        const orders = await Order.find({ customer: customer._id }).lean();
        
        return {
          ...customer,
          orderCount: orders.length,
          totalSpent: orders.reduce((sum, order) => sum + order.totalAmount, 0),
          lastOrderDate: orders.length > 0 ? orders[0].createdAt : null,
          averageOrderValue: orders.length > 0 
            ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length 
            : 0
        };
      })
    );

    // Calculate overall statistics
    const stats = {
      totalCustomers: customerStats.length,
      totalRevenue: customerStats.reduce((sum, c) => sum + c.totalSpent, 0),
      averageOrdersPerCustomer: customerStats.reduce((sum, c) => sum + c.orderCount, 0) / customerStats.length || 0,
      byRole: {}
    };

    customerStats.forEach(customer => {
      if (!stats.byRole[customer.role]) {
        stats.byRole[customer.role] = {
          count: 0,
          totalRevenue: 0
        };
      }
      stats.byRole[customer.role].count++;
      stats.byRole[customer.role].totalRevenue += customer.totalSpent;
    });

    res.json({
      success: true,
      data: {
        customers: customerStats,
        stats
      }
    });
  } catch (error) {
    console.error('Error generating customer report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating customer report',
      error: error.message
    });
  }
};

/**
 * Generate Transaction Report Data
 */
exports.getTransactionReport = async (req, res) => {
  try {
    const { startDate, endDate, status, paymentMethod } = req.query;

    const query = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (status) query.status = status;
    if (paymentMethod) query['payment.method'] = paymentMethod;

    const transactions = await Order.find(query)
      .populate('customer', 'username email business_name')
      .select('orderNumber customer totalAmount payment status createdAt')
      .sort('-createdAt')
      .lean();

    // Calculate statistics
    const stats = {
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + t.totalAmount, 0),
      byStatus: {},
      byPaymentMethod: {},
      byDate: {}
    };

    transactions.forEach(transaction => {
      // By status
      stats.byStatus[transaction.status] = (stats.byStatus[transaction.status] || 0) + 1;
      
      // By payment method
      const method = transaction.payment.method;
      if (!stats.byPaymentMethod[method]) {
        stats.byPaymentMethod[method] = { count: 0, amount: 0 };
      }
      stats.byPaymentMethod[method].count++;
      stats.byPaymentMethod[method].amount += transaction.totalAmount;

      // By date
      const date = new Date(transaction.createdAt).toISOString().split('T')[0];
      if (!stats.byDate[date]) {
        stats.byDate[date] = { count: 0, amount: 0 };
      }
      stats.byDate[date].count++;
      stats.byDate[date].amount += transaction.totalAmount;
    });

    res.json({
      success: true,
      data: {
        transactions,
        stats,
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Now'
        }
      }
    });
  } catch (error) {
    console.error('Error generating transaction report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating transaction report',
      error: error.message
    });
  }
};

/**
 * Export report as CSV
 */
exports.exportCSV = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    let data = [];
    let headers = [];
    let filename = '';

    switch (type) {
      case 'sales':
        const salesData = await this.getSalesReportData(startDate, endDate);
        headers = ['Order Number', 'Customer', 'Date', 'Total Amount', 'Status', 'Payment Method'];
        data = salesData.orders.map(order => [
          order.orderNumber,
          order.customer?.username || 'N/A',
          new Date(order.createdAt).toLocaleDateString(),
          order.totalAmount,
          order.status,
          order.payment.method
        ]);
        filename = `sales-report-${Date.now()}.csv`;
        break;

      case 'inventory':
        const inventoryData = await this.getInventoryReportData();
        headers = ['Product Name', 'Category', 'Stock', 'Price', 'Total Value', 'Status'];
        data = inventoryData.products.map(product => [
          product.name,
          product.category,
          product.stock,
          product.price,
          product.stock * product.price,
          product.stock === 0 ? 'Out of Stock' : product.stock <= product.minStock ? 'Low Stock' : 'In Stock'
        ]);
        filename = `inventory-report-${Date.now()}.csv`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    // Generate CSV
    const csv = [headers.join(','), ...data.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting report',
      error: error.message
    });
  }
};

// Helper methods
exports.getSalesReportData = async (startDate, endDate) => {
  const query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const orders = await Order.find(query)
    .populate('customer', 'username email')
    .sort('-createdAt')
    .lean();

  return { orders };
};

exports.getInventoryReportData = async () => {
  const products = await Product.find({ isActive: true })
    .sort('name')
    .lean();

  return { products };
};
