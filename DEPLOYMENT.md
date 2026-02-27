# SlateLMS Deployment Guide

This guide covers deploying SlateLMS to various platforms with cross-browser and mobile compatibility.

## 🚀 Quick Deployment (Vercel - Recommended)

### Prerequisites
- GitHub account
- Vercel account
- Supabase project set up

### Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Add environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Click "Deploy"

3. **Custom Domain (Optional)**
   - Go to your project settings in Vercel
   - Add your custom domain
   - Update DNS records as instructed

## 🌐 Cross-Browser Testing Checklist

Before deploying, test on:

### Desktop Browsers
- [ ] Chrome 90+ (Windows, macOS, Linux)
- [ ] Firefox 88+ (Windows, macOS, Linux)
- [ ] Safari 14+ (macOS)
- [ ] Edge 90+ (Windows, macOS)

### Mobile Browsers
- [ ] Safari (iOS 14+)
- [ ] Chrome Mobile (Android 8+)
- [ ] Samsung Internet
- [ ] Firefox Mobile

### Testing Steps
1. **Authentication Flow**
   - [ ] Login works on all browsers
   - [ ] Logout works correctly
   - [ ] Session persistence

2. **Responsive Design**
   - [ ] Mobile navigation works
   - [ ] Touch targets are appropriate (44px minimum)
   - [ ] Content is readable on small screens
   - [ ] No horizontal scrolling

3. **Core Functionality**
   - [ ] Dashboard loads correctly
   - [ ] Course management works
   - [ ] Notifications display properly
   - [ ] Real-time updates function

## 📱 Mobile Compatibility Verification

### Screen Sizes to Test
- **Mobile Portrait**: 320px - 414px
- **Mobile Landscape**: 568px - 896px
- **Tablet Portrait**: 768px - 834px
- **Tablet Landscape**: 1024px - 1112px

### Mobile-Specific Features
- [ ] Touch gestures work properly
- [ ] Viewport meta tag is correct
- [ ] Safe area insets are handled
- [ ] PWA features work (if enabled)
- [ ] Offline functionality (if implemented)

## 🔧 Environment Configuration

### Production Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your-google-analytics-id

# Optional: Error Tracking
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### Build Configuration

Ensure your `next.config.js` is optimized for production:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // Set to true only if needed
  },
  typescript: {
    ignoreBuildErrors: false, // Set to true only if needed
  },
  images: {
    domains: ['your-supabase-project.supabase.co'],
  },
  // Enable compression
  compress: true,
  // Enable experimental features if needed
  experimental: {
    optimizeCss: true,
  },
}

module.exports = nextConfig
```

## 🚀 Alternative Deployment Platforms

### Netlify

1. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: 18+

2. **Environment Variables**
   - Add the same variables as Vercel

3. **Redirects** (create `_redirects` file in public/)
   ```
   /*    /index.html   200
   ```

### AWS Amplify

1. **Build Settings**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

### Railway

1. **Deploy from GitHub**
   - Connect your repository
   - Railway will auto-detect Next.js

2. **Environment Variables**
   - Add in Railway dashboard

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["npm", "start"]
```

## 🔍 Performance Optimization

### Before Deployment

1. **Bundle Analysis**
   ```bash
   npm run analyze
   ```

2. **Lighthouse Audit**
   - Run on multiple pages
   - Aim for 90+ scores

3. **Image Optimization**
   - Use Next.js Image component
   - Optimize images before upload

### Post-Deployment

1. **Monitor Performance**
   - Set up monitoring (Vercel Analytics, Google Analytics)
   - Monitor Core Web Vitals

2. **CDN Configuration**
   - Ensure static assets are cached
   - Configure proper cache headers

## 🛡️ Security Checklist

- [ ] Environment variables are secure
- [ ] No sensitive data in client-side code
- [ ] HTTPS is enforced
- [ ] CSP headers are configured (if needed)
- [ ] Rate limiting is in place (Supabase handles this)

## 🔄 CI/CD Pipeline (Optional)

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📊 Monitoring & Analytics

### Recommended Tools

1. **Vercel Analytics** (if using Vercel)
2. **Google Analytics 4**
3. **Sentry** for error tracking
4. **LogRocket** for user session recording

### Setup Example

```typescript
// lib/analytics.ts
export const trackEvent = (eventName: string, properties?: any) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties)
  }
}
```

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors
   - Verify environment variables
   - Check for missing dependencies

2. **Runtime Errors**
   - Check browser console
   - Verify API endpoints
   - Check Supabase connection

3. **Mobile Issues**
   - Test on actual devices
   - Check viewport meta tag
   - Verify touch interactions

### Support Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

---

**Ready to deploy? Follow this checklist and your SlateLMS will be live and accessible across all browsers and devices!**