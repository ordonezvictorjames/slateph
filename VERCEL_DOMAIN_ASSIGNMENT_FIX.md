# Vercel Domain Assignment Fix

## Problem
- Build succeeds ✓
- Preview URL works ✓
- But `slateph.vercel.app` times out ✗

This means the domain is not properly assigned to the latest deployment.

## Solution

### Step 1: Assign Latest Deployment to Domain

1. Go to **Vercel Dashboard** → Your Project
2. Go to **Deployments** tab
3. Find the latest deployment (the one that shows "Ready" with the preview working)
4. Click the **three dots (...)** menu on that deployment
5. Click **"Promote to Production"** or **"Assign to Domain"**
6. Select `slateph.vercel.app`
7. Confirm

### Step 2: Check Domain Settings

1. Go to **Settings** → **Domains**
2. Look for `slateph.vercel.app`
3. Check if it says:
   - **"Production"** - Good, it's the main domain
   - **"Preview"** - This might be the issue
   - **No status** - Domain not properly configured

### Step 3: Set as Production Domain

If `slateph.vercel.app` is not marked as Production:

1. In **Settings** → **Domains**
2. Find `slateph.vercel.app`
3. Click the **three dots (...)** menu
4. Click **"Set as Production Domain"**
5. Confirm

### Step 4: Force Redeploy to Production

Sometimes Vercel needs a fresh production deployment:

1. Go to **Deployments** tab
2. Click on the latest successful deployment
3. Click **"Redeploy"**
4. Make sure **"Use existing Build Cache"** is UNCHECKED
5. Click **"Redeploy"**

### Step 5: Clear DNS Cache (Your Side)

The domain might be cached on your computer:

**Windows:**
```bash
ipconfig /flushdns
```

**Then try accessing the site in:**
- Incognito/Private browsing mode
- Different browser
- Mobile phone (using mobile data, not WiFi)

### Step 6: Check Production Branch

1. Go to **Settings** → **Git**
2. Check **"Production Branch"** setting
3. Make sure it's set to `main` (or whatever your main branch is)
4. If it's set to something else, change it to `main`
5. Save and trigger a new deployment

## Quick Diagnostic

### Check if domain is properly routed:

1. Go to the deployment that works (the preview)
2. Copy the preview URL (something like `slateph-abc123.vercel.app`)
3. Try accessing it directly
4. If that works, the issue is definitely domain assignment

### Check deployment status:

Look at your deployments list:
- Latest deployment should have a **"Production"** badge
- If it says **"Preview"** or **"Canceled"**, it's not serving the main domain

## Common Causes

### Cause 1: Preview Deployment Instead of Production
**Symptom**: Preview URL works, main domain doesn't
**Fix**: Promote the deployment to production (Step 1)

### Cause 2: Old Deployment Still Assigned
**Symptom**: Main domain shows old version or times out
**Fix**: Assign latest deployment to domain (Step 1)

### Cause 3: Domain Not Set as Production
**Symptom**: Domain exists but not serving traffic
**Fix**: Set as production domain (Step 3)

### Cause 4: DNS Propagation Delay
**Symptom**: Works for some people, not others
**Fix**: Wait 5-10 minutes, clear DNS cache (Step 5)

## What to Do Right Now

1. **Click "Promote to Production"** on your latest deployment
2. **Wait 1-2 minutes** for propagation
3. **Clear your DNS cache**: `ipconfig /flushdns`
4. **Try in incognito mode**: Open `https://slateph.vercel.app/` in private browsing
5. **Try on mobile**: Use your phone with mobile data (not WiFi)

## Expected Result

After promoting to production:
- `https://slateph.vercel.app/` should load the login page
- Should work in all browsers
- Should work on all devices

## If Still Not Working

Check these in Vercel Dashboard:

1. **Deployments tab**: Does latest deployment have "Production" badge?
2. **Settings → Domains**: Is `slateph.vercel.app` marked as "Production"?
3. **Settings → Git**: Is production branch set to `main`?

If all above are correct and it still doesn't work:
- Try accessing from a different network (mobile data)
- Try a different device
- Contact Vercel support (might be a platform issue)

---

**Most likely fix**: Click "Promote to Production" on your latest deployment.
