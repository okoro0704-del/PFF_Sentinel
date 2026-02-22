# ⚡ PFF Sentinel — Quick Deploy Guide

**5-Minute Database Deployment**

---

## 🚀 Quick Steps

### **1. Open Supabase** (30 seconds)

```
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" (left sidebar)
4. Click "New Query"
```

---

### **2. Copy & Paste Schema** (1 minute)

**Option A: With RLS (Recommended)**
```
File: database/deploy-with-rls.sql
Copy ALL content → Paste into SQL Editor
```

**Option B: Basic Schema**
```
File: database/complete-schema.sql
Copy ALL content → Paste into SQL Editor
```

---

### **3. Run** (10 seconds)

```
Click "Run" button (or Ctrl+Enter)
Wait for: ✅ "Success. No rows returned"
```

---

### **4. Verify** (1 minute)

**Check Tables Created:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```

**Expected Output:**
```
✅ access_attempts
✅ consent_logs
✅ device_commands
✅ heartbeat
✅ profiles
✅ sentinel_devices
✅ subscriptions
```

---

### **5. Verify Vitalization Fields** (30 seconds)

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name LIKE 'vitalization%';
```

**Expected Output:**
```
✅ vitalization_signature
✅ vitalization_id
✅ vitalized_at
✅ vitalized_by
```

---

## ✅ Done!

Your database is ready for the PFF Sentinel Protocol!

---

## 🧪 Optional: Insert Test Data

```sql
INSERT INTO profiles (
  device_id, device_uuid, gps_lat, gps_lng,
  face_hash, finger_hash, is_fully_verified,
  wallet_address
) VALUES (
  'test-device-001', 'uuid-test-001',
  40.7128, -74.0060,
  'face-hash-test', 'finger-hash-test', TRUE,
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
);

-- Verify
SELECT * FROM profiles WHERE device_id = 'test-device-001';
```

---

## 📊 Monitoring Queries

### **Profile Statistics**
```sql
SELECT 
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE is_fully_verified = TRUE) as verified,
  COUNT(*) FILTER (WHERE vida_minted = TRUE) as vitalized
FROM profiles;
```

### **Recent Vitalizations**
```sql
SELECT device_id, wallet_address, vitalized_at, vitalized_by
FROM profiles
WHERE vida_minted = TRUE
ORDER BY vitalized_at DESC
LIMIT 10;
```

### **VIDA Token Statistics**
```sql
SELECT 
  SUM(vida_balance_spendable) as total_spendable,
  SUM(vida_balance_locked) as total_locked,
  COUNT(*) FILTER (WHERE vida_minted = TRUE) as total_citizens
FROM profiles;
```

---

## 🚨 Troubleshooting

### **Error: "relation already exists"**
✅ Tables already created. You're good to go!

### **Error: "permission denied"**
❌ Check you're using the correct Supabase project

### **Error: "syntax error"**
❌ Make sure you copied the ENTIRE file

---

## 🎯 Next Steps

After database deployment:

1. ✅ **Configure Environment Variables**
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. ✅ **Generate Sentinel Private Key**
   ```javascript
   const wallet = ethers.Wallet.createRandom();
   console.log('Address:', wallet.address);
   console.log('Private Key:', wallet.privateKey);
   ```

3. ✅ **Add to .env**
   ```env
   VITE_SENTINEL_PRIVATE_KEY=0x...
   VITE_SENTINEL_WALLET_ADDRESS=0x...
   ```

4. ✅ **Deploy Netlify Function**
   ```bash
   netlify deploy --prod
   ```

5. ✅ **Test Four-Pillar Verification**
   - Open `index-four-pillar.html`
   - Complete verification
   - Check console for Vitalization success

---

## 📚 Full Documentation

- **`DATABASE_DEPLOYMENT_GUIDE.md`** — Comprehensive deployment guide
- **`VITALIZATION_GUIDE.md`** — Vitalization protocol documentation
- **`VITALIZATION_INTEGRATION_COMPLETE.md`** — Integration guide

---

**🛡️ Database deployment complete. Ready for Sentinel authorization.**

