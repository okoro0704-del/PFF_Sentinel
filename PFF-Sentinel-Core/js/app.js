/**
 * PFF Sovereign Handshake v2.0 â€” Master Handshake App
 * Four-Pillar Anchor: GPS, Device, Face, Fingerprint.
 * Background listener for Lock_Command from LifeOS Admin â†’ Hard-Lock overlay.
 * Unlock only via verified Four-Pillar handshake (offline-capable).
 */

import { startFaceCapture, stopFaceCapture, captureFaceSignals } from './capture-face.js';
import { initLocationLayer, getLocationStatus, getCurrentLocation } from './location-layer.js';
import { captureFingerprintSignals, startPulseDetection, stopPulseDetection } from './capture-finger.js';
import { verifyCohesion, storeAbsoluteTruthTemplate, loadAbsoluteTruthTemplate } from './handshake-core.js';
import { getDeviceUUID, bindCurrentDevice, getAllowedDeviceUUIDs } from './hardware-sync.js';
import { startFabricAnimation, stopFabricAnimation, updateFabricGlow, setPulsePhase } from './fabric-animation.js';
import { startLockListener, onLockCommand, isLockActive, setLockState, setRemoteLockState } from './lock-state.js';
import { showLockOverlay, showRemoteLockOverlay, showAppInterceptOverlay, applyLockStateIfActive } from './lock-overlay.js';
import { startRSLListener, onDeVitalize } from './rsl-listener.js';
import { listBreachAttempts } from './breach-store.js';
import {
  getCurrentHeartRate,
  checkDuress,
  getSovereignBaseline,
  setSovereignBaseline,
  connectHeartRateSensor,
  getLastBpm,
} from './heartbeat-sync.js';
import { setShadowMode } from './shadow-state.js';
import { showShadowUI, hideShadowUI, applyShadowStateIfActive } from './shadow-ui.js';

const faceVideo = document.getElementById('faceVideo');
const faceCanvas = document.getElementById('faceCanvas');
const faceArea = document.getElementById('faceArea');
const faceStatus = document.getElementById('faceStatus');
const fingerStatus = document.getElementById('fingerStatus');

const fabricLayer = document.getElementById('fabricLayer');
const btnStart = document.getElementById('btnStart');
const btnVerify = document.getElementById('btnVerify');
const btnEnroll = document.getElementById('btnEnroll');
const btnBind = document.getElementById('btnBind');
const resultEl = document.getElementById('result');
const deviceInfoEl = document.getElementById('deviceInfo');

let scanActive = false;
let stopPulse = null;

function showResult(message, success) {
  resultEl.textContent = message;
  resultEl.className = 'result visible ' + (success ? 'success' : 'error');
}

function hideResult() {
  resultEl.className = 'result';
}

async function refreshDeviceInfo() {
  const uuid = await getDeviceUUID();
  const allowed = getAllowedDeviceUUIDs();
  const bound = allowed.length === 0 || allowed.includes(uuid);
  deviceInfoEl.textContent = `Device: ${uuid} Â· Bound: ${bound ? 'Yes' : 'No'}`;
}

function setStatus(id, text, active = false) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
  const cellId = id.replace('faceStatus', 'faceArea').replace('fingerStatus', 'fingerCell');
  const cellEl = document.getElementById(cellId);
  if (cellEl) cellEl.classList.toggle('active', active);
}

/**
 * Start simultaneous capture: Face (camera), Finger (WebAuthn prompt), Voice (mic)
 * at the exact same time. Fabric animation starts and pulses with heartbeat.
 */
async function startScan() {
  if (scanActive) return;
  scanActive = true;
  hideResult();
  setStatus('faceStatus', 'Startingâ€¦', true);
  setStatus('fingerStatus', 'Startingâ€¦', true);
  setStatus('voiceStatus', 'Startingâ€¦', true);

  try {
    faceCanvas.width = 640;
    faceCanvas.height = 480;

    await Promise.all([
      startFaceCapture(faceVideo, faceCanvas),
      
    ]);

    setStatus('faceStatus', 'Live', true);
    
    setStatus('fingerStatus', 'Touch sensor when ready', true);

    try {
      setStatus('heartStatus', 'Connecting to heart rate sensor...', true);
      await connectHeartRateSensor();
      setStatus('heartStatus', 'Connected', true);
    } catch (_) {
      setStatus('heartStatus', 'Using fallback (no sensor)', true);
    }
    startFabricAnimation(fabricLayer, () => getLastBpm());
    stopPulse = startPulseDetection(getLastBpm(), (phase) => {
      setPulsePhase(phase);
      updateFabricGlow(fabricLayer, phase);
    });

    btnStart.textContent = 'Stop Scan';
  } catch (e) {
    let errorMessage = 'Could not start scan: ';
    if (e.message.includes('camera') || e.message.includes('getUserMedia')) {
      errorMessage += 'Camera access denied. Please grant camera permissions in your browser settings.';
    } else if (e.message.includes('NotFoundError')) {
      errorMessage += 'No camera found. Please connect a camera and try again.';
    } else {
      errorMessage += e.message;
    }
    showResult(errorMessage, false);
    setStatus('faceStatus', 'Error', false);
    setStatus('fingerStatus', 'Error', false);
    scanActive = false;
    btnStart.textContent = 'Start Scan';
  }
}

function stopScan() {
  if (!scanActive) return;
  scanActive = false;
  stopFaceCapture();
  
  stopPulseDetection();
  if (stopPulse) stopPulse();
  stopPulse = null;
  stopFabricAnimation();
  setStatus('faceStatus', 'Stopped', false);
  setStatus('fingerStatus', 'Stopped', false);
  
  btnStart.textContent = 'Start Scan';
}

/**
 * Verify cohesion: All 4 anchors must match Absolute Truth within 1.5s.
 * Heart rate is sampled; if BPM â‰¥40% above Sovereign Baseline, session is STRESSED/DURESS:
 * access is granted but Shadow UI is shown and Money-Out is silently disabled.
 */
async function runVerify() {
  hideResult();
  if (!scanActive) {
    showResult('Start Scan first, then click Verify Cohesion.', false);
    return;
  }
  resultEl.textContent = 'Verifyingâ€¦';
  resultEl.className = 'result visible';

  try {
    const { bpm, hrv, source } = await getCurrentHeartRate();
    const out = await verifyCohesion({ video: faceVideo, canvas: faceCanvas });
    const duress = checkDuress(bpm);
    const bioTimestamp = `Bio-Timestamp: BPM=${bpm}, HRV=${hrv != null ? hrv.toFixed(3) : 'â€”'}, Duress=${duress}, source=${source}`;
    appendVltLog(bioTimestamp);

    if (out.ok) {
      if (duress) {
        setShadowMode(true);
        showShadowUI();
        showResult('Access granted. Limited view active (stress/duress detected). Money-Out disabled.', true);
      } else {
        showResult('Cohesion verified. All 4 anchors match within 1.5s.', true);
      }
    } else {
      showResult(`Verification failed: ${out.reason || 'Mismatch'}. ${out.details?.message || ''}`, false);
    }
  } catch (e) {
    let errorMessage = 'Verification error: ';
    if (e.message.includes('network') || e.message.includes('fetch')) {
      errorMessage += 'Network connection issue. Please check your internet connection and try again.';
    } else if (e.message.includes('camera') || e.message.includes('video')) {
      errorMessage += 'Camera access issue. Please ensure camera permissions are granted.';
    } else if (e.message.includes('timeout')) {
      errorMessage += 'Verification timed out. Please try again.';
    } else {
      errorMessage += e.message;
    }
    showResult(errorMessage, false);
  }
}

function appendVltLog(message) {
  const logEl = document.getElementById('vltLog');
  if (logEl) {
    const li = document.createElement('li');
    li.className = 'vlt-log-entry vlt-bio-timestamp';
    li.textContent = message;
    logEl.appendChild(li);
    logEl.scrollTop = logEl.scrollHeight;
  }
}

/**
 * Enroll current capture as Absolute Truth Template. Sets Sovereign Baseline BPM from current heart rate if available.
 */
async function runEnroll() {
  hideResult();
  if (!scanActive) {
    showResult('Start Scan first, then Enroll.', false);
    return;
  }
  resultEl.textContent = 'Enrollingâ€¦';
  resultEl.className = 'result visible';

  try {
    const { bpm } = await getCurrentHeartRate();
    if (bpm && bpm >= 40 && bpm <= 200) setSovereignBaseline(bpm);
    const gpsLocation = getCurrentLocation(); const [face, finger] = await Promise.all([
      captureFaceSignals(faceVideo, faceCanvas),
      captureFingerprintSignals(),
      
    ]);
    const deviceUUID = await getDeviceUUID();
    storeAbsoluteTruthTemplate({ face, finger, gpsLocation, deviceUUID });
    showResult(`Absolute Truth Template stored. Sovereign Baseline BPM: ${getSovereignBaseline()}. You can now Verify Cohesion.`, true);
  } catch (e) {
    let errorMessage = 'Enrollment error: ';
    if (e.message.includes('camera') || e.message.includes('video')) {
      errorMessage += 'Camera access issue. Please ensure camera is working and try again.';
    } else if (e.message.includes('fingerprint') || e.message.includes('WebAuthn')) {
      errorMessage += 'Fingerprint sensor issue. Please ensure your device supports fingerprint authentication.';
    } else if (e.message.includes('location') || e.message.includes('GPS')) {
      errorMessage += 'Location access denied. Please grant location permissions.';
    } else {
      errorMessage += e.message;
    }
    showResult(errorMessage, false);
  }
}

/**
 * Bind this device (HP Laptop / mobile) to allowed list.
 */
async function runBind() {
  hideResult();
  try {
    const uuid = await bindCurrentDevice();
    showResult('This device is now bound: ' + uuid, true);
    refreshDeviceInfo();
  } catch (e) {
    showResult('Bind error: ' + e.message, false);
  }
}

btnStart.addEventListener('click', () => (scanActive ? stopScan() : startScan()));
btnVerify.addEventListener('click', runVerify);
btnEnroll.addEventListener('click', runEnroll);
btnBind.addEventListener('click', runBind);

// Background listener: on Lock_Command from LifeOS Admin â†’ instant Hard-Lock
onLockCommand(() => {
  setLockState(true);
  showLockOverlay();
});
startLockListener();

// Remote Sovereign Lock (RSL): WebSocket/long-poll for DE_VITALIZE â†’ red pulsing lock, persistent until 4-layer handshake
onDeVitalize(() => {
  setRemoteLockState(true);
  showRemoteLockOverlay();
});
startRSLListener();

// Service Worker message (when Admin sends Lock_Command to SW)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'Lock_Command') {
      setLockState(true);
      showLockOverlay();
    }
  });
}

// On load: if already in Lock State (e.g. reopened after lock, or offline), show overlay
applyLockStateIfActive();
// If Shadow Mode (duress) was active, show decoy UI
applyShadowStateIfActive();

refreshDeviceInfo();
if (!loadAbsoluteTruthTemplate()) {
  resultEl.textContent = 'No template yet. Start Scan â†’ Enroll Template, then Bind This Device.';
  resultEl.className = 'result visible';
}

// VLT: Security Breach alert (when running in Sentinel Desktop / Watchdog)
if (typeof window.sentinelDesktop !== 'undefined' && window.sentinelDesktop.onSecurityBreach) {
  window.sentinelDesktop.onSecurityBreach(() => {
    const vlt = document.getElementById('vltAlert');
    if (vlt) {
      vlt.classList.add('visible');
      setTimeout(() => vlt.classList.remove('visible'), 15000);
    }
  });
}

// App-Wrapper: when Process Monitor intercepts a protected app, show 4-layer overlay
if (typeof window.sentinelDesktop !== 'undefined' && window.sentinelDesktop.onAppIntercept) {
  window.sentinelDesktop.onAppIntercept((processName, pid) => {
    showAppInterceptOverlay(processName, pid, (pName, pPid) => {
      window.sentinelDesktop?.notifyValidPresence(pName, pPid);
    });
  });
}

// VLT: log Protected Access Granted entries
if (typeof window.sentinelDesktop !== 'undefined' && window.sentinelDesktop.onVltLog) {
  window.sentinelDesktop.onVltLog((message) => {
    const logEl = document.getElementById('vltLog');
    if (logEl) {
      const li = document.createElement('li');
      li.className = 'vlt-log-entry';
      li.textContent = message;
      logEl.appendChild(li);
      logEl.scrollTop = logEl.scrollHeight;
    }
  });
}

// VLT: Breach_Attempts â€” intruder capture logged to Truth Ledger
async function refreshBreachAttemptsList() {
  const listEl = document.getElementById('vltBreachList');
  if (!listEl) return;
  try {
    const entries = await listBreachAttempts();
    listEl.innerHTML = '';
    entries.forEach(({ id, timestamp }) => {
      const li = document.createElement('li');
      li.className = 'vlt-breach-entry';
      li.textContent = `Breach attempt captured â€” ${new Date(timestamp).toLocaleString()} (id: ${id})`;
      listEl.appendChild(li);
    });
  } catch (_) {}
}
window.addEventListener('vlt-breach-captured', (e) => {
  refreshBreachAttemptsList();
  const logEl = document.getElementById('vltLog');
  if (logEl) {
    const li = document.createElement('li');
    li.className = 'vlt-log-entry vlt-breach-log';
    li.textContent = `Breach attempt captured and stored in Breach_Attempts at ${new Date().toLocaleTimeString()}`;
    logEl.appendChild(li);
    logEl.scrollTop = logEl.scrollHeight;
  }
});
refreshBreachAttemptsList();

