/**
 * PFF Sentinel — Unified Security Channels: SOVRYN Audit API
 * Channel 2: Challenge-Response (nonce issued before camera; payload signed, returned within 60s).
 * Channel 3: All requests to v1/sovryn/audit include x-sovryn-secret; API returns 401 if missing/incorrect.
 */

const AUDIT_NONCE_TTL_MS = 60 * 1000; // 60 seconds

const baseUrl = () =>
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SOVRYN_API_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SOVRYN_API_URL || import.meta.env?.SOVRYN_API_URL)) ||
  (typeof process !== 'undefined' && process.env?.VITE_SOVRYN_API_URL) ||
  '';

const secret = () =>
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SOVRYN_SECRET) ||
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SOVRYN_SECRET || import.meta.env?.SOVRYN_SECRET)) ||
  (typeof process !== 'undefined' && process.env?.VITE_SOVRYN_SECRET) ||
  '';

let currentChallenge = null;

/**
 * Channel 2: Fetch one-time nonce from API before opening camera.
 * Call this before startFaceCapture. Nonce is valid for 60 seconds.
 * @returns {Promise<{ nonce: string, expiresAt: number }>}
 */
export async function fetchChallenge() {
  const url = baseUrl();
  if (!url) {
    throw new Error('SOVRYN_API_URL not configured');
  }
  const apiUrl = `${url.replace(/\/$/, '')}/v1/sovryn/challenge`;
  const headers = {};
  const s = secret();
  if (s) headers['x-sovryn-secret'] = s;

  const res = await fetch(apiUrl, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...headers },
  });

  if (res.status === 401) {
    throw new Error('SOVRYN_UNAUTHORIZED: x-sovryn-secret missing or incorrect');
  }
  if (!res.ok) {
    throw new Error(`Challenge failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const nonce = data.nonce || data.challenge;
  if (!nonce) throw new Error('Invalid challenge response: missing nonce');

  const expiresAt = Date.now() + AUDIT_NONCE_TTL_MS;
  currentChallenge = { nonce, expiresAt };
  return { nonce, expiresAt };
}

/**
 * Check if the current challenge is still valid (within 60s).
 * @param {number} [expiresAt] - From fetchChallenge()
 * @returns {boolean}
 */
export function isChallengeValid(expiresAt) {
  const at = expiresAt ?? currentChallenge?.expiresAt;
  return at != null && Date.now() < at;
}

/**
 * Sign payload for audit (Channel 2: bind face scan to nonce).
 * Uses HMAC-SHA256(JSON.stringify(payload), nonce) as signature.
 * @param {Object} payload - Audit payload (face + nonce + device, etc.)
 * @param {string} nonce
 * @returns {Promise<{ payload: Object, signature: string }>}
 */
export async function signAuditPayload(payload, nonce) {
  const body = JSON.stringify({ ...payload, nonce });
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(nonce + (secret() || '')),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('pff-sovryn-audit-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'HMAC', length: 256, hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );
  const sigArray = Array.from(new Uint8Array(sigBuffer));
  const signature = sigArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return { payload: { ...payload, nonce }, signature };
}

/**
 * Channel 2 + 3: Submit signed audit to v1/sovryn/audit.
 * Must be called within 60s of fetchChallenge() or audit is voided.
 * Channel 3: Request includes x-sovryn-secret; API must return 401 if missing/incorrect.
 * @param {Object} facePayload - { geometryHash, livenessScore, ... }
 * @param {string} nonce - From fetchChallenge()
 * @param {number} expiresAt - From fetchChallenge()
 * @param {Object} [extra] - device_id, country_code, manual_audit_required, etc.
 * @returns {Promise<{ ok: boolean, voided?: boolean, error?: string }>}
 */
export async function submitAudit(facePayload, nonce, expiresAt, extra = {}) {
  if (!isChallengeValid(expiresAt)) {
    return { ok: false, voided: true, error: 'Audit voided: response after 60s' };
  }

  const url = baseUrl();
  if (!url) return { ok: false, error: 'SOVRYN_API_URL not configured' };

  const s = secret();
  if (!s) return { ok: false, error: 'SOVRYN_SECRET not configured' };

  const payload = {
    face: facePayload,
    ts: Date.now(),
    ...extra,
  };
  const { payload: signedPayload, signature } = await signAuditPayload(payload, nonce);

  const apiUrl = `${url.replace(/\/$/, '')}/v1/sovryn/audit`;
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sovryn-secret': s,
      'x-sovryn-signature': signature,
    },
    body: JSON.stringify(signedPayload),
  });

  if (res.status === 401) {
    return { ok: false, error: '401 Unauthorized: x-sovryn-secret missing or incorrect' };
  }
  if (!res.ok) {
    return { ok: false, error: `Audit failed: ${res.status} ${res.statusText}` };
  }

  return { ok: true };
}

/**
 * One-shot: fetch challenge, then (after you have face payload) submit audit.
 * Call fetchChallenge() before opening camera; after capture call submitAuditWithChallenge(faceResult, ...).
 */
export function getStoredChallenge() {
  return currentChallenge;
}

export function clearChallenge() {
  currentChallenge = null;
}
