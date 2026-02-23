/**
 * PFF Sentinel — Biometric-Only Enforcement
 * Strict biometric authentication with no passcode fallback
 * 
 * FEATURES:
 * - MDM Policy Generation (Strict Biometric Configuration)
 * - Duress Logic (3 failed attempts → SSS Vault Freeze)
 * - Vitalize Recovery (Sovereign Unlock for damaged sensors)
 * - VIDA Subscription Integration
 */

import { getCitizenWallet, isSentinel } from './SovereignWalletTriad.js';
import { executeLockSavings } from './SentinelGuard.js';
import { getProfile, upsertProfile } from './supabase-client.js';
import { supabase } from './supabase-client.js';
import { debugLog, debugWarn, debugError } from './debug-utils.js';

// ============================================
// BIOMETRIC ENFORCEMENT CONFIGURATION
// ============================================

const BIOMETRIC_CONFIG = {
  maxFailedAttempts: parseInt(import.meta.env.VITE_MAX_FAILED_ATTEMPTS || '3'),
  freezeDurationMinutes: parseInt(import.meta.env.VITE_FREEZE_DURATION_MINUTES || '30'),
  requireAttentionAware: true,
  disablePasscodeFallback: true,
  requireFaceID: true,
  requireFingerprint: true
};

// ============================================
// MDM POLICY GENERATION
// ============================================

/**
 * Generate Strict Biometric MDM Configuration Profile
 * Apple Configuration Profile format (.mobileconfig)
 * @param {string} deviceId - Device identifier
 * @returns {string} - XML configuration profile
 */
export function generateStrictBiometricMDM(deviceId) {
  const timestamp = new Date().toISOString();
  const uuid = crypto.randomUUID();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadType</key>
      <string>com.apple.mobiledevice.passwordpolicy</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>PayloadIdentifier</key>
      <string>com.pff.sentinel.biometric.${uuid}</string>
      <key>PayloadUUID</key>
      <string>${uuid}</string>
      <key>PayloadDisplayName</key>
      <string>PFF Sentinel - Strict Biometric Policy</string>
      <key>PayloadDescription</key>
      <string>Enforces biometric-only authentication with no passcode fallback</string>
      
      <!-- Disable Passcode Fallback -->
      <key>allowSimple</key>
      <false/>
      <key>forcePIN</key>
      <false/>
      <key>maxFailedAttempts</key>
      <integer>${BIOMETRIC_CONFIG.maxFailedAttempts}</integer>
      
      <!-- Require Biometric -->
      <key>requireAlphanumeric</key>
      <false/>
      <key>minLength</key>
      <integer>0</integer>
      
      <!-- Attention-Aware FaceID -->
      <key>requireAttentionForUnlock</key>
      <true/>
      <key>attentionAware</key>
      <true/>
    </dict>
    
    <dict>
      <key>PayloadType</key>
      <string>com.apple.security.FaceID</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>PayloadIdentifier</key>
      <string>com.pff.sentinel.faceid.${uuid}</string>
      <key>PayloadUUID</key>
      <string>${crypto.randomUUID()}</string>
      
      <!-- Strict FaceID Settings -->
      <key>requireAttention</key>
      <true/>
      <key>allowPasscodeFallback</key>
      <false/>
      <key>maxFailedAttempts</key>
      <integer>${BIOMETRIC_CONFIG.maxFailedAttempts}</integer>
    </dict>
  </array>
  
  <key>PayloadDisplayName</key>
  <string>PFF Sentinel Biometric Enforcement</string>
  <key>PayloadIdentifier</key>
  <string>com.pff.sentinel.biometric.main</string>
  <key>PayloadRemovalDisallowed</key>
  <true/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${uuid}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadOrganization</key>
  <string>PFF Sentinel Protocol</string>
  <key>PayloadDescription</key>
  <string>Strict biometric-only authentication policy. Generated: ${timestamp}</string>
  
  <!-- PFF Metadata -->
  <key>PFFDeviceID</key>
  <string>${deviceId}</string>
  <key>PFFPolicyType</key>
  <string>STRICT_BIOMETRIC</string>
  <key>PFFGeneratedAt</key>
  <string>${timestamp}</string>
</dict>
</plist>`;
}

/**
 * Download MDM Configuration Profile
 * @param {string} deviceId - Device identifier
 */
export function downloadMDMProfile(deviceId) {
  const profile = generateStrictBiometricMDM(deviceId);
  const blob = new Blob([profile], { type: 'application/x-apple-aspen-config' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `PFF_Sentinel_Biometric_${deviceId}.mobileconfig`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('📱 MDM Profile downloaded:', a.download);
}

// ============================================
// FAILED BIOMETRIC TRACKING
// ============================================

let failedAttempts = 0;
let lastFailedAttemptTime = null;
let vaultFrozen = false;

/**
 * Record failed biometric attempt
 * Triggers SSS Vault Freeze after 3 failed attempts
 * @returns {Promise<{frozen: boolean, attempts: number, message: string}>}
 */
export async function recordFailedBiometricAttempt() {
  try {
    const wallet = getCitizenWallet();

    if (!wallet) {
      return { frozen: false, attempts: 0, message: 'Wallet not initialized' };
    }

    // Increment failed attempts
    failedAttempts++;
    lastFailedAttemptTime = Date.now();

    debugWarn(`⚠️ Failed biometric attempt ${failedAttempts}/${BIOMETRIC_CONFIG.maxFailedAttempts}`);

    // Store in database
    await supabase.from('biometric_failures').insert({
      device_id: wallet.deviceId,
      wallet_address: wallet.address,
      failed_at: new Date().toISOString(),
      attempt_number: failedAttempts
    });

    // Check if threshold reached
    if (failedAttempts >= BIOMETRIC_CONFIG.maxFailedAttempts) {
      await triggerSSSVaultFreeze(wallet.address);
      return {
        frozen: true,
        attempts: failedAttempts,
        message: `🔒 SSS Vault Frozen after ${failedAttempts} failed biometric attempts`
      };
    }

    return {
      frozen: false,
      attempts: failedAttempts,
      message: `Warning: ${failedAttempts}/${BIOMETRIC_CONFIG.maxFailedAttempts} failed attempts`
    };
  } catch (error) {
    debugError('❌ Failed to record biometric attempt:', error);
    return { frozen: false, attempts: failedAttempts, message: error.message };
  }
}

/**
 * Reset failed attempts counter
 */
export function resetFailedAttempts() {
  failedAttempts = 0;
  lastFailedAttemptTime = null;
  debugLog('✅ Failed attempts counter reset');
}

/**
 * Get current failed attempts count
 * @returns {number}
 */
export function getFailedAttemptsCount() {
  return failedAttempts;
}

/**
 * Check if vault is frozen
 * @returns {boolean}
 */
export function isVaultFrozen() {
  return vaultFrozen;
}

// ============================================
// SSS VAULT FREEZE (DURESS LOGIC)
// ============================================

/**
 * Trigger SSS Vault Freeze after failed biometric attempts
 * Locks all VIDA tokens in SSS contract
 * @param {string} citizenAddress - Citizen wallet address
 */
async function triggerSSSVaultFreeze(citizenAddress) {
  try {
    console.log('🚨 DURESS DETECTED: Triggering SSS Vault Freeze...');

    const wallet = getCitizenWallet();
    const profile = await getProfile(wallet.deviceId);

    // Get current VIDA balance
    const vidaBalance = profile?.vida_balance_spendable || 0;

    if (vidaBalance > 0) {
      // Execute lockSavings via Sentinel
      const result = await executeLockSavings(citizenAddress, vidaBalance.toString());

      if (result.success) {
        debugLog(`✅ SSS Vault Frozen: ${vidaBalance} VIDA locked`);

        // Update profile
        await upsertProfile(wallet.deviceId, {
          vida_balance_spendable: 0,
          vida_balance_locked: parseFloat(profile.vida_balance_locked || 0) + parseFloat(vidaBalance),
          vault_frozen: true,
          vault_frozen_at: new Date().toISOString(),
          vault_freeze_reason: 'BIOMETRIC_FAILURE_DURESS'
        });

        vaultFrozen = true;

        // Send alert notification
        await sendVaultFreezeAlert(wallet.deviceId, vidaBalance);
      } else {
        debugError('❌ SSS Vault Freeze failed:', result.error);
      }
    } else {
      debugLog('⚠️ No spendable VIDA to freeze');
    }
  } catch (error) {
    console.error('❌ SSS Vault Freeze error:', error);
  }
}

/**
 * Send vault freeze alert notification
 * @param {string} deviceId - Device identifier
 * @param {number} amount - Amount frozen
 */
async function sendVaultFreezeAlert(deviceId, amount) {
  try {
    await supabase.from('vault_freeze_alerts').insert({
      device_id: deviceId,
      frozen_amount: amount,
      freeze_reason: 'BIOMETRIC_FAILURE_DURESS',
      frozen_at: new Date().toISOString(),
      status: 'ACTIVE'
    });

    console.log('📧 Vault freeze alert sent');
  } catch (error) {
    console.error('❌ Failed to send vault freeze alert:', error);
  }
}

// ============================================
// VITALIZE RECOVERY (SOVEREIGN UNLOCK)
// ============================================

/**
 * Sovereign Unlock - Remotely un-brick phone after biometric sensor damage
 * Only callable by the Citizen or Sentinel
 * @param {string} deviceId - Device identifier to unlock
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sovereignUnlock(deviceId) {
  try {
    const wallet = getCitizenWallet();
    const isSentinelRole = await isSentinel();

    // Verify authorization (must be owner or Sentinel)
    if (wallet.deviceId !== deviceId && !isSentinelRole) {
      return { success: false, message: 'Unauthorized: Only device owner or Sentinel can unlock' };
    }

    console.log('🔓 Executing Sovereign Unlock for device:', deviceId);

    // Get profile
    const profile = await getProfile(deviceId);

    if (!profile) {
      return { success: false, message: 'Device profile not found' };
    }

    if (!profile.vault_frozen) {
      return { success: false, message: 'Vault is not frozen' };
    }

    // Unfreeze vault
    await upsertProfile(deviceId, {
      vault_frozen: false,
      vault_frozen_at: null,
      vault_freeze_reason: null,
      vault_unfrozen_at: new Date().toISOString(),
      vault_unfrozen_by: wallet.address
    });

    // Reset failed attempts
    resetFailedAttempts();
    vaultFrozen = false;

    // Log unlock event
    await supabase.from('sovereign_unlock_events').insert({
      device_id: deviceId,
      unlocked_by: wallet.address,
      unlocked_at: new Date().toISOString(),
      unlock_reason: 'BIOMETRIC_SENSOR_DAMAGE_OR_SAFE_ENVIRONMENT'
    });

    console.log('✅ Sovereign Unlock successful');

    return {
      success: true,
      message: 'Device unlocked successfully. Biometric enforcement reset.'
    };
  } catch (error) {
    console.error('❌ Sovereign Unlock failed:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Check if device can be unlocked
 * @param {string} deviceId - Device identifier
 * @returns {Promise<{canUnlock: boolean, reason: string}>}
 */
export async function canSovereignUnlock(deviceId) {
  try {
    const profile = await getProfile(deviceId);

    if (!profile) {
      return { canUnlock: false, reason: 'Device not found' };
    }

    if (!profile.vault_frozen) {
      return { canUnlock: false, reason: 'Vault is not frozen' };
    }

    // Check if freeze duration has passed
    const frozenAt = new Date(profile.vault_frozen_at);
    const now = new Date();
    const minutesSinceFrozen = (now - frozenAt) / 1000 / 60;

    if (minutesSinceFrozen < BIOMETRIC_CONFIG.freezeDurationMinutes) {
      return {
        canUnlock: false,
        reason: `Vault frozen. Wait ${Math.ceil(BIOMETRIC_CONFIG.freezeDurationMinutes - minutesSinceFrozen)} more minutes.`
      };
    }

    return { canUnlock: true, reason: 'Ready to unlock' };
  } catch (error) {
    console.error('❌ Failed to check unlock status:', error);
    return { canUnlock: false, reason: error.message };
  }
}

// ============================================
// VIDA SUBSCRIPTION INTEGRATION
// ============================================

/**
 * Check if user has active Biometric Enforcement subscription
 * @param {string} walletAddress - Wallet address
 * @returns {Promise<{active: boolean, tier: string, expiresAt: string}>}
 */
export async function checkBiometricSubscription(walletAddress) {
  try {
    const { data, error } = await supabase
      .from('sentinel_subscriptions')
      .select('*')
      .eq('sentinel_wallet_address', walletAddress)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      const subscription = data[0];
      return {
        active: true,
        tier: subscription.tier,
        expiresAt: subscription.expires_at
      };
    }

    return { active: false, tier: null, expiresAt: null };
  } catch (error) {
    console.error('❌ Failed to check subscription:', error);
    return { active: false, tier: null, expiresAt: null };
  }
}

/**
 * Activate Biometric Enforcement (requires VIDA subscription)
 * @param {string} deviceId - Device identifier
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function activateBiometricEnforcement(deviceId) {
  try {
    const wallet = getCitizenWallet();

    // Check subscription
    const subscription = await checkBiometricSubscription(wallet.address);

    if (!subscription.active) {
      return {
        success: false,
        message: 'Biometric Enforcement requires an active VIDA subscription. Please subscribe first.'
      };
    }

    // Update profile
    await upsertProfile(deviceId, {
      biometric_enforcement_enabled: true,
      biometric_enforcement_activated_at: new Date().toISOString(),
      biometric_enforcement_tier: subscription.tier
    });

    console.log('✅ Biometric Enforcement activated');

    return {
      success: true,
      message: `Biometric Enforcement activated (${subscription.tier} tier)`
    };
  } catch (error) {
    console.error('❌ Failed to activate Biometric Enforcement:', error);
    return { success: false, message: error.message };
  }
}

