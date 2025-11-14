require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');

const migrateImages = async () => {
  try {
    console.log('🔄 Starting image migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Find all products with images
    const products = await Product.find({ 
      images: { $exists: true, $ne: [] } 
    });

    console.log(`📦 Found ${products.length} products with images`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of products) {
      try {
        let needsUpdate = false;

        for (let i = 0; i < product.images.length; i++) {
          const image = product.images[i];
          
          // Check if image is already in base64 format
          if (image.data && image.data.startsWith('data:')) {
            console.log(`⏭️  Skipping ${product.name} - already migrated`);
            skipped++;
            continue;
          }

          // Check if image has old URL format
          if (image.url) {
            const imagePath = path.join(__dirname, '../../', image.url);
            
            if (fs.existsSync(imagePath)) {
              // Read the file
              const imageBuffer = fs.readFileSync(imagePath);
              const base64Image = imageBuffer.toString('base64');
              
              // Determine content type from file extension
              const ext = path.extname(imagePath).toLowerCase();
              let contentType = 'image/jpeg';
              if (ext === '.png') contentType = 'image/png';
              else if (ext === '.gif') contentType = 'image/gif';
              else if (ext === '.webp') contentType = 'image/webp';
              
              // Update image object
              product.images[i] = {
                data: `data:${contentType};base64,${base64Image}`,
                contentType: contentType,
                filename: image.filename || path.basename(imagePath),
                alt: image.alt || product.name
              };
              
              needsUpdate = true;
              console.log(`✅ Migrated image for ${product.name}`);
            } else {
              console.log(`⚠️  Image file not found for ${product.name}: ${imagePath}`);
            }
          }
        }

        if (needsUpdate) {
          await product.save();
          migrated++;
        }
      } catch (error) {
        console.error(`❌ Error migrating ${product.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Migrated: ${migrated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('\n✨ Migration complete!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateImages();
