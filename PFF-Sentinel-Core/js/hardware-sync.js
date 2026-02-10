/**
 * PFF Sovereign Handshake v2.0 — Hardware Sync
 * Binds verification to allowed device fingerprints (HP Laptop / mobile).
 * Browsers do not expose real hardware UUIDs; we use a stable device fingerprint.
 */

const HARDWARE_STORAGE_KEY = 'pff_absolute_truth_hardware';
const ALLOWED_DEVICES_KEY = 'pff_allowed_device_uuids';

/**
 * Generate a stable device fingerprint from available browser/device signals.
 * @returns {Promise<string>} Device UUID (fingerprint)
 */
export async function getDeviceUUID() {
  const components = [
    navigator.hardwareConcurrency ?? 0,
    navigator.deviceMemory ?? 0,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.language,
    navigator.platform,
    navigator.vendor,
    !!window.chrome,
    !!window.opera,
  ].join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(components);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `pff-${hashHex.slice(0, 16)}`;
}

/**
 * Register current device as allowed (e.g. HP Laptop or mobile).
 * Call this once from a trusted environment to bind this device.
 */
export async function bindCurrentDevice() {
  const uuid = await getDeviceUUID();
  const allowed = getAllowedDeviceUUIDs();
  if (!allowed.includes(uuid)) {
    allowed.push(uuid);
    localStorage.setItem(ALLOWED_DEVICES_KEY, JSON.stringify(allowed));
  }
  return uuid;
}

/**
 * @returns {string[]} List of allowed device UUIDs
 */
export function getAllowedDeviceUUIDs() {
  try {
    const raw = localStorage.getItem(ALLOWED_DEVICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Check if current device is in the allowed list (HP Laptop / mobile binding).
 * @returns {Promise<boolean>}
 */
export async function isDeviceBound() {
  const uuid = await getDeviceUUID();
  const allowed = getAllowedDeviceUUIDs();
  return allowed.length === 0 || allowed.includes(uuid);
}
