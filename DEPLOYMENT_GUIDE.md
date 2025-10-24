# 🚀 Deployment Guide - Crisnil Trading Corp System

## Prerequisites
- GitHub account
- Vercel account (free tier is fine)
- MongoDB Atlas account (free tier is fine)

---

## 📋 Step-by-Step Deployment

### 1️⃣ Prepare MongoDB Atlas (Database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
5. Replace `<password>` with your actual password
6. Add `/crisnil-trading` at the end (database name)

**Example:**
```
mongodb+srv://admin:MyPassword123@cluster0.xxxxx.mongodb.net/crisnil-trading
```

---

### 2️⃣ Deploy Backend to Vercel

1. **Push your code to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Ready for deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Go to [Vercel](https://vercel.com)**
   - Sign in with GitHub
   - Click "Add New" → "Project"
   - Import your repository
   - Select the `backend` folder as root directory

3. **Configure Environment Variables** (IMPORTANT!):
   Click "Environment Variables" and add these:

   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_connection_string_here
   JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```

   **Generate a secure JWT_SECRET:**
   - Use a password generator or run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

4. **Deploy!**
   - Click "Deploy"
   - Wait for deployment to complete
   - Copy your backend URL (e.g., `https://your-backend.vercel.app`)

---

### 3️⃣ Deploy Frontend to Vercel

1. **In Vercel, add another project**
   - Click "Add New" → "Project"
   - Import the same repository
   - Select the `frontend` folder as root directory

2. **Configure Environment Variables**:
   You need to update the API URL in your frontend code first.

3. **Update Frontend API URL**:
   Before deploying, update `frontend/script.js`:
   
   Find this line:
   ```javascript
   const API_BASE_URL = 'http://localhost:5000/api';
   ```
   
   Change it to:
   ```javascript
   const API_BASE_URL = 'https://your-backend.vercel.app/api';
   ```
   
   Replace `your-backend.vercel.app` with your actual backend URL from step 2.

4. **Deploy!**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your app is now live! 🎉

---

### 4️⃣ Update Backend CORS Settings

After frontend is deployed, update the backend environment variable:

1. Go to your backend project in Vercel
2. Settings → Environment Variables
3. Update `FRONTEND_URL` to your actual frontend URL
4. Redeploy the backend

---

### 5️⃣ Create Admin Account

After deployment, you need to create an admin account:

**Option A: Using MongoDB Atlas UI**
1. Go to MongoDB Atlas → Browse Collections
2. Find the `users` collection
3. Insert a document manually with admin role

**Option B: Temporarily enable registration**
1. Use the registration form on your deployed site
2. Manually change the user's role to 'admin' in MongoDB Atlas
3. Delete other test accounts

---

## 🔧 Alternative: Deploy to Railway (Easier for Backend)

Railway is often easier for Node.js backends:

1. Go to [Railway.app](https://railway.app)
2. Sign in with GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables (same as above)
6. Railway will auto-detect and deploy your backend
7. Get your backend URL and update frontend

---

## 📝 Environment Variables Checklist

### Backend (.env or Vercel Environment Variables):
- ✅ `NODE_ENV=production`
- ✅ `PORT=5000`
- ✅ `MONGODB_URI=mongodb+srv://...`
- ✅ `JWT_SECRET=random_long_secret_key`
- ✅ `JWT_EXPIRES_IN=7d`
- ✅ `FRONTEND_URL=https://your-frontend.vercel.app`

### Frontend:
- ✅ Update `API_BASE_URL` in `script.js` to your backend URL

---

## 🐛 Troubleshooting

### "Cannot connect to database"
- Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for all IPs)
- Verify connection string is correct
- Check MongoDB Atlas cluster is running

### "CORS Error"
- Make sure `FRONTEND_URL` in backend matches your actual frontend URL
- Check backend is deployed and running

### "Images not showing"
- Good news! With base64 storage, images are in the database
- No file storage issues on deployment 🎉

### "JWT Error / Authentication Failed"
- Make sure `JWT_SECRET` is set in backend environment variables
- Must be the same secret for all backend instances

---

## 🎯 Quick Deploy Commands

```bash
# 1. Commit your changes
git add .
git commit -m "Ready for deployment with base64 images"
git push

# 2. Vercel will auto-deploy if connected
# Or manually deploy:
cd frontend
vercel --prod

cd ../backend
vercel --prod
```

---

## 📱 Post-Deployment

1. ✅ Test login/registration
2. ✅ Create admin account
3. ✅ Add some products with images
4. ✅ Test ordering flow
5. ✅ Check all features work

---

## 🔐 Security Notes

- Never commit `.env` files to GitHub
- Use strong JWT_SECRET (64+ characters)
- Enable MongoDB Atlas IP whitelist in production
- Regularly update dependencies
- Monitor Vercel logs for errors

---

## 💰 Cost

- **MongoDB Atlas**: Free tier (512MB storage)
- **Vercel**: Free tier (100GB bandwidth/month)
- **Total**: $0/month for small to medium usage! 🎉

---

## 📞 Need Help?

If you encounter issues:
1. Check Vercel deployment logs
2. Check MongoDB Atlas connection
3. Verify all environment variables are set
4. Test backend API directly (visit `https://your-backend.vercel.app/api/health`)

---

**Your app is now production-ready with base64 image storage! 🚀**
