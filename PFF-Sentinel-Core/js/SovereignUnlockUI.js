/**
 * PFF Sentinel — Sovereign Unlock UI
 * Web dashboard component for remote device unlock
 * Allows users to un-brick their phone if FaceID sensor is damaged
 */

import { sovereignUnlock, canSovereignUnlock, isVaultFrozen } from './BiometricEnforcement.js';
import { getCitizenWallet } from './SovereignWalletTriad.js';
import { getProfile } from './supabase-client.js';

// ============================================
// SOVEREIGN UNLOCK UI
// ============================================

/**
 * Initialize Sovereign Unlock UI
 */
export async function initializeSovereignUnlockUI() {
  const container = document.getElementById('sovereignUnlockContainer');
  
  if (!container) {
    console.warn('⚠️ Sovereign Unlock container not found');
    return;
  }

  const wallet = getCitizenWallet();
  
  if (!wallet) {
    container.innerHTML = '<p style="color: red;">Wallet not initialized</p>';
    return;
  }

  // Check vault status
  const profile = await getProfile(wallet.deviceId);
  
  if (!profile) {
    container.innerHTML = '<p style="color: red;">Profile not found</p>';
    return;
  }

  // Render UI based on vault status
  if (profile.vault_frozen) {
    renderFrozenVaultUI(container, wallet.deviceId, profile);
  } else {
    renderNormalUI(container);
  }
}

/**
 * Render UI when vault is frozen
 * @param {HTMLElement} container - Container element
 * @param {string} deviceId - Device identifier
 * @param {Object} profile - User profile
 */
async function renderFrozenVaultUI(container, deviceId, profile) {
  const unlockStatus = await canSovereignUnlock(deviceId);
  
  const frozenAt = new Date(profile.vault_frozen_at);
  const frozenDuration = Math.floor((Date.now() - frozenAt) / 1000 / 60);
  
  container.innerHTML = `
    <div class="sovereign-unlock-panel" style="
      background: linear-gradient(135deg, #dc2626, #991b1b);
      border: 2px solid #ef4444;
      border-radius: 12px;
      padding: 24px;
      color: white;
      box-shadow: 0 8px 32px rgba(220, 38, 38, 0.3);
    ">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <span style="font-size: 48px;">🔒</span>
        <div>
          <h2 style="margin: 0; font-size: 24px;">Vault Frozen</h2>
          <p style="margin: 4px 0 0 0; opacity: 0.9;">SSS Vault locked due to biometric failures</p>
        </div>
      </div>
      
      <div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <p style="margin: 0; opacity: 0.8; font-size: 14px;">Frozen At</p>
            <p style="margin: 4px 0 0 0; font-weight: bold;">${frozenAt.toLocaleString()}</p>
          </div>
          <div>
            <p style="margin: 0; opacity: 0.8; font-size: 14px;">Duration</p>
            <p style="margin: 4px 0 0 0; font-weight: bold;">${frozenDuration} minutes</p>
          </div>
          <div>
            <p style="margin: 0; opacity: 0.8; font-size: 14px;">Reason</p>
            <p style="margin: 4px 0 0 0; font-weight: bold;">${profile.vault_freeze_reason || 'Unknown'}</p>
          </div>
          <div>
            <p style="margin: 0; opacity: 0.8; font-size: 14px;">Locked VIDA</p>
            <p style="margin: 4px 0 0 0; font-weight: bold;">${profile.vida_balance_locked || 0} VIDA</p>
          </div>
        </div>
      </div>
      
      ${unlockStatus.canUnlock ? `
        <button 
          id="btnSovereignUnlock" 
          class="btn btn-primary"
          style="
            width: 100%;
            background: linear-gradient(135deg, #10b981, #059669);
            border: none;
            padding: 16px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.3s;
          "
          onmouseover="this.style.transform='scale(1.02)'"
          onmouseout="this.style.transform='scale(1)'"
        >
          🔓 Sovereign Unlock (Un-Brick Device)
        </button>
      ` : `
        <div style="
          background: rgba(0,0,0,0.3);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        ">
          <p style="margin: 0; font-weight: bold;">⏳ ${unlockStatus.reason}</p>
        </div>
      `}
      
      <p style="margin: 16px 0 0 0; font-size: 14px; opacity: 0.8; text-align: center;">
        ⚠️ Use this only if your biometric sensor is damaged or you're in a safe environment
      </p>
    </div>
  `;
  
  // Add event listener
  if (unlockStatus.canUnlock) {
    const btnUnlock = document.getElementById('btnSovereignUnlock');
    if (btnUnlock) {
      btnUnlock.addEventListener('click', handleSovereignUnlock);
    }
  }
}

/**
 * Render normal UI when vault is not frozen
 * @param {HTMLElement} container - Container element
 */
function renderNormalUI(container) {
  container.innerHTML = `
    <div class="sovereign-unlock-panel" style="
      background: linear-gradient(135deg, #10b981, #059669);
      border: 2px solid #34d399;
      border-radius: 12px;
      padding: 24px;
      color: white;
      box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 48px;">✅</span>
        <div>
          <h2 style="margin: 0; font-size: 24px;">Vault Active</h2>
          <p style="margin: 4px 0 0 0; opacity: 0.9;">Your SSS Vault is secure and operational</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Handle Sovereign Unlock button click
 */
async function handleSovereignUnlock() {
  const wallet = getCitizenWallet();
  
  if (!wallet) {
    alert('Wallet not initialized');
    return;
  }

  // Confirm action
  const confirmed = confirm(
    '⚠️ SOVEREIGN UNLOCK\n\n' +
    'This will un-brick your device and unfreeze your SSS Vault.\n\n' +
    'Only proceed if:\n' +
    '• Your biometric sensor is damaged\n' +
    '• You are in a safe environment\n\n' +
    'Continue?'
  );

  if (!confirmed) {
    return;
  }

  const btn = document.getElementById('btnSovereignUnlock');
  if (btn) {
    btn.textContent = '🔄 Unlocking...';
    btn.disabled = true;
  }

  // Execute unlock
  const result = await sovereignUnlock(wallet.deviceId);

  if (result.success) {
    alert('✅ ' + result.message);
    // Refresh UI
    await initializeSovereignUnlockUI();
  } else {
    alert('❌ ' + result.message);
    if (btn) {
      btn.textContent = '🔓 Sovereign Unlock (Un-Brick Device)';
      btn.disabled = false;
    }
  }
}

