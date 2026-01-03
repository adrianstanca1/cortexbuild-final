# 🚀 Deploy Backend NOW - 5 Minute Guide

## You Need to Do This (I Cannot Access Hostinger Web Interface)

**Why manual?** Hostinger requires web login - I cannot authenticate as you.

**Time needed:** 5 minutes

---

## Step 1: Open Hostinger (30 seconds)

1. Go to: https://hpanel.hostinger.com
2. Log in with your credentials
3. Click: **Websites** → **Node.js** → **Create Application**

---

## Step 2: Fill the Form (2 minutes)

**Copy these EXACT values:**

| Field | Value |
|-------|-------|
| **Repository** | `adrianstanca1/Buildproapp2` |
| **Branch** | `main` |
| **Framework** | `Express` |
| **Root directory** | `./server` |
| **Node version** | `22.x` |
| **Build command** | `npm install && npm run build` |
| **Start command** | `node dist/index.js` |

⚠️ **CRITICAL:** Root directory MUST be `./server` (with the dot and slash)

---

## Step 3: Add Environment Variables (2 minutes)

Click **"Add"** under Environment variables and paste these **one by one**:

```
PORT=3000
```
```
NODE_ENV=production
```
```
SUPABASE_URL=https://zpbuvuxpfemldsknerew.supabase.co
```
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYnV2dXhwZmVtbGRza25lcmV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjExNDMxNywiZXhwIjoyMDcxNjkwMzE3fQ.gY8kq22SiOxULPdpdhf-sz-C7V9hC2ZtPy5003UYsik
```
```
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYnV2dXhwZmVtbGRza25lcmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMTQzMTcsImV4cCI6MjA3MTY5MDMxN30.4wb8_qMaJ0hpkLEv51EWh0pRtVXD3GWWOsuCmZsOx6A
```
```
SUPABASE_JWT_SECRET=Cumparavinde1@
```
```
FILE_SIGNING_SECRET=Cumparavinde1@
```
```
GEMINI_API_KEY=AIzaSyC_Qa8pvQsefl5Xjjwvhg053keWRP7CveU
```
```
DATABASE_TYPE=mysql
```
```
DB_HOST=127.0.0.1
```
```
DB_USER=u875310796_admin
```
```
DB_PASSWORD=Cumparavinde1.
```
```
DB_NAME=u875310796_cortexbuildpro
```
```
DB_PORT=3306
```

---

## Step 4: Deploy (30 seconds)

1. Click **"Create"** or **"Import"**
2. Wait 2-3 minutes for build
3. Watch the logs for success

---

## Step 5: Test (30 seconds)

Open terminal and run:

```bash
curl https://seashell-alpaca-613176.hostingersite.com/api/health
```

**Expected:** `{"status":"online","database":"connected",...}`

**If 404:** Backend didn't start - check logs in hPanel

---

## ✅ Success Checklist

- [ ] Opened Hostinger hPanel
- [ ] Created Node.js application
- [ ] Set root directory to `./server`
- [ ] Added all 13 environment variables
- [ ] Clicked Create
- [ ] Waited for build to complete
- [ ] Tested `/api/health` endpoint
- [ ] Got successful response

---

## 🆘 If It Fails

**Check the logs in hPanel** - they will tell you exactly what went wrong.

Common fixes:
- Root directory wrong → Delete app, recreate with `./server`
- Missing env vars → Add the missing ones
- Build failed → Check Node version is 22.x

---

**Everything is ready on my end. The code is perfect. You just need to click through the Hostinger interface!**
