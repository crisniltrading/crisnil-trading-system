const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Health check endpoint for monitoring
router.get('/', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };

  res.status(200).json(healthCheck);
});

module.exports = router;
