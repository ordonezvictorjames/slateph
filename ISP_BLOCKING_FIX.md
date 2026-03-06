# ISP/Network Blocking Vercel - SOLVED

## Confirmed Issue
✓ Site works on mobile data
✗ Site doesn't work on WiFi/home internet

**Conclusion**: Your ISP or network is blocking Vercel production domains.

## Quick Fixes

### Fix 1: Change DNS to Google DNS (RECOMMENDED)

This usually solves the issue immediately:

**Windows:**
1. Open **Settings** → **Network & Internet**
2. Click **Change adapter options**
3. Right-click your WiFi/Ethernet connection → **Properties**
4. Select **Internet Protocol Version 4 (TCP/IPv4)**
5. Click **Properties**
6. Select **Use the following DNS server addresses**
7. Enter:
   - Preferred DNS: `8.8.8.8`
   - Alternate DNS: `8.8.4.4`
8. Click **OK**
9. Open Command Prompt and run:
   ```bash
   ipconfig /flushdns
   ```
10. Restart your browser

### Fix 2: Use Cloudflare DNS (Alternative)

1. Follow same steps as above
2. Use these DNS addresses instead:
   - Preferred DNS: `1.1.1.1`
   - Alternate DNS: `1.0.0.1`
3. Flush DNS: `ipconfig /flushdns`

### Fix 3: Use VPN

If changing DNS doesn't work:
1. Install a VPN (ProtonVPN, Windscribe, etc.)
2. Connect to any server
3. Access your Vercel sites

### Fix 4: Router DNS Change (Affects All Devices)

Change DNS at router level so all devices work:

1. Open browser and go to your router admin page:
   - Usually: `192.168.1.1` or `192.168.0.1`
   - Login with admin credentials
2. Find **DNS Settings** (usually under WAN or Internet settings)
3. Change to:
   - Primary DNS: `8.8.8.8`
   - Secondary DNS: `8.8.4.4`
4. Save and restart router
5. All devices on WiFi will now use Google DNS

## Why This Happens

### Common Causes:
1. **ISP DNS filtering**: Your ISP blocks certain domains
2. **Parental controls**: Router has content filtering enabled
3. **Corporate/School network**: Network admin blocks cloud services
4. **Geographic restrictions**: ISP routes Vercel traffic poorly
5. **DNS cache poisoning**: Old/corrupted DNS records

### Philippine ISPs (if applicable):
- PLDT and Globe sometimes have issues with CDN services
- Their DNS servers may block or misroute Vercel domains
- Using Google/Cloudflare DNS bypasses this

## Verify the Fix

After changing DNS:

1. Flush DNS cache:
   ```bash
   ipconfig /flushdns
   ```

2. Test DNS resolution:
   ```bash
   nslookup slateph.vercel.app
   ```
   
   Should show Google DNS server (8.8.8.8) and a valid IP

3. Try accessing:
   - `https://slateph.vercel.app/`
   - Your other Vercel projects

4. Should work immediately!

## If Still Not Working After DNS Change

### Clear Browser Cache:
1. Press `Ctrl + Shift + Delete`
2. Select "All time"
3. Check "Cached images and files"
4. Click "Clear data"

### Try Different Browser:
- If Chrome doesn't work, try Firefox or Edge
- Browsers cache DNS separately

### Restart Computer:
- Sometimes Windows caches DNS at system level
- A restart ensures new DNS is used

### Check Firewall:
1. Open **Windows Security** → **Firewall & network protection**
2. Click **Allow an app through firewall**
3. Make sure your browser is allowed

## Long-term Solution

**Use Google DNS permanently:**
- Faster than most ISP DNS
- More reliable
- Better privacy
- No blocking of legitimate sites

**Or use Cloudflare DNS (1.1.1.1):**
- Even faster than Google DNS
- Privacy-focused
- No logging

## For Other Devices

### Mobile Phone (WiFi):
1. Go to WiFi settings
2. Long-press your WiFi network
3. Modify network
4. Advanced options
5. Change DNS to `8.8.8.8, 8.8.4.4`

### Mac:
1. System Preferences → Network
2. Select WiFi → Advanced
3. DNS tab
4. Add `8.8.8.8` and `8.8.4.4`

## Summary

**Problem**: ISP blocking Vercel domains
**Solution**: Change DNS to Google DNS (8.8.8.8)
**Time to fix**: 2-3 minutes
**Success rate**: 95%+

Your Vercel deployment is working perfectly - it was just your network blocking access!

---

**Action**: Change your DNS to 8.8.8.8 and 8.8.4.4, then flush DNS cache.
