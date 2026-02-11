# PFF Sentinel — Codebase Analysis

Scan of what’s in place and what could be improved.

---

## What’s in place

### 1. Four-pillar authentication (core)

- **Face**: `capture-face.js` — geometry hash + liveness.
- **Finger**: `capture-finger.js` — WebAuthn + pulse for heartbeat.
- **GPS**: `location-layer.js` — getCurrentLocation, verifyLocationMatch, initLocationLayer.
- **Device**: `hardware-sync.js` — device UUID + allowed list, bind device.
- **Cohesion**: `handshake-core.js` (localStorage) and `handshake-core-supabase.js` (Supabase) — verifyCohesion, 1.5s window, template store/load.
- **Two entry points**:
  - `index.html` → `app.js` → `handshake-core.js` (no DB, no minting).
  - `index-four-pillar.html` → `app-supabase.js` → `handshake-core-supabase.js` (Supabase + VIDA minting).

### 2. Supabase & Master Backend bonding

- **Client**: `supabase-client.js` — same URL/key as Master (VITE_* and SUPABASE_*), upsertProfile, getProfile, markFullyVerified, markVidaMinted (with `minting_status: 'COMPLETED'`).
- **Sentinel logic**: `sentinelLogic.js` — checkSentinelPermissions, getCitizens (fallback to profiles), getVaults.
- **Consent log stream**: `consent-log-stream.js` — logConsent, logAccessAttempt → Master `consent_logs`.
- **Minting status bridge**: `minting-status-bridge.js` — Realtime on `profiles`, dispatches “Vault Secured” when minting_status COMPLETED or vida_minted true.
- **Schema**: `complete-schema.sql` — profiles, subscriptions, sentinel_earnings, payment_transactions, verification_stats, consent_logs; profiles has minting_status.
- **Verification flow** wires consent/access logs in `handshake-core-supabase.js` and enroll consent in `app-supabase.js`.

### 3. Blockchain & VIDA

- **Provider**: `SovereignProvider.js` — RSK (testnet/mainnet), ethers, VIDA/DLLR/USDT addresses from env.
- **Minting**: `MintingProtocol.js` — checkMintingEligibility, mintVidaCap, markVidaMinted, autoMintOnVerification after Four-Pillar success.
- **Contract**: `contracts/VIDAToken.sol` present (mintSovereignCap, spendable/locked balances).

### 4. Lock & security overlay

- **Lock state**: `lock-state.js` — Lock_Command listener, localStorage persistence, setLockState, setRemoteLockState.
- **Overlay**: `lock-overlay.js` — hard-lock, remote lock (red), app-intercept overlay, input blocking.
- **RSL**: `rsl-listener.js` — WebSocket + long-poll for DE_VITALIZE; config in `config/rsl-backend.json` (placeholder URLs).
- **Service worker**: `sw.js` — forwards Lock_Command to clients.

### 5. Intruder & breach

- **Monitor**: `intruder-monitor.js` — face vs template when locked/protected app; look-away, proximity alert.
- **Store**: `breach-store.js` — IndexedDB “Breach_Attempts”, AES-GCM encrypt, listBreachAttempts, breach events.

### 6. Bio-stress & shadow

- **Heartbeat**: `heartbeat-sync.js` — BLE heart rate, sovereign baseline, duress (e.g. 40% above baseline).
- **Shadow**: `shadow-state.js`, `shadow-ui.js` — duress → decoy UI, canPerformMoneyOut guard.

### 7. UI & business flows

- **Plans**: `plans.html` + `plan-selector.js` — tier selection, subscription to Supabase.
- **Earnings**: `earnings.html` + `earnings-dashboard.js` — claim, Chart.js.
- **Auto-debit**: `auto-debit.js` — VIDA from citizen vault to Sentinel.
- **Download portal**: `download.html` + `download-portal.js` — ZKTeco detection, placeholder APK/App Store URLs, desktop bundle, PWA install.

### 8. Desktop & process monitor

- **Electron**: `sentinel-desktop/` — main, preload, watchdog (relaunch on kill, Security Breach on VLT).
- **Process monitor**: `services/process-monitor.js` — sovereign list, suspend protected apps, notify Sentinel.

### 9. Deployment

- **Netlify**: Root `netlify.toml` — base `PFF-Sentinel-Core`, publish `.`, SPA redirect `/*` → `/index.html`.
- **Env**: `.env.example` documents SUPABASE_* / VITE_* (and RSL, RSK, tokens).

---

## What could be done more

### Critical / high impact

1. **Schema vs client column mismatch**  
   - **Schema** (`complete-schema.sql`): `gps_lat`, `gps_lng`, `face_hash`, `finger_hash`.  
   - **Client** (`supabase-client.js`, `handshake-core-supabase.js`, `app-supabase.js`): `gps_latitude`, `gps_longitude`, `face_geometry_hash`, `face_liveness_min`, `finger_ridge_match`, `finger_credential_id`.  
   - **Effect**: Upserts/reads can fail or leave DB columns empty.  
   - **Fix**: Either align schema to the client (add/rename columns to match JS) or change the client to use the existing schema column names and types. Prefer one source of truth (e.g. schema) and update the client.

2. **GPS not initialized in main app**  
   - **`index.html`** uses `app.js`, which never calls `initLocationLayer()`.  
   - **Effect**: On the main scan page, GPS anchor is never captured; cohesion can fail or behave inconsistently.  
   - **Fix**: In `app.js` init (e.g. before or with `refreshDeviceInfo()`), call `await initLocationLayer()` and optionally show GPS status in the UI.

3. **Voice in UI but not in Four-Pillar logic**  
   - **`index.html`**: Still shows “Voice (Spectral)” and subtitle “Face · Finger · Voice · Device”.  
   - **Logic**: Four-pillar flow is GPS + Device + Face + Finger only; no `capture-voice.js` or voice in template/verifyCohesion.  
   - **Fix**: Either remove the voice cell and update subtitle to “Four-Pillar Anchor” (as in RED_ALERT) or implement voice capture and include it in the template and verifyCohesion.

4. **RLS (Row Level Security) missing**  
   - **Schema**: No `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` in `complete-schema.sql`.  
   - **Effect**: All rows are readable/writable by anyone with anon key; no per-user or per-role isolation.  
   - **Fix**: Enable RLS on `profiles`, `subscriptions`, `consent_logs`, etc., and add policies (e.g. Sentinel/service role can read citizens/vaults; users only their own profile).

5. **Placeholder / config URLs**  
   - **RSL**: `config/rsl-backend.json` uses `wss://your-lifeos-backend.netlify.app/...`.  
   - **Download**: `download-portal.js` uses `https://example.com/...` for mobile.  
   - **Fix**: Replace with real RSL backend URL and real app store / APK URLs (or env-driven config).

### Medium impact

6. **Realtime for `profiles`**  
   - Minting-status bridge depends on Supabase Realtime for `profiles`.  
   - **Fix**: In Supabase Dashboard → Database → Replication, enable replication for `public.profiles` (noted in bridge comment).

7. **`citizens` / `vaults` tables**  
   - `sentinelLogic.js` reads `citizens` (with fallback to `profiles`) and `vaults`. If Master DB only has `profiles`, vaults read will fail.  
   - **Fix**: Either add `citizens`/`vaults` in Master schema and RLS, or document that Sentinel uses `profiles` as citizens and add a minimal `vaults` table (or stub) so getVaults doesn’t error.

8. **Env in “public” deploy**  
   - You’re serving static/public (no Vite build). `import.meta.env.VITE_*` is only set at build time; if there’s no build, those may be undefined.  
   - **Fix**: For static deploy, either inject env at serve time (e.g. Netlify env → a small generated `config.js` or inline script) or use a single runtime config (e.g. `window.__CONFIG__`) set by the server.

9. **Error handling and retries**  
   - Supabase and RSL calls are mostly one-shot; few retries or user-facing error messages.  
   - **Fix**: Add retry/backoff for Supabase (and RSL) where appropriate; show clear messages on failure (e.g. “Could not save consent log”, “Lock command unavailable”).

10. **Console logging**  
   - RED_ALERT and scan found `console.log`/`console.warn` in production paths (e.g. location-layer, shadow-ui, download-portal).  
   - **Fix**: Remove or guard with a debug flag / build-time strip.

### Lower priority / polish

11. **Single entry point / routing**  
   - Two separate entry points (index vs index-four-pillar) and multiple standalone HTML pages (plans, earnings, download, admin).  
   - **Fix**: Optional: add a minimal router or a single shell (e.g. `index.html`) that loads views based on path or hash, so one “app” and clearer navigation.

12. **Accessibility and UX**  
   - VLT and overlays could use clearer ARIA labels and focus handling; “Vault Secured” is a one-off result message.  
   - **Fix**: Optional: persistent notification area for status (e.g. “Vault Secured”), focus trap in lock overlay, and review aria-live/roles.

13. **Tests**  
   - No automated tests in repo.  
   - **Fix**: Add unit tests for verifyCohesion, template load/store, and integration tests for Supabase/consent log and minting flow (e.g. Playwright or Jest).

14. **ZKTeco and binaries**  
   - Finger capture is WebAuthn; ZKTeco is detected but not used for capture. Download bundle and mobile URLs are placeholders.  
   - **Fix**: Per RED_ALERT: integrate ZKTeco SDK for hardware fingerprint where required; replace placeholder binaries and URLs when assets exist.

---

## Summary table

| Area                 | In place                         | To do / improve                          |
|----------------------|----------------------------------|------------------------------------------|
| Four-pillar logic    | Face, finger, GPS, device, cohesion | Align schema↔client; init GPS in app.js; drop or add voice |
| Supabase / Master    | Client, consent log, minting bridge, sentinelLogic | RLS; Realtime for profiles; citizens/vaults or docs |
| Blockchain / VIDA    | RSK provider, MintingProtocol, contract | Env and deploy contract addresses        |
| Lock / RSL            | Lock overlay, RSL listener, SW   | Real RSL URLs; error handling            |
| Intruder / breach    | Monitor, breach store           | -                                        |
| Plans / earnings      | HTML + JS, Supabase             | -                                        |
| Deployment           | Netlify static, netlify.toml    | Env for static; replace placeholders     |
| Security             | Encryption in breach store      | RLS; no secrets in client; audit logs     |
| Quality              | -                               | Schema↔client fix; tests; log/error polish |

---

**Suggested order of work**

1. Align `profiles` schema with client (column names/types) and run migration if DB already exists.  
2. Add `initLocationLayer()` in `app.js` and fix or remove voice in `index.html`.  
3. Enable RLS and define policies for profiles, consent_logs, and any citizens/vaults.  
4. Enable Realtime for `profiles` and replace RSL/download placeholders with real URLs or config.  
5. Improve env handling for static deploy and add basic error handling/retries for Supabase and RSL.
