# PFF Sentinel — Satellite Device Registry Guide

## 🛡️ Overview

The **Satellite Device Registry** enables multi-device management through the PFF Guardian Dashboard. Users can link multiple devices to their Sovereign ID, monitor device status in real-time, and execute remote commands.

---

## 🎯 Key Features

### 1. **Device Management UI ("My Fleet")**
- Real-time device status monitoring
- Visual dashboard with status cards
- Device details (model, OS, last seen, location)
- Fleet summary statistics

### 2. **QR Handshake Logic**
- Encrypted QR code generation
- Temporary join tokens (15-minute expiry)
- AES-GCM encryption using wallet address as key
- Secure device linking

### 3. **Proxy Link**
- Automatic device registration in `sentinel_devices` table
- Links satellite device to owner's Sovereign ID
- Syncs biometric anchors and device metadata

### 4. **Remote Commands**
- **Force Lock**: Immediately lock satellite device
- **Unlock**: Remotely unlock device
- **Locate**: Request GPS location update
- **De-Vitalize**: Emergency remote lock
- Real-time command execution via Supabase

---

## 📁 Files Created

### Database Schema
1. **`database/satellite-device-registry-schema.sql`** (150 lines)
   - 3 new tables
   - 2 helper functions
   - Indexes and triggers

### JavaScript Modules
2. **`js/SatelliteDeviceRegistry.js`** (767 lines)
   - Device fleet management
   - QR handshake logic
   - Remote commands
   - Real-time listeners

3. **`js/MyFleetUI.js`** (376 lines)
   - Fleet dashboard UI
   - Device cards
   - Action buttons
   - Event handlers

4. **`js/QRHandshakeUI.js`** (150 lines)
   - QR code generation UI
   - QR scanner interface
   - Token management

5. **`js/guardian-app.js`** (120 lines)
   - Main Guardian app
   - Tab management
   - Heartbeat sender
   - Command handler

### HTML Pages
6. **`guardian.html`** (274 lines)
   - Guardian Dashboard
   - My Fleet tab
   - QR Handshake tab
   - Security tab

---

## 🗄️ Database Schema

### New Tables

#### `sentinel_devices`
Registry of all satellite devices linked to a Sovereign ID.

```sql
CREATE TABLE sentinel_devices (
  id UUID PRIMARY KEY,
  owner_device_id TEXT REFERENCES profiles(device_id),
  owner_wallet_address TEXT,
  device_id TEXT UNIQUE,
  device_name TEXT,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet', 'watch', 'other'
  device_model TEXT,
  device_os TEXT,
  device_os_version TEXT,
  status TEXT, -- 'online', 'secured', 'threat_detected', 'offline', 'locked'
  last_seen_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  is_locked BOOLEAN,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  lock_reason TEXT,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  face_hash TEXT,
  finger_hash TEXT,
  join_token TEXT,
  join_token_expires_at TIMESTAMPTZ,
  join_token_used BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### `satellite_join_tokens`
Temporary encrypted tokens for QR handshake device linking.

```sql
CREATE TABLE satellite_join_tokens (
  id UUID PRIMARY KEY,
  token TEXT UNIQUE,
  encrypted_payload TEXT,
  owner_device_id TEXT REFERENCES profiles(device_id),
  owner_wallet_address TEXT,
  status TEXT, -- 'pending', 'used', 'expired', 'revoked'
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  used_by_device_id TEXT,
  created_at TIMESTAMPTZ
);
```

#### `satellite_remote_commands`
Audit log of all remote commands sent to satellite devices.

```sql
CREATE TABLE satellite_remote_commands (
  id UUID PRIMARY KEY,
  command_type TEXT, -- 'force_lock', 'unlock', 'wipe', 'locate', 'vitalize', 'de_vitalize'
  command_payload JSONB,
  target_device_id TEXT REFERENCES sentinel_devices(device_id),
  issued_by_device_id TEXT REFERENCES profiles(device_id),
  issued_by_wallet_address TEXT,
  status TEXT, -- 'pending', 'sent', 'acknowledged', 'executed', 'failed'
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ
);
```

### Helper Functions

1. **`expire_old_join_tokens()`**
   - Automatically expires join tokens past their expiry time
   - Returns count of expired tokens

2. **`get_fleet_status(device_id)`**
   - Returns fleet summary statistics
   - Counts devices by status (online, secured, threat_detected, offline, locked)

---

## 🚀 Setup Instructions

### Step 1: Deploy Database Schema

Run the SQL schema in Supabase:

```bash
# In Supabase SQL Editor
Run: database/satellite-device-registry-schema.sql
```

This creates:
- 3 new tables
- 2 helper functions
- Indexes and triggers

### Step 2: Access Guardian Dashboard

Navigate to the Guardian page:

```
http://localhost:5173/guardian.html
```

### Step 3: Link Satellite Devices

1. Click **"QR Handshake"** tab
2. Click **"Generate QR Code"**
3. Scan QR code with satellite device
4. Satellite device joins fleet automatically

---

## 📱 QR Handshake Flow

### Primary Device (Owner)

1. Navigate to Guardian Dashboard → QR Handshake tab
2. Click **"Generate QR Code"**
3. System generates:
   - Random 256-bit token
   - Encrypted payload (AES-GCM)
   - QR code with 15-minute expiry
4. Display QR code on screen

### Satellite Device (Joining)

1. Scan QR code with camera
2. Parse QR data (JSON)
3. Verify token in database
4. Decrypt payload using owner's wallet address
5. Create device entry in `sentinel_devices` table
6. Mark token as used
7. Device now linked to fleet

---

## 🔐 Encryption Details

### Join Token Encryption

- **Algorithm**: AES-GCM (256-bit)
- **Key Derivation**: PBKDF2 (100,000 iterations, SHA-256)
- **Key Source**: Owner's wallet address
- **IV**: Random 12-byte nonce
- **Output**: Base64-encoded (IV + ciphertext)

### QR Code Payload

```json
{
  "type": "PFF_SATELLITE_JOIN",
  "token": "64-character hex string",
  "payload": "base64-encoded encrypted data",
  "version": "1.0"
}
```

### Decrypted Payload

```json
{
  "token": "64-character hex string",
  "ownerDeviceId": "pff-abc123...",
  "ownerWalletAddress": "0x1234...",
  "expiresAt": "2024-01-01T12:00:00Z",
  "timestamp": 1704110400000
}
```

---

## 🎮 Remote Commands

### Force Lock

```javascript
import { sendForceLockCommand } from './SatelliteDeviceRegistry.js';

const result = await sendForceLockCommand(deviceId, 'Manual lock by owner');
// Returns: { success: boolean, message: string, commandId: string }
```

**What it does:**
- Creates command in `satellite_remote_commands` table
- Updates device status to `locked`
- Satellite device receives command via real-time listener
- Executes `setRemoteLockState(true)` and shows lock overlay

### Unlock

```javascript
import { sendUnlockCommand } from './SatelliteDeviceRegistry.js';

const result = await sendUnlockCommand(deviceId);
```

**What it does:**
- Creates unlock command
- Updates device status to `online`
- Satellite device unlocks automatically

### Locate

```javascript
import { sendLocateCommand } from './SatelliteDeviceRegistry.js';

const result = await sendLocateCommand(deviceId);
```

**What it does:**
- Requests GPS location update
- Satellite device updates `gps_lat` and `gps_lng` in database
- Location visible in My Fleet dashboard

---

## 📊 Device Status Types

| Status | Icon | Description |
|--------|------|-------------|
| `online` | 🟢 | Device is active and connected |
| `secured` | 🔒 | Device is secured with biometric enforcement |
| `threat_detected` | ⚠️ | Security threat detected on device |
| `offline` | ⚫ | Device hasn't sent heartbeat in 5+ minutes |
| `locked` | 🔐 | Device is remotely locked |

---

## 🔄 Real-Time Features

### Heartbeat System

- Satellite devices send heartbeat every 60 seconds
- Updates `last_heartbeat_at` timestamp
- Devices marked `offline` if no heartbeat for 5 minutes

### Command Listener

- Uses Supabase real-time subscriptions
- Listens for INSERT events on `satellite_remote_commands` table
- Auto-executes commands on satellite devices
- Updates command status to `executed` or `failed`

---

## 🧪 Testing

### Test Device Linking

1. Open Guardian Dashboard on primary device
2. Generate QR code
3. Open Guardian Dashboard on satellite device (different browser/device)
4. Scan QR code (or manually enter QR data)
5. Verify device appears in My Fleet

### Test Force Lock

1. Navigate to My Fleet tab
2. Find satellite device
3. Click **"Force Lock"** button
4. Confirm action
5. Satellite device should lock immediately

### Test Locate

1. Click **"Locate"** button on device card
2. Wait 2 seconds
3. Device location should update in dashboard

---

## 📈 Monitoring

### Query Fleet Status

```sql
-- Get fleet summary
SELECT * FROM get_fleet_status('pff-abc123...');

-- Get all devices for owner
SELECT * FROM sentinel_devices 
WHERE owner_device_id = 'pff-abc123...'
ORDER BY last_seen_at DESC;

-- Get pending commands
SELECT * FROM satellite_remote_commands 
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Expire Old Tokens

```sql
-- Manually expire old tokens
SELECT expire_old_join_tokens();
```

---

## ✅ Summary

**Total Files Created**: 6  
**Total Lines of Code**: ~1,837  
**Database Tables**: 3 new tables  
**Database Functions**: 2 helper functions  

**Key Components**:
- ✅ Device Management UI (My Fleet)
- ✅ QR Handshake Logic
- ✅ Encrypted Join Tokens
- ✅ Proxy Link (Device Registration)
- ✅ Remote Commands (Force Lock, Unlock, Locate)
- ✅ Real-time Command Execution
- ✅ Heartbeat System
- ✅ Fleet Status Dashboard

---

**END OF GUIDE**

