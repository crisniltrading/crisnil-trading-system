const express = require('express');
const router = express.Router();
const { protect: auth } = require('../middleware/auth');
const Order = require('../models/Order');

// Get all transactions (Admin/Staff/B2B only)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user has appropriate role
    const allowedRoles = ['admin', 'staff', 'b2b'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin, staff, or B2B role required.'
      });
    }

    const { 
      page = 1, 
      limit = 10, 
      status, 
      paymentMethod, 
      type,
      amountRange,
      dateFrom, 
      dateTo,
      search 
    } = req.query;

    // Build query filters
    const query = {};
    
    if (status) query.status = status;
    if (paymentMethod) query['payment.method'] = paymentMethod;
    if (type) {
      // Map transaction types to order statuses
      if (type === 'sale') query.status = { $in: ['confirmed', 'shipped', 'delivered'] };
      if (type === 'refund') query.status = 'refunded';
      if (type === 'pending') query.status = 'pending';
    }
    
    // Amount range filter
    if (amountRange) {
      const [min, max] = amountRange.split('-').map(v => v.replace('+', ''));
      query.totalAmount = {};
      if (max) {
        query.totalAmount.$gte = parseInt(min);
        query.totalAmount.$lte = parseInt(max);
      } else {
        query.totalAmount.$gte = parseInt(min);
      }
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'payment.reference': { $regex: search, $options: 'i' } },
        { 'customer.business_name': { $regex: search, $options: 'i' } },
        { 'customer.username': { $regex: search, $options: 'i' } }
      ];
    }

    const transactions = await Order.find(query)
      .populate('customer', 'username email business_name')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const totalTransactions = await Order.countDocuments(query);

    // Calculate summary statistics
    const summary = await calculateTransactionSummary();

    // Format transactions for frontend
    const formattedTransactions = transactions.map(order => ({
      id: order._id,
      orderId: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
      customer: order.customer?.business_name || order.customer?.username || 'Unknown Customer',
      customerEmail: order.customer?.email,
      amount: order.totalAmount || 0,
      status: mapOrderStatusToTransactionStatus(order.status),
      paymentMethod: order.payment?.method || 'cod',
      type: getTransactionType(order.status),
      reference: order.payment?.reference || 'N/A',
      date: order.createdAt,
      fee: calculateTransactionFee(order.totalAmount, order.payment?.method),
      netAmount: calculateNetAmount(order.totalAmount, order.payment?.method),
      items: order.items?.map(item => ({
        name: item.product?.name || item.productName || 'Unknown Product',
        quantity: item.quantity,
        price: item.unitPrice || item.price || 0,
        totalPrice: item.totalPrice || (item.unitPrice * item.quantity) || 0
      })) || []
    }));

    res.status(200).json({
      status: 'success',
      data: {
        transactions: formattedTransactions,
        summary,
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
      message: 'Failed to fetch transactions'
    });
  }
});

// Get user's own transactions (Client only)
router.get('/my-transactions', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      paymentMethod, 
      dateFrom, 
      dateTo 
    } = req.query;

    // Build query filters for user's orders only
    const query = { customer: req.user._id };
    
    if (status) query.status = status;
    if (paymentMethod) query['payment.method'] = paymentMethod;
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const transactions = await Order.find(query)
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const totalTransactions = await Order.countDocuments(query);

    // Calculate user's summary statistics
    const userSummary = await calculateUserTransactionSummary(req.user._id);

    // Format transactions for frontend
    const formattedTransactions = transactions.map(order => ({
      id: order._id,
      orderId: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
      customer: req.user.business_name || req.user.username,
      customerEmail: req.user.email,
      amount: order.totalAmount || 0,
      status: mapOrderStatusToTransactionStatus(order.status),
      paymentMethod: order.payment?.method || 'cod',
      type: getTransactionType(order.status),
      reference: order.payment?.reference || 'N/A',
      date: order.createdAt,
      fee: calculateTransactionFee(order.totalAmount, order.payment?.method),
      netAmount: calculateNetAmount(order.totalAmount, order.payment?.method),
      items: order.items?.map(item => ({
        name: item.product?.name || item.productName || 'Unknown Product',
        quantity: item.quantity,
        price: item.unitPrice || item.price || 0,
        totalPrice: item.totalPrice || (item.unitPrice * item.quantity) || 0
      })) || []
    }));

    res.status(200).json({
      status: 'success',
      data: {
        transactions: formattedTransactions,
        summary: userSummary,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalTransactions / Number(limit)),
          totalTransactions,
          limit: Number(limit)
        }
      }
    });
  } catch (error) {
    console.error('User transactions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch your transactions'
    });
  }
});

// Export transactions (Admin/Staff/B2B only)
router.get('/export', auth, async (req, res) => {
  try {
    // Check if user has appropriate role
    const allowedRoles = ['admin', 'staff', 'b2b'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin, staff, or B2B role required.'
      });
    }

    const { 
      status, 
      paymentMethod, 
      type,
      amountRange,
      dateFrom, 
      dateTo,
      search 
    } = req.query;

    // Build query filters (same as main transactions endpoint)
    const query = {};
    
    if (status) query.status = status;
    if (paymentMethod) query['payment.method'] = paymentMethod;
    if (type) {
      if (type === 'sale') query.status = { $in: ['confirmed', 'shipped', 'delivered'] };
      if (type === 'refund') query.status = 'refunded';
      if (type === 'pending') query.status = 'pending';
    }
    
    if (amountRange) {
      const [min, max] = amountRange.split('-').map(v => v.replace('+', ''));
      query.totalAmount = {};
      if (max) {
        query.totalAmount.$gte = parseInt(min);
        query.totalAmount.$lte = parseInt(max);
      } else {
        query.totalAmount.$gte = parseInt(min);
      }
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'payment.reference': { $regex: search, $options: 'i' } },
        { 'customer.business_name': { $regex: search, $options: 'i' } },
        { 'customer.username': { $regex: search, $options: 'i' } }
      ];
    }

    const transactions = await Order.find(query)
      .populate('customer', 'username email business_name')
      .sort({ createdAt: -1 })
      .limit(1000) // Limit export to 1000 records for performance
      .lean();

    // Format transactions for export
    const formattedTransactions = transactions.map(order => ({
      id: order._id,
      orderId: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
      customer: order.customer?.business_name || order.customer?.username || 'Unknown Customer',
      customerEmail: order.customer?.email,
      amount: order.totalAmount || 0,
      status: mapOrderStatusToTransactionStatus(order.status),
      paymentMethod: order.payment?.method || 'cod',
      type: getTransactionType(order.status),
      reference: order.payment?.reference || 'N/A',
      date: order.createdAt,
      fee: calculateTransactionFee(order.totalAmount, order.payment?.method),
      netAmount: calculateNetAmount(order.totalAmount, order.payment?.method)
    }));

    res.status(200).json({
      status: 'success',
      data: {
        transactions: formattedTransactions
      }
    });
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export transactions'
    });
  }
});

// Export user's own transactions (Client only)
router.get('/my-transactions/export', auth, async (req, res) => {
  try {
    const { 
      status, 
      paymentMethod, 
      dateFrom, 
      dateTo 
    } = req.query;

    // Build query filters for user's orders only
    const query = { customer: req.user._id };
    
    if (status) query.status = status;
    if (paymentMethod) query['payment.method'] = paymentMethod;
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const transactions = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(500) // Limit export to 500 records for clients
      .lean();

    // Format transactions for export
    const formattedTransactions = transactions.map(order => ({
      id: order._id,
      orderId: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
      customer: req.user.business_name || req.user.username,
      customerEmail: req.user.email,
      amount: order.totalAmount || 0,
      status: mapOrderStatusToTransactionStatus(order.status),
      paymentMethod: order.payment?.method || 'cod',
      type: getTransactionType(order.status),
      reference: order.payment?.reference || 'N/A',
      date: order.createdAt,
      fee: calculateTransactionFee(order.totalAmount, order.payment?.method),
      netAmount: calculateNetAmount(order.totalAmount, order.payment?.method)
    }));

    res.status(200).json({
      status: 'success',
      data: {
        transactions: formattedTransactions
      }
    });
  } catch (error) {
    console.error('Export user transactions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export your transactions'
    });
  }
});

// Get single transaction details
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Build query based on user role
    let query = { _id: id };
    if (req.user.role === 'client') {
      query.customer = req.user._id; // Clients can only see their own transactions
    }

    const transaction = await Order.findOne(query)
      .populate('customer', 'username email business_name')
      .populate('items.product', 'name price category')
      .lean();

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
      });
    }

    // Format transaction for frontend
    const formattedTransaction = {
      id: transaction._id,
      orderId: transaction.orderNumber || `ORD-${transaction._id.toString().slice(-6)}`,
      customer: transaction.customer?.business_name || transaction.customer?.username || 'Unknown Customer',
      customerEmail: transaction.customer?.email,
      subtotal: transaction.subtotal || 0,
      totalDiscount: transaction.totalDiscount || 0,
      platformFee: transaction.platformFee || 0,
      amount: transaction.totalAmount || 0,
      status: mapOrderStatusToTransactionStatus(transaction.status),
      paymentMethod: transaction.payment?.method || 'cod',
      type: getTransactionType(transaction.status),
      reference: transaction.payment?.reference || 'N/A',
      date: transaction.createdAt,
      fee: calculateTransactionFee(transaction.totalAmount, transaction.payment?.method),
      netAmount: calculateNetAmount(transaction.totalAmount, transaction.payment?.method),
      items: transaction.items?.map(item => ({
        name: item.product?.name || item.productName || 'Unknown Product',
        quantity: item.quantity,
        price: item.unitPrice || item.price || 0,
        totalPrice: item.totalPrice || (item.unitPrice * item.quantity) || 0,
        discount: item.discount || 0,
        category: item.product?.category
      })) || [],
      appliedPromotions: transaction.appliedPromotions || [],
      deliveryAddress: transaction.delivery?.address,
      deliveryFee: transaction.delivery?.fee || 0,
      notes: transaction.notes,
      timeline: {
        ordered: transaction.createdAt,
        confirmed: transaction.confirmedAt,
        shipped: transaction.shippedAt,
        delivered: transaction.deliveredAt
      }
    };

    res.status(200).json({
      status: 'success',
      data: {
        transaction: formattedTransaction
      }
    });
  } catch (error) {
    console.error('Transaction detail error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch transaction details'
    });
  }
});

// Process refund (Admin/Staff only - B2B cannot process refunds)
router.post('/:id/refund', auth, async (req, res) => {
  try {
    // Check if user is admin or staff (B2B cannot process refunds)
    const allowedRoles = ['admin', 'staff'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin or staff role required.'
      });
    }

    const { id } = req.params;
    const { reason, refundType = 'full', amount: partialAmount, restoreStock = true } = req.body;

    const order = await Order.findById(id)
      .populate('customer', 'username email business_name')
      .populate('items.product', 'name');
    
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
      });
    }

    // Check if order can be refunded
    if (!['confirmed', 'packed', 'shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'This transaction cannot be refunded. Only confirmed, packed, shipped, or delivered orders can be refunded.'
      });
    }

    // Check if already refunded
    if (order.status === 'refunded') {
      return res.status(400).json({
        status: 'error',
        message: 'This transaction has already been refunded'
      });
    }

    // Calculate refund amount
    let refundAmount;
    if (refundType === 'full') {
      refundAmount = order.totalAmount;
    } else if (refundType === 'partial') {
      refundAmount = partialAmount || 0;
      if (refundAmount <= 0 || refundAmount > order.totalAmount) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid partial refund amount'
        });
      }
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid refund type. Must be "full" or "partial"'
      });
    }

    // Restore stock if requested (only for full refunds)
    const Product = require('../models/Product');
    if (restoreStock && refundType === 'full') {
      try {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity } }
          );
        }
        console.log('✅ Stock restored for refunded order');
      } catch (stockError) {
        console.error('⚠️  Stock restoration failed:', stockError);
        // Continue with refund even if stock restoration fails
      }
    }

    // Update order with refund information
    order.status = 'refunded';
    order.refund = {
      reason: reason || 'Admin initiated refund',
      type: refundType,
      processedBy: req.user._id,
      processedAt: new Date(),
      amount: refundAmount,
      stockRestored: restoreStock && refundType === 'full'
    };

    // Add to status history
    order.statusHistory.push({
      status: 'refunded',
      updatedBy: req.user._id,
      notes: `Refund processed: ${refundType} refund of ₱${refundAmount}. Reason: ${reason || 'Admin initiated refund'}`,
      timestamp: new Date()
    });

    await order.save();

    // Send refund notification email
    try {
      const notificationController = require('../controllers/notificationController');
      await sendRefundNotification(order, refundAmount, reason);
    } catch (emailError) {
      console.log('⚠️  Refund email notification failed:', emailError.message);
      // Don't fail the refund if email fails
    }

    res.status(200).json({
      status: 'success',
      message: 'Refund processed successfully',
      data: {
        transactionId: order._id,
        refundAmount: refundAmount,
        refundType: refundType,
        stockRestored: restoreStock && refundType === 'full',
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          customer: order.customer?.business_name || order.customer?.username,
          status: 'refunded'
        }
      }
    });
  } catch (error) {
    console.error('Refund processing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process refund',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to send refund notification
async function sendRefundNotification(order, refundAmount, reason) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('⚠️  Email not configured, skipping refund notification');
    return;
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const customerName = order.customer?.business_name || order.customer?.username || 'Valued Customer';
  const orderNumber = order.orderNumber || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;

  const emailContent = {
    from: `"FrozenFlow Trading" <${process.env.GMAIL_USER}>`,
    to: order.customer?.email,
    subject: `💰 Refund Processed - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">FrozenFlow Trading</h1>
            <p style="color: #64748b; margin: 5px 0 0 0;">Refund Notification</p>
          </div>
          
          <div style="background: #10b98115; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 25px;">
            <h2 style="color: #10b981; margin: 0 0 10px 0; font-size: 24px;">
              💰 Refund Processed
            </h2>
            <p style="margin: 0; color: #1e293b; font-size: 16px;">Your refund has been processed successfully.</p>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Refund Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Order Number:</td>
                <td style="padding: 8px 0; color: #1e293b;">${orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Refund Amount:</td>
                <td style="padding: 8px 0; color: #10b981; font-weight: bold; font-size: 18px;">₱${refundAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Refund Date:</td>
                <td style="padding: 8px 0; color: #1e293b;">${new Date().toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Payment Method:</td>
                <td style="padding: 8px 0; color: #1e293b;">${order.payment?.method || 'N/A'}</td>
              </tr>
            </table>
          </div>
          
          ${reason ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
              <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Refund Reason</h3>
              <p style="margin: 0; color: #92400e;">${reason}</p>
            </div>
          ` : ''}
          
          <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0891b2; margin-bottom: 25px;">
            <h3 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px;">What Happens Next?</h3>
            <p style="margin: 0; color: #0c4a6e;">
              The refund will be processed back to your original payment method within 5-10 business days.
              ${order.payment?.method === 'cod' ? 'Since you paid with Cash on Delivery, please contact us to arrange the refund.' : ''}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #64748b; margin: 0 0 10px 0;">Questions about your refund?</p>
            <p style="color: #2563eb; font-weight: bold; margin: 0;">
              📧 ${process.env.GMAIL_USER || 'support@frozenflow.com'}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated notification from FrozenFlow Trading<br>
              Generated on ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
Dear ${customerName},

REFUND PROCESSED

Your refund has been processed successfully.

REFUND DETAILS:
- Order Number: ${orderNumber}
- Refund Amount: ₱${refundAmount.toFixed(2)}
- Refund Date: ${new Date().toLocaleDateString()}
- Payment Method: ${order.payment?.method || 'N/A'}

${reason ? `REFUND REASON:\n${reason}\n\n` : ''}

WHAT HAPPENS NEXT:
The refund will be processed back to your original payment method within 5-10 business days.
${order.payment?.method === 'cod' ? 'Since you paid with Cash on Delivery, please contact us to arrange the refund.' : ''}

Questions? Contact us at ${process.env.GMAIL_USER || 'support@frozenflow.com'}

Best regards,
FrozenFlow Trading Team

---
This is an automated notification from FrozenFlow Trading
Generated on ${new Date().toLocaleString()}
    `.trim()
  };

  await transporter.sendMail(emailContent);
  console.log('✅ Refund notification sent to:', order.customer?.email);
}

// Helper functions
function mapOrderStatusToTransactionStatus(orderStatus) {
  const statusMap = {
    'pending': 'pending',
    'confirmed': 'completed',
    'shipped': 'completed',
    'delivered': 'completed',
    'cancelled': 'cancelled',
    'refunded': 'refunded'
  };
  return statusMap[orderStatus] || 'pending';
}

function getTransactionType(orderStatus) {
  if (orderStatus === 'refunded') return 'refund';
  if (['confirmed', 'shipped', 'delivered'].includes(orderStatus)) return 'sale';
  return 'sale';
}

function calculateTransactionFee(amount, paymentMethod) {
  // Calculate fees based on payment method
  const feeRates = {
    'gcash': 0.02, // 2% for GCash
    'bank_transfer': 0.01, // 1% for bank transfer
    'cod': 0, // No fee for COD
    'credit': 0.025 // 2.5% for credit card
  };
  
  const rate = feeRates[paymentMethod] || 0;
  return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
}

function calculateNetAmount(amount, paymentMethod) {
  const fee = calculateTransactionFee(amount, paymentMethod);
  return amount - fee;
}

async function calculateTransactionSummary() {
  try {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalEarnings: {
            $sum: {
              $cond: [
                { $in: ['$status', ['confirmed', 'shipped', 'delivered']] },
                '$totalAmount',
                0
              ]
            }
          },
          pendingPayouts: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'pending'] },
                '$totalAmount',
                0
              ]
            }
          },
          refunds: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'refunded'] },
                '$totalAmount',
                0
              ]
            }
          },
          completedTransactions: {
            $sum: {
              $cond: [
                { $in: ['$status', ['confirmed', 'shipped', 'delivered']] },
                1,
                0
              ]
            }
          },
          pendingTransactions: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'pending'] },
                1,
                0
              ]
            }
          },
          failedTransactions: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'cancelled'] },
                1,
                0
              ]
            }
          }
        }
      }
    ];

    const result = await Order.aggregate(pipeline);
    const summary = result[0] || {
      totalEarnings: 0,
      pendingPayouts: 0,
      refunds: 0,
      completedTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0
    };

    // Calculate total fees
    summary.totalFees = summary.totalEarnings * 0.015; // Assume average 1.5% fee

    return summary;
  } catch (error) {
    console.error('Summary calculation error:', error);
    return {
      totalEarnings: 0,
      pendingPayouts: 0,
      refunds: 0,
      totalFees: 0,
      completedTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0
    };
  }
}

async function calculateUserTransactionSummary(userId) {
  try {
    const pipeline = [
      { $match: { customer: userId } },
      {
        $group: {
          _id: null,
          totalSpent: {
            $sum: {
              $cond: [
                { $in: ['$status', ['confirmed', 'shipped', 'delivered']] },
                '$totalAmount',
                0
              ]
            }
          },
          pendingOrders: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'pending'] },
                '$totalAmount',
                0
              ]
            }
          },
          refundedAmount: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'refunded'] },
                '$totalAmount',
                0
              ]
            }
          },
          completedOrders: {
            $sum: {
              $cond: [
                { $in: ['$status', ['confirmed', 'shipped', 'delivered']] },
                1,
                0
              ]
            }
          },
          pendingOrders: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'pending'] },
                1,
                0
              ]
            }
          }
        }
      }
    ];

    const result = await Order.aggregate(pipeline);
    const summary = result[0] || {
      totalSpent: 0,
      pendingOrders: 0,
      refundedAmount: 0,
      completedOrders: 0,
      pendingOrders: 0
    };

    // Map to transaction summary format
    return {
      totalEarnings: summary.totalSpent,
      pendingPayouts: summary.pendingOrders,
      refunds: summary.refundedAmount,
      totalFees: 0, // Clients don't see fees
      completedTransactions: summary.completedOrders,
      pendingTransactions: summary.pendingOrders,
      failedTransactions: 0
    };
  } catch (error) {
    console.error('User summary calculation error:', error);
    return {
      totalEarnings: 0,
      pendingPayouts: 0,
      refunds: 0,
      totalFees: 0,
      completedTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0
    };
  }
}

module.exports = router;
