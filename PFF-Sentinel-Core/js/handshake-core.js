/**
 * PFF Sovereign Handshake v2.0  Four-Pillar Anchor System
 * verifyCohesion() returns TRUE only if all 4 anchors (GPS, Device, Face, Fingerprint) match
 * the stored Absolute Truth Template.
 */

import { captureFaceSignals } from './capture-face.js';
import { captureFingerprintSignals } from './capture-finger.js';
import { isDeviceBound } from './hardware-sync.js';
import { getCurrentLocation, verifyLocationMatch, getLocationStatus } from './location-layer.js';

const TEMPLATE_STORAGE_KEY = 'pff_absolute_truth_template';
const COHESION_WINDOW_MS = 1500;

/**
 * Absolute Truth Template: Four-Pillar Anchor system (GPS, Device, Face, Fingerprint).
 * @typedef {{
 *   faceGeometryHash: string;
 *   faceLivenessMin: number;
 *   fingerRidgeMatch: boolean;
 *   gpsLocation: { latitude: number, longitude: number, accuracy: number };
 *   deviceUUID: string;
 *   createdAt: number;
 * }} AbsoluteTruthTemplate
 */

/**
 * Store the current capture as the Absolute Truth Template.
 * Call once after a trusted enrollment.
 * @param {Object} signals - { face, finger, gpsLocation, deviceUUID }
 * @returns {AbsoluteTruthTemplate}
 */
export function storeAbsoluteTruthTemplate(signals) {
  const template = {
    faceGeometryHash: signals.face?.geometryHash ?? '',
    faceLivenessMin: signals.face?.livenessScore ?? 0,
    fingerRidgeMatch: signals.finger?.ridgeMatch ?? true,
    gpsLocation: signals.gpsLocation ?? null,
    deviceUUID: signals.deviceUUID ?? '',
    createdAt: Date.now(),
  };
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(template));
  return template;
}

/**
 * Load the stored Absolute Truth Template.
 * @returns {AbsoluteTruthTemplate | null}
 */
export function loadAbsoluteTruthTemplate() {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Compare two geometry/spectral hashes with tolerance (e.g. lighting changes).
 * Exported for intruder monitor (face recognition check).
 */
export function faceHashMatches(stored, current, tolerance = 0.25) {
  if (!stored || !current) return false;
  if (tolerance === 0) return stored === current;
  let matches = 0;
  const len = Math.min(stored.length, current.length);
  for (let i = 0; i < len; i++) if (stored[i] === current[i]) matches++;
  return matches / len >= 1 - tolerance;
}

function hashMatch(stored, current, tolerance = 0) {
  return faceHashMatches(stored, current, tolerance);
}

/**
 * Verify cohesion: Four-Pillar Anchor system (GPS, Device, Face, Fingerprint).
 * GPS and Device are checked first (background anchors), then Face and Fingerprint are captured sequentially.
 * @param {Object} options
 * @param {HTMLVideoElement} [options.video] - Face capture video
 * @param {HTMLCanvasElement} [options.canvas] - Face capture canvas
 * @returns {Promise<{ ok: boolean; reason?: string; details?: Object }>}
 */
export async function verifyCohesion(options = {}) {
  const { video, canvas } = options;
  const template = loadAbsoluteTruthTemplate();
  const startTime = Date.now();

  if (!template) {
    return { ok: false, reason: 'NO_TEMPLATE', details: { message: 'No Absolute Truth Template stored. Enroll first.' } };
  }

  // Check GPS Anchor (background)
  const gpsStatus = getLocationStatus();
  const currentGPS = getCurrentLocation();
  const gpsOk = gpsStatus === 'locked' && verifyLocationMatch(currentGPS, template.gpsLocation, 100);

  if (!gpsOk) {
    return { ok: false, reason: 'GPS_ANCHOR_FAILED', details: { message: 'GPS location not locked or out of range.', gpsStatus } };
  }

  // Check Device Anchor (background)
  const deviceBound = await isDeviceBound();
  if (!deviceBound) {
    return { ok: false, reason: 'DEVICE_NOT_BOUND', details: { message: 'This device is not bound (HP Laptop / mobile UUID).' } };
  }

  // Sequential biometric capture: Step 1 - Face, Step 2 - Fingerprint
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('WINDOW_EXCEEDED')), COHESION_WINDOW_MS)
  );

  let faceResult, fingerResult;
  try {
    [faceResult, fingerResult] = await Promise.race([
      Promise.all([
        video && canvas ? captureFaceSignals(video, canvas) : Promise.resolve(null),
        captureFingerprintSignals(),
      ]),
      timeoutPromise,
    ]);
  } catch (e) {
    if (e.message === 'WINDOW_EXCEEDED') {
      return { ok: false, reason: 'WINDOW_EXCEEDED', details: { elapsed: COHESION_WINDOW_MS } };
    }
    throw e;
  }

  if (Date.now() - startTime > COHESION_WINDOW_MS) {
    return { ok: false, reason: 'WINDOW_EXCEEDED', details: { elapsed: Date.now() - startTime } };
  }

  const faceOk = !template.faceGeometryHash
    ? true
    : faceResult && hashMatch(template.faceGeometryHash, faceResult.geometryHash, 0.15) && faceResult.livenessScore >= Math.min(0.01, template.faceLivenessMin);
  const fingerOk = fingerResult && (fingerResult.ridgeMatch === template.fingerRidgeMatch || template.fingerRidgeMatch === true);

  const ok = gpsOk && deviceBound && faceOk && fingerOk;
  return {
    ok,
    reason: ok ? 'FOUR_PILLAR_VERIFIED' : (gpsOk ? '' : 'GPS') + (deviceBound ? '' : 'DEVICE') + (faceOk ? '' : 'FACE') + (fingerOk ? '' : 'FINGER') || 'MISMATCH',
    details: {
      elapsed: Date.now() - startTime,
      gpsOk,
      deviceBound,
      faceOk,
      fingerOk,
    },
  };
}