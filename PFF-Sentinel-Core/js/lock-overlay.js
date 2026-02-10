/**
 * PFF Sentinel — Hard-Lock Overlay
 * On Lock_Command: instant 4-layer PFF overlay, disable all keyboard/mouse,
 * display "SOVEREIGN LOCK ACTIVE: ACCESS DENIED BY ARCHITECT."
 * Unlock only via verified 4-layer local handshake (offline-capable).
 */

import { startFaceCapture, stopFaceCapture, captureFaceSignals } from './capture-face.js';
import { startVoiceCapture, stopVoiceCapture, captureVoiceSignals } from './capture-voice.js';
import { captureFingerprintSignals, startPulseDetection, stopPulseDetection } from './capture-finger.js';
import { verifyCohesion } from './handshake-core.js';
import { startFabricAnimation, stopFabricAnimation, updateFabricGlow, setPulsePhase } from './fabric-animation.js';
import { setLockState, setRemoteLockState, isLockActive, isRemoteLockActive } from './lock-state.js';
import { startIntruderMonitor, stopIntruderMonitor } from './intruder-monitor.js';
import { getLastBpm } from './heartbeat-sync.js';

let overlayEl = null;
let blockHandlers = [];
let scanActive = false;
let stopPulse = null;

const MESSAGE = 'SOVEREIGN LOCK ACTIVE: ACCESS DENIED BY ARCHITECT.';

/**
 * Create and show the hard-lock overlay with 4-layer PFF unlock flow.
 * Disables all keyboard/mouse outside the unlock panel.
 */
export function showLockOverlay() {
  if (overlayEl && overlayEl.isConnected) return;

  overlayEl = document.createElement('div');
  overlayEl.id = 'pff-sovereign-lock-overlay';
  overlayEl.className = 'sovereign-lock-overlay';
  overlayEl.innerHTML = `
    <div class="sovereign-lock-message" aria-live="assertive">${MESSAGE}</div>
    <div class="sovereign-lock-offline-notice" id="lockOfflineNotice"></div>
    <div class="sovereign-lock-panel">
      <h2 class="sovereign-lock-title">Unlock: 4-Layer Handshake Required</h2>
      <p class="sovereign-lock-subtitle">Local verification only. Works offline.</p>
      <div class="lock-capture-grid">
        <div class="face-area capture-cell" id="lockFaceArea">
          <div class="label">Face (3D + Liveness)</div>
          <video id="lockFaceVideo" autoplay playsinline muted></video>
          <canvas id="lockFaceCanvas" aria-hidden="true" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;"></canvas>
          <div class="status" id="lockFaceStatus">—</div>
        </div>
        <div class="capture-cell finger-area" id="lockFingerCell">
          <div class="label">Finger (Ridge + Pulse)</div>
          <div class="icon" aria-hidden="true">👆</div>
          <div class="status" id="lockFingerStatus">—</div>
        </div>
        <div class="capture-cell voice-area" id="lockVoiceCell">
          <div class="label">Voice (Spectral)</div>
          <div class="icon" aria-hidden="true">🎤</div>
          <div class="status" id="lockVoiceStatus">—</div>
        </div>
      </div>
      <div class="lock-actions">
        <button type="button" class="btn btn-primary" id="lockBtnStart">Start Scan</button>
        <button type="button" class="btn btn-primary" id="lockBtnVerify" title="Verify Face, Finger, Voice, Heartbeat">Verify</button>
        <button type="button" class="btn btn-unlock" id="lockBtnUnlock" disabled title="Unlock only after all 4 layers verified SOVEREIGN">Unlock</button>
      </div>
      <div class="result" id="lockResult"></div>
    </div>
  `;

  document.body.appendChild(overlayEl);

  blockAllInputExceptPanel();
  updateOfflineNotice();
  window.addEventListener('online', updateOfflineNotice);
  window.addEventListener('offline', updateOfflineNotice);

  startIntruderMonitor({
    onIntruder: (entry) => window.dispatchEvent(new CustomEvent('vlt-breach-captured', { detail: entry })),
    onLookAwayLock: () => { setLockState(true); showLockOverlay(); },
    setProximityAlert: (show) => document.body.classList.toggle('proximity-alert', show),
  });

  const video = overlayEl.querySelector('#lockFaceVideo');
  const canvas = overlayEl.querySelector('#lockFaceCanvas');
  const fabricLayer = document.getElementById('fabricLayer');
  const panel = overlayEl.querySelector('.sovereign-lock-panel');

  overlayEl.querySelector('#lockBtnStart').addEventListener('click', async () => {
    if (scanActive) return stopLockScan(video, canvas);
    await startLockScan(video, canvas, overlayEl);
  });

  const btnVerify = overlayEl.querySelector('#lockBtnVerify');
  const btnUnlock = overlayEl.querySelector('#lockBtnUnlock');

  btnVerify.addEventListener('click', async () => {
    const resultEl = overlayEl.querySelector('#lockResult');
    if (!scanActive) {
      resultEl.textContent = 'Start Scan first, then Verify.';
      resultEl.className = 'result visible error';
      return;
    }
    resultEl.textContent = 'Verifying Face, Finger, Voice, Heartbeat…';
    resultEl.className = 'result visible';
    btnUnlock.disabled = true;
    btnUnlock.classList.remove('sovereign-verified');
    try {
      const out = await verifyCohesion({ video, canvas });
      if (out.ok) {
        resultEl.textContent = 'All 4 layers verified SOVEREIGN. You may Unlock.';
        resultEl.className = 'result visible success';
        btnUnlock.disabled = false;
        btnUnlock.classList.add('sovereign-verified');
      } else {
        resultEl.textContent = `Verification failed. ${out.reason || ''} ${out.details?.message || ''}`;
        resultEl.className = 'result visible error';
      }
    } catch (e) {
      resultEl.textContent = 'Error: ' + e.message;
      resultEl.className = 'result visible error';
    }
  });

  btnUnlock.addEventListener('click', () => {
    if (btnUnlock.disabled) return;
    setLockState(false);
    if (overlayEl?._isRemoteLock) setRemoteLockState(false);
    hideLockOverlay();
  });
}

const REMOTE_LOCK_MESSAGE = 'HARDWARE DE-VITALIZED: REMOTE LOCK INITIATED BY ARCHITECT.';

/**
 * Show Remote Sovereign Lock overlay: red pulsing screen + 4-layer handshake.
 * Only recovery is successful 4-Layer Handshake (Face + Finger + Heartbeat + Voice).
 */
export function showRemoteLockOverlay() {
  if (overlayEl && overlayEl.isConnected) return;

  overlayEl = document.createElement('div');
  overlayEl.id = 'pff-remote-lock-overlay';
  overlayEl.className = 'remote-lock-overlay';
  overlayEl._isRemoteLock = true;
  overlayEl.innerHTML = `
    <div class="remote-lock-pulse" aria-hidden="true"></div>
    <div class="sovereign-lock-message remote-lock-message" aria-live="assertive">${REMOTE_LOCK_MESSAGE}</div>
    <div class="sovereign-lock-offline-notice" id="lockOfflineNotice"></div>
    <div class="sovereign-lock-panel remote-lock-panel">
      <h2 class="sovereign-lock-title">Recovery: 4-Layer Handshake Only</h2>
      <p class="sovereign-lock-subtitle">Face + Finger + Heartbeat + Voice required to remove Remote Lock.</p>
      <div class="lock-capture-grid">
        <div class="face-area capture-cell" id="lockFaceArea">
          <div class="label">Face (3D + Liveness)</div>
          <video id="lockFaceVideo" autoplay playsinline muted></video>
          <canvas id="lockFaceCanvas" aria-hidden="true" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;"></canvas>
          <div class="status" id="lockFaceStatus">—</div>
        </div>
        <div class="capture-cell finger-area" id="lockFingerCell">
          <div class="label">Finger (Ridge + Pulse)</div>
          <div class="icon" aria-hidden="true">👆</div>
          <div class="status" id="lockFingerStatus">—</div>
        </div>
        <div class="capture-cell voice-area" id="lockVoiceCell">
          <div class="label">Voice (Spectral)</div>
          <div class="icon" aria-hidden="true">🎤</div>
          <div class="status" id="lockVoiceStatus">—</div>
        </div>
      </div>
      <div class="lock-actions">
        <button type="button" class="btn btn-primary" id="lockBtnStart">Start Scan</button>
        <button type="button" class="btn btn-primary" id="lockBtnVerify" title="Verify Face, Finger, Voice, Heartbeat">Verify</button>
        <button type="button" class="btn btn-unlock" id="lockBtnUnlock" disabled title="Unlock only after all 4 layers verified SOVEREIGN">Unlock</button>
      </div>
      <div class="result" id="lockResult"></div>
    </div>
  `;

  document.body.appendChild(overlayEl);
  blockAllInputExceptPanel();
  updateOfflineNotice();
  window.addEventListener('online', updateOfflineNotice);
  window.addEventListener('offline', updateOfflineNotice);

  startIntruderMonitor({
    onIntruder: (entry) => window.dispatchEvent(new CustomEvent('vlt-breach-captured', { detail: entry })),
    onLookAwayLock: () => { setRemoteLockState(true); showRemoteLockOverlay(); },
    setProximityAlert: (show) => document.body.classList.toggle('proximity-alert', show),
  });

  const video = overlayEl.querySelector('#lockFaceVideo');
  const canvas = overlayEl.querySelector('#lockFaceCanvas');
  const btnVerify = overlayEl.querySelector('#lockBtnVerify');
  const btnUnlock = overlayEl.querySelector('#lockBtnUnlock');

  overlayEl.querySelector('#lockBtnStart').addEventListener('click', async () => {
    if (scanActive) return stopLockScan(video, canvas);
    await startLockScan(video, canvas, overlayEl);
  });

  btnVerify.addEventListener('click', async () => {
    const resultEl = overlayEl.querySelector('#lockResult');
    if (!scanActive) {
      resultEl.textContent = 'Start Scan first, then Verify.';
      resultEl.className = 'result visible error';
      return;
    }
    resultEl.textContent = 'Verifying Face, Finger, Voice, Heartbeat…';
    resultEl.className = 'result visible';
    btnUnlock.disabled = true;
    btnUnlock.classList.remove('sovereign-verified');
    try {
      const out = await verifyCohesion({ video, canvas });
      if (out.ok) {
        resultEl.textContent = 'All 4 layers verified SOVEREIGN. You may Unlock.';
        resultEl.className = 'result visible success';
        btnUnlock.disabled = false;
        btnUnlock.classList.add('sovereign-verified');
      } else {
        resultEl.textContent = `Verification failed. ${out.reason || ''} ${out.details?.message || ''}`;
        resultEl.className = 'result visible error';
      }
    } catch (e) {
      resultEl.textContent = 'Error: ' + e.message;
      resultEl.className = 'result visible error';
    }
  });

  btnUnlock.addEventListener('click', () => {
    if (btnUnlock.disabled) return;
    setRemoteLockState(false);
    setLockState(false);
    overlayEl._isRemoteLock = false;
    hideLockOverlay();
  });
}

/**
 * Show 4-Layer PFF overlay for App Intercept: Protected App launched, verify to release.
 * Same UI as lock overlay; on VALID_PRESENCE (Verify → Unlock) calls onValidPresence(processName, pid).
 */
export function showAppInterceptOverlay(processName, pid, onValidPresence) {
  if (overlayEl && overlayEl.isConnected) return;

  const interceptMessage = `Protected App Launched: ${processName}. Verify to continue.`;
  overlayEl = document.createElement('div');
  overlayEl.id = 'pff-sovereign-lock-overlay';
  overlayEl.className = 'sovereign-lock-overlay';
  overlayEl._appIntercept = true;
  overlayEl._processName = processName;
  overlayEl._pid = pid;
  overlayEl._onValidPresence = onValidPresence;
  overlayEl.innerHTML = `
    <div class="sovereign-lock-message sovereign-lock-intercept" aria-live="assertive">${interceptMessage}</div>
    <div class="sovereign-lock-offline-notice" id="lockOfflineNotice"></div>
    <div class="sovereign-lock-panel">
      <h2 class="sovereign-lock-title">4-Layer Handshake Required</h2>
      <p class="sovereign-lock-subtitle">Face, Finger, Voice, Heartbeat — then Unlock to release ${processName}.</p>
      <div class="lock-capture-grid">
        <div class="face-area capture-cell" id="lockFaceArea">
          <div class="label">Face (3D + Liveness)</div>
          <video id="lockFaceVideo" autoplay playsinline muted></video>
          <canvas id="lockFaceCanvas" aria-hidden="true" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;"></canvas>
          <div class="status" id="lockFaceStatus">—</div>
        </div>
        <div class="capture-cell finger-area" id="lockFingerCell">
          <div class="label">Finger (Ridge + Pulse)</div>
          <div class="icon" aria-hidden="true">👆</div>
          <div class="status" id="lockFingerStatus">—</div>
        </div>
        <div class="capture-cell voice-area" id="lockVoiceCell">
          <div class="label">Voice (Spectral)</div>
          <div class="icon" aria-hidden="true">🎤</div>
          <div class="status" id="lockVoiceStatus">—</div>
        </div>
      </div>
      <div class="lock-actions">
        <button type="button" class="btn btn-primary" id="lockBtnStart">Start Scan</button>
        <button type="button" class="btn btn-primary" id="lockBtnVerify" title="Verify Face, Finger, Voice, Heartbeat">Verify</button>
        <button type="button" class="btn btn-unlock" id="lockBtnUnlock" disabled title="Unlock only after all 4 layers verified SOVEREIGN">Unlock</button>
      </div>
      <div class="result" id="lockResult"></div>
    </div>
  `;

  document.body.appendChild(overlayEl);
  blockAllInputExceptPanel();
  updateOfflineNotice();
  window.addEventListener('online', updateOfflineNotice);
  window.addEventListener('offline', updateOfflineNotice);

  startIntruderMonitor({
    onIntruder: (entry) => window.dispatchEvent(new CustomEvent('vlt-breach-captured', { detail: entry })),
    onLookAwayLock: () => { setLockState(true); showLockOverlay(); },
    setProximityAlert: (show) => document.body.classList.toggle('proximity-alert', show),
  });

  const video = overlayEl.querySelector('#lockFaceVideo');
  const canvas = overlayEl.querySelector('#lockFaceCanvas');
  const fabricLayer = document.getElementById('fabricLayer');
  const btnVerify = overlayEl.querySelector('#lockBtnVerify');
  const btnUnlock = overlayEl.querySelector('#lockBtnUnlock');

  overlayEl.querySelector('#lockBtnStart').addEventListener('click', async () => {
    if (scanActive) return stopLockScan(video, canvas);
    await startLockScan(video, canvas, overlayEl);
  });

  btnVerify.addEventListener('click', async () => {
    const resultEl = overlayEl.querySelector('#lockResult');
    if (!scanActive) {
      resultEl.textContent = 'Start Scan first, then Verify.';
      resultEl.className = 'result visible error';
      return;
    }
    resultEl.textContent = 'Verifying Face, Finger, Voice, Heartbeat…';
    resultEl.className = 'result visible';
    btnUnlock.disabled = true;
    btnUnlock.classList.remove('sovereign-verified');
    try {
      const out = await verifyCohesion({ video, canvas });
      if (out.ok) {
        resultEl.textContent = 'All 4 layers verified SOVEREIGN. You may Unlock.';
        resultEl.className = 'result visible success';
        btnUnlock.disabled = false;
        btnUnlock.classList.add('sovereign-verified');
      } else {
        resultEl.textContent = `Verification failed. ${out.reason || ''} ${out.details?.message || ''}`;
        resultEl.className = 'result visible error';
      }
    } catch (e) {
      resultEl.textContent = 'Error: ' + e.message;
      resultEl.className = 'result visible error';
    }
  });

  btnUnlock.addEventListener('click', () => {
    if (btnUnlock.disabled) return;
    const onValidPresence = overlayEl._onValidPresence;
    const processName = overlayEl._processName;
    const pid = overlayEl._pid;
    overlayEl._appIntercept = false;
    overlayEl._onValidPresence = null;
    hideLockOverlay();
    onValidPresence?.(processName, pid);
  });
}

function updateOfflineNotice() {
  const notice = document.getElementById('lockOfflineNotice');
  if (!notice) return;
  if (!navigator.onLine) {
    notice.textContent = 'Offline. Unlock only via 4-layer local handshake.';
    notice.classList.add('visible');
  } else {
    notice.textContent = '';
    notice.classList.remove('visible');
  }
}

function blockAllInputExceptPanel() {
  const panel = overlayEl?.querySelector('.sovereign-lock-panel');
  const prevent = (e) => {
    if (panel && panel.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const events = ['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel', 'touchstart', 'touchend'];
  events.forEach((type) => {
    const h = (e) => prevent(e);
    document.addEventListener(type, h, true);
    blockHandlers.push({ type, h });
  });

  document.body.style.pointerEvents = 'none';
  document.body.style.userSelect = 'none';
  if (overlayEl) {
    overlayEl.style.pointerEvents = 'auto';
    if (panel) panel.style.pointerEvents = 'auto';
  }
}

function unblockInput() {
  blockHandlers.forEach(({ type, h }) => document.removeEventListener(type, h, true));
  blockHandlers = [];
  document.body.style.pointerEvents = '';
  document.body.style.userSelect = '';
}

async function startLockScan(video, canvas, overlayEl) {
  scanActive = true;
  const setStatus = (id, text, active) => {
    const el = overlayEl.querySelector(`#${id}`);
    if (el) el.textContent = text;
    const cellId = id.replace('lockFaceStatus', 'lockFaceArea').replace('lockFingerStatus', 'lockFingerCell').replace('lockVoiceStatus', 'lockVoiceCell');
    const cell = overlayEl.querySelector(`#${cellId}`);
    if (cell) cell.classList.toggle('active', active);
  };
  setStatus('lockFaceStatus', 'Starting…', true);
  setStatus('lockFingerStatus', 'Starting…', true);
  setStatus('lockVoiceStatus', 'Starting…', true);
  try {
    canvas.width = 640;
    canvas.height = 480;
    await Promise.all([startFaceCapture(video, canvas), startVoiceCapture()]);
    setStatus('lockFaceStatus', 'Live', true);
    setStatus('lockVoiceStatus', 'Live', true);
    setStatus('lockFingerStatus', 'Touch sensor when ready', true);
    const fabricLayer = document.getElementById('fabricLayer');
    if (fabricLayer) {
      startFabricAnimation(fabricLayer, () => getLastBpm());
      stopPulse = startPulseDetection(72, (phase) => {
        setPulsePhase(phase);
        updateFabricGlow(fabricLayer, phase);
      });
    }
    overlayEl.querySelector('#lockBtnStart').textContent = 'Stop Scan';
  } catch (e) {
    setStatus('lockFaceStatus', 'Error', false);
    setStatus('lockVoiceStatus', 'Error', false);
    setStatus('lockFingerStatus', 'Error', false);
    scanActive = false;
  }
}

function stopLockScan(video, canvas) {
  if (!scanActive) return;
  scanActive = false;
  stopFaceCapture();
  stopVoiceCapture();
  stopPulseDetection();
  if (stopPulse) stopPulse();
  stopPulse = null;
  stopFabricAnimation();
  const setStatus = (id, text, active) => {
    const el = overlayEl?.querySelector(`#${id}`);
    if (el) el.textContent = text;
    const cellId = id.replace('lockFaceStatus', 'lockFaceArea').replace('lockFingerStatus', 'lockFingerCell').replace('lockVoiceStatus', 'lockVoiceCell');
    const cell = overlayEl?.querySelector(`#${cellId}`);
    if (cell) cell.classList.toggle('active', active);
  };
  setStatus('lockFaceStatus', '—', false);
  setStatus('lockFingerStatus', '—', false);
  setStatus('lockVoiceStatus', '—', false);
  if (overlayEl) overlayEl.querySelector('#lockBtnStart').textContent = 'Start Scan';
}

/**
 * Hide lock overlay and re-enable all input.
 */
export function hideLockOverlay() {
  stopIntruderMonitor();
  document.body.classList.remove('proximity-alert');
  if (overlayEl && scanActive) {
    stopLockScan(
      overlayEl.querySelector('#lockFaceVideo'),
      overlayEl.querySelector('#lockFaceCanvas')
    );
  }
  unblockInput();
  if (overlayEl && overlayEl.parentNode) {
    overlayEl.parentNode.removeChild(overlayEl);
  }
  overlayEl = null;
}

/**
 * If lock state is active, show overlay (e.g. on load or when coming back from another tab).
 * Remote Lock (DE_VITALIZE) takes precedence so reboot returns to red lock screen.
 */
export function applyLockStateIfActive() {
  if (isRemoteLockActive()) showRemoteLockOverlay();
  else if (isLockActive()) showLockOverlay();
}
