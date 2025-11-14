/**
 * Script to initialize default discount promotions
 * Run this to set up the discount system with default promotions
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Promotion = require('../models/Promotion');

// Connect to database
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// Create default bulk discount promotion
async function createBulkDiscountPromotion() {
    try {
        // Check if it already exists
        const existing = await Promotion.findOne({ 
            type: 'bulk_discount',
            name: 'Default Bulk Order Discount'
        });

        if (existing) {
            console.log('✅ Bulk discount promotion already exists');
            return existing;
        }

        const bulkPromotion = await Promotion.create({
            name: 'Default Bulk Order Discount',
            description: 'Automatic tiered discounts for bulk orders - more you buy, more you save!',
            type: 'bulk_discount',
            discount: {
                type: 'percentage',
                value: 15 // Maximum tier discount
            },
            bulkRules: [
                { 
                    minQuantity: 10, 
                    maxQuantity: 19, 
                    discountPercentage: 5, 
                    description: '10-19 units: 5% off' 
                },
                { 
                    minQuantity: 20, 
                    maxQuantity: 49, 
                    discountPercentage: 10, 
                    description: '20-49 units: 10% off' 
                },
                { 
                    minQuantity: 50, 
                    maxQuantity: null, 
                    discountPercentage: 15, 
                    description: '50+ units: 15% off' 
                }
            ],
            conditions: {
                minQuantity: 10,
                customerTypes: ['all']
            },
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            isActive: true,
            createdBy: new mongoose.Types.ObjectId() // Dummy admin ID
        });

        console.log('✅ Bulk discount promotion created successfully');
        return bulkPromotion;
    } catch (error) {
        console.error('❌ Error creating bulk discount promotion:', error);
        throw error;
    }
}

// Create default near-expiry discount promotion
async function createExpiryDiscountPromotion() {
    try {
        // Check if it already exists
        const existing = await Promotion.findOne({ 
            type: 'expiry_discount',
            name: 'Near Expiry Discount'
        });

        if (existing) {
            console.log('✅ Expiry discount promotion already exists');
            return existing;
        }

        const expiryPromotion = await Promotion.create({
            name: 'Near Expiry Discount',
            description: 'Automatic discounts for products nearing expiry - fresh deals every day!',
            type: 'expiry_discount',
            discount: {
                type: 'percentage',
                value: 50 // Maximum tier discount
            },
            expiryRules: [
                { 
                    minDays: 30, 
                    maxDays: 60, 
                    discountPercentage: 10, 
                    description: '30-60 days to expiry: 10% off' 
                },
                { 
                    minDays: 15, 
                    maxDays: 29, 
                    discountPercentage: 25, 
                    description: '15-29 days to expiry: 25% off' 
                },
                { 
                    minDays: 0, 
                    maxDays: 14, 
                    discountPercentage: 50, 
                    description: '0-14 days to expiry: 50% off' 
                }
            ],
            conditions: {
                minQuantity: 1,
                customerTypes: ['all']
            },
            autoGenerate: {
                enabled: true,
                daysBeforeExpiry: 60
            },
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            isActive: true,
            createdBy: new mongoose.Types.ObjectId() // Dummy admin ID
        });

        console.log('✅ Expiry discount promotion created successfully');
        return expiryPromotion;
    } catch (error) {
        console.error('❌ Error creating expiry discount promotion:', error);
        throw error;
    }
}

// Main initialization function
async function initializeDiscounts() {
    console.log('🚀 Initializing discount system...');
    
    try {
        await connectDB();
        
        console.log('📊 Creating default promotions...');
        const bulkPromo = await createBulkDiscountPromotion();
        const expiryPromo = await createExpiryDiscountPromotion();
        
        console.log('\n🎉 Discount system initialized successfully!');
        console.log('📋 Summary:');
        console.log(`   • Bulk Discount Promotion: ${bulkPromo.name}`);
        console.log(`   • Expiry Discount Promotion: ${expiryPromo.name}`);
        console.log('\n💡 Your discount system is now ready to use!');
        console.log('🔗 Available features:');
        console.log('   • Automatic bulk discounts: 5%, 10%, 15% based on quantity');
        console.log('   • Near-expiry discounts: 10%, 25%, 50% based on expiry date');
        console.log('   • Real-time discount calculations in checkout');
        console.log('   • Discount previews in cart');
        console.log('   • Analytics and usage tracking');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Failed to initialize discount system:', error);
        process.exit(1);
    }
}

// Run the initialization
if (require.main === module) {
    initializeDiscounts();
}

module.exports = {
    initializeDiscounts,
    createBulkDiscountPromotion,
    createExpiryDiscountPromotion
};
