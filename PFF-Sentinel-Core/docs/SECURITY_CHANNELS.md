# Unified Sentinel Security Channels

Four channels protect the face scan and audit flow from spoofing, replay, and unauthorized or high-risk origins.

---

## Channel 1: Biometric Integrity (The Face)

- **Requirement**: Reject any face scan with liveness confidence **below 0.98** to prevent deepfake or photo-spoofing.
- **Implementation**:
  - `js/capture-face.js`: `LIVENESS_MIN` (default `0.98`). If `livenessScore < LIVENESS_MIN`, `captureFaceSignals()` throws `LIVENESS_REJECTED`.
  - Optional env: `NEXT_PUBLIC_LIVENESS_MIN` or `VITE_LIVENESS_MIN` (e.g. `0.01` for dev).
- **Note**: The in-app liveness proxy (pixel diff between frames) is a placeholder. For production, integrate a passive liveness SDK that returns a 0–1 confidence score and keep the 0.98 threshold.

---

## Channel 2: Session Binding (The Handshake)

- **Requirement**: Before the camera opens, the API issues a **one-time nonce**. The face scan payload must be **signed with this nonce** and returned **within 60 seconds**, or the audit is voided.
- **Implementation**:
  - **Before camera**: App calls `fetchChallenge()` → `GET /v1/sovryn/challenge` (or equivalent). Backend returns `{ nonce, expires_in?: 60 }`.
  - **After capture**: App builds payload (face + nonce + device_id, country_code, etc.), signs with HMAC (nonce-bound), and calls `submitAudit()` → `POST /v1/sovryn/audit` with the signed body.
  - If more than 60s have passed since the challenge was issued, the client does not submit (audit voided).
- **Backend**:
  - `GET /v1/sovryn/challenge`: Return a one-time nonce and optional expiry. Invalidate the nonce after first use or after 60s.
  - `POST /v1/sovryn/audit`: Verify signature and nonce; reject if nonce expired or already used.

---

## Channel 3: Cryptographic Secret (The SOVRYN_SECRET)

- **Requirement**: The Sentinel frontend may only talk to `v1/sovryn/audit` (and challenge) if the request includes the correct **x-sovryn-secret** header. If the secret is missing or wrong, the API must return **401 Unauthorized** immediately.
- **Implementation**:
  - All requests to the SOVRYN API (challenge and audit) send header: `x-sovryn-secret`.
  - Env: `NEXT_PUBLIC_SOVRYN_API_URL`, `NEXT_PUBLIC_SOVRYN_SECRET` (Next.js) or `VITE_SOVRYN_*` (Vite).
- **Backend**: On every request to `/v1/sovryn/*`, check `x-sovryn-secret` against the configured secret; if missing or incorrect, respond with **401** and do not process the request.

---

## Channel 4: Geographic & Device Pinning (The Origin)

- **Requirement**: Verify that the request is from an **authorized device** and matches the **expected country_code** (e.g. `NG`). If the IP suggests a **VPN** or a **mismatch** with the user’s registered location, **flag the transaction for manual audit** before minting the 11 VIDA.
- **Implementation**:
  - `js/origin-pinning.js`: `checkOrigin(deviceId)`:
    - Ensures device is in the allowed list (same as Four-Pillar device binding).
    - Resolves `country_code` from optional geo API (IP), profile, or GPS; compares to expected country (e.g. `NG`).
    - Optional: use a geo API that returns `is_vpn` to set `suspected_vpn`.
  - If `manual_audit_required` (VPN or geo mismatch): app **does not** auto-mint; it shows “Manual audit required before 11 VIDA” and the backend can mint 11 VIDA after manual review.
- **Env**: `NEXT_PUBLIC_EXPECTED_COUNTRY` or `VITE_EXPECTED_COUNTRY`; optional `NEXT_PUBLIC_GEO_CHECK_URL` or `VITE_GEO_CHECK_URL`.

---

## Flow Summary

1. User clicks **Start Scan** → `fetchChallenge()` (nonce) → then camera opens.
2. User clicks **Verify** → Four-Pillar verification (including liveness ≥ 0.98).
3. On success: `checkOrigin()` → if `manual_audit_required`, show message and **do not mint**; otherwise `submitAudit()` (signed, within 60s) and then **auto-mint** (e.g. 5 VIDA); 11 VIDA remains for post–manual-audit when applicable.

---

## Environment Variables

| Variable | Purpose (Next.js use NEXT_PUBLIC_*, Vite use VITE_*) |
|----------|------------------------------------------------------|
| `NEXT_PUBLIC_SOVRYN_API_URL` / `VITE_SOVRYN_API_URL` | Base URL for `/v1/sovryn/challenge` and `/v1/sovryn/audit` |
| `NEXT_PUBLIC_SOVRYN_SECRET` / `VITE_SOVRYN_SECRET` | Secret sent as `x-sovryn-secret`; API returns 401 if wrong/missing |
| `NEXT_PUBLIC_EXPECTED_COUNTRY` / `VITE_EXPECTED_COUNTRY` | Expected country code (e.g. `NG`) for origin pinning |
| `NEXT_PUBLIC_GEO_CHECK_URL` / `VITE_GEO_CHECK_URL` | Optional; returns `{ country_code, is_vpn }` for current IP |
| `NEXT_PUBLIC_LIVENESS_MIN` / `VITE_LIVENESS_MIN` | Optional; override liveness threshold (default 0.98) |
