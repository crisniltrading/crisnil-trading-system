const Product = require('../models/Product');

/**
 * Generate a unique batch number
 * Format: BATCH-YYYYMMDD-XXXXX (where XXXXX is a sequential number)
 */
async function generateUniqueBatchNumber() {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  // Find the highest batch number for today
  const todayPattern = new RegExp(`^BATCH-${date}-`);
  const products = await Product.find({
    'batchInfo.batchNumber': todayPattern
  }).select('batchInfo.batchNumber');
  
  let maxCounter = 0;
  products.forEach(product => {
    if (product.batchInfo) {
      product.batchInfo.forEach(batch => {
        if (batch.batchNumber && batch.batchNumber.startsWith(`BATCH-${date}-`)) {
          const parts = batch.batchNumber.split('-');
          const num = parseInt(parts[2]);
          if (num > maxCounter) {
            maxCounter = num;
          }
        }
      });
    }
  });
  
  const batchNumber = `BATCH-${date}-${String(maxCounter + 1).padStart(5, '0')}`;
  return batchNumber;
}

/**
 * Generate multiple unique batch numbers
 */
async function generateMultipleBatchNumbers(count) {
  const batchNumbers = [];
  for (let i = 0; i < count; i++) {
    const batchNumber = await generateUniqueBatchNumber();
    batchNumbers.push(batchNumber);
  }
  return batchNumbers;
}

module.exports = {
  generateUniqueBatchNumber,
  generateMultipleBatchNumbers
};
