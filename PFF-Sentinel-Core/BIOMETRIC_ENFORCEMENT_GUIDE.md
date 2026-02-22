# PFF Sentinel — Biometric-Only Enforcement Guide

## 🔐 Overview

The **Biometric-Only Enforcement** system provides strict biometric authentication with no passcode fallback, integrated with SSS Vault protection and VIDA subscription revenue.

---

## 🎯 Key Features

### 1. **MDM Policy Generation**
- Generates Apple Configuration Profile (`.mobileconfig`)
- Enforces **Attention-Aware FaceID**
- Disables passcode fallback completely
- Requires biometric authentication only

### 2. **Sentinel Duress Logic**
- Monitors failed biometric attempts in real-time
- **3 failed attempts** → Automatic SSS Vault Freeze
- Locks all spendable VIDA tokens
- Sends freeze alerts to database

### 3. **Vitalize Recovery (Sovereign Unlock)**
- Remote device un-brick capability
- Accessible via Web PFF Dashboard
- Use cases:
  - Damaged FaceID sensor
  - Safe environment recovery
  - Emergency access

### 4. **VIDA Subscription Integration**
- Requires active subscription in `sentinel_subscriptions` table
- Revenue-linked feature activation
- Tier-based enforcement levels

---

## 📁 Files Created

### JavaScript Modules
1. **`js/BiometricEnforcement.js`** (481 lines)
   - MDM policy generation
   - Failed attempt tracking
   - SSS Vault freeze logic
   - Subscription integration

2. **`js/BiometricDuressListener.js`** (158 lines)
   - Real-time event listener
   - WebAuthn failure detection
   - FaceID failure detection
   - Database event subscription

3. **`js/SovereignUnlockUI.js`** (189 lines)
   - Sovereign Unlock UI component
   - Vault status display
   - Un-brick button interface

4. **`js/biometric-enforcement-app.js`** (175 lines)
   - Main dashboard application
   - Enforcement status management
   - Event handling

### HTML Pages
5. **`biometric-enforcement.html`** (150 lines)
   - Biometric Enforcement Dashboard
   - MDM download interface
   - Sovereign Unlock panel

### Database Schema
6. **`database/biometric-enforcement-schema.sql`** (150 lines)
   - 4 new tables
   - 4 helper functions
   - Indexes and triggers

---

## 🗄️ Database Schema

### New Tables

#### `biometric_failures`
Tracks failed biometric authentication attempts.

```sql
CREATE TABLE biometric_failures (
  id UUID PRIMARY KEY,
  device_id TEXT REFERENCES profiles(device_id),
  wallet_address TEXT,
  failed_at TIMESTAMPTZ,
  attempt_number INTEGER,
  failure_type TEXT -- 'FACEID', 'FINGERPRINT', 'UNKNOWN'
);
```

#### `vault_freeze_alerts`
Alerts for SSS Vault freeze events.

```sql
CREATE TABLE vault_freeze_alerts (
  id UUID PRIMARY KEY,
  device_id TEXT REFERENCES profiles(device_id),
  frozen_amount NUMERIC,
  freeze_reason TEXT,
  frozen_at TIMESTAMPTZ,
  status TEXT -- 'ACTIVE', 'RESOLVED'
);
```

#### `sovereign_unlock_events`
Logs Sovereign Unlock operations.

```sql
CREATE TABLE sovereign_unlock_events (
  id UUID PRIMARY KEY,
  device_id TEXT REFERENCES profiles(device_id),
  unlocked_by TEXT,
  unlocked_at TIMESTAMPTZ,
  unlock_reason TEXT
);
```

#### `biometric_mdm_profiles`
Tracks MDM profile deployments.

```sql
CREATE TABLE biometric_mdm_profiles (
  id UUID PRIMARY KEY,
  device_id TEXT REFERENCES profiles(device_id),
  profile_uuid TEXT,
  profile_type TEXT,
  generated_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  status TEXT -- 'GENERATED', 'DEPLOYED', 'ACTIVE', 'REMOVED'
);
```

### New Columns in `profiles`

```sql
ALTER TABLE profiles ADD COLUMN
  biometric_enforcement_enabled BOOLEAN DEFAULT FALSE,
  biometric_enforcement_activated_at TIMESTAMPTZ,
  biometric_enforcement_tier TEXT,
  vault_frozen BOOLEAN DEFAULT FALSE,
  vault_frozen_at TIMESTAMPTZ,
  vault_freeze_reason TEXT,
  vault_unfrozen_at TIMESTAMPTZ,
  vault_unfrozen_by TEXT;
```

### Helper Functions

1. **`get_failed_attempts_count(device_id, time_window_minutes)`**
   - Returns count of failed attempts in time window

2. **`should_freeze_vault(device_id)`**
   - Returns TRUE if vault should be frozen (≥3 failures)

3. **`get_vault_freeze_status(device_id)`**
   - Returns vault freeze details

4. **`cleanup_old_biometric_failures()`**
   - Deletes failures older than 7 days

---

## 🚀 Setup Instructions

### Step 1: Deploy Database Schema

Run the SQL schema in Supabase:

```bash
# In Supabase SQL Editor
Run: database/biometric-enforcement-schema.sql
```

### Step 2: Access Dashboard

Navigate to the Biometric Enforcement page:

```
http://localhost:5173/biometric-enforcement.html
```

### Step 3: Activate Enforcement

1. Ensure you have an active VIDA subscription
2. Click **"Activate Enforcement"**
3. Download MDM Profile
4. Install on iOS device via Settings

---

## 📱 MDM Profile Installation (iOS)

1. Download `.mobileconfig` file from dashboard
2. Open **Settings** → **General** → **VPN & Device Management**
3. Tap the downloaded profile
4. Tap **Install** (enter passcode if prompted)
5. Tap **Install** again to confirm
6. Biometric-only enforcement is now active

---

## 🔒 How It Works

### Normal Flow
1. User attempts biometric authentication
2. Success → Access granted
3. Failure → Attempt recorded

### Duress Flow (3 Failed Attempts)
1. **Attempt 1**: Warning logged
2. **Attempt 2**: Second warning
3. **Attempt 3**: 🚨 **SSS VAULT FREEZE TRIGGERED**
   - All spendable VIDA locked
   - Vault frozen in database
   - Alert sent
   - Device access restricted

### Recovery Flow (Sovereign Unlock)
1. User accesses Web PFF Dashboard
2. Navigates to Biometric Enforcement page
3. Sees **"Vault Frozen"** panel
4. Clicks **"Sovereign Unlock"** button
5. Confirms action
6. Vault unfrozen
7. Failed attempts reset
8. Device access restored

---

## 🎮 API Reference

### Activate Enforcement
```javascript
import { activateBiometricEnforcement } from './BiometricEnforcement.js';

const result = await activateBiometricEnforcement(deviceId);
// Returns: { success: boolean, message: string }
```

### Record Failed Attempt
```javascript
import { recordFailedBiometricAttempt } from './BiometricEnforcement.js';

const result = await recordFailedBiometricAttempt();
// Returns: { frozen: boolean, attempts: number, message: string }
```

### Sovereign Unlock
```javascript
import { sovereignUnlock } from './BiometricEnforcement.js';

const result = await sovereignUnlock(deviceId);
// Returns: { success: boolean, message: string }
```

### Download MDM Profile
```javascript
import { downloadMDMProfile } from './BiometricEnforcement.js';

downloadMDMProfile(deviceId);
// Downloads .mobileconfig file
```

---

## 💰 Revenue Integration

Biometric Enforcement is linked to VIDA subscriptions:

- **Activation requires**: Active subscription in `sentinel_subscriptions`
- **Subscription tiers**: Basic ($100), Standard ($200), Premium ($500), Elite ($1000)
- **Enforcement tier**: Stored in `profiles.biometric_enforcement_tier`

---

## ⚠️ Security Considerations

1. **MDM Profile Removal**: Set `PayloadRemovalDisallowed` to `true`
2. **Encryption**: Private keys encrypted with device_id
3. **Sentinel Powers**: Only Sentinel can execute SSS lockSavings()
4. **Audit Trail**: All unlock events logged in database

---

## 🧪 Testing

### Test Failed Attempts
```javascript
// Simulate 3 failed attempts
for (let i = 0; i < 3; i++) {
  await recordFailedBiometricAttempt();
}
// Vault should freeze after 3rd attempt
```

### Test Sovereign Unlock
```javascript
// Check if can unlock
const status = await canSovereignUnlock(deviceId);
console.log(status); // { canUnlock: true/false, reason: string }

// Execute unlock
const result = await sovereignUnlock(deviceId);
console.log(result); // { success: true/false, message: string }
```

---

## 📊 Monitoring

Query vault freeze events:

```sql
-- Get all frozen vaults
SELECT * FROM profiles WHERE vault_frozen = TRUE;

-- Get freeze alerts
SELECT * FROM vault_freeze_alerts WHERE status = 'ACTIVE';

-- Get failed attempts in last hour
SELECT * FROM biometric_failures 
WHERE failed_at >= NOW() - INTERVAL '1 hour'
ORDER BY failed_at DESC;
```

---

## ✅ Summary

**Total Files Created**: 6  
**Total Lines of Code**: ~1,303  
**Database Tables**: 4 new tables  
**Database Functions**: 4 helper functions  

**Key Components**:
- ✅ MDM Policy Generation
- ✅ Duress Logic (3 failed attempts → freeze)
- ✅ SSS Vault Freeze
- ✅ Sovereign Unlock (Un-Brick)
- ✅ VIDA Subscription Integration
- ✅ Real-time Event Listener
- ✅ Web Dashboard UI

---

**END OF GUIDE**

