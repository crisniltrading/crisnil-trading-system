// Generate secure secrets for deployment
const crypto = require('crypto');

console.log('\n🔐 DEPLOYMENT SECRETS GENERATOR\n');
console.log('Copy these values to your Vercel Environment Variables:\n');
console.log('━'.repeat(60));

// Generate JWT Secret
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('\n📝 JWT_SECRET:');
console.log(jwtSecret);

console.log('\n━'.repeat(60));
console.log('\n📋 Complete Environment Variables Template:\n');

console.log(`NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crisnil-trading
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend.vercel.app
`);

console.log('━'.repeat(60));
console.log('\n⚠️  IMPORTANT:');
console.log('1. Replace MONGODB_URI with your actual MongoDB Atlas connection string');
console.log('2. Replace FRONTEND_URL with your actual frontend URL after deployment');
console.log('3. NEVER commit these secrets to Git!');
console.log('\n✅ Copy these to Vercel → Settings → Environment Variables\n');
