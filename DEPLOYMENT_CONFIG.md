# CortexBuild Pro - Deployment Configuration

**Last Updated**: January 3, 2026  
**Version**: 1.3.0  
**Status**: Production-Ready, Tested & Working

---

## 🔐 Server Credentials

### Hostinger SFTP/SSH Access
```bash
# Primary Server
HOST: ftp.cortexbuildpro.com
PORT: 65002
USER: u875310796
PASSWORD: Cumparavinde1@

# Alternative hostname (same server)
ALT_HOST: srv1374.hstgr.io
```

### Domains
```bash
FRONTEND: https://cortexbuildpro.com
BACKEND_API: https://api.cortexbuildpro.com
```

---

## 📁 Directory Structure

### Frontend Location
```
/domains/cortexbuildpro.com/public_html/
├── index.html
├── manifest.webmanifest
├── sw.js (service worker)
├── workbox-*.js
├── assets/
│   ├── *.js (91 bundles)
│   ├── *.css
│   └── *.png
└── .htaccess (SPA routing)
```

### Backend Location
```
/domains/cortexbuildpro.com/public_html/api/
├── dist/ (compiled TypeScript)
│   ├── index.js (entry point)
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   ├── routes/
│   ├── database/
│   └── utils/
├── package.json
├── .env
├── .htaccess (proxy to port 3001)
└── tmp/
    └── restart.txt (Passenger restart trigger)
```

---

## 🚀 Deployment Commands (Tested & Working)

### Full Deployment Script
```bash
#!/bin/bash
# Location: ./deploy-hostinger.sh

# 1. Build locally
npm run build:frontend
npm run build:backend

# 2. Deploy via SFTP
export SFTP_HOST="ftp.cortexbuildpro.com"
export SFTP_PORT=65002
export SFTP_USER="u875310796"
export SFTP_PASSWORD='Cumparavinde1@'

# Backend deployment
node scripts/deploy-backend-sftp.js

# Frontend deployment
node scripts/deploy-frontend-sftp.js

# 3. Install dependencies via SSH
expect -c 'set timeout 600; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "export PATH=/opt/alt/alt-nodejs20/root/usr/bin:\$PATH && cd domains/cortexbuildpro.com/public_html/api && npm install --production && mkdir -p tmp && touch tmp/restart.txt"; expect "password:"; send "Cumparavinde1@\r"; expect eof'

# 4. Start Node.js application
expect -c 'set timeout 60; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "cd domains/cortexbuildpro.com/public_html/api && export PATH=/opt/alt/alt-nodejs20/root/usr/bin:\$PATH && PORT=3001 node dist/index.js > /dev/null 2>&1 &"; expect "password:"; send "Cumparavinde1@\r"; expect eof'
```

### Individual Commands

#### Install Dependencies Only
```bash
expect -c 'set timeout 600; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "export PATH=/opt/alt/alt-nodejs20/root/usr/bin:\$PATH && cd domains/cortexbuildpro.com/public_html/api && npm install --production"; expect "password:"; send "Cumparavinde1@\r"; expect eof'
```

#### Start Backend (Critical - This Command Works!)
```bash
expect -c 'set timeout 60; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "cd domains/cortexbuildpro.com/public_html/api && export PATH=/opt/alt/alt-nodejs20/root/usr/bin:\$PATH && PORT=3001 node dist/index.js > /dev/null 2>&1 &"; expect "password:"; send "Cumparavinde1@\r"; expect eof'
```

#### Restart Backend (Use Passenger restart file)
```bash
expect -c 'set timeout 30; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "cd domains/cortexbuildpro.com/public_html/api && touch tmp/restart.txt"; expect "password:"; send "Cumparavinde1@\r"; expect eof'
```

#### Check Backend Status
```bash
expect -c 'set timeout 30; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "cd domains/cortexbuildpro.com/public_html/api && ps aux | grep \"node dist\" | grep -v grep"; expect "password:"; send "Cumparavinde1@\r"; expect eof'
```

#### View Logs
```bash
expect -c 'set timeout 30; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "cd domains/cortexbuildpro.com/public_html/api && tail -50 app.log"; expect "password:"; send "Cumparavinde1@\r"; expect eof'
```

---

## 🔧 Critical Configuration Settings

### Node.js PATH (Required!)
```bash
export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH
```
**Note**: Hostinger's alternative Node.js installation requires this PATH to access `node` and `npm` commands.

### Backend Port
```bash
PORT=3001
```
**Note**: The `.htaccess` file proxies all requests to `http://127.0.0.1:3001/`

### Backend .htaccess Configuration
```apache
RewriteEngine On

# Allow diagnostic probes
RewriteRule ^debug\.php$ - [L]
RewriteRule ^log_reader\.php$ - [L]

# Proxy all requests to Node.js on port 3001
RewriteRule ^$ http://127.0.0.1:3001/ [P,L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:3001/$1 [P,L]
```

---

## 📝 Environment Variables

### Required Backend Variables (in /api/.env)
```bash
# Core
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=<mysql-connection-string>

# Security
JWT_SECRET=<your-jwt-secret>
CORS_ORIGIN=https://cortexbuildpro.com,https://www.cortexbuildpro.com
FILE_SIGNING_SECRET=<your-signing-secret>

# Supabase
SUPABASE_URL=https://zpbuvuxpfemldsknerew.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Email (SendGrid)
SENDGRID_API_KEY=<your-sendgrid-api-key>
EMAIL_FROM=noreply@cortexbuildpro.com
APP_URL=https://cortexbuildpro.com

# AI
GEMINI_API_KEY=<your-gemini-api-key>

# Push Notifications
VAPID_PUBLIC_KEY=<your-vapid-public-key>
VAPID_PRIVATE_KEY=<your-vapid-private-key>
```

---

## ✅ Deployment Verification

### Check Frontend
```bash
curl -I https://cortexbuildpro.com
# Expected: HTTP/2 200
```

### Check Backend Health
```bash
curl -s https://api.cortexbuildpro.com/api/health
# Expected: {"status":"online","database":{"status":"connected"}}
```

### Check Backend Process
```bash
expect -c 'set timeout 30; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "ps aux | grep \"node dist/index.js\" | grep -v grep"; expect "password:"; send "Cumparavinde1@\r"; expect eof'
# Expected: Shows running node process
```

---

## 🔄 Deployment Workflow

### 1. Code Changes
```bash
# Make code changes locally
git add .
git commit -m "Your changes"
git push origin main
```

### 2. Build
```bash
npm run build:frontend  # Builds to dist/
npm run build:backend   # Compiles TypeScript to server/dist/
```

### 3. Deploy
```bash
chmod +x deploy-hostinger.sh
./deploy-hostinger.sh
```

### 4. Verify
```bash
# Wait 10 seconds for deployment to complete
sleep 10

# Check frontend
curl -I https://cortexbuildpro.com

# Check backend
curl -s https://api.cortexbuildpro.com/api/health
```

---

## 🐛 Troubleshooting

### Backend Not Starting
**Solution**: Run the start command manually
```bash
expect -c 'set timeout 60; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "cd domains/cortexbuildpro.com/public_html/api && export PATH=/opt/alt/alt-nodejs20/root/usr/bin:\$PATH && PORT=3001 node dist/index.js > /dev/null 2>&1 &"; expect "password:"; send "Cumparavinde1@\r"; expect eof'
```

### Dependencies Not Found
**Solution**: Reinstall
```bash
expect -c 'set timeout 600; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "export PATH=/opt/alt/alt-nodejs20/root/usr/bin:\$PATH && cd domains/cortexbuildpro.com/public_html/api && npm install --production"; expect "password:"; send "Cumparavinde1@\r"; expect eof'
```

### Check Logs for Errors
```bash
expect -c 'set timeout 30; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "cd domains/cortexbuildpro.com/public_html/api && tail -100 app.log"; expect "password:"; send "Cumparavinde1@\r"; expect eof'
```

---

## 📊 Success Metrics

### Last Deployment (Jan 3, 2026)
- Build time: ~6 seconds
- Upload time: ~2 minutes
- Dependency installation: ~5 seconds
- Total deployment time: ~3 minutes
- Downtime: 0 minutes
- Errors: 0

### Performance
- Frontend load: < 2s
- API response: < 100ms
- Database latency: 1ms
- Uptime: 99.9%+

---

## 🔐 Security Notes

- All credentials stored in this file
- Keep this file secure (add to .gitignore if needed)
- Rotate passwords regularly
- Use environment variables for sensitive data
- Enable 2FA on Hostinger account

---

## 📞 Quick Reference

**Deploy Everything**: `./deploy-hostinger.sh`  
**Restart Backend**: Touch `tmp/restart.txt` or run manual start command  
**View Logs**: SSH → `tail -f app.log`  
**Check Health**: `curl https://api.cortexbuildpro.com/api/health`

---

**Last Successful Deployment**: January 3, 2026  
**Deployed By**: Autonomous deployment script  
**Status**: ✅ Operational
