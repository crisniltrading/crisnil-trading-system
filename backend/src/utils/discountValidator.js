/**
 * Discount Validation Utilities
 * Contains validation logic and test scenarios for the discount system
 */

class DiscountValidator {

  /**
   * Validate cart items structure
   * @param {Array} cartItems - Array of cart items
   * @returns {Object} Validation result
   */
  validateCartItems(cartItems) {
    const errors = [];

    if (!Array.isArray(cartItems)) {
      errors.push('Cart items must be an array');
      return { isValid: false, errors };
    }

    if (cartItems.length === 0) {
      errors.push('Cart must contain at least one item');
      return { isValid: false, errors };
    }

    cartItems.forEach((item, index) => {
      if (!item.productId) {
        errors.push(`Item ${index + 1}: Product ID is required`);
      }

      if (!item.quantity || item.quantity < 1) {
        errors.push(`Item ${index + 1}: Quantity must be a positive integer`);
      }

      if (item.quantity > 10000) {
        errors.push(`Item ${index + 1}: Quantity cannot exceed 10,000 units`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate promotion rules
   * @param {Object} promotion - Promotion object
   * @returns {Object} Validation result
   */
  validatePromotionRules(promotion) {
    const errors = [];

    // Basic promotion validation
    if (!promotion.name || promotion.name.trim().length === 0) {
      errors.push('Promotion name is required');
    }

    if (!promotion.type) {
      errors.push('Promotion type is required');
    }

    if (!promotion.startDate || !promotion.endDate) {
      errors.push('Start date and end date are required');
    }

    if (promotion.startDate && promotion.endDate && new Date(promotion.startDate) >= new Date(promotion.endDate)) {
      errors.push('End date must be after start date');
    }

    // Validate bulk rules if present
    if (promotion.type === 'bulk_discount' && promotion.bulkRules) {
      this.validateBulkRules(promotion.bulkRules, errors);
    }

    // Validate expiry rules if present
    if (promotion.type === 'expiry_discount' && promotion.expiryRules) {
      this.validateExpiryRules(promotion.expiryRules, errors);
    }

    // Validate discount configuration
    if (promotion.discount) {
      if (!promotion.discount.type) {
        errors.push('Discount type is required');
      }

      if (promotion.discount.type === 'percentage' && 
          (promotion.discount.value < 0 || promotion.discount.value > 100)) {
        errors.push('Percentage discount must be between 0 and 100');
      }

      if (promotion.discount.type === 'fixed_amount' && promotion.discount.value < 0) {
        errors.push('Fixed discount amount cannot be negative');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate bulk discount rules
   */
  validateBulkRules(bulkRules, errors) {
    if (!Array.isArray(bulkRules)) {
      errors.push('Bulk rules must be an array');
      return;
    }

    bulkRules.forEach((rule, index) => {
      if (!rule.minQuantity || rule.minQuantity < 1) {
        errors.push(`Bulk rule ${index + 1}: Minimum quantity must be at least 1`);
      }

      if (rule.maxQuantity && rule.maxQuantity < rule.minQuantity) {
        errors.push(`Bulk rule ${index + 1}: Maximum quantity cannot be less than minimum quantity`);
      }

      if (!rule.discountPercentage || rule.discountPercentage < 0 || rule.discountPercentage > 100) {
        errors.push(`Bulk rule ${index + 1}: Discount percentage must be between 0 and 100`);
      }
    });

    // Check for overlapping quantity ranges
    const sortedRules = bulkRules
      .filter(rule => rule.minQuantity && rule.discountPercentage)
      .sort((a, b) => a.minQuantity - b.minQuantity);

    for (let i = 0; i < sortedRules.length - 1; i++) {
      const current = sortedRules[i];
      const next = sortedRules[i + 1];

      if (current.maxQuantity && next.minQuantity <= current.maxQuantity) {
        errors.push(`Bulk rules have overlapping quantity ranges: ${current.minQuantity}-${current.maxQuantity} and ${next.minQuantity}-${next.maxQuantity}`);
      }
    }
  }

  /**
   * Validate expiry discount rules
   */
  validateExpiryRules(expiryRules, errors) {
    if (!Array.isArray(expiryRules)) {
      errors.push('Expiry rules must be an array');
      return;
    }

    expiryRules.forEach((rule, index) => {
      if (rule.minDays < 0) {
        errors.push(`Expiry rule ${index + 1}: Minimum days cannot be negative`);
      }

      if (rule.maxDays < 0) {
        errors.push(`Expiry rule ${index + 1}: Maximum days cannot be negative`);
      }

      if (rule.maxDays < rule.minDays) {
        errors.push(`Expiry rule ${index + 1}: Maximum days cannot be less than minimum days`);
      }

      if (!rule.discountPercentage || rule.discountPercentage < 0 || rule.discountPercentage > 100) {
        errors.push(`Expiry rule ${index + 1}: Discount percentage must be between 0 and 100`);
      }
    });
  }

  /**
   * Validate discount calculation results
   * @param {Object} result - Discount calculation result
   * @returns {Object} Validation result
   */
  validateDiscountResult(result) {
    const errors = [];

    if (typeof result.originalTotal !== 'number' || result.originalTotal < 0) {
      errors.push('Invalid original total');
    }

    if (typeof result.discountedTotal !== 'number' || result.discountedTotal < 0) {
      errors.push('Invalid discounted total');
    }

    if (result.discountedTotal > result.originalTotal) {
      errors.push('Discounted total cannot be greater than original total');
    }

    if (typeof result.totalSavings !== 'number' || result.totalSavings < 0) {
      errors.push('Invalid total savings');
    }

    if (Math.abs((result.originalTotal - result.discountedTotal) - result.totalSavings) > 0.01) {
      errors.push('Savings calculation mismatch');
    }

    if (!Array.isArray(result.appliedDiscounts)) {
      errors.push('Applied discounts must be an array');
    }

    if (!Array.isArray(result.updatedItems)) {
      errors.push('Updated items must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate test scenarios for bulk discounts
   */
  generateBulkDiscountTestScenarios() {
    return [
      {
        name: 'Small quantity (no discount)',
        cartItems: [{ productId: 'test1', quantity: 5 }],
        expectedDiscount: 0,
        expectedDiscountType: null
      },
      {
        name: 'First tier bulk discount (10-19 units)',
        cartItems: [{ productId: 'test1', quantity: 15 }],
        expectedDiscount: 5,
        expectedDiscountType: 'bulk_discount'
      },
      {
        name: 'Second tier bulk discount (20-49 units)',
        cartItems: [{ productId: 'test1', quantity: 25 }],
        expectedDiscount: 10,
        expectedDiscountType: 'bulk_discount'
      },
      {
        name: 'Third tier bulk discount (50+ units)',
        cartItems: [{ productId: 'test1', quantity: 100 }],
        expectedDiscount: 15,
        expectedDiscountType: 'bulk_discount'
      },
      {
        name: 'Multiple products with mixed quantities',
        cartItems: [
          { productId: 'test1', quantity: 15 },
          { productId: 'test2', quantity: 30 },
          { productId: 'test3', quantity: 5 }
        ],
        expectedComplexCalculation: true
      }
    ];
  }

  /**
   * Generate test scenarios for expiry discounts
   */
  generateExpiryDiscountTestScenarios() {
    const now = new Date();
    return [
      {
        name: 'No expiry discount (product not near expiry)',
        cartItems: [{ productId: 'test1', quantity: 5 }],
        productExpiryDate: new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)), // 90 days
        expectedDiscount: 0,
        expectedDiscountType: null
      },
      {
        name: 'First tier expiry discount (30-60 days)',
        cartItems: [{ productId: 'test1', quantity: 5 }],
        productExpiryDate: new Date(now.getTime() + (45 * 24 * 60 * 60 * 1000)), // 45 days
        expectedDiscount: 10,
        expectedDiscountType: 'expiry_discount'
      },
      {
        name: 'Second tier expiry discount (15-29 days)',
        cartItems: [{ productId: 'test1', quantity: 5 }],
        productExpiryDate: new Date(now.getTime() + (20 * 24 * 60 * 60 * 1000)), // 20 days
        expectedDiscount: 25,
        expectedDiscountType: 'expiry_discount'
      },
      {
        name: 'Third tier expiry discount (0-14 days)',
        cartItems: [{ productId: 'test1', quantity: 5 }],
        productExpiryDate: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)), // 7 days
        expectedDiscount: 50,
        expectedDiscountType: 'expiry_discount'
      }
    ];
  }

  /**
   * Generate edge case test scenarios
   */
  generateEdgeCaseScenarios() {
    return [
      {
        name: 'Empty cart',
        cartItems: [],
        expectError: true,
        expectedError: 'Cart must contain at least one item'
      },
      {
        name: 'Invalid product ID',
        cartItems: [{ productId: null, quantity: 5 }],
        expectError: true,
        expectedError: 'Product ID is required'
      },
      {
        name: 'Zero quantity',
        cartItems: [{ productId: 'test1', quantity: 0 }],
        expectError: true,
        expectedError: 'Quantity must be a positive integer'
      },
      {
        name: 'Negative quantity',
        cartItems: [{ productId: 'test1', quantity: -5 }],
        expectError: true,
        expectedError: 'Quantity must be a positive integer'
      },
      {
        name: 'Extremely large quantity',
        cartItems: [{ productId: 'test1', quantity: 50000 }],
        expectError: true,
        expectedError: 'Quantity cannot exceed 10,000 units'
      }
    ];
  }

  /**
   * Validate that bulk and expiry discounts don't stack incorrectly
   */
  validateDiscountStacking(discountResult) {
    const errors = [];

    // Check if both bulk and expiry discounts are applied to the same product
    const bulkDiscounts = discountResult.breakdown.bulkDiscounts || [];
    const expiryDiscounts = discountResult.breakdown.expiryDiscounts || [];

    bulkDiscounts.forEach(bulkDiscount => {
      const conflictingExpiry = expiryDiscounts.find(
        expiryDiscount => expiryDiscount.productId.toString() === bulkDiscount.productId.toString()
      );

      if (conflictingExpiry) {
        errors.push(`Product ${bulkDiscount.productName} has both bulk and expiry discounts applied, which should not happen`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate discount percentage limits
   */
  validateDiscountLimits(discountResult) {
    const errors = [];
    const maxAllowedDiscount = 70; // 70% maximum discount

    discountResult.updatedItems.forEach(item => {
      if (item.originalPrice > 0) {
        const discountPercentage = (item.savings / item.originalPrice) * 100;
        
        if (discountPercentage > maxAllowedDiscount) {
          errors.push(`Product ${item.product.name} has ${discountPercentage.toFixed(1)}% discount, which exceeds the maximum allowed ${maxAllowedDiscount}%`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new DiscountValidator();
