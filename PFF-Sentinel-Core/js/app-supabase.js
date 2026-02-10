/**
 * PFF Sovereign Handshake v2.0 — Master Handshake App WITH SUPABASE
 * Four-Pillar Anchor: GPS, Device, Face, Fingerprint.
 * Background listener for Lock_Command from LifeOS Admin → Hard-Lock overlay.
 * Unlock only via verified Four-Pillar handshake (offline-capable).
 * NOW WITH: GPS + Device sync to Supabase on startup, VIDA minting on verification
 */

import { startFaceCapture, stopFaceCapture, captureFaceSignals } from './capture-face.js';
import { initLocationLayer, getLocationStatus, getCurrentLocation, captureLocation } from './location-layer.js';
import { captureFingerprintSignals, startPulseDetection, stopPulseDetection } from './capture-finger.js';
import { verifyCohesion, storeAbsoluteTruthTemplate, loadAbsoluteTruthTemplate } from './handshake-core-supabase.js';
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
import { updateFourPillarAnchors } from './supabase-client.js';
import { connectWallet, isWalletConnected } from './SovereignProvider.js';
import { startMintingStatusListener, onVaultSecured } from './minting-status-bridge.js';
import { logConsent } from './consent-log-stream.js';

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
let fourPillarAnchorsReady = false;

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
  const gpsStatus = getLocationStatus();
  deviceInfoEl.textContent = `Device: ${uuid.substring(0, 12)}... · Bound: ${bound ? 'Yes' : 'No'} · GPS: ${gpsStatus}`;
}

function setStatus(id, text, active = false) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
  const cellId = id.replace('faceStatus', 'faceArea').replace('fingerStatus', 'fingerCell');
  const cellEl = document.getElementById(cellId);
  if (cellEl) cellEl.classList.toggle('active', active);
}

/**
 * Initialize Four-Pillar Anchors (GPS + Device) on app startup
 * Syncs to Supabase BEFORE user reaches biometric screen
 */
async function initFourPillarAnchors() {
  try {
    console.log('🔐 Initializing Four-Pillar Anchors...');
    
    // Step 1: Initialize GPS (silent background capture)
    await initLocationLayer();
    const gpsLocation = getCurrentLocation();
    
    // Step 2: Get Device UUID
    const deviceUUID = await getDeviceUUID();
    
    // Step 3: Sync to Supabase
    if (gpsLocation && gpsLocation.latitude && gpsLocation.longitude) {
      await updateFourPillarAnchors(deviceUUID, {
        gps_latitude: gpsLocation.latitude,
        gps_longitude: gpsLocation.longitude,
        gps_accuracy: gpsLocation.accuracy || 0,
        device_uuid: deviceUUID
      });
      
      fourPillarAnchorsReady = true;
      console.log('✅ Four-Pillar Anchors synced to Supabase:', {
        gps: `${gpsLocation.latitude.toFixed(6)}, ${gpsLocation.longitude.toFixed(6)}`,
        device: deviceUUID.substring(0, 12) + '...'
      });
    } else {
      console.warn('⚠️ GPS not locked yet, will retry...');
      fourPillarAnchorsReady = false;
    }
    
    await refreshDeviceInfo();
  } catch (err) {
    console.error('❌ Four-Pillar Anchor initialization error:', err);
    fourPillarAnchorsReady = false;
  }
}

/**
 * Start biometric capture: Face (camera) + Finger (WebAuthn)
 * Fabric animation starts and pulses with heartbeat.
 */
async function startScan() {
  if (scanActive) return;
  
  // Ensure Four-Pillar Anchors are ready
  if (!fourPillarAnchorsReady) {
    showResult('⚠️ Initializing GPS and Device anchors...', false);
    await initFourPillarAnchors();
    if (!fourPillarAnchorsReady) {
      showResult('❌ GPS not locked. Please enable location services.', false);
      return;
    }
  }
  
  scanActive = true;
  hideResult();
  setStatus('faceStatus', 'Starting…', true);
  setStatus('fingerStatus', 'Starting…', true);

  try {
    faceCanvas.width = 640;
    faceCanvas.height = 480;

    await startFaceCapture(faceVideo, faceCanvas);

    setStatus('faceStatus', 'Live', true);
    setStatus('fingerStatus', 'Touch sensor when ready', true);

    try {
      await connectHeartRateSensor();
    } catch (_) {}
    startFabricAnimation(fabricLayer, () => getLastBpm());
    stopPulse = startPulseDetection(getLastBpm(), (phase) => {
      setPulsePhase(phase);
      updateFabricGlow(phase);
    });

    showResult('✅ Scan active — Face + Fingerprint ready', true);
  } catch (err) {
    console.error('Start scan error:', err);
    showResult('❌ Failed to start scan: ' + err.message, false);
    scanActive = false;
  }
}

/**
 * Stop scan and release resources
 */
function stopScan() {
  if (!scanActive) return;
  scanActive = false;
  stopFaceCapture();
  if (stopPulse) {
    stopPulse();
    stopPulse = null;
  }
  stopFabricAnimation();
  setStatus('faceStatus', 'Stopped', false);
  setStatus('fingerStatus', 'Stopped', false);
}

/**
 * Verify Four-Pillar cohesion (GPS + Device + Face + Fingerprint)
 * On success: marks is_fully_verified=TRUE in Supabase and triggers VIDA minting
 */
async function verify() {
  if (!scanActive) {
    showResult('❌ Start scan first', false);
    return;
  }

  hideResult();
  showResult('🔍 Verifying Four-Pillar Anchor...', false);

  try {
    const result = await verifyCohesion({ video: faceVideo, canvas: faceCanvas });
    if (result.ok) {
      showResult(`✅ FOUR-PILLAR VERIFIED! Elapsed: ${result.details.elapsed}ms`, true);
      console.log('Verification details:', result.details);
    } else {
      showResult(`❌ Verification failed: ${result.reason}`, false);
      console.warn('Verification failed:', result);
    }
  } catch (err) {
    console.error('Verify error:', err);
    showResult('❌ Verification error: ' + err.message, false);
  }
}

/**
 * Enroll current biometric signals as Absolute Truth Template
 * Syncs to Supabase
 */
async function enroll() {
  if (!scanActive) {
    showResult('❌ Start scan first', false);
    return;
  }

  hideResult();
  showResult('📸 Enrolling template...', false);

  try {
    const [face, finger] = await Promise.all([
      captureFaceSignals(faceVideo, faceCanvas),
      captureFingerprintSignals(),
    ]);

    const gpsLocation = getCurrentLocation();
    const deviceUUID = await getDeviceUUID();

    const template = await storeAbsoluteTruthTemplate({
      face,
      finger,
      gpsLocation,
      deviceUUID,
    });

    await logConsent('Template enrolled and synced to Supabase', { action: 'enroll' }, deviceUUID);
    showResult('✅ Template enrolled and synced to Supabase!', true);
    console.log('Enrolled template:', template);
  } catch (err) {
    console.error('Enroll error:', err);
    showResult('❌ Enrollment failed: ' + err.message, false);
  }
}

/**
 * Bind current device as allowed
 */
async function bindDevice() {
  try {
    await bindCurrentDevice();
    await refreshDeviceInfo();
    showResult('✅ Device bound successfully', true);
  } catch (err) {
    console.error('Bind error:', err);
    showResult('❌ Bind failed: ' + err.message, false);
  }
}

/**
 * Connect Web3 wallet for VIDA token
 */
async function connectWeb3Wallet() {
  try {
    showResult('🔗 Connecting wallet...', false);
    const result = await connectWallet();
    if (result.success) {
      showResult(`✅ Wallet connected: ${result.address.substring(0, 10)}...`, true);
    } else {
      showResult(`❌ Wallet connection failed: ${result.error}`, false);
    }
  } catch (err) {
    console.error('Wallet connection error:', err);
    showResult('❌ Wallet error: ' + err.message, false);
  }
}

// Event listeners
btnStart.addEventListener('click', startScan);
btnVerify.addEventListener('click', verify);
btnEnroll.addEventListener('click', enroll);
btnBind.addEventListener('click', bindDevice);

// Initialize app
(async function init() {
  console.log('🚀 PFF Sentinel Protocol v2.0 — Four-Pillar Anchor + Supabase + RSK');

  // Initialize Four-Pillar Anchors (GPS + Device) on startup
  await initFourPillarAnchors();

  // Refresh device info
  await refreshDeviceInfo();

  // Start lock listener
  startLockListener();
  onLockCommand(() => {
    console.log('🔒 Lock_Command received');
    showLockOverlay();
  });

  // Start RSL listener
  startRSLListener();
  onDeVitalize(() => {
    console.log('🔴 DE_VITALIZE command received');
    setRemoteLockState(true);
    showRemoteLockOverlay();
  });

  // Apply lock state if active
  applyLockStateIfActive();

  // Apply shadow state if active
  applyShadowStateIfActive();

  // Load breach attempts
  const breaches = await listBreachAttempts();
  console.log(`VLT: ${breaches.length} breach attempts logged`);

  // Prompt wallet connection
  if (!isWalletConnected()) {
    console.log('💰 Web3 wallet not connected. Click to connect for VIDA minting.');
    // Add a button or auto-prompt here if desired
  }

  // Status bridge: when minting_status == COMPLETED, show Vault Secured on UI
  startMintingStatusListener();
  onVaultSecured(() => {
    showResult('🔒 Vault Secured', true);
  });

  console.log('✅ PFF Sentinel initialized');
})();

