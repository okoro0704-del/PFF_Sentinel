# Intruder Capture & Bio-Log (Test 5)

## Motion & Face Detection

The intruder monitor runs **whenever the device is in a Locked state or a Protected App is open** (lock overlay, remote lock overlay, or app-intercept overlay). It uses the laptop's webcam to compare the current frame hash to the stored **Absolute Truth Template** (authorized user, e.g. Isreal).

- **Recognized face**: Hash matches template (with tolerance) → authorized user present; reset "unrecognized" and "look-away" timers.
- **Unrecognized face**: Hash does not match for **>2 seconds** → **Snap-Action** (photo + 3s video, encrypt, store in Breach_Attempts).
- **Look-Away**: Authorized user was seen, then no match for **>30 seconds** → automatically trigger **PFF Overlay** to protect data.
- **Proximity / Shoulder Surfing**: When an unrecognized face is detected (e.g. second person in frame), a **subtle red border** (Privacy Warning) is shown. True multi-face count (e.g. "second face behind user") can be improved by integrating **face-api.js** or **MediaPipe Face Detection** for explicit face count.

## Snap-Action (Silent Capture)

1. **High-res photo**: Current frame at full camera resolution (JPEG).
2. **3-second video clip**: MediaRecorder (VP8/WebM), 2.5 Mbps.
3. **Encryption**: AES-GCM (256-bit key derived via PBKDF2 from device/app salt).
4. **Storage**: IndexedDB store **Breach_Attempts** (Truth Ledger); each entry has `id`, `timestamp`, and encrypted photo/video blobs.
5. **VLT**: Each capture is listed in the **Breach_Attempts** section of the VLT and a log line is added: *"Breach attempt captured and stored in Breach_Attempts"*.

## Look-Away Lock

If the camera detects that the **authorized user** (template match) has **looked away** (no match) for more than **30 seconds**, the Sentinel triggers the **PFF Overlay** (lock or remote lock, depending on context) to protect the data.

## Proximity Alert

When an **unrecognized face** is detected for more than ~1 second (before the 2s snap), a **subtle red pulsing border** is shown as a **Privacy Warning** (shoulder surfing / second person in frame). For explicit "second face behind user" detection, integrate a multi-face detector (e.g. face-api.js) and call `setProximityAlert(true)` when face count ≥ 2.

## Stealth Execution

- **Camera LED**: Cannot be suppressed from software; it is controlled by hardware. On some devices the LED is always on when the camera is in use.
- **Capture speed**: The Snap-Action is kept as fast as possible: one high-res frame + a 3-second recording. The monitor runs in the background with minimal visible UI; capture is triggered only when an unrecognized face is detected for 2+ seconds.
- **Optional**: For "imperceptible" capture on specific hardware, a native helper could use a different camera API or lower resolution; the current implementation uses the standard webcam stream.
