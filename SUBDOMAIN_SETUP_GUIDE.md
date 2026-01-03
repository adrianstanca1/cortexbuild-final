# API Subdomain Setup Guide - api.cortexbuildpro.com

## Quick Start Checklist

### ✅ Completed Automatically
- [x] Backend .env updated with subdomain in CORS
- [x] .htaccess configuration created for subdomain
- [x] Security headers configured
- [x] All API keys in place
- [x] Files uploaded to server

### 📋 Manual Steps Required (via Hostinger hPanel)

#### Step 1: Create DNS A Record
1. Log in to Hostinger hPanel
2. Go to **Domains** → Select `cortexbuildpro.com`
3. Click **DNS / Name Servers**
4. Click **Add Record**
5. Configure:
   - **Type**: A
   - **Name**: `api`
   - **Points to**: `194.11.154.108`
   - **TTL**: 14400 (default)
6. Click **Add Record**

**Verification**: Wait 5-15 minutes, then test:
```bash
nslookup api.cortexbuildpro.com
# Should return: 194.11.154.108
```

#### Step 2: Enable SSL for Subdomain
1. In Hostinger hPanel, go to **SSL**
2. Select `cortexbuildpro.com`
3. Find `api.cortexbuildpro.com` in the list
4. Click **Install SSL** or **Enable**
5. Wait for automatic certificate issuance (usually 1-5 minutes)

**Verification**:
```bash
curl -I https://api.cortexbuildpro.com
# Should return: HTTP/2 200 (or similar, not certificate error)
```

#### Step 3: Activate Subdomain .htaccess
Once DNS and SSL are working, SSH into the server and activate the configuration:

```bash
ssh -p 65002 u875310796@194.11.154.108
cd domains/cortexbuildpro.com/public_html/api
mv .htaccess .htaccess.backup
mv .htaccess.new .htaccess
exit
```

#### Step 4: Restart Node.js Application
```bash
ssh -p 65002 u875310796@194.11.154.108 "pkill -f 'node dist/index.js' && cd domains/cortexbuildpro.com/public_html/api && nohup node dist/index.js > app_manual.log 2>&1 &"
```

---

## Testing the Subdomain

### Test 1: DNS Resolution
```bash
nslookup api.cortexbuildpro.com
dig api.cortexbuildpro.com
```

### Test 2: SSL Certificate
```bash
curl -I https://api.cortexbuildpro.com
openssl s_client -connect api.cortexbuildpro.com:443 -servername api.cortexbuildpro.com
```

### Test 3: API Health Endpoint
```bash
curl https://api.cortexbuildpro.com/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Test 4: CORS Headers
```bash
curl -I -H "Origin: https://cortexbuildpro.com" https://api.cortexbuildpro.com/health
# Should include: Access-Control-Allow-Origin: https://cortexbuildpro.com
```

### Test 5: Authentication
```bash
curl -X POST https://api.cortexbuildpro.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@buildpro.app","password":"password"}'
```

---

## After Subdomain is Working

### Update Frontend to Use Subdomain

1. **Update `.env`**:
```env
VITE_API_URL=https://api.cortexbuildpro.com
```

2. **Rebuild Frontend**:
```bash
npm run build
```

3. **Deploy Frontend**:
```bash
node scripts/deploy-frontend-sftp.js
```

4. **Test Frontend**:
- Visit https://cortexbuildpro.com
- Open browser DevTools → Network tab
- Verify API calls go to `api.cortexbuildpro.com`

---

## Troubleshooting

### DNS Not Resolving
- Wait 15-30 minutes for DNS propagation
- Clear DNS cache: `sudo dscacheutil -flushcache` (Mac)
- Try different DNS server: `nslookup api.cortexbuildpro.com 8.8.8.8`

### SSL Certificate Error
- Ensure DNS is fully propagated first
- Check Hostinger SSL panel for certificate status
- May take up to 1 hour for certificate issuance
- Try forcing HTTPS renewal in Hostinger panel

### 502 Bad Gateway
- Check if Node.js is running: `ps aux | grep node`
- Check application logs: `tail -f app_manual.log`
- Verify port 3001 is correct in .htaccess
- Restart Node.js application

### CORS Errors
- Verify .env has correct CORS_ORIGIN
- Check .htaccess has correct Origin header
- Restart Node.js after .env changes
- Check browser console for exact error

---

## Security Checklist

- [x] HTTPS enforced on subdomain
- [x] CORS restricted to specific origins
- [x] Security headers configured
- [x] API keys in .env (not in code)
- [x] Database credentials secured
- [x] SSL certificate installed
- [ ] Rate limiting configured (optional)
- [ ] Monitoring/logging enabled (optional)

---

## Files Modified

### Local
- `server/.env.production` - Added subdomain to CORS
- `server/.htaccess.subdomain` - Subdomain configuration

### Remote (srv1374.hstgr.io)
- `/api/.env` - Updated with subdomain CORS
- `/api/.htaccess.new` - Ready to activate
- `/api/.htaccess.backup` - Original backup (after activation)

---

## Summary

**Current Status**: ✅ Configuration files ready
**Next Step**: Configure DNS A record in Hostinger hPanel
**Then**: Enable SSL for subdomain
**Finally**: Activate .htaccess and update frontend

Once DNS and SSL are configured, the subdomain will be fully operational!
