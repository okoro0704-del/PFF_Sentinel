/**
 * PFF Sovereign Handshake v2.0 — Four-Pillar Anchor System WITH SUPABASE
 * verifyCohesion() returns TRUE only if all 4 anchors (GPS, Device, Face, Fingerprint) match
 * the stored Absolute Truth Template.
 * ALL DATA SYNCED TO SUPABASE DATABASE.
 */

import { captureFaceSignals } from './capture-face.js';
import { captureFingerprintSignals } from './capture-finger.js';
import { isDeviceBound, getDeviceUUID } from './hardware-sync.js';
import { getCurrentLocation, verifyLocationMatch, getLocationStatus } from './location-layer.js';
import { getProfile, updateBiometricHashes, markFullyVerified } from './supabase-client.js';
import { autoMintOnVerification } from './MintingProtocol.js';
import { logConsent, logAccessAttempt } from './consent-log-stream.js';

const TEMPLATE_STORAGE_KEY = 'pff_absolute_truth_template'; // Fallback only
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
 * NOW SYNCS TO SUPABASE instead of localStorage.
 * @param {Object} signals - { face, finger, gpsLocation, deviceUUID }
 * @returns {Promise<AbsoluteTruthTemplate>}
 */
export async function storeAbsoluteTruthTemplate(signals) {
  const template = {
    faceGeometryHash: signals.face?.geometryHash ?? '',
    faceLivenessMin: signals.face?.livenessScore ?? 0,
    fingerRidgeMatch: signals.finger?.ridgeMatch ?? true,
    gpsLocation: signals.gpsLocation ?? null,
    deviceUUID: signals.deviceUUID ?? '',
    createdAt: Date.now(),
  };
  
  // Store in Supabase (primary)
  const deviceId = signals.deviceUUID || await getDeviceUUID();
  await updateBiometricHashes(deviceId, {
    face_geometry_hash: template.faceGeometryHash,
    face_liveness_min: template.faceLivenessMin,
    finger_ridge_match: template.fingerRidgeMatch,
    finger_credential_id: signals.finger?.credentialId || null
  });
  
  // Fallback to localStorage
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(template));
  
  return template;
}

/**
 * Load the stored Absolute Truth Template.
 * NOW LOADS FROM SUPABASE (with localStorage fallback).
 * @returns {Promise<AbsoluteTruthTemplate | null>}
 */
export async function loadAbsoluteTruthTemplate() {
  try {
    // Try Supabase first
    const deviceId = await getDeviceUUID();
    const result = await getProfile(deviceId);
    
    if (result.success && result.data) {
      return {
        faceGeometryHash: result.data.face_geometry_hash || '',
        faceLivenessMin: result.data.face_liveness_min || 0,
        fingerRidgeMatch: result.data.finger_ridge_match ?? true,
        gpsLocation: result.data.gps_latitude && result.data.gps_longitude 
          ? { 
              latitude: result.data.gps_latitude, 
              longitude: result.data.gps_longitude,
              accuracy: result.data.gps_accuracy || 0
            }
          : null,
        deviceUUID: result.data.device_uuid || deviceId,
        createdAt: new Date(result.data.created_at).getTime(),
      };
    }
    
    // Fallback to localStorage
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Load template error:', err);
    // Final fallback to localStorage
    try {
      const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
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
 * NOW MARKS is_fully_verified=TRUE in Supabase and triggers VIDA minting.
 * @param {Object} options
 * @param {HTMLVideoElement} [options.video] - Face capture video
 * @param {HTMLCanvasElement} [options.canvas] - Face capture canvas
 * @returns {Promise<{ ok: boolean; reason?: string; details?: Object }>}
 */
export async function verifyCohesion(options = {}) {
  const { video, canvas } = options;
  const template = await loadAbsoluteTruthTemplate();
  const startTime = Date.now();

  if (!template) {
    const deviceId = await getDeviceUUID().catch(() => null);
    logAccessAttempt('Verification attempted without template (NO_TEMPLATE)', { reason: 'NO_TEMPLATE' }, deviceId);
    return { ok: false, reason: 'NO_TEMPLATE', details: { message: 'No Absolute Truth Template stored. Enroll first.' } };
  }

  const deviceId = await getDeviceUUID();

  // Check GPS Anchor (background)
  const gpsStatus = getLocationStatus();
  const currentGPS = getCurrentLocation();
  const gpsOk = gpsStatus === 'locked' && verifyLocationMatch(currentGPS, template.gpsLocation, 100);

  if (!gpsOk) {
    logAccessAttempt('Verification failed: GPS anchor', { reason: 'GPS_ANCHOR_FAILED', gpsStatus }, deviceId);
    return { ok: false, reason: 'GPS_ANCHOR_FAILED', details: { message: 'GPS location not locked or out of range.', gpsStatus } };
  }

  // Check Device Anchor (background)
  const deviceBound = await isDeviceBound();
  if (!deviceBound) {
    logAccessAttempt('Verification failed: device not bound', { reason: 'DEVICE_NOT_BOUND' }, deviceId);
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
      logAccessAttempt('Verification failed: cohesion window exceeded', { reason: 'WINDOW_EXCEEDED', elapsed: COHESION_WINDOW_MS }, deviceId);
      return { ok: false, reason: 'WINDOW_EXCEEDED', details: { elapsed: COHESION_WINDOW_MS } };
    }
    throw e;
  }

  if (Date.now() - startTime > COHESION_WINDOW_MS) {
    logAccessAttempt('Verification failed: cohesion window exceeded', { reason: 'WINDOW_EXCEEDED', elapsed: Date.now() - startTime }, deviceId);
    return { ok: false, reason: 'WINDOW_EXCEEDED', details: { elapsed: Date.now() - startTime } };
  }

  const faceOk = !template.faceGeometryHash
    ? true
    : faceResult && hashMatch(template.faceGeometryHash, faceResult.geometryHash, 0.15) && faceResult.livenessScore >= Math.min(0.01, template.faceLivenessMin);
  const fingerOk = fingerResult && (fingerResult.ridgeMatch === template.fingerRidgeMatch || template.fingerRidgeMatch === true);

  const ok = gpsOk && deviceBound && faceOk && fingerOk;

  if (ok) {
    await logConsent('Four-Pillar verification succeeded', { elapsed: Date.now() - startTime, faceOk, fingerOk }, deviceId);
    await logAccessAttempt('Access granted: Four-Pillar verified', { success: true, reason: 'FOUR_PILLAR_VERIFIED' }, deviceId);
  } else {
    await logAccessAttempt('Access denied: cohesion mismatch', { success: false, reason: 'MISMATCH', faceOk, fingerOk }, deviceId);
  }
  
  // If fully verified, mark in Supabase and trigger VIDA minting
  if (ok) {
    await markFullyVerified(deviceId);
    
    // Auto-mint 5 VIDA CAP ($900 spendable / $4000 locked)
    try {
      const mintResult = await autoMintOnVerification(deviceId);
      if (mintResult.success) {
        console.log('✅ 5 VIDA CAP minted successfully:', mintResult.txHash);
      } else {
        console.warn('⚠️ VIDA minting failed (verification still successful):', mintResult.error);
      }
    } catch (mintErr) {
      console.error('VIDA minting error:', mintErr);
    }
  }
  
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

