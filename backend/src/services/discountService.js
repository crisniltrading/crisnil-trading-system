const Promotion = require('../models/Promotion');
const Product = require('../models/Product');

// ============================================================================
// ENHANCED DISCOUNT SERVICE - Smart & Simple
// ============================================================================

class DiscountService {
  /**
   * Calculate best discounts for cart items
   * Automatically finds and applies the best promotions
   */
  async calculateCartDiscounts(cartItems, options = {}) {
    try {
      const { customerType = 'client', customerId } = options;
      const now = new Date();

      // Get all active, auto-apply promotions
      const promotions = await Promotion.find({
        status: 'active',
        autoApply: true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
      })
        .populate('rules.products', 'name price category')
        .sort({ priority: -1 }); // Higher priority first

      console.log(`Found ${promotions.length} active promotions`);

      let totalDiscount = 0;
      let appliedPromotions = [];
      const itemDiscounts = {};

      // Group cart items by product
      for (const item of cartItems) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        const itemTotal = product.price * item.quantity;
        let bestDiscount = { discountAmount: 0, promotion: null };

        // Find best applicable promotion for this item
        for (const promo of promotions) {
          // Check if customer can use this promotion
          if (customerId) {
            const eligibility = promo.canCustomerUse(customerId, customerType);
            if (!eligibility.eligible) continue;
          }

          // Check if promotion applies to this product
          if (!this._isProductEligible(product, promo)) continue;

          // Check if it applies based on expiry (if expiry-based promo)
          if (promo.category === 'expiry' && !this._isExpiryEligible(product, promo)) {
            continue;
          }

          // Calculate discount
          const result = promo.calculateDiscount(itemTotal, item.quantity);

          if (result.applied && result.discountAmount > bestDiscount.discountAmount) {
            // Check if this promotion can stack
            if (!promo.isStackable && appliedPromotions.length > 0) {
              // If better than current best, replace it
              if (result.discountAmount > totalDiscount) {
                totalDiscount = result.discountAmount;
                appliedPromotions = [{
                  promotionId: promo._id,
                  name: promo.name,
                  discount: result.discountAmount
                }];
                itemDiscounts[item.productId] = result.discountAmount;
              }
            } else {
              bestDiscount = { discountAmount: result.discountAmount, promotion: promo };
            }
          }
        }

        // Apply best discount for this item
        if (bestDiscount.promotion) {
          totalDiscount += bestDiscount.discountAmount;
          itemDiscounts[item.productId] = bestDiscount.discountAmount;

          // Add to applied promotions if not already there
          const existing = appliedPromotions.find(
            p => p.promotionId.toString() === bestDiscount.promotion._id.toString()
          );

          if (!existing) {
            appliedPromotions.push({
              promotionId: bestDiscount.promotion._id,
              name: bestDiscount.promotion.name,
              discount: bestDiscount.discountAmount
            });
          }
        }
      }

      // Calculate totals
      const subtotal = cartItems.reduce((sum, item) => {
        const product = Product.findById(item.productId);
        return sum + (product?.price || 0) * item.quantity;
      }, 0);

      const finalTotal = Math.max(0, subtotal - totalDiscount);

      return {
        success: true,
        data: {
          subtotal: Math.round(subtotal * 100) / 100,
          totalDiscount: Math.round(totalDiscount * 100) / 100,
          finalTotal: Math.round(finalTotal * 100) / 100,
          appliedPromotions,
          itemDiscounts,
          savings: Math.round(totalDiscount * 100) / 100
        },
        message: appliedPromotions.length > 0 
          ? `${appliedPromotions.length} promotion(s) applied!` 
          : 'No promotions available'
      };

    } catch (error) {
      console.error('Calculate cart discounts error:', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate discounts'
      };
    }
  }

  /**
   * Get available promotions for specific products
   */
  async getAvailablePromotions(productIds, quantity = 1) {
    try {
      const now = new Date();

      const promotions = await Promotion.find({
        status: 'active',
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now },
        $or: [
          { 'rules.products': { $in: productIds } },
          { 'rules.products': { $size: 0 } } // Applies to all products
        ]
      })
        .sort({ 'discount.value': -1 })
        .select('name description discount rules validity category discountDisplay');

      return {
        success: true,
        data: promotions.map(p => ({
          id: p._id,
          name: p.name,
          description: p.description,
          discountDisplay: p.discountDisplay,
          category: p.category,
          minQuantity: p.rules.minQuantity,
          minAmount: p.rules.minAmount,
          daysRemaining: p.daysRemaining,
          couponCode: p.couponCode
        }))
      };
    } catch (error) {
      console.error('Get available promotions error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Apply coupon code
   */
  async applyCouponCode(code, cartItems, options = {}) {
    try {
      const promotion = await Promotion.findOne({
        couponCode: code.toUpperCase(),
        status: 'active'
      });

      if (!promotion) {
        return {
          success: false,
          error: 'Invalid coupon code'
        };
      }

      if (!promotion.isValid) {
        return {
          success: false,
          error: 'This coupon has expired or reached its usage limit'
        };
      }

      // Check customer eligibility
      if (options.customerId) {
        const eligibility = promotion.canCustomerUse(options.customerId, options.customerType);
        if (!eligibility.eligible) {
          return {
            success: false,
            error: eligibility.reason
          };
        }
      }

      // Calculate discount
      const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      const result = promotion.calculateDiscount(cartTotal, totalQuantity);

      if (!result.applied) {
        return {
          success: false,
          error: result.reason || 'Coupon could not be applied'
        };
      }

      return {
        success: true,
        data: {
          promotionId: promotion._id,
          promotionName: promotion.name,
          discountAmount: result.discountAmount,
          finalAmount: result.finalAmount,
          discountDisplay: promotion.discountDisplay
        },
        message: `Coupon applied! You save ₱${result.discountAmount}`
      };

    } catch (error) {
      console.error('Apply coupon error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Setup automatic discount promotions (bulk + expiry)
   */
  async setupAutomaticDiscounts(options = {}) {
    try {
      const { createBulkDiscount = true, createExpiryDiscount = true, userId } = options;
      const created = [];

      if (createBulkDiscount) {
        // Create tiered bulk discounts (3 separate promotions for simplicity)
        const bulkTiers = [
          { name: 'Bulk Discount (10-19 units)', min: 10, max: 19, discount: 5 },
          { name: 'Bulk Discount (20-49 units)', min: 20, max: 49, discount: 10 },
          { name: 'Bulk Discount (50+ units)', min: 50, max: null, discount: 15 }
        ];

        for (const tier of bulkTiers) {
          const promo = await Promotion.createBulkDiscount({
            name: tier.name,
            discountValue: tier.discount,
            minQuantity: tier.min,
            maxQuantity: tier.max,
            userId
          });
          created.push(promo);
        }
      }

      if (createExpiryDiscount) {
        // Create tiered expiry discounts
        const expiryTiers = [
          { name: 'Near Expiry (30-60 days)', minDays: 30, maxDays: 60, discount: 10 },
          { name: 'Near Expiry (15-29 days)', minDays: 15, maxDays: 29, discount: 25 },
          { name: 'Near Expiry (0-14 days)', minDays: 0, maxDays: 14, discount: 50 }
        ];

        for (const tier of expiryTiers) {
          const promo = await Promotion.createExpiryDiscount({
            name: tier.name,
            discountValue: tier.discount,
            minDays: tier.minDays,
            maxDays: tier.maxDays,
            userId
          });
          created.push(promo);
        }
      }

      return {
        success: true,
        data: created,
        message: `Created ${created.length} automatic promotions`
      };

    } catch (error) {
      console.error('Setup automatic discounts error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get discount analytics
   */
  async getDiscountAnalytics(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const promotions = await Promotion.find({
        createdAt: { $gte: startDate }
      });

      const totalDiscountGiven = promotions.reduce((sum, p) => sum + (p.stats.totalDiscountGiven || 0), 0);
      const totalRevenue = promotions.reduce((sum, p) => sum + (p.stats.totalRevenue || 0), 0);
      const totalUsage = promotions.reduce((sum, p) => sum + (p.stats.timesUsed || 0), 0);

      return {
        success: true,
        data: {
          totalPromotions: promotions.length,
          activePromotions: promotions.filter(p => p.status === 'active').length,
          totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalUsage,
          averageDiscount: totalUsage > 0 ? Math.round((totalDiscountGiven / totalUsage) * 100) / 100 : 0,
          topPromotions: promotions
            .sort((a, b) => (b.stats.timesUsed || 0) - (a.stats.timesUsed || 0))
            .slice(0, 5)
            .map(p => ({
              name: p.name,
              timesUsed: p.stats.timesUsed,
              totalDiscount: p.stats.totalDiscountGiven,
              category: p.category
            }))
        }
      };
    } catch (error) {
      console.error('Get analytics error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Check if product is eligible for promotion
   */
  _isProductEligible(product, promotion) {
    const rules = promotion.rules;

    // If specific products are listed, check if this product is included
    if (rules.products && rules.products.length > 0) {
      const isIncluded = rules.products.some(
        p => p._id.toString() === product._id.toString()
      );
      if (!isIncluded) return false;
    }

    // If specific categories are listed, check if this product's category matches
    if (rules.categories && rules.categories.length > 0) {
      if (!rules.categories.includes(product.category)) return false;
    }

    // Check if product is explicitly excluded
    if (rules.excludeProducts && rules.excludeProducts.length > 0) {
      const isExcluded = rules.excludeProducts.some(
        p => p.toString() === product._id.toString()
      );
      if (isExcluded) return false;
    }

    return true;
  }

  /**
   * Check if product's expiry date makes it eligible for expiry-based promotion
   */
  _isExpiryEligible(product, promotion) {
    const rules = promotion.rules;

    if (!rules.expiryDays || !product.batchInfo || product.batchInfo.length === 0) {
      return false;
    }

    const now = new Date();

    // Check if any batch is within the expiry window
    for (const batch of product.batchInfo) {
      if (!batch.expiryDate) continue;

      const expiryDate = new Date(batch.expiryDate);
      const daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      if (daysToExpiry >= rules.expiryDays.minDays && 
          daysToExpiry <= rules.expiryDays.maxDays) {
        return true;
      }
    }

    return false;
  }
}

module.exports = new DiscountService();
