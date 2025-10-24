require('dotenv').config();
const mongoose = require('mongoose');

const cleanDatabase = async () => {
    try {
        console.log('🧹 Starting database cleanup...\n');

        // Connect to MongoDB
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ Connected to MongoDB\n');

        // Get all collections
        const collections = await mongoose.connection.db.collections();

        console.log(`📊 Found ${collections.length} collections:\n`);

        // Count documents in each collection
        const collectionStats = [];
        for (const col of collections) {
            const count = await col.countDocuments();
            collectionStats.push({ name: col.collectionName, count });
            console.log(`   - ${col.collectionName}: ${count} documents`);
        }
        console.log('');

        // Confirm deletion
        const args = process.argv.slice(2);
        const forceDelete = args.includes('--force') || args.includes('-f');

        if (!forceDelete) {
            console.log('⚠️  WARNING: This will permanently delete ALL data from all collections!');
            console.log('⚠️  Collections will remain but all documents will be removed.');
            console.log('⚠️  To proceed, run the script with --force flag:\n');
            console.log('   node src/scripts/cleanDatabase.js --force\n');
            await mongoose.connection.close();
            process.exit(0);
        }

        // Clear all collections
        console.log('🗑️  Clearing all data from collections...\n');

        let totalDeleted = 0;
        for (const collection of collections) {
            const result = await collection.deleteMany({});
            totalDeleted += result.deletedCount;
            console.log(`   ✓ Cleared ${collection.collectionName} (${result.deletedCount} documents deleted)`);
        }

        console.log(`\n✅ Database cleaned successfully!`);
        console.log(`📊 Total documents deleted: ${totalDeleted}`);
        console.log(`📊 All collections are now empty but still exist.\n`);

        // Close connection
        await mongoose.connection.close();
        console.log('👋 Database connection closed');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error cleaning database:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
};

// Run the script
cleanDatabase();
