const Order = require('../models/Order');
const User = require('../models/User');

// Send order status notification email
const sendOrderStatusNotification = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({
        status: 'error',
        message: 'Order ID and status are required'
      });
    }

    // Fetch order with customer details
    const order = await Order.findById(orderId)
      .populate('customer', 'username email business_name')
      .populate('items.product', 'name');

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Check if Gmail is configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.log('⚠️  Email notification skipped: Gmail not configured');
      return res.status(200).json({
        status: 'success',
        message: 'Notification logged (email not configured)',
        emailSent: false
      });
    }

    // Generate email content
    const emailContent = generateOrderStatusEmail(order, status);

    // Send email using nodemailer
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: `"FrozenFlow Trading" <${process.env.GMAIL_USER}>`,
      to: order.customer.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    console.log('✅ Order status notification sent to:', order.customer.email);

    res.status(200).json({
      status: 'success',
      message: 'Notification sent successfully',
      emailSent: true
    });
  } catch (error) {
    console.error('❌ Notification error:', error);
    
    // Don't fail the request if email fails
    res.status(200).json({
      status: 'success',
      message: 'Notification logged (email failed)',
      emailSent: false,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Generate email content for order status updates
function generateOrderStatusEmail(order, status) {
  const customerName = order.customer.business_name || order.customer.username;
  const orderNumber = order.orderNumber || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;
  
  const statusMessages = {
    pending: {
      title: 'Order Received',
      message: 'We have received your order and it is being processed.',
      color: '#f59e0b',
      icon: '📦'
    },
    confirmed: {
      title: 'Order Confirmed',
      message: 'Your order has been confirmed and is being prepared.',
      color: '#3b82f6',
      icon: '✅'
    },
    packed: {
      title: 'Order Packed',
      message: 'Your order has been packed and is ready for shipping.',
      color: '#8b5cf6',
      icon: '📦'
    },
    shipped: {
      title: 'Order Shipped',
      message: 'Your order is on the way! You should receive it soon.',
      color: '#06b6d4',
      icon: '🚚'
    },
    delivered: {
      title: 'Order Delivered',
      message: 'Your order has been delivered. Thank you for your business!',
      color: '#10b981',
      icon: '🎉'
    },
    cancelled: {
      title: 'Order Cancelled',
      message: 'Your order has been cancelled. If you have questions, please contact us.',
      color: '#ef4444',
      icon: '❌'
    }
  };

  const statusInfo = statusMessages[status] || statusMessages.pending;
  
  // Format order items
  const itemsList = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.productName || item.product?.name || 'Product'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₱${item.totalPrice.toFixed(2)}</td>
    </tr>
  `).join('');

  const subject = `${statusInfo.icon} ${statusInfo.title} - ${orderNumber}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">FrozenFlow Trading</h1>
          <p style="color: #64748b; margin: 5px 0 0 0;">Order Status Update</p>
        </div>
        
        <div style="background: ${statusInfo.color}15; padding: 20px; border-radius: 8px; border-left: 4px solid ${statusInfo.color}; margin-bottom: 25px;">
          <h2 style="color: ${statusInfo.color}; margin: 0 0 10px 0; font-size: 24px;">
            ${statusInfo.icon} ${statusInfo.title}
          </h2>
          <p style="margin: 0; color: #1e293b; font-size: 16px;">${statusInfo.message}</p>
        </div>
        
        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Order Number:</td>
              <td style="padding: 8px 0; color: #1e293b;">${orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Order Date:</td>
              <td style="padding: 8px 0; color: #1e293b;">${new Date(order.createdAt).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Status:</td>
              <td style="padding: 8px 0; color: ${statusInfo.color}; font-weight: bold; text-transform: uppercase;">${status}</td>
            </tr>
          </table>
          
          <h4 style="color: #1e293b; margin: 20px 0 10px 0; font-size: 16px;">Items Ordered:</h4>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #e2e8f0;">
                <th style="padding: 10px; text-align: left; color: #475569;">Product</th>
                <th style="padding: 10px; text-align: center; color: #475569;">Qty</th>
                <th style="padding: 10px; text-align: right; color: #475569;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 15px 10px 10px 10px; text-align: right; font-weight: bold; color: #1e293b;">Total:</td>
                <td style="padding: 15px 10px 10px 10px; text-align: right; font-weight: bold; color: #059669; font-size: 18px;">₱${order.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        ${order.delivery?.address ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Delivery Address</h3>
            <p style="margin: 0; color: #92400e;">${order.delivery.address}</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #64748b; margin: 0 0 10px 0;">Questions about your order?</p>
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
  `;

  const text = `
Dear ${customerName},

${statusInfo.title.toUpperCase()}

${statusInfo.message}

ORDER DETAILS:
- Order Number: ${orderNumber}
- Order Date: ${new Date(order.createdAt).toLocaleDateString()}
- Status: ${status.toUpperCase()}

ITEMS ORDERED:
${order.items.map(item => `- ${item.productName || 'Product'} x${item.quantity} - ₱${item.totalPrice.toFixed(2)}`).join('\n')}

Total: ₱${order.totalAmount.toFixed(2)}

${order.delivery?.address ? `DELIVERY ADDRESS:\n${order.delivery.address}\n\n` : ''}

Questions? Contact us at ${process.env.GMAIL_USER || 'support@frozenflow.com'}

Best regards,
FrozenFlow Trading Team

---
This is an automated notification from FrozenFlow Trading
Generated on ${new Date().toLocaleString()}
  `.trim();

  return { subject, html, text };
}

module.exports = {
  sendOrderStatusNotification
};
