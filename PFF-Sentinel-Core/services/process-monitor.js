/**
 * PFF Sentinel — App-Wrapper Engine: Process Monitor
 * Background service that monitors running processes against the Sovereign List.
 * When a Protected App is launched: suspend process, notify Sentinel, release only after VALID_PRESENCE.
 * Run with Administrator privileges for process suspension (or install as Windows Service for Stealth Mode).
 */

import http from 'http';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const POLL_MS = 1500;
const SENTINEL_INTERCEPT_PORT = parseInt(process.env.SENTINEL_INTERCEPT_PORT || '3847', 10);
const MONITOR_RELEASE_PORT = parseInt(process.env.MONITOR_RELEASE_PORT || '3848', 10);
const SOVEREIGN_LIST_PATH = process.env.SOVEREIGN_LIST_PATH || path.join(__dirname, '..', 'config', 'sovereign-list.json');

let protectedSet = new Set();
let seenPids = new Map();
let suspended = new Map();

function loadSovereignList() {
  try {
    const raw = fs.readFileSync(SOVEREIGN_LIST_PATH, 'utf8');
    const data = JSON.parse(raw);
    const apps = data.protectedApps || [];
    protectedSet = new Set(apps.map((a) => (a.processName || a).toLowerCase().trim()));
    return protectedSet;
  } catch (e) {
    console.error('Sovereign list load failed:', e.message);
    return new Set();
  }
}

function getRunningProcesses() {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32'
      ? 'tasklist /fo csv /nh'
      : 'ps -eo pid,comm';
    exec(cmd, { timeout: 5000 }, (err, stdout) => {
      if (err) {
        resolve([]);
        return;
      }
      const lines = stdout.split(/\r?\n/).filter(Boolean);
      const procs = [];
      if (process.platform === 'win32') {
        for (const line of lines) {
          const m = line.match(/^"([^"]+)","(\d+)"/);
          if (m) {
            const name = (m[1] || '').toLowerCase();
            const pid = parseInt(m[2], 10);
            if (name && !isNaN(pid)) procs.push({ pid, name });
          }
        }
      } else {
        for (const line of lines.slice(1)) {
          const m = line.trim().match(/^\s*(\d+)\s+(.+)$/);
          if (m) procs.push({ pid: parseInt(m[1], 10), name: (m[2] || '').toLowerCase() });
        }
      }
      resolve(procs);
    });
  });
}

function suspendProcess(pid) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve(false);
      return;
    }
    exec(`powershell -NoProfile -Command "Suspend-Process -Id ${pid} -ErrorAction SilentlyContinue"`, { timeout: 3000 }, (err) => {
      resolve(!err);
    });
  });
}

function resumeProcess(pid) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve(false);
      return;
    }
    exec(`powershell -NoProfile -Command "Resume-Process -Id ${pid} -ErrorAction SilentlyContinue"`, { timeout: 3000 }, (err) => {
      resolve(!err);
    });
  });
}

function notifySentinel(processName, pid) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ processName, pid });
    const req = http.request({
      hostname: '127.0.0.1',
      port: SENTINEL_INTERCEPT_PORT,
      path: '/app-intercept',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 5000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ ok: res.statusCode === 200, data }));
    });
    req.on('error', () => resolve({ ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false }); });
    req.write(body);
    req.end();
  });
}

async function poll() {
  loadSovereignList();
  if (protectedSet.size === 0) return;

  const procs = await getRunningProcesses();
  for (const { pid, name } of procs) {
    const key = `${name}|${pid}`;
    if (seenPids.has(key)) continue;
    const baseName = name.split(/[/\\]/).pop() || name;
    if (!protectedSet.has(baseName)) continue;

    seenPids.set(key, true);
    const ok = await suspendProcess(pid);
    if (ok) suspended.set(pid, { processName: baseName, at: Date.now() });
    const sent = await notifySentinel(baseName, pid);
    if (!sent.ok && ok) await resumeProcess(pid);
  }
}

const releaseServer = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/release') {
    res.writeHead(404);
    res.end();
    return;
  }
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    try {
      const { pid, processName } = JSON.parse(body);
      if (pid == null) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'pid required' }));
        return;
      }
      resumeProcess(pid).then((ok) => {
        suspended.delete(pid);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ released: ok, pid, processName }));
      });
    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

releaseServer.listen(MONITOR_RELEASE_PORT, '127.0.0.1', () => {
  console.log(`Process Monitor: release server on 127.0.0.1:${MONITOR_RELEASE_PORT}`);
  loadSovereignList();
  setInterval(poll, POLL_MS);
});
