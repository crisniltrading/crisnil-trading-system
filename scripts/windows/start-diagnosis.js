console.log('🔍 CRIS Backend Diagnostic Tool');
console.log('================================');

// Check Node.js version
console.log(`📋 Node.js version: ${process.version}`);
console.log(`📋 Platform: ${process.platform}`);
console.log(`📋 Current directory: ${process.cwd()}`);

// Check if required files exist
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'server.js',
  'src/app.js',
  '.env',
  'package.json',
  'src/routes/auth.js',
  'src/routes/products.js',
  'src/routes/orders.js',
  'src/routes/inventory.js',
  'src/routes/analytics.js',
  'src/middleware/errorHandler.js'
];

console.log('\n📁 Checking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// Check dependencies
console.log('\n📦 Checking dependencies:');
try {
  const packageJson = require('./package.json');
  const deps = Object.keys(packageJson.dependencies);
  console.log(`📋 Found ${deps.length} dependencies`);
  
  // Try to require key dependencies
  const keyDeps = ['express', 'cors', 'mongoose', 'jsonwebtoken'];
  keyDeps.forEach(dep => {
    try {
      require(dep);
      console.log(`✅ ${dep}`);
    } catch (err) {
      console.log(`❌ ${dep} - ${err.message}`);
    }
  });
} catch (err) {
  console.log(`❌ package.json: ${err.message}`);
}

// Check environment variables
console.log('\n🔧 Checking environment:');
require('dotenv').config();
const envVars = ['NODE_ENV', 'PORT', 'MONGODB_URI', 'JWT_SECRET'];
envVars.forEach(envVar => {
  const value = process.env[envVar];
  console.log(`${value ? '✅' : '⚠️'} ${envVar}: ${value ? '***set***' : 'not set'}`);
});

// Test basic server startup
console.log('\n🚀 Testing basic server startup...');
try {
  const express = require('express');
  const app = express();
  
  app.get('/test', (req, res) => {
    res.json({ status: 'ok', message: 'Test server working' });
  });
  
  const PORT = process.env.PORT || 5001;
  const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`✅ Basic server started on port ${PORT}`);
    
    // Test the endpoint
    const http = require('http');
    http.get(`http://127.0.0.1:${PORT}/test`, (res) => {
      console.log(`✅ Test endpoint responding with status: ${res.statusCode}`);
      
      // Now try to load the full app
      console.log('\n🎯 Loading full application...');
      server.close(() => {
        loadFullApp();
      });
    }).on('error', (err) => {
      console.log(`❌ Test endpoint failed: ${err.message}`);
      server.close();
    });
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`❌ Port ${PORT} is already in use`);
      console.log(`💡 Try running: netstat -ano | findstr :${PORT}`);
    } else {
      console.log(`❌ Server error: ${err.message}`);
    }
  });
  
} catch (err) {
  console.log(`❌ Basic server test failed: ${err.message}`);
}

function loadFullApp() {
  try {
    console.log('🔄 Loading full CRIS application...');
    const app = require('./src/app');
    console.log('✅ Full app loaded successfully');
    
    const PORT = process.env.PORT || 5001;
    const server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`🎉 CRIS Backend fully loaded and running on port ${PORT}`);
      console.log(`🌐 Health check: http://127.0.0.1:${PORT}/health`);
      console.log(`📡 API Base: http://127.0.0.1:${PORT}/api`);
      console.log('\n✨ Backend is ready! You can now:');
      console.log('1. Open your frontend at http://localhost:8080');
      console.log('2. Test the API endpoints');
      console.log('3. Press Ctrl+C to stop the server');
    });
    
    server.on('error', (err) => {
      console.log(`❌ Full app server error: ${err.message}`);
    });
    
  } catch (err) {
    console.log(`❌ Failed to load full app: ${err.message}`);
    console.log(`📋 Error stack: ${err.stack}`);
  }
}
