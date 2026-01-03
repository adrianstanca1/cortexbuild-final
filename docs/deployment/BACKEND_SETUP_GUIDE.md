# Backend Deployment - Final Setup Guide

## ✅ Files Successfully Uploaded

The backend has been deployed to:
```
/home/u875310796/domains/cortexbuildpro.com/api
```

**Uploaded files:**
- `dist/` - Compiled TypeScript backend
- `package.json` - Dependencies list
- `package-lock.json` - Locked dependency versions
- `.env` - Environment configuration

## 🚀 Complete the Setup in Hostinger hPanel

### Step 1: Access Node.js Manager
1. Log into Hostinger hPanel: https://hpanel.hostinger.com
2. Navigate to: **Websites** → **Node.js**

### Step 2: Create Application
Click **"Create Application"** and configure:

| Setting | Value |
|---------|-------|
| **Application root** | `/home/u875310796/domains/cortexbuildpro.com/api` |
| **Application URL** | `cortexbuildpro.com` |
| **Application startup file** | `dist/index.js` |
| **Node.js version** | `18.x` or higher (recommended: 20.x) |

### Step 3: Install Dependencies
1. After creating the application, click **"Install Dependencies"**
2. Wait for npm to install all packages (this may take 1-2 minutes)

### Step 4: Start the Application
1. Click **"Start Application"**
2. The backend should now be running

## 🔍 Verify Deployment

Test the API endpoints:

```bash
# Health check
curl https://cortexbuildpro.com/api/health

# Root API endpoint
curl https://cortexbuildpro.com/api

# Expected response: JSON with status "online"
```

## 🌐 Full Application URLs

- **Frontend**: https://cortexbuildpro.com
- **Backend API**: https://cortexbuildpro.com/api
- **Health Check**: https://cortexbuildpro.com/api/health

## 🐛 Troubleshooting

### If the API returns 404:
1. Verify the Node.js application is running in hPanel
2. Check the application logs in hPanel
3. Ensure the startup file is set to `dist/index.js`

### If the API returns 500:
1. Check application logs in hPanel
2. Verify environment variables are set correctly
3. Ensure database connection is working

### If dependencies fail to install:
1. Try manually running: `npm install --production` in the hPanel terminal
2. Check for any missing system dependencies

## 📊 Environment Variables

The `.env` file includes:
- Database configuration (MySQL/PostgreSQL)
- Supabase credentials
- Gemini API key
- SendGrid configuration
- JWT secrets

All sensitive credentials are already configured in the uploaded `.env` file.

## ✨ Next Steps After Backend is Running

1. Test user login at https://cortexbuildpro.com
2. Verify API connectivity from the frontend
3. Test key features (projects, tasks, team management)
4. Monitor application logs for any errors
