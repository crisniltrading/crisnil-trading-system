// Extended Email Templates for Crisnil Trading Corp
// Additional email types: Status Updates, Invoices, Payments, Delivery, Welcome, Password Reset

const { getCompanyInfo, getEmailHeader, getEmailFooter } = require('./emailTemplates');

module.exports = {
    // 3. Order Status Update Email
    generateOrderStatusUpdate: (orderData, newStatus, message) => {
        const company = getCompanyInfo();
        const customerName = orderData.customer?.businessInfo?.business_name || orderData.customer?.username || 'Valued Customer';
        
        const statusConfig = {
            processing: { icon: '⚙️', color: '#3b82f6', bg: '#dbeafe', text: 'Your order is being processed' },
            shipped: { icon: '🚚', color: '#10b981', bg: '#d1fae5', text: 'Your order has been shipped' },
            delivered: { icon: '✅', color: '#059669', bg: '#d1fae5', text: 'Your order has been delivered' },
            cancelled: { icon: '❌', color: '#ef4444', bg: '#fee2e2', text: 'Your order has been cancelled' }
        };

        const status = statusConfig[newStatus] || statusConfig.processing;

        return {
            from: company.email,
            to: orderData.customer.email,
            subject: `${status.icon} Order Update #${orderData.orderNumber} - ${company.name}`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
                    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
                        ${getEmailHeader(`${status.icon} ORDER STATUS UPDATE`, orderData.orderNumber)}
                        
                        <div style="padding: 40px 30px;">
                            <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px 0;">Dear <strong>${customerName}</strong>,</p>
                            
                            <div style="background: ${status.bg}; padding: 25px; border-radius: 10px; border-left: 4px solid ${status.color}; margin-bottom: 25px; text-align: center;">
                                <h2 style="color: ${status.color}; margin: 0 0 10px 0; font-size: 24px;">${status.text}</h2>
                                <p style="color: ${status.color}; margin: 0; font-size: 15px;">${message || 'Status updated successfully'}</p>
                            </div>

                            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                                <h3 style="color: #1e293b; margin: 0 0 15px 0;">Order Information:</h3>
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Order Number:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-weight: 700;">${orderData.orderNumber}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Current Status:</td>
                                        <td style="padding: 8px 0;"><span style="background: ${status.bg}; color: ${status.color}; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 12px;">${newStatus.toUpperCase()}</span></td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Total Amount:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">₱${orderData.totalAmount?.toFixed(2)}</td>
                                    </tr>
                                </table>
                            </div>

                            ${newStatus === 'shipped' && orderData.trackingNumber ? `
                            <div style="background: #e0f2fe; padding: 20px; border-radius: 10px; border-left: 4px solid #0891b2; margin-bottom: 25px;">
                                <h3 style="color: #0c4a6e; margin: 0 0 12px 0;">📦 Tracking Information</h3>
                                <p style="margin: 0; color: #0c4a6e;"><strong>Tracking Number:</strong> ${orderData.trackingNumber}</p>
                                <p style="margin: 10px 0 0 0; color: #0c4a6e;"><strong>Courier:</strong> ${orderData.courier || 'Standard Delivery'}</p>
                            </div>
                            ` : ''}

                            <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 10px;">
                                <p style="color: #64748b; margin: 0 0 10px 0;">Questions about your order?</p>
                                <p style="color: #2563eb; font-weight: 600; margin: 0;">Contact us at ${company.email} or ${company.phone}</p>
                            </div>
                        </div>
                        
                        ${getEmailFooter()}
                    </div>
                </div>
            `,
            text: `Order Status Update - ${company.name}\n\nDear ${customerName},\n\n${status.text}\n\nOrder #: ${orderData.orderNumber}\nStatus: ${newStatus}\nTotal: ₱${orderData.totalAmount?.toFixed(2)}\n\n${message || ''}\n\nContact: ${company.email} | ${company.phone}`
        };
    },

    // 4. Invoice Email
    generateInvoice: (invoiceData) => {
        const company = getCompanyInfo();
        
        const itemsList = invoiceData.items.map(item => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">₱${item.unitPrice.toFixed(2)}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">₱${item.total.toFixed(2)}</td>
            </tr>
        `).join('');

        return {
            from: company.email,
            to: invoiceData.customerEmail,
            subject: `📄 Invoice #${invoiceData.invoiceNumber} - ${company.name}`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
                    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
                        ${getEmailHeader('📄 INVOICE', invoiceData.invoiceNumber)}
                        
                        <div style="padding: 40px 30px;">
                            <!-- Invoice Header -->
                            <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                                <div style="background: #f8fafc; padding: 20px; border-radius: 10px; flex: 1; margin-right: 10px;">
                                    <h3 style="color: #1e293b; margin: 0 0 10px 0; font-size: 14px;">BILL TO:</h3>
                                    <p style="margin: 0; color: #475569; line-height: 1.6;">
                                        <strong>${invoiceData.customerName}</strong><br>
                                        ${invoiceData.customerAddress}<br>
                                        ${invoiceData.customerEmail}
                                    </p>
                                </div>
                                <div style="background: #f8fafc; padding: 20px; border-radius: 10px; flex: 1; margin-left: 10px;">
                                    <p style="margin: 5px 0; color: #475569;"><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</p>
                                    <p style="margin: 5px 0; color: #475569;"><strong>Date:</strong> ${new Date(invoiceData.date).toLocaleDateString('en-PH')}</p>
                                    <p style="margin: 5px 0; color: #475569;"><strong>Due Date:</strong> ${new Date(invoiceData.dueDate).toLocaleDateString('en-PH')}</p>
                                    <p style="margin: 5px 0; color: #475569;"><strong>Terms:</strong> ${invoiceData.paymentTerms}</p>
                                </div>
                            </div>

                            <!-- Invoice Items -->
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                                <thead>
                                    <tr style="background: #f1f5f9;">
                                        <th style="padding: 12px; text-align: left; color: #475569; font-weight: 600;">Description</th>
                                        <th style="padding: 12px; text-align: center; color: #475569; font-weight: 600;">Qty</th>
                                        <th style="padding: 12px; text-align: right; color: #475569; font-weight: 600;">Unit Price</th>
                                        <th style="padding: 12px; text-align: right; color: #475569; font-weight: 600;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsList}
                                </tbody>
                            </table>

                            <!-- Totals -->
                            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                                <table style="width: 100%; max-width: 300px; margin-left: auto;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b;">Subtotal:</td>
                                        <td style="padding: 8px 0; text-align: right; color: #1e293b; font-weight: 600;">₱${invoiceData.subtotal.toFixed(2)}</td>
                                    </tr>
                                    ${invoiceData.tax ? `
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b;">Tax (${invoiceData.taxRate}%):</td>
                                        <td style="padding: 8px 0; text-align: right; color: #1e293b; font-weight: 600;">₱${invoiceData.tax.toFixed(2)}</td>
                                    </tr>
                                    ` : ''}
                                    ${invoiceData.discount ? `
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b;">Discount:</td>
                                        <td style="padding: 8px 0; text-align: right; color: #ef4444; font-weight: 600;">-₱${invoiceData.discount.toFixed(2)}</td>
                                    </tr>
                                    ` : ''}
                                    <tr style="border-top: 2px solid #cbd5e1;">
                                        <td style="padding: 12px 0; color: #1e293b; font-weight: 700; font-size: 16px;">TOTAL DUE:</td>
                                        <td style="padding: 12px 0; text-align: right; color: #166534; font-weight: 700; font-size: 20px;">₱${invoiceData.total.toFixed(2)}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Payment Instructions -->
                            <div style="background: #fef3c7; padding: 20px; border-radius: 10px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
                                <h3 style="color: #92400e; margin: 0 0 12px 0;">💳 Payment Instructions</h3>
                                <p style="margin: 0; color: #92400e; line-height: 1.6;">
                                    ${invoiceData.paymentInstructions || 'Please contact us for payment details.'}
                                </p>
                            </div>

                            ${invoiceData.notes ? `
                            <div style="background: #e0f2fe; padding: 20px; border-radius: 10px; border-left: 4px solid #0891b2;">
                                <h3 style="color: #0c4a6e; margin: 0 0 12px 0;">📝 Notes</h3>
                                <p style="margin: 0; color: #0c4a6e; line-height: 1.6;">${invoiceData.notes}</p>
                            </div>
                            ` : ''}
                        </div>
                        
                        ${getEmailFooter()}
                    </div>
                </div>
            `,
            text: `Invoice #${invoiceData.invoiceNumber}\n\n${company.name}\n\nBill To: ${invoiceData.customerName}\nDate: ${new Date(invoiceData.date).toLocaleDateString('en-PH')}\nDue: ${new Date(invoiceData.dueDate).toLocaleDateString('en-PH')}\n\nTOTAL DUE: ₱${invoiceData.total.toFixed(2)}\n\nContact: ${company.email}`
        };
    }
};
