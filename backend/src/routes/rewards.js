const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');
const { protect, restrictTo } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Client routes
router.get('/available', rewardController.getAvailableRewards);
router.post('/claim', rewardController.claimReward);
router.get('/my-claims', rewardController.getUserClaims);

// Admin/Staff routes
router.get('/admin/all', restrictTo('admin', 'staff'), rewardController.getAllRewards);
router.post('/admin/create', restrictTo('admin', 'staff'), rewardController.createReward);
router.put('/admin/:id', restrictTo('admin', 'staff'), rewardController.updateReward);
router.delete('/admin/:id', restrictTo('admin', 'staff'), rewardController.deleteReward);

router.get('/admin/claims', restrictTo('admin', 'staff'), rewardController.getAllClaims);
router.get('/admin/stats', restrictTo('admin', 'staff'), rewardController.getLoyaltyStats);
router.post('/admin/adjust-points', restrictTo('admin', 'staff'), rewardController.adjustUserPoints);

module.exports = router;
