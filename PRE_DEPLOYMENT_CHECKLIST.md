# ✅ Pre-Deployment Checklist

## Before You Deploy - Complete These Steps:

### 1. Update API URL in Frontend
- [ ] Open `frontend/script.js`
- [ ] Find: `const API_BASE_URL = 'http://localhost:5000/api';`
- [ ] Change to: `const API_BASE_URL = 'https://YOUR-BACKEND-URL.vercel.app/api';`
- [ ] Replace `YOUR-BACKEND-URL` with your actual backend URL after deploying backend

### 2. Environment Variables Ready
- [ ] MongoDB Atlas connection string ready
- [ ] JWT_SECRET generated (use: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- [ ] Frontend URL ready (or use placeholder, update after frontend deploy)

### 3. Code is Ready
- [x] Base64 image storage implemented ✅
- [x] CORS configured ✅
- [x] Error handling in place ✅
- [x] Health check endpoint exists ✅
- [x] Authentication working ✅

### 4. Git Repository
- [ ] Code committed to Git
- [ ] Pushed to GitHub
- [ ] `.env` file is in `.gitignore` (DO NOT commit secrets!)

### 5. MongoDB Atlas Setup
- [ ] Free cluster created
- [ ] Database user created
- [ ] IP whitelist configured (use 0.0.0.0/0 for Vercel)
- [ ] Connection string copied

---

## Deployment Order:

1. **Deploy Backend First** → Get backend URL
2. **Update Frontend** → Change API_BASE_URL to backend URL
3. **Deploy Frontend** → Get frontend URL
4. **Update Backend** → Add frontend URL to CORS/environment variables
5. **Create Admin Account** → Use MongoDB Atlas or registration

---

## Quick Deploy Steps:

### Backend:
```bash
cd backend
# Make sure vercel.json exists
vercel --prod
# Copy the URL you get
```

### Frontend:
```bash
# First, update API_BASE_URL in frontend/script.js with backend URL
cd frontend
vercel --prod
# Copy the URL you get
```

### Update Backend CORS:
- Go to Vercel → Your Backend Project → Settings → Environment Variables
- Update `FRONTEND_URL` with your frontend URL
- Redeploy backend

---

## Test After Deployment:

- [ ] Visit frontend URL - page loads
- [ ] Backend health check works: `https://your-backend.vercel.app/api/health`
- [ ] Can register/login
- [ ] Can create products with images
- [ ] Images display correctly
- [ ] Can place orders
- [ ] All features work

---

## 🎉 You're Ready to Deploy!

Follow the detailed steps in `DEPLOYMENT_GUIDE.md`
