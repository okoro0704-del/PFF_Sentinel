# RSL Backend — LifeOS/Netlify

The Remote Sovereign Lock (RSL) listener expects commands from your LifeOS/Netlify backend.

## Command format

```json
{
  "command": "DE_VITALIZE",
  "auth_token": "ISREAL_OKORO_PFF"
}
```

- **command**: Must be `"DE_VITALIZE"`.
- **auth_token**: Must be `"ISREAL_OKORO_PFF"` (exact match).

## WebSocket (encrypted wss)

1. Expose a WebSocket endpoint on your backend (e.g. `wss://your-site.netlify.app/.netlify/functions/rsl-ws` or a separate WebSocket service).
2. When the Architect initiates Remote Lock, push the JSON above to all connected Sentinel clients (or the target device’s connection).
3. Set `config/rsl-backend.json` → `wsUrl` to your WebSocket URL (use `wss://` for TLS).

## Long-polling fallback

1. Add a Netlify Function (or API route) that returns **pending commands** for the requesting device (e.g. by device id or session).
2. Response shape: either a single object or an array, e.g. `[{ "command": "DE_VITALIZE", "auth_token": "ISREAL_OKORO_PFF" }]` or `{ "commands": [ ... ] }`.
3. Set `config/rsl-backend.json` → `pollUrl` to that endpoint (e.g. `https://your-site.netlify.app/.netlify/functions/rsl-poll`) and optionally `pollIntervalMs` (default 5000).

## Example Netlify Function (long-poll)

```js
// netlify/functions/rsl-poll.js
exports.handler = async (event) => {
  const deviceId = event.queryStringParameters?.device_id || 'default';
  // In production: fetch pending commands for this device from your DB.
  const pending = await getPendingCommandsForDevice(deviceId);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pending.length ? pending : []),
  };
};
```

To **trigger Remote Lock**, enqueue for the device: `{ "command": "DE_VITALIZE", "auth_token": "ISREAL_OKORO_PFF" }`.

## Security

- Keep `auth_token` secret on the server; only the Architect (or your backend) should send DE_VITALIZE.
- Use **wss** in production so the WebSocket connection is encrypted.
