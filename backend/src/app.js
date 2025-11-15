const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const analyticsRoutes = require('./routes/analytics');
const promotionRoutes = require('./routes/promotions');
const transactionRoutes = require('./routes/transactions');
const userRoutes = require('./routes/user');
const notificationRoutes = require('./routes/notifications');
const reviewRoutes = require('./routes/reviews');
const reportRoutes = require('./routes/reports');
const expiryRoutes = require('./routes/expiry');
const rewardRoutes = require('./routes/rewards');
const landingRoutes = require('./routes/landing');

// Load restock routes with error handling
let restockRoutes = null;
try {
  restockRoutes = require('./routes/restock');
  console.log('✅ Restock email feature loaded');
} catch (error) {
  console.log('⚠️  Restock email feature disabled:', error.message);
}

// Load test email routes (temporarily disabled)
// const testEmailRoutes = require('./routes/testEmail');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// CORS configuration - must be before helmet
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  process.env.FRONTEND_URL // Production frontend URL from environment
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } 
    // Allow all Vercel preview and production domains
    else if (origin && origin.includes('.vercel.app')) {
      console.log(`✅ CORS allowed for Vercel domain: ${origin}`);
      callback(null, true);
    }
    else {
      // In production, be strict about CORS
      if (process.env.NODE_ENV === 'production') {
        console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      } else {
        // In development, allow all origins
        console.log(`✅ CORS allowed (dev mode) from origin: ${origin}`);
        callback(null, true);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security middleware - configured to allow CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting - more generous for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 200, // Much higher for development
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  }
});
app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check routes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/user', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/expiry', expiryRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/landing', landingRoutes);

// Conditionally load restock routes if available
if (restockRoutes) {
  app.use('/api/restock', restockRoutes);
  console.log('✅ Restock API routes registered at /api/restock');
}

// Test email routes (temporarily disabled)
// app.use('/api/test-email', testEmailRoutes);

// User activity tracking routes
const userActivityRoutes = require('./routes/userActivity');
app.use('/api/user-activity', userActivityRoutes);

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
