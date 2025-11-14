const mongoose = require('mongoose');

// ============================================================================
// ENHANCED PROMOTION MODEL - Simplified & Powerful
// ============================================================================

const promotionSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Promotion name is required'],
    trim: true,
    maxlength: [100, 'Promotion name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Promotion Category (for organization only)
  category: {
    type: String,
    enum: ['bulk', 'expiry', 'seasonal', 'flash_sale', 'clearance', 'loyalty', 'special'],
    default: 'special'
  },
  
  // ===== SIMPLIFIED DISCOUNT STRUCTURE =====
  // One clear discount definition - no confusion!
  discount: {
    type: {
      type: String,
      enum: ['percentage', 'fixed_amount', 'per_unit', 'bogo'], // Buy One Get One
      required: true,
      default: 'percentage'
    },
    value: {
      type: Number,
      required: true,
      min: [0, 'Discount value cannot be negative']
      // Note: Percentage validation (max 100%) is handled in pre-save middleware
    },
    // Optional: Cap maximum discount amount (e.g., max ₱1000 off)
    maxCap: {
      type: Number,
      min: 0
    },
    // For BOGO deals
    bogoConfig: {
      buy: { type: Number, min: 1, default: 1 },
      get: { type: Number, min: 1, default: 1 },
      getDiscount: { type: Number, min: 0, max: 100, default: 100 } // 100% = free
    }
  },
  
  // ===== SIMPLE RULES - Easy to understand! =====
  rules: {
    // Minimum quantity required (for bulk discounts)
    minQuantity: {
      type: Number,
      default: 1,
      min: 1
    },
    // Maximum quantity (optional - for limiting tiers)
    maxQuantity: {
      type: Number,
      min: 1
    },
    // Minimum order amount required
    minAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    // For expiry-based discounts: days before expiry
    expiryDays: {
      minDays: { type: Number, min: 0 },
      maxDays: { type: Number, min: 0 }
    },
    // Specific products this promotion applies to (empty = all products)
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    // Specific categories (empty = all categories)
    categories: [{
      type: String,
      trim: true
    }],
    // Customer eligibility
    customerTypes: [{
      type: String,
      enum: ['all', 'new', 'b2b', 'client', 'vip'],
      default: 'all'
    }],
    // Exclude products (useful for "site-wide except...")
    excludeProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }]
  },
  
  // ===== TIME SETTINGS =====
  validity: {
    startDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: true
    },
    // Optional: Specific days of week (0=Sunday, 6=Saturday)
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }],
    // Optional: Time windows (e.g., happy hour 3-6pm)
    timeWindows: [{
      startHour: { type: Number, min: 0, max: 23 },
      endHour: { type: Number, min: 0, max: 23 }
    }]
  },
  
  // ===== USAGE LIMITS =====
  limits: {
    // Total times this promo can be used across all customers
    totalUses: {
      type: Number,
      min: 0
    },
    // Max uses per customer
    perCustomer: {
      type: Number,
      default: 1,
      min: 1
    },
    // First X customers only
    firstCustomers: {
      type: Number,
      min: 1
    }
  },
  
  // ===== STATUS & TRACKING =====
  status: {
    type: String,
    enum: ['active', 'paused', 'expired', 'draft'],
    default: 'active'
  },
  
  // Analytics
  stats: {
    timesUsed: {
      type: Number,
      default: 0
    },
    totalDiscountGiven: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    uniqueCustomers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  
  // Priority (higher number = higher priority when multiple promos apply)
  priority: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Stackable with other promotions?
  isStackable: {
    type: Boolean,
    default: false
  },
  
  // Auto-apply (no coupon code needed)
  autoApply: {
    type: Boolean,
    default: true
  },
  
  // Optional coupon code
  couponCode: {
    type: String,
    uppercase: true,
    trim: true,
    sparse: true, // Unique only if provided
    index: true
  },
  
  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================================================
// VIRTUALS - Computed Properties
// ============================================================================

// Is this promotion currently valid?
promotionSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.validity.startDate <= now && 
         this.validity.endDate >= now &&
         (!this.limits.totalUses || this.stats.timesUsed < this.limits.totalUses);
});

// Days remaining until expiry
promotionSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  if (this.validity.endDate <= now) return 0;
  return Math.ceil((this.validity.endDate - now) / (1000 * 60 * 60 * 24));
});

// Usage percentage
promotionSchema.virtual('usagePercentage').get(function() {
  if (!this.limits.totalUses) return 0;
  return Math.round((this.stats.timesUsed / this.limits.totalUses) * 100);
});

// Display-friendly discount text
promotionSchema.virtual('discountDisplay').get(function() {
  if (this.discount.type === 'percentage') {
    return `${this.discount.value}% OFF`;
  } else if (this.discount.type === 'fixed_amount') {
    return `₱${this.discount.value} OFF`;
  } else if (this.discount.type === 'per_unit') {
    return `₱${this.discount.value} OFF per unit`;
  } else if (this.discount.type === 'bogo') {
    const config = this.discount.bogoConfig;
    if (config.getDiscount === 100) {
      return `Buy ${config.buy} Get ${config.get} FREE`;
    }
    return `Buy ${config.buy} Get ${config.get} at ${config.getDiscount}% OFF`;
  }
  return 'DISCOUNT';
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Validation before save
promotionSchema.pre('save', function(next) {
  // Auto-expire if end date passed
  if (this.validity.endDate < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  
  // Validate percentage discount (max 100%)
  if (this.discount.type === 'percentage' && this.discount.value > 100) {
    return next(new Error('Percentage discount cannot exceed 100%'));
  }
  
  // Validate min/max quantity logic
  if (this.rules.maxQuantity && this.rules.maxQuantity < this.rules.minQuantity) {
    return next(new Error('maxQuantity must be greater than or equal to minQuantity'));
  }
  
  // Validate expiry days logic
  if (this.rules.expiryDays && this.rules.expiryDays.minDays && this.rules.expiryDays.maxDays) {
    if (this.rules.expiryDays.minDays > this.rules.expiryDays.maxDays) {
      return next(new Error('expiryDays.minDays must be less than or equal to maxDays'));
    }
  }
  
  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

// Check if customer can use this promotion
promotionSchema.methods.canCustomerUse = function(customerId, customerType = 'client') {
  // Check customer type eligibility
  if (this.rules.customerTypes.length > 0 && 
      !this.rules.customerTypes.includes('all') && 
      !this.rules.customerTypes.includes(customerType)) {
    return { eligible: false, reason: 'Customer type not eligible' };
  }
  
  // Check per-customer usage limit
  if (this.limits.perCustomer) {
    const customerUsageCount = this.stats.uniqueCustomers.filter(
      id => id.toString() === customerId.toString()
    ).length;
    
    if (customerUsageCount >= this.limits.perCustomer) {
      return { eligible: false, reason: 'Usage limit reached for this customer' };
    }
  }
  
  return { eligible: true };
};

// Calculate discount for given amount/quantity
promotionSchema.methods.calculateDiscount = function(amount, quantity = 1) {
  // Check if promotion is valid
  if (!this.isValid) {
    return { discountAmount: 0, finalAmount: amount, applied: false, reason: 'Promotion not valid' };
  }
  
  // Check rules
  if (quantity < this.rules.minQuantity) {
    return { discountAmount: 0, finalAmount: amount, applied: false, reason: 'Minimum quantity not met' };
  }
  
  if (this.rules.maxQuantity && quantity > this.rules.maxQuantity) {
    return { discountAmount: 0, finalAmount: amount, applied: false, reason: 'Maximum quantity exceeded' };
  }
  
  if (amount < this.rules.minAmount) {
    return { discountAmount: 0, finalAmount: amount, applied: false, reason: 'Minimum amount not met' };
  }
  
  let discountAmount = 0;
  
  // Calculate based on discount type
  if (this.discount.type === 'percentage') {
    discountAmount = (amount * this.discount.value) / 100;
    
    // Apply cap if set
    if (this.discount.maxCap && discountAmount > this.discount.maxCap) {
      discountAmount = this.discount.maxCap;
    }
  } else if (this.discount.type === 'fixed_amount') {
    discountAmount = this.discount.value;
  } else if (this.discount.type === 'per_unit') {
    // Per unit discount: discount value × quantity
    // Example: ₱50 off per unit × 10 units = ₱500 total discount
    discountAmount = this.discount.value * quantity;
    
    // Apply cap if set
    if (this.discount.maxCap && discountAmount > this.discount.maxCap) {
      discountAmount = this.discount.maxCap;
    }
  } else if (this.discount.type === 'bogo') {
    const config = this.discount.bogoConfig;
    const sets = Math.floor(quantity / (config.buy + config.get));
    const freeItemsValue = (amount / quantity) * config.get * sets;
    discountAmount = (freeItemsValue * config.getDiscount) / 100;
  }
  
  // Ensure discount doesn't exceed amount
  discountAmount = Math.min(discountAmount, amount);
  
  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    finalAmount: Math.round((amount - discountAmount) * 100) / 100,
    applied: true,
    promotionName: this.name
  };
};

// Record usage
promotionSchema.methods.recordUsage = async function(customerId, discountAmount, revenue) {
  this.stats.timesUsed += 1;
  this.stats.totalDiscountGiven += discountAmount;
  this.stats.totalRevenue += revenue;
  
  if (customerId && !this.stats.uniqueCustomers.includes(customerId)) {
    this.stats.uniqueCustomers.push(customerId);
  }
  
  return this.save();
};

// ============================================================================
// STATIC METHODS - Quick Creation Templates
// ============================================================================

// Create bulk discount
promotionSchema.statics.createBulkDiscount = function(options) {
  return this.create({
    name: options.name || 'Bulk Order Discount',
    description: options.description || 'Save more when you buy in bulk',
    category: 'bulk',
    discount: {
      type: 'percentage',
      value: options.discountValue || 10
    },
    rules: {
      minQuantity: options.minQuantity || 10,
      maxQuantity: options.maxQuantity,
      products: options.products || [],
      categories: options.categories || []
    },
    validity: {
      startDate: options.startDate || new Date(),
      endDate: options.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    createdBy: options.userId
  });
};

// Create expiry discount
promotionSchema.statics.createExpiryDiscount = function(options) {
  return this.create({
    name: options.name || 'Near Expiry Discount',
    description: options.description || 'Special discount on products nearing expiry',
    category: 'expiry',
    discount: {
      type: 'percentage',
      value: options.discountValue || 30
    },
    rules: {
      expiryDays: {
        minDays: options.minDays || 0,
        maxDays: options.maxDays || 30
      },
      products: options.products || [],
      categories: options.categories || []
    },
    validity: {
      startDate: options.startDate || new Date(),
      endDate: options.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    },
    autoApply: true,
    createdBy: options.userId
  });
};

// Create flash sale
promotionSchema.statics.createFlashSale = function(options) {
  return this.create({
    name: options.name || 'Flash Sale!',
    description: options.description || 'Limited time offer',
    category: 'flash_sale',
    discount: {
      type: options.discountType || 'percentage',
      value: options.discountValue || 20
    },
    rules: {
      products: options.products || [],
      categories: options.categories || []
    },
    validity: {
      startDate: options.startDate || new Date(),
      endDate: options.endDate || new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    },
    limits: {
      totalUses: options.totalUses || 100
    },
    priority: 10, // High priority
    createdBy: options.userId
  });
};

// ============================================================================
// INDEXES - For Better Query Performance
// ============================================================================
promotionSchema.index({ status: 1 });
promotionSchema.index({ category: 1 });
promotionSchema.index({ 'validity.startDate': 1, 'validity.endDate': 1 });
promotionSchema.index({ 'rules.products': 1 });
promotionSchema.index({ 'rules.categories': 1 });
promotionSchema.index({ couponCode: 1 });
promotionSchema.index({ priority: -1 }); // Descending for higher priority first
promotionSchema.index({ 'stats.timesUsed': 1 });

// Compound index for finding active promotions
promotionSchema.index({ 
  status: 1, 
  'validity.startDate': 1, 
  'validity.endDate': 1,
  autoApply: 1
});

module.exports = mongoose.model('Promotion', promotionSchema);
