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
    enum: ['chicken', 'beef', 'pork', 'seafood', 'vegetables', 'dairy', 'other'],
    lowercase: true
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
    batchNumber: String,
    expiryDate: Date,
    quantity: Number,
    receivedDate: {
      type: Date,
      default: Date.now
    }
  }],
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
    url: String, // Can be file path or base64 data URI
    publicId: String, // for Cloudinary (optional)
    alt: String,
    isBase64: { type: Boolean, default: false } // Flag to identify base64 images
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

// Index for better query performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ stock: 1 });

module.exports = mongoose.model('Product', productSchema);
