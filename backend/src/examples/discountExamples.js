/**
 * Discount System Examples and Demo
 * 
 * This file demonstrates how to use the enhanced discount system
 * with practical examples and sample data.
 */

const discountService = require('../services/discountService');
const discountValidator = require('../utils/discountValidator');
const Promotion = require('../models/Promotion');
const Product = require('../models/Product');

class DiscountExamples {

  /**
   * Example 1: Basic bulk discount calculation
   */
  async bulkDiscountExample() {
    console.log('\n=== BULK DISCOUNT EXAMPLE ===');
    
    // Sample cart with varying quantities
    const cartItems = [
      { productId: '507f1f77bcf86cd799439011', quantity: 15 },  // Should get 5% discount
      { productId: '507f1f77bcf86cd799439012', quantity: 25 },  // Should get 10% discount
      { productId: '507f1f77bcf86cd799439013', quantity: 100 }, // Should get 15% discount
      { productId: '507f1f77bcf86cd799439014', quantity: 5 }    // No discount
    ];

    try {
      const result = await discountService.calculateCartDiscounts(cartItems, {
        customerType: 'all'
      });

      if (result.success) {
        console.log('✅ Calculation successful!');
        console.log(`Original Total: $${result.data.originalTotal.toFixed(2)}`);
        console.log(`Discounted Total: $${result.data.discountedTotal.toFixed(2)}`);
        console.log(`Total Savings: $${result.data.totalSavings.toFixed(2)}`);
        console.log(`Bulk Discounts Applied: ${result.data.breakdown.bulkDiscounts.length}`);
        
        // Show discount details
        result.data.breakdown.bulkDiscounts.forEach(discount => {
          console.log(`  - ${discount.productName}: ${discount.discountPercentage}% off (${discount.description})`);
        });
      } else {
        console.log('❌ Calculation failed:', result.error);
      }
    } catch (error) {
      console.error('Error in bulk discount example:', error);
    }
  }

  /**
   * Example 2: Near-expiry discount calculation
   */
  async expiryDiscountExample() {
    console.log('\n=== EXPIRY DISCOUNT EXAMPLE ===');
    
    // Cart with products at different expiry stages
    const cartItems = [
      { productId: '507f1f77bcf86cd799439015', quantity: 10 }, // Near expiry product
      { productId: '507f1f77bcf86cd799439016', quantity: 5 },  // Regular product
    ];

    try {
      const result = await discountService.calculateCartDiscounts(cartItems, {
        customerType: 'all'
      });

      if (result.success) {
        console.log('✅ Calculation successful!');
        console.log(`Original Total: $${result.data.originalTotal.toFixed(2)}`);
        console.log(`Discounted Total: $${result.data.discountedTotal.toFixed(2)}`);
        console.log(`Total Savings: $${result.data.totalSavings.toFixed(2)}`);
        console.log(`Expiry Discounts Applied: ${result.data.breakdown.expiryDiscounts.length}`);
        
        // Show expiry discount details
        result.data.breakdown.expiryDiscounts.forEach(discount => {
          console.log(`  - ${discount.productName}: ${discount.discountPercentage}% off (expires in ${discount.daysToExpiry} days)`);
        });
      } else {
        console.log('❌ Calculation failed:', result.error);
      }
    } catch (error) {
      console.error('Error in expiry discount example:', error);
    }
  }

  /**
   * Example 3: Creating custom promotions
   */
  async createCustomPromotionsExample() {
    console.log('\n=== CUSTOM PROMOTIONS EXAMPLE ===');
    
    try {
      // Create a custom bulk discount promotion
      const customBulkPromotion = {
        name: 'Holiday Bulk Special',
        description: 'Special bulk discounts for the holiday season',
        type: 'bulk_discount',
        discount: {
          type: 'percentage',
          value: 20 // Maximum tier discount
        },
        bulkRules: [
          { minQuantity: 5, maxQuantity: 9, discountPercentage: 8, description: '5-9 units' },
          { minQuantity: 10, maxQuantity: 24, discountPercentage: 15, description: '10-24 units' },
          { minQuantity: 25, maxQuantity: null, discountPercentage: 20, description: '25+ units' }
        ],
        conditions: {
          minQuantity: 5,
          applicableCategories: ['chicken', 'beef'],
          customerTypes: ['all']
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdBy: '507f1f77bcf86cd799439001' // Sample user ID
      };

      // Validate the promotion before creating
      const validation = discountValidator.validatePromotionRules(customBulkPromotion);
      if (!validation.isValid) {
        console.log('❌ Promotion validation failed:', validation.errors);
        return;
      }

      console.log('✅ Custom promotion validation passed');
      console.log('Promotion details:', {
        name: customBulkPromotion.name,
        type: customBulkPromotion.type,
        tiers: customBulkPromotion.bulkRules.length,
        maxDiscount: Math.max(...customBulkPromotion.bulkRules.map(r => r.discountPercentage)) + '%'
      });
      
      // In a real application, you would save this to the database:
      // const savedPromotion = await Promotion.create(customBulkPromotion);
      
    } catch (error) {
      console.error('Error in custom promotions example:', error);
    }
  }

  /**
   * Example 4: Setup automatic discount system
   */
  async setupAutomaticDiscountsExample() {
    console.log('\n=== AUTOMATIC DISCOUNTS SETUP EXAMPLE ===');
    
    try {
      const result = await discountService.setupAutomaticDiscounts({
        createBulkDiscount: true,
        createExpiryDiscount: true,
        userId: '507f1f77bcf86cd799439001'
      });

      if (result.success) {
        console.log('✅ Automatic discounts setup successful!');
        console.log(result.message);
        result.data.forEach(item => {
          console.log(`  - Created ${item.type} promotion: ${item.promotion.name}`);
        });
      } else {
        console.log('❌ Setup failed:', result.error);
      }
    } catch (error) {
      console.error('Error in automatic discounts setup:', error);
    }
  }

  /**
   * Example 5: Validation and error handling
   */
  async validationExample() {
    console.log('\n=== VALIDATION EXAMPLE ===');
    
    // Test with invalid cart items
    const invalidCartItems = [
      { productId: null, quantity: 5 },
      { productId: '507f1f77bcf86cd799439011', quantity: -3 },
      { productId: '507f1f77bcf86cd799439012', quantity: 15000 }
    ];

    // Validate cart items
    const cartValidation = discountValidator.validateCartItems(invalidCartItems);
    if (!cartValidation.isValid) {
      console.log('❌ Cart validation failed (as expected):');
      cartValidation.errors.forEach(error => console.log(`  - ${error}`));
    }

    // Test with valid cart items
    const validCartItems = [
      { productId: '507f1f77bcf86cd799439011', quantity: 15 },
      { productId: '507f1f77bcf86cd799439012', quantity: 25 }
    ];

    const validCartValidation = discountValidator.validateCartItems(validCartItems);
    if (validCartValidation.isValid) {
      console.log('✅ Valid cart items passed validation');
    }
  }

  /**
   * Example 6: Discount analytics
   */
  async analyticsExample() {
    console.log('\n=== ANALYTICS EXAMPLE ===');
    
    try {
      const result = await discountService.getDiscountAnalytics(30);

      if (result.success) {
        console.log('✅ Analytics retrieved successfully!');
        console.log(`Time Range: ${result.data.timeRange}`);
        console.log(`Total Promotions Used: ${result.data.summary.totalPromotions}`);
        console.log(`Total Usage Count: ${result.data.summary.totalUsage}`);
        
        console.log('\nBreakdown by promotion type:');
        result.data.analytics.forEach(analytic => {
          console.log(`  - ${analytic._id}: ${analytic.totalPromotions} promotions, ${analytic.totalUsage} uses`);
        });
      } else {
        console.log('❌ Analytics failed:', result.error);
      }
    } catch (error) {
      console.error('Error in analytics example:', error);
    }
  }

  /**
   * Example 7: Product-specific discount checking
   */
  async productDiscountExample() {
    console.log('\n=== PRODUCT DISCOUNT EXAMPLE ===');
    
    const productIds = [
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439013'
    ];

    try {
      const result = await discountService.getAvailableDiscounts(productIds, 20);

      if (result.success) {
        console.log('✅ Product discounts retrieved successfully!');
        result.data.forEach(productDiscount => {
          console.log(`\nProduct: ${productDiscount.productName} ($${productDiscount.currentPrice})`);
          if (productDiscount.discounts.length > 0) {
            productDiscount.discounts.forEach(discount => {
              console.log(`  - ${discount.type}: ${discount.discountPercentage}% off (Save $${discount.potentialSavings.toFixed(2)})`);
              console.log(`    Description: ${discount.description}`);
            });
          } else {
            console.log('  - No discounts available');
          }
        });
      } else {
        console.log('❌ Product discount check failed:', result.error);
      }
    } catch (error) {
      console.error('Error in product discount example:', error);
    }
  }

  /**
   * Run all examples
   */
  async runAllExamples() {
    console.log('🚀 DISCOUNT SYSTEM EXAMPLES DEMO');
    console.log('='.repeat(50));

    await this.bulkDiscountExample();
    await this.expiryDiscountExample();
    await this.createCustomPromotionsExample();
    await this.setupAutomaticDiscountsExample();
    await this.validationExample();
    await this.analyticsExample();
    await this.productDiscountExample();

    console.log('\n' + '='.repeat(50));
    console.log('✅ All examples completed!');
  }

  /**
   * Sample data for testing (would normally come from database)
   */
  getSampleProducts() {
    return [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Premium Chicken Breast',
        price: 12.99,
        category: 'chicken',
        unit: 'kg',
        isActive: true,
        batchInfo: [
          {
            batchNumber: 'CB001',
            quantity: 100,
            expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          }
        ]
      },
      {
        _id: '507f1f77bcf86cd799439012',
        name: 'Angus Beef Steak',
        price: 24.99,
        category: 'beef',
        unit: 'kg',
        isActive: true,
        batchInfo: [
          {
            batchNumber: 'BS001',
            quantity: 50,
            expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
          }
        ]
      },
      {
        _id: '507f1f77bcf86cd799439015',
        name: 'Salmon Fillet',
        price: 18.99,
        category: 'seafood',
        unit: 'kg',
        isActive: true,
        batchInfo: [
          {
            batchNumber: 'SF001',
            quantity: 30,
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days - near expiry
          }
        ]
      }
    ];
  }

  /**
   * Test scenarios for comprehensive testing
   */
  getTestScenarios() {
    const validator = discountValidator;
    
    return {
      bulkDiscountScenarios: validator.generateBulkDiscountTestScenarios(),
      expiryDiscountScenarios: validator.generateExpiryDiscountTestScenarios(),
      edgeCaseScenarios: validator.generateEdgeCaseScenarios()
    };
  }
}

// Export for use in other files
module.exports = new DiscountExamples();

// If this file is run directly, execute the examples
if (require.main === module) {
  const examples = new DiscountExamples();
  examples.runAllExamples().catch(console.error);
}
