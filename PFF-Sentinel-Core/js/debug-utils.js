/**
 * Debug Utilities
 * Centralized debug logging with environment-based control
 */

// Check if debug mode is enabled
const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true' || 
                   import.meta.env.MODE === 'development';

/**
 * Debug log - only logs in debug mode
 * @param {...any} args - Arguments to log
 */
export function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Debug warn - only warns in debug mode
 * @param {...any} args - Arguments to warn
 */
export function debugWarn(...args) {
  if (DEBUG_MODE) {
    console.warn('[DEBUG]', ...args);
  }
}

/**
 * Debug error - always logs errors but adds debug context in debug mode
 * @param {...any} args - Arguments to log
 */
export function debugError(...args) {
  if (DEBUG_MODE) {
    console.error('[DEBUG]', ...args);
  } else {
    console.error(...args);
  }
}

/**
 * Debug info - only logs in debug mode
 * @param {...any} args - Arguments to log
 */
export function debugInfo(...args) {
  if (DEBUG_MODE) {
    console.info('[DEBUG]', ...args);
  }
}

/**
 * Check if debug mode is active
 * @returns {boolean}
 */
export function isDebugMode() {
  return DEBUG_MODE;
}

/**
 * Production-safe log - always logs but with minimal info in production
 * @param {string} message - Message to log
 * @param {any} data - Optional data (only logged in debug mode)
 */
export function safeLog(message, data = null) {
  if (DEBUG_MODE && data !== null) {
    console.log(message, data);
  } else {
    console.log(message);
  }
}

