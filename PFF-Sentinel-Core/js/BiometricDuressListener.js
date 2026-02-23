/**
 * PFF Sentinel — Biometric Duress Listener
 * Backend hook that listens for failed biometric events
 * Triggers SSS Vault Freeze after 3 failed attempts
 */

import { recordFailedBiometricAttempt, resetFailedAttempts } from './BiometricEnforcement.js';
import { supabase } from './supabase-client.js';
import { debugLog, debugWarn } from './debug-utils.js';

// ============================================
// BIOMETRIC EVENT LISTENER
// ============================================

let eventListener = null;
let isListening = false;

/**
 * Start listening for biometric events
 */
export function startBiometricDuressListener() {
  if (isListening) {
    debugWarn('⚠️ Biometric Duress Listener already running');
    return;
  }

  debugLog('👁️ Starting Biometric Duress Listener...');

  // Listen for WebAuthn failures (fingerprint)
  listenForWebAuthnFailures();

  // Listen for FaceID failures (via custom events)
  listenForFaceIDFailures();

  // Listen for database changes (real-time)
  listenForDatabaseEvents();

  isListening = true;
  debugLog('✅ Biometric Duress Listener started');
}

/**
 * Stop listening for biometric events
 */
export function stopBiometricDuressListener() {
  if (!isListening) {
    return;
  }

  console.log('🛑 Stopping Biometric Duress Listener...');

  // Remove event listeners
  window.removeEventListener('webauthn-failure', handleWebAuthnFailure);
  window.removeEventListener('faceid-failure', handleFaceIDFailure);

  // Unsubscribe from database events
  if (eventListener) {
    eventListener.unsubscribe();
    eventListener = null;
  }

  isListening = false;
  console.log('✅ Biometric Duress Listener stopped');
}

// ============================================
// WEBAUTHN FAILURE LISTENER (FINGERPRINT)
// ============================================

/**
 * Listen for WebAuthn (fingerprint) failures
 */
function listenForWebAuthnFailures() {
  window.addEventListener('webauthn-failure', handleWebAuthnFailure);
}

/**
 * Handle WebAuthn failure event
 * @param {CustomEvent} event - WebAuthn failure event
 */
async function handleWebAuthnFailure(event) {
  console.warn('⚠️ WebAuthn (Fingerprint) failure detected');
  
  const result = await recordFailedBiometricAttempt();
  
  if (result.frozen) {
    // Dispatch vault frozen event
    window.dispatchEvent(new CustomEvent('vault-frozen', {
      detail: {
        reason: 'FINGERPRINT_FAILURE',
        attempts: result.attempts,
        message: result.message
      }
    }));
  }
}

// ============================================
// FACEID FAILURE LISTENER
// ============================================

/**
 * Listen for FaceID failures
 */
function listenForFaceIDFailures() {
  window.addEventListener('faceid-failure', handleFaceIDFailure);
}

/**
 * Handle FaceID failure event
 * @param {CustomEvent} event - FaceID failure event
 */
async function handleFaceIDFailure(event) {
  console.warn('⚠️ FaceID failure detected');
  
  const result = await recordFailedBiometricAttempt();
  
  if (result.frozen) {
    // Dispatch vault frozen event
    window.dispatchEvent(new CustomEvent('vault-frozen', {
      detail: {
        reason: 'FACEID_FAILURE',
        attempts: result.attempts,
        message: result.message
      }
    }));
  }
}

// ============================================
// DATABASE EVENT LISTENER (REAL-TIME)
// ============================================

/**
 * Listen for biometric failure events in database (real-time)
 */
function listenForDatabaseEvents() {
  eventListener = supabase
    .channel('biometric_failures')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'biometric_failures'
    }, handleDatabaseEvent)
    .subscribe();
}

/**
 * Handle database event
 * @param {Object} payload - Database event payload
 */
async function handleDatabaseEvent(payload) {
  debugLog('📡 Biometric failure event received:', payload);

  const failure = payload.new;

  // Check if this is the 3rd failure
  if (failure.attempt_number >= 3) {
    debugLog('🚨 DURESS THRESHOLD REACHED: Triggering SSS Vault Freeze');

    // Dispatch vault frozen event
    window.dispatchEvent(new CustomEvent('vault-frozen', {
      detail: {
        reason: 'BIOMETRIC_FAILURE_THRESHOLD',
        attempts: failure.attempt_number,
        deviceId: failure.device_id
      }
    }));
  }
}

