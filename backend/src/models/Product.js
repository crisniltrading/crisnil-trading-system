const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['chicken', 'beef', 'pork', 'seafood', 'vegetables', 'dairy', 'processed', 'other'],
    lowercase: true
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [100, 'Brand name cannot exceed 100 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['kg', 'g', 'lbs', 'piece', 'pack', 'box'],
    default: 'kg'
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  minStock: {
    type: Number,
    required: [true, 'Minimum stock level is required'],
    min: [0, 'Minimum stock cannot be negative'],
    default: 10
  },
  maxStock: {
    type: Number,
    min: [0, 'Maximum stock cannot be negative'],
    default: 1000
  },
  supplier: {
    name: String,
    contact: String,
    country: String
  },
  storage: {
    temperature: {
      type: Number, // in Celsius
      default: -18
    },
    location: String,
    shelfLife: {
      type: Number, // in days
      default: 365
    }
  },
  batchInfo: [{
    batchNumber: {
      type: String,
      required: false, // Auto-generated in controller before save
      unique: true,
      index: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    receivedDate: {
      type: Date,
      default: Date.now,
      required: true
    },
    expiryDate: {
      type: Date,
      index: true
    },
    supplierReference: {
      type: String,
      trim: true
    },
    costPrice: {
      type: Number,
      min: 0
    },
    notes: String,
    status: {
      type: String,
      enum: ['active', 'depleted', 'expired', 'damaged'],
      default: 'active'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  // Product creation tracking
  productId: {
    type: String,
    unique: true,
    index: true
  },
  firstStockDate: {
    type: Date,
    index: true
  },
  pricing: {
    costPrice: Number,
    bulkDiscount: {
      type: Number,
      min: [0, 'Bulk discount cannot be negative'],
      max: [1, 'Bulk discount cannot exceed 100%'],
      default: 0
    },
    bulkMinQuantity: {
      type: Number,
      default: 10
    }
  },
  images: [{
    data: String,       // Base64 encoded image data
    contentType: String, // MIME type (e.g., image/jpeg, image/png)
    filename: String,   // Original filename for reference
    alt: String
  }],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  // Rating information (cached for performance)
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
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

// Virtual for low stock status
productSchema.virtual('isLowStock').get(function() {
  return this.stock <= this.minStock;
});

// Virtual for near expiry products
productSchema.virtual('isNearExpiry').get(function() {
  if (!this.batchInfo || this.batchInfo.length === 0) return false;
  
  const nearestExpiry = this.batchInfo.reduce((nearest, batch) => {
    return !nearest || batch.expiryDate < nearest.expiryDate ? batch : nearest;
  });
  
  const daysToExpiry = Math.ceil((nearestExpiry.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
  return daysToExpiry <= 7 && daysToExpiry > 0;
});

// Virtual for expired products
productSchema.virtual('isExpired').get(function() {
  if (!this.batchInfo || this.batchInfo.length === 0) return false;
  
  return this.batchInfo.some(batch => batch.expiryDate < new Date());
});

// Pre-save hook to generate product ID and track first stock
productSchema.pre('save', async function(next) {
  // Generate product ID if not exists
  if (!this.productId && this.isNew) {
    const category = this.category.substring(0, 3).toUpperCase();
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = await this.constructor.countDocuments({
      productId: new RegExp(`^PROD-${category}-${date}`)
    });
    this.productId = `PROD-${category}-${date}-${String(count + 1).padStart(3, '0')}`;
  }
  
  // Set first stock date when product is first created with stock
  if (this.isNew && this.stock > 0 && !this.firstStockDate) {
    this.firstStockDate = new Date();
  }
  
  // Update batch statuses based on expiry and quantity
  if (this.batchInfo && this.batchInfo.length > 0) {
    this.batchInfo.forEach(batch => {
      if (batch.remainingQuantity <= 0) {
        batch.status = 'depleted';
      } else if (batch.expiryDate && batch.expiryDate < new Date()) {
        batch.status = 'expired';
      } else {
        batch.status = 'active';
      }
    });
  }
  
  next();
});

// Method to get oldest active batch (FIFO)
productSchema.methods.getOldestBatch = function() {
  if (!this.batchInfo || this.batchInfo.length === 0) return null;
  
  const activeBatches = this.batchInfo.filter(b => 
    b.status === 'active' && b.remainingQuantity > 0
  );
  
  if (activeBatches.length === 0) return null;
  
  // Sort by received date (oldest first), then by expiry date if available
  return activeBatches.sort((a, b) => {
    if (a.expiryDate && b.expiryDate) {
      return a.expiryDate - b.expiryDate; // Expiring soonest first
    }
    return a.receivedDate - b.receivedDate; // Oldest first
  })[0];
};

// Method to deduct stock using FIFO
productSchema.methods.deductStockFIFO = function(quantity) {
  let remaining = quantity;
  const deductions = [];
  
  // Get batches sorted by FIFO order
  const activeBatches = this.batchInfo
    .filter(b => b.status === 'active' && b.remainingQuantity > 0)
    .sort((a, b) => {
      if (a.expiryDate && b.expiryDate) {
        return a.expiryDate - b.expiryDate;
      }
      return a.receivedDate - b.receivedDate;
    });
  
  for (const batch of activeBatches) {
    if (remaining <= 0) break;
    
    const deductAmount = Math.min(remaining, batch.remainingQuantity);
    batch.remainingQuantity -= deductAmount;
    remaining -= deductAmount;
    
    deductions.push({
      batchNumber: batch.batchNumber,
      quantity: deductAmount,
      remainingInBatch: batch.remainingQuantity
    });
    
    if (batch.remainingQuantity <= 0) {
      batch.status = 'depleted';
    }
  }
  
  return {
    success: remaining === 0,
    deductions,
    remainingToDeduct: remaining
  };
};

// Index for better query performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ productId: 1 });
productSchema.index({ firstStockDate: 1 });
productSchema.index({ 'batchInfo.batchNumber': 1 });
productSchema.index({ 'batchInfo.expiryDate': 1 });
productSchema.index({ 'batchInfo.receivedDate': 1 });

module.exports = mongoose.model('Product', productSchema);
