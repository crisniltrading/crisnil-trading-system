const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  pointsRequired: {
    type: Number,
    required: true,
    min: 0
  },
  rewardType: {
    type: String,
    enum: ['discount', 'free_delivery', 'product', 'voucher'],
    required: true
  },
  rewardValue: {
    type: Number, // Discount amount or product value
    required: true
  },
  icon: {
    type: String,
    default: 'gift'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiryDays: {
    type: Number, // Days until claimed reward expires
    default: 30
  },
  maxRedemptions: {
    type: Number, // Max times this can be redeemed per user (null = unlimited)
    default: null
  },
  totalClaimed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const rewardClaimSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reward',
    required: true
  },
  pointsSpent: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired'],
    default: 'active'
  },
  claimedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  usedAt: Date,
  usedInOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  voucherCode: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Generate voucher code before saving
rewardClaimSchema.pre('save', function(next) {
  if (!this.voucherCode && this.isNew) {
    this.voucherCode = `RWD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }
  next();
});

const Reward = mongoose.model('Reward', rewardSchema);
const RewardClaim = mongoose.model('RewardClaim', rewardClaimSchema);

module.exports = { Reward, RewardClaim };
