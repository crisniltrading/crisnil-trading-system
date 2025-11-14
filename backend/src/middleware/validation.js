const validateRegister = (req, res, next) => {
  const { username, email, password, role } = req.body;
  
  const errors = [];
  
  // Username validation
  if (!username || username.trim().length < 3) {
    errors.push('Username must be at least 3 characters long');
  }
  
  // Email validation
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Please provide a valid email address');
  }
  
  // Password validation
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  // Role validation
  const allowedRoles = ['admin', 'staff', 'client', 'b2b'];
  if (role && !allowedRoles.includes(role)) {
    errors.push('Invalid role specified');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors
    });
  }
  
  next();
};

const validateLogin = (req, res, next) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide username and password'
    });
  }
  
  next();
};

const validateProduct = (req, res, next) => {
  const { name, category, price, unit, stock, minStock } = req.body;
  
  const errors = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Product name is required');
  }
  
  if (!category) {
    errors.push('Product category is required');
  }
  
  if (price === undefined || price < 0) {
    errors.push('Valid price is required');
  }
  
  if (!unit) {
    errors.push('Product unit is required');
  }
  
  if (stock === undefined || stock < 0) {
    errors.push('Valid stock quantity is required');
  }
  
  if (minStock === undefined || minStock < 0) {
    errors.push('Valid minimum stock level is required');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors
    });
  }
  
  next();
};

const validateOrder = (req, res, next) => {
  const { items, delivery, payment } = req.body;
  
  const errors = [];
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push('Order must contain at least one item');
  } else {
    // Validate each item
    items.forEach((item, index) => {
      if (!item.product) {
        errors.push(`Item ${index + 1}: Product ID is required`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Valid quantity is required`);
      }
      if (!item.unitPrice || item.unitPrice < 0) {
        errors.push(`Item ${index + 1}: Valid unit price is required`);
      }
    });
  }
  
  if (!delivery || !delivery.address) {
    errors.push('Delivery address is required');
  }
  
  if (!payment || !payment.method) {
    errors.push('Payment method is required');
  } else {
    const allowedMethods = ['gcash', 'bank_transfer', 'cod', 'credit'];
    if (!allowedMethods.includes(payment.method)) {
      errors.push('Invalid payment method');
    }
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors
    });
  }
  
  next();
};

const validateInventoryAction = (req, res, next) => {
  const { productId, quantity, reason, action } = req.body;
  
  const errors = [];
  
  if (!productId) {
    errors.push('Product ID is required');
  }
  
  if (!quantity || quantity <= 0) {
    errors.push('Valid quantity is required');
  }
  
  if (!reason || reason.trim().length === 0) {
    errors.push('Reason is required');
  }
  
  if (action && !['add', 'remove', 'adjustment'].includes(action)) {
    errors.push('Invalid action specified');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors
    });
  }
  
  next();
};

const validatePromotion = (req, res, next) => {
  const { name, type, discount, startDate, endDate } = req.body;
  
  const errors = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Promotion name is required');
  }
  
  const allowedTypes = ['bulk_discount', 'expiry_discount', 'seasonal', 'flash_sale', 'clearance'];
  if (!type || !allowedTypes.includes(type)) {
    errors.push('Valid promotion type is required');
  }
  
  if (!discount || !discount.type || !discount.value) {
    errors.push('Discount configuration is required');
  } else {
    if (!['percentage', 'fixed_amount'].includes(discount.type)) {
      errors.push('Invalid discount type');
    }
    if (discount.value < 0) {
      errors.push('Discount value cannot be negative');
    }
  }
  
  if (!startDate || !endDate) {
    errors.push('Start date and end date are required');
  } else {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      errors.push('End date must be after start date');
    }
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors
    });
  }
  
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateProduct,
  validateOrder,
  validateInventoryAction,
  validatePromotion
};
