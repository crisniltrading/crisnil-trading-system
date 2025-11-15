# 🚀 Deployment Guide - CRISNIL Trading System

## Overview
- **Backend**: Deploy to Render (Free tier)
- **Frontend**: Deploy to Vercel (Free tier)
- **Database**: MongoDB Atlas (Free tier)

---

## 📋 Prerequisites

1. GitHub account (✅ Done - code is pushed)
2. MongoDB Atlas account
3. Render account
4. Vercel account

---

## 🗄️ Step 1: Setup MongoDB Atlas (Database)

### 1.1 Create MongoDB Atlas Account
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up for free account
3. Create a new cluster (Free M0 tier)

### 1.2 Configure Database
1. **Create Database User:**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Username: `crisnil_admin`
   - Password: Generate a strong password (save it!)
   - Database User Privileges: "Read and write to any database"

2. **Whitelist IP Addresses:**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Confirm

3. **Get Connection String:**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password
   - Example: `mongodb+srv://crisnil_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/crisnil-trading?retryWrites=true&w=majority`

---

## 🔧 Step 2: Deploy Backend to Render

### 2.1 Create Render Account
1. Go to: https://render.com/
2. Sign up with GitHub account

### 2.2 Deploy Backend
1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `crisniltrading/crisnil-trading-system`
3. Configure:
   - **Name**: `crisnil-trading-api`
   - **Region**: Singapore (or closest to you)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 2.3 Add Environment Variables
Click "Environment" and add these variables:

```
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://crisnil_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/crisnil-trading?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random
JWT_EXPIRE=7d
FRONTEND_URL=https://your-app.vercel.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=CRISNIL Trading <your-email@gmail.com>
```

**Important Notes:**
- Replace `YOUR_PASSWORD` with your MongoDB password
- Replace `your-email@gmail.com` with your Gmail
- For Gmail password, use an "App Password" (not your regular password):
  - Go to: https://myaccount.google.com/apppasswords
  - Generate an app password for "Mail"
  - Use that password in `EMAIL_PASSWORD`

### 2.4 Deploy
1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Your backend will be available at: `https://crisnil-trading-api.onrender.com`
4. Test it: `https://crisnil-trading-api.onrender.com/health`

---

## 🌐 Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account
1. Go to: https://vercel.com/signup
2. Sign up with GitHub account

### 3.2 Deploy Frontend
1. Click "Add New..." → "Project"
2. Import your GitHub repository: `crisniltrading/crisnil-trading-system`
3. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `frontend`
   - **Build Command**: Leave empty (static site)
   - **Output Directory**: `.` (current directory)

### 3.3 Add Environment Variables (Optional)
If needed, add:
```
NEXT_PUBLIC_API_URL=https://crisnil-trading-api.onrender.com/api
```

### 3.4 Deploy
1. Click "Deploy"
2. Wait for deployment (2-3 minutes)
3. Your frontend will be available at: `https://crisnil-trading-system.vercel.app`

---

## 🔗 Step 4: Connect Frontend to Backend

### 4.1 Update Backend Environment Variable
1. Go back to Render dashboard
2. Go to your backend service
3. Update `FRONTEND_URL` to your Vercel URL:
   ```
   FRONTEND_URL=https://crisnil-trading-system.vercel.app
   ```
4. Save and redeploy

### 4.2 Update Frontend API URL
The frontend is already configured to auto-detect the API URL, but verify in `frontend/script.js`:

```javascript
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/api'
    : 'https://crisnil-trading-api.onrender.com/api';
```

If needed, update the production URL to match your Render backend URL.

---

## ✅ Step 5: Verify Deployment

### 5.1 Test Backend
1. Visit: `https://crisnil-trading-api.onrender.com/health`
2. Should return: `{"status":"success","message":"Server is running"}`

### 5.2 Test Frontend
1. Visit: `https://crisnil-trading-system.vercel.app`
2. Try to register a new account
3. Try to login
4. Check if everything works

### 5.3 Test Registration
1. Open browser console (F12)
2. Register a new account
3. Check console logs for any errors
4. Verify email is sent (if configured)

---

## 🔄 Step 6: Setup Automatic Deployments

Both Render and Vercel are already configured for automatic deployments:

- **Push to GitHub** → Automatically deploys to Render & Vercel
- **No manual deployment needed** after initial setup

---

## 🛠️ Troubleshooting

### Backend Issues

**Problem: Backend not starting**
- Check Render logs: Dashboard → Your Service → Logs
- Verify all environment variables are set
- Check MongoDB connection string

**Problem: CORS errors**
- Verify `FRONTEND_URL` in Render matches your Vercel URL
- Check backend logs for CORS messages

### Frontend Issues

**Problem: Can't connect to backend**
- Verify API_BASE_URL in `frontend/script.js`
- Check browser console for errors
- Verify backend is running

**Problem: Registration not working**
- Check browser console logs
- Verify backend `/api/auth/register` endpoint is accessible
- Check MongoDB connection

### Database Issues

**Problem: Can't connect to MongoDB**
- Verify connection string is correct
- Check if IP whitelist includes 0.0.0.0/0
- Verify database user credentials

---

## 📊 Monitoring

### Render (Backend)
- Dashboard: https://dashboard.render.com/
- View logs, metrics, and deployment history

### Vercel (Frontend)
- Dashboard: https://vercel.com/dashboard
- View deployments, analytics, and logs

### MongoDB Atlas (Database)
- Dashboard: https://cloud.mongodb.com/
- View database metrics, collections, and users

---

## 💰 Cost Breakdown

- **MongoDB Atlas**: Free (M0 tier - 512MB storage)
- **Render**: Free (750 hours/month, sleeps after 15 min inactivity)
- **Vercel**: Free (100GB bandwidth/month)

**Total Cost: $0/month** 🎉

---

## 🔐 Security Checklist

- ✅ Use strong JWT_SECRET (random, long string)
- ✅ Use Gmail App Password (not regular password)
- ✅ MongoDB user has limited permissions
- ✅ Environment variables are secure
- ✅ CORS is properly configured
- ✅ HTTPS enabled on all services

---

## 📝 Post-Deployment Tasks

1. **Create Admin Account:**
   ```bash
   # Run this script on your local machine connected to production DB
   npm run create-admin
   ```

2. **Test All Features:**
   - Registration ✅
   - Login ✅
   - Product management ✅
   - Order creation ✅
   - Inventory tracking ✅

3. **Monitor Performance:**
   - Check Render logs regularly
   - Monitor MongoDB usage
   - Check Vercel analytics

---

## 🚀 Quick Deploy Commands

```bash
# Push changes to GitHub (auto-deploys)
git add .
git commit -m "Your commit message"
git push origin main

# Both Render and Vercel will automatically deploy!
```

---

## 📞 Support

If you encounter issues:
1. Check the logs (Render/Vercel dashboards)
2. Verify environment variables
3. Test endpoints individually
4. Check MongoDB connection

---

## 🎉 You're Done!

Your CRISNIL Trading System is now live and accessible worldwide!

- **Frontend**: https://crisnil-trading-system.vercel.app
- **Backend**: https://crisnil-trading-api.onrender.com
- **Database**: MongoDB Atlas

Happy trading! 🛒❄️
