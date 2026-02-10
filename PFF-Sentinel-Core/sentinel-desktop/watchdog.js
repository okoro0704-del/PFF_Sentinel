/**
 * PFF Sentinel — Anti-Kill Daemon (Watchdog)
 * Spawns the main Sentinel process (Electron). If it is closed or killed,
 * the Watchdog immediately relaunches it and triggers a Security Breach alert on the VLT.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ELECTRON_MAIN = path.join(__dirname, 'main.js');
const userDataDir =
  process.platform === 'win32'
    ? path.join(process.env.APPDATA || '', 'pff-sentinel-desktop')
    : path.join(process.env.HOME || '', '.config', 'pff-sentinel-desktop');
const BREACH_FILE = path.join(userDataDir, 'pff_security_breach.flag');

function ensureBreachDir() {
  const dir = path.dirname(BREACH_FILE);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (_) {}
  }
}

function triggerSecurityBreach() {
  ensureBreachDir();
  try {
    fs.writeFileSync(BREACH_FILE, Date.now().toString(), 'utf8');
  } catch (_) {}
}

function runSentinel() {
  const isWin = process.platform === 'win32';
  const electronBin = path.join(__dirname, 'node_modules', '.bin', isWin ? 'electron.cmd' : 'electron');
  const child = spawn(electronBin, ['.'], {
    stdio: 'inherit',
    cwd: __dirname,
    detached: true,
    env: { ...process.env, SENTINEL_URL: process.env.SENTINEL_URL || 'http://localhost:5173' },
  });

  child.on('exit', (code, signal) => {
    triggerSecurityBreach();
    setTimeout(() => runSentinel(), 500);
  });

  child.unref();
}

runSentinel();
