//npm run seed:admin
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const adminSeeder = async () => {
    try {
        console.log('🌱 Starting admin and staff account seeder...\n');

        // Connect to MongoDB
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ Connected to MongoDB\n');

        // Admin account data
        const adminData = {
            username: 'Admin',
            email: 'crisniltrading@gmail.com',
            password: 'Admin123',
            role: 'admin',
            businessInfo: {
                business_name: 'Crisnil Trading',
                contact_person: 'System Administrator',
                phone: '+63-XXX-XXX-XXXX',
                address: 'Main Office, Philippines'
            },
            bio: 'System Administrator',
            isActive: true,
            preferences: {
                currency: 'PHP',
                timezone: 'Asia/Manila',
                taxRate: 12,
                notifications: {
                    orders: true,
                    promotions: true,
                    inventory: true,
                    system: true
                }
            }
        };

        // Staff account data
        const staffData = {
            username: 'Staff',
            email: 'staff@crisniltrading.com',
            password: 'Staff123',
            role: 'staff',
            businessInfo: {
                business_name: 'Crisnil Trading',
                contact_person: 'Staff Member',
                phone: '+63-XXX-XXX-XXXX',
                address: 'Main Office, Philippines'
            },
            bio: 'Staff Member',
            isActive: true,
            preferences: {
                currency: 'PHP',
                timezone: 'Asia/Manila',
                taxRate: 12,
                notifications: {
                    orders: true,
                    promotions: true,
                    inventory: true,
                    system: false
                }
            }
        };

        // Check if admin already exists
        const existingAdmin = await User.findOne({
            $or: [
                { email: adminData.email },
                { username: adminData.username }
            ]
        });

        if (existingAdmin) {
            console.log('⚠️  Admin account already exists');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Username: ${existingAdmin.username}`);
            console.log(`   Role: ${existingAdmin.role}\n`);
        } else {
            const admin = await User.create(adminData);
            console.log('✅ Admin account created successfully!\n');
            console.log('📋 Admin Account Details:');
            console.log(`   Email: ${admin.email}`);
            console.log(`   Username: ${admin.username}`);
            console.log(`   Password: ${adminData.password}`);
            console.log(`   Role: ${admin.role}`);
            console.log(`   Status: ${admin.isActive ? 'Active' : 'Inactive'}\n`);
        }

        // Check if staff already exists
        const existingStaff = await User.findOne({
            $or: [
                { email: staffData.email },
                { username: staffData.username }
            ]
        });

        if (existingStaff) {
            console.log('⚠️  Staff account already exists');
            console.log(`   Email: ${existingStaff.email}`);
            console.log(`   Username: ${existingStaff.username}`);
            console.log(`   Role: ${existingStaff.role}\n`);
        } else {
            const staff = await User.create(staffData);
            console.log('✅ Staff account created successfully!\n');
            console.log('📋 Staff Account Details:');
            console.log(`   Email: ${staff.email}`);
            console.log(`   Username: ${staff.username}`);
            console.log(`   Password: ${staffData.password}`);
            console.log(`   Role: ${staff.role}`);
            console.log(`   Status: ${staff.isActive ? 'Active' : 'Inactive'}\n`);
        }

        console.log('⚠️  IMPORTANT: Change these default passwords after first login!\n');
        console.log('🎉 Seeder completed!\n');

        // Close connection
        await mongoose.connection.close();
        console.log('👋 Database connection closed');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error running seeder:', error.message);

        if (error.code === 11000) {
            console.error('   Duplicate key error - admin account may already exist');
            const duplicateField = Object.keys(error.keyPattern)[0];
            console.error(`   Duplicate field: ${duplicateField}`);
        }

        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                console.error(`   ${key}: ${error.errors[key].message}`);
            });
        }

        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
};

// Run the seeder
if (require.main === module) {
    adminSeeder();
}

module.exports = adminSeeder;
