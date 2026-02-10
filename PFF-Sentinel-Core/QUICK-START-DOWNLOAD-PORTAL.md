# 🚀 Quick Start - Sentinel Download Portal

## Instant Setup (3 Steps)

### Step 1: Start the Server
```bash
cd PFF-Sentinel-Core
npm run dev
```

### Step 2: Open the Portal
Navigate to: **http://localhost:5173/download.html**

### Step 3: Test Features
- ✅ Click download buttons (mobile/desktop)
- ✅ Check hardware status (desktop only)
- ✅ View QR code (desktop only)
- ✅ Install as PWA (if supported)

---

## 📋 What You'll See

### On Desktop
1. **Two Download Buttons**:
   - 🔵 Download Sentinel Mobile (blue)
   - 🟣 Download Desktop Hardware Bridge (purple)

2. **Hardware Status Section**:
   - Shows ZKTeco scanner detection status
   - Displays warning if hardware offline
   - Provides driver download link

3. **QR Code Section**:
   - Scan with phone to download mobile app
   - Auto-generated from download URL

4. **PWA Install Prompt**:
   - "Install Portal" button appears when available
   - Add to home screen for offline access

### On Mobile
1. **Download Buttons** (responsive, single column)
2. **PWA Install** (if supported by browser)
3. Hardware and QR sections are hidden

---

## ⚙️ Configuration

### Update Download URLs

Edit `js/download-portal.js` (lines 7-20):

```javascript
const DOWNLOAD_URLS = {
  mobile: {
    android: 'YOUR_APK_URL',
    ios: 'YOUR_APP_STORE_URL',
    default: 'YOUR_MOBILE_URL'
  },
  desktop: {
    windows: 'YOUR_EXE_URL',
    mac: 'YOUR_DMG_URL',
    linux: 'YOUR_APPIMAGE_URL',
    default: 'YOUR_DESKTOP_URL'
  },
  drivers: 'ZKTECO_DRIVER_URL'
};
```

### Customize ZKTeco Settings

Edit `js/download-portal.js` (lines 23-28):

```javascript
const ZKTECO_CONFIG = {
  serviceName: 'ZKBioOnline',
  checkInterval: 5000,  // Check every 5 seconds
  wsPort: 8088,         // WebSocket port
  httpPort: 8089        // HTTP API port
};
```

---

## 🎨 Customize Appearance

### Change Colors

Edit `css/download-portal.css` (lines 8-20):

```css
:root {
  --accent-mobile: #3b82f6;      /* Mobile button */
  --accent-desktop: #8b5cf6;     /* Desktop button */
  --bg-primary: #0f172a;         /* Background */
  --text-primary: #f1f5f9;       /* Text */
}
```

### Modify Layout

- **Breakpoint**: 768px (mobile/desktop switch)
- **Grid**: Auto-fit columns, min 300px
- **Responsive**: Mobile-first design

---

## 📱 Generate PWA Icons

### Option 1: Use Built-in Generator
1. Open: `public/icons/generate-placeholder-icons.html`
2. Click "Generate Placeholder Icons"
3. Download all 8 sizes
4. Save to `public/icons/`

### Option 2: Online Tools
- [PWA Builder](https://www.pwabuilder.com/imageGenerator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

### Required Sizes
72, 96, 128, 144, 152, 192, 384, 512 pixels

---

## 🔧 Test Hardware Detection

### Prerequisites
1. Install ZKBioOnline service
2. Ensure service is running
3. Verify ports 8088/8089 are open

### Expected Behavior
- **Online**: ✅ Green status, "Hardware Online"
- **Offline**: ❌ Red status, warning with driver link
- **Checking**: 🔍 Blue status, "Checking Hardware..."

### Troubleshooting
- Check if ZKBioOnline is running
- Verify firewall settings
- Test on desktop browser (not mobile)
- Check browser console for errors

---

## 🌐 Deploy to Production

### Build for Production
```bash
npm run build
```

### Deploy Steps
1. Upload `dist/` folder to web server
2. Enable HTTPS (required for PWA)
3. Update download URLs to production
4. Replace placeholder icons with branded icons
5. Test PWA installation on production domain

### Production Checklist
- [ ] HTTPS enabled
- [ ] Download URLs updated
- [ ] Custom icons created
- [ ] Service worker registered
- [ ] Manifest accessible
- [ ] All features tested

---

## 📚 Documentation

- **Complete Guide**: `docs/DOWNLOAD-PORTAL.md`
- **PWA Setup**: `SETUP-PWA.md`
- **Summary**: `DOWNLOAD-PORTAL-SUMMARY.md`
- **Icon Guide**: `public/icons/README.md`

---

## 🎯 Key Features

✅ Responsive download page  
✅ High-contrast buttons (mobile/desktop)  
✅ ZKTeco hardware detection  
✅ Hardware offline warning  
✅ QR code generator  
✅ PWA installable  
✅ Offline support  
✅ Platform detection  
✅ Modern UI/UX  

---

## 🆘 Need Help?

1. Check browser console for errors
2. Verify all files are in correct locations
3. Ensure development server is running
4. Review documentation files
5. Test on different browsers/devices

---

## 🎉 You're Ready!

The Sentinel Download Portal is fully functional and ready to use. Start the dev server and navigate to `/download.html` to see it in action!

