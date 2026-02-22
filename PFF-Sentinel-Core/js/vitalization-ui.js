/**
 * PFF Sentinel — Vitalization UI Module
 * Displays Vitalization status and VIDA CAP information in the UI
 */

import { checkVitalizationStatus } from './vitalization-client.js';
import { getDeviceId } from './handshake-core.js';

// ============================================
// UI DISPLAY FUNCTIONS
// ============================================

/**
 * Display Vitalization status in the UI
 * @param {HTMLElement} container - Container element to display status
 */
export async function displayVitalizationStatus(container) {
  if (!container) {
    console.warn('⚠️ Vitalization status container not found');
    return;
  }

  try {
    const status = await checkVitalizationStatus();

    if (status.vitalized) {
      container.innerHTML = `
        <div class="vitalization-status vitalized" style="
          background: linear-gradient(135deg, #10b981, #059669);
          border: 2px solid #34d399;
          border-radius: 12px;
          padding: 20px;
          color: white;
          margin: 20px 0;
          box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
        ">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <span style="font-size: 36px;">✅</span>
            <div>
              <h3 style="margin: 0; font-size: 20px;">Vitalized Citizen</h3>
              <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">
                Authorized by Sentinel on ${new Date(status.vitalizedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div style="
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            padding: 16px;
            margin-top: 12px;
          ">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
              <div>
                <p style="margin: 0; opacity: 0.8; font-size: 12px;">Total VIDA CAP</p>
                <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: bold;">${status.vidaCap.total}</p>
              </div>
              <div>
                <p style="margin: 0; opacity: 0.8; font-size: 12px;">Spendable</p>
                <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: bold; color: #34d399;">$${status.vidaCap.spendable}</p>
              </div>
              <div>
                <p style="margin: 0; opacity: 0.8; font-size: 12px;">Locked</p>
                <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: bold; color: #fbbf24;">$${status.vidaCap.locked}</p>
              </div>
            </div>
          </div>
          
          <div style="
            margin-top: 12px;
            padding: 12px;
            background: rgba(0,0,0,0.15);
            border-radius: 6px;
            font-family: monospace;
            font-size: 11px;
            word-break: break-all;
          ">
            <p style="margin: 0; opacity: 0.7;">Vitalization ID:</p>
            <p style="margin: 4px 0 0 0;">${status.vitalizationId}</p>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="vitalization-status not-vitalized" style="
          background: linear-gradient(135deg, #6b7280, #4b5563);
          border: 2px solid #9ca3af;
          border-radius: 12px;
          padding: 20px;
          color: white;
          margin: 20px 0;
          box-shadow: 0 8px 32px rgba(107, 114, 128, 0.3);
        ">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <span style="font-size: 36px;">⏳</span>
            <div>
              <h3 style="margin: 0; font-size: 20px;">Not Yet Vitalized</h3>
              <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">
                Complete Four-Pillar verification to receive 5 VIDA CAP
              </p>
            </div>
          </div>
          
          <div style="
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            padding: 16px;
            margin-top: 12px;
          ">
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">
              📍 <strong>Step 1:</strong> Complete GPS verification<br>
              📱 <strong>Step 2:</strong> Bind device UUID<br>
              👤 <strong>Step 3:</strong> Capture Face biometric<br>
              👆 <strong>Step 4:</strong> Capture Fingerprint biometric<br>
              🛡️ <strong>Step 5:</strong> Sentinel will authorize your citizenship
            </p>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('❌ Failed to display Vitalization status:', error);
    container.innerHTML = `
      <div class="vitalization-status error" style="
        background: linear-gradient(135deg, #dc2626, #991b1b);
        border: 2px solid #ef4444;
        border-radius: 12px;
        padding: 20px;
        color: white;
        margin: 20px 0;
      ">
        <p style="margin: 0;">❌ Failed to load Vitalization status</p>
        <p style="margin: 8px 0 0 0; opacity: 0.8; font-size: 14px;">${error.message}</p>
      </div>
    `;
  }
}

/**
 * Show Vitalization success notification
 * @param {Object} vitalizationProof - Vitalization proof object
 * @param {Object} vidaCap - VIDA CAP object
 */
export function showVitalizationSuccess(vitalizationProof, vidaCap) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'vitalization-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #10b981, #059669);
    border: 2px solid #34d399;
    border-radius: 12px;
    padding: 24px;
    color: white;
    box-shadow: 0 8px 32px rgba(16, 185, 129, 0.5);
    z-index: 10000;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <span style="font-size: 48px;">🎉</span>
      <div>
        <h3 style="margin: 0; font-size: 22px;">Vitalization Successful!</h3>
        <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">
          You are now a PFF Citizen
        </p>
      </div>
    </div>
    
    <div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 16px; margin-top: 12px;">
      <p style="margin: 0; font-size: 16px; font-weight: bold;">5 VIDA CAP Received</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
        <div>
          <p style="margin: 0; opacity: 0.8; font-size: 12px;">Spendable</p>
          <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: bold; color: #34d399;">$${vidaCap.spendable}</p>
        </div>
        <div>
          <p style="margin: 0; opacity: 0.8; font-size: 12px;">Locked</p>
          <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: bold; color: #fbbf24;">$${vidaCap.locked}</p>
        </div>
      </div>
    </div>
    
    <button onclick="this.parentElement.remove()" style="
      margin-top: 16px;
      width: 100%;
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      padding: 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    ">
      Close
    </button>
  `;

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  // Add to page
  document.body.appendChild(notification);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 10000);
}

// ============================================
// EXPORT
// ============================================

export const VitalizationUI = {
  displayVitalizationStatus,
  showVitalizationSuccess
};

