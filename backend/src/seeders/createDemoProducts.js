const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cris-system', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: { type: String, required: true, enum: ['chicken', 'beef', 'pork', 'seafood', 'vegetables', 'dairy', 'other'] },
  price: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, enum: ['kg', 'g', 'lbs', 'piece', 'pack', 'box'], default: 'kg' },
  stock: { type: Number, required: true, min: 0, default: 0 },
  minStock: { type: Number, required: true, min: 0, default: 10 },
  maxStock: { type: Number, min: 0, default: 1000 },
  supplier: {
    name: String,
    contact: String,
    country: String
  },
  storage: {
    temperature: { type: Number, default: -18 },
    location: String,
    shelfLife: { type: Number, default: 365 }
  },
  batchInfo: [{
    batchNumber: String,
    expiryDate: Date,
    quantity: Number,
    receivedDate: { type: Date, default: Date.now }
  }],
  pricing: {
    costPrice: Number,
    bulkDiscount: { type: Number, min: 0, max: 1, default: 0 },
    bulkMinQuantity: { type: Number, default: 10 }
  },
  images: [{ url: String, publicId: String, alt: String }],
  tags: [String],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

async function createDemoProducts() {
    try {
        // Find admin user to set as creator
        const User = mongoose.model('User', new mongoose.Schema({
            username: String,
            role: String
        }));
        
        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.error('No admin user found. Please create demo users first.');
            process.exit(1);
        }

        // Clear existing products
        await Product.deleteMany({});
        console.log('Cleared existing products');

        const demoProducts = [
            {
                name: 'Fresh Chicken Wings',
                description: 'Premium quality chicken wings, perfect for grilling or frying',
                category: 'chicken',
                price: 280,
                unit: 'kg',
                stock: 50,
                minStock: 10,
                supplier: { name: 'Bounty Fresh', contact: '+63-2-8888-0000', country: 'Philippines' },
                storage: { temperature: 4, location: 'Refrigerator A1', shelfLife: 7 },
                pricing: { costPrice: 220, bulkDiscount: 0.1, bulkMinQuantity: 20 },
                tags: ['fresh', 'premium', 'local'],
                createdBy: adminUser._id
            },
            {
                name: 'Beef Tenderloin',
                description: 'High-grade beef tenderloin, tender and flavorful',
                category: 'beef',
                price: 1200,
                unit: 'kg',
                stock: 25,
                minStock: 5,
                supplier: { name: 'Premium Meats Co.', contact: '+63-2-7777-0000', country: 'Philippines' },
                storage: { temperature: -2, location: 'Freezer B2', shelfLife: 14 },
                pricing: { costPrice: 950, bulkDiscount: 0.15, bulkMinQuantity: 10 },
                tags: ['premium', 'tender', 'high-grade'],
                createdBy: adminUser._id
            },
            {
                name: 'Fresh Salmon Fillet',
                description: 'Atlantic salmon fillet, rich in omega-3',
                category: 'seafood',
                price: 850,
                unit: 'kg',
                stock: 30,
                minStock: 8,
                supplier: { name: 'Ocean Fresh', contact: '+63-2-6666-0000', country: 'Norway' },
                storage: { temperature: 0, location: 'Seafood Freezer', shelfLife: 10 },
                pricing: { costPrice: 680, bulkDiscount: 0.12, bulkMinQuantity: 15 },
                tags: ['fresh', 'imported', 'omega-3'],
                createdBy: adminUser._id
            },
            {
                name: 'Pork Belly',
                description: 'Fresh pork belly, ideal for lechon kawali and adobo',
                category: 'pork',
                price: 320,
                unit: 'kg',
                stock: 40,
                minStock: 12,
                supplier: { name: 'Local Farm Co.', contact: '+63-2-5555-0000', country: 'Philippines' },
                storage: { temperature: 2, location: 'Refrigerator A2', shelfLife: 5 },
                pricing: { costPrice: 250, bulkDiscount: 0.08, bulkMinQuantity: 25 },
                tags: ['fresh', 'local', 'versatile'],
                createdBy: adminUser._id
            },
            {
                name: 'Mixed Vegetables',
                description: 'Fresh mixed vegetables including carrots, broccoli, and bell peppers',
                category: 'vegetables',
                price: 120,
                unit: 'kg',
                stock: 60,
                minStock: 15,
                supplier: { name: 'Green Valley Farms', contact: '+63-2-4444-0000', country: 'Philippines' },
                storage: { temperature: 8, location: 'Vegetable Cooler', shelfLife: 3 },
                pricing: { costPrice: 80, bulkDiscount: 0.05, bulkMinQuantity: 30 },
                tags: ['fresh', 'organic', 'healthy'],
                createdBy: adminUser._id
            },
            {
                name: 'Fresh Milk',
                description: 'Pure fresh milk from local dairy farms',
                category: 'dairy',
                price: 85,
                unit: 'piece',
                stock: 100,
                minStock: 20,
                supplier: { name: 'Dairy Best', contact: '+63-2-3333-0000', country: 'Philippines' },
                storage: { temperature: 4, location: 'Dairy Refrigerator', shelfLife: 7 },
                pricing: { costPrice: 65, bulkDiscount: 0.06, bulkMinQuantity: 50 },
                tags: ['fresh', 'local', 'dairy'],
                createdBy: adminUser._id
            }
        ];

        for (const productData of demoProducts) {
            const product = new Product(productData);
            await product.save();
            console.log(`Created product: ${productData.name}`);
        }

        console.log('\nDemo products created successfully!');
        console.log(`Total products: ${demoProducts.length}`);

        process.exit(0);
    } catch (error) {
        console.error('Error creating demo products:', error);
        process.exit(1);
    }
}

createDemoProducts();
