const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function checkExistingProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const products = await Product.find({});
    console.log(`📦 Total products in database: ${products.length}\n`);

    const withBatches = products.filter(p => p.batchInfo && p.batchInfo.length > 0);
    console.log(`📋 Products with batch info: ${withBatches.length}\n`);

    if (withBatches.length > 0) {
      console.log('Checking batch numbers:\n');
      withBatches.forEach(p => {
        console.log(`📦 ${p.name} (${p.batchInfo.length} batches):`);
        p.batchInfo.forEach(b => {
          if (b.batchNumber) {
            console.log(`   ✅ ${b.batchNumber} - Qty: ${b.remainingQuantity}/${b.quantity}`);
          } else {
            console.log(`   ⚠️  MISSING BATCH NUMBER - Qty: ${b.remainingQuantity}/${b.quantity}`);
          }
        });
        console.log('');
      });
    }

    const productsWithoutBatchNumbers = withBatches.filter(p => 
      p.batchInfo.some(b => !b.batchNumber)
    );

    if (productsWithoutBatchNumbers.length > 0) {
      console.log(`\n⚠️  WARNING: ${productsWithoutBatchNumbers.length} products have batches without batch numbers!`);
      console.log('These need to be migrated. Run: node backend/src/scripts/migrateBatchNumbers.js\n');
    } else {
      console.log('✅ All batches have batch numbers. No migration needed!\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkExistingProducts();
