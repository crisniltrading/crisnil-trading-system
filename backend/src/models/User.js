const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  role: {
    type: String,
    enum: ['admin', 'staff', 'client', 'b2b'],
    default: 'client'
  },
  businessInfo: {
    business_name: {
      type: String,
      trim: true
    },
    contact_person: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  profilePicture: {
    type: String, // Store base64 image data or URL
    default: null
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  cart: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String,
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    price: Number,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  wishlist: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  preferences: {
    currency: {
      type: String,
      default: 'PHP'
    },
    timezone: {
      type: String,
      default: 'Asia/Manila'
    },
    taxRate: {
      type: Number,
      default: 12
    },
    notifications: {
      orders: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      inventory: { type: Boolean, default: true },
      system: { type: Boolean, default: false }
    }
  },
  // Recently viewed products tracking
  recentlyViewed: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Search history tracking
  searchHistory: [{
    query: {
      type: String,
      trim: true
    },
    resultsCount: {
      type: Number,
      default: 0
    },
    searchedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // User's saved addresses
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangeVerificationCode: String,
  passwordChangeVerificationExpires: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('User', userSchema);
