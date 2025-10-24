# 🏪 Crisnil Trading Corp - Smart E-Commerce & Inventory System

A complete e-commerce and inventory management system for frozen food distribution, built with Node.js, Express, MongoDB, and vanilla JavaScript.

## 🌟 Features

### For Customers (B2B & Retail)
- 🛒 Shopping cart with real-time inventory
- 💝 Wishlist and product comparison
- 🎯 Personalized promotions and discounts
- 📦 Order tracking and history
- ⭐ Product reviews and ratings
- 🔍 Advanced product search and filtering

### For Admin/Staff
- 📊 Real-time analytics dashboard
- 📦 Inventory management with low-stock alerts
- 📅 Expiry tracking and batch management
- 🎁 Promotion and discount management
- 👥 Customer and order management
- 📈 Sales reports and insights
- 🔐 Role-based access control

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 16+ installed
- MongoDB installed locally or MongoDB Atlas account

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd crisnil-trading
```

### 2. Setup Backend
```bash
cd backend
npm install
```

Create `.env` file in backend folder:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/crisnil-trading
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5500
```

Start backend:
```bash
npm run dev
```

### 3. Setup Frontend
```bash
cd frontend
# Open with Live Server or any static server
# Make sure it runs on http://localhost:5500
```

### 4. Create Admin Account
```bash
cd backend
npm run create-admin
```

## 📦 Deployment

**Ready to deploy?** Follow these guides:

1. 📋 **[PRE_DEPLOYMENT_CHECKLIST.md](./PRE_DEPLOYMENT_CHECKLIST.md)** - Complete this first
2. 🚀 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Step-by-step deployment instructions

### Quick Deploy to Vercel

```bash
# Generate secrets
cd backend
node generate-secrets.js

# Deploy backend
vercel --prod

# Update frontend API URL, then deploy
cd ../frontend
vercel --prod
```

## 🛠️ Tech Stack

### Backend
- **Node.js** & **Express** - Server framework
- **MongoDB** & **Mongoose** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File uploads (with base64 storage)
- **Node-cron** - Scheduled tasks

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Modern styling with CSS variables
- **Font Awesome** - Icons
- **Chart.js** - Analytics charts

## 📁 Project Structure

```
crisnil-trading/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Business logic
│   │   ├── models/         # Database schemas
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth, validation, etc.
│   │   ├── utils/          # Helper functions
│   │   └── scripts/        # Utility scripts
│   ├── uploads/            # File uploads (legacy)
│   ├── server.js           # Entry point
│   └── package.json
│
├── frontend/
│   ├── assets/             # Images, logos
│   ├── index.html          # Main HTML
│   ├── script.js           # Main JavaScript
│   ├── styles.css          # Main styles
│   ├── product-management.js
│   ├── client-shopping.js
│   └── profile-settings.js
│
└── README.md
```

## 🔐 Security Features

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Role-based access control (Admin, Staff, B2B, Client)
- ✅ Input validation and sanitization
- ✅ CORS protection
- ✅ Rate limiting
- ✅ Helmet security headers
- ✅ Audit logging for critical actions

## 📊 Key Features Explained

### Image Storage
Images are stored as **base64 in MongoDB** for easy deployment without file storage dependencies. This ensures:
- ✅ No file path issues
- ✅ Works on any hosting platform
- ✅ No external storage needed
- ✅ Survives server restarts

### Discount System
Flexible promotion system supporting:
- Percentage discounts
- Fixed amount discounts
- Category-wide promotions
- Product-specific promotions
- Time-based promotions
- Automatic application at checkout

### Inventory Management
- Real-time stock tracking
- Low stock alerts
- Batch tracking with expiry dates
- Automatic expiry notifications
- Stock history and analytics

## 🧪 Available Scripts

### Backend
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run create-admin    # Create admin account
npm run clean-db   # Clean database (interactive)
npm run clean-db:force  # Force clean database
```

### Frontend
- Open `index.html` with Live Server or any static server

## 🐛 Troubleshooting

### "Cannot connect to database"
- Check MongoDB is running
- Verify MONGODB_URI in .env
- Check MongoDB Atlas IP whitelist

### "CORS Error"
- Verify FRONTEND_URL in backend .env
- Check frontend is running on correct port

### "Images not showing"
- With base64 storage, images should always work
- Check browser console for errors

## 📝 License

MIT License - feel free to use for your projects!

## 👨‍💻 Author

Crisnil Trading Corp Development Team

---

**Need help?** Check the deployment guides or create an issue!

🎉 **Happy coding and successful deployment!**
