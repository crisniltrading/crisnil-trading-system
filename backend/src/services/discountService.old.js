const Product = require('../models/Product');
const Promotion = require('../models/Promotion');

// Optional dependencies - gracefully handle if not available
let discountEngine;
let cron;

try {
  discountEngine = require('./discountEngine');
} catch (error) {
  console.warn('⚠️  Discount engine not available:', error.message);
}

try {
  cron = require('node-cron');
} catch (error) {
  console.warn('⚠️  node-cron not available, scheduled tasks disabled:', error.message);
}

/**
 * Discount Service - High-level service for managing discounts and promotions
 */
class DiscountService {
  
  constructor() {
    this.cronEnabled = !!cron;
    this.discountEngineEnabled = !!discountEngine;
    
    if (this.cronEnabled) {
      this.setupCronJobs();
    } else {
      console.log('📅 Cron jobs disabled - install node-cron to enable scheduled tasks');
    }
  }

  /**
   * Calculate discounts for a shopping cart
   * @param {Array} cartItems - Cart items with productId and quantity
   * @param {Object} options - Additional options like customerType, userId
   * @returns {Object} Discount calculation results
   */
  async calculateCartDiscounts(cartItems, options = {}) {
    try {
      if (!this.discountEngineEnabled) {
        return {
          success: false,
          error: 'Discount engine not available. Please check server configuration.',
          data: null
        };
      }

      const { customerType = 'all', userId = null } = options;
      
      // Validate cart items
      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        throw new Error('Cart items must be a non-empty array');
      }

      // Use the discount engine to calculate discounts
      const result = await discountEngine.calculateCartDiscounts(cartItems, customerType);
      
      // Log discount application for analytics
      if (result.totalSavings > 0) {
        await this.logDiscountUsage(result, userId);
      }
      
      return {
        success: true,
        data: result,
        message: `${result.appliedDiscounts.length} discount(s) applied, saving $${result.totalSavings.toFixed(2)}`
      };
    } catch (error) {
      console.error('Error in calculateCartDiscounts:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get available discounts for specific products
   * @param {Array} productIds - Array of product IDs
   * @param {Number} quantity - Quantity per product
   * @returns {Object} Available discounts
   */
  async getAvailableDiscounts(productIds, quantity = 1) {
    try {
      if (!this.discountEngineEnabled) {
        return {
          success: false,
          error: 'Discount engine not available. Please check server configuration.',
          data: []
        };
      }

      const products = await Product.find({ _id: { $in: productIds }, isActive: true });
      const activePromotions = await discountEngine.getActivePromotions();
      
      const availableDiscounts = [];
      
      for (const product of products) {
        const bulkDiscount = await discountEngine.calculateBulkDiscount(product, quantity, activePromotions);
        const expiryDiscount = await discountEngine.calculateExpiryDiscount(product, quantity, activePromotions);
        
        const productDiscounts = {
          productId: product._id,
          productName: product.name,
          currentPrice: product.price,
          discounts: []
        };
        
        if (bulkDiscount.applicable) {
          productDiscounts.discounts.push({
            type: 'bulk',
            ...bulkDiscount,
            potentialSavings: (product.price * quantity) * (bulkDiscount.discountPercentage / 100)
          });
        }
        
        if (expiryDiscount.applicable) {
          productDiscounts.discounts.push({
            type: 'expiry',
            ...expiryDiscount,
            potentialSavings: (product.price * quantity) * (expiryDiscount.discountPercentage / 100)
          });
        }
        
        availableDiscounts.push(productDiscounts);
      }
      
      return {
        success: true,
        data: availableDiscounts
      };
    } catch (error) {
      console.error('Error getting available discounts:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Create or update automatic discount promotions
   * @param {Object} options - Configuration options
   */
  async setupAutomaticDiscounts(options = {}) {
    try {
      const {
        createBulkDiscount = true,
        createExpiryDiscount = true,
        userId
      } = options;

      const results = [];

      // Create default bulk discount promotion if it doesn't exist
      if (createBulkDiscount) {
        const existingBulkPromo = await Promotion.findOne({ 
          type: 'bulk_discount',
          name: 'Bulk Order Discount',
          isActive: true 
        });

        if (!existingBulkPromo) {
          const bulkPromo = await Promotion.createDefaultBulkPromotion({
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            createdBy: userId,
            conditions: {
              minQuantity: 1,
              customerTypes: ['all']
            }
          });
          results.push({ type: 'bulk_discount', promotion: bulkPromo });
        }
      }

      // Create default expiry discount promotion if it doesn't exist
      if (createExpiryDiscount) {
        const existingExpiryPromo = await Promotion.findOne({ 
          type: 'expiry_discount',
          name: 'Near Expiry Discount',
          isActive: true 
        });

        if (!existingExpiryPromo) {
          const expiryPromo = await Promotion.createDefaultExpiryPromotion({
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            createdBy: userId,
            conditions: {
              minQuantity: 1,
              customerTypes: ['all']
            }
          });
          results.push({ type: 'expiry_discount', promotion: expiryPromo });
        }
      }

      return {
        success: true,
        data: results,
        message: `Setup completed. ${results.length} promotion(s) created.`
      };
    } catch (error) {
      console.error('Error setting up automatic discounts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate automatic near-expiry promotions for specific products
   */
  async generateExpiryPromotions() {
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + (60 * 24 * 60 * 60 * 1000)); // 60 days ahead
      
      // Find products with batches expiring in the next 60 days
      const products = await Product.find({
        isActive: true,
        'batchInfo.expiryDate': { 
          $gte: now,
          $lte: futureDate
        }
      });

      const generatedPromotions = [];

      for (const product of products) {
        // Check if product already has active expiry promotions
        const existingPromo = await Promotion.findOne({
          type: 'expiry_discount',
          'conditions.applicableProducts': product._id,
          isActive: true,
          endDate: { $gte: now }
        });

        if (existingPromo) continue;

        // Find the earliest expiring batch
        const earliestBatch = product.batchInfo
          .filter(batch => batch.expiryDate >= now && batch.expiryDate <= futureDate)
          .sort((a, b) => a.expiryDate - b.expiryDate)[0];

        if (earliestBatch) {
          const daysToExpiry = Math.ceil((earliestBatch.expiryDate - now) / (1000 * 60 * 60 * 24));
          
          let discountPercentage = 10; // Default
          if (daysToExpiry <= 14) discountPercentage = 50;
          else if (daysToExpiry <= 29) discountPercentage = 25;
          else if (daysToExpiry <= 60) discountPercentage = 10;

          const promotion = await Promotion.create({
            name: `${product.name} - Near Expiry Special`,
            description: `Special discount on ${product.name} expiring in ${daysToExpiry} days`,
            type: 'expiry_discount',
            discount: {
              type: 'percentage',
              value: discountPercentage
            },
            conditions: {
              applicableProducts: [product._id],
              minQuantity: 1,
              customerTypes: ['all']
            },
            startDate: now,
            endDate: new Date(earliestBatch.expiryDate.getTime() - (24 * 60 * 60 * 1000)), // End 1 day before expiry
            autoGenerate: {
              enabled: true,
              daysBeforeExpiry: daysToExpiry,
              discountPercentage: discountPercentage
            },
            createdBy: null // System generated
          });

          generatedPromotions.push({
            productId: product._id,
            productName: product.name,
            promotion: promotion,
            daysToExpiry: daysToExpiry,
            discountPercentage: discountPercentage
          });
        }
      }

      console.log(`Generated ${generatedPromotions.length} automatic expiry promotions`);
      return generatedPromotions;
    } catch (error) {
      console.error('Error generating expiry promotions:', error);
      throw error;
    }
  }

  /**
   * Log discount usage for analytics
   */
  async logDiscountUsage(discountResult, userId = null) {
    try {
      // Update usage count for applied promotions
      const promotionIds = discountResult.appliedDiscounts
        .map(d => d.promotionId)
        .filter(id => id !== 'auto-expiry');

      if (promotionIds.length > 0) {
        await Promotion.updateMany(
          { _id: { $in: promotionIds } },
          { $inc: { usageCount: 1 } }
        );
      }

      // Here you could also log to a separate analytics collection
      // for detailed reporting and analysis
      console.log('Discount usage logged:', {
        userId,
        totalSavings: discountResult.totalSavings,
        discountsApplied: discountResult.appliedDiscounts.length,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging discount usage:', error);
    }
  }

  /**
   * Get discount analytics and statistics
   */
  async getDiscountAnalytics(timeRange = 30) {
    try {
      const startDate = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));
      
      const analytics = await Promotion.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            usageCount: { $gt: 0 }
          }
        },
        {
          $group: {
            _id: '$type',
            totalPromotions: { $sum: 1 },
            totalUsage: { $sum: '$usageCount' },
            avgUsage: { $avg: '$usageCount' },
            promotions: { $push: { name: '$name', usageCount: '$usageCount' } }
          }
        }
      ]);

      return {
        success: true,
        data: {
          timeRange: `${timeRange} days`,
          analytics: analytics,
          summary: {
            totalPromotions: analytics.reduce((sum, a) => sum + a.totalPromotions, 0),
            totalUsage: analytics.reduce((sum, a) => sum + a.totalUsage, 0)
          }
        }
      };
    } catch (error) {
      console.error('Error getting discount analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Setup cron jobs for automatic promotion management
   */
  setupCronJobs() {
    if (!cron) {
      console.log('📅 Cron not available, skipping scheduled tasks setup');
      return;
    }

    try {
      // Run every day at 2 AM to generate expiry promotions
      cron.schedule('0 2 * * *', async () => {
        console.log('Running automatic expiry promotion generation...');
        try {
          await this.generateExpiryPromotions();
        } catch (error) {
          console.error('Error in automatic expiry promotion generation:', error);
        }
      });

      // Run every week to cleanup expired promotions
      cron.schedule('0 3 * * 0', async () => {
        console.log('Cleaning up expired promotions...');
        try {
          const result = await Promotion.updateMany(
            { endDate: { $lt: new Date() } },
            { $set: { isActive: false } }
          );
          console.log(`Deactivated ${result.modifiedCount} expired promotions`);
        } catch (error) {
          console.error('Error cleaning up expired promotions:', error);
        }
      });
      
      console.log('✅ Cron jobs scheduled successfully');
    } catch (error) {
      console.error('❌ Error setting up cron jobs:', error);
    }
  }

  /**
   * Manually trigger promotion cleanup
   */
  async cleanupExpiredPromotions() {
    try {
      const result = await Promotion.updateMany(
        { endDate: { $lt: new Date() }, isActive: true },
        { $set: { isActive: false } }
      );
      
      return {
        success: true,
        message: `Deactivated ${result.modifiedCount} expired promotions`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new DiscountService();
