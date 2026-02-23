/**
 * Voice Capture Module (Stub)
 * NOTE: Voice biometric capture is a future enhancement
 * This is a placeholder implementation for build compatibility
 */

import { debugLog } from './debug-utils.js';

let isCapturing = false;

/**
 * Start voice capture
 * NOTE: Not yet implemented - future feature
 */
export function startVoiceCapture() {
  debugLog('Voice capture not yet implemented (future feature)');
  isCapturing = true;
  return Promise.resolve();
}

/**
 * Stop voice capture
 * NOTE: Not yet implemented - future feature
 */
export function stopVoiceCapture() {
  debugLog('Voice capture stopped');
  isCapturing = false;
  return Promise.resolve();
}

/**
 * Capture voice signals
 * Returns empty signals for now
 */
export function captureVoiceSignals() {
  return Promise.resolve({
    voiceHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    timestamp: Date.now(),
    implemented: false
  });
}

/**
 * Check if voice capture is active
 */
export function isVoiceCaptureActive() {
  return isCapturing;
}

