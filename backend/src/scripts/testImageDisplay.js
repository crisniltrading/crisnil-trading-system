/**
 * Test script to verify image data format
 * This script checks if images are stored correctly in the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function testImageDisplay() {
  try {
    console.log('🧪 Testing image data format...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find products with images
    const products = await Product.find({
      'images.0': { $exists: true }
    }).limit(5);

    if (products.length === 0) {
      console.log('⚠️  No products with images found in database');
      process.exit(0);
    }

    console.log(`📦 Testing ${products.length} products:\n`);

    let correctFormat = 0;
    let oldFormat = 0;
    let invalidFormat = 0;

    for (const product of products) {
      console.log(`\n📦 Product: ${product.name}`);
      console.log(`   Images: ${product.images.length}`);

      for (let i = 0; i < product.images.length; i++) {
        const image = product.images[i];
        
        if (!image.data) {
          console.log(`   ⚠️  Image ${i + 1}: No data field`);
          invalidFormat++;
          continue;
        }

        const dataStr = String(image.data);
        const preview = dataStr.substring(0, 50);

        if (dataStr.startsWith('data:')) {
          console.log(`   ⚠️  Image ${i + 1}: OLD FORMAT (has data URL prefix)`);
          console.log(`      Preview: ${preview}...`);
          console.log(`      ContentType: ${image.contentType}`);
          oldFormat++;
        } else if (/^[A-Za-z0-9+/=]+$/.test(dataStr.substring(0, 100))) {
          console.log(`   ✅ Image ${i + 1}: CORRECT FORMAT (base64 only)`);
          console.log(`      Preview: ${preview}...`);
          console.log(`      ContentType: ${image.contentType}`);
          console.log(`      Length: ${dataStr.length} characters`);
          correctFormat++;
        } else {
          console.log(`   ❌ Image ${i + 1}: INVALID FORMAT`);
          console.log(`      Preview: ${preview}...`);
          invalidFormat++;
        }
      }
    }

    console.log('\n\n📊 Summary:');
    console.log(`   ✅ Correct format: ${correctFormat}`);
    console.log(`   ⚠️  Old format (needs migration): ${oldFormat}`);
    console.log(`   ❌ Invalid format: ${invalidFormat}`);

    if (oldFormat > 0) {
      console.log('\n💡 Recommendation: Run migration script to fix old format images');
      console.log('   Command: npm run migrate:fix-images');
    } else if (correctFormat > 0 && invalidFormat === 0) {
      console.log('\n🎉 All images are in correct format!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testImageDisplay();
