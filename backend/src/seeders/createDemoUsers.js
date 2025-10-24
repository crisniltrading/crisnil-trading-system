const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cris-system', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff', 'client'], default: 'client' },
    businessInfo: {
        business_name: String,
        contact_person: String,
        phone: String,
        address: String
    },
    isActive: { type: Boolean, default: true },
    lastLogin: Date
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password method
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);

async function createDemoUsers() {
    try {
        // Clear existing users
        await User.deleteMany({});
        console.log('Cleared existing users');

        // Create demo users
        const demoUsers = [
            {
                username: 'admin',
                email: 'admin@crisnil.com',
                password: 'admin123',
                role: 'admin',
                businessInfo: {
                    business_name: 'Crisnil Trading Admin',
                    contact_person: 'System Administrator',
                    phone: '+1-555-0100',
                    address: '123 Admin Street, Business District'
                }
            },
            {
                username: 'staff',
                email: 'staff@crisnil.com',
                password: 'staff123',
                role: 'staff',
                businessInfo: {
                    business_name: 'Crisnil Trading Staff',
                    contact_person: 'Staff Member',
                    phone: '+1-555-0200',
                    address: '456 Staff Avenue, Operations Center'
                }
            },
            {
                username: 'demo',
                email: 'demo@crisnil.com',
                password: 'demo123',
                role: 'client',
                businessInfo: {
                    business_name: 'Demo Restaurant',
                    contact_person: 'John Demo',
                    phone: '+1-555-0300',
                    address: '789 Demo Lane, Client City'
                }
            }
        ];

        for (const userData of demoUsers) {
            const user = new User(userData);
            await user.save();
            console.log(`Created user: ${userData.username} (${userData.role})`);
        }

        console.log('\nDemo users created successfully!');
        console.log('Login credentials:');
        console.log('Admin: username=admin, password=admin123');
        console.log('Staff: username=staff, password=staff123');
        console.log('Client: username=demo, password=demo123');

        process.exit(0);
    } catch (error) {
        console.error('Error creating demo users:', error);
        process.exit(1);
    }
}

createDemoUsers();
