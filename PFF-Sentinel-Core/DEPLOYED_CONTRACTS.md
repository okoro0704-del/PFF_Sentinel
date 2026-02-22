# 🟣 PFF Sentinel — Deployed Contracts on Polygon

**Network**: Polygon Mainnet (Chain ID: 137)  
**Deployment Date**: 2026-02-22  
**Status**: ✅ LIVE

---

## 📋 Contract Addresses

### **1. VIDA CAP Token** (Main Token)
**Address**: `0xDc6EFba149b47f6F6d77AC0523c51F204964C12E`  
**Purpose**: Main token for 5 VIDA CAP system ($900 spendable + $4000 locked)  
**Explorer**: https://polygonscan.com/address/0xDc6EFba149b47f6F6d77AC0523c51F204964C12E

**Functions**:
- `mintSovereignCap(recipient, spendable, locked)` - Mint 5 VIDA CAP
- `getSpendableBalance(owner)` - Get spendable balance
- `getLockedBalance(owner)` - Get locked balance
- `unlockTokens(owner, amount)` - Unlock tokens
- `transfer(to, amount)` - Transfer spendable tokens

---

### **2. ngnVIDA Token** (National Currency)
**Address**: `0x5dD456B88f2be6688E7A04f78471A3868bd06811`  
**Purpose**: Nigerian Naira-pegged VIDA token for local transactions  
**Explorer**: https://polygonscan.com/address/0x5dD456B88f2be6688E7A04f78471A3868bd06811

**Functions**:
- `mint(to, nairaAmount)` - Mint ngnVIDA tokens
- `burn(amount)` - Burn ngnVIDA tokens
- `transfer(to, amount)` - Transfer ngnVIDA

---

### **3. Foundation Vault**
**Address**: `0xD42C5b854319e43e2F9e2c387b13b84D1dF542E0`  
**Purpose**: Foundation treasury for protocol development and operations  
**Explorer**: https://polygonscan.com/address/0xD42C5b854319e43e2F9e2c387b13b84D1dF542E0

**Functions**:
- Holds foundation funds
- Manages protocol development budget
- Distributes grants and rewards

---

### **4. National Treasury**
**Address**: `0x5E8474D3BaaF27A4531F34f6fA8c9E237ce1ebb4`  
**Purpose**: National treasury for sovereign operations  
**Explorer**: https://polygonscan.com/address/0x5E8474D3BaaF27A4531F34f6fA8c9E237ce1ebb4

**Functions**:
- Holds national reserves
- Manages sovereign fund allocations
- Collects transaction fees (BPS)

---

### **5. Sentinel Vault**
**Address**: `0xddAe70eE45AFb5D0a7d65688844Ea61c9B617dfd`  
**Purpose**: Sentinel operations wallet (admin/enforcer)  
**Explorer**: https://polygonscan.com/address/0xddAe70eE45AFb5D0a7d65688844Ea61c9B617dfd

**Powers**:
- Authorize citizenship (Vitalization)
- Mint VIDA CAP tokens
- Execute recovery operations (ADRS - future)
- Lock savings (SSS - future)
- Sign transactions as Paymaster

---

## 🔗 Contract Relationships

```
┌─────────────────────────────────────────────────────────┐
│                    PFF Sentinel Protocol                 │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  VIDA CAP    │    │   ngnVIDA    │    │   Sentinel   │
│   Token      │    │    Token     │    │    Vault     │
│              │    │              │    │              │
│ 0xDc6E...2E  │    │ 0x5dD4...11  │    │ 0xddAe...fd  │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Foundation  │    │   National   │    │   Citizens   │
│    Vault     │    │   Treasury   │    │   (Users)    │
│              │    │              │    │              │
│ 0xD42C...E0  │    │ 0x5E84...b4  │    │ Multi-Wallet │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 🔐 Access Control

### **Sentinel Vault** (Admin)
- ✅ Can mint VIDA CAP tokens
- ✅ Can authorize citizenship (Vitalization)
- ✅ Can execute recovery operations
- ✅ Can lock/unlock savings
- ✅ Can sign Paymaster transactions

### **Foundation Vault**
- ✅ Receives protocol development funds
- ✅ Manages grants and rewards
- ✅ Controls protocol upgrades

### **National Treasury**
- ✅ Receives transaction fees (BPS)
- ✅ Manages national reserves
- ✅ Distributes sovereign allocations

### **Citizens** (Users)
- ✅ Receive 5 VIDA CAP after verification
- ✅ Can spend from spendable balance
- ✅ Can swap VIDA ↔ ngnVIDA
- ✅ Can transfer tokens

---

## 📊 Token Economics

### **VIDA CAP Token**
- **Total Supply**: Minted on-demand per citizen
- **Per Citizen**: 5 VIDA = $900 spendable + $4000 locked
- **Unlock Conditions**: Time-based or milestone-based (future)
- **Decimals**: 18

### **ngnVIDA Token**
- **Peg**: 1 ngnVIDA = 1 Nigerian Naira
- **Supply**: Minted/burned based on swaps
- **Use Case**: Local transactions in Nigeria
- **Decimals**: 18

---

## 🛠️ Integration Guide

### **1. Connect to VIDA CAP Token**

```javascript
import { ethers } from 'ethers';

const VIDA_CAP_ADDRESS = '0xDc6EFba149b47f6F6d77AC0523c51F204964C12E';
const VIDA_CAP_ABI = [
  'function mintSovereignCap(address recipient, uint256 spendable, uint256 locked) external',
  'function getSpendableBalance(address owner) external view returns (uint256)',
  'function getLockedBalance(address owner) external view returns (uint256)',
  'function transfer(address to, uint256 amount) public returns (bool)'
];

const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
const vidaContract = new ethers.Contract(VIDA_CAP_ADDRESS, VIDA_CAP_ABI, provider);

// Get spendable balance
const spendable = await vidaContract.getSpendableBalance('0xUserAddress');
console.log('Spendable:', ethers.formatEther(spendable), 'VIDA');
```

### **2. Connect to ngnVIDA Token**

```javascript
const NGN_VIDA_ADDRESS = '0x5dD456B88f2be6688E7A04f78471A3868bd06811';
const NGN_VIDA_ABI = [
  'function mint(address to, uint256 nairaAmount) external',
  'function burn(uint256 amount) external',
  'function balanceOf(address owner) external view returns (uint256)'
];

const ngnVidaContract = new ethers.Contract(NGN_VIDA_ADDRESS, NGN_VIDA_ABI, provider);

// Get ngnVIDA balance
const balance = await ngnVidaContract.balanceOf('0xUserAddress');
console.log('ngnVIDA Balance:', ethers.formatEther(balance));
```

---

## ✅ Verification Checklist

- [x] VIDA CAP Token deployed
- [x] ngnVIDA Token deployed
- [x] Foundation Vault deployed
- [x] National Treasury deployed
- [x] Sentinel Vault deployed
- [ ] Sentinel private key configured in `.env`
- [ ] Contracts verified on Polygonscan
- [ ] Test minting on mainnet
- [ ] Test Vitalization flow
- [ ] Update Netlify environment variables

---

**🟣 All contracts deployed on Polygon Mainnet and ready for integration!**

