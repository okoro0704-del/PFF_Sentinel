/**
 * PFF Sentinel — Download Portal
 * ZKTeco SDK integration, hardware detection, QR code generation, and PWA install
 */

// Download URLs (configure these for your actual distribution)
const DOWNLOAD_URLS = {
  mobile: {
    android: 'https://example.com/sentinel-mobile.apk',
    ios: 'https://apps.apple.com/app/sentinel-mobile',
    default: 'https://example.com/sentinel-mobile'
  },
  desktop: {
    windows: '/binaries/Sentinel_Desktop_Bundle.zip',
    mac: '/binaries/Sentinel_Desktop_Bundle.zip',
    linux: '/binaries/Sentinel_Desktop_Bundle.zip',
    default: '/binaries/Sentinel_Desktop_Bundle.zip'
  },
  drivers: 'https://www.zkteco.com/en/download_detail/id/158.html'
};

// ZKTeco SDK Configuration
const ZKTECO_CONFIG = {
  serviceName: 'ZKBioOnline',
  checkInterval: 5000, // Check every 5 seconds
  wsPort: 8088, // Default ZKTeco WebSocket port
  httpPort: 8089 // Default ZKTeco HTTP port
};

let hardwareCheckInterval = null;
let deferredPrompt = null;

// DOM Elements
const btnDownloadMobile = document.getElementById('btnDownloadMobile');
const btnDownloadDesktop = document.getElementById('btnDownloadDesktop');
const btnDriverInstaller = document.getElementById('btnDriverInstaller');
const btnInstallPwa = document.getElementById('btnInstallPwa');
const hardwareSection = document.getElementById('hardwareSection');
const hardwareStatus = document.getElementById('hardwareStatus');
const hardwareWarning = document.getElementById('hardwareWarning');
const statusIcon = document.getElementById('statusIcon');
const statusTitle = document.getElementById('statusTitle');
const statusMessage = document.getElementById('statusMessage');
const qrSection = document.getElementById('qrSection');
const qrCode = document.getElementById('qrCode');
const pwaSection = document.getElementById('pwaSection');

/**
 * Initialize the download portal
 */
function init() {
  setupDownloadButtons();
  setupPWA();
  
  // Only run hardware checks on desktop
  if (isDesktop()) {
    checkHardware();
    startHardwareMonitoring();
    generateQRCode();
  } else {
    // Hide desktop-only sections on mobile
    if (hardwareSection) hardwareSection.classList.add('hidden');
    if (qrSection) qrSection.classList.add('hidden');
  }
}

/**
 * Check if user is on desktop (not mobile)
 */
function isDesktop() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  return !isMobile && window.innerWidth >= 769;
}

/**
 * Setup download button handlers
 */
function setupDownloadButtons() {
  if (btnDownloadMobile) {
    btnDownloadMobile.addEventListener('click', () => {
      const url = getMobileDownloadUrl();
      window.location.href = url;
    });
  }

  if (btnDownloadDesktop) {
    btnDownloadDesktop.addEventListener('click', () => {
      const url = getDesktopDownloadUrl();
      window.location.href = url;
    });
  }

  if (btnDriverInstaller) {
    btnDriverInstaller.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(DOWNLOAD_URLS.drivers, '_blank');
    });
  }
}

/**
 * Get mobile download URL based on platform
 */
function getMobileDownloadUrl() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/android/i.test(userAgent)) {
    return DOWNLOAD_URLS.mobile.android;
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    return DOWNLOAD_URLS.mobile.ios;
  }
  return DOWNLOAD_URLS.mobile.default;
}

/**
 * Get desktop download URL based on platform
 */
function getDesktopDownloadUrl() {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('win')) {
    return DOWNLOAD_URLS.desktop.windows;
  } else if (platform.includes('mac')) {
    return DOWNLOAD_URLS.desktop.mac;
  } else if (platform.includes('linux')) {
    return DOWNLOAD_URLS.desktop.linux;
  }
  return DOWNLOAD_URLS.desktop.default;
}

/**
 * Check ZKTeco hardware status
 */
async function checkHardware() {
  updateStatus('checking', '🔍', 'Checking Hardware...', 'Detecting ZKTeco fingerprint scanner...');

  try {
    // Method 1: Try WebSocket connection to ZKBioOnline service
    const wsConnected = await checkZKTecoWebSocket();
    
    if (wsConnected) {
      updateStatus('online', '✅', 'Hardware Online', 'ZKTeco fingerprint scanner detected and ready.');
      hideWarning();
      return true;
    }

    // Method 2: Try HTTP API
    const httpConnected = await checkZKTecoHTTP();
    
    if (httpConnected) {
      updateStatus('online', '✅', 'Hardware Online', 'ZKTeco fingerprint scanner detected via HTTP.');
      hideWarning();
      return true;
    }

    // Hardware not detected
    updateStatus('offline', '❌', 'Hardware Offline', 'ZKTeco fingerprint scanner not detected.');
    showWarning();
    return false;

  } catch (error) {
    console.error('Hardware check error:', error);
    updateStatus('offline', '❌', 'Hardware Offline', 'Unable to detect ZKTeco scanner.');
    showWarning();
    return false;
  }
}

/**
 * Check ZKTeco via WebSocket
 */
function checkZKTecoWebSocket() {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(`ws://localhost:${ZKTECO_CONFIG.wsPort}`);
      
      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 3000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };

    } catch (error) {
      resolve(false);
    }
  });
}

/**
 * Check ZKTeco via HTTP API
 */
async function checkZKTecoHTTP() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`http://localhost:${ZKTECO_CONFIG.httpPort}/api/status`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeout);
    return response.ok;

  } catch (error) {
    return false;
  }
}

/**
 * Update hardware status display
 */
function updateStatus(state, icon, title, message) {
  if (!hardwareStatus) return;

  hardwareStatus.className = `status-card ${state}`;
  if (statusIcon) statusIcon.textContent = icon;
  if (statusTitle) statusTitle.textContent = title;
  if (statusMessage) statusMessage.textContent = message;
}

/**
 * Show hardware warning
 */
function showWarning() {
  if (hardwareWarning) {
    hardwareWarning.classList.remove('hidden');
  }
}

/**
 * Hide hardware warning
 */
function hideWarning() {
  if (hardwareWarning) {
    hardwareWarning.classList.add('hidden');
  }
}

/**
 * Start continuous hardware monitoring
 */
function startHardwareMonitoring() {
  if (hardwareCheckInterval) {
    clearInterval(hardwareCheckInterval);
  }

  hardwareCheckInterval = setInterval(() => {
    checkHardware();
  }, ZKTECO_CONFIG.checkInterval);
}

/**
 * Stop hardware monitoring
 */
function stopHardwareMonitoring() {
  if (hardwareCheckInterval) {
    clearInterval(hardwareCheckInterval);
    hardwareCheckInterval = null;
  }
}

/**
 * Generate QR code for mobile download
 * Uses a simple QR code generation approach
 */
function generateQRCode() {
  if (!qrCode) return;

  const mobileUrl = DOWNLOAD_URLS.mobile.default;

  // Use Google Charts API for QR code generation (simple, no dependencies)
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(mobileUrl)}`;

  const img = document.createElement('img');
  img.src = qrApiUrl;
  img.alt = 'QR Code for Sentinel Mobile Download';
  img.style.width = '240px';
  img.style.height = '240px';
  img.style.display = 'block';

  qrCode.innerHTML = '';
  qrCode.appendChild(img);
}

/**
 * Setup PWA installation
 */
function setupPWA() {
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install button
    showPWAPrompt();
  });

  // Handle install button click
  if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
      if (!deferredPrompt) {
        return;
      }

      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      } else {
        console.log('User dismissed the PWA install prompt');
      }

      // Clear the deferredPrompt
      deferredPrompt = null;
      hidePWAPrompt();
    });
  }

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed successfully');
    hidePWAPrompt();
  });

  // Check if already installed (standalone mode)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('PWA is already installed');
    hidePWAPrompt();
  }
}

/**
 * Show PWA install prompt
 */
function showPWAPrompt() {
  if (pwaSection) {
    pwaSection.classList.remove('hidden');
  }
}

/**
 * Hide PWA install prompt
 */
function hidePWAPrompt() {
  if (pwaSection) {
    pwaSection.classList.add('hidden');
  }
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
  stopHardwareMonitoring();
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

