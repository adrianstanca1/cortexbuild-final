# Quick Start Guide: Complete Backend Deployment

## ✅ What's Already Done
- Frontend: Live at https://cortexbuildpro.com
- Backend files: Uploaded and ready at `/home/u875310796/domains/cortexbuildpro.com/api`
- All code: Committed to GitHub

## 🚀 Final Step (2 minutes)

### 1. Login to Hostinger
Go to: **https://hpanel.hostinger.com**

### 2. Navigate to Node.js Manager
**Option A: Sidebar (Most Common)**
1. Look at the left sidebar
2. Click **Advanced** (Standard) or **Websites** (New UI)
3. Click **Node.js**

**Option B: Search Bar**
1. At the very top of the page, click the **Search** bar
2. Type "Node"
3. Click the **Node.js** result

*> **Note:** If you still don't see it, ensure you are on a **Business** or **Cloud** plan. Basic Shared hosting does not support Node.js.*

### 3. Create Application
Click the **"Create Application"** button

### 4. Fill in the Form
Copy and paste these exact values:

| Field | Value |
|-------|-------|
| **Application root** | `domains/cortexbuildpro.com/public_html/api` |
| **Application URL** | `api.cortexbuildpro.com` |
| **Application startup file** | `dist/index.js` |
| **Node.js version** | `20.x` (or 18.x if 20 not available) |

### 5. Create and Start
1. Click **"Create"**
2. Wait 30 seconds for creation
3. **CRITICAL:** Click **"Install Dependencies"** (Wait for it to finish - this installs the required libraries)
4. Click **"Start Application"**

### 6. Verify
Test the API:
```bash
curl https://api.cortexbuildpro.com/api/health
```

Expected response:
```json
{"status":"online","database":"connected",...}
```

## 🎯 That's It!
Once started, your full application will be live with:
- Frontend at https://cortexbuildpro.com
- Backend API at https://api.cortexbuildpro.com
- All dashboard enhancements active
- Real-time features working

---

**Need help?** Check the application logs in hPanel if anything doesn't start correctly.

### Advanced Troubleshooting (SSH)
If you need to access the server shell directly (Business/Cloud plans only):
```bash
ssh -p 65002 u875310796@82.29.188.65
```
*Note: This is for advanced debugging only.*
