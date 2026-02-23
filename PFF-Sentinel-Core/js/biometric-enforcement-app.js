/**
 * PFF Sentinel — Biometric Enforcement Dashboard App
 * Main application file for biometric enforcement UI
 */

import { initializeCitizenWallet, getCitizenWallet } from './SovereignWalletTriad.js';
import {
  downloadMDMProfile,
  activateBiometricEnforcement,
  checkBiometricSubscription
} from './BiometricEnforcement.js';
import { startBiometricDuressListener } from './BiometricDuressListener.js';
import { initializeSovereignUnlockUI } from './SovereignUnlockUI.js';
import { getProfile } from './supabase-client.js';
import { debugLog, debugError } from './debug-utils.js';

// DOM Elements
const enforcementStatusEl = document.getElementById('enforcementStatus');
const btnToggleEnforcement = document.getElementById('btnToggleEnforcement');
const btnDownloadMDM = document.getElementById('btnDownloadMDM');

// ============================================
// INITIALIZATION
// ============================================

async function initializeApp() {
  try {
    debugLog('🔐 Initializing Biometric Enforcement Dashboard...');

    // Initialize Citizen Wallet
    const result = await initializeCitizenWallet();

    if (!result.success) {
      enforcementStatusEl.innerHTML = `<p style="color: red;">Error: ${result.error}</p>`;
      return;
    }

    const wallet = getCitizenWallet();
    const profile = await getProfile(wallet.deviceId);

    // Load enforcement status
    await loadEnforcementStatus(wallet, profile);

    // Initialize Sovereign Unlock UI
    await initializeSovereignUnlockUI();

    // Start biometric duress listener
    startBiometricDuressListener();

    // Add event listeners
    btnToggleEnforcement.addEventListener('click', handleToggleEnforcement);
    btnDownloadMDM.addEventListener('click', handleDownloadMDM);

    // Listen for vault frozen events
    window.addEventListener('vault-frozen', handleVaultFrozen);

    debugLog('✅ Biometric Enforcement Dashboard initialized');
  } catch (error) {
    debugError('❌ Initialization failed:', error);
    enforcementStatusEl.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
  }
}

// ============================================
// ENFORCEMENT STATUS
// ============================================

async function loadEnforcementStatus(wallet, profile) {
  try {
    const subscription = await checkBiometricSubscription(wallet.address);
    const isEnabled = profile?.biometric_enforcement_enabled || false;

    let statusHTML = '';

    if (isEnabled) {
      statusHTML = `
        <div class="status-badge status-active">✅ Active</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Activated</div>
            <div class="info-value">${new Date(profile.biometric_enforcement_activated_at).toLocaleDateString()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Tier</div>
            <div class="info-value">${profile.biometric_enforcement_tier || 'N/A'}</div>
          </div>
        </div>
      `;
      btnToggleEnforcement.textContent = '🔓 Deactivate Enforcement';
      btnToggleEnforcement.classList.remove('btn-primary');
      btnToggleEnforcement.classList.add('btn-danger');
    } else {
      statusHTML = `
        <div class="status-badge status-inactive">❌ Inactive</div>
        <p style="margin: 16px 0 0 0; opacity: 0.8;">
          Biometric enforcement is not active. Activate to enable strict biometric-only authentication.
        </p>
        ${!subscription.active ? `
          <p style="margin: 12px 0 0 0; color: #ef4444; font-weight: bold;">
            ⚠️ Requires active VIDA subscription
          </p>
        ` : ''}
      `;
      btnToggleEnforcement.textContent = '🔐 Activate Enforcement';
      btnToggleEnforcement.classList.remove('btn-danger');
      btnToggleEnforcement.classList.add('btn-primary');
    }

    enforcementStatusEl.innerHTML = statusHTML;
    btnToggleEnforcement.style.display = 'block';
    btnToggleEnforcement.disabled = !subscription.active && !isEnabled;
  } catch (error) {
    debugError('❌ Failed to load enforcement status:', error);
    enforcementStatusEl.innerHTML = `<p style="color: red;">Error loading status</p>`;
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handleToggleEnforcement() {
  const wallet = getCitizenWallet();
  const profile = await getProfile(wallet.deviceId);
  const isEnabled = profile?.biometric_enforcement_enabled || false;

  if (isEnabled) {
    // Deactivate
    const confirmed = confirm(
      '⚠️ DEACTIVATE BIOMETRIC ENFORCEMENT\n\n' +
      'This will disable strict biometric-only authentication.\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    // TODO: Implement deactivation
    alert('Deactivation not yet implemented');
  } else {
    // Activate
    btnToggleEnforcement.textContent = '🔄 Activating...';
    btnToggleEnforcement.disabled = true;

    const result = await activateBiometricEnforcement(wallet.deviceId);

    if (result.success) {
      alert('✅ ' + result.message);
      location.reload();
    } else {
      alert('❌ ' + result.message);
      btnToggleEnforcement.textContent = '🔐 Activate Enforcement';
      btnToggleEnforcement.disabled = false;
    }
  }
}

async function handleDownloadMDM() {
  const wallet = getCitizenWallet();
  
  if (!wallet) {
    alert('Wallet not initialized');
    return;
  }

  downloadMDMProfile(wallet.deviceId);
  alert('✅ MDM Profile downloaded!\n\nInstall it via:\nSettings → General → VPN & Device Management');
}

function handleVaultFrozen(event) {
  const { reason, attempts, message } = event.detail;
  
  alert(
    '🚨 VAULT FROZEN\n\n' +
    `Reason: ${reason}\n` +
    `Failed Attempts: ${attempts}\n\n` +
    message
  );

  // Reload UI to show frozen state
  location.reload();
}

// ============================================
// AUTO-INITIALIZATION
// ============================================

(async function init() {
  await initializeApp();
})();

