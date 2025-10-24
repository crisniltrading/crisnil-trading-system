const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Profile picture routes
router.post('/profile/picture', userController.uploadProfilePicture);
router.delete('/profile/picture', userController.deleteProfilePicture);

// Loyalty points routes
router.get('/loyalty-points', userController.getLoyaltyPoints);
router.post('/loyalty-points/add', userController.addLoyaltyPoints);
router.post('/loyalty-points/redeem', userController.redeemLoyaltyPoints);

// Cart routes
router.get('/cart', userController.getCart);
router.post('/cart', userController.addToCart);
router.put('/cart', userController.updateCartItem);
router.delete('/cart/:productId', userController.removeFromCart);
router.delete('/cart', userController.clearCart);

// Wishlist routes
router.get('/wishlist', userController.getWishlist);
router.post('/wishlist', userController.addToWishlist);
router.delete('/wishlist/:productId', userController.removeFromWishlist);

// Preferences routes
router.get('/preferences', userController.getPreferences);
router.put('/preferences', userController.updatePreferences);

module.exports = router;
