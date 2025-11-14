const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/orders - list orders
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, mine } = req.query;
    const isAdminOrStaff = ['admin', 'staff'].includes(req.user.role);
    const query = {};

    if (!isAdminOrStaff || mine === 'true') {
      query.customer = req.user._id;
    }
    if (status) query.status = status;

    const orders = await Order.find(query)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 })
      .populate('customer', 'username email')
      .populate('items.product', 'name unit');

    const total = await Order.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: orders.length,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      orders
    });
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch orders' });
  }
});

// POST /api/orders - create order (checkout)
router.post('/', async (req, res) => {
  try {
    const { items, paymentMethod, paymentReference, paymentProofUrl, deliveryDate, address, phone, notes, subtotal: clientSubtotal, totalDiscount: clientDiscount, totalAmount: clientTotal, platformFee: clientPlatformFee } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No items provided' });
    }
    if (!address) {
      return res.status(400).json({ status: 'error', message: 'Delivery address is required' });
    }

    // Fetch products and build order items
    const productIds = items.map(i => i.product);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true });
    const productMap = new Map(products.map(p => [String(p._id), p]));

    const orderItems = [];
    let calculatedSubtotal = 0;

    // Validate stock availability and build order items
    for (const item of items) {
      const product = productMap.get(String(item.product));
      if (!product) {
        return res.status(400).json({ status: 'error', message: 'Invalid product in items' });
      }
      const qty = Number(item.quantity) || 1;
      if (product.stock !== undefined && product.stock < qty) {
        return res.status(400).json({ status: 'error', message: `Insufficient stock for ${product.name}` });
      }

      const unitPrice = product.price;
      const itemTotal = unitPrice * qty;

      orderItems.push({
        product: product._id,
        productName: product.name,
        quantity: qty,
        unitPrice,
        totalPrice: itemTotal,
        discount: 0  // Discount is calculated separately
      });
      calculatedSubtotal += itemTotal;
    }

    // Use client-provided discount values if available (from discount engine)
    // Otherwise calculate basic discounts
    const subtotal = clientSubtotal || calculatedSubtotal;
    const totalDiscount = clientDiscount || 0;
    const platformFee = clientPlatformFee || 0;
    const totalAmount = clientTotal || subtotal;

    const order = await Order.create({
      customer: req.user._id,
      items: orderItems,
      subtotal,
      totalDiscount,
      platformFee,
      totalAmount,
      payment: {
        method: paymentMethod === 'bank' ? 'bank_transfer' : paymentMethod || 'cod',
        amount: totalAmount,  // Use discounted amount
        status: (paymentMethod === 'cod' || !paymentMethod) ? 'pending' : 'pending',  // COD is pending until delivery, others pending until verified
        reference: paymentReference || undefined,
        proofUrl: paymentProofUrl || undefined  // Save payment proof image (base64)
      },
      delivery: {
        address,
        contactNumber: phone || undefined,
        preferredDate: deliveryDate ? new Date(deliveryDate) : undefined
      },
      notes: notes || undefined,
      statusHistory: [{ status: 'pending', updatedBy: req.user._id }],
      createdBy: req.user._id
    });
    // Decrement product stock quantities
    try {
      const ops = orderItems.map(oi => ({
        updateOne: {
          filter: { _id: oi.product },
          update: { $inc: { stock: -oi.quantity } }
        }
      }));
      if (ops.length) await Product.bulkWrite(ops);
    } catch (invErr) {
      console.error('Stock decrement error:', invErr);
      // Not fatal to order creation, but log it
    }

    res.status(201).json({ status: 'success', message: 'Order created', order });
  } catch (error) {
    console.error('Create order error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PATCH /api/orders/:id/status - update order status (staff/admin)
router.patch('/:id/status', restrictTo('admin', 'staff'), async (req, res) => {
  try {
    const { status, notes, estimatedDelivery, trackingNumber } = req.body;
    const allowed = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status' });
    }
    const update = { status, updatedBy: req.user._id, updatedAt: new Date() };
    if (status === 'confirmed') update.confirmedAt = new Date();
    if (status === 'packed') update.packedAt = new Date();
    if (status === 'shipped') update.shippedAt = new Date();
    if (status === 'delivered') update.deliveredAt = new Date();

    // Update tracking number if provided
    if (trackingNumber) {
      update.trackingNumber = trackingNumber;
    }

    // Update estimated delivery date if provided
    if (estimatedDelivery) {
      update['delivery.preferredDate'] = new Date(estimatedDelivery);
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: update, $push: { statusHistory: { status, updatedBy: req.user._id, notes, timestamp: new Date() } } },
      { new: true }
    ).populate('customer', 'username email business_name');

    if (!order) return res.status(404).json({ status: 'error', message: 'Order not found' });

    res.status(200).json({
      status: 'success',
      message: `Order ${status} successfully`,
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update order status' });
  }
});

// GET /api/orders/:id - get order details
router.get('/:id', async (req, res) => {
  try {
    const isAdminOrStaff = ['admin', 'staff'].includes(req.user.role);
    const query = isAdminOrStaff ? { _id: req.params.id } : { _id: req.params.id, customer: req.user._id };

    const order = await Order.findOne(query)
      .populate('customer', 'username email business_name')
      .populate('items.product', 'name unit category');

    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    res.status(200).json({ status: 'success', order });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch order details' });
  }
});

// PATCH /api/orders/:id/confirm - confirm order (admin/staff shortcut)
router.patch('/:id/confirm', restrictTo('admin', 'staff'), async (req, res) => {
  try {
    const { notes } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status: 'confirmed', confirmedAt: new Date(), updatedBy: req.user._id, updatedAt: new Date() },
        $push: { statusHistory: { status: 'confirmed', updatedBy: req.user._id, notes, timestamp: new Date() } }
      },
      { new: true }
    ).populate('customer', 'username email business_name');

    if (!order) return res.status(404).json({ status: 'error', message: 'Order not found' });

    res.status(200).json({
      status: 'success',
      message: 'Order confirmed successfully',
      order
    });
  } catch (error) {
    console.error('Confirm order error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to confirm order' });
  }
});

// PATCH /api/orders/:id/ship - mark order as shipped (admin/staff shortcut)
router.patch('/:id/ship', restrictTo('admin', 'staff'), async (req, res) => {
  try {
    const { notes, trackingNumber } = req.body;
    const update = {
      status: 'shipped',
      shippedAt: new Date(),
      updatedBy: req.user._id,
      updatedAt: new Date()
    };
    if (trackingNumber) update.trackingNumber = trackingNumber;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: update,
        $push: { statusHistory: { status: 'shipped', updatedBy: req.user._id, notes, timestamp: new Date() } }
      },
      { new: true }
    ).populate('customer', 'username email business_name');

    if (!order) return res.status(404).json({ status: 'error', message: 'Order not found' });

    res.status(200).json({
      status: 'success',
      message: 'Order marked as shipped successfully',
      order
    });
  } catch (error) {
    console.error('Ship order error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to mark order as shipped' });
  }
});

// PATCH /api/orders/:id/verify-payment - verify payment (admin/staff)
router.patch('/:id/verify-payment', restrictTo('admin', 'staff'), async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          'payment.status': 'verified',
          'payment.verifiedBy': req.user._id,
          'payment.verifiedAt': new Date()
        }
      },
      { new: true }
    ).populate('customer', 'username email business_name');

    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Payment verified successfully',
      order
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to verify payment' });
  }
});

// PATCH /api/orders/:id/cancel - cancel order (customer or admin/staff)
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    const isAdminOrStaff = ['admin', 'staff'].includes(req.user.role);

    // Find order - customers can only cancel their own orders
    const query = isAdminOrStaff
      ? { _id: req.params.id }
      : { _id: req.params.id, customer: req.user._id };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    // Check if order can be cancelled
    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot cancel order that is already ${order.status}`
      });
    }

    // Restore stock for cancelled orders
    try {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }
        );
      }
    } catch (stockError) {
      console.error('Stock restoration error:', stockError);
    }

    // Update order status to cancelled
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelledBy = req.user._id;
    order.cancellationReason = reason || 'No reason provided';
    order.updatedBy = req.user._id;
    order.updatedAt = new Date();

    order.statusHistory.push({
      status: 'cancelled',
      updatedBy: req.user._id,
      notes: reason || 'Order cancelled',
      timestamp: new Date()
    });

    await order.save();

    res.status(200).json({
      status: 'success',
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to cancel order' });
  }
});

// DELETE /api/orders/:id - delete order (admin only)
router.delete('/:id', restrictTo('admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    // Restore stock for deleted orders
    try {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }
        );
      }
    } catch (stockError) {
      console.error('Stock restoration error:', stockError);
      // Continue with deletion even if stock restoration fails
    }

    await Order.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete order' });
  }
});

module.exports = router;
