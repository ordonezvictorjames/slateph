# Vercel Troubleshooting - Next Steps

Since you've already added the environment variables, let's diagnose the specific issue.

## Step 1: Check What's Actually Happening

### A. Visit Your Vercel Deployment URL
Go to: `https://slateph-main.vercel.app` (or your custom domain)

**What do you see?**
- [ ] Blank white page
- [ ] "Application Error" message
- [ ] Loading spinner that never stops
- [ ] 404 Not Found
- [ ] 500 Internal Server Error
- [ ] Something else: ___________

### B. Check Browser Console
1. Open Developer Tools (F12 or Right-click → Inspect)
2. Go to **Console** tab
3. Refresh the page
4. Look for any red error messages

**Common errors to look for:**
- `Failed to fetch`
- `Supabase not configured`
- `Cannot read property of undefined`
- `Network error`
- CORS errors

### C. Check Network Tab
1. In Developer Tools, go to **Network** tab
2. Refresh the page
3. Look for failed requests (red status codes)

**Check these specific requests:**
- `/api/auth/session` - Should return 200
- `/api/health` - Should return 200
- Main page load - Should return 200

## Step 2: Test the Health Endpoint

Visit: `https://your-app.vercel.app/api/health`

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "environment": {
    "nodeEnv": "production",
    "hasSupabaseUrl": true,
    "hasSupabaseKey": true,
    "supabaseUrlPrefix": "https://yqoyyzsxjsr"
  },
  "build": {
    "nextVersion": "15.5.12",
    "nodeVersion": "v20.x.x"
  }
}
```

**If you see:**
- `hasSupabaseUrl: false` or `hasSupabaseKey: false` → Environment variables not properly set
- `supabaseUrlPrefix: "missing"` → URL not configured
- Error 500 → Server-side issue
- Error 404 → Routing issue or build problem

## Step 3: Check Vercel Logs

### Build Logs
1. Go to Vercel Dashboard
2. Click on your project: `slateph-main`
3. Go to **Deployments** tab
4. Click on the latest deployment
5. Check **Build Logs**

**Look for:**
- ✓ "Build Completed" - Good!
- ✗ Any error messages
- Warnings about missing dependencies
- TypeScript errors
- Build failures

### Function Logs (Runtime)
1. In the same deployment view
2. Click **Functions** tab
3. Look for any runtime errors

**Common issues:**
- `Error: Cannot find module`
- `ReferenceError: ... is not defined`
- `TypeError: Cannot read property`
- Database connection errors

## Step 4: Verify Environment Variables in Vercel

Even though you added them, let's double-check:

1. Go to **Settings** → **Environment Variables**
2. Verify these exist:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
3. Check they're enabled for:
   - ✓ Production
   - ✓ Preview
   - ✓ Development

4. **Important**: After adding/changing env vars, you MUST redeploy:
   - Go to **Deployments**
   - Click "..." on latest deployment
   - Click "Redeploy"

## Step 5: Common Issues & Fixes

### Issue 1: Blank Page / Infinite Loading
**Cause**: Client-side JavaScript error or API route failure

**Fix**:
1. Check browser console for errors
2. Check if `/api/auth/session` is accessible
3. Verify Supabase connection

### Issue 2: "Application Error"
**Cause**: Server-side error in API routes or page rendering

**Fix**:
1. Check Vercel Function Logs
2. Look for specific error messages
3. Common cause: Missing environment variables or database connection issues

### Issue 3: 404 on All Pages
**Cause**: Build output issue or routing problem

**Fix**:
1. Check if build completed successfully
2. Verify `vercel.json` configuration
3. Try simplifying `vercel.json`:
   ```json
   {
     "framework": "nextjs"
   }
   ```

### Issue 4: Works on First Load, Then Breaks
**Cause**: Client-side hydration mismatch or state management issue

**Fix**:
1. Check for `suppressHydrationWarning` in layout
2. Verify client/server component boundaries
3. Check if localStorage or sessionStorage is used (not available during SSR)

### Issue 5: Slow or Timeout Errors
**Cause**: Serverless function timeout (10s on Hobby plan)

**Fix**:
1. Optimize database queries
2. Add indexes to Supabase tables
3. Consider upgrading Vercel plan

## Step 6: Node Version Issue

Your project uses Node 24.x which is very new. Try downgrading:

### Update package.json:
```json
"engines": {
  "node": "20.x",
  "npm": ">=8.0.0"
}
```

### Update vercel.json:
```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NODE_VERSION": "20"
  }
}
```

Then commit and push to trigger a new deployment.

## Step 7: Simplify Vercel Configuration

Sometimes custom build commands cause issues. Try this minimal `vercel.json`:

```json
{
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

Remove:
- `buildCommand`
- `devCommand`
- `installCommand`

Let Vercel auto-detect everything.

## Step 8: Check for Supabase Issues

### Test Supabase Connection Directly
Visit: `https://yqoyyzsxjsrpqsifqsjm.supabase.co/rest/v1/`

You should see a response (even if it's an error about missing API key - that's fine, it means Supabase is reachable).

### Check Supabase Dashboard
1. Go to your Supabase project
2. Check if the database is active
3. Verify the `profiles` table exists
4. Check if the `authenticate_user` function exists

## What to Share for Help

If still not working, please share:

1. **Health endpoint response**: Copy the full JSON from `/api/health`
2. **Browser console errors**: Screenshot or copy any red errors
3. **Vercel build logs**: Last 50 lines of the build output
4. **Vercel function logs**: Any runtime errors
5. **What you see**: Describe exactly what happens when you visit the site

## Quick Diagnostic Commands

Run these locally to verify everything works:

```bash
# Clean build
npm run clean
npm install
npm run build

# Type check
npm run type-check

# Test production build locally
npm run start
```

If all these work locally but not on Vercel, it's definitely an environment or configuration issue.

---

**Next Action**: Please share what you see when you visit your Vercel URL and the health endpoint response.
