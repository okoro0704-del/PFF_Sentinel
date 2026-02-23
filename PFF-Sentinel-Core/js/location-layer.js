/**
 * PFF Sentinel — Location Layer (GPS Anchor)
 * Silent background GPS capture for Four-Pillar verification.
 * Captures coordinates before biometric scans begin.
 */

import { debugLog, debugWarn, debugError } from './debug-utils.js';

const LOCATION_STORAGE_KEY = 'pff_location_anchor';
const LOCATION_TIMEOUT_MS = 10000; // 10 seconds max wait for GPS

let currentLocation = null;
let locationStatus = 'pending'; // 'pending', 'locked', 'failed'

/**
 * Capture GPS location silently in background.
 * @returns {Promise<{ latitude: number, longitude: number, accuracy: number, timestamp: number }>}
 */
export async function captureLocation() {
  if (!navigator.geolocation) {
    locationStatus = 'failed';
    throw new Error('Geolocation not supported');
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      locationStatus = 'failed';
      reject(new Error('GPS timeout'));
    }, LOCATION_TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout);
        currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        locationStatus = 'locked';
        resolve(currentLocation);
      },
      (error) => {
        clearTimeout(timeout);
        locationStatus = 'failed';
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: LOCATION_TIMEOUT_MS,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Get current location status.
 * @returns {'pending' | 'locked' | 'failed'}
 */
export function getLocationStatus() {
  return locationStatus;
}

/**
 * Get last captured location.
 * @returns {Object | null}
 */
export function getCurrentLocation() {
  return currentLocation;
}

/**
 * Store location anchor in Absolute Truth Template.
 * @param {Object} location - Location data
 */
export function storeLocationAnchor(location) {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
  } catch (e) {
    debugError('Failed to store location anchor:', e);
  }
}

/**
 * Load stored location anchor.
 * @returns {Object | null}
 */
export function loadLocationAnchor() {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Verify location matches stored anchor within tolerance.
 * @param {Object} current - Current location
 * @param {Object} stored - Stored location anchor
 * @param {number} toleranceMeters - Max distance in meters (default 100m)
 * @returns {boolean}
 */
export function verifyLocationMatch(current, stored, toleranceMeters = 100) {
  if (!current || !stored) return false;

  // Haversine formula for distance between two GPS coordinates
  const R = 6371e3; // Earth radius in meters
  const φ1 = (current.latitude * Math.PI) / 180;
  const φ2 = (stored.latitude * Math.PI) / 180;
  const Δφ = ((stored.latitude - current.latitude) * Math.PI) / 180;
  const Δλ = ((stored.longitude - current.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= toleranceMeters;
}

/**
 * Initialize location capture silently on app load.
 * @returns {Promise<void>}
 */
export async function initLocationLayer() {
  try {
    await captureLocation();
    debugLog('GPS Location Anchor: LOCKED');
  } catch (error) {
    debugWarn('GPS Location Anchor: FAILED', error.message);
    // Don't throw - allow app to continue even if GPS fails
  }
}

/**
 * Reset location status (for testing).
 */
export function resetLocationStatus() {
  currentLocation = null;
  locationStatus = 'pending';
}

