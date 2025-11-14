const Product = require('../models/Product');
const Promotion = require('../models/Promotion');
const cron = require('node-cron');
const mongoose = require('mongoose');

class ExpiryService {
  constructor() {
    this.EXPIRY_THRESHOLD_DAYS = 30; // Products within 30 days of expiry
    this.DISCOUNT_PERCENTAGE = 30; // 30% discount for near-expiry products
  }

  // Check all products for near-expiry batches (FIFO-aware)
  async checkExpiringProducts() {
    try {
      console.log('🔍 Checking for expiring products (FIFO-aware)...');
      
      const now = new Date();
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + this.EXPIRY_THRESHOLD_DAYS);

      // Find products with batches expiring within threshold
      const products = await Product.find({
        'batchInfo.expiryDate': {
          $gte: now,
          $lte: thresholdDate
        },
        isActive: true
      });

      const expiringProducts = [];

      for (const product of products) {
        // Filter for active batches only (not depleted or already expired)
        const expiringBatches = product.batchInfo.filter(batch => {
          if (!batch.expiryDate) return false;
          if (batch.status !== 'active') return false; // Only active batches
          if (batch.remainingQuantity <= 0) return false; // Only batches with stock
          
          const expiryDate = new Date(batch.expiryDate);
          return expiryDate >= now && expiryDate <= thresholdDate;
        });

        if (expiringBatches.length > 0) {
          // Sort by FIFO order (expiring soonest first)
          expiringBatches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
          
          const nearestExpiry = expiringBatches[0]; // First in FIFO order
          const daysToExpiry = Math.ceil((new Date(nearestExpiry.expiryDate) - now) / (1000 * 60 * 60 * 24));

          expiringProducts.push({
            product,
            nearestExpiry,
            daysToExpiry,
            expiringBatches,
            totalExpiringQuantity: expiringBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0)
          });
        }
      }

      console.log(`📦 Found ${expiringProducts.length} products with expiring batches (FIFO order)`);
      return expiringProducts;
    } catch (error) {
      console.error('❌ Error checking expiring products:', error);
      throw error;
    }
  }

  // Automatically apply discount to near-expiry products
  async applyExpiryDiscounts() {
    try {
      console.log('💰 Applying expiry discounts...');
      
      const expiringProducts = await this.checkExpiringProducts();
      let discountsApplied = 0;

      for (const { product, daysToExpiry } of expiringProducts) {
        // Check if there's already an expiry promotion for this product
        const existingPromo = await Promotion.findOne({
          name: { $regex: `Expiry Sale - ${product.name}`, $options: 'i' },
          isActive: true,
          endDate: { $gte: new Date() }
        });

        if (existingPromo) {
          console.log(`⏭️  Skipping ${product.name} - already has expiry promotion`);
          continue;
        }

        // Calculate discount based on days to expiry
        let discountPercentage = this.DISCOUNT_PERCENTAGE;
        if (daysToExpiry <= 7) {
          discountPercentage = 50; // 50% off for products expiring within a week
        } else if (daysToExpiry <= 14) {
          discountPercentage = 40; // 40% off for products expiring within 2 weeks
        }

        // Create automatic expiry promotion
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + daysToExpiry);

        try {
          const promotion = await Promotion.create({
            name: `Expiry Sale - ${product.name}`,
            description: `Wholesale discount - Product expiring in ${daysToExpiry} days`,
            type: 'expiry_discount',
            discount: {
              type: 'percentage',
              value: discountPercentage
            },
            startDate: new Date(),
            endDate,
            conditions: {
              applicableProducts: [product._id]
            },
            isActive: true,
            createdBy: product.createdBy || product.updatedBy || new mongoose.Types.ObjectId()
          });

          console.log(`✅ Applied ${discountPercentage}% discount to ${product.name} (expires in ${daysToExpiry} days)`);
          console.log(`📝 Promotion created: ${promotion._id}`);
          discountsApplied++;
        } catch (promoError) {
          console.error(`❌ Failed to create promotion for ${product.name}:`, promoError.message);
          console.error('Promotion data:', {
            name: `Expiry Sale - ${product.name}`,
            type: 'expiry_discount',
            discount: { type: 'percentage', value: discountPercentage },
            createdBy: product.createdBy || product.updatedBy
          });
        }
      }

      console.log(`🎉 Applied ${discountsApplied} expiry discounts`);
      return { discountsApplied, expiringProducts };
    } catch (error) {
      console.error('❌ Error applying expiry discounts:', error);
      throw error;
    }
  }

  // Remove expired batches and update stock
  async cleanupExpiredBatches() {
    try {
      console.log('🧹 Cleaning up expired batches...');
      
      const now = new Date();
      const products = await Product.find({
        'batchInfo.expiryDate': { $lt: now }
      });

      let batchesRemoved = 0;

      for (const product of products) {
        const expiredBatches = product.batchInfo.filter(batch => 
          new Date(batch.expiryDate) < now
        );

        if (expiredBatches.length > 0) {
          // Calculate total expired quantity
          const expiredQuantity = expiredBatches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);

          // Remove expired batches
          product.batchInfo = product.batchInfo.filter(batch => 
            new Date(batch.expiryDate) >= now
          );

          // Update stock (reduce by expired quantity)
          product.stock = Math.max(0, product.stock - expiredQuantity);

          await product.save();

          console.log(`🗑️  Removed ${expiredBatches.length} expired batches from ${product.name} (${expiredQuantity} units)`);
          batchesRemoved += expiredBatches.length;
        }
      }

      console.log(`✅ Cleaned up ${batchesRemoved} expired batches`);
      return { batchesRemoved };
    } catch (error) {
      console.error('❌ Error cleaning up expired batches:', error);
      throw error;
    }
  }

  // Get expiry dashboard data
  async getExpiryDashboard() {
    try {
      const now = new Date();
      
      // Products expiring within 7 days (FIFO-aware)
      const critical = await this.getProductsExpiringWithin(7);
      
      // Products expiring within 30 days (FIFO-aware)
      const warning = await this.getProductsExpiringWithin(30);
      
      // Already expired products (with active status)
      const expiredProducts = await Product.find({
        'batchInfo.expiryDate': { $lt: now },
        'batchInfo.status': 'expired',
        isActive: true
      });

      // Filter to only include products with expired batches that have remaining quantity
      const expired = expiredProducts.filter(product => {
        return product.batchInfo.some(batch => 
          batch.status === 'expired' && 
          batch.remainingQuantity > 0
        );
      }).map(product => {
        const expiredBatches = product.batchInfo.filter(batch => 
          batch.status === 'expired' && batch.remainingQuantity > 0
        );
        
        return {
          ...product.toObject(),
          expiredBatches,
          totalExpiredQuantity: expiredBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0)
        };
      });

      return {
        critical: critical.length,
        warning: warning.length,
        expired: expired.length,
        criticalProducts: critical,
        warningProducts: warning,
        expiredProducts: expired
      };
    } catch (error) {
      console.error('❌ Error getting expiry dashboard:', error);
      throw error;
    }
  }

  // Helper: Get products expiring within specified days (FIFO-aware)
  async getProductsExpiringWithin(days) {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + days);

    const products = await Product.find({
      'batchInfo.expiryDate': {
        $gte: now,
        $lte: thresholdDate
      },
      isActive: true
    });

    return products
      .map(product => {
        // Only include active batches with remaining quantity
        const expiringBatches = product.batchInfo.filter(batch => {
          if (!batch.expiryDate) return false;
          if (batch.status !== 'active') return false;
          if (batch.remainingQuantity <= 0) return false;
          
          const expiryDate = new Date(batch.expiryDate);
          return expiryDate >= now && expiryDate <= thresholdDate;
        });

        if (expiringBatches.length === 0) return null;

        // Sort by FIFO order (expiring soonest first)
        expiringBatches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        
        const nearestExpiry = expiringBatches[0]; // First in FIFO order
        const daysToExpiry = Math.ceil((new Date(nearestExpiry.expiryDate) - now) / (1000 * 60 * 60 * 24));

        return {
          ...product.toObject(),
          nearestExpiry,
          daysToExpiry,
          expiringBatches,
          totalExpiringQuantity: expiringBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0),
          fifoOrder: expiringBatches.map((b, i) => ({
            order: i + 1,
            batchNumber: b.batchNumber,
            quantity: b.remainingQuantity,
            expiryDate: b.expiryDate,
            daysToExpiry: Math.ceil((new Date(b.expiryDate) - now) / (1000 * 60 * 60 * 24))
          }))
        };
      })
      .filter(p => p !== null); // Remove products with no expiring batches
  }

  // Start scheduled jobs
  startScheduledJobs() {
    // Run every day at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('⏰ Running scheduled expiry check...');
      try {
        await this.applyExpiryDiscounts();
        await this.cleanupExpiredBatches();
      } catch (error) {
        console.error('❌ Scheduled expiry check failed:', error);
      }
    });

    console.log('✅ Expiry service scheduled jobs started');
  }
}

module.exports = new ExpiryService();
