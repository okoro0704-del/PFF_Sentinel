# 🛡️ PFF Sentinel — Vitalization Protocol Guide

## 📖 Overview

The **Vitalization Protocol** is the cryptographic authorization system that ensures **only the Sentinel can decide who becomes a Citizen**. This prevents users from self-minting VIDA tokens and enforces strict Four-Pillar verification.

---

## 🎯 Key Concepts

### What is Vitalization?

**Vitalization** is the process by which the Sentinel cryptographically authorizes a user to become a Citizen and receive the **5 VIDA CAP** ($900 spendable + $4000 locked).

**The Sentinel acts as "The Scribe"**:
- ✅ Verifies all Four Pillars (GPS, Device UUID, Face Hash, Finger Hash)
- ✅ Generates an **EIP-712 signature** proving authorization
- ✅ Stores the Vitalization Proof on-chain
- ✅ Prevents double-minting and unauthorized access

---

## 🏗️ Architecture

### Components Created

1. **`js/sentinel-engine.js`** (200 lines)
   - Cryptographic signature generation (EIP-712)
   - Vitalization proof construction
   - Signature verification

2. **`netlify/functions/vitalize-citizen.js`** (150 lines)
   - Backend endpoint for Vitalization
   - Four-Pillar verification
   - Sentinel signature generation
   - Database updates

3. **`js/vitalization-client.js`** (150 lines)
   - Client-side API integration
   - Auto-Vitalization on verification
   - Status checking

4. **Database Schema Updates** (`complete-schema.sql`)
   - `vitalization_signature` (TEXT)
   - `vitalization_id` (TEXT UNIQUE)
   - `vitalized_at` (TIMESTAMPTZ)
   - `vitalized_by` (TEXT)

---

## 🔐 How It Works

### Step 1: Four-Pillar Verification (Client-Side)

User completes biometric verification:

```javascript
// In handshake-core-supabase.js
const verification = await verifyFourPillarCohesion();

if (verification.ok) {
  // Mark as fully verified
  await markFullyVerified(deviceId);
  
  // Trigger Vitalization
  await autoVitalizeOnVerification();
}
```

### Step 2: Vitalization Request (Client → Backend)

Client calls the Vitalization endpoint:

```javascript
// In vitalization-client.js
const result = await requestVitalization();

// POST /.netlify/functions/vitalize-citizen
// Body: { deviceId, citizenAddress }
```

### Step 3: Sentinel Verification (Backend)

Backend verifies Four Pillars and generates signature:

```javascript
// In vitalize-citizen.js

// 1. Verify Four Pillars from Supabase
const verification = await verifyFourPillars(deviceId, supabase);

// 2. Generate Sentinel signature (EIP-712)
const signature = await sentinelWallet.signTypedData(
  VITALIZATION_DOMAIN,
  VITALIZATION_TYPES,
  vitalizationMessage
);

// 3. Create Vitalization Proof
const vitalizationProof = {
  citizenAddress,
  deviceId,
  fourPillarAnchors: { gps, deviceUuid, faceHash, fingerHash },
  sentinelSignature: signature,
  sentinelAddress: sentinelWallet.address,
  timestamp,
  nonce,
  vitalizationId
};
```

### Step 4: Database Update

Backend marks Citizen as vitalized:

```sql
UPDATE profiles SET
  is_fully_verified = TRUE,
  vida_minted = TRUE,
  vida_balance_spendable = 900,
  vida_balance_locked = 4000,
  vitalization_signature = '0x...',
  vitalization_id = '0x...',
  vitalized_at = NOW()
WHERE device_id = 'xxx';
```

### Step 5: On-Chain Minting (Future)

Smart contract verifies Sentinel signature and mints VIDA:

```solidity
function mintWithVitalization(
  address citizenAddress,
  bytes32 vitalizationId,
  bytes memory sentinelSignature
) external {
  // Verify signature is from authorized Sentinel
  require(verifySentinelSignature(vitalizationId, sentinelSignature), "Invalid Sentinel signature");
  
  // Mint 5 VIDA CAP
  _mintSovereignCap(citizenAddress, 900, 4000);
}
```

---

## 🚀 Setup Instructions

### Step 1: Update Database Schema

Run the updated schema in Supabase:

```bash
# In Supabase SQL Editor
Run: database/complete-schema.sql
```

### Step 2: Configure Environment Variables

Add to `.env`:

```env
# Sentinel Private Key (CRITICAL - Keep Secret!)
VITE_SENTINEL_PRIVATE_KEY=0x...

# Vitalization Endpoint (default: /.netlify/functions/vitalize-citizen)
VITE_VITALIZATION_ENDPOINT=/.netlify/functions/vitalize-citizen

# Supabase Service Role Key (for backend)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 3: Deploy Netlify Function

Deploy the Vitalization endpoint:

```bash
# Netlify will auto-deploy functions in netlify/functions/
netlify deploy --prod
```

### Step 4: Integrate with Four-Pillar Flow

Update `handshake-core-supabase.js`:

```javascript
import { autoVitalizeOnVerification } from './vitalization-client.js';

// After Four-Pillar verification
if (ok) {
  await markFullyVerified(deviceId);
  
  // Auto-request Vitalization
  const vitalizationResult = await autoVitalizeOnVerification();
  
  if (vitalizationResult.success) {
    console.log('✅ Vitalized! 5 VIDA CAP received');
  }
}
```

---

## 🧪 Testing

### Test Vitalization Flow

```javascript
import { requestVitalization, checkVitalizationStatus } from './vitalization-client.js';

// Check current status
const status = await checkVitalizationStatus();
console.log('Vitalized:', status.vitalized);

// Request Vitalization (if not already vitalized)
if (!status.vitalized) {
  const result = await requestVitalization();
  
  if (result.success) {
    console.log('✅ Vitalization successful!');
    console.log('VIDA CAP:', result.vidaCap);
    console.log('Proof ID:', result.vitalizationProof.vitalizationId);
  } else {
    console.error('❌ Vitalization failed:', result.error);
  }
}
```

### Verify Signature (Optional)

```javascript
import { SentinelEngine } from './sentinel-engine.js';

// Verify a Vitalization signature
const verification = await SentinelEngine.verifyVitalizationSignature(vitalizationProof);

if (verification.valid) {
  console.log('✅ Valid Sentinel signature');
  console.log('Sentinel Address:', verification.sentinelAddress);
} else {
  console.error('❌ Invalid signature');
}
```

---

## 🔒 Security Considerations

### 1. Sentinel Private Key Protection

**CRITICAL**: The Sentinel private key must be kept secret!

- ✅ Store in environment variables (never commit to Git)
- ✅ Use Netlify environment variables for production
- ✅ Rotate keys periodically
- ❌ NEVER expose in client-side code

### 2. EIP-712 Signature Verification

All Vitalization signatures use **EIP-712** (structured data signing):

- ✅ Domain separation (prevents replay attacks)
- ✅ Nonce-based (prevents double-spending)
- ✅ Timestamp-based (prevents stale signatures)
- ✅ Verifiable on-chain

### 3. Four-Pillar Enforcement

Backend MUST verify all Four Pillars before signing:

- ✅ GPS coordinates present
- ✅ Device UUID present
- ✅ Face hash present
- ✅ Fingerprint hash present
- ✅ Not already vitalized

---

## 📊 Database Queries

### Check Vitalized Citizens

```sql
SELECT 
  device_id,
  wallet_address,
  vida_balance_spendable,
  vida_balance_locked,
  vitalization_id,
  vitalized_at
FROM profiles
WHERE vida_minted = TRUE
ORDER BY vitalized_at DESC;
```

### Verify Vitalization Signature

```sql
SELECT 
  device_id,
  vitalization_signature,
  vitalization_id,
  vitalized_at
FROM profiles
WHERE vitalization_id = '0x...';
```

---

## ✅ Summary

**What Was Built**:
- ✅ Sentinel Engine (cryptographic signature system)
- ✅ Vitalization Endpoint (backend authorization)
- ✅ Client Integration (auto-vitalization)
- ✅ Database Schema (vitalization tracking)

**How It Works**:
1. User completes Four-Pillar verification
2. Client requests Vitalization from Sentinel
3. Backend verifies Four Pillars
4. Sentinel generates EIP-712 signature
5. Database updated with Vitalization Proof
6. 5 VIDA CAP marked as minted

**Security**:
- 🔒 Only Sentinel can authorize citizenship
- 🔒 EIP-712 signatures prevent forgery
- 🔒 Nonce-based system prevents double-minting
- 🔒 Four-Pillar verification enforced server-side

---

**Next Steps**:
1. Deploy database schema updates
2. Configure Sentinel private key
3. Deploy Netlify function
4. Test Vitalization flow
5. Integrate with smart contract minting


