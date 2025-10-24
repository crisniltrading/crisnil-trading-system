# ⚡ Quick Deploy Guide (5 Minutes)

## 🎯 Deploy Your App in 5 Steps

### Step 1: Generate Secrets (30 seconds)
```bash
cd backend
node generate-secrets.js
```
Copy the output - you'll need it!

---

### Step 2: Deploy Backend (2 minutes)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New" → "Project"
3. Import your repository
4. **Root Directory**: Select `backend`
5. **Environment Variables**: Paste these (from Step 1):
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_url_here
   JWT_SECRET=the_generated_secret_from_step_1
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=https://placeholder.com
   ```
6. Click "Deploy"
7. **Copy your backend URL** (e.g., `https://your-backend.vercel.app`)

---

### Step 3: Update Frontend (1 minute)

Open `frontend/script.js` and find line ~10:
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

Change to:
```javascript
const API_BASE_URL = 'https://your-backend.vercel.app/api';
```
(Use your actual backend URL from Step 2)

**Commit and push:**
```bash
git add .
git commit -m "Update API URL for production"
git push
```

---

### Step 4: Deploy Frontend (1 minute)

1. In Vercel, click "Add New" → "Project"
2. Import the same repository
3. **Root Directory**: Select `frontend`
4. No environment variables needed!
5. Click "Deploy"
6. **Copy your frontend URL** (e.g., `https://your-frontend.vercel.app`)

---

### Step 5: Update Backend CORS (30 seconds)

1. Go to Vercel → Your Backend Project
2. Settings → Environment Variables
3. Edit `FRONTEND_URL` → Change to your actual frontend URL from Step 4
4. Click "Redeploy" button

---

## 🎉 Done! Your App is Live!

Visit your frontend URL and:
1. Register an account
2. Go to MongoDB Atlas → Browse Collections → Users
3. Change your user's `role` to `"admin"`
4. Refresh and log in again

---

## 🔗 Important URLs

- **Frontend**: https://your-frontend.vercel.app
- **Backend**: https://your-backend.vercel.app
- **Backend Health**: https://your-backend.vercel.app/api/health
- **MongoDB Atlas**: https://cloud.mongodb.com

---

## ⚠️ Don't Forget:

### MongoDB Atlas Setup:
1. Create free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create database user
3. **Network Access** → Add IP: `0.0.0.0/0` (allow all)
4. Get connection string
5. Replace `<password>` with your actual password
6. Add `/crisnil-trading` at the end

**Example:**
```
mongodb+srv://admin:MyPass123@cluster0.xxxxx.mongodb.net/crisnil-trading
```

---

## 🐛 Quick Troubleshooting

**Backend not working?**
- Check MongoDB Atlas connection string
- Verify IP whitelist is `0.0.0.0/0`
- Check Vercel logs

**Frontend can't connect?**
- Verify API_BASE_URL in frontend/script.js
- Check backend is deployed and running
- Test: `https://your-backend.vercel.app/api/health`

**CORS Error?**
- Update FRONTEND_URL in backend environment variables
- Redeploy backend

---

## 💡 Pro Tips

- Use Vercel's automatic deployments (push to GitHub = auto deploy)
- Check Vercel logs for errors
- MongoDB Atlas free tier is 512MB (plenty for starting)
- Vercel free tier is 100GB bandwidth/month

---

**Total Time: ~5 minutes** ⚡
**Total Cost: $0** 💰

🚀 **Your app is production-ready!**
