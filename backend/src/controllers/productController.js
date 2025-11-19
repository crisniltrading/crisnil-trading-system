const Product = require('../models/Product');
const Promotion = require('../models/Promotion');
const Order = require('../models/Order');

// Get all products with enhanced filtering and sorting
const getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      category,
      brand,
      search, 
      isActive, 
      lowStock,
      priceMin,
      priceMax,
      stockStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query = {};
    
    // Filter by category
    if (category) query.category = category;
    
    // Filter by brand
    if (brand) query.brand = { $regex: brand, $options: 'i' };
    
    // Filter by active status
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    // Search by name, brand, or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Price range (post-filter for numeric comparisons)
    const minPrice = priceMin !== undefined ? Number(priceMin) : undefined;
    const maxPrice = priceMax !== undefined ? Number(priceMax) : undefined;

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    let products = await Product.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortObj)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');
    
    // Filter by low stock if requested
    if (lowStock === 'true') {
      products = products.filter(product => product.isLowStock);
    }

    // Filter by stock status
    if (stockStatus === 'out') {
      products = products.filter(p => (p.stock || 0) <= 0);
    }
    if (stockStatus === 'in') {
      products = products.filter(p => (p.stock || 0) > (p.minStock || 0));
    }
    if (stockStatus === 'low') {
      products = products.filter(p => p.isLowStock);
    }

    // Price range filtering
    if (minPrice !== undefined) {
      products = products.filter(p => Number(p.price) >= minPrice);
    }
    if (maxPrice !== undefined) {
      products = products.filter(p => Number(p.price) <= maxPrice);
    }

    // Get active promotions for discount calculation
    const activePromotions = await Promotion.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    // Apply discount information to products
    products = products.map(product => {
      const productObj = product.toObject();
      
      // Find applicable promotions
      const applicablePromotions = activePromotions.filter(promo => {
        if (promo.applicableProducts && promo.applicableProducts.length > 0) {
          return promo.applicableProducts.some(p => p.toString() === product._id.toString());
        }
        if (promo.applicableCategories && promo.applicableCategories.length > 0) {
          return promo.applicableCategories.includes(product.category);
        }
        return false;
      });

      if (applicablePromotions.length > 0) {
        // Use the best discount
        const bestPromo = applicablePromotions.reduce((best, current) => {
          return (current.discountPercentage || 0) > (best.discountPercentage || 0) ? current : best;
        });

        const discountAmount = (productObj.price * (bestPromo.discountPercentage / 100));
        productObj.originalPrice = productObj.price;
        productObj.discountedPrice = productObj.price - discountAmount;
        productObj.discountPercentage = bestPromo.discountPercentage;
        productObj.promotionName = bestPromo.name;
      }

      return productObj;
    });
    
    const total = await Product.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: products.length,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch products'
    });
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    res.status(200).json({
      status: 'success',
      product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product'
    });
  }
};

// Create new product
const createProduct = async (req, res) => {
  try {
    const { generateUniqueBatchNumber } = require('../utils/batchGenerator');
    
    const productData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Auto-generate batch number if batch info is provided but no batch number
    if (productData.batchInfo && productData.batchInfo.length > 0) {
      for (let batch of productData.batchInfo) {
        if (!batch.batchNumber) {
          batch.batchNumber = await generateUniqueBatchNumber();
          console.log('✅ Auto-generated batch number:', batch.batchNumber);
        }
      }
    }

    const product = await Product.create(productData);

    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    console.error('Error details:', error.message);
    console.error('Product data:', req.body);
    
    // Send detailed error for validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create product'
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
      updatedBy: req.user._id
    };

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update product'
    });
  }
};

// Delete product (hard delete with audit log)
const deleteProduct = async (req, res) => {
  try {
    // Find product first to get its data for audit log
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Store product data for audit log
    const productData = product.toObject();
    
    // Create audit log entry
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      action: 'delete',
      entityType: 'product',
      entityId: product._id,
      entityName: product.name,
      performedBy: req.user._id,
      performedByName: req.user.username || req.user.email,
      performedByRole: req.user.role,
      details: {
        reason: 'Product permanently deleted by admin',
        deletedAt: new Date()
      },
      previousData: {
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        description: product.description,
        images: product.images
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    // Hard delete the product from database
    await Product.findByIdAndDelete(req.params.id);

    console.log(`✅ Product deleted: ${product.name} (ID: ${product._id}) by ${req.user.username}`);

    res.status(200).json({
      status: 'success',
      message: 'Product permanently deleted and logged in audit history'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete product'
    });
  }
};

// Get product analytics
const getProductAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30' } = req.query; // days

    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Calculate date range
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Aggregate real order data for this product
    const orderStats = await Order.aggregate([
      {
        $match: {
          'items.product': product._id,
          status: { $nin: ['cancelled', 'refunded'] },
          createdAt: { $gte: startDate }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.product': product._id
        }
      },
      {
        $group: {
          _id: null,
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
          orderCount: { $sum: 1 },
          avgQuantityPerOrder: { $avg: '$items.quantity' }
        }
      }
    ]);

    // Get all products to calculate popularity rank
    const allProductsStats = await Order.aggregate([
      {
        $match: {
          status: { $nin: ['cancelled', 'refunded'] },
          createdAt: { $gte: startDate }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' }
        }
      },
      {
        $sort: { totalSold: -1 }
      }
    ]);

    // Calculate popularity rank
    const productRankIndex = allProductsStats.findIndex(
      p => p._id.toString() === product._id.toString()
    );
    const popularityRank = productRankIndex >= 0 ? productRankIndex + 1 : allProductsStats.length + 1;

    // Get sales trend (compare first half vs second half of period)
    const midDate = new Date();
    midDate.setDate(midDate.getDate() - Math.floor(periodDays / 2));

    const firstHalfSales = await Order.aggregate([
      {
        $match: {
          'items.product': product._id,
          status: { $nin: ['cancelled', 'refunded'] },
          createdAt: { $gte: startDate, $lt: midDate }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: { 'items.product': product._id }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$items.quantity' }
        }
      }
    ]);

    const secondHalfSales = await Order.aggregate([
      {
        $match: {
          'items.product': product._id,
          status: { $nin: ['cancelled', 'refunded'] },
          createdAt: { $gte: midDate }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: { 'items.product': product._id }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$items.quantity' }
        }
      }
    ]);

    const firstHalfTotal = firstHalfSales[0]?.total || 0;
    const secondHalfTotal = secondHalfSales[0]?.total || 0;
    
    let salesTrend = 'stable';
    if (secondHalfTotal > firstHalfTotal * 1.1) {
      salesTrend = 'increasing';
    } else if (secondHalfTotal < firstHalfTotal * 0.9) {
      salesTrend = 'decreasing';
    }

    // Determine seasonal demand based on total sales
    const stats = orderStats[0] || { totalSold: 0, totalRevenue: 0, orderCount: 0, avgQuantityPerOrder: 0 };
    const avgDailySales = stats.totalSold / periodDays;
    
    let seasonalDemand = 'low';
    if (avgDailySales > 10) {
      seasonalDemand = 'high';
    } else if (avgDailySales > 5) {
      seasonalDemand = 'medium';
    }

    const analytics = {
      product: {
        id: product._id,
        name: product.name,
        category: product.category,
        price: product.price,
        currentStock: product.stock,
        minStock: product.minStock,
        isLowStock: product.isLowStock
      },
      sales: {
        totalSold: stats.totalSold,
        totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
        orderCount: stats.orderCount,
        averageOrderSize: Math.round(stats.avgQuantityPerOrder * 10) / 10,
        avgDailySales: Math.round(avgDailySales * 10) / 10,
        period: `${period} days`
      },
      trends: {
        salesTrend,
        popularityRank,
        totalProducts: allProductsStats.length,
        seasonalDemand,
        firstHalfSales: firstHalfTotal,
        secondHalfSales: secondHalfTotal
      }
    };

    res.status(200).json({
      status: 'success',
      analytics
    });
  } catch (error) {
    console.error('Get product analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product analytics'
    });
  }
};

// Upload product image
const uploadProductImage = async (req, res) => {
  try {
    console.log('📤 Image upload request received');
    console.log('Product ID:', req.params.id);
    console.log('User:', req.user ? req.user.username : 'No user');
    console.log('File:', req.file ? req.file.originalname : 'No file');
    console.log('Body:', req.body);
    
    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({
        status: 'error',
        message: 'No image file provided'
      });
    }

    console.log('📁 File details:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      console.error('❌ Product not found:', req.params.id);
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Convert image buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    
    // Initialize images array if it doesn't exist
    if (!product.images) {
      product.images = [];
    }
    
    // Store only the base64 string (without data URL prefix)
    product.images.push({
      data: base64Image,
      contentType: req.file.mimetype,
      filename: req.file.originalname,
      alt: req.body.alt || product.name
    });

    console.log('💾 Saving product with new image to database...');
    await product.save();
    
    // Verify the save
    const updatedProduct = await Product.findById(req.params.id);
    console.log('✅ Image saved to database for product:', product.name);
    console.log('📦 Total images after save:', updatedProduct.images.length);
    console.log('🔍 Product ID:', product._id);

    res.status(200).json({
      status: 'success',
      message: 'Image uploaded successfully',
      image: product.images[product.images.length - 1],
      productId: product._id,
      totalImages: product.images.length
    });
  } catch (error) {
    console.error('❌ Upload image error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload image',
      error: error.message
    });
  }
};

// Delete product image
const deleteProductImage = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    const imageIndex = product.images.findIndex(
      img => img._id.toString() === req.params.imageId
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Image not found'
      });
    }

    // Remove from database (no file system cleanup needed)
    product.images.splice(imageIndex, 1);
    await product.save();

    res.status(200).json({
      status: 'success',
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete image'
    });
  }
};

// Bulk update products
const bulkUpdateProducts = async (req, res) => {
  try {
    const { productIds, updates } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Product IDs array is required'
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        status: 'error',
        message: 'Updates object is required'
      });
    }

    // Add updatedBy to updates
    updates.updatedBy = req.user._id;

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: updates }
    );

    res.status(200).json({
      status: 'success',
      message: `${result.modifiedCount} products updated successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update products'
    });
  }
};

// Bulk delete products (soft delete)
const bulkDeleteProducts = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Product IDs array is required'
      });
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { 
        $set: { 
          isActive: false,
          updatedBy: req.user._id
        }
      }
    );

    res.status(200).json({
      status: 'success',
      message: `${result.modifiedCount} products deleted successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete products'
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductAnalytics,
  uploadProductImage,
  deleteProductImage,
  bulkUpdateProducts,
  bulkDeleteProducts
};
