/**
 * PFF Sentinel — Lock State & Background Listener
 * Persistent listener for 'Lock_Command' from LifeOS Admin.
 * Lock state survives page close and offline (localStorage).
 */

const LOCK_STORAGE_KEY = 'pff_lock_state';
const REMOTE_LOCK_STORAGE_KEY = 'pff_remote_lock_state';
const LOCK_COMMAND = 'Lock_Command';
const CHANNEL_NAME = 'pff_lifeos_admin';

let onLockCommandCallback = null;
let channel = null;

/**
 * @returns {boolean} True if device is in Lock State (Sovereign Lock active).
 */
export function isLockActive() {
  try {
    return localStorage.getItem(LOCK_STORAGE_KEY) === 'active';
  } catch {
    return false;
  }
}

/**
 * Set lock state (internal / after verified handshake to clear).
 * @param {boolean} active
 */
export function setLockState(active) {
  try {
    if (active) {
      localStorage.setItem(LOCK_STORAGE_KEY, 'active');
    } else {
      localStorage.removeItem(LOCK_STORAGE_KEY);
    }
  } catch (_) {}
}

/**
 * Remote Sovereign Lock (RSL): LOCK_STATE persisted so reboot returns to lock screen.
 * @returns {boolean} True if Remote Lock (DE_VITALIZE) is active.
 */
export function isRemoteLockActive() {
  try {
    return localStorage.getItem(REMOTE_LOCK_STORAGE_KEY) === 'active';
  } catch {
    return false;
  }
}

/**
 * Set Remote Lock state. When true, persists so app shows lock screen on next load.
 * @param {boolean} active
 */
export function setRemoteLockState(active) {
  try {
    if (active) {
      localStorage.setItem(REMOTE_LOCK_STORAGE_KEY, 'active');
      localStorage.setItem(LOCK_STORAGE_KEY, 'active');
    } else {
      localStorage.removeItem(REMOTE_LOCK_STORAGE_KEY);
      localStorage.removeItem(LOCK_STORAGE_KEY);
    }
  } catch (_) {}
}

/**
 * Register callback for Lock_Command. Called when LifeOS Admin sends lock.
 * @param {() => void} callback
 */
export function onLockCommand(callback) {
  onLockCommandCallback = callback;
}

/**
 * Start persistent background listener for Lock_Command from LifeOS Admin.
 * Listens via BroadcastChannel (same origin). Also checks storage on visibility change.
 */
export function startLockListener() {
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event.data && event.data.type === LOCK_COMMAND) {
        setLockState(true);
        onLockCommandCallback?.();
      }
    };
  } catch (_) {}

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isLockActive()) {
      onLockCommandCallback?.();
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key === LOCK_STORAGE_KEY && event.newValue === 'active') {
      onLockCommandCallback?.();
    }
  });
}

/**
 * Send Lock_Command (for LifeOS Admin to call). Writes state and broadcasts.
 * Other tabs / SW receive via BroadcastChannel or storage event.
 */
export function sendLockCommand() {
  setLockState(true);
  try {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.postMessage({ type: LOCK_COMMAND });
    ch.close();
  } catch (_) {}
}
