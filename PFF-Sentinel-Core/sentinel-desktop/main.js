/**
 * PFF Sentinel — Mandatory Sentinel Overlay (Electron)
 * Always-on-top fullscreen window. App-Wrapper: intercept protected app launches.
 * Watches for Security Breach (from Watchdog) and notifies renderer for VLT.
 */

const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const SENTINEL_URL = process.env.SENTINEL_URL || 'http://localhost:5173';
const SENTINEL_INTERCEPT_PORT = parseInt(process.env.SENTINEL_INTERCEPT_PORT || '3847', 10);
const MONITOR_RELEASE_PORT = parseInt(process.env.MONITOR_RELEASE_PORT || '3848', 10);
const BREACH_FILE = path.join(app.getPath('userData'), 'pff_security_breach.flag');
let mainWindow = null;
let breachWatcher = null;
let interceptServer = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width,
    height,
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.loadURL(SENTINEL_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  startBreachWatcher();
  startInterceptServer();
  setupValidPresenceHandler();
}

function startInterceptServer() {
  if (interceptServer) return;
  interceptServer = http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/app-intercept') {
      res.writeHead(404);
      res.end();
      return;
    }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { processName, pid } = JSON.parse(body);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('app-intercept', { processName, pid });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  });
  interceptServer.listen(SENTINEL_INTERCEPT_PORT, '127.0.0.1', () => {
    console.log('Sentinel intercept server on 127.0.0.1:' + SENTINEL_INTERCEPT_PORT);
  });
}

function releaseProcessAndLog(processName, pid) {
  const body = JSON.stringify({ processName, pid });
  const req = http.request({
    hostname: '127.0.0.1',
    port: MONITOR_RELEASE_PORT,
    path: '/release',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    timeout: 5000,
  }, (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      const message = `Protected Access Granted: ${processName} via 4-Layer Handshake`;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('vlt-log', message);
      }
    });
  });
  req.on('error', () => {});
  req.write(body);
  req.end();
}

function setupValidPresenceHandler() {
  ipcMain.on('valid-presence', (_e, { processName, pid }) => {
    releaseProcessAndLog(processName, pid);
  });
}

function startBreachWatcher() {
  try {
    if (breachWatcher) fs.unwatchFile(BREACH_FILE, breachWatcher);
    if (fs.existsSync(BREACH_FILE)) {
      notifySecurityBreach();
      try { fs.unlinkSync(BREACH_FILE); } catch (_) {}
    }
    breachWatcher = () => {
      if (fs.existsSync(BREACH_FILE)) {
        notifySecurityBreach();
        try { fs.unlinkSync(BREACH_FILE); } catch (_) {}
      }
    };
    fs.watchFile(BREACH_FILE, breachWatcher);
  } catch (_) {}
}

function notifySecurityBreach() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('security-breach');
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (breachWatcher && BREACH_FILE) {
    try { fs.unwatchFile(BREACH_FILE, breachWatcher); } catch (_) {}
  }
  if (interceptServer) {
    try { interceptServer.close(); } catch (_) {}
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
