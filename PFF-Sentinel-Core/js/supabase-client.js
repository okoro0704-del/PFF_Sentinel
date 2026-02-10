/**
 * PFF Sentinel — Supabase Client
 * Database integration for biometric profiles, Four-Pillar anchors, and verification state
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration — Master Backend (must match PFF and SOVRYN CHAIN exactly)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || 'your-anon-key';

// Initialize Supabase client (same project as Master / PFF / SOVRYN for Sentinel bonding)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Profiles Table Schema (create this in Supabase SQL Editor):
 * 
 * CREATE TABLE profiles (
 *   device_id TEXT PRIMARY KEY,
 *   face_geometry_hash TEXT,
 *   face_liveness_min NUMERIC,
 *   finger_ridge_match BOOLEAN,
 *   finger_credential_id TEXT,
 *   gps_latitude NUMERIC,
 *   gps_longitude NUMERIC,
 *   gps_accuracy NUMERIC,
 *   device_uuid TEXT,
 *   is_fully_verified BOOLEAN DEFAULT FALSE,
 *   vida_minted BOOLEAN DEFAULT FALSE,
 *   vida_balance_spendable NUMERIC DEFAULT 0,
 *   vida_balance_locked NUMERIC DEFAULT 0,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * CREATE INDEX idx_profiles_device_uuid ON profiles(device_uuid);
 * CREATE INDEX idx_profiles_is_fully_verified ON profiles(is_fully_verified);
 */

/**
 * Upsert biometric profile data
 * @param {string} deviceId - Device ID (primary key)
 * @param {Object} profileData - Profile data to upsert
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function upsertProfile(deviceId, profileData) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        device_id: deviceId,
        ...profileData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'device_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Supabase upsert exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Get profile by device ID
 * @param {string} deviceId - Device ID
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function getProfile(deviceId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('device_id', deviceId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Supabase get error:', error);
      return { success: false, error };
    }

    return { success: true, data: data || null };
  } catch (err) {
    console.error('Supabase get exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Update Four-Pillar anchors (GPS + Device)
 * @param {string} deviceId - Device ID
 * @param {Object} anchors - { gps_latitude, gps_longitude, gps_accuracy, device_uuid }
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function updateFourPillarAnchors(deviceId, anchors) {
  return upsertProfile(deviceId, anchors);
}

/**
 * Update biometric hashes (Face + Fingerprint)
 * @param {string} deviceId - Device ID
 * @param {Object} biometrics - { face_geometry_hash, face_liveness_min, finger_ridge_match, finger_credential_id }
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function updateBiometricHashes(deviceId, biometrics) {
  return upsertProfile(deviceId, biometrics);
}

/**
 * Mark profile as fully verified (triggers VIDA minting)
 * @param {string} deviceId - Device ID
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function markFullyVerified(deviceId) {
  return upsertProfile(deviceId, { is_fully_verified: true });
}

/**
 * Mark VIDA as minted and update balances
 * @param {string} deviceId - Device ID
 * @param {number} spendable - Spendable VIDA amount (default 900)
 * @param {number} locked - Locked VIDA amount (default 4000)
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function markVidaMinted(deviceId, spendable = 900, locked = 4000) {
  return upsertProfile(deviceId, {
    vida_minted: true,
    minting_status: 'COMPLETED',
    vida_balance_spendable: spendable,
    vida_balance_locked: locked
  });
}

/**
 * Check if profile is fully verified
 * @param {string} deviceId - Device ID
 * @returns {Promise<boolean>}
 */
export async function isFullyVerified(deviceId) {
  const result = await getProfile(deviceId);
  return result.success && result.data?.is_fully_verified === true;
}

/**
 * Check if VIDA has been minted for this profile
 * @param {string} deviceId - Device ID
 * @returns {Promise<boolean>}
 */
export async function isVidaMinted(deviceId) {
  const result = await getProfile(deviceId);
  return result.success && result.data?.vida_minted === true;
}

