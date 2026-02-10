# PFF Sovereign Handshake v2.0

Simultaneous **4-layer authentication**: Face (3D + liveness), Finger (ridge + pulse), Voice (spectral resonance), and **Device binding** (HP Laptop / mobile UUID). Includes **Background Listener** for LifeOS Admin **Lock_Command** and **Offline Sentinel** behavior.

## Features

- **UI Overlay**: Scan interface that activates **Front Camera**, **Fingerprint** (WebAuthn when available), and **Microphone** at the same time.
- **Simultaneous Capture**: Face (3D + liveness), Finger (ridge + pulse), Voice (spectral resonance).
- **Fusion Logic**: `verifyCohesion()` returns **TRUE** only if all 4 signals match the stored **Absolute Truth Template** within a **1.5 s** window.
- **Hardware Sync**: Bound to device fingerprint (HP Laptop / mobile); allowed devices are stored and checked.
- **“Wow” Animation**: Glowing blue fabric that pulses in sync with the detected heartbeat during the scan.
- **Background Listener**: Persistent listener for **Lock_Command** from LifeOS Admin (BroadcastChannel + optional Service Worker). Lock state survives tab close (localStorage).
- **Hard-Lock**: On Lock_Command: instantly show 4-layer PFF overlay, disable all keyboard/mouse outside the unlock panel, display **"SOVEREIGN LOCK ACTIVE: ACCESS DENIED BY ARCHITECT."**
- **Offline Sentinel**: If the device is disconnected from the internet while locked, it **stays locked** until a verified **4-layer local handshake** is performed (no network required to unlock).
- **Mandatory Sentinel Overlay (Desktop)**:
  - **Always-on-top**: Full-screen Electron window that stays above other system windows (Task Manager, Start Menu, etc.) when running `sentinel-desktop`.
  - **4-Layer Unlock**: The **Unlock** button only **appears and becomes clickable** once Face, Finger, Voice, and Heartbeat are all verified as **SOVEREIGN** (Verify → then Unlock).
  - **Fabric + Heartbeat**: Lock screen background uses the same high-tech **Fabric** animation, pulsing in sync with the user's detected heartbeat during scan.
  - **Anti-Kill Daemon (Watchdog)**: A secondary process that watches the main Sentinel (Electron) process; if it is closed or killed, the Watchdog **immediately relaunches** it and triggers a **Security Breach** alert on the **VLT** (Visual Log).
  - **Input interception (Global Hook)**: Disabling Alt+Tab, Alt+F4, Ctrl+Shift+Esc, Windows Key **system-wide** requires a **native helper** (e.g. Windows low-level keyboard hook). See `docs/GLOBAL-HOOK.md`.
- **App-Wrapper Engine (Test 4)**:
  - **Process Monitor**: Background service that constantly monitors running processes against the **Sovereign List** (`config/sovereign-list.json`).
  - **Protected Apps**: List in JSON (e.g. `chrome.exe`, `banking_app.exe`, `cursor.exe`). When a protected app is launched, the Sentinel **suspends** the process, triggers the **4-Layer PFF Overlay**, and **releases** the process only after **VALID_PRESENCE** (Verify → Unlock).
  - **VLT Reporting**: Each successful intercept is logged: *"Protected Access Granted: [App_Name] via 4-Layer Handshake"*.
  - **Stealth Mode**: Run the Process Monitor with **system privileges** (e.g. as a Windows Service) so it cannot be bypassed. See `docs/APP-WRAPPER-STEALTH.md`.
- **Remote Sovereign Lock (RSL) — Test 3**:
  - **WebSocket / long-poll**: Persistent connection (encrypted `wss` when available) to LifeOS/Netlify backend; long-polling fallback if WebSocket is unavailable.
  - **DE_VITALIZE command**: Listener for `{"command": "DE_VITALIZE", "auth_token": "ISREAL_OKORO_PFF"}`. On receipt: **force-trigger** the full 4-Layer PFF Overlay, **lock down** keyboard/mouse (inputs outside unlock panel disabled), and show a **red pulsing screen**: *"HARDWARE DE-VITALIZED: REMOTE LOCK INITIATED BY ARCHITECT."*
  - **Persistent lock**: `LOCK_STATE: TRUE` is saved to **localStorage** so that if the laptop is restarted and the Sentinel app is opened again, it **boots directly back into the lock screen**.
  - **Recovery**: The **only** way to remove Remote Lock is a **successful 4-Layer Handshake** (Face + Finger + Heartbeat + Voice) via Verify → Unlock.
- **Intruder Capture & Bio-Log (Test 5)**:
  - **Motion & Face Detection**: Webcam monitors for **unauthorized faces** whenever the device is **locked** or a **protected app** is open. Compares frame hash to the stored Absolute Truth Template (authorized user).
  - **Snap-Action**: If an **unrecognized face** is detected for **>2 seconds**, the Sentinel **silently** captures a **high-res photo** and a **3-second video clip**, **encrypts** them (AES-GCM), and stores them in the VLT under **Breach_Attempts** (IndexedDB Truth Ledger).
  - **Look-Away Lock**: If the **authorized user** (Isreal) has **looked away** from the screen for **>30 seconds** (no template match), the Sentinel **automatically triggers the PFF Overlay** to protect the data.
  - **Proximity Alert**: When an unrecognized face is detected (e.g. shoulder surfing), a **subtle red border** is shown as a **Privacy Warning**.
  - **Stealth**: Capture is as fast as possible; camera LED cannot be suppressed from software (see `docs/INTRUDER-CAPTURE.md`).
- **Bio-Stress Heartbeat Sync (Test 6)**:
  - **Heartbeat Analysis**: Real-time BPM (and HRV when available) from a connected **BLE Heart Rate** wearable during the PFF Handshake; fallback to last-known or default when no sensor is connected.
  - **Sovereign Baseline**: User's resting BPM (Architect) stored as baseline; set during **Enroll** or config.
  - **Stress Threshold**: If detected BPM is **≥40% above baseline** during authentication, the session is flagged **STRESSED/DURESS**.
  - **Shadow-State Trigger**: When duress is flagged, access is **not** denied; the **Shadow UI** (decoy) is shown (fake balances, limited functionality), and all real **Money-Out** transactions are **silently disabled** via `canPerformMoneyOut()`.
  - **VLT Bio-Timestamp**: Heart rate (BPM, HRV, Duress) is logged to the VLT as part of the PFF signature for each authentication.
  - **Visual Pulse**: The Sentinel's blue **Fabric** background pulses in **real-time** with the user's detected heartbeat (BLE or fallback BPM).

## Quick Start

```bash
cd PFF-Sentinel-Core
npm install
npm run dev
```

Open the URL shown (e.g. `http://localhost:5173`). Use **HTTPS** or **localhost** for camera/microphone.

1. **Bind This Device** — Register this machine (e.g. HP Laptop) as allowed.
2. **Start Scan** — Activates camera, mic, and fingerprint prompt; starts heartbeat-synced fabric animation.
3. **Enroll Template** — Saves current face/voice/finger/device as the Absolute Truth Template.
4. **Verify Cohesion** — Runs `verifyCohesion()`; success only if all 4 match within 1.5 s.

**LifeOS Admin (Lock):** Open `/admin.html` and click **Send Lock_Command**. The Sentinel app will immediately enter Sovereign Lock (4-layer overlay, input disabled). Unlock only via **Start Scan** → **Verify** (all 4 layers SOVEREIGN) → **Unlock** (works offline).

### Mandatory Sentinel Overlay (Desktop)

1. Start the web app: `npm run dev` (leave it running on `http://localhost:5173`).
2. Install and run the desktop overlay:
   ```bash
   cd sentinel-desktop
   npm install
   npm run start:dev
   ```
   This opens a **full-screen, always-on-top** window loading the Sentinel app.
3. **Watchdog (Anti-Kill Daemon):** To run the Sentinel under the Watchdog (relaunch on kill + Security Breach on VLT):
   ```bash
   cd sentinel-desktop
   npm install
   npm run watchdog
   ```
   Ensure the web app is served (e.g. `npm run dev` in the parent folder). If the Sentinel window is closed or the process is killed, the Watchdog relaunches it and a **Security Breach** alert appears on the VLT (top of the screen).
4. **Global Hook (system shortcut blocking):** See `docs/GLOBAL-HOOK.md` for implementing Alt+Tab / Windows Key / Task Manager blocking via a native helper.

### App-Wrapper Engine (Test 4)

1. Edit **Sovereign List**: `config/sovereign-list.json` — add or remove protected app process names (e.g. `chrome.exe`, `cursor.exe`).
2. Start **Sentinel Desktop** (Electron) so it listens for intercepts: `cd sentinel-desktop && npm run start:dev`.
3. Start **Process Monitor** (with **Administrator** rights for suspend/resume):
   ```bash
   npm run process-monitor
   ```
   Or from an elevated prompt: `node services/process-monitor.js`.
4. Launch a **Protected App** (e.g. Chrome). The monitor will suspend it, notify the Sentinel, show the 4-Layer Overlay; after you **Verify** and **Unlock**, the process is resumed and the VLT logs *"Protected Access Granted: chrome.exe via 4-Layer Handshake"*.
5. **Stealth Mode:** Install the monitor as a Windows Service (see `docs/APP-WRAPPER-STEALTH.md`) so it runs with system privileges.

### Remote Sovereign Lock (RSL — Test 3)

1. **Backend**: Configure the LifeOS/Netlify backend URL in `config/rsl-backend.json` (or set `window.__RSL_WS_URL__` / `window.__RSL_POLL_URL__` before the app loads). Use **wss** for encrypted WebSocket.
2. **Send DE_VITALIZE**: From your backend, send `{"command": "DE_VITALIZE", "auth_token": "ISREAL_OKORO_PFF"}` over the WebSocket (or return it from the long-poll endpoint).
3. **Sentinel**: When the command is received, the app immediately shows the **red pulsing** Remote Lock screen and blocks all keyboard/mouse outside the unlock panel. **Recovery** is only via **Start Scan** → **Verify** → **Unlock** (4-Layer Handshake).
4. **Persistent lock**: After a reboot, open the Sentinel app again — it will show the Remote Lock screen until the 4-Layer Handshake is completed. (For “boot directly into lock,” run the Sentinel at OS startup, e.g. Electron in kiosk mode.)
5. **USB/input lock**: Keyboard and mouse are blocked in-app; physical USB lockdown would require OS/BIOS or a native helper.

### Intruder Capture & Bio-Log (Test 5)

1. **Enroll** the authorized user (Isreal) via **Enroll Template** so the Absolute Truth Template is stored.
2. Enter **Lock** (LifeOS Admin Lock_Command), **Remote Lock** (DE_VITALIZE), or open a **Protected App** (App-Wrapper). The intruder monitor starts automatically (webcam compares frame to template).
3. **Unrecognized face >2s**: A high-res photo and 3s video are captured, encrypted, and stored in **Breach_Attempts** (VLT); the list appears in the VLT section.
4. **Look-away >30s**: If the authorized user was last seen and then no match for 30s, the **PFF Overlay** is triggered automatically.
5. **Proximity**: When an unrecognized face is detected, a **red border** (Privacy Warning) is shown. See `docs/INTRUDER-CAPTURE.md` for multi-face (shoulder surfing) options.

## Project Layout

- `index.html` — Scan overlay UI.
- `css/sovereign-handshake.css` — Styles + fabric glow animation.
- `js/app.js` — Main app: simultaneous start, verify, enroll, bind.
- `js/handshake-core.js` — `verifyCohesion()`, Absolute Truth Template load/store.
- `js/capture-face.js` — Face capture (geometry + liveness).
- `js/capture-finger.js` — Fingerprint (WebAuthn) + pulse for heartbeat animation.
- `js/capture-voice.js` — Voice recording + spectral hash.
- `js/hardware-sync.js` — Device UUID fingerprint + allowed device list.
- `js/fabric-animation.js` — Blue fabric pulse driven by heartbeat phase.
- `js/lock-state.js` — Lock state storage + background listener for Lock_Command (BroadcastChannel).
- `js/lock-overlay.js` — Hard-lock overlay + Remote Lock (red pulsing) + App Intercept overlay; input blocking.
- `js/rsl-listener.js` — **Remote Sovereign Lock (RSL)**: WebSocket + long-poll listener for DE_VITALIZE.
- `config/rsl-backend.json` — RSL backend URL (wsUrl, pollUrl) for LifeOS/Netlify.
- `js/intruder-monitor.js` — **Intruder Capture**: face/motion when locked or protected app; snap-action, look-away lock, proximity alert.
- `js/breach-store.js` — **Breach_Attempts** (VLT Truth Ledger): encrypt and store photo + video in IndexedDB.
- `docs/INTRUDER-CAPTURE.md` — Intruder capture, stealth, and multi-face (shoulder surfing) notes.
- `js/heartbeat-sync.js` — **Bio-Stress**: BLE heart rate, Sovereign Baseline, duress check (40% above baseline).
- `js/shadow-state.js` — Shadow mode (duress); `canPerformMoneyOut()` guard for Money-Out.
- `js/shadow-ui.js` — **Shadow UI**: decoy view when duress; fake balance, limited actions.
- `sw.js` — Service Worker (forwards Lock_Command to all open clients).
- `admin.html` — LifeOS Admin page: sends Lock_Command to the Sentinel.
- `sentinel-desktop/` — **Mandatory Sentinel Overlay**: Electron app (always-on-top fullscreen), preload (VLT Security Breach), Watchdog script.
- `docs/GLOBAL-HOOK.md` — How to implement system-wide shortcut blocking (native helper).
- `config/sovereign-list.json` — **Sovereign List**: Protected Apps (process names) for the App-Wrapper.
- `services/process-monitor.js` — Process Monitor: polls processes, suspends protected apps, notifies Sentinel, releases on VALID_PRESENCE.
- `docs/APP-WRAPPER-STEALTH.md` — Run Process Monitor with system privileges (Windows Service).

## Browser Notes

- **Camera & mic**: Requires user permission; use HTTPS or localhost.
- **Fingerprint**: Uses WebAuthn platform authenticator when available; otherwise treated as “simulated” for demo.
- **Device UUID**: Browsers do not expose real hardware UUIDs; a stable **device fingerprint** is used and can be bound as “this HP Laptop” or “this mobile device.”
