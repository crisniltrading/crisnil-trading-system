const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Get featured products for landing page (public route)
router.get('/featured-products', async (req, res) => {
    try {
        // Get 6 featured products - mix of bestsellers and new items
        const products = await Product.find({ 
            isActive: true,
            stock: { $gt: 0 }
        })
        .select('name description category price unit stock minStock images rating')
        .sort({ 'rating.average': -1, createdAt: -1 })
        .limit(6)
        .lean();

        // Format products for landing page
        const formattedProducts = products.map(product => {
            // Handle both URL and base64 images
            let imageUrl = null;
            if (product.images && product.images.length > 0) {
                const firstImage = product.images[0];
                if (firstImage.url) {
                    // URL-based image
                    imageUrl = firstImage.url;
                    if (!imageUrl.startsWith('http')) {
                        imageUrl = `${req.protocol}://${req.get('host')}${imageUrl}`;
                    }
                } else if (firstImage.data && firstImage.contentType) {
                    // Base64 image
                    imageUrl = `data:${firstImage.contentType};base64,${firstImage.data}`;
                }
            }
            
            return {
                id: product._id,
                name: product.name,
                description: product.description,
                category: product.category,
                price: product.price,
                unit: product.unit,
                stock: product.stock,
                isLowStock: product.stock <= product.minStock,
                rating: product.rating?.average || 0,
                ratingCount: product.rating?.count || 0,
                image: imageUrl,
                // Determine badge
                badge: getBadge(product)
            };
        });

        res.json({
            success: true,
            products: formattedProducts
        });
    } catch (error) {
        console.error('Error fetching featured products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch featured products',
            error: error.message
        });
    }
});

// Get active promotions/discounts (public route)
router.get('/promotions', async (req, res) => {
    try {
        const Promotion = require('../models/Promotion');
        
        // Get active promotions from Promotion model
        const now = new Date();
        
        console.log('🔍 Searching for promotions with criteria:');
        console.log('  - status: active');
        console.log('  - startDate <=', now);
        console.log('  - endDate >=', now);
        
        const activePromotions = await Promotion.find({
            status: 'active',
            'validity.startDate': { $lte: now },
            'validity.endDate': { $gte: now }
        })
        .populate('rules.products', 'name description category price unit stock images')
        .sort({ priority: -1, createdAt: -1 })
        .limit(6)
        .lean();

        console.log(`✅ Found ${activePromotions.length} active promotions`);
        
        if (activePromotions.length > 0) {
            console.log('📋 Promotion details:');
            activePromotions.forEach((promo, idx) => {
                console.log(`  ${idx + 1}. ${promo.name}`);
                console.log(`     - Status: ${promo.status}`);
                console.log(`     - Products: ${promo.rules?.products?.length || 0}`);
                console.log(`     - Start: ${promo.validity?.startDate}`);
                console.log(`     - End: ${promo.validity?.endDate}`);
            });
        }

        // Format promotions for landing page
        const formattedPromotions = [];
        
        for (const promo of activePromotions) {
            // Skip coupon-based promotions (they require a code)
            if (promo.couponCode) {
                console.log(`⏭️  Skipping coupon-based promo: ${promo.name} (${promo.couponCode})`);
                continue;
            }
            
            // Get products for this promotion
            const products = promo.rules?.products || [];
            
            if (products.length === 0) {
                console.log(`⚠️  Promotion "${promo.name}" has no products assigned, skipping`);
                continue;
            }
            
            console.log(`✅ Processing promo: ${promo.name} with ${products.length} products`);
            
            // Show all products in the promotion (not just first one)
            for (const product of products) {
                if (!product || !product.name) continue;
                
                const discountValue = promo.discount?.value || 0;
                const discountType = promo.discount?.type || 'percentage';
                
                let originalPrice = product.price;
                let discountedPrice = originalPrice;
                let discountPercentage = 0;
                
                if (discountType === 'percentage') {
                    discountPercentage = discountValue;
                    discountedPrice = originalPrice * (1 - discountValue / 100);
                } else if (discountType === 'fixed_amount') {
                    discountedPrice = Math.max(0, originalPrice - discountValue);
                    discountPercentage = Math.round((discountValue / originalPrice) * 100);
                } else if (discountType === 'per_unit') {
                    discountedPrice = Math.max(0, originalPrice - discountValue);
                    discountPercentage = Math.round((discountValue / originalPrice) * 100);
                }
                
                // Handle both URL and base64 images
                let imageUrl = null;
                if (product.images && product.images.length > 0) {
                    const firstImage = product.images[0];
                    if (firstImage.url) {
                        imageUrl = firstImage.url;
                        if (!imageUrl.startsWith('http')) {
                            imageUrl = `${req.protocol}://${req.get('host')}${imageUrl}`;
                        }
                    } else if (firstImage.data && firstImage.contentType) {
                        imageUrl = `data:${firstImage.contentType};base64,${firstImage.data}`;
                    }
                }
                
                const daysRemaining = Math.ceil((new Date(promo.validity.endDate) - now) / (1000 * 60 * 60 * 24));

                formattedPromotions.push({
                    id: product._id,
                    promoId: promo._id,
                    name: product.name,
                    description: promo.description || product.description || 'Special discount offer',
                    category: product.category,
                    originalPrice: Math.round(originalPrice),
                    discountedPrice: Math.round(discountedPrice),
                    discountPercentage: Math.round(discountPercentage),
                    unit: product.unit,
                    minQuantity: promo.rules?.minQuantity || 1,
                    stock: product.stock,
                    image: imageUrl,
                    daysRemaining: Math.max(1, daysRemaining)
                });
            }
        }
        
        console.log(`Formatted ${formattedPromotions.length} promotions for display`);
        
        // If no promotions from Promotion model, fallback to products with bulk discounts
        if (formattedPromotions.length === 0) {
            console.log('No promotions found, checking for bulk discount products...');
            const bulkProducts = await Product.find({
                isActive: true,
                stock: { $gt: 0 },
                'pricing.bulkDiscount': { $gt: 0 }
            })
            .select('name description category price unit stock pricing images')
            .sort({ 'pricing.bulkDiscount': -1 })
            .limit(4)
            .lean();
            
            console.log(`Found ${bulkProducts.length} products with bulk discounts`);
            
            for (const product of bulkProducts) {
                const discount = product.pricing?.bulkDiscount || 0;
                const originalPrice = product.price;
                const discountedPrice = originalPrice * (1 - discount);
                const minQuantity = product.pricing?.bulkMinQuantity || 10;
                
                // Handle both URL and base64 images
                let imageUrl = null;
                if (product.images && product.images.length > 0) {
                    const firstImage = product.images[0];
                    if (firstImage.url) {
                        imageUrl = firstImage.url;
                        if (!imageUrl.startsWith('http')) {
                            imageUrl = `${req.protocol}://${req.get('host')}${imageUrl}`;
                        }
                    } else if (firstImage.data && firstImage.contentType) {
                        imageUrl = `data:${firstImage.contentType};base64,${firstImage.data}`;
                    }
                }

                formattedPromotions.push({
                    id: product._id,
                    name: product.name,
                    description: product.description || 'Bulk discount offer',
                    category: product.category,
                    originalPrice: originalPrice,
                    discountedPrice: Math.round(discountedPrice),
                    discountPercentage: Math.round(discount * 100),
                    unit: product.unit,
                    minQuantity: minQuantity,
                    stock: product.stock,
                    image: imageUrl,
                    daysRemaining: Math.floor(Math.random() * 7) + 1
                });
            }
        }

        res.json({
            success: true,
            promotions: formattedPromotions,
            count: formattedPromotions.length
        });
    } catch (error) {
        console.error('Error fetching promotions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch promotions',
            error: error.message
        });
    }
});

// Get products by category (public route)
router.get('/products/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const products = await Product.find({
            isActive: true,
            category: category.toLowerCase(),
            stock: { $gt: 0 }
        })
        .select('name description price unit stock images rating')
        .sort({ 'rating.average': -1 })
        .limit(limit)
        .lean();

        res.json({
            success: true,
            category: category,
            count: products.length,
            products: products
        });
    } catch (error) {
        console.error('Error fetching products by category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
});

// Helper function to determine product badge
function getBadge(product) {
    // New product (created in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (new Date(product.createdAt) > thirtyDaysAgo) {
        return 'NEW';
    }
    
    // Bestseller (high rating and many reviews)
    if (product.rating?.average >= 4.5 && product.rating?.count >= 10) {
        return 'BESTSELLER';
    }
    
    // Hot item (low stock but high rating)
    if (product.stock <= product.minStock && product.rating?.average >= 4) {
        return 'HOT';
    }
    
    return null;
}

module.exports = router;
