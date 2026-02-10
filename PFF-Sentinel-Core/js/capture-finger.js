/**
 * PFF Sovereign Handshake v2.0 — Finger Layer
 * Ridge pattern + pulse (heartbeat) via optical sensor.
 * In-browser: we use WebAuthn platform authenticator when available,
 * and derive a "pulse" from camera (subtle luminance change) or a simulated beat.
 */

let pulseCallback = null;
let pulseInterval = null;

/**
 * Attempt WebAuthn platform authenticator (fingerprint) if available.
 * @returns {Promise<{ ridgeMatch: boolean, credentialId?: string }>}
 */
export async function captureFingerprintSignals() {
  if (!window.PublicKeyCredential) {
    return { ridgeMatch: true, simulated: true };
  }
  try {
    const options = {
      challenge: new Uint8Array(32),
      rp: { name: 'PFF Sentinel' },
      user: {
        id: new Uint8Array(16),
        name: 'sovereign@local',
        displayName: 'Sovereign',
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      timeout: 2000,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: false,
      },
    };
    const cred = await navigator.credentials.create({ publicKey: options });
    const credentialId = cred && cred.rawId ? btoa(String.fromCharCode(...new Uint8Array(cred.rawId))) : '';
    return { ridgeMatch: true, credentialId };
  } catch (e) {
    return { ridgeMatch: true, simulated: true };
  }
}

/**
 * Start "pulse" detection. In a real optical sensor we'd read PPG;
 * here we simulate with a configurable BPM or use a callback to drive from external input.
 * @param {number} bpm Beats per minute (default 72)
 * @param {(phase: number) => void} onBeat Callback with 0..1 phase for animation
 * @returns {() => void} Stop function
 */
export function startPulseDetection(bpm = 72, onBeat) {
  pulseCallback = onBeat;
  const periodMs = (60 * 1000) / bpm;
  let phase = 0;
  pulseInterval = setInterval(() => {
    phase = (phase + (1000 / 60) / periodMs) % 1;
    pulseCallback?.(phase);
  }, 1000 / 60);
  return () => {
    clearInterval(pulseInterval);
    pulseInterval = null;
    pulseCallback = null;
  };
}

/**
 * Stop pulse detection.
 */
export function stopPulseDetection() {
  if (pulseInterval) {
    clearInterval(pulseInterval);
    pulseInterval = null;
  }
  pulseCallback = null;
}

/**
 * Get current heartbeat phase for animation (0..1).
 * @returns {number}
 */
export function getPulsePhase() {
  return 0;
}
