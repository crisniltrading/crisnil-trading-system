const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id).select('+password');
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Grant access to protected route
    req.user = user;
    console.log('✅ User authenticated:', {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    });
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired.'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed.'
    });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log('🔐 Authorization Check:', {
      userRole: req.user?.role,
      requiredRoles: roles,
      userId: req.user?._id,
      username: req.user?.username
    });
    
    if (!roles.includes(req.user.role)) {
      console.log('❌ Access denied - User role:', req.user.role, 'Required:', roles);
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Insufficient permissions.'
      });
    }
    
    console.log('✅ Access granted');
    next();
  };
};

// Alias for backward compatibility
const authorize = restrictTo;

module.exports = {
  protect,
  restrictTo,
  authorize
};
