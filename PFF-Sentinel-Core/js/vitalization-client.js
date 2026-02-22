/**
 * PFF Sentinel — Vitalization Client
 * Client-side integration for Sentinel-authorized citizenship
 * Calls the backend Vitalization endpoint after Four-Pillar verification
 */

import { getDeviceId } from './handshake-core.js';
import { getCitizenWallet } from './SovereignWalletTriad.js';
import { getProfile } from './supabase-client.js';

// ============================================
// VITALIZATION API CLIENT
// ============================================

const VITALIZATION_ENDPOINT = import.meta.env.VITE_VITALIZATION_ENDPOINT || 
  '/.netlify/functions/vitalize-citizen';

/**
 * Request Vitalization from Sentinel
 * This triggers the backend to verify Four Pillars and generate authorization signature
 * 
 * @returns {Promise<{success: boolean, vitalizationProof?: Object, vidaCap?: Object, error?: string}>}
 */
export async function requestVitalization() {
  try {
    const deviceId = await getDeviceId();
    const wallet = getCitizenWallet();

    if (!wallet) {
      return { success: false, error: 'Wallet not initialized' };
    }

    console.log('🛡️ Requesting Vitalization from Sentinel...');
    console.log('📱 Device ID:', deviceId);
    console.log('💼 Citizen Address:', wallet.address);

    // Check if already vitalized
    const profile = await getProfile(deviceId);
    if (profile.success && profile.data?.vida_minted) {
      return { 
        success: false, 
        error: 'Already vitalized',
        alreadyVitalized: true,
        existingVidaCap: {
          spendable: profile.data.vida_balance_spendable,
          locked: profile.data.vida_balance_locked
        }
      };
    }

    // Call Vitalization endpoint
    const response = await fetch(VITALIZATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deviceId,
        citizenAddress: wallet.address
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Vitalization failed:', result.error);
      return { 
        success: false, 
        error: result.error,
        pillars: result.pillars,
        alreadyVitalized: result.alreadyVitalized
      };
    }

    console.log('✅ Vitalization successful!');
    console.log('🎉 5 VIDA CAP received:', result.vidaCap);
    console.log('📜 Vitalization Proof:', result.vitalizationProof.vitalizationId);

    return {
      success: true,
      vitalizationProof: result.vitalizationProof,
      vidaCap: result.vidaCap,
      message: result.message
    };

  } catch (error) {
    console.error('❌ Vitalization request failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check Vitalization status
 * @returns {Promise<{vitalized: boolean, vidaCap?: Object, vitalizationId?: string}>}
 */
export async function checkVitalizationStatus() {
  try {
    const deviceId = await getDeviceId();
    const profile = await getProfile(deviceId);

    if (!profile.success || !profile.data) {
      return { vitalized: false };
    }

    const data = profile.data;

    if (data.vida_minted) {
      return {
        vitalized: true,
        vidaCap: {
          total: 5,
          spendable: data.vida_balance_spendable,
          locked: data.vida_balance_locked
        },
        vitalizationId: data.vitalization_id,
        vitalizedAt: data.vitalized_at
      };
    }

    return { vitalized: false };
  } catch (error) {
    console.error('❌ Failed to check vitalization status:', error);
    return { vitalized: false, error: error.message };
  }
}

/**
 * Auto-request Vitalization after Four-Pillar verification
 * This is called automatically when is_fully_verified becomes TRUE
 * 
 * @returns {Promise<{success: boolean, vitalizationProof?: Object, error?: string}>}
 */
export async function autoVitalizeOnVerification() {
  try {
    const deviceId = await getDeviceId();
    const profile = await getProfile(deviceId);

    if (!profile.success || !profile.data) {
      return { success: false, error: 'Profile not found' };
    }

    // Check if fully verified
    if (!profile.data.is_fully_verified) {
      return { success: false, error: 'Four-Pillar verification not complete' };
    }

    // Check if already vitalized
    if (profile.data.vida_minted) {
      console.log('ℹ️ Already vitalized, skipping...');
      return { success: true, alreadyVitalized: true };
    }

    console.log('🚀 Auto-Vitalization triggered (Four-Pillar verification complete)');

    // Request Vitalization
    return await requestVitalization();

  } catch (error) {
    console.error('❌ Auto-Vitalization failed:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// EXPORT
// ============================================

export const VitalizationClient = {
  requestVitalization,
  checkVitalizationStatus,
  autoVitalizeOnVerification
};

