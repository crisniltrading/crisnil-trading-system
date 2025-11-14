// Additional Email Templates for Crisnil Trading Corp
// All templates use FREE Gmail SMTP (no subscriptions)

const getCompanyInfo = () => ({
    name: process.env.COMPANY_NAME || 'Crisnil Trading Corp',
    email: process.env.COMPANY_EMAIL || 'admin@crisniltrading.com',
    phone: process.env.COMPANY_PHONE || '+63 917 123 4567',
    address: process.env.COMPANY_ADDRESS || 'Business District, Manila, Philippines',
    website: process.env.COMPANY_WEBSITE || 'www.crisniltrading.com',
    taxId: process.env.COMPANY_TAX_ID || 'TIN: 000-000-000-000',
    businessPermit: process.env.COMPANY_PERMIT || 'BP-2024-00000'
});

// Common email header
const getEmailHeader = (title, subtitle) => {
    const company = getCompanyInfo();
    return `
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">${company.name}</h1>
            <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">${company.taxId} | ${company.businessPermit}</p>
            <div style="background: rgba(255,255,255,0.2); padding: 12px; border-radius: 8px; margin-top: 20px;">
                <p style="color: white; margin: 0; font-size: 18px; font-weight: 500;">${title}</p>
                ${subtitle ? `<p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 14px;">${subtitle}</p>` : ''}
            </div>
        </div>
    `;
};

// Common email footer
const getEmailFooter = () => {
    const company = getCompanyInfo();
    return `
        <div style="background: #f8fafc; padding: 25px 30px; text-align: center; border-top: 3px solid #3b82f6;">
            <p style="color: #64748b; font-size: 13px; margin: 0 0 8px 0; line-height: 1.6;">
                <strong>${company.name}</strong><br>
                ${company.address}<br>
                ${company.taxId} | ${company.businessPermit}
            </p>
            <p style="color: #2563eb; font-weight: 600; margin: 10px 0;">
                📧 ${company.email} | 📞 ${company.phone}
            </p>
            <p style="color: #94a3b8; font-size: 11px; margin: 15px 0 0 0;">
                This is an automated message from ${company.name}<br>
                Generated on ${new Date().toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'long' })}<br>
                Please do not reply directly to this email.
            </p>
        </div>
    `;
};

module.exports = {
    getCompanyInfo,
    getEmailHeader,
    getEmailFooter,

    // 1. Customer Order Confirmation Email
    generateOrderConfirmation: (orderData) => {
        const company = getCompanyInfo();
        const customerName = orderData.customer?.businessInfo?.business_name || orderData.customer?.username || 'Valued Customer';
        
        const itemsList = orderData.items.map(item => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left;">${item.name}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">₱${item.price.toFixed(2)}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">₱${item.subtotal.toFixed(2)}</td>
            </tr>
        `).join('');

        return {
            from: company.email,
            to: orderData.customer.email,
            subject: `🎉 Order Confirmation #${orderData.orderNumber} - ${company.name}`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
                    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
                        ${getEmailHeader('🎉 ORDER CONFIRMED', 'Thank you for your order!')}
                        
                        <div style="padding: 40px 30px;">
                            <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px 0;">Dear <strong>${customerName}</strong>,</p>
                            <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 25px 0;">
                                Thank you for choosing ${company.name}! We're excited to confirm that we've received your order and it's being processed.
                            </p>

                            <!-- Order Summary -->
                            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border-left: 4px solid #3b82f6; margin-bottom: 25px;">
                                <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">📋 Order Summary</h3>
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Order Number:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-weight: 700; font-size: 16px;">${orderData.orderNumber}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Order Date:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">${new Date(orderData.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment Method:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">${orderData.paymentMethod.replace('_', ' ').toUpperCase()}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Status:</td>
                                        <td style="padding: 8px 0;"><span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 12px;">${orderData.status.toUpperCase()}</span></td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Order Items -->
                            <div style="margin-bottom: 25px;">
                                <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">📦 Order Items</h3>
                                <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                                    <thead>
                                        <tr style="background: #f1f5f9;">
                                            <th style="padding: 12px; text-align: left; color: #475569; font-weight: 600;">Product</th>
                                            <th style="padding: 12px; text-align: center; color: #475569; font-weight: 600;">Qty</th>
                                            <th style="padding: 12px; text-align: right; color: #475569; font-weight: 600;">Price</th>
                                            <th style="padding: 12px; text-align: right; color: #475569; font-weight: 600;">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${itemsList}
                                        <tr style="background: #dcfce7;">
                                            <td colspan="3" style="padding: 15px; text-align: right; color: #166534; font-weight: 700; font-size: 16px;">TOTAL:</td>
                                            <td style="padding: 15px; text-align: right; color: #166534; font-weight: 700; font-size: 18px;">₱${orderData.totalAmount.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Delivery Address -->
                            <div style="background: #fef3c7; padding: 20px; border-radius: 10px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
                                <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 18px;">🚚 Delivery Address</h3>
                                <p style="margin: 0; color: #92400e; line-height: 1.6;">${orderData.deliveryAddress}</p>
                            </div>

                            ${orderData.notes ? `
                            <div style="background: #e0f2fe; padding: 20px; border-radius: 10px; border-left: 4px solid #0891b2; margin-bottom: 25px;">
                                <h3 style="color: #0c4a6e; margin: 0 0 12px 0; font-size: 18px;">📝 Order Notes</h3>
                                <p style="margin: 0; color: #0c4a6e; line-height: 1.6;">${orderData.notes}</p>
                            </div>
                            ` : ''}

                            <!-- Next Steps -->
                            <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; border-left: 4px solid #10b981; margin-bottom: 25px;">
                                <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">✅ What Happens Next?</h3>
                                <ol style="margin: 0; padding-left: 20px; color: #065f46; line-height: 1.8;">
                                    <li>We're preparing your order for shipment</li>
                                    <li>You'll receive a shipping notification with tracking details</li>
                                    <li>Your order will be delivered to the address provided</li>
                                    <li>Enjoy your products from ${company.name}!</li>
                                </ol>
                            </div>

                            <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 10px;">
                                <p style="color: #64748b; margin: 0 0 10px 0;">Need help with your order?</p>
                                <p style="color: #2563eb; font-weight: 600; margin: 0;">Contact us at ${company.email} or ${company.phone}</p>
                            </div>
                        </div>
                        
                        ${getEmailFooter()}
                    </div>
                </div>
            `,
            text: `
Order Confirmation - ${company.name}

Dear ${customerName},

Thank you for your order! We've received it and it's being processed.

ORDER SUMMARY:
Order Number: ${orderData.orderNumber}
Order Date: ${new Date(orderData.createdAt).toLocaleDateString('en-PH')}
Payment Method: ${orderData.paymentMethod}
Status: ${orderData.status}

ORDER ITEMS:
${orderData.items.map(item => `- ${item.name} x${item.quantity} = ₱${item.subtotal.toFixed(2)}`).join('\n')}

TOTAL: ₱${orderData.totalAmount.toFixed(2)}

DELIVERY ADDRESS:
${orderData.deliveryAddress}

${orderData.notes ? `ORDER NOTES:\n${orderData.notes}\n\n` : ''}
Contact us: ${company.email} | ${company.phone}

Best regards,
${company.name}
            `.trim()
        };
    },

    // 2. Admin Order Notification
    generateAdminNotification: (type, data) => {
        const company = getCompanyInfo();
        let subject, title, content;

        switch(type) {
            case 'new_order':
                subject = `🔔 New Order #${data.orderNumber}`;
                title = '🔔 NEW ORDER RECEIVED';
                content = `
                    <p style="font-size: 15px; color: #475569; margin: 0 0 20px 0;">A new order has been placed and requires your attention.</p>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 10px;">
                        <h3 style="color: #1e293b; margin: 0 0 15px 0;">Order Details:</h3>
                        <p style="margin: 5px 0; color: #475569;"><strong>Order #:</strong> ${data.orderNumber}</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>Customer:</strong> ${data.customer?.businessInfo?.business_name || data.customer?.username}</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>Email:</strong> ${data.customer?.email}</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>Total:</strong> ₱${data.totalAmount?.toFixed(2)}</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>Payment:</strong> ${data.paymentMethod}</p>
                    </div>
                `;
                break;
            
            case 'low_stock':
                subject = `⚠️ Low Stock Alert - ${data.productName}`;
                title = '⚠️ LOW STOCK ALERT';
                content = `
                    <p style="font-size: 15px; color: #475569; margin: 0 0 20px 0;">The following product is running low on stock:</p>
                    <div style="background: #fef3c7; padding: 20px; border-radius: 10px; border-left: 4px solid #f59e0b;">
                        <h3 style="color: #92400e; margin: 0 0 15px 0;">Product Information:</h3>
                        <p style="margin: 5px 0; color: #92400e;"><strong>Product:</strong> ${data.productName}</p>
                        <p style="margin: 5px 0; color: #92400e;"><strong>Current Stock:</strong> ${data.currentStock} units</p>
                        <p style="margin: 5px 0; color: #92400e;"><strong>Reorder Level:</strong> ${data.reorderLevel} units</p>
                        <p style="margin: 15px 0 0 0; color: #92400e;"><strong>Action Required:</strong> Please reorder stock immediately.</p>
                    </div>
                `;
                break;

            default:
                subject = `Notification from ${company.name}`;
                title = 'NOTIFICATION';
                content = `<p>${JSON.stringify(data)}</p>`;
        }

        return {
            from: company.email,
            to: company.email,
            subject: subject,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
                    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
                        ${getEmailHeader(title)}
                        <div style="padding: 40px 30px;">
                            ${content}
                        </div>
                        ${getEmailFooter()}
                    </div>
                </div>
            `,
            text: `${title}\n\n${subject}\n\n${JSON.stringify(data, null, 2)}`
        };
    }
};
