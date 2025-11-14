const express = require('express');
const router = express.Router();
const { protect: auth } = require('../middleware/auth');

// Lazy load email service to avoid startup issues
let emailService = null;
function getEmailService() {
    if (!emailService) {
        emailService = require('../services/emailService');
    }
    return emailService;
}

// Create restock order and send email
router.post('/create', auth, async (req, res) => {
    try {
        const {
            productId,
            productName,
            quantity,
            supplier,
            expectedDelivery,
            notes,
            sendEmail,
            sendCopy,
            autoReorder,
            estimatedCost,
            companyName,
            companyEmail,
            adminEmail,
            companyAddress,
            companyPhone
        } = req.body;

        // Validate required fields
        if (!productId || !productName || !quantity || !supplier || !expectedDelivery) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields'
            });
        }

        // Generate order ID
        const orderId = 'RO-' + Date.now();

        // Create order data
        const orderData = {
            id: orderId,
            productId,
            productName,
            quantity: parseInt(quantity),
            supplier,
            expectedDelivery,
            notes,
            sendEmail: sendEmail === true,
            sendCopy: sendCopy === true,
            autoReorder: autoReorder === true,
            estimatedCost,
            status: 'pending',
            createdAt: new Date().toISOString(),
            createdBy: req.user._id,
            // Include email settings
            companyName,
            companyEmail,
            adminEmail,
            companyAddress,
            companyPhone
        };

        // Store order (in production, save to database)
        // For now, we'll return the order data
        
        let emailResults = { supplier: null, admin: null };

        // Send email to supplier if requested
        if (orderData.sendEmail) {
            try {
                const service = getEmailService();
                emailResults.supplier = await service.sendSupplierEmail(orderData);
            } catch (error) {
                console.error('Supplier email failed:', error);
                emailResults.supplier = { 
                    success: false, 
                    error: error.message 
                };
            }
        }

        // Send admin copy if requested
        if (orderData.sendCopy) {
            try {
                const service = getEmailService();
                const adminOrderData = {
                    ...orderData,
                    supplier: {
                        ...orderData.supplier,
                        email: adminEmail || 'admin@frozenflow.com'
                    }
                };
                emailResults.admin = await service.sendSupplierEmail(adminOrderData);
            } catch (error) {
                console.error('Admin copy failed:', error);
                emailResults.admin = { 
                    success: false, 
                    error: error.message 
                };
            }
        }

        res.json({
            status: 'success',
            message: 'Restock order created successfully',
            data: {
                order: orderData,
                emailResults
            }
        });

    } catch (error) {
        console.error('Restock order creation error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create restock order',
            error: error.message
        });
    }
});

// Get restock order history
router.get('/history', auth, async (req, res) => {
    try {
        // In production, fetch from database
        // For now, return empty array or mock data
        
        const mockOrders = [
            {
                id: 'RO-1697123456789',
                productName: 'Salmon Fillet',
                quantity: 50,
                supplier: {
                    name: 'Ocean Fresh Suppliers',
                    email: 'orders@oceanfresh.ph',
                    contact: '+63 917 123 4567'
                },
                expectedDelivery: '2024-10-25',
                estimatedCost: '2,500',
                status: 'pending',
                createdAt: '2024-10-20T10:30:00.000Z'
            }
        ];

        res.json({
            status: 'success',
            data: mockOrders
        });

    } catch (error) {
        console.error('Restock order history error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch restock order history'
        });
    }
});

// Get email logs
router.get('/email-logs', auth, async (req, res) => {
    try {
        const service = getEmailService();
        const logs = service.getEmailLogs();
        
        res.json({
            status: 'success',
            data: logs
        });

    } catch (error) {
        console.error('Email logs error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch email logs'
        });
    }
});

// Update restock order status
router.patch('/:orderId/status', auth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, notes } = req.body;

        // Validate status
        const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid status'
            });
        }

        // In production, update database record
        // For now, return success response
        
        res.json({
            status: 'success',
            message: `Restock order ${orderId} status updated to ${status}`,
            data: {
                orderId,
                status,
                notes,
                updatedAt: new Date().toISOString(),
                updatedBy: req.user._id
            }
        });

    } catch (error) {
        console.error('Restock order update error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update restock order'
        });
    }
});

module.exports = router;
