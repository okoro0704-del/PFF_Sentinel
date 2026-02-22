/**
 * PFF Sentinel — QR Handshake UI
 * Generate and scan QR codes for satellite device linking
 */

import { generateSatelliteJoinToken, joinSatelliteDevice } from './SatelliteDeviceRegistry.js';
import { getDeviceUUID } from './hardware-sync.js';

// ============================================
// QR HANDSHAKE UI
// ============================================

/**
 * Initialize QR Handshake UI
 * @param {string} containerId - Container element ID
 */
export async function initializeQRHandshakeUI(containerId = 'qrHandshakeContainer') {
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.warn('⚠️ QR Handshake container not found');
    return;
  }

  renderQRHandshakeUI(container);
}

/**
 * Render QR Handshake UI
 * @param {HTMLElement} container - Container element
 */
function renderQRHandshakeUI(container) {
  container.innerHTML = `
    <div class="qr-handshake-panel">
      <h2 style="margin: 0 0 16px 0; font-size: 24px;">📱 QR Handshake</h2>
      <p style="opacity: 0.8; margin: 0 0 24px 0;">
        Link a new satellite device to your fleet using encrypted QR code.
      </p>

      <!-- Generate QR Code Section -->
      <div class="qr-generate-section">
        <h3 style="font-size: 18px; margin: 0 0 12px 0;">Generate Join Token</h3>
        <p style="opacity: 0.7; font-size: 14px; margin: 0 0 16px 0;">
          Generate a temporary encrypted QR code that allows a new device to join your fleet.
        </p>
        <button id="btnGenerateQR" class="btn btn-primary" style="width: 100%;">
          🔐 Generate QR Code
        </button>
        
        <div id="qrCodeDisplay" style="display: none; margin-top: 24px;">
          <div style="background: white; padding: 24px; border-radius: 12px; text-align: center;">
            <div id="qrCodeCanvas" style="margin: 0 auto;"></div>
            <p style="margin: 16px 0 0 0; color: #1f2937; font-weight: bold;">
              Scan with satellite device
            </p>
            <p id="qrExpiryTime" style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;"></p>
          </div>
        </div>
      </div>

      <!-- Scan QR Code Section (Mobile Only) -->
      <div class="qr-scan-section" style="margin-top: 32px; display: none;" id="qrScanSection">
        <h3 style="font-size: 18px; margin: 0 0 12px 0;">Scan Join Token</h3>
        <p style="opacity: 0.7; font-size: 14px; margin: 0 0 16px 0;">
          Scan the QR code from your primary device to join this device to your fleet.
        </p>
        <button id="btnScanQR" class="btn btn-secondary" style="width: 100%;">
          📷 Scan QR Code
        </button>
        
        <div id="qrScannerDisplay" style="display: none; margin-top: 24px;">
          <video id="qrScannerVideo" style="width: 100%; border-radius: 12px;"></video>
          <button id="btnStopScan" class="btn btn-danger" style="width: 100%; margin-top: 12px;">
            ⏹️ Stop Scanning
          </button>
        </div>
      </div>
    </div>
  `;

  // Add event listeners
  const btnGenerateQR = document.getElementById('btnGenerateQR');
  const btnScanQR = document.getElementById('btnScanQR');
  const btnStopScan = document.getElementById('btnStopScan');

  if (btnGenerateQR) {
    btnGenerateQR.addEventListener('click', handleGenerateQR);
  }

  if (btnScanQR) {
    btnScanQR.addEventListener('click', handleScanQR);
  }

  if (btnStopScan) {
    btnStopScan.addEventListener('click', handleStopScan);
  }

  // Show scan section on mobile devices
  if (isMobileDevice()) {
    const scanSection = document.getElementById('qrScanSection');
    if (scanSection) {
      scanSection.style.display = 'block';
    }
  }
}

/**
 * Handle Generate QR button click
 */
async function handleGenerateQR() {
  const btn = document.getElementById('btnGenerateQR');
  const qrCodeDisplay = document.getElementById('qrCodeDisplay');
  const qrCodeCanvas = document.getElementById('qrCodeCanvas');
  const qrExpiryTime = document.getElementById('qrExpiryTime');

  if (btn) {
    btn.textContent = '🔄 Generating...';
    btn.disabled = true;
  }

  try {
    const result = await generateSatelliteJoinToken();

    if (!result.success) {
      throw new Error(result.message);
    }

    // Generate QR code using API
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(result.qrData)}`;

    const img = document.createElement('img');
    img.src = qrApiUrl;
    img.alt = 'Satellite Join QR Code';
    img.style.width = '300px';
    img.style.height = '300px';
    img.style.display = 'block';

    qrCodeCanvas.innerHTML = '';
    qrCodeCanvas.appendChild(img);

    // Show expiry time
    const expiryDate = new Date(result.expiresAt);
    qrExpiryTime.textContent = `Expires at ${expiryDate.toLocaleTimeString()}`;

    // Show QR code display
    qrCodeDisplay.style.display = 'block';

    // Auto-hide after expiry
    const expiryMs = expiryDate.getTime() - Date.now();
    setTimeout(() => {
      qrCodeDisplay.style.display = 'none';
      alert('⏰ QR code has expired. Generate a new one to link a device.');
    }, expiryMs);

    console.log('✅ QR code generated successfully');

  } catch (error) {
    console.error('❌ Failed to generate QR code:', error);
    alert('❌ Failed to generate QR code: ' + error.message);
  } finally {
    if (btn) {
      btn.textContent = '🔐 Generate QR Code';
      btn.disabled = false;
    }
  }
}

/**
 * Handle Scan QR button click
 */
async function handleScanQR() {
  alert('📷 QR Scanner\n\nQR scanning requires camera access.\n\nFor now, please manually enter the QR data or use a QR scanner app.');
  
  // TODO: Implement camera-based QR scanning
  // This would require a QR scanning library like jsQR or html5-qrcode
}

/**
 * Handle Stop Scan button click
 */
function handleStopScan() {
  const qrScannerDisplay = document.getElementById('qrScannerDisplay');
  if (qrScannerDisplay) {
    qrScannerDisplay.style.display = 'none';
  }
}

/**
 * Check if device is mobile
 * @returns {boolean}
 */
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

