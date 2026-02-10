/**
 * PFF Sentinel — Intruder Capture & Bio-Log (Test 5)
 * Motion & face detection when locked or protected app open.
 * Unrecognized face >2s → snap (photo + 3s video), encrypt, store Breach_Attempts.
 * Look-away >30s → trigger PFF Overlay. Second face → proximity alert (red border).
 */

import { getFrameGeometryHash } from './capture-face.js';
import { loadAbsoluteTruthTemplate } from './handshake-core.js';
import { faceHashMatches } from './handshake-core.js';
import { storeBreachAttempt } from './breach-store.js';

const CHECK_MS = 500;
const INTRUDER_THRESHOLD_MS = 2000;
const LOOK_AWAY_MS = 30000;
const INTRUDER_CHECKS = INTRUDER_THRESHOLD_MS / CHECK_MS;
const LOOK_AWAY_CHECKS = LOOK_AWAY_MS / CHECK_MS;
const FACE_MATCH_TOLERANCE = 0.25;

let stream = null;
let video = null;
let canvas = null;
let intervalId = null;
let unrecognizedCount = 0;
let authorizedLastSeen = 0;
let authorizedSeenCount = 0;
let onIntruderCallback = null;
let onLookAwayLockCallback = null;
let setProximityAlertCallback = null;

/**
 * Start camera for intruder monitoring (off-screen, minimal).
 */
async function startCamera() {
  if (stream) return stream;
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  canvas = document.createElement('canvas');
  return stream;
}

/**
 * Capture high-res photo (current frame at full resolution).
 */
function capturePhoto() {
  if (!video || !canvas || video.readyState < 2) return null;
  const w = video.videoWidth;
  const h = video.videoHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, w, h);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
}

/**
 * Capture 3-second video clip (silent, fast).
 */
async function captureVideoClip(durationMs = 3000) {
  if (!stream) return null;
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 2500000 });
  const chunks = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.start(100);
  await new Promise((r) => setTimeout(r, durationMs));
  recorder.stop();
  await new Promise((r) => (recorder.onstop = r));
  return new Blob(chunks, { type: 'video/webm' });
}

/**
 * Snap-Action: capture photo + 3s video, encrypt, store in Breach_Attempts, notify VLT.
 */
async function snapAction() {
  try {
    const photoBlob = await capturePhoto();
    const videoBlob = await captureVideoClip(3000);
    if (!photoBlob || !videoBlob) return;
    const { id, timestamp } = await storeBreachAttempt(photoBlob, videoBlob);
    onIntruderCallback?.({ id, timestamp });
  } catch (e) {
    console.error('Breach capture failed:', e);
  }
}

/**
 * Check one tick: compare frame hash to template, update counters, trigger snap or look-away.
 */
async function tick() {
  const template = loadAbsoluteTruthTemplate();
  if (!template?.faceGeometryHash) return;

  const hash = await getFrameGeometryHash(video, canvas);
  if (!hash) return;

  const isAuthorized = faceHashMatches(template.faceGeometryHash, hash, FACE_MATCH_TOLERANCE);

  if (isAuthorized) {
    unrecognizedCount = 0;
    authorizedLastSeen = Date.now();
    authorizedSeenCount++;
    setProximityAlertCallback?.(false);
  } else {
    authorizedSeenCount = 0;
    unrecognizedCount++;
    if (unrecognizedCount >= 2) setProximityAlertCallback?.(true);
    if (unrecognizedCount >= INTRUDER_CHECKS) {
      unrecognizedCount = 0;
      await snapAction();
    }
    if (authorizedLastSeen > 0 && (Date.now() - authorizedLastSeen) >= LOOK_AWAY_MS) {
      authorizedLastSeen = 0;
      onLookAwayLockCallback?.();
    }
  }
}

/**
 * Start intruder monitoring. Call when device is locked or protected app is open.
 * @param {Object} callbacks
 * @param {(entry: { id: number; timestamp: number }) => void} [callbacks.onIntruder] — breach captured, stored in Breach_Attempts
 * @param {() => void} [callbacks.onLookAwayLock] — authorized user looked away >30s, trigger PFF overlay
 * @param {(show: boolean) => void} [callbacks.setProximityAlert] — second face / shoulder surfing (red border)
 */
export async function startIntruderMonitor(callbacks = {}) {
  onIntruderCallback = callbacks.onIntruder;
  onLookAwayLockCallback = callbacks.onLookAwayLock;
  setProximityAlertCallback = callbacks.setProximityAlert;

  if (intervalId) return;
  await startCamera();
  intervalId = setInterval(tick, CHECK_MS);
}

/**
 * Stop intruder monitoring and release camera.
 */
export function stopIntruderMonitor() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  unrecognizedCount = 0;
  authorizedLastSeen = 0;
  authorizedSeenCount = 0;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  if (video?.srcObject) video.srcObject = null;
  video = null;
  canvas = null;
  setProximityAlertCallback?.(false);
}
