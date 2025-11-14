// Transaction Controller
const Order = require('../models/Order');

// Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
    // Fetch all orders (transactions) with customer details
    const query = {};
    
    // Filter by user role
    if (req.user && req.user.role === 'client') {
      query.customer = req.user.id;
    }
    
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by payment method if provided
    if (req.query.paymentMethod) {
      query['payment.method'] = req.query.paymentMethod;
    }
    
    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }
    
    const transactions = await Order.find(query)
      .populate('customer', 'username email businessInfo')
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 100);
    
    // Calculate statistics
    const stats = {
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + t.totalAmount, 0),
      byPaymentMethod: {},
      byStatus: {}
    };
    
    transactions.forEach(t => {
      // Group by payment method
      const method = t.payment.method;
      if (!stats.byPaymentMethod[method]) {
        stats.byPaymentMethod[method] = { count: 0, amount: 0 };
      }
      stats.byPaymentMethod[method].count++;
      stats.byPaymentMethod[method].amount += t.totalAmount;
      
      // Group by status
      if (!stats.byStatus[t.status]) {
        stats.byStatus[t.status] = 0;
      }
      stats.byStatus[t.status]++;
    });
    
    res.json({
      status: 'success',
      data: {
        transactions,
        stats
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create transaction (handled by order creation)
exports.createTransaction = async (req, res) => {
  try {
    // Transactions are created automatically when orders are placed
    // This endpoint can be used for manual transaction recording if needed
    
    const { orderId, amount, paymentMethod, notes } = req.body;
    
    if (!orderId || !amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Order ID and amount are required'
      });
    }
    
    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }
    
    // Update payment information
    if (paymentMethod) {
      order.payment.method = paymentMethod;
    }
    
    if (notes) {
      order.notes = (order.notes || '') + '\n' + notes;
    }
    
    order.payment.status = 'completed';
    order.payment.paidAt = new Date();
    
    await order.save();
    
    res.status(201).json({
      status: 'success',
      message: 'Transaction recorded successfully',
      data: {
        transaction: order
      }
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
