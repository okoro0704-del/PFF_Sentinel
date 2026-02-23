/**
 * PFF Sentinel — Bio-Stress Heartbeat Sync (Test 6)
 * Real-time BPM/HRV from wearable; Sovereign Baseline; duress detection (40% above baseline).
 */

const BASELINE_STORAGE_KEY = 'pff_sovereign_baseline_bpm';
const DURESS_THRESHOLD = parseFloat(import.meta.env.VITE_DURESS_THRESHOLD || '1.4');

let heartRateDevice = null;
let heartRateCharacteristic = null;
let lastBpm = 72;
let lastHrv = null;
let lastBeatTime = 0;
let onBpmUpdateCallback = null;

const HEART_RATE_SERVICE = 0x180d;
const HEART_RATE_MEASUREMENT = 0x2a37;

/**
 * Sovereign Baseline: user's resting BPM (Architect). Set during enrollment or config.
 */
export function getSovereignBaseline() {
  try {
    const b = parseInt(localStorage.getItem(BASELINE_STORAGE_KEY), 10);
    return Number.isFinite(b) && b > 0 ? b : 72;
  } catch {
    return 72;
  }
}

export function setSovereignBaseline(bpm) {
  try {
    const n = Math.round(Math.max(40, Math.min(200, bpm)));
    localStorage.setItem(BASELINE_STORAGE_KEY, String(n));
    return n;
  } catch {
    return getSovereignBaseline();
  }
}

/**
 * Check if current BPM indicates STRESSED/DURESS (≥40% above baseline).
 */
export function checkDuress(bpm) {
  const baseline = getSovereignBaseline();
  return bpm >= baseline * DURESS_THRESHOLD;
}

/**
 * Request BLE Heart Rate device and subscribe for real-time BPM (and RR for HRV).
 * Falls back to simulated/default if Web Bluetooth unavailable or user cancels.
 */
export async function connectHeartRateSensor() {
  if (!navigator.bluetooth) return { bpm: lastBpm, hrv: lastHrv, source: 'fallback' };
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HEART_RATE_SERVICE] }],
      optionalServices: [HEART_RATE_SERVICE],
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(HEART_RATE_SERVICE);
    const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT);
    heartRateDevice = device;
    heartRateCharacteristic = characteristic;
    await characteristic.startNotifications();
    characteristic.addEventListener('characteristicvaluechanged', (event) => {
      const value = event.target.value;
      const { bpm, hrv } = parseHeartRateMeasurement(value);
      lastBpm = bpm;
      lastHrv = hrv;
      lastBeatTime = Date.now();
      onBpmUpdateCallback?.(bpm, hrv);
    });
    const initial = await characteristic.readValue();
    const { bpm, hrv } = parseHeartRateMeasurement(initial);
    lastBpm = bpm;
    lastHrv = hrv;
    return { bpm, hrv, source: 'ble' };
  } catch (e) {
    return { bpm: lastBpm, hrv: lastHrv, source: 'fallback' };
  }
}

function parseHeartRateMeasurement(dataView) {
  const flags = dataView.getUint8(0);
  const rate16 = flags & 0x01;
  let bpm = rate16 ? dataView.getUint16(1, true) : dataView.getUint8(1);
  let hrv = null;
  if (dataView.byteLength >= (rate16 ? 4 : 3)) {
    const rrPresent = (flags & 0x10) !== 0;
    if (rrPresent) {
      const rr = rate16 ? dataView.getUint16(3, true) : dataView.getUint16(2, true);
      hrv = rr / 1024;
    }
  }
  return { bpm: Math.min(255, bpm), hrv };
}

/**
 * Get current heart rate (from sensor or last known / fallback).
 */
export async function getCurrentHeartRate() {
  if (heartRateCharacteristic) {
    try {
      const value = await heartRateCharacteristic.readValue();
      const { bpm, hrv } = parseHeartRateMeasurement(value);
      lastBpm = bpm;
      lastHrv = hrv;
      return { bpm, hrv, source: 'ble' };
    } catch (_) {}
  }
  return { bpm: lastBpm, hrv: lastHrv, source: 'fallback' };
}

/**
 * Disconnect BLE heart rate sensor.
 */
export function disconnectHeartRateSensor() {
  if (heartRateDevice?.gatt?.connected) {
    heartRateDevice.gatt.disconnect();
  }
  heartRateDevice = null;
  heartRateCharacteristic = null;
}

/**
 * Register callback for real-time BPM updates (for Visual Pulse / Fabric).
 * @param {(bpm: number, hrv?: number | null) => void} callback
 */
export function onBpmUpdate(callback) {
  onBpmUpdateCallback = callback;
}

/**
 * Get last known BPM (for fabric when no sensor connected).
 */
export function getLastBpm() {
  return lastBpm;
}

/**
 * Set BPM from external source (e.g. mobile app, mock). Updates lastBpm and notifies callback.
 */
export function setBpmFromExternal(bpm) {
  const n = Math.round(Math.max(40, Math.min(200, bpm)));
  lastBpm = n;
  lastBeatTime = Date.now();
  onBpmUpdateCallback?.(n, lastHrv);
}
