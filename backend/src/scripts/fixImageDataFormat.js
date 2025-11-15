/**
 * Migration script to fix image data format in database
 * Converts images from old format (data:image/jpeg;base64,XXX stored in data field)
 * to new format (only base64 string XXX in data field)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function fixImageDataFormat() {
  try {
    console.log('🔧 Starting image data format migration...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all products with images
    const products = await Product.find({
      'images.0': { $exists: true }
    });

    console.log(`📦 Found ${products.length} products with images\n`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errorCount = 0;

    for (const product of products) {
      let productModified = false;

      for (let i = 0; i < product.images.length; i++) {
        const image = product.images[i];
        
        if (!image.data) continue;

        const dataStr = String(image.data);

        // Check if data includes the data URL prefix (old format)
        if (dataStr.startsWith('data:')) {
          console.log(`🔄 Fixing image for product: ${product.name}`);
          
          // Extract just the base64 part
          const match = dataStr.match(/^data:([^;]+);base64,(.+)$/);
          
          if (match) {
            const contentType = match[1];
            const base64Data = match[2];
            
            // Update the image
            product.images[i].data = base64Data;
            
            // Update contentType if it wasn't set correctly
            if (!product.images[i].contentType || product.images[i].contentType !== contentType) {
              product.images[i].contentType = contentType;
            }
            
            productModified = true;
            console.log(`  ✅ Fixed image ${i + 1}/${product.images.length}`);
          } else {
            console.log(`  ⚠️  Could not parse data URL for image ${i + 1}`);
            errorCount++;
          }
        } else {
          // Already in correct format
          alreadyCorrectCount++;
        }
      }

      if (productModified) {
        await product.save();
        fixedCount++;
        console.log(`  💾 Saved product: ${product.name}\n`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Products fixed: ${fixedCount}`);
    console.log(`  ✓  Images already correct: ${alreadyCorrectCount}`);
    console.log(`  ⚠️  Errors: ${errorCount}`);
    console.log('\n✅ Migration completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
fixImageDataFormat();
