/**
 * Image Cleanup Script
 * Removes unused product images from the uploads directory
 * 
 * Usage: node src/scripts/cleanupImages.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crisnil-trading');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

/**
 * Get all image filenames currently in use by products
 * Only counts file-based images (not base64)
 */
async function getUsedImages() {
  const products = await Product.find().select('images');
  const usedImages = new Set();
  let base64Count = 0;
  let fileCount = 0;
  
  products.forEach(product => {
    if (product.images && product.images.length > 0) {
      product.images.forEach(img => {
        if (img.url) {
          // Check if it's a base64 image (stored in database)
          if (img.url.startsWith('data:')) {
            base64Count++;
            // Skip base64 images - they're not files
            return;
          }
          
          // Extract filename from file path
          // URL format: /uploads/products/product-123456.jpg
          const filename = path.basename(img.url);
          usedImages.add(filename);
          fileCount++;
        }
      });
    }
  });
  
  console.log(`📊 Found ${products.length} products with images:`);
  console.log(`   - ${fileCount} file-based images (on disk)`);
  console.log(`   - ${base64Count} base64 images (in database)`);
  console.log(`   - ${usedImages.size} unique files in use`);
  
  return usedImages;
}

/**
 * Get all image files in the uploads directory
 */
function getUploadedFiles() {
  const uploadsDir = path.join(__dirname, '../../uploads/products');
  
  // Check if directory exists
  if (!fs.existsSync(uploadsDir)) {
    console.log('⚠️  Uploads directory does not exist:', uploadsDir);
    return [];
  }
  
  const files = fs.readdirSync(uploadsDir);
  console.log(`📁 Found ${files.length} files in uploads directory`);
  return files;
}

/**
 * Delete unused image files
 */
function deleteUnusedFiles(uploadedFiles, usedImages, dryRun = true) {
  const uploadsDir = path.join(__dirname, '../../uploads/products');
  let deletedCount = 0;
  let totalSize = 0;
  
  uploadedFiles.forEach(file => {
    if (!usedImages.has(file)) {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
      
      if (dryRun) {
        console.log(`🗑️  Would delete: ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      } else {
        try {
          fs.unlinkSync(filePath);
          console.log(`✅ Deleted: ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
          deletedCount++;
        } catch (error) {
          console.error(`❌ Failed to delete ${file}:`, error.message);
        }
      }
    }
  });
  
  return { deletedCount: dryRun ? uploadedFiles.length - usedImages.size : deletedCount, totalSize };
}

/**
 * Main cleanup function
 */
async function cleanupImages(dryRun = true) {
  console.log('\n🧹 Starting image cleanup...\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be deleted\n');
  } else {
    console.log('⚠️  LIVE MODE - Files will be permanently deleted!\n');
  }
  
  try {
    // Connect to database
    await connectDB();
    
    // Get used images from database
    const usedImages = await getUsedImages();
    
    // Get uploaded files
    const uploadedFiles = getUploadedFiles();
    
    if (uploadedFiles.length === 0) {
      console.log('\n✅ No files to clean up');
      return;
    }
    
    // Find and delete unused files
    const { deletedCount, totalSize } = deleteUnusedFiles(uploadedFiles, usedImages, dryRun);
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total files in uploads: ${uploadedFiles.length}`);
    console.log(`Files in use: ${usedImages.size}`);
    console.log(`Unused files: ${deletedCount}`);
    console.log(`Space ${dryRun ? 'to be freed' : 'freed'}: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('='.repeat(50));
    
    if (dryRun) {
      console.log('\n💡 To actually delete files, run:');
      console.log('   node src/scripts/cleanupImages.js --delete');
    } else {
      console.log('\n✅ Cleanup complete!');
    }
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--delete');

// Run cleanup
cleanupImages(dryRun)
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
