const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function dropBatchNumberIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Drop the unique index on batchNumber
    try {
      await Product.collection.dropIndex('batchInfo.batchNumber_1');
      console.log('✅ Dropped unique index on batchInfo.batchNumber');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  Index does not exist, nothing to drop');
      } else {
        throw error;
      }
    }

    console.log('✅ Done! You can now add products with duplicate batch numbers.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

dropBatchNumberIndex();
