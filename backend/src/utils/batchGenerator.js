const Product = require('../models/Product');

/**
 * Generate a unique batch number
 * Format: BATCH-YYYYMMDD-XXXXX (where XXXXX is a sequential number)
 */
async function generateUniqueBatchNumber() {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  let counter = 1;
  let batchNumber;
  let isUnique = false;

  while (!isUnique) {
    batchNumber = `BATCH-${date}-${String(counter).padStart(5, '0')}`;
    
    // Check if this batch number exists in any product
    const existingBatch = await Product.findOne({
      'batchInfo.batchNumber': batchNumber
    });
    
    if (!existingBatch) {
      isUnique = true;
    } else {
      counter++;
    }
  }

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
