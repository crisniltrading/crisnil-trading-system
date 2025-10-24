# Quick Start - Deploy in 30 Minutes

Fast track deployment guide for your capstone demo.

## Before You Start

Have these ready:
- GitHub account
- Gmail account
- 30 minutes of time

## Step-by-Step Checklist

### ☐ 1. MongoDB Atlas (5 minutes)
1. Go to mongodb.com/cloud/atlas → Sign up
2. Create FREE cluster (M0)
3. Create user: `crisnil-admin` + strong password
4. Network Access → Allow 0.0.0.0/0
5. Copy connection string
   - Format: `mongodb+srv://crisnil-admin:PASSWORD@cluster.xxxxx.mongodb.net/crisnil-trading`

### ☐ 2. Cloudinary (3 minutes)
1. Go to cloudinary.com → Sign up
2. Dashboard → Copy:
   - Cloud Name
   - API Key
   - API Secret

### ☐ 3. Gmail App Password (3 minutes)
1. Enable 2FA on your Gmail
2. Google Account → Security → App passwords
3. Generate password for "Crisnil Trading"
4. Copy 16-character password

### ☐ 4. Push to GitHub (2 minutes)
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### ☐ 5. Deploy Backend - Render (10 minutes)
1. Go to render.com → Sign up with GitHub
2. New + → Web Service → Select your repo
3. Settings:
   - Name: `crisnil-trading-api`
   - Root Directory: `backend`
   - Build: `npm install`
   - Start: `npm start`
   - Plan: **FREE**
4. Environment Variables (paste all):
```
NODE_ENV=production
PORT=5001
MONGODB_URI=<paste-your-mongodb-string>
JWT_SECRET=<random-32-chars>
JWT_EXPIRE=7d
FRONTEND_URL=https://temp.vercel.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<your-gmail>
EMAIL_PASSWORD=<your-app-password>
EMAIL_FROM=Crisnil Trading <your-gmail>
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```
5. Create Web Service → Wait 5-10 min
6. **Copy your URL:** `https://crisnil-trading-api.onrender.com`

### ☐ 6. Update Frontend API URL (2 minutes)
1. Open `frontend/script.js`
2. Find API URL and update:
```javascript
const API_URL = 'https://crisnil-trading-api.onrender.com/api';
```
3. Save, commit, push:
```bash
git add .
git commit -m "Update API URL"
git push
```

### ☐ 7. Deploy Frontend - Vercel (5 minutes)
1. Go to vercel.com → Sign up with GitHub
2. New Project → Import your repo
3. Settings:
   - Root Directory: `frontend`
   - Leave build/output empty
4. Deploy → Wait 2-3 min
5. **Copy your URL:** `https://your-app.vercel.app`

### ☐ 8. Update Backend CORS (2 minutes)
1. Back to Render → Your service → Environment
2. Update `FRONTEND_URL` to your Vercel URL
3. Save (auto-redeploys)

### ☐ 9. Test Everything (5 minutes)
Visit your Vercel URL and test:
- ✓ Register account
- ✓ Login
- ✓ Browse products
- ✓ Check email notifications

## Done! 🎉

Your URLs:
- **Frontend:** https://your-app.vercel.app
- **Backend:** https://crisnil-trading-api.onrender.com

## Important Notes

⚠️ **Backend sleeps after 15 min** - First request takes 30 seconds to wake up
💡 **For demos:** Visit your site 1 minute before presenting
📧 **Email issues?** Check spam folder first

## Generate JWT Secret

Need a random JWT secret? Run in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use: `openssl rand -hex 32`

## Troubleshooting

**Can't connect to backend?**
- Wait 30 seconds (it's waking up)
- Check Render logs for errors

**Images not uploading?**
- Verify Cloudinary credentials
- Check file size < 10MB

**Emails not working?**
- Use Gmail app password, not regular password
- Check spam folder

## Need Help?

Check full guide: `DEPLOYMENT.md`
