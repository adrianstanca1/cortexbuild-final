# Backend Deployment Troubleshooting Guide

## Current Status
- ✅ Backend builds successfully (TypeScript compiles without errors)
- ✅ All code committed to GitHub (commit `e38b5c37`)
- ⚠️ Backend deployment to Hostinger failed

## Common Hostinger Deployment Issues & Solutions

### Issue 1: Incorrect Root Directory
**Problem:** Hostinger can't find the backend code
**Solution:** Ensure root directory is set to `./server`

**Correct Settings:**
```
Root directory: ./server
NOT: ./ or /server or server/
```

### Issue 2: Missing Environment Variables
**Problem:** Application crashes due to missing env vars
**Solution:** Add ALL environment variables from `HOSTINGER_ENV_VARS.txt`

**Required Variables:**
```env
PORT=3000
NODE_ENV=production
SUPABASE_URL=https://zpbuvuxpfemldsknerew.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=Cumparavinde1@
FILE_SIGNING_SECRET=Cumparavinde1@
GEMINI_API_KEY=AIzaSyC_Qa8pvQsefl5Xjjwvhg053keWRP7CveU
DATABASE_TYPE=mysql
DB_HOST=127.0.0.1
DB_USER=u875310796_admin
DB_PASSWORD=Cumparavinde1.
DB_NAME=u875310796_cortexbuildpro
DB_PORT=3306
```

### Issue 3: Wrong Build/Start Commands
**Problem:** Hostinger can't build or start the app
**Solution:** Use these exact commands

**Correct Commands:**
```
Build command: npm install && npm run build
Start command: node dist/index.js
```

### Issue 4: Node Version Mismatch
**Problem:** Build fails due to incompatible Node version
**Solution:** Use Node.js 20.x or 22.x

**Recommended:** Node.js 22.x

### Issue 5: Database Connection Issues
**Problem:** App starts but can't connect to database
**Solution:** Check database credentials

**For Hostinger MySQL:**
```
DB_HOST=127.0.0.1 (localhost)
DB_PORT=3306 (default MySQL port)
DB_USER=u875310796_admin
DB_NAME=u875310796_cortexbuildpro
```

## Step-by-Step Deployment Process

### Option 1: GitHub Import (Recommended)

1. **Go to Hostinger hPanel**
   - Navigate to: https://hpanel.hostinger.com
   - Click: Websites → Node.js → Create Application

2. **Configure Application**
   ```
   Repository: adrianstanca1/Buildproapp2
   Branch: main
   Framework: Express
   Root directory: ./server
   Node version: 22.x
   Build command: npm install && npm run build
   Start command: node dist/index.js
   ```

3. **Add Environment Variables**
   - Click "Add" under Environment variables
   - Copy all variables from `HOSTINGER_ENV_VARS.txt`
   - Add them one by one

4. **Deploy**
   - Click "Create" or "Import"
   - Wait 2-3 minutes for build
   - Check logs for errors

### Option 2: Manual File Upload (Alternative)

If GitHub import fails, use manual upload:

1. **Build locally:**
   ```bash
   cd server
   npm install
   npm run build
   ```

2. **Upload files via SFTP:**
   - Host: 82.29.188.65
   - Port: 65002
   - User: u875310796
   - Upload: `dist/`, `package.json`, `.env`

3. **Create Node.js app in hPanel:**
   - Point to uploaded files
   - Set start command: `node dist/index.js`

## Debugging Failed Deployment

### Check Build Logs
1. In Hostinger hPanel, go to your Node.js application
2. Click on "Logs" or "Build Logs"
3. Look for error messages

### Common Error Messages

**"Cannot find module"**
- Solution: Ensure all dependencies are in `dependencies`, not `devDependencies`
- We already fixed this (TypeScript is in dependencies)

**"Port already in use"**
- Solution: Ensure `PORT=3000` in environment variables
- Hostinger will assign the correct port

**"Database connection failed"**
- Solution: Verify database credentials
- Check if MySQL database exists in Hostinger

**"Build failed"**
- Solution: Check if `tsconfig.json` is correct
- Verify `package.json` has correct scripts

## Verification Steps

After deployment, test:

1. **Health Check:**
   ```bash
   curl https://seashell-alpaca-613176.hostingersite.com/api/health
   # or
   curl https://cortexbuildpro.com/api/health
   ```

2. **Expected Response:**
   ```json
   {"status":"online","database":"connected",...}
   ```

3. **If 404:**
   - Backend not started
   - Check hPanel logs
   - Verify start command

4. **If 500:**
   - Check environment variables
   - Check database connection
   - Review application logs

## Quick Fixes

### If Build Keeps Failing:
1. Delete the application in hPanel
2. Create a new one with exact settings above
3. Double-check root directory: `./server`

### If App Won't Start:
1. Check environment variables are all set
2. Verify start command: `node dist/index.js`
3. Check Node version: 22.x or 20.x

### If Database Won't Connect:
1. Verify MySQL database exists in Hostinger
2. Check credentials match
3. Ensure `DB_HOST=127.0.0.1`

## Need More Help?

**Check these files:**
- `HOSTINGER_ENV_VARS.txt` - All environment variables
- `QUICK_START.md` - Quick deployment guide
- `server/package.json` - Build configuration

**Backend is ready:**
- ✅ Code builds successfully
- ✅ All dependencies correct
- ✅ Environment variables prepared
- ✅ Pushed to GitHub

The issue is likely in the Hostinger configuration, not the code itself.
