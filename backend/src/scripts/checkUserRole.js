require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const checkUserRole = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const identifier = process.argv[2];

    if (!identifier) {
      // Show all users if no identifier provided
      const users = await User.find({}).select('username email role isActive');
      console.log('📋 All Users:\n');
      users.forEach(user => {
        console.log(`  ${user.role.toUpperCase().padEnd(8)} | ${user.username.padEnd(20)} | ${user.email.padEnd(30)} | Active: ${user.isActive}`);
      });
    } else {
      // Show specific user
      const user = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ]
      });

      if (!user) {
        console.log(`❌ User not found: ${identifier}`);
      } else {
        console.log('👤 User Details:\n');
        console.log(`  Username: ${user.username}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Active: ${user.isActive}`);
        console.log(`  Created: ${user.createdAt}`);
        console.log(`  Last Login: ${user.lastLogin || 'Never'}`);
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkUserRole();
