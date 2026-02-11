/**
 * PFF Sovereign Handshake v2.0 — Face Layer
 * Captures 3D geometry proxy and liveness from front camera.
 * Channel 1 (Biometric Integrity): Reject liveness < LIVENESS_MIN to prevent deepfake/photo-spoofing.
 */

/** Minimum liveness confidence (0–1). Below this, scan is rejected (anti–deepfake / photo-spoofing). */
const DEFAULT_LIVENESS_MIN = 0.98;
export const LIVENESS_MIN =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LIVENESS_MIN != null)
    ? Number(import.meta.env.VITE_LIVENESS_MIN)
    : DEFAULT_LIVENESS_MIN;

let stream = null;
let videoEl = null;
let canvasEl = null;

/**
 * Start front camera and attach to video element.
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<MediaStream>}
 */
export async function startFaceCapture(video, canvas) {
  videoEl = video;
  canvasEl = canvas;
  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

/**
 * Stop face capture and release camera.
 */
export function stopFaceCapture() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  if (videoEl && videoEl.srcObject) {
    videoEl.srcObject = null;
  }
}

/**
 * Capture one frame and compute a simple "geometry + liveness" signature.
 * In production this would use face-api.js or a 3D mesh; here we use
 * canvas pixel hash + motion between two frames as liveness proxy.
 * @returns {Promise<{ geometryHash: string, livenessScore: number }>}
 */
export async function captureFaceSignals() {
  if (!videoEl || !canvasEl || videoEl.readyState < 2) {
    throw new Error('Face capture not ready');
  }
  const ctx = canvasEl.getContext('2d');
  const w = Math.min(videoEl.videoWidth, 160);
  const h = Math.min(videoEl.videoHeight, 120);
  canvasEl.width = w;
  canvasEl.height = h;

  ctx.drawImage(videoEl, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const geometryHash = await hashImageData(imageData.data);

  // Liveness: capture again after short delay and compare (motion/blink proxy)
  await new Promise((r) => setTimeout(r, 150));
  ctx.drawImage(videoEl, 0, 0, w, h);
  const imageData2 = ctx.getImageData(0, 0, w, h);
  const diff = pixelDiff(imageData.data, imageData2.data);
  const livenessScore = Math.min(1, diff / 0.01);

  // Channel 1: Reject if below threshold (deepfake/photo-spoof protection)
  if (livenessScore < LIVENESS_MIN) {
    throw new Error(`LIVENESS_REJECTED: score ${livenessScore.toFixed(3)} below minimum ${LIVENESS_MIN}`);
  }

  return { geometryHash, livenessScore };
}

async function hashImageData(data) {
  const buffer = data.buffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/**
 * Get current frame geometry hash only (single frame, no liveness). Used by intruder monitor.
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<string>}
 */
export async function getFrameGeometryHash(video, canvas) {
  if (!video || !canvas || video.readyState < 2) return '';
  const ctx = canvas.getContext('2d');
  const w = Math.min(video.videoWidth, 320);
  const h = Math.min(video.videoHeight, 240);
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  return hashImageData(imageData.data);
}

function pixelDiff(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 4) {
    sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  }
  return sum / (a.length / 4) / (255 * 3);
}
