# Bio-Stress Heartbeat Sync (Test 6)

## Heartbeat Analysis Engine

- **Real-time BPM**: Pulled from a **BLE Heart Rate** sensor (GATT Heart Rate Service `0x180D`) when the user connects a wearable during the PFF Handshake. Fallback: last-known BPM or default 72.
- **HRV**: When the device reports RR intervals (Heart Rate Measurement characteristic), HRV is parsed and included in the VLT Bio-Timestamp.
- **External BPM**: `setBpmFromExternal(bpm)` allows a mobile app or other source to push BPM into the Sentinel (e.g. via postMessage or WebSocket).

## Sovereign Baseline

- Stored in localStorage as **Sovereign Baseline** (resting BPM of the Architect).
- Set automatically during **Enroll** from the current heart rate, or via `setSovereignBaseline(bpm)`.
- Default: 72 BPM if never set.

## Stress Threshold (40% above baseline)

- **Duress**: If detected BPM **≥ baseline × 1.4** during an authentication attempt, the session is flagged **STRESSED/DURESS**.
- Access is **not** denied (to keep the user safe).

## Shadow-State Trigger

1. **Shadow UI**: A decoy environment is shown — fake balance, fake recent activity, "Send money" that does not perform real transfers.
2. **Money-Out**: All real outbound "Money-Out" transactions must check **`canPerformMoneyOut()`** (from `shadow-state.js`). When in shadow mode it returns **false**; the app/backend must **silently disable** real transfers and must **not** inform the attacker.
3. **Exit**: User can click "Exit limited view" to clear shadow mode (in production, consider re-verification without duress or admin override).

## VLT Bio-Timestamp

- Each authentication (Verify Cohesion) logs to the VLT:  
  **`Bio-Timestamp: BPM=X, HRV=Y, Duress=Z, source=ble|fallback`**  
- This creates a **Bio-Timestamp** that proves the state of the Architect at the time of entry.

## Visual Pulse

- The Sentinel's blue **Fabric** background pulses in **real-time** with the user's detected heartbeat.
- **Main app**: `startFabricAnimation(container, () => getLastBpm())` so the period updates from BLE or fallback.
- **Lock overlay**: Same — fabric uses `getLastBpm()` for the pulse period.

## Money-Out guard (for integration)

Before executing any real outbound payment or transfer:

```js
import { canPerformMoneyOut } from './shadow-state.js';

if (!canPerformMoneyOut()) {
  // Silently do not perform the transfer; optionally show decoy success.
  return;
}
// Proceed with real Money-Out.
```
