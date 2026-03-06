# Vercel Deployment Fix - Quick Checklist

## 🚨 Most Likely Issue: Missing Environment Variables

### Step 1: Check Vercel Environment Variables (5 minutes)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `slateph-main`
3. Go to **Settings** → **Environment Variables**
4. Verify these variables exist for **all environments** (Production, Preview, Development):

   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

5. If missing, add them:
   - Click "Add New"
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: Your Supabase project URL (from .env.local)
   - Select: Production, Preview, Development
   - Click "Save"
   
   - Repeat for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

6. **Redeploy** after adding variables:
   - Go to **Deployments** tab
   - Click "..." on latest deployment
   - Click "Redeploy"

### Step 2: Check Deployment Logs (2 minutes)

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Check **Build Logs**:
   - Look for "Build Completed" ✓
   - Look for any error messages ✗
   
4. Check **Function Logs** (Runtime):
   - Look for any errors when accessing the site
   - Common errors: "Supabase not configured", "Cannot read property", etc.

### Step 3: Test Health Endpoint (1 minute)

After redeploying, visit:
```
https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "environment": {
    "nodeEnv": "production",
    "hasSupabaseUrl": true,
    "hasSupabaseKey": true,
    "supabaseUrlPrefix": "https://..."
  }
}
```

If `hasSupabaseUrl` or `hasSupabaseKey` is `false`, environment variables are still missing.

### Step 4: Test Main Site (1 minute)

Visit your main URL:
```
https://your-app.vercel.app/
```

Expected: Login page should load

## 🔧 If Still Not Working

### Check Node Version (Optional)

Your project uses Node 24.x which might not be stable on Vercel.

**To downgrade to Node 20 (LTS):**

1. Edit `package.json`:
   ```json
   "engines": {
     "node": "20.x",
     "npm": ">=8.0.0"
   }
   ```

2. Edit `vercel.json`:
   ```json
   "env": {
     "NODE_VERSION": "20"
   }
   ```

3. Commit and push changes
4. Vercel will auto-deploy

### Simplify Vercel Config (Optional)

Edit `vercel.json` to minimal config:
```json
{
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

Remove `buildCommand`, `devCommand`, `installCommand` - let Vercel auto-detect.

## 📊 What to Share for Further Help

If the issue persists, share:

1. **Health endpoint response**: Copy the JSON from `/api/health`
2. **Vercel build logs**: Screenshot or copy the build output
3. **Vercel function logs**: Any error messages from runtime logs
4. **Browser console errors**: Open DevTools → Console tab, copy any errors
5. **Network tab**: Check if API calls are failing (DevTools → Network)

## ✅ Success Indicators

You'll know it's fixed when:
- [ ] Health endpoint returns `"status": "ok"`
- [ ] Health endpoint shows `"hasSupabaseUrl": true` and `"hasSupabaseKey": true`
- [ ] Main site loads the login page
- [ ] No errors in browser console
- [ ] No errors in Vercel function logs

## 🎯 Quick Summary

**Most likely fix**: Add environment variables in Vercel Dashboard and redeploy.

**Time estimate**: 5-10 minutes

**Success rate**: 90% of "works locally but not on Vercel" issues are environment variables.

---

**Need help?** Share the health endpoint response and Vercel logs.
