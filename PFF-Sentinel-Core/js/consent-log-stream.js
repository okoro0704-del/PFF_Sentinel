/**
 * PFF Sentinel — Log stream to Master Supabase
 * Directs all Consent Logs and Access Attempts to the consent_logs table
 * in the Master Backend (same SUPABASE_URL / SUPABASE_ANON_KEY).
 */

import { supabase } from './supabase-client.js';

const SOURCE = 'sentinel';

/**
 * Insert a log row into Master consent_logs.
 * @param {'consent'|'access_attempt'} logType
 * @param {string} [message]
 * @param {Object} [metadata] - optional payload
 * @param {string} [deviceId]
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
export async function streamConsentLog(logType, message = '', metadata = {}, deviceId = null) {
  try {
    const { error } = await supabase.from('consent_logs').insert({
      log_type: logType,
      source: SOURCE,
      device_id: deviceId,
      message: String(message),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });

    if (error) {
      console.error('Consent log stream error:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.error('Consent log stream exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Log a consent event (e.g. verification consent, handshake consent).
 * @param {string} message
 * @param {Object} [metadata]
 * @param {string} [deviceId]
 */
export async function logConsent(message, metadata = {}, deviceId = null) {
  return streamConsentLog('consent', message, metadata, deviceId);
}

/**
 * Log an access attempt (success or failure).
 * @param {string} message
 * @param {Object} [metadata] - e.g. { success, reason, action }
 * @param {string} [deviceId]
 */
export async function logAccessAttempt(message, metadata = {}, deviceId = null) {
  return streamConsentLog('access_attempt', message, metadata, deviceId);
}
