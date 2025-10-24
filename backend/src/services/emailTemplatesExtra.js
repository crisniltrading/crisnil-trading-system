// Extra Email Templates for Crisnil Trading Corp
// Payment Confirmation, Delivery Notification, Welcome, Password Reset

const { getCompanyInfo, getEmailHeader, getEmailFooter } = require('./emailTemplates');

module.exports = {
    // 5. Payment Confirmation Email
    generatePaymentConfirmation: (paymentData) => {
        const company = getCompanyInfo();
        
        return {
            from: company.email,
            to: paymentData.customerEmail,
            subject: `✅ Payment Received #${paymentData.paymentId} - ${company.name}`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
                    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
                        ${getEmailHeader('✅ PAYMENT CONFIRMED', 'Thank you for your payment!')}
                        
                        <div style="padding: 40px 30px;">
                            <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px 0;">Dear <strong>${paymentData.customerName}</strong>,</p>
                            
                            <div style="background: #d1fae5; padding: 25px; border-radius: 10px; border-left: 4px solid #10b981; margin-bottom: 25px; text-align: center;">
                                <h2 style="color: #065f46; margin: 0 0 10px 0; font-size: 24px;">Payment Successfully Received!</h2>
                                <p style="color: #065f46; margin: 0; font-size: 32px; font-weight: 700;">₱${paymentData.amount.toFixed(2)}</p>
                            </div>

                            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                                <h3 style="color: #1e293b; margin: 0 0 15px 0;">Payment Details:</h3>
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment ID:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-weight: 700;">${paymentData.paymentId}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Order Number:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">${paymentData.orderNumber}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment Date:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">${new Date(paymentData.date).toLocaleString('en-PH')}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment Method:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">${paymentData.method}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Amount Paid:</td>
                                        <td style="padding: 8px 0; color: #166534; font-weight: 700; font-size: 18px;">₱${paymentData.amount.toFixed(2)}</td>
                                    </tr>
                                </table>
                            </div>

                            ${paymentData.receiptUrl ? `
                            <div style="text-align: center; margin-bottom: 25px;">
                                <a href="${paymentData.receiptUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">📄 Download Receipt</a>
                            </div>
                            ` : ''}

                            <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; border-left: 4px solid #10b981;">
                                <p style="margin: 0; color: #065f46; line-height: 1.6;">
                                    Your payment has been successfully processed. A receipt has been generated for your records.
                                    ${paymentData.nextSteps || 'Your order will be processed shortly.'}
                                </p>
                            </div>
                        </div>
                        
                        ${getEmailFooter()}
                    </div>
                </div>
            `,
            text: `Payment Confirmation - ${company.name}\n\nPayment ID: ${paymentData.paymentId}\nOrder: ${paymentData.orderNumber}\nAmount: ₱${paymentData.amount.toFixed(2)}\nDate: ${new Date(paymentData.date).toLocaleString('en-PH')}\n\nThank you for your payment!\n\nContact: ${company.email}`
        };
    },

    // 6. Delivery Notification Email
    generateDeliveryNotification: (deliveryData) => {
        const company = getCompanyInfo();
        
        return {
            from: company.email,
            to: deliveryData.customerEmail,
            subject: `🚚 Out for Delivery - Order #${deliveryData.orderNumber}`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
                    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
                        ${getEmailHeader('🚚 OUT FOR DELIVERY', deliveryData.orderNumber)}
                        
                        <div style="padding: 40px 30px;">
                            <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px 0;">Dear <strong>${deliveryData.customerName}</strong>,</p>
                            
                            <div style="background: #dbeafe; padding: 25px; border-radius: 10px; border-left: 4px solid #3b82f6; margin-bottom: 25px; text-align: center;">
                                <h2 style="color: #1e40af; margin: 0 0 10px 0; font-size: 24px;">Your order is on the way!</h2>
                                <p style="color: #1e40af; margin: 0; font-size: 15px;">Expected delivery: <strong>${new Date(deliveryData.estimatedDelivery).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
                            </div>

                            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                                <h3 style="color: #1e293b; margin: 0 0 15px 0;">Delivery Information:</h3>
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Order Number:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-weight: 700;">${deliveryData.orderNumber}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Tracking Number:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-weight: 700;">${deliveryData.trackingNumber}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Courier:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">${deliveryData.courier}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Driver:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">${deliveryData.driverName || 'Assigned'}</td>
                                    </tr>
                                    ${deliveryData.driverPhone ? `
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Driver Contact:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">${deliveryData.driverPhone}</td>
                                    </tr>
                                    ` : ''}
                                </table>
                            </div>

                            <div style="background: #fef3c7; padding: 20px; border-radius: 10px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
                                <h3 style="color: #92400e; margin: 0 0 12px 0;">📍 Delivery Address</h3>
                                <p style="margin: 0; color: #92400e; line-height: 1.6;">${deliveryData.deliveryAddress}</p>
                            </div>

                            ${deliveryData.trackingUrl ? `
                            <div style="text-align: center; margin-bottom: 25px;">
                                <a href="${deliveryData.trackingUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">📦 Track Your Order</a>
                            </div>
                            ` : ''}

                            <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; border-left: 4px solid #10b981;">
                                <h3 style="color: #065f46; margin: 0 0 12px 0;">📋 Delivery Instructions</h3>
                                <ul style="margin: 0; padding-left: 20px; color: #065f46; line-height: 1.8;">
                                    <li>Please ensure someone is available to receive the delivery</li>
                                    <li>Valid ID may be required for verification</li>
                                    <li>Inspect items upon delivery</li>
                                    <li>Contact us immediately if there are any issues</li>
                                </ul>
                            </div>
                        </div>
                        
                        ${getEmailFooter()}
                    </div>
                </div>
            `,
            text: `Delivery Notification - ${company.name}\n\nOrder #${deliveryData.orderNumber} is out for delivery!\n\nTracking: ${deliveryData.trackingNumber}\nCourier: ${deliveryData.courier}\nExpected: ${new Date(deliveryData.estimatedDelivery).toLocaleDateString('en-PH')}\n\nContact: ${company.email}`
        };
    },

    // 7. Welcome Email
    generateWelcomeEmail: (userData) => {
        const company = getCompanyInfo();
        
        return {
            from: company.email,
            to: userData.email,
            subject: `🎉 Welcome to ${company.name}!`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
                    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
                        ${getEmailHeader('🎉 WELCOME!', 'Thank you for joining us')}
                        
                        <div style="padding: 40px 30px;">
                            <p style="font-size: 18px; color: #1e293b; margin: 0 0 20px 0;">Hello <strong>${userData.username}</strong>,</p>
                            
                            <div style="background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%); padding: 30px; border-radius: 10px; margin-bottom: 25px; text-align: center;">
                                <h2 style="color: #1e40af; margin: 0 0 15px 0; font-size: 26px;">Welcome to ${company.name}!</h2>
                                <p style="color: #1e40af; margin: 0; font-size: 15px; line-height: 1.6;">
                                    We're excited to have you on board. Your account has been successfully created and you're ready to start shopping!
                                </p>
                            </div>

                            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                                <h3 style="color: #1e293b; margin: 0 0 15px 0;">Your Account Details:</h3>
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Username:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-weight: 700;">${userData.username}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">${userData.email}</td>
                                    </tr>
                                    ${userData.businessInfo?.business_name ? `
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Business:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">${userData.businessInfo.business_name}</td>
                                    </tr>
                                    ` : ''}
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Account Type:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">${userData.role || 'Customer'}</td>
                                    </tr>
                                </table>
                            </div>

                            <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; border-left: 4px solid #10b981; margin-bottom: 25px;">
                                <h3 style="color: #065f46; margin: 0 0 15px 0;">🚀 Getting Started</h3>
                                <ol style="margin: 0; padding-left: 20px; color: #065f46; line-height: 1.8;">
                                    <li>Browse our wide selection of products</li>
                                    <li>Add items to your cart</li>
                                    <li>Complete your order with secure checkout</li>
                                    <li>Track your delivery in real-time</li>
                                </ol>
                            </div>

                            <div style="background: #e0f2fe; padding: 20px; border-radius: 10px; border-left: 4px solid #0891b2; margin-bottom: 25px;">
                                <h3 style="color: #0c4a6e; margin: 0 0 12px 0;">💡 Need Help?</h3>
                                <p style="margin: 0; color: #0c4a6e; line-height: 1.6;">
                                    Our support team is here to help! Contact us anytime at ${company.email} or call ${company.phone}.
                                </p>
                            </div>

                            <div style="text-align: center;">
                                <p style="color: #64748b; margin: 0 0 15px 0;">Ready to start shopping?</p>
                                <a href="${company.website}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">🛒 Start Shopping</a>
                            </div>
                        </div>
                        
                        ${getEmailFooter()}
                    </div>
                </div>
            `,
            text: `Welcome to ${company.name}!\n\nHello ${userData.username},\n\nYour account has been successfully created!\n\nUsername: ${userData.username}\nEmail: ${userData.email}\n\nStart shopping at ${company.website}\n\nContact: ${company.email} | ${company.phone}`
        };
    },

    // 8. Password Reset Email
    generatePasswordReset: (resetData) => {
        const company = getCompanyInfo();
        
        return {
            from: company.email,
            to: resetData.email,
            subject: `🔐 Password Reset Request - ${company.name}`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
                    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
                        ${getEmailHeader('🔐 PASSWORD RESET', 'Reset your password')}
                        
                        <div style="padding: 40px 30px;">
                            <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px 0;">Hello <strong>${resetData.username}</strong>,</p>
                            
                            <div style="background: #fef3c7; padding: 20px; border-radius: 10px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
                                <p style="margin: 0; color: #92400e; line-height: 1.6;">
                                    We received a request to reset your password. If you didn't make this request, please ignore this email.
                                </p>
                            </div>

                            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                                <h3 style="color: #1e293b; margin: 0 0 15px 0;">Reset Details:</h3>
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Username:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-weight: 700;">${resetData.username}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Request Time:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">${new Date().toLocaleString('en-PH')}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Valid For:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">1 hour</td>
                                    </tr>
                                </table>
                            </div>

                            <div style="text-align: center; margin-bottom: 25px;">
                                <a href="${resetData.resetUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">🔐 Reset Password</a>
                            </div>

                            <div style="background: #fee2e2; padding: 20px; border-radius: 10px; border-left: 4px solid #ef4444; margin-bottom: 25px;">
                                <h3 style="color: #991b1b; margin: 0 0 12px 0;">⚠️ Security Notice</h3>
                                <ul style="margin: 0; padding-left: 20px; color: #991b1b; line-height: 1.8;">
                                    <li>This link will expire in 1 hour</li>
                                    <li>Never share this link with anyone</li>
                                    <li>If you didn't request this, contact us immediately</li>
                                    <li>Change your password regularly for security</li>
                                </ul>
                            </div>

                            <div style="background: #e0f2fe; padding: 20px; border-radius: 10px; border-left: 4px solid #0891b2;">
                                <p style="margin: 0; color: #0c4a6e; line-height: 1.6; text-align: center;">
                                    If the button doesn't work, copy and paste this link:<br>
                                    <code style="background: white; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 10px; word-break: break-all; font-size: 12px;">${resetData.resetUrl}</code>
                                </p>
                            </div>
                        </div>
                        
                        ${getEmailFooter()}
                    </div>
                </div>
            `,
            text: `Password Reset Request - ${company.name}\n\nHello ${resetData.username},\n\nClick this link to reset your password:\n${resetData.resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nContact: ${company.email}`
        };
    }
};
