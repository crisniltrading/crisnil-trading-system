const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { generateUniqueBatchNumber } = require('../utils/batchGenerator');

async function migrateBatchNumbers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const products = await Product.find({});
    console.log(`📦 Checking ${products.length} products...\n`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      if (!product.batchInfo || product.batchInfo.length === 0) {
        skippedCount++;
        continue;
      }

      let needsUpdate = false;
      
      for (const batch of product.batchInfo) {
        if (!batch.batchNumber) {
          // Generate a new batch number
          const newBatchNumber = await generateUniqueBatchNumber();
          batch.batchNumber = newBatchNumber;
          needsUpdate = true;
          console.log(`✅ Generated batch number for ${product.name}: ${newBatchNumber}`);
        }
      }

      if (needsUpdate) {
        await product.save();
        migratedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount} products`);
    console.log(`   ⏭️  Skipped: ${skippedCount} products (already have batch numbers)`);
    console.log('\n✅ Migration completed successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateBatchNumbers();
