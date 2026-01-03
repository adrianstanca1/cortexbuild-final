# 🚀 Adding Gemini API Key to Vercel

Your Gemini API key has been added to local environment files. Now add it to Vercel for production.

## Method 1: Using Vercel CLI (Recommended)

Run these commands in your terminal:

```bash
# Navigate to project directory
cd /Users/adrian/Desktop/buildapp2/Buildproapp2

# Add the environment variable to all environments
vercel env add GEMINI_API_KEY

# When prompted:
# - Enter value: AIzaSyC_Qa8pvQsefl5Xjjwvhg053keWRP7CveU
# - Select environments: Production, Preview, Development (select all)
```

## Method 2: Using Vercel Dashboard

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: `adrianstanca1/Buildproapp2`
3. **Click "Settings"** tab
4. **Click "Environment Variables"** in the sidebar
5. **Add new variable**:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `AIzaSyC_Qa8pvQsefl5Xjjwvhg053keWRP7CveU`
   - **Environments**: Check all (Production, Preview, Development)
6. **Click "Save"**
7. **Redeploy** your application for changes to take effect

## Testing Locally

Test that Phase 14 features work locally:

```bash
# Restart your development server
npm run dev

# In another terminal, start the backend
cd server
npm run dev
```

Then test:
- ✅ Predictive Insights in Dashboard
- ✅ Document OCR extraction
- ✅ Workflow automation triggers

## Verifying Production Deployment

After adding to Vercel and redeploying:

1. Check deployment logs for any errors
2. Visit your production URL
3. Test Phase 14 features:
   - Navigate to Dashboard → View predictive insights
   - Go to a Project → Try OCR document upload
   - Create a high-severity safety incident → Verify automation triggers

---

**Status**: 
- ✅ Local environment configured
- ⏳ Vercel environment (use Method 1 or 2 above)
- ⏳ Redeploy to production after adding to Vercel
