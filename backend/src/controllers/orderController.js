const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Get all orders (admin/staff) or user's orders (client)
const getOrders = async (req, res) => {
  try {
    let orders;
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      orders = await Order.find().populate('customer', 'username email businessInfo').sort({ createdAt: -1 });
    } else {
      orders = await Order.find({ customer: req.user.id }).sort({ createdAt: -1 });
    }

    res.status(200).json({
      status: 'success',
      data: { orders }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Create new order
const createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { 
      items, 
      paymentMethod, 
      deliveryAddress, 
      address,
      phone,
      notes,
      subtotal: clientSubtotal,
      totalDiscount: clientTotalDiscount,
      totalAmount: clientTotalAmount,
      appliedPromotions
    } = req.body;

    // Validate stock availability
    let calculatedSubtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const productId = item.productId || item.product;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          status: 'error',
          message: `Product not found: ${productId}`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          status: 'error',
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        });
      }

      const itemTotal = product.price * item.quantity;
      calculatedSubtotal += itemTotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        totalPrice: itemTotal
      });
    }

    // Use client-provided totals if available (includes discounts), otherwise use calculated
    const subtotal = clientSubtotal || calculatedSubtotal;
    const totalDiscount = clientTotalDiscount || 0;
    const totalAmount = clientTotalAmount || calculatedSubtotal;

    // Generate order number
    const orderCount = await Order.countDocuments();
    const orderNumber = `ORD-${Date.now()}-${String(orderCount + 1).padStart(4, '0')}`;

    // Create order
    const order = await Order.create({
      orderNumber,
      customer: req.user.id,
      items: orderItems,
      subtotal: subtotal,
      totalDiscount: totalDiscount,
      totalAmount: totalAmount,
      appliedPromotions: appliedPromotions || [],
      payment: {
        method: paymentMethod || 'cod',
        status: 'pending'
      },
      delivery: {
        address: address || deliveryAddress || req.user.businessInfo?.address || 'No address provided',
        contactNumber: phone || req.user.businessInfo?.phone
      },
      notes,
      status: 'pending'
    });

    // Deduct stock
    for (const item of items) {
      const productId = item.productId || item.product;
      await Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: -item.quantity } }
      );
    }

    const populatedOrder = await Order.findById(order._id).populate('customer', 'username email businessInfo');

    // Award loyalty points: 1 point for every ₱10 spent
    try {
      const pointsEarned = Math.floor(totalAmount / 10);
      if (pointsEarned > 0) {
        await User.findByIdAndUpdate(
          req.user.id,
          { $inc: { loyaltyPoints: pointsEarned } }
        );
        console.log(`🎁 Awarded ${pointsEarned} loyalty points to user ${req.user.id} (Order: ₱${totalAmount.toFixed(2)})`);
      }
    } catch (loyaltyError) {
      console.error('⚠️  Failed to award loyalty points:', loyaltyError);
      // Don't fail order creation if loyalty points fail
    }

    // Send order confirmation email to customer
    try {
      await sendOrderConfirmationEmail(populatedOrder);
      console.log('✅ Order confirmation email sent to:', populatedOrder.customer.email);
    } catch (emailError) {
      console.error('⚠️  Failed to send order confirmation email:', emailError);
      // Don't fail order creation if email fails
    }

    // Send order notification email to admin
    try {
      await sendAdminOrderNotification(populatedOrder);
      console.log('✅ Admin notification email sent for order:', populatedOrder.orderNumber);
    } catch (emailError) {
      console.error('⚠️  Failed to send admin notification email:', emailError);
      // Don't fail order creation if email fails
    }

    res.status(201).json({
      status: 'success',
      message: 'Order created successfully',
      data: { order: populatedOrder }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// Update order status (admin/staff only)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin or staff role required.'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Add status history entry
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      notes
    });

    order.status = status;
    await order.save();

    // Award bonus loyalty points when order is completed/delivered
    // This gives extra points as a completion bonus (10% of order value)
    if (status === 'delivered' || status === 'completed') {
      try {
        const bonusPoints = Math.floor(order.totalAmount / 100); // 1 point per ₱100 as bonus
        if (bonusPoints > 0) {
          await User.findByIdAndUpdate(
            order.customer,
            { $inc: { loyaltyPoints: bonusPoints } }
          );
          console.log(`🎉 Awarded ${bonusPoints} BONUS loyalty points for order completion (Order: ${order.orderNumber})`);
        }
      } catch (loyaltyError) {
        console.error('⚠️  Failed to award bonus loyalty points:', loyaltyError);
        // Don't fail status update if loyalty points fail
      }
    }

    const updatedOrder = await Order.findById(orderId).populate('customer', 'username email businessInfo');

    res.status(200).json({
      status: 'success',
      message: 'Order status updated successfully',
      data: { order: updatedOrder }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    let order;
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      order = await Order.findById(orderId).populate('customer', 'username email businessInfo');
    } else {
      order = await Order.findOne({ _id: orderId, customer: req.user.id });
    }

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { order }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

// Cancel order (client can cancel pending orders)
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    let order;
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      order = await Order.findById(orderId);
    } else {
      order = await Order.findOne({ _id: orderId, customer: req.user.id });
    }

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Only pending orders can be cancelled'
      });
    }

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }

    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      notes: 'Order cancelled by ' + (req.user.role === 'client' ? 'customer' : 'admin')
    });

    await order.save();

    res.status(200).json({
      status: 'success',
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

// Helper: Send order confirmation email
async function sendOrderConfirmationEmail(order) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return; // Skip if email not configured
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const customerName = order.customer.businessInfo?.business_name || order.customer.username;
  const orderNumber = order.orderNumber || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;

  // Format order items
  const itemsList = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.productName || item.name || 'Unknown Product'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₱${(item.unitPrice || item.price || 0).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₱${(item.totalPrice || item.subtotal || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const emailContent = {
    from: `"FrozenFlow Trading" <${process.env.GMAIL_USER}>`,
    to: order.customer.email,
    subject: `🎉 Order Confirmation - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">FrozenFlow Trading</h1>
            <p style="color: #64748b; margin: 5px 0 0 0;">Order Confirmation</p>
          </div>
          
          <div style="background: #10b98115; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 25px;">
            <h2 style="color: #10b981; margin: 0 0 10px 0; font-size: 24px;">
              🎉 Thank You for Your Order!
            </h2>
            <p style="margin: 0; color: #1e293b; font-size: 16px;">
              Hi ${customerName}, we've received your order and it's being processed.
            </p>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Order Details</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Order Number:</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Order Date:</td>
                <td style="padding: 8px 0; color: #1e293b;">${new Date(order.createdAt).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Payment Method:</td>
                <td style="padding: 8px 0; color: #1e293b; text-transform: capitalize;">${order.paymentMethod.replace(/_/g, ' ')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Status:</td>
                <td style="padding: 8px 0; color: #f59e0b; font-weight: bold; text-transform: uppercase;">${order.status}</td>
              </tr>
            </table>
            
            <h4 style="color: #1e293b; margin: 20px 0 10px 0; font-size: 16px;">Items Ordered:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #e2e8f0;">
                  <th style="padding: 10px; text-align: left; color: #475569;">Product</th>
                  <th style="padding: 10px; text-align: center; color: #475569;">Qty</th>
                  <th style="padding: 10px; text-align: right; color: #475569;">Price</th>
                  <th style="padding: 10px; text-align: right; color: #475569;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 15px 10px 10px 10px; text-align: right; font-weight: bold; color: #1e293b;">Total Amount:</td>
                  <td style="padding: 15px 10px 10px 10px; text-align: right; font-weight: bold; color: #059669; font-size: 20px;">₱${order.totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          ${order.delivery?.address || order.deliveryAddress ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
              <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">📍 Delivery Address</h3>
              <p style="margin: 0; color: #92400e;">${order.delivery?.address || order.deliveryAddress}</p>
            </div>
          ` : ''}
          
          ${order.notes ? `
            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0891b2; margin-bottom: 25px;">
              <h3 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px;">📝 Order Notes</h3>
              <p style="margin: 0; color: #0c4a6e;">${order.notes}</p>
            </div>
          ` : ''}
          
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 25px;">
            <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px;">📦 What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
              <li>We'll process your order and prepare it for delivery</li>
              <li>You'll receive email updates on your order status</li>
              <li>Track your order anytime in your account dashboard</li>
              <li>Contact us if you have any questions or concerns</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}" style="display: inline-block; background: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Track Your Order
            </a>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #64748b; margin: 0 0 10px 0;">Questions about your order?</p>
            <p style="color: #2563eb; font-weight: bold; margin: 0;">
              📧 ${process.env.GMAIL_USER || 'support@frozenflow.com'} | 📞 +63 917 123 4567
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated order confirmation from FrozenFlow Trading<br>
              Generated on ${new Date().toLocaleString()}<br>
              <br>
              Thank you for choosing FrozenFlow Trading!
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
Order Confirmation - FrozenFlow Trading

Thank You for Your Order!

Hi ${customerName}, we've received your order and it's being processed.

ORDER DETAILS:
- Order Number: ${orderNumber}
- Order Date: ${new Date(order.createdAt).toLocaleString()}
- Payment Method: ${order.paymentMethod.replace(/_/g, ' ')}
- Status: ${order.status.toUpperCase()}

ITEMS ORDERED:
${order.items.map(item => `- ${item.productName || item.name || 'Unknown Product'} x${item.quantity} @ ₱${(item.unitPrice || item.price || 0).toFixed(2)} = ₱${(item.totalPrice || item.subtotal || 0).toFixed(2)}`).join('\n')}

Total Amount: ₱${order.totalAmount.toFixed(2)}

${order.delivery?.address || order.deliveryAddress ? `DELIVERY ADDRESS:\n${order.delivery?.address || order.deliveryAddress}\n\n` : ''}
${order.notes ? `ORDER NOTES:\n${order.notes}\n\n` : ''}

WHAT'S NEXT?
- We'll process your order and prepare it for delivery
- You'll receive email updates on your order status
- Track your order anytime in your account dashboard
- Contact us if you have any questions or concerns

Track your order: ${process.env.FRONTEND_URL || 'http://localhost:8080'}

Questions? Contact us at:
📧 ${process.env.GMAIL_USER || 'support@frozenflow.com'}
📞 +63 917 123 4567

Best regards,
FrozenFlow Trading Team

---
This is an automated order confirmation from FrozenFlow Trading
Generated on ${new Date().toLocaleString()}
Thank you for choosing FrozenFlow Trading!
    `.trim()
  };

  await transporter.sendMail(emailContent);
}

// Helper: Send order notification to admin
async function sendAdminOrderNotification(order) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return; // Skip if email not configured
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const customerName = order.customer.businessInfo?.business_name || order.customer.username;
  const customerEmail = order.customer.email;
  const customerPhone = order.customer.businessInfo?.phone || 'Not provided';
  const orderNumber = order.orderNumber || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;

  // Format order items
  const itemsList = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.productName || item.name || 'Unknown Product'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₱${(item.unitPrice || item.price || 0).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₱${(item.totalPrice || item.subtotal || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const emailContent = {
    from: `"FrozenFlow Trading" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER, // Send to admin email
    subject: `🔔 New Order Received - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">FrozenFlow Trading</h1>
            <p style="color: #64748b; margin: 5px 0 0 0;">Admin Notification</p>
          </div>
          
          <div style="background: #2563eb15; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 25px;">
            <h2 style="color: #2563eb; margin: 0 0 10px 0; font-size: 24px;">
              🔔 New Order Received!
            </h2>
            <p style="margin: 0; color: #1e293b; font-size: 16px;">
              A new order has been placed by ${customerName}. Please review and process it.
            </p>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Order Details</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Order Number:</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Order Date:</td>
                <td style="padding: 8px 0; color: #1e293b;">${new Date(order.createdAt).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Payment Method:</td>
                <td style="padding: 8px 0; color: #1e293b; text-transform: capitalize;">${order.paymentMethod.replace(/_/g, ' ')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Status:</td>
                <td style="padding: 8px 0; color: #f59e0b; font-weight: bold; text-transform: uppercase;">${order.status}</td>
              </tr>
            </table>
            
            <h4 style="color: #1e293b; margin: 20px 0 10px 0; font-size: 16px;">Items Ordered:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #e2e8f0;">
                  <th style="padding: 10px; text-align: left; color: #475569;">Product</th>
                  <th style="padding: 10px; text-align: center; color: #475569;">Qty</th>
                  <th style="padding: 10px; text-align: right; color: #475569;">Price</th>
                  <th style="padding: 10px; text-align: right; color: #475569;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 15px 10px 10px 10px; text-align: right; font-weight: bold; color: #1e293b;">Total Amount:</td>
                  <td style="padding: 15px 10px 10px 10px; text-align: right; font-weight: bold; color: #059669; font-size: 20px;">₱${order.totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">👤 Customer Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #92400e; font-weight: bold;">Name:</td>
                <td style="padding: 8px 0; color: #92400e;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #92400e; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0; color: #92400e;">${customerEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #92400e; font-weight: bold;">Phone:</td>
                <td style="padding: 8px 0; color: #92400e;">${customerPhone}</td>
              </tr>
            </table>
          </div>
          
          ${order.delivery?.address || order.deliveryAddress ? `
            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0891b2; margin-bottom: 25px;">
              <h3 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px;">📍 Delivery Address</h3>
              <p style="margin: 0; color: #0c4a6e;">${order.delivery?.address || order.deliveryAddress}</p>
            </div>
          ` : ''}
          
          ${order.notes ? `
            <div style="background: #fce7f3; padding: 15px; border-radius: 8px; border-left: 4px solid #ec4899; margin-bottom: 25px;">
              <h3 style="color: #9f1239; margin: 0 0 10px 0; font-size: 16px;">📝 Customer Notes</h3>
              <p style="margin: 0; color: #9f1239;">${order.notes}</p>
            </div>
          ` : ''}
          
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 25px;">
            <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 16px;">✅ Action Required</h3>
            <ul style="margin: 0; padding-left: 20px; color: #065f46;">
              <li>Review the order details carefully</li>
              <li>Verify product availability and stock</li>
              <li>Update order status in the admin dashboard</li>
              <li>Prepare items for delivery/pickup</li>
              <li>Contact customer if there are any issues</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}" style="display: inline-block; background: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              View Order in Dashboard
            </a>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #64748b; margin: 0 0 10px 0;">Customer Contact:</p>
            <p style="color: #2563eb; font-weight: bold; margin: 0;">
              📧 ${customerEmail} | 📞 ${customerPhone}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated admin notification from FrozenFlow Trading<br>
              Generated on ${new Date().toLocaleString()}<br>
              <br>
              Please process this order as soon as possible
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
New Order Received - FrozenFlow Trading Admin Notification

A new order has been placed by ${customerName}. Please review and process it.

ORDER DETAILS:
- Order Number: ${orderNumber}
- Order Date: ${new Date(order.createdAt).toLocaleString()}
- Payment Method: ${order.paymentMethod.replace(/_/g, ' ')}
- Status: ${order.status.toUpperCase()}

ITEMS ORDERED:
${order.items.map(item => `- ${item.productName || item.name || 'Unknown Product'} x${item.quantity} @ ₱${(item.unitPrice || item.price || 0).toFixed(2)} = ₱${(item.totalPrice || item.subtotal || 0).toFixed(2)}`).join('\n')}

Total Amount: ₱${order.totalAmount.toFixed(2)}

CUSTOMER INFORMATION:
- Name: ${customerName}
- Email: ${customerEmail}
- Phone: ${customerPhone}

${order.delivery?.address || order.deliveryAddress ? `DELIVERY ADDRESS:\n${order.delivery?.address || order.deliveryAddress}\n\n` : ''}
${order.notes ? `CUSTOMER NOTES:\n${order.notes}\n\n` : ''}

ACTION REQUIRED:
- Review the order details carefully
- Verify product availability and stock
- Update order status in the admin dashboard
- Prepare items for delivery/pickup
- Contact customer if there are any issues

View order in dashboard: ${process.env.FRONTEND_URL || 'http://localhost:8080'}

Customer Contact:
📧 ${customerEmail}
📞 ${customerPhone}

---
This is an automated admin notification from FrozenFlow Trading
Generated on ${new Date().toLocaleString()}
Please process this order as soon as possible
    `.trim()
  };

  await transporter.sendMail(emailContent);
}

module.exports = {
  getOrders,
  createOrder,
  updateOrderStatus,
  getOrderById,
  cancelOrder
};
