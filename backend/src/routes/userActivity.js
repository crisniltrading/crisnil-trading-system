// User Activity Routes
// Track user activities like recently viewed products, searches, etc.

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Product = require('../models/Product');

// All routes require authentication
router.use(protect);

/**
 * Track recently viewed product
 * POST /api/user-activity/viewed-product
 */
router.post('/viewed-product', async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        status: 'error',
        message: 'Product ID is required'
      });
    }
    
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }
    
    // Update user's recently viewed products
    const user = await User.findById(req.user.id);
    
    if (!user.recentlyViewed) {
      user.recentlyViewed = [];
    }
    
    // Remove product if already in list
    user.recentlyViewed = user.recentlyViewed.filter(
      item => item.productId.toString() !== productId
    );
    
    // Add to beginning of array
    user.recentlyViewed.unshift({
      productId: productId,
      viewedAt: new Date()
    });
    
    // Keep only last 20 items
    if (user.recentlyViewed.length > 20) {
      user.recentlyViewed = user.recentlyViewed.slice(0, 20);
    }
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Product view tracked'
    });
    
  } catch (error) {
    console.error('Track viewed product error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * Get recently viewed products
 * GET /api/user-activity/recently-viewed
 */
router.get('/recently-viewed', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'recentlyViewed.productId',
        select: 'name price discountedPrice images category stock'
      });
    
    if (!user || !user.recentlyViewed) {
      return res.status(200).json({
        status: 'success',
        data: {
          products: []
        }
      });
    }
    
    // Filter out any null products (deleted products)
    const products = user.recentlyViewed
      .filter(item => item.productId)
      .map(item => ({
        ...item.productId.toObject(),
        viewedAt: item.viewedAt
      }));
    
    res.status(200).json({
      status: 'success',
      data: {
        products
      }
    });
    
  } catch (error) {
    console.error('Get recently viewed error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * Track search query
 * POST /api/user-activity/search
 */
router.post('/search', async (req, res) => {
  try {
    const { query, resultsCount } = req.body;
    
    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }
    
    // Update user's search history
    const user = await User.findById(req.user.id);
    
    if (!user.searchHistory) {
      user.searchHistory = [];
    }
    
    // Add to search history
    user.searchHistory.unshift({
      query: query,
      resultsCount: resultsCount || 0,
      searchedAt: new Date()
    });
    
    // Keep only last 50 searches
    if (user.searchHistory.length > 50) {
      user.searchHistory = user.searchHistory.slice(0, 50);
    }
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Search tracked'
    });
    
  } catch (error) {
    console.error('Track search error:', error);
    // Don't fail the request if tracking fails
    res.status(200).json({
      status: 'success',
      message: 'Search tracking skipped'
    });
  }
});

/**
 * Get search history
 * GET /api/user-activity/search-history
 */
router.get('/search-history', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('searchHistory');
    
    if (!user || !user.searchHistory) {
      return res.status(200).json({
        status: 'success',
        data: {
          searches: []
        }
      });
    }
    
    // Get unique search queries (last 10)
    const uniqueSearches = [];
    const seenQueries = new Set();
    
    for (const search of user.searchHistory) {
      if (!seenQueries.has(search.query.toLowerCase())) {
        uniqueSearches.push(search);
        seenQueries.add(search.query.toLowerCase());
      }
      if (uniqueSearches.length >= 10) break;
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        searches: uniqueSearches
      }
    });
    
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
