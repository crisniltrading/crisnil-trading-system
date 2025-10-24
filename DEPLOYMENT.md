# Deployment Guide - Free Hosting

Complete guide to deploy your Crisnil Trading System for free.

## Prerequisites

- GitHub account
- Git installed locally
- Your project pushed to GitHub

## Step 1: Setup MongoDB Atlas (Database)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free account
3. Create a new cluster:
   - Choose **FREE** tier (M0)
   - Select region closest to you (Singapore for Asia)
   - Cluster name: `crisnil-cluster`
4. Create database user:
   - Database Access → Add New User
   - Username: `crisnil-admin`
   - Password: Generate secure password (save it!)
   - Role: Read and write to any database
5. Whitelist IP addresses:
   - Network Access → Add IP Address
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - This is needed for Render to connect
6. Get connection string:
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Replace `myFirstDatabase` with `crisnil-trading`
   - Example: `mongodb+srv://crisnil-admin:yourpassword@crisnil-cluster.xxxxx.mongodb.net/crisnil-trading?retryWrites=true&w=majority`

**Save this connection string - you'll need it!**

## Step 2: Setup Cloudinary (Image Storage)

1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for free account
3. Go to Dashboard
4. Copy these values:
   - Cloud Name
   - API Key
   - API Secret

**Save these - you'll need them!**

## Step 3: Setup Email (Gmail)

1. Use your Gmail account
2. Enable 2-Factor Authentication
3. Generate App Password:
   - Google Account → Security → 2-Step Verification
   - Scroll down → App passwords
   - Select app: Mail, Select device: Other (Custom name)
   - Name it: "Crisnil Trading"
   - Copy the 16-character password

**Save this app password - you'll need it!**

## Step 4: Deploy Backend to Render

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name:** `crisnil-trading-api`
   - **Region:** Singapore (or closest to you)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
6. Add Environment Variables (click "Advanced"):
   ```
   NODE_ENV=production
   PORT=5001
   MONGODB_URI=<your-mongodb-connection-string>
   JWT_SECRET=<generate-random-string-32-chars>
   JWT_EXPIRE=7d
   FRONTEND_URL=https://your-app.vercel.app
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=<your-gmail>
   EMAIL_PASSWORD=<your-app-password>
   EMAIL_FROM=Crisnil Trading <your-gmail>
   CLOUDINARY_CLOUD_NAME=<your-cloud-name>
   CLOUDINARY_API_KEY=<your-api-key>
   CLOUDINARY_API_SECRET=<your-api-secret>
   ```
7. Click "Create Web Service"
8. Wait 5-10 minutes for deployment
9. Copy your backend URL: `https://crisnil-trading-api.onrender.com`

**Important:** Free tier sleeps after 15 minutes of inactivity. First request takes ~30 seconds to wake up.

## Step 5: Update Frontend API URL

1. Open `frontend/script.js` (or wherever you define API URL)
2. Find the API base URL constant
3. Update it to your Render backend URL:
   ```javascript
   const API_URL = 'https://crisnil-trading-api.onrender.com/api';
   ```
4. Commit and push changes:
   ```bash
   git add .
   git commit -m "Update API URL for production"
   git push
   ```

## Step 6: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New..." → "Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset:** Other
   - **Root Directory:** `frontend`
   - **Build Command:** (leave empty)
   - **Output Directory:** (leave empty)
6. Click "Deploy"
7. Wait 2-3 minutes
8. Your site is live! Copy the URL: `https://your-app.vercel.app`

## Step 7: Update Backend CORS

1. Go back to Render dashboard
2. Open your backend service
3. Go to "Environment" tab
4. Update `FRONTEND_URL` to your Vercel URL:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
5. Save changes (service will auto-redeploy)

## Step 8: Test Your Deployment

1. Visit your Vercel URL
2. Try to:
   - Register a new account
   - Login
   - Add products (if admin)
   - Browse products
   - Test email notifications

## Troubleshooting

### Backend won't start
- Check Render logs for errors
- Verify all environment variables are set
- Check MongoDB connection string is correct

### Frontend can't connect to backend
- Check API_URL in frontend code
- Verify CORS settings in backend
- Check browser console for errors

### Images won't upload
- Verify Cloudinary credentials
- Check file size limits
- Check browser console for errors

### Emails not sending
- Verify Gmail app password
- Check email configuration
- Look for errors in Render logs

### Database connection fails
- Verify MongoDB Atlas IP whitelist includes 0.0.0.0/0
- Check connection string format
- Ensure database user has correct permissions

## Free Tier Limitations

**Render (Backend):**
- Sleeps after 15 min inactivity
- 512MB RAM
- Shared CPU
- 750 hours/month (enough for 24/7)

**Vercel (Frontend):**
- 100GB bandwidth/month
- Unlimited requests
- No sleep issues

**MongoDB Atlas:**
- 512MB storage
- Shared cluster
- Good for ~10,000 products

**Cloudinary:**
- 25GB storage
- 25GB bandwidth/month
- ~10,000 images

## Keeping Backend Awake (Optional)

Free Render services sleep after 15 minutes. To keep it awake during demos:

1. Use [cron-job.org](https://cron-job.org) (free)
2. Create a job to ping your backend every 10 minutes:
   - URL: `https://crisnil-trading-api.onrender.com/api/health`
   - Interval: Every 10 minutes

**Note:** Only do this during active development/demo periods.

## Custom Domain (Optional)

If you want a custom domain:

1. Buy cheap domain from Namecheap (.xyz = $1/year)
2. In Vercel: Settings → Domains → Add domain
3. Follow DNS configuration instructions
4. Update FRONTEND_URL in Render

## Your Live URLs

After deployment, you'll have:

- **Frontend:** `https://your-app.vercel.app`
- **Backend API:** `https://crisnil-trading-api.onrender.com`
- **Database:** MongoDB Atlas (managed)
- **Images:** Cloudinary CDN

## Security Checklist

✅ Never commit `.env` files
✅ Use strong JWT_SECRET (32+ random characters)
✅ Use Gmail app password (not regular password)
✅ Keep Cloudinary secrets private
✅ MongoDB user has minimal required permissions
✅ CORS configured to only allow your frontend domain

## Support

If you encounter issues:
1. Check service logs (Render dashboard)
2. Check browser console (F12)
3. Verify all environment variables
4. Test API endpoints with Postman/Thunder Client

## Cost Summary

- **Total:** $0/month
- **Domain (optional):** $1-12/year
- **Scaling (future):** Render paid tier starts at $7/month

Perfect for capstone projects and demos!
