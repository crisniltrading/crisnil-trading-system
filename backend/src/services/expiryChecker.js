const Product = require('../models/Product');
const cron = require('node-cron');

class ExpiryChecker {
  constructor() {
    this.isRunning = false;
  }

  // Check all batches for expiry
  async checkExpiredBatches() {
    try {
      console.log('🔍 Checking for expired batches...');
      
      const products = await Product.find({
        isActive: true,
        'batchInfo.expiryDate': { $exists: true, $ne: null }
      });

      let expiredCount = 0;
      let expiringCount = 0;
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      for (const product of products) {
        let hasChanges = false;

        for (const batch of product.batchInfo) {
          if (!batch.expiryDate) continue;

          const expiryDate = new Date(batch.expiryDate);
          
          // Mark as expired if past expiry date
          if (expiryDate < now && batch.status !== 'expired') {
            batch.status = 'expired';
            hasChanges = true;
            expiredCount++;
            console.log(`  ⚠️  Expired: ${product.name} - ${batch.batchNumber}`);
          }
          
          // Count expiring soon (within 7 days)
          if (expiryDate > now && expiryDate <= sevenDaysFromNow && batch.status === 'active') {
            expiringCount++;
          }
        }

        if (hasChanges) {
          await product.save();
        }
      }

      console.log(`✅ Expiry check complete:`);
      console.log(`   - ${expiredCount} batches marked as expired`);
      console.log(`   - ${expiringCount} batches expiring within 7 days`);

      return {
        expiredCount,
        expiringCount,
        checkedAt: new Date()
      };
    } catch (error) {
      console.error('❌ Error checking expired batches:', error);
      throw error;
    }
  }

  // Get expiring batches report
  async getExpiringBatchesReport() {
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const products = await Product.find({
        isActive: true,
        'batchInfo.expiryDate': { $exists: true, $ne: null }
      }).select('name category batchInfo stock unit');

      const report = {
        expired: [],
        critical: [], // Expiring within 7 days
        warning: [],  // Expiring within 30 days
        summary: {
          totalExpired: 0,
          totalCritical: 0,
          totalWarning: 0,
          totalValue: 0
        }
      };

      for (const product of products) {
        for (const batch of product.batchInfo) {
          if (!batch.expiryDate) continue;

          const expiryDate = new Date(batch.expiryDate);
          const daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

          const batchInfo = {
            productId: product._id,
            productName: product.name,
            category: product.category,
            batchNumber: batch.batchNumber,
            quantity: batch.remainingQuantity || batch.quantity,
            unit: product.unit,
            expiryDate: batch.expiryDate,
            daysToExpiry,
            status: batch.status,
            receivedDate: batch.receivedDate
          };

          if (expiryDate < now) {
            report.expired.push(batchInfo);
            report.summary.totalExpired++;
          } else if (expiryDate <= sevenDaysFromNow) {
            report.critical.push(batchInfo);
            report.summary.totalCritical++;
          } else if (expiryDate <= thirtyDaysFromNow) {
            report.warning.push(batchInfo);
            report.summary.totalWarning++;
          }
        }
      }

      // Sort by expiry date (soonest first)
      report.expired.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
      report.critical.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
      report.warning.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

      return report;
    } catch (error) {
      console.error('Error generating expiring batches report:', error);
      throw error;
    }
  }

  // Start automated checking (runs daily at midnight)
  startAutomatedChecking() {
    if (this.isRunning) {
      console.log('⚠️  Expiry checker is already running');
      return;
    }

    // Run every day at midnight
    this.cronJob = cron.schedule('0 0 * * *', async () => {
      console.log('⏰ Running scheduled expiry check...');
      await this.checkExpiredBatches();
    });

    // Also run immediately on startup
    this.checkExpiredBatches();

    this.isRunning = true;
    console.log('✅ Automated expiry checker started (runs daily at midnight)');
  }

  // Stop automated checking
  stopAutomatedChecking() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('🛑 Automated expiry checker stopped');
    }
  }

  // Manual check (can be triggered via API)
  async manualCheck() {
    console.log('🔄 Manual expiry check triggered...');
    return await this.checkExpiredBatches();
  }
}

// Singleton instance
const expiryChecker = new ExpiryChecker();

module.exports = expiryChecker;
