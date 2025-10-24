const express = require('express');
const { protect } = require('../middleware/auth');
const { sendOrderStatusNotification } = require('../controllers/notificationController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// POST /api/notifications/order-status - Send order status notification
router.post('/order-status', sendOrderStatusNotification);

module.exports = router;
