const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  action: {
    type: String,
    enum: ['add', 'remove', 'sale', 'damage', 'expired', 'return', 'adjustment'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true,
    maxlength: [200, 'Reason cannot exceed 200 characters']
  },
  batchNumber: String,
  reference: {
    type: String, // Order ID, Purchase Order ID, etc.
  },
  referenceType: {
    type: String,
    enum: ['order', 'purchase', 'manual', 'system', 'adjustment']
  },
  cost: Number, // Cost per unit at the time of transaction
  totalCost: Number, // Total cost of the transaction
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String
}, {
  timestamps: true
});

const stockAlertSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  alertType: {
    type: String,
    enum: ['low_stock', 'out_of_stock', 'near_expiry', 'expired'],
    required: true
  },
  currentStock: Number,
  threshold: Number,
  message: String,
  isActive: {
    type: Boolean,
    default: true
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: Date
}, {
  timestamps: true
});

// Index for better performance
inventoryLogSchema.index({ product: 1 });
inventoryLogSchema.index({ action: 1 });
inventoryLogSchema.index({ createdAt: -1 });

stockAlertSchema.index({ product: 1 });
stockAlertSchema.index({ alertType: 1 });
stockAlertSchema.index({ isActive: 1 });

const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);
const StockAlert = mongoose.model('StockAlert', stockAlertSchema);

module.exports = {
  InventoryLog,
  StockAlert
};
