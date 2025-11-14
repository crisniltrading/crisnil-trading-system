const { Reward, RewardClaim } = require('../models/Reward');
const User = require('../models/User');

// Get all available rewards
exports.getAvailableRewards = async (req, res) => {
  try {
    // Only clients can view available rewards
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can view available rewards. Use admin endpoints for management.'
      });
    }
    
    const rewards = await Reward.find({ isActive: true }).sort({ pointsRequired: 1 });
    
    // Get user's current points
    const user = await User.findById(req.user.id).select('loyaltyPoints');
    const userPoints = user?.loyaltyPoints || 0;
    
    // Get user's claim history for each reward
    const claimCounts = await RewardClaim.aggregate([
      {
        $match: {
          user: req.user._id,
          status: { $in: ['active', 'used'] }
        }
      },
      {
        $group: {
          _id: '$reward',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const claimMap = new Map(claimCounts.map(c => [c._id.toString(), c.count]));
    
    // Add eligibility info to each reward
    const rewardsWithEligibility = rewards.map(reward => {
      const claimed = claimMap.get(reward._id.toString()) || 0;
      const canClaim = userPoints >= reward.pointsRequired &&
                      (reward.maxRedemptions === null || claimed < reward.maxRedemptions);
      
      return {
        ...reward.toObject(),
        canClaim,
        timesClaimed: claimed,
        pointsNeeded: Math.max(0, reward.pointsRequired - userPoints)
      };
    });
    
    res.json({
      success: true,
      userPoints,
      rewards: rewardsWithEligibility
    });
  } catch (error) {
    console.error('Get rewards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rewards'
    });
  }
};

// Claim a reward
exports.claimReward = async (req, res) => {
  try {
    const { rewardId } = req.body;
    
    // Only clients can claim rewards
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can claim rewards. Admins and staff cannot claim rewards.'
      });
    }
    
    const reward = await Reward.findById(rewardId);
    if (!reward || !reward.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found or inactive'
      });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user has enough points
    if (user.loyaltyPoints < reward.pointsRequired) {
      return res.status(400).json({
        success: false,
        message: `Insufficient points. You need ${reward.pointsRequired} points but have ${user.loyaltyPoints}`
      });
    }
    
    // Check max redemptions
    if (reward.maxRedemptions !== null) {
      const claimCount = await RewardClaim.countDocuments({
        user: user._id,
        reward: reward._id,
        status: { $in: ['active', 'used'] }
      });
      
      if (claimCount >= reward.maxRedemptions) {
        return res.status(400).json({
          success: false,
          message: 'You have reached the maximum redemptions for this reward'
        });
      }
    }
    
    // Deduct points
    user.loyaltyPoints -= reward.pointsRequired;
    await user.save();
    
    // Create reward claim
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + reward.expiryDays);
    
    const claim = await RewardClaim.create({
      user: user._id,
      reward: reward._id,
      pointsSpent: reward.pointsRequired,
      expiresAt
    });
    
    // Update total claimed count
    reward.totalClaimed += 1;
    await reward.save();
    
    const populatedClaim = await RewardClaim.findById(claim._id).populate('reward');
    
    res.json({
      success: true,
      message: 'Reward claimed successfully!',
      claim: populatedClaim,
      remainingPoints: user.loyaltyPoints
    });
  } catch (error) {
    console.error('Claim reward error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim reward'
    });
  }
};

// Get user's claimed rewards
exports.getUserClaims = async (req, res) => {
  try {
    const claims = await RewardClaim.find({ user: req.user.id })
      .populate('reward')
      .sort({ claimedAt: -1 });
    
    res.json({
      success: true,
      claims
    });
  } catch (error) {
    console.error('Get user claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch claimed rewards'
    });
  }
};

// Admin: Get all rewards
exports.getAllRewards = async (req, res) => {
  try {
    const rewards = await Reward.find().sort({ pointsRequired: 1 });
    
    res.json({
      success: true,
      rewards
    });
  } catch (error) {
    console.error('Get all rewards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rewards'
    });
  }
};

// Admin: Create reward
exports.createReward = async (req, res) => {
  try {
    const reward = await Reward.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Reward created successfully',
      reward
    });
  } catch (error) {
    console.error('Create reward error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reward'
    });
  }
};

// Admin: Update reward
exports.updateReward = async (req, res) => {
  try {
    const reward = await Reward.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Reward updated successfully',
      reward
    });
  } catch (error) {
    console.error('Update reward error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reward'
    });
  }
};

// Admin: Delete reward
exports.deleteReward = async (req, res) => {
  try {
    const reward = await Reward.findByIdAndDelete(req.params.id);
    
    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Reward deleted successfully'
    });
  } catch (error) {
    console.error('Delete reward error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete reward'
    });
  }
};

// Admin: Get all claims with user info
exports.getAllClaims = async (req, res) => {
  try {
    const { status, userId } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (userId) query.user = userId;
    
    const claims = await RewardClaim.find(query)
      .populate({
        path: 'user',
        match: { role: 'client' }, // Only show claims from clients
        select: 'username email loyaltyPoints'
      })
      .populate('reward')
      .sort({ claimedAt: -1 });
    
    // Filter out claims where user is null (non-client users)
    const filteredClaims = claims.filter(claim => claim.user !== null);
    
    res.json({
      success: true,
      claims: filteredClaims
    });
  } catch (error) {
    console.error('Get all claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch claims'
    });
  }
};

// Admin: Get loyalty statistics
exports.getLoyaltyStats = async (req, res) => {
  try {
    // Only count client users for loyalty statistics
    const totalUsers = await User.countDocuments({ role: 'client' });
    const usersWithPoints = await User.countDocuments({ 
      role: 'client',
      loyaltyPoints: { $gt: 0 } 
    });
    
    const totalPointsDistributed = await User.aggregate([
      { $match: { role: 'client' } },
      { $group: { _id: null, total: { $sum: '$loyaltyPoints' } } }
    ]);
    
    const totalClaims = await RewardClaim.countDocuments();
    const activeClaims = await RewardClaim.countDocuments({ status: 'active' });
    const usedClaims = await RewardClaim.countDocuments({ status: 'used' });
    
    const topUsers = await User.find({ role: 'client' })
      .select('username email loyaltyPoints')
      .sort({ loyaltyPoints: -1 })
      .limit(10);
    
    const rewardStats = await RewardClaim.aggregate([
      {
        $group: {
          _id: '$reward',
          totalClaims: { $sum: 1 },
          totalPointsSpent: { $sum: '$pointsSpent' }
        }
      },
      {
        $lookup: {
          from: 'rewards',
          localField: '_id',
          foreignField: '_id',
          as: 'rewardInfo'
        }
      },
      {
        $unwind: '$rewardInfo'
      },
      {
        $sort: { totalClaims: -1 }
      }
    ]);
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        usersWithPoints,
        totalPointsDistributed: totalPointsDistributed[0]?.total || 0,
        totalClaims,
        activeClaims,
        usedClaims,
        topUsers,
        rewardStats
      }
    });
  } catch (error) {
    console.error('Get loyalty stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loyalty statistics'
    });
  }
};

// Admin: Manually add/remove points
exports.adjustUserPoints = async (req, res) => {
  try {
    const { userId, points, reason } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Only allow adjusting points for client users
    if (user.role !== 'client') {
      return res.status(400).json({
        success: false,
        message: 'Can only adjust points for client users. Admins and staff do not participate in the loyalty program.'
      });
    }
    
    const oldPoints = user.loyaltyPoints;
    user.loyaltyPoints = Math.max(0, user.loyaltyPoints + points);
    await user.save();
    
    res.json({
      success: true,
      message: `Points ${points > 0 ? 'added' : 'removed'} successfully`,
      user: {
        id: user._id,
        username: user.username,
        oldPoints,
        newPoints: user.loyaltyPoints,
        adjustment: points
      }
    });
  } catch (error) {
    console.error('Adjust user points error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust points'
    });
  }
};
