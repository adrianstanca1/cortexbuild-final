# 🚀 CortexBuild Pro - Quick Deployment Reference

## One-Command Deployment
```bash
./deploy-autonomous.sh
```

## Manual Steps

### 1. Build
```bash
npm run build:frontend && npm run build:backend
```

### 2. Deploy (Choose one)

**Full Deployment:**
```bash
./deploy-hostinger.sh
```

**Backend Only:**
```bash
node scripts/deploy-backend-sftp.js
```

**Frontend Only:**
```bash
node scripts/deploy-frontend-sftp.js
```

### 3. Start Backend (If needed)
```bash
expect -c 'set timeout 60; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "cd domains/cortexbuildpro.com/public_html/api && export PATH=/opt/alt/alt-nodejs20/root/usr/bin:\$PATH && PORT=3001 node dist/index.js > /dev/null 2>&1 &"; expect "password:"; send "Cumparavinde1@\r"; expect eof'
```

### 4. Verify
```bash
curl https://cortexbuildpro.com  # Frontend
curl https://api.cortexbuildpro.com/api/health  # Backend
```

## Quick Troubleshooting

**Backend not responding?**
```bash
# Restart backend
expect -c 'set timeout 60; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "cd domains/cortexbuildpro.com/public_html/api && export PATH=/opt/alt/alt-nodejs20/root/usr/bin:\$PATH && PORT=3001 node dist/index.js > /dev/null 2>&1 &"; expect "password:"; send "Cumparavinde1@\r"; expect eof'
```

**Check logs:**
```bash
expect -c 'set timeout 30; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "cd domains/cortexbuildpro.com/public_html/api && tail -50 app.log"; expect "password:"; send "Cumparavinde1@\r"; expect eof'
```

**Dependencies missing?**
```bash
expect -c 'set timeout 600; spawn ssh -p 65002 u875310796@ftp.cortexbuildpro.com "export PATH=/opt/alt/alt-nodejs20/root/usr/bin:\$PATH && cd domains/cortexbuildpro.com/public_html/api && npm install --production"; expect "password:"; send "Cumparavinde1@\r"; expect eof'
```

## Server Details
- Host: `ftp.cortexbuildpro.com:65002`
- User: `u875310796`
- Frontend: `/domains/cortexbuildpro.com/public_html/`
- Backend: `/domains/cortexbuildpro.com/public_html/api/`

## URLs
- Frontend: https://cortexbuildpro.com
- Backend: https://api.cortexbuildpro.com

---
*Full documentation: DEPLOYMENT_CONFIG.md*
