# Cloud Hosting Deployment Guide

## New Server Information

**Server Details:**
- **IP Address**: 194.11.154.108
- **Hostname**: srv1374.hstgr.io
- **MySQL Host**: srv1374.hstgr.io
- **Hosting Type**: Cloud Hosting with Node.js support
- **SSH Port**: 65002
- **User**: u875310796

---

## Deployment Options

### Option 1: Hostinger Node.js Manager (Recommended)

1. **Access Hostinger hPanel**
   - Go to https://hpanel.hostinger.com
   - Navigate to "Advanced" → "Node.js"

2. **Create Node.js Application**
   - Click "Create Application"
   - **Application Root**: `/domains/cortexbuildpro.com/public_html/api`
   - **Application URL**: `https://cortexbuildpro.com/api`
   - **Application Startup File**: `dist/index.js`
   - **Node.js Version**: 20.x (latest LTS)

3. **Set Environment Variables**
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_TYPE=mysql
   DB_HOST=srv1374.hstgr.io
   DB_PORT=3306
   DB_NAME=u875310796_cortexbuildpro
   DB_USER=u875310796_admin
   DB_PASSWORD=your-db-password
   JWT_SECRET=<your-secret>
   GEMINI_API_KEY=<your-key>
   SENDGRID_API_KEY=<your-key>
   ```

4. **Install Dependencies & Start**
   - Click "Run npm install"
   - Click "Start Application"

---

### Option 2: Manual PM2 Deployment

1. **SSH into Server**
   ```bash
   ssh -p 65002 u875310796@194.11.154.108
   ```

2. **Navigate to API Directory**
   ```bash
   cd domains/cortexbuildpro.com/public_html/api
   ```

3. **Install PM2 (if not installed)**
   ```bash
   npm install -g pm2
   ```

4. **Copy ecosystem.config.js**
   - Upload `server/ecosystem.config.js` to the api directory

5. **Start Application with PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

6. **Monitor Application**
   ```bash
   pm2 status
   pm2 logs cortexbuild-backend
   pm2 monit
   ```

---

## Deployment Script Usage

### Deploy Backend
```bash
# From project root
node scripts/deploy-backend-sftp.js
```

This will:
1. Connect to 194.11.154.108 via SFTP
2. Upload all backend files to `/api` directory
3. Trigger application restart

### Deploy Frontend
```bash
# From project root
node scripts/deploy-frontend-sftp.js
```

This will:
1. Build the frontend
2. Upload to `/public_html` directory
3. Update the site

---

## Post-Deployment Verification

### 1. Test Database Connection
```bash
ssh -p 65002 u875310796@194.11.154.108 "mysql -h 194.11.154.108 -u u875310796_admin -p'YOUR_PASSWORD' -e 'SHOW DATABASES;'"
```

### 2. Test API Endpoint
```bash
curl https://cortexbuildpro.com/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"..."}
```

### 3. Check Application Logs
```bash
# Via PM2
ssh -p 65002 u875310796@194.11.154.108 "pm2 logs cortexbuild-backend --lines 50"

# Or manual logs
ssh -p 65002 u875310796@194.11.154.108 "tail -f domains/cortexbuildpro.com/public_html/api/app_manual.log"
```

### 4. Test Frontend
- Visit: https://cortexbuildpro.com
- Login and test functionality
- Check browser console for errors

---

## Troubleshooting

### Application Won't Start
```bash
# Check Node.js version
node --version  # Should be 20.x

# Check if port is in use
netstat -tuln | grep 3001

# Restart application
pm2 restart cortexbuild-backend
```

### Database Connection Issues
```bash
# Test MySQL connection
mysql -h 194.11.154.108 -u u875310796_admin -p'YOUR_PASSWORD' -e "SELECT 1;"

# Check if database exists
mysql -h 194.11.154.108 -u u875310796_admin -p'YOUR_PASSWORD' -e "SHOW DATABASES LIKE 'u875310796_cortexbuildpro';"
```

### 502 Bad Gateway
- Check if Node.js application is running: `pm2 status`
- Check application logs: `pm2 logs`
- Verify .htaccess proxy configuration

---

## Environment Variables Checklist

Make sure these are set in Hostinger Node.js Manager or ecosystem.config.js:

- [x] `NODE_ENV=production`
- [x] `PORT=3001`
- [x] `DATABASE_TYPE=mysql`
- [x] `DB_HOST=194.11.154.108`
- [x] `DB_PORT=3306`
- [x] `DB_NAME=u875310796_cortexbuildpro`
- [x] `DB_USER=u875310796_admin`
- [x] `DB_PASSWORD=your-db-password`
- [ ] `JWT_SECRET=<your-secret>`
- [ ] `GEMINI_API_KEY=<your-key>`
- [ ] `SENDGRID_API_KEY=<your-key>`
- [ ] `VAPID_PUBLIC_KEY=<your-key>`
- [ ] `VAPID_PRIVATE_KEY=<your-key>`

---

## Quick Commands

```bash
# Deploy everything
npm run build && node scripts/deploy-backend-sftp.js && node scripts/deploy-frontend-sftp.js

# Check application status
ssh -p 65002 u875310796@194.11.154.108 "pm2 status"

# View logs
ssh -p 65002 u875310796@194.11.154.108 "pm2 logs --lines 100"

# Restart application
ssh -p 65002 u875310796@194.11.154.108 "pm2 restart cortexbuild-backend"
```

---

## Migration Complete! 🎉

Your application is now running on the new cloud hosting server with Node.js support!
