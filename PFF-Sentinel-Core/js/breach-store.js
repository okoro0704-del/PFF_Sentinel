/**
 * PFF Sentinel — Breach_Attempts store (VLT Truth Ledger)
 * Encrypt and store high-res photo + 3s video under Breach_Attempts.
 */

const DB_NAME = 'pff_vlt';
const DB_VERSION = 1;
const STORE_NAME = 'Breach_Attempts';
const KEY_DERIVATION_SALT = 'pff-sentinel-breach-v1';

let db = null;

async function getDb() {
  if (db) return db;
  db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
  return db;
}

async function getEncryptionKey() {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(KEY_DERIVATION_SALT + (navigator.userAgent || '')),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(KEY_DERIVATION_SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt blob with AES-GCM.
 * @param {Blob} blob
 * @returns {Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }>}
 */
async function encryptBlob(blob) {
  const buffer = await blob.arrayBuffer();
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    buffer
  );
  return { encrypted, iv };
}

/**
 * Store breach attempt: high-res photo + 3s video (encrypted) in Breach_Attempts.
 * @param {Blob} photoBlob
 * @param {Blob} videoBlob
 * @returns {Promise<{ id: number; timestamp: number }>}
 */
export async function storeBreachAttempt(photoBlob, videoBlob) {
  const database = await getDb();
  const [photoEnc, videoEnc] = await Promise.all([
    encryptBlob(photoBlob),
    encryptBlob(videoBlob),
  ]);
  const entry = {
    timestamp: Date.now(),
    photoEncrypted: Array.from(new Uint8Array(photoEnc.encrypted)),
    photoIv: Array.from(photoEnc.iv),
    videoEncrypted: Array.from(new Uint8Array(videoEnc.encrypted)),
    videoIv: Array.from(videoEnc.iv),
  };
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(entry);
    req.onsuccess = () => resolve({ id: req.result, timestamp: entry.timestamp });
    req.onerror = () => reject(req.error);
  });
}

/**
 * List breach attempts for VLT display (metadata only).
 * @returns {Promise<Array<{ id: number; timestamp: number }>>}
 */
export async function listBreachAttempts() {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = req.result || [];
      resolve(rows.map((r) => ({ id: r.id, timestamp: r.timestamp })));
    };
    req.onerror = () => reject(req.error);
  });
}
