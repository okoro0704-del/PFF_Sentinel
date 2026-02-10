/**
 * PFF Sentinel — Remote Sovereign Lock (RSL) Listener
 * Persistent encrypted WebSocket (or long-polling fallback) to LifeOS/Netlify backend.
 * Listens for DE_VITALIZE: {"command": "DE_VITALIZE", "auth_token": "ISREAL_OKORO_PFF"}
 */

const DE_VITALIZE = 'DE_VITALIZE';
const AUTH_TOKEN = 'ISREAL_OKORO_PFF';

let ws = null;
let pollTimer = null;
let onDeVitalizeCallback = null;
let config = { wsUrl: '', pollUrl: '', pollIntervalMs: 5000 };

/**
 * Load RSL backend config (wsUrl, pollUrl, pollIntervalMs).
 */
async function loadConfig() {
  try {
    const res = await fetch('/config/rsl-backend.json');
    if (res.ok) config = { ...config, ...(await res.json()) };
  } catch (_) {}
  const wsUrl = typeof process !== 'undefined' && process.env?.RSL_WS_URL
    ? process.env.RSL_WS_URL
    : (typeof window !== 'undefined' && window.__RSL_WS_URL__) || config.wsUrl;
  const pollUrl = typeof process !== 'undefined' && process.env?.RSL_POLL_URL
    ? process.env.RSL_POLL_URL
    : (typeof window !== 'undefined' && window.__RSL_POLL_URL__) || config.pollUrl;
  return { ...config, wsUrl: wsUrl || config.wsUrl, pollUrl: pollUrl || config.pollUrl };
}

/**
 * Validate DE_VITALIZE command and auth_token.
 */
function handleMessage(data) {
  if (!data || data.command !== DE_VITALIZE) return;
  if (data.auth_token !== AUTH_TOKEN) return;
  onDeVitalizeCallback?.();
}

/**
 * Connect WebSocket (encrypted wss when URL is https).
 */
function connectWs(wsUrl) {
  if (!wsUrl) return;
  const url = wsUrl.startsWith('http') ? wsUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:') : wsUrl;
  try {
    ws = new WebSocket(url);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (_) {}
    };
    ws.onclose = () => {
      ws = null;
      startLongPoll();
      setTimeout(() => connectWs(wsUrl), 10000);
    };
    ws.onerror = () => {
      ws?.close();
      ws = null;
      startLongPoll();
    };
  } catch (_) {
    startLongPoll();
  }
}

/**
 * Long-polling fallback: GET pollUrl, expect JSON array of commands.
 */
async function pollOnce(pollUrl) {
  if (!pollUrl) return;
  try {
    const res = await fetch(pollUrl, { method: 'GET', signal: AbortSignal.timeout(8000) });
    if (!res.ok) return;
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.commands ? data.commands : [data]);
    for (const item of list) handleMessage(item);
  } catch (_) {}
}

function startLongPoll() {
  if (pollTimer) return;
  const run = () => pollOnce(config.pollUrl).then(() => {
    pollTimer = setTimeout(run, config.pollIntervalMs);
  });
  run();
}

function stopLongPoll() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

/**
 * Register callback for DE_VITALIZE command.
 * @param {() => void} callback
 */
export function onDeVitalize(callback) {
  onDeVitalizeCallback = callback;
}

/**
 * Start RSL listener: WebSocket first, fallback to long-polling.
 */
export async function startRSLListener() {
  config = await loadConfig();
  stopLongPoll();
  if (config.wsUrl) connectWs(config.wsUrl);
  else if (config.pollUrl) startLongPoll();
}

/**
 * Stop WebSocket and long-polling.
 */
export function stopRSLListener() {
  if (ws) {
    ws.close();
    ws = null;
  }
  stopLongPoll();
}
