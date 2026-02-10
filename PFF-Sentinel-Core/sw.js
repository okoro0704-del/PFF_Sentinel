/**
 * PFF Sentinel — Service Worker (Background Listener)
 * Listens for Lock_Command from LifeOS Admin and sets lock state.
 * Persists across tab close; when user reopens app, lock overlay is shown.
 */

const LOCK_COMMAND = 'Lock_Command';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === LOCK_COMMAND) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: LOCK_COMMAND }));
      })
    );
  }
});
