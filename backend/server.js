require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/database');

const PORT = process.env.PORT || 5001;

// Connect to MongoDB (optional in dev)
const startServer = () => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.log('❌ Unhandled Promise Rejection:', err.message);
    server.close(() => {
      process.exit(1);
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('💤 Process terminated');
    });
  });
};

// Always start server, handle DB connection separately
console.log('🚀 Starting server...');
startServer();

// Try to connect to MongoDB but don't block server startup
if (process.env.MONGODB_URI) {
  connectDB()
    .then(() => {
      console.log('✅ Database connected successfully');
      
      // Initialize expiry service after DB connection
      const expiryService = require('./src/services/expiryService');
      expiryService.startScheduledJobs();
      console.log('✅ Expiry tracking service initialized');
      
      // Initialize batch expiry checker
      const expiryChecker = require('./src/services/expiryChecker');
      expiryChecker.startAutomatedChecking();
      console.log('✅ Batch expiry checker initialized');
    })
    .catch((err) => {
      console.error('❌ Failed to connect to MongoDB:', err.message);
      console.warn('⚠️  Server running without database connection.');
    });
} else {
  console.warn('⚠️  MONGODB_URI not set. Server running without database connection.');
}
