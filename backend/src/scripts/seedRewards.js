require('dotenv').config();
const mongoose = require('mongoose');
const { Reward } = require('../models/Reward');

const defaultRewards = [
  {
    name: '₱50 OFF',
    description: 'Get ₱50 discount on your next order',
    pointsRequired: 500,
    rewardType: 'discount',
    rewardValue: 50,
    icon: 'ticket',
    expiryDays: 30,
    maxRedemptions: null
  },
  {
    name: '₱100 OFF',
    description: 'Get ₱100 discount on your next order',
    pointsRequired: 1000,
    rewardType: 'discount',
    rewardValue: 100,
    icon: 'gift',
    expiryDays: 30,
    maxRedemptions: null
  },
  {
    name: '₱200 OFF',
    description: 'Get ₱200 discount on your next order',
    pointsRequired: 2000,
    rewardType: 'discount',
    rewardValue: 200,
    icon: 'star',
    expiryDays: 30,
    maxRedemptions: null
  },
  {
    name: 'Free Delivery',
    description: 'Get free delivery on your next order',
    pointsRequired: 300,
    rewardType: 'free_delivery',
    rewardValue: 0,
    icon: 'truck',
    expiryDays: 15,
    maxRedemptions: null
  },
  {
    name: '₱500 OFF',
    description: 'Get ₱500 discount on orders above ₱5000',
    pointsRequired: 5000,
    rewardType: 'discount',
    rewardValue: 500,
    icon: 'trophy',
    expiryDays: 60,
    maxRedemptions: 2
  }
];

const seedRewards = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing rewards
    const existingCount = await Reward.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing rewards`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('Do you want to clear existing rewards? (yes/no): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() === 'yes') {
        await Reward.deleteMany({});
        console.log('🗑️  Cleared existing rewards\n');
      } else {
        console.log('⏭️  Skipping clear, adding new rewards\n');
      }
    }

    // Insert rewards
    const rewards = await Reward.insertMany(defaultRewards);
    console.log(`✅ Created ${rewards.length} rewards:\n`);
    
    rewards.forEach(reward => {
      console.log(`  🎁 ${reward.name}`);
      console.log(`     Points: ${reward.pointsRequired}`);
      console.log(`     Type: ${reward.rewardType}`);
      console.log(`     Value: ₱${reward.rewardValue}`);
      console.log('');
    });

    await mongoose.connection.close();
    console.log('👋 Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedRewards();
