# PWA Setup Instructions

## Manual Steps to Complete PWA Integration

### 1. Update index.html

Add the following lines to the `<head>` section of `index.html` (after line 5):

```html
<meta name="theme-color" content="#0f172a" />
<meta name="description" content="PFF Sovereign Handshake v2.0 - 4-layer biometric authentication" />
<link rel="manifest" href="/manifest.json" />
```

The complete `<head>` section should look like:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0f172a" />
  <meta name="description" content="PFF Sovereign Handshake v2.0 - 4-layer biometric authentication" />
  <title>PFF Sovereign Handshake v2.0</title>
  <link rel="manifest" href="/manifest.json" />
  <link rel="stylesheet" href="/css/sovereign-handshake.css" />
</head>
```

### 2. Update Service Worker Registration in index.html

The existing service worker registration in `js/app.js` (around line 240) should remain as is for Lock_Command functionality. The download portal uses a separate enhanced service worker (`sw-enhanced.js`).

### 3. Generate PWA Icons

Open `public/icons/generate-placeholder-icons.html` in a browser and:

1. Click "Generate Placeholder Icons"
2. Download each icon with the correct filename:
   - icon-72x72.png
   - icon-96x96.png
   - icon-128x128.png
   - icon-144x144.png
   - icon-152x152.png
   - icon-192x192.png
   - icon-384x384.png
   - icon-512x512.png
3. Save all icons to the `public/icons/` directory

Alternatively, use an online tool like [PWA Builder](https://www.pwabuilder.com/imageGenerator) to create professional icons.

### 4. Test the Download Portal

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5173/download.html`

3. Test features:
   - ✅ Download buttons work
   - ✅ Hardware detection runs (desktop only)
   - ✅ QR code displays (desktop only)
   - ✅ PWA install prompt appears (if supported)
   - ✅ Responsive design on mobile

### 5. Test PWA Installation

On Chrome/Edge:
1. Open the download portal
2. Look for the install icon in the address bar
3. Or click the "Install Portal" button when it appears
4. Confirm installation
5. The portal should open as a standalone app

### 6. Configure Download URLs

Edit `js/download-portal.js` and update the `DOWNLOAD_URLS` object with your actual download links:

```javascript
const DOWNLOAD_URLS = {
  mobile: {
    android: 'https://your-domain.com/sentinel-mobile.apk',
    ios: 'https://apps.apple.com/app/your-app-id',
    default: 'https://your-domain.com/sentinel-mobile'
  },
  desktop: {
    windows: 'https://your-domain.com/sentinel-desktop-windows.exe',
    mac: 'https://your-domain.com/sentinel-desktop-mac.dmg',
    linux: 'https://your-domain.com/sentinel-desktop-linux.AppImage',
    default: 'https://your-domain.com/sentinel-desktop'
  },
  drivers: 'https://www.zkteco.com/en/download_detail/id/158.html'
};
```

## Verification Checklist

- [ ] Manifest link added to index.html
- [ ] Theme color meta tag added to index.html
- [ ] PWA icons generated and placed in public/icons/
- [ ] Download portal accessible at /download.html
- [ ] Hardware detection working (if ZKTeco service running)
- [ ] QR code displaying on desktop
- [ ] PWA installable in supported browsers
- [ ] Download URLs configured
- [ ] Responsive design tested on mobile and desktop
- [ ] Service worker caching working offline

## Troubleshooting

### PWA Not Installing
- Ensure you're using HTTPS or localhost
- Check browser console for manifest errors
- Verify all icon files exist
- Clear browser cache and try again

### Hardware Detection Not Working
- Ensure ZKBioOnline service is running
- Check ports 8088 and 8089 are not blocked
- Verify you're on desktop (not mobile)
- Check browser console for connection errors

### QR Code Not Showing
- Ensure you're on desktop (hidden on mobile)
- Check internet connection (uses external API)
- Verify the QR section is not hidden by CSS

## Production Deployment

For production deployment:

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy the `dist/` folder to your web server

3. Ensure HTTPS is enabled (required for PWA)

4. Update download URLs to production endpoints

5. Replace placeholder icons with branded icons

6. Test PWA installation on production domain

7. Consider self-hosting the QR code generation instead of using external API

