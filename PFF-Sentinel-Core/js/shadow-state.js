/**
 * PFF Sentinel — Shadow State (Duress)
 * When STRESSED/DURESS is flagged: do NOT deny access; show decoy UI; disable Money-Out.
 */

const SHADOW_MODE_KEY = 'pff_shadow_mode';

let shadowMode = false;

export function isShadowMode() {
  try {
    return localStorage.getItem(SHADOW_MODE_KEY) === 'active' || shadowMode;
  } catch {
    return shadowMode;
  }
}

export function setShadowMode(active) {
  shadowMode = !!active;
  try {
    if (active) localStorage.setItem(SHADOW_MODE_KEY, 'active');
    else localStorage.removeItem(SHADOW_MODE_KEY);
  } catch (_) {}
}

/**
 * Guard: real outbound Money-Out must check this. When true, silently block all real transfers.
 */
export function canPerformMoneyOut() {
  return !isShadowMode();
}
