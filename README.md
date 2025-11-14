# Crisnil Trading System

E-Commerce and Inventory Management System for Frozen Food Distribution

## Quick Start

### Development Setup

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run dev

# Frontend (new terminal)
cd frontend
# Use Live Server or: python -m http.server 8080
```

### Production Deployment

See `DEPLOYMENT_GUIDE.md` for complete instructions.

**Recommended Stack:**
- Backend: Render/VPS
- Frontend: Vercel/Netlify
- Database: MongoDB Atlas (Free tier)
- Images: Local storage

## Core Features

- Multi-role user management (Admin, Staff, Client)
- Product catalog with image uploads
- Real-time inventory tracking
- Order processing with multiple payment methods
- Promotions and discount system
- Analytics and reporting
- Customer reviews and ratings

## Payment Methods

- GCash: 0981 753 9060
- Bank Transfer: Security Bank - 0000072660383
- Cash on Delivery (COD)

## Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- Multer (local file storage)

**Frontend:**
- Vanilla JavaScript (ES6+)
- Responsive CSS
- Dynamic API configuration

## Documentation

- `DEPLOYMENT_GUIDE.md` - Complete deployment instructions
- `QUICK_REFERENCE.md` - Common commands and tips
- `LANDING_PAGE_PROMOTIONS_SETUP.md` - Promotions setup guide
- `PLATFORM_FEE_GUIDE.md` - Platform fee configuration
- `CHAPTER_4_RESULTS_AND_DISCUSSION.md` - Academic documentation

## Default Credentials

```
Admin: admin@crisnil.com / admin123
Staff: staff@crisnil.com / staff123
```

⚠️ Change these credentials in production!

## License

MIT
