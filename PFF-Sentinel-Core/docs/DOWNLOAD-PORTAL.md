# Sentinel Distribution & Hardware Portal

Complete implementation of the PFF Sentinel Download Portal with PWA capabilities, ZKTeco hardware detection, and QR code generation.

## 🎯 Features Implemented

### ✅ 1. Download Page (`/download.html`)
- **Responsive Design**: Mobile-first, adapts to all screen sizes
- **Two High-Contrast Download Buttons**:
  - **Download Sentinel Mobile**: Blue gradient button for mobile app (Android/iOS)
  - **Download Desktop Hardware Bridge**: Purple gradient button for desktop app (Windows/macOS/Linux)
- **Platform Detection**: Automatically detects user's platform and provides appropriate download
- **Modern UI**: Dark theme with gradient backgrounds, smooth animations, and accessibility features

### ✅ 2. ZKTeco SDK Integration
- **Hardware Detection**: Automatically detects ZKTeco fingerprint scanner via:
  - WebSocket connection (`ws://localhost:8088`)
  - HTTP API fallback (`http://localhost:8089/api/status`)
- **Real-time Monitoring**: Checks hardware status every 5 seconds
- **Status Indicators**:
  - 🔍 Checking - Initial detection phase
  - ✅ Online - Hardware detected and ready
  - ❌ Offline - Hardware not detected
- **Desktop Only**: Hardware checks only run on desktop browsers (hidden on mobile)

### ✅ 3. Hardware Offline Warning
- **Conditional Display**: Shows warning card when scanner is not detected
- **Driver Download Link**: Direct link to ZKTeco driver installer
- **Clear Instructions**: Guides users to install drivers and connect hardware
- **Auto-Hide**: Warning disappears when hardware comes online

### ✅ 4. Progressive Web App (PWA)
- **Installable**: Users can install the portal to their home screen
- **Offline Support**: Service worker caches essential assets
- **Manifest**: Complete PWA manifest with app metadata
- **Install Prompt**: Shows install button when PWA is installable
- **Standalone Mode**: Runs as standalone app when installed
- **App Shortcuts**: Quick access to mobile download, desktop download, and main app

### ✅ 5. QR Code Generator
- **Desktop Only**: QR code section visible only on desktop browsers
- **Instant Download**: Scan QR code to download mobile app directly
- **API Integration**: Uses QR Server API for code generation
- **Responsive**: Adapts to different screen sizes
- **High Contrast**: White background for easy scanning

## 📁 Files Created

### HTML
- `download.html` - Main download portal page

### CSS
- `css/download-portal.css` - Complete styling with responsive design

### JavaScript
- `js/download-portal.js` - Core functionality:
  - Platform detection
  - Download URL routing
  - ZKTeco hardware detection (WebSocket + HTTP)
  - QR code generation
  - PWA install handling
  - Hardware monitoring

### PWA Assets
- `manifest.json` - PWA manifest with app metadata
- `sw-enhanced.js` - Enhanced service worker with caching
- `public/icons/` - Icon directory structure
- `public/icons/README.md` - Icon creation guide
- `public/icons/generate-placeholder-icons.html` - Icon generator tool

## 🚀 Usage

### Accessing the Portal

1. **Development Mode**:
   ```bash
   cd PFF-Sentinel-Core
   npm run dev
   ```
   Navigate to: `http://localhost:5173/download.html`

2. **Production Build**:
   ```bash
   npm run build
   npm run preview
   ```

### Installing as PWA

1. Open the download portal in a supported browser (Chrome, Edge, Safari)
2. Look for the install prompt or click the "Install Portal" button
3. The portal will be added to your home screen/app drawer
4. Access it like a native app with offline support

### Configuring Download URLs

Edit `js/download-portal.js` and update the `DOWNLOAD_URLS` object:

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

## 🔧 ZKTeco Integration

### Prerequisites

1. **ZKBioOnline Service**: Must be running on the user's machine
2. **Default Ports**:
   - WebSocket: `8088`
   - HTTP API: `8089`

### Configuration

Edit `js/download-portal.js` to customize ZKTeco settings:

```javascript
const ZKTECO_CONFIG = {
  serviceName: 'ZKBioOnline',
  checkInterval: 5000, // Check every 5 seconds
  wsPort: 8088,
  httpPort: 8089
};
```

### Detection Flow

1. **WebSocket Check**: Attempts to connect to `ws://localhost:8088`
2. **HTTP Fallback**: If WebSocket fails, tries HTTP API at `http://localhost:8089/api/status`
3. **Status Update**: Updates UI based on detection result
4. **Continuous Monitoring**: Repeats check every 5 seconds

## 📱 PWA Icons

### Generating Icons

1. **Option 1 - Use the Generator Tool**:
   - Open `public/icons/generate-placeholder-icons.html` in a browser
   - Click "Generate Placeholder Icons"
   - Download each icon with the correct filename

2. **Option 2 - Use Online Tools**:
   - [PWA Builder](https://www.pwabuilder.com/imageGenerator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)

3. **Option 3 - Design Custom Icons**:
   - Create a 512x512 source image
   - Use ImageMagick or similar to resize to all required sizes
   - Follow the design guidelines in `public/icons/README.md`

### Required Sizes
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

## 🎨 Customization

### Colors

Edit `css/download-portal.css` CSS variables:

```css
:root {
  --accent-mobile: #3b82f6;      /* Mobile button color */
  --accent-desktop: #8b5cf6;     /* Desktop button color */
  --bg-primary: #0f172a;         /* Background */
  --text-primary: #f1f5f9;       /* Text color */
}
```

### Layout

The portal uses CSS Grid for responsive layout. Breakpoint at 768px switches between mobile and desktop views.

## 🔗 Integration with Main App

Add links to the download portal from your main app:

```html
<a href="/download.html">Download Sentinel</a>
```

The portal includes footer links back to:
- Main Sentinel app (`/index.html`)
- Admin panel (`/admin.html`)

## 📊 Browser Support

- **Chrome/Edge**: Full support (PWA, WebSocket, QR codes)
- **Firefox**: Full support (PWA, WebSocket, QR codes)
- **Safari**: Full support (PWA, WebSocket, QR codes)
- **Mobile Browsers**: Responsive design, PWA install on supported platforms

## 🔒 Security Notes

- Hardware detection runs only on localhost (no external connections)
- Service worker caches only same-origin resources
- External QR code API is used (consider self-hosting for production)
- Download URLs should use HTTPS in production

## 📝 TODO / Future Enhancements

- [ ] Add actual download file hosting
- [ ] Implement version checking and update notifications
- [ ] Add download analytics
- [ ] Create custom PWA icons matching brand
- [ ] Add release notes section
- [ ] Implement automatic update detection
- [ ] Add support for beta/alpha channels
- [ ] Create admin panel for managing downloads

## 🆘 Troubleshooting

### Hardware Not Detected
1. Ensure ZKBioOnline service is running
2. Check if service is listening on ports 8088/8089
3. Verify firewall isn't blocking localhost connections
4. Try restarting the ZKTeco service

### PWA Not Installing
1. Ensure you're using HTTPS or localhost
2. Check that manifest.json is accessible
3. Verify service worker is registered
4. Check browser console for errors

### QR Code Not Showing
1. Check internet connection (uses external API)
2. Verify QR code section is visible (desktop only)
3. Check browser console for CORS errors

