//npm run seed:clean
require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { InventoryLog, StockAlert } = require('../models/Inventory');
const Promotion = require('../models/Promotion');
const Review = require('../models/Review');
const AuditLog = require('../models/AuditLog');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Promisify readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const cleanDataSeeder = async () => {
    try {
        console.log('🧹 Starting selective database cleanup...\n');

        // Connect to MongoDB
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ Connected to MongoDB\n');

        // Define available collections
        const collections = [
            { key: '1', name: 'Users', model: User, label: 'users' },
            { key: '2', name: 'Products', model: Product, label: 'products' },
            { key: '3', name: 'Orders', model: Order, label: 'orders' },
            { key: '4', name: 'Inventory Logs', model: InventoryLog, label: 'inventoryLogs' },
            { key: '5', name: 'Stock Alerts', model: StockAlert, label: 'stockAlerts' },
            { key: '6', name: 'Promotions', model: Promotion, label: 'promotions' },
            { key: '7', name: 'Reviews', model: Review, label: 'reviews' },
            { key: '8', name: 'Audit Logs', model: AuditLog, label: 'auditLogs' }
        ];

        // Count documents before cleanup
        const beforeCounts = {};
        for (const collection of collections) {
            beforeCounts[collection.label] = await collection.model.countDocuments();
        }

        console.log('📊 Current document counts:');
        collections.forEach(col => {
            console.log(`   [${col.key}] ${col.name}: ${beforeCounts[col.label]}`);
        });
        console.log('   [9] Clean ALL collections');
        console.log('   [0] Exit without cleaning\n');

        const totalDocuments = Object.values(beforeCounts).reduce((sum, count) => sum + count, 0);

        if (totalDocuments === 0) {
            console.log('ℹ️  Database is already empty. No data to clean.\n');
            rl.close();
            await mongoose.connection.close();
            process.exit(0);
        }

        // Get user selection
        const selection = await question('Enter your choice (e.g., 1,2,3 or 9 for all): ');

        if (selection.trim() === '0') {
            console.log('\n❌ Cleanup cancelled by user.\n');
            rl.close();
            await mongoose.connection.close();
            process.exit(0);
        }

        let selectedCollections = [];

        if (selection.trim() === '9') {
            selectedCollections = collections;
            console.log('\n⚠️  WARNING: This will delete ALL data from ALL collections!');
        } else {
            const choices = selection.split(',').map(s => s.trim());
            selectedCollections = collections.filter(col => choices.includes(col.key));

            if (selectedCollections.length === 0) {
                console.log('\n❌ Invalid selection. No collections selected.\n');
                rl.close();
                await mongoose.connection.close();
                process.exit(0);
            }

            console.log('\n⚠️  WARNING: This will delete data from the following collections:');
            selectedCollections.forEach(col => {
                console.log(`   - ${col.name} (${beforeCounts[col.label]} documents)`);
            });
        }

        // Confirm deletion
        const confirm = await question('\nType "yes" to confirm deletion: ');

        if (confirm.toLowerCase() !== 'yes') {
            console.log('\n❌ Cleanup cancelled by user.\n');
            rl.close();
            await mongoose.connection.close();
            process.exit(0);
        }

        // Delete selected collections
        console.log('\n🗑️  Deleting data...\n');

        const deletionResults = {};
        for (const collection of selectedCollections) {
            const result = await collection.model.deleteMany({});
            deletionResults[collection.label] = result.deletedCount;
            console.log(`   ✓ ${collection.name}: ${result.deletedCount} documents deleted`);
        }

        console.log('\n✅ Data cleanup completed!\n');

        // Verify cleanup
        console.log('📊 Verification - Current document counts:');
        for (const collection of collections) {
            const count = await collection.model.countDocuments();
            console.log(`   ${collection.name}: ${count}`);
        }

        console.log('\n🎉 Database cleanup completed successfully!');
        console.log('💡 Collections are preserved, only selected data has been removed.\n');

        // Close readline and connection
        rl.close();
        await mongoose.connection.close();
        console.log('👋 Database connection closed');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error during cleanup:', error.message);

        if (error.stack) {
            console.error('\nStack trace:', error.stack);
        }

        rl.close();
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
};

// Run the seeder
if (require.main === module) {
    cleanDataSeeder();
}

module.exports = cleanDataSeeder;
