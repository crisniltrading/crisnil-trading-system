const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function rebuildBatchIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🔍 Checking for duplicate batch numbers...\n');

    // Find all products with batch info
    const products = await Product.find({
      'batchInfo.0': { $exists: true }
    });

    const batchNumbers = new Map();
    const duplicates = [];

    products.forEach(product => {
      product.batchInfo.forEach(batch => {
        if (batch.batchNumber) {
          if (batchNumbers.has(batch.batchNumber)) {
            duplicates.push({
              batchNumber: batch.batchNumber,
              products: [batchNumbers.get(batch.batchNumber), product.name]
            });
          } else {
            batchNumbers.set(batch.batchNumber, product.name);
          }
        }
      });
    });

    if (duplicates.length > 0) {
      console.log('⚠️  WARNING: Found duplicate batch numbers:');
      duplicates.forEach(dup => {
        console.log(`   - ${dup.batchNumber} used in: ${dup.products.join(', ')}`);
      });
      console.log('\n❌ Cannot rebuild index with duplicates. Please fix duplicates first.\n');
      process.exit(1);
    }

    console.log('✅ No duplicates found!\n');

    // Check existing indexes
    const indexes = await Product.collection.indexes();
    console.log('📋 Current indexes:');
    indexes.forEach(idx => {
      if (idx.name.includes('batchInfo')) {
        console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}, unique: ${idx.unique || false}`);
      }
    });
    console.log('');

    // Check if unique index exists
    const hasUniqueIndex = indexes.some(idx => 
      idx.key['batchInfo.batchNumber'] && idx.unique === true
    );

    if (hasUniqueIndex) {
      console.log('✅ Unique index already exists on batchInfo.batchNumber\n');
    } else {
      console.log('⚠️  Unique index does not exist. Creating...\n');
      
      // Drop non-unique index if exists
      try {
        await Product.collection.dropIndex('batchInfo.batchNumber_1');
        console.log('✅ Dropped old non-unique index\n');
      } catch (error) {
        if (error.code !== 27) {
          console.log('ℹ️  No old index to drop\n');
        }
      }

      // Create unique index
      await Product.collection.createIndex(
        { 'batchInfo.batchNumber': 1 },
        { unique: true, sparse: true }
      );
      console.log('✅ Created new unique index on batchInfo.batchNumber\n');
    }

    console.log('✅ Index rebuild completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

rebuildBatchIndex();
