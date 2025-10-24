const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createDemoUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if demo users already exist
    const existingAdmin = await User.findOne({ username: 'admin' });
    const existingClient = await User.findOne({ username: 'demo' });

    if (!existingAdmin) {
      // Create admin user
      const adminUser = await User.create({
        username: 'admin',
        email: 'admin@crisnil.com',
        password: 'admin123',
        role: 'admin',
        businessInfo: {
          business_name: 'Crisnil Trading Admin',
          contact_person: 'Administrator',
          phone: '+63 917 123 4567',
          address: 'Manila, Philippines'
        }
      });
      console.log('✅ Admin user created:', adminUser.username);
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create demo client user
    const clientExists = await User.findOne({ username: 'demo' });
    if (!clientExists) {
      const clientUser = await User.create({
        username: 'demo',
        email: 'demo@example.com',
        password: 'demo123',
        role: 'client',
        businessInfo: {
          business_name: 'Demo Restaurant',
          contact_person: 'Demo User',
          phone: '+63-912-345-6789',
          address: '123 Demo Street, Demo City, Philippines'
        }
      });
      console.log('✅ Demo client user created:', clientUser.username);
    } else {
      console.log('ℹ️  Demo client user already exists');
    }

    // Create additional client user
    const clientExists2 = await User.findOne({ username: 'client' });
    if (!clientExists2) {
      const clientUser2 = await User.create({
        username: 'client',
        email: 'client@example.com',
        password: 'client123',
        role: 'client',
        businessInfo: {
          business_name: 'Client Business',
          contact_person: 'Client User',
          phone: '+63-912-345-6788',
          address: '456 Client Street, Client City, Philippines'
        }
      });
      console.log('✅ Additional client user created:', clientUser2.username);
    } else {
      console.log('ℹ️  Additional client user already exists');
    }

    console.log('\n🎉 Demo users setup complete!');
    console.log('Login credentials:');
    console.log('Admin: username=admin, password=admin123');
    console.log('Client: username=client, password=client123');
    console.log('Client: username=demo, password=demo123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating demo users:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  createDemoUser();
}

module.exports = createDemoUser;
