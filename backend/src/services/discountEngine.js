const Product = require('../models/Product');
const Promotion = require('../models/Promotion');

/**
 * Comprehensive Discount Rules Engine
 * Handles bulk order discounts and near-expiry discounts with flexible configuration
 */
class DiscountEngine {
  
  /**
   * Calculate all applicable discounts for a cart
   * @param {Array} cartItems - Array of cart items with productId, quantity
   * @param {String} customerType - Customer type (new, returning, vip, etc.)
   * @returns {Object} Applied discounts and updated cart
   */
  async calculateCartDiscounts(cartItems, customerType = 'all') {
    try {
      const results = {
        originalTotal: 0,
        discountedTotal: 0,
        totalSavings: 0,
        appliedDiscounts: [],
        updatedItems: [],
        breakdown: {
          bulkDiscounts: [],
          expiryDiscounts: [],
          otherDiscounts: []
        }
      };

      // Get active promotions
      const activePromotions = await this.getActivePromotions();
      
      // Process each cart item
      for (const item of cartItems) {
        const product = await Product.findById(item.productId);
        if (!product || !product.isActive) continue;

        const itemOriginalPrice = product.price * item.quantity;
        let itemDiscountedPrice = itemOriginalPrice;
        let itemSavings = 0;
        const itemDiscounts = [];

        // 1. Check for bulk discounts
        const bulkDiscount = await this.calculateBulkDiscount(product, item.quantity, activePromotions);
        if (bulkDiscount.applicable) {
          const bulkSavings = itemOriginalPrice * (bulkDiscount.discountPercentage / 100);
          itemDiscountedPrice -= bulkSavings;
          itemSavings += bulkSavings;
          itemDiscounts.push(bulkDiscount);
          results.breakdown.bulkDiscounts.push({
            productId: product._id,
            productName: product.name,
            ...bulkDiscount,
            savings: bulkSavings
          });
        }

        // 2. Check for near-expiry discounts (only if no bulk discount applied)
        if (!bulkDiscount.applicable) {
          const expiryDiscount = await this.calculateExpiryDiscount(product, item.quantity, activePromotions);
          if (expiryDiscount.applicable) {
            const expirySavings = itemOriginalPrice * (expiryDiscount.discountPercentage / 100);
            itemDiscountedPrice -= expirySavings;
            itemSavings += expirySavings;
            itemDiscounts.push(expiryDiscount);
            results.breakdown.expiryDiscounts.push({
              productId: product._id,
              productName: product.name,
              ...expiryDiscount,
              savings: expirySavings
            });
          }
        }

        // 3. Check for other applicable promotions (customer-specific, seasonal, etc.)
        const otherDiscounts = await this.calculateOtherDiscounts(product, item.quantity, customerType, activePromotions);
        for (const discount of otherDiscounts) {
          const discountSavings = itemOriginalPrice * (discount.discountPercentage / 100);
          itemDiscountedPrice -= discountSavings;
          itemSavings += discountSavings;
          itemDiscounts.push(discount);
          results.breakdown.otherDiscounts.push({
            productId: product._id,
            productName: product.name,
            ...discount,
            savings: discountSavings
          });
        }

        results.originalTotal += itemOriginalPrice;
        results.discountedTotal += itemDiscountedPrice;
        results.totalSavings += itemSavings;

        results.updatedItems.push({
          ...item,
          product: {
            _id: product._id,
            name: product.name,
            price: product.price,
            unit: product.unit,
            category: product.category
          },
          originalPrice: itemOriginalPrice,
          discountedPrice: itemDiscountedPrice,
          savings: itemSavings,
          appliedDiscounts: itemDiscounts
        });

        results.appliedDiscounts.push(...itemDiscounts);
      }

      return results;
    } catch (error) {
      console.error('Error calculating cart discounts:', error);
      throw error;
    }
  }

  /**
   * Calculate bulk order discounts based on quantity tiers
   * Supports: 10-19 units → 5% off, 20-49 units → 10% off, 50+ units → 15% off
   */
  async calculateBulkDiscount(product, quantity, promotions) {
    const bulkPromotions = promotions.filter(p => p.type === 'bulk_discount');
    
    for (const promotion of bulkPromotions) {
      // Check if product is eligible
      if (!this.isProductEligible(product, promotion)) continue;
      
      // Check quantity tiers
      const tiers = promotion.bulkRules || this.getDefaultBulkTiers();
      const applicableTier = this.findApplicableTier(quantity, tiers);
      
      if (applicableTier) {
        return {
          applicable: true,
          promotionId: promotion._id,
          promotionName: promotion.name,
          type: 'bulk_discount',
          discountType: 'percentage',
          discountPercentage: applicableTier.discountPercentage,
          tier: applicableTier,
          quantity: quantity,
          description: `Bulk discount: ${applicableTier.discountPercentage}% off for ${applicableTier.minQuantity}+ units`
        };
      }
    }

    return { applicable: false };
  }

  /**
   * Calculate near-expiry discounts based on days until expiration
   * Supports: 30-60 days → 10% off, 15-29 days → 25% off, 0-14 days → 50% off
   */
  async calculateExpiryDiscount(product, quantity, promotions) {
    if (!product.batchInfo || product.batchInfo.length === 0) {
      return { applicable: false };
    }

    // Find the batch with nearest expiry that has sufficient quantity
    const availableBatch = this.findAvailableBatch(product.batchInfo, quantity);
    if (!availableBatch) return { applicable: false };

    const daysToExpiry = Math.ceil((availableBatch.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    
    // Get expiry promotions or use default rules
    const expiryPromotions = promotions.filter(p => p.type === 'expiry_discount');
    let expiryRules = this.getDefaultExpiryTiers();
    
    if (expiryPromotions.length > 0) {
      const applicablePromotion = expiryPromotions.find(p => this.isProductEligible(product, p));
      if (applicablePromotion && applicablePromotion.expiryRules) {
        expiryRules = applicablePromotion.expiryRules;
      }
    }

    const applicableTier = this.findApplicableExpiryTier(daysToExpiry, expiryRules);
    
    if (applicableTier) {
      return {
        applicable: true,
        promotionId: expiryPromotions.length > 0 ? expiryPromotions[0]._id : 'auto-expiry',
        promotionName: expiryPromotions.length > 0 ? expiryPromotions[0].name : 'Near Expiry Discount',
        type: 'expiry_discount',
        discountType: 'percentage',
        discountPercentage: applicableTier.discountPercentage,
        tier: applicableTier,
        daysToExpiry: daysToExpiry,
        batchNumber: availableBatch.batchNumber,
        expiryDate: availableBatch.expiryDate,
        description: `Near expiry discount: ${applicableTier.discountPercentage}% off (expires in ${daysToExpiry} days)`
      };
    }

    return { applicable: false };
  }

  /**
   * Calculate other applicable discounts (seasonal, customer-specific, etc.)
   */
  async calculateOtherDiscounts(product, quantity, customerType, promotions) {
    const applicableDiscounts = [];
    
    const otherPromotions = promotions.filter(p => 
      !['bulk_discount', 'expiry_discount'].includes(p.type) && 
      this.isProductEligible(product, p) &&
      this.isCustomerEligible(customerType, p)
    );

    for (const promotion of otherPromotions) {
      if (quantity >= (promotion.conditions.minQuantity || 1)) {
        applicableDiscounts.push({
          applicable: true,
          promotionId: promotion._id,
          promotionName: promotion.name,
          type: promotion.type,
          discountType: promotion.discount.type === 'percentage' ? 'percentage' : 'fixed',
          discountPercentage: promotion.discount.type === 'percentage' ? promotion.discount.value : 
            (promotion.discount.value / product.price) * 100,
          discountAmount: promotion.discount.type === 'fixed_amount' ? promotion.discount.value : null,
          description: promotion.description || `${promotion.name} discount applied`
        });
      }
    }

    return applicableDiscounts;
  }

  /**
   * Get default bulk discount tiers
   */
  getDefaultBulkTiers() {
    return [
      { minQuantity: 50, maxQuantity: null, discountPercentage: 15, description: '50+ units' },
      { minQuantity: 20, maxQuantity: 49, discountPercentage: 10, description: '20-49 units' },
      { minQuantity: 10, maxQuantity: 19, discountPercentage: 5, description: '10-19 units' }
    ];
  }

  /**
   * Get default expiry discount tiers
   */
  getDefaultExpiryTiers() {
    return [
      { minDays: 0, maxDays: 14, discountPercentage: 50, description: '0-14 days to expiry' },
      { minDays: 15, maxDays: 29, discountPercentage: 25, description: '15-29 days to expiry' },
      { minDays: 30, maxDays: 60, discountPercentage: 10, description: '30-60 days to expiry' }
    ];
  }

  /**
   * Find applicable quantity tier
   */
  findApplicableTier(quantity, tiers) {
    // Sort tiers by minQuantity descending to get the highest applicable tier
    const sortedTiers = tiers.sort((a, b) => b.minQuantity - a.minQuantity);
    
    for (const tier of sortedTiers) {
      if (quantity >= tier.minQuantity && 
          (tier.maxQuantity === null || quantity <= tier.maxQuantity)) {
        return tier;
      }
    }
    return null;
  }

  /**
   * Find applicable expiry tier based on days to expiry
   */
  findApplicableExpiryTier(daysToExpiry, tiers) {
    for (const tier of tiers) {
      if (daysToExpiry >= tier.minDays && daysToExpiry <= tier.maxDays) {
        return tier;
      }
    }
    return null;
  }

  /**
   * Find available batch with sufficient quantity
   */
  findAvailableBatch(batches, requiredQuantity) {
    // Sort by expiry date (nearest first)
    const sortedBatches = batches
      .filter(batch => batch.quantity >= requiredQuantity && batch.expiryDate > new Date())
      .sort((a, b) => a.expiryDate - b.expiryDate);
    
    return sortedBatches[0] || null;
  }

  /**
   * Check if product is eligible for promotion
   */
  isProductEligible(product, promotion) {
    const conditions = promotion.conditions || {};
    
    // Check specific products
    if (conditions.applicableProducts && conditions.applicableProducts.length > 0) {
      return conditions.applicableProducts.some(id => id.toString() === product._id.toString());
    }
    
    // Check categories
    if (conditions.applicableCategories && conditions.applicableCategories.length > 0) {
      return conditions.applicableCategories.includes(product.category);
    }
    
    // If no specific conditions, applies to all products
    return true;
  }

  /**
   * Check if customer is eligible for promotion
   */
  isCustomerEligible(customerType, promotion) {
    const conditions = promotion.conditions || {};
    
    if (!conditions.customerTypes || conditions.customerTypes.length === 0 || 
        conditions.customerTypes.includes('all')) {
      return true;
    }
    
    return conditions.customerTypes.includes(customerType);
  }

  /**
   * Get active promotions
   */
  async getActivePromotions() {
    const now = new Date();
    return await Promotion.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { 'usageLimit.total': { $exists: false } },
        { 'usageLimit.total': null },
        { $expr: { $lt: ['$usageCount', '$usageLimit.total'] } }
      ]
    });
  }

  /**
   * Create bundle pricing (buy X get Y discount)
   */
  calculateBundleDiscount(cartItems, bundleRules) {
    // Implementation for bundle discounts like "buy 10 get 1 free"
    // This can be extended based on specific business needs
    return {
      applicable: false,
      bundleDiscounts: []
    };
  }

  /**
   * Validate discount application
   */
  validateDiscount(discount, product, quantity) {
    // Additional validation logic
    if (discount.discountPercentage > 100) return false;
    if (discount.discountPercentage < 0) return false;
    if (quantity < 1) return false;
    
    return true;
  }
}

module.exports = new DiscountEngine();
