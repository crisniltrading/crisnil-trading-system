// Email Service for Crisnil Trading Corp
// Comprehensive email service with multiple templates

const nodemailer = require('nodemailer');
const emailTemplates = require('./emailTemplates');
const emailTemplatesExtended = require('./emailTemplatesExtended');
const emailTemplatesExtra = require('./emailTemplatesExtra');

class EmailService {
    constructor() {
        this.emailLogs = [];
    }

    // ========== CUSTOMER EMAILS ==========

    // Send order confirmation to customer
    async sendOrderConfirmation(orderData) {
        try {
            const emailContent = emailTemplates.generateOrderConfirmation(orderData);
            console.log('📧 Sending order confirmation...');
            const result = await this.sendViaGmail(emailContent);
            this.logEmail(emailContent, result);
            return result;
        } catch (error) {
            console.error('❌ Order confirmation failed:', error.message);
            throw error;
        }
    }

    // Send order status update to customer
    async sendOrderStatusUpdate(orderData, newStatus, message) {
        try {
            const emailContent = emailTemplatesExtended.generateOrderStatusUpdate(orderData, newStatus, message);
            console.log(`📧 Sending status update: ${newStatus}...`);
            const result = await this.sendViaGmail(emailContent);
            this.logEmail(emailContent, result);
            return result;
        } catch (error) {
            console.error('❌ Status update failed:', error.message);
            throw error;
        }
    }

    // Send invoice to customer
    async sendInvoice(invoiceData) {
        try {
            const emailContent = emailTemplatesExtended.generateInvoice(invoiceData);
            console.log('📧 Sending invoice...');
            const result = await this.sendViaGmail(emailContent);
            this.logEmail(emailContent, result);
            return result;
        } catch (error) {
            console.error('❌ Invoice sending failed:', error.message);
            throw error;
        }
    }

    // Send payment confirmation to customer
    async sendPaymentConfirmation(paymentData) {
        try {
            const emailContent = emailTemplatesExtra.generatePaymentConfirmation(paymentData);
            console.log('📧 Sending payment confirmation...');
            const result = await this.sendViaGmail(emailContent);
            this.logEmail(emailContent, result);
            return result;
        } catch (error) {
            console.error('❌ Payment confirmation failed:', error.message);
            throw error;
        }
    }

    // Send delivery notification to customer
    async sendDeliveryNotification(deliveryData) {
        try {
            const emailContent = emailTemplatesExtra.generateDeliveryNotification(deliveryData);
            console.log('📧 Sending delivery notification...');
            const result = await this.sendViaGmail(emailContent);
            this.logEmail(emailContent, result);
            return result;
        } catch (error) {
            console.error('❌ Delivery notification failed:', error.message);
            throw error;
        }
    }

    // Send welcome email to new user
    async sendWelcomeEmail(userData) {
        try {
            const emailContent = emailTemplatesExtra.generateWelcomeEmail(userData);
            console.log('📧 Sending welcome email...');
            const result = await this.sendViaGmail(emailContent);
            this.logEmail(emailContent, result);
            return result;
        } catch (error) {
            console.error('❌ Welcome email failed:', error.message);
            throw error;
        }
    }

    // Send password reset email
    async sendPasswordReset(resetData) {
        try {
            const emailContent = emailTemplatesExtra.generatePasswordReset(resetData);
            console.log('📧 Sending password reset...');
            const result = await this.sendViaGmail(emailContent);
            this.logEmail(emailContent, result);
            return result;
        } catch (error) {
            console.error('❌ Password reset failed:', error.message);
            throw error;
        }
    }

    // ========== ADMIN EMAILS ==========

    // Send admin notification (new order, low stock, etc.)
    async sendAdminNotification(type, data) {
        try {
            const emailContent = emailTemplates.generateAdminNotification(type, data);
            console.log(`📧 Sending admin notification: ${type}...`);
            const result = await this.sendViaGmail(emailContent);
            this.logEmail(emailContent, result);
            return result;
        } catch (error) {
            console.error('❌ Admin notification failed:', error.message);
            throw error;
        }
    }

    // ========== SUPPLIER EMAILS ==========

    // Send supplier purchase order
    async sendSupplierEmail(orderData) {
        try {
            const emailContent = this.generateSupplierEmail(orderData);
            console.log('📧 Sending supplier email...');
            const result = await this.sendViaGmail(emailContent);
            this.logEmail(emailContent, result);
            return result;
        } catch (error) {
            console.error('❌ Supplier email failed:', error.message);
            throw error;
        }
    }

    // Generate professional supplier email content
    generateSupplierEmail(orderData) {
        const companyName = orderData.companyName || 'Crisnil Trading Corp';
        const companyEmail = orderData.companyEmail || process.env.COMPANY_EMAIL || 'admin@crisniltrading.com';
        const adminEmail = orderData.adminEmail || process.env.COMPANY_EMAIL || 'admin@crisniltrading.com';
        const companyAddress = orderData.companyAddress || process.env.COMPANY_ADDRESS || 'Business District, Manila, Philippines';
        const companyPhone = orderData.companyPhone || process.env.COMPANY_PHONE || '+63 917 123 4567';
        
        const emailContent = {
            from: companyEmail,
            to: orderData.supplier.email,
            cc: orderData.sendCopy ? adminEmail : null,
            subject: `Purchase Order Request - ${orderData.id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
                    <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #2563eb; margin: 0;">${companyName}</h1>
                            <p style="color: #64748b; margin: 5px 0 0 0;">Purchase Order Request</p>
                        </div>
                        
                        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Order Details</h2>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Order ID:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">${orderData.id}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Product:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">${orderData.productName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Quantity:</td>
                                    <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${orderData.quantity} units</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Expected Delivery:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">${new Date(orderData.expectedDelivery).toLocaleDateString()}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Estimated Value:</td>
                                    <td style="padding: 8px 0; color: #059669; font-weight: bold;">₱${orderData.estimatedCost}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
                            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Delivery Information</h3>
                            <p style="margin: 0; color: #92400e;">
                                <strong>Company:</strong> ${companyName}<br>
                                <strong>Address:</strong> ${companyAddress}<br>
                                <strong>Contact:</strong> ${companyPhone}
                            </p>
                        </div>
                        
                        ${orderData.notes ? `
                            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0891b2; margin-bottom: 25px;">
                                <h3 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px;">Special Instructions</h3>
                                <p style="margin: 0; color: #0c4a6e;">${orderData.notes}</p>
                            </div>
                        ` : ''}
                        
                        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 25px;">
                            <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 16px;">Required Confirmation</h3>
                            <p style="margin: 0 0 10px 0; color: #065f46;">Please confirm receipt of this order and provide:</p>
                            <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                                <li>Order confirmation with your reference number</li>
                                <li>Estimated delivery schedule</li>
                                <li>Invoice details and payment terms</li>
                                <li>Quality certificates (if applicable)</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <p style="color: #64748b; margin: 0 0 10px 0;">For any questions, please contact us:</p>
                            <p style="color: #2563eb; font-weight: bold; margin: 0;">
                                📧 ${companyEmail} | 📞 ${companyPhone}
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                This is an automated message from ${companyName}<br>
                                Generated on ${new Date().toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            `,
            text: `
Dear ${orderData.supplier.name} Team,

We would like to place a purchase order for the following:

ORDER DETAILS:
- Order ID: ${orderData.id}
- Product: ${orderData.productName}
- Quantity: ${orderData.quantity} units
- Expected Delivery: ${new Date(orderData.expectedDelivery).toLocaleDateString()}
- Estimated Value: ₱${orderData.estimatedCost}

DELIVERY ADDRESS:
${companyName}
${companyAddress}
Contact: ${companyPhone}

${orderData.notes ? `SPECIAL INSTRUCTIONS:\n${orderData.notes}\n\n` : ''}

REQUIRED CONFIRMATION:
Please confirm receipt of this order and provide:
1. Order confirmation with your reference number
2. Estimated delivery schedule
3. Invoice details and payment terms
4. Quality certificates (if applicable)

Contact us at ${companyEmail} for any questions.

Best regards,
${companyName} Admin Team

---
This is an automated message from ${companyName}
Generated on ${new Date().toLocaleString()}
            `.trim()
        };

        return emailContent;
    }

    // ========== EMAIL SENDING & LOGGING ==========

    // Gmail SMTP Integration (FREE - Production Ready)
    async sendViaGmail(emailContent) {
        try {
            if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
                throw new Error('Gmail credentials not configured');
            }

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASSWORD
                }
            });

            const info = await transporter.sendMail({
                from: `"${emailContent.from}" <${process.env.GMAIL_USER}>`,
                to: emailContent.to,
                cc: emailContent.cc,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text
            });

            console.log('✅ Email sent successfully via Gmail!');
            console.log('📧 Message ID:', info.messageId);
            console.log('📬 To:', emailContent.to);

            return {
                success: true,
                messageId: info.messageId,
                sentAt: new Date().toISOString(),
                provider: 'gmail',
                response: info.response
            };
        } catch (error) {
            console.error('❌ Gmail sending failed:', error.message);
            throw error;
        }
    }

    // Log email for tracking
    logEmail(emailContent, result) {
        const logEntry = {
            to: emailContent.to,
            subject: emailContent.subject,
            sentAt: result.sentAt,
            messageId: result.messageId,
            success: result.success,
            provider: result.provider
        };

        this.emailLogs.unshift(logEntry);
        
        if (this.emailLogs.length > 100) {
            this.emailLogs = this.emailLogs.slice(0, 100);
        }
    }

    // Get email logs
    getEmailLogs() {
        return this.emailLogs;
    }
}

module.exports = new EmailService();
