require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdminAndStaff = async () => {
    try {
        console.log('👤 Starting admin and staff account creation...\n');

        // Connect to MongoDB
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ Connected to MongoDB\n');

        // Default admin account
        const adminData = {
            username: 'admin',
            email: 'admin@crisniltrading.com',
            password: 'Admin@123',
            role: 'admin',
            businessInfo: {
                business_name: 'Crisnil Trading',
                contact_person: 'Administrator',
                phone: '+63-XXX-XXX-XXXX',
                address: 'Main Office'
            },
            isActive: true
        };

        // Default staff account
        const staffData = {
            username: 'staff',
            email: 'staff@crisniltrading.com',
            password: 'Staff@123',
            role: 'staff',
            businessInfo: {
                business_name: 'Crisnil Trading',
                contact_person: 'Staff Member',
                phone: '+63-XXX-XXX-XXXX',
                address: 'Main Office'
            },
            isActive: true
        };

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('⚠️  Admin account already exists');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Username: ${existingAdmin.username}\n`);
        } else {
            const admin = await User.create(adminData);
            console.log('✅ Admin account created successfully!');
            console.log(`   Email: ${admin.email}`);
            console.log(`   Username: ${admin.username}`);
            console.log(`   Password: ${adminData.password}`);
            console.log(`   Role: ${admin.role}\n`);
        }

        // Check if staff already exists
        const existingStaff = await User.findOne({ email: staffData.email });
        if (existingStaff) {
            console.log('⚠️  Staff account already exists');
            console.log(`   Email: ${existingStaff.email}`);
            console.log(`   Username: ${existingStaff.username}\n`);
        } else {
            const staff = await User.create(staffData);
            console.log('✅ Staff account created successfully!');
            console.log(`   Email: ${staff.email}`);
            console.log(`   Username: ${staff.username}`);
            console.log(`   Password: ${staffData.password}`);
            console.log(`   Role: ${staff.role}\n`);
        }

        console.log('🎉 Account creation completed!\n');
        console.log('⚠️  IMPORTANT: Change these default passwords after first login!\n');

        // Close connection
        await mongoose.connection.close();
        console.log('👋 Database connection closed');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error creating accounts:', error.message);
        if (error.code === 11000) {
            console.error('   Duplicate key error - accounts may already exist');
        }
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
};

// Run the script
createAdminAndStaff();
