/**
 * PFF Sovereign Handshake v2.0 — "Wow" Fabric Animation
 * Glowing blue fabric that pulses in sync with the detected heartbeat during scan.
 */

let animationFrame = null;
let pulsePhase = 0;
let isRunning = false;

/**
 * Update the fabric animation with current heartbeat phase (0..1).
 * Call this from the pulse detector (e.g. 60fps) to drive the glow.
 * @param {number} phase 0 = diastole, 1 = next beat
 */
export function setPulsePhase(phase) {
  pulsePhase = phase;
}

/**
 * Start the fabric animation. The glow pulses with the given BPM or real-time BPM getter.
 * @param {HTMLElement} container - Element that wraps the fabric overlay
 * @param {number | (() => number)} bpmOrGetter - Beats per minute, or function returning current BPM (real-time sync)
 */
export function startFabricAnimation(container, bpmOrGetter = 72) {
  if (isRunning) return;
  isRunning = true;
  const getBpm = typeof bpmOrGetter === 'function' ? bpmOrGetter : () => bpmOrGetter;
  let lastTime = performance.now();
  let phase = 0;

  function tick(now) {
    if (!isRunning) return;
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    const bpm = Math.max(40, Math.min(200, getBpm() || 72));
    const periodMs = (60 * 1000) / bpm;
    phase = (phase + dt / (periodMs / 1000)) % 1;
    setPulsePhase(phase);
    updateFabricGlow(container, phase);
    animationFrame = requestAnimationFrame(tick);
  }
  animationFrame = requestAnimationFrame(tick);
}

/**
 * Drive fabric from external heartbeat phase (e.g. from capture-finger pulse).
 * @param {HTMLElement} container
 * @param {number} phase 0..1
 */
export function updateFabricGlow(container, phase = pulsePhase) {
  const intensity = 0.4 + 0.6 * Math.pow(Math.sin(phase * Math.PI * 2), 2);
  const scale = 1 + 0.08 * Math.sin(phase * Math.PI * 2);
  container.style.setProperty('--fabric-intensity', String(intensity));
  container.style.setProperty('--fabric-scale', String(scale));
}

/**
 * Stop the fabric animation.
 */
export function stopFabricAnimation() {
  isRunning = false;
  if (animationFrame != null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}
