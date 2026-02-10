/**
 * PFF Sentinel Desktop — Preload
 * Exposes Security Breach, App Intercept, VLT Log to renderer.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sentinelDesktop', {
  onSecurityBreach: (callback) => {
    ipcRenderer.on('security-breach', () => callback());
  },
  onAppIntercept: (callback) => {
    ipcRenderer.on('app-intercept', (_e, payload) => callback(payload.processName, payload.pid));
  },
  notifyValidPresence: (processName, pid) => {
    ipcRenderer.send('valid-presence', { processName, pid });
  },
  onVltLog: (callback) => {
    ipcRenderer.on('vlt-log', (_e, message) => callback(message));
  },
});
