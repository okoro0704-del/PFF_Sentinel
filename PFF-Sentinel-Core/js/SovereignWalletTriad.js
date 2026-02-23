/**
 * PFF Sentinel — Sovereign Multi-Wallet Architecture
 * The Invisible Nation: No external wallets, only internal PFF Sovereign IDs
 * 
 * THE SOVEREIGN TRIAD:
 * 1. Citizen Wallet (Embedded/Smart Wallet via Account Abstraction)
 * 2. Sentinel Wallet (Admin/Enforcer - vitalize() & lockSavings() powers)
 * 3. Treasury Wallet (National Vault - BPS fees & ADRS recoveries)
 */

import { ethers } from 'ethers';
import { getDeviceId } from './handshake-core.js';
import { getProfile, upsertProfile } from './supabase-client.js';

// ============================================
// SOVEREIGN WALLET CONFIGURATION
// ============================================

const SOVEREIGN_CONFIG = {
  // Polygon Network
  network: {
    chainId: import.meta.env.VITE_POLYGON_NETWORK === 'polygon' ? 137 :
             import.meta.env.VITE_POLYGON_NETWORK === 'polygonAmoy' ? 80002 : 80001,
    name: import.meta.env.VITE_POLYGON_NETWORK === 'polygon' ? 'Polygon Mainnet' :
          import.meta.env.VITE_POLYGON_NETWORK === 'polygonAmoy' ? 'Polygon Amoy Testnet' : 'Polygon Mumbai Testnet',
    rpcUrl: import.meta.env.VITE_POLYGON_NETWORK === 'polygon'
      ? (import.meta.env.POLYGON_RPC_URL || 'https://polygon-rpc.com')
      : import.meta.env.VITE_POLYGON_NETWORK === 'polygonAmoy'
      ? (import.meta.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology')
      : (import.meta.env.POLYGON_MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com')
  },

  // National Treasury (Deployed Contract)
  treasuryAddress: import.meta.env.VITE_NATIONAL_TREASURY_ADDRESS || '0x5E8474D3BaaF27A4531F34f6fA8c9E237ce1ebb4',

  // Sentinel Wallet (Deployed Contract)
  sentinelAddress: import.meta.env.VITE_SENTINEL_WALLET_ADDRESS || '0xddAe70eE45AFb5D0a7d65688844Ea61c9B617dfd',

  // Foundation Vault (Deployed Contract)
  foundationVaultAddress: import.meta.env.VITE_FOUNDATION_VAULT_ADDRESS || '0xD42C5b854319e43e2F9e2c387b13b84D1dF542E0',

  // Contract Addresses (Deployed on Polygon Mainnet)
  contracts: {
    // ✅ DEPLOYED - VIDA CAP Token (Main sovereign token)
    vida: import.meta.env.VITE_VIDA_TOKEN_ADDRESS || '0xDc6EFba149b47f6F6d77AC0523c51F204964C12E',

    // ✅ DEPLOYED - ngnVIDA Token (Nigerian Naira-pegged token)
    ngnVida: import.meta.env.VITE_NGN_VIDA_ADDRESS || '0x5dD456B88f2be6688E7A04f78471A3868bd06811',

    // ⏳ FUTURE FEATURE - DLLR Token (not deployed yet)
    // Will be deployed in Phase 3 - Dollar-pegged stablecoin
    dllr: import.meta.env.VITE_DLLR_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',

    // ⏳ FUTURE FEATURE - USDT Token (not deployed yet)
    // Will be integrated in Phase 3 - Tether integration
    usdt: import.meta.env.VITE_USDT_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',

    // ⏳ FUTURE FEATURE - ADRS Contract (Autonomous Dispute Resolution System)
    // Planned for Phase 4 - On-chain dispute resolution
    adrs: import.meta.env.VITE_ADRS_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',

    // ⏳ FUTURE FEATURE - SSS Contract (Sovereign Savings System)
    // Planned for Phase 4 - Savings vault with yield
    sss: import.meta.env.VITE_SSS_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',

    // ⏳ FUTURE FEATURE - BPS Contract (Biometric Protection System)
    // Planned for Phase 5 - Advanced biometric security
    bps: import.meta.env.VITE_BPS_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'
  }
};

// ============================================
// ROLE DEFINITIONS
// ============================================

export const ROLES = {
  CITIZEN: 'CITIZEN',
  SENTINEL: 'SENTINEL',
  ARCHITECT: 'ARCHITECT'
};

// ============================================
// CITIZEN WALLET (Embedded/Smart Wallet)
// ============================================

let citizenWallet = null;
let provider = null;

/**
 * Initialize Citizen Wallet (Account Abstraction)
 * Creates a hidden, embedded wallet tied to PFF Sovereign ID
 * NO external wallet connection required
 */
export async function initializeCitizenWallet() {
  try {
    // Get device ID (PFF Sovereign ID)
    const deviceId = await getDeviceId();
    
    if (!deviceId) {
      throw new Error('PFF Sovereign ID not found. Complete Four-Pillar verification first.');
    }

    // Initialize provider
    provider = new ethers.JsonRpcProvider(SOVEREIGN_CONFIG.network.rpcUrl, {
      chainId: SOVEREIGN_CONFIG.network.chainId,
      name: SOVEREIGN_CONFIG.network.name
    });

    // Check if wallet exists in database
    let profile = await getProfile(deviceId);
    
    if (!profile || !profile.wallet_address) {
      // Generate new embedded wallet
      const wallet = ethers.Wallet.createRandom();
      const walletAddress = wallet.address;
      const encryptedPrivateKey = await encryptPrivateKey(wallet.privateKey, deviceId);
      
      // Store in database
      await upsertProfile(deviceId, {
        wallet_address: walletAddress,
        wallet_encrypted_key: encryptedPrivateKey,
        wallet_type: 'EMBEDDED_SMART_WALLET',
        role: ROLES.CITIZEN
      });
      
      profile = await getProfile(deviceId);
    }

    // Create wallet instance (read-only for now)
    citizenWallet = {
      address: profile.wallet_address,
      deviceId: deviceId,
      role: profile.role || ROLES.CITIZEN,
      type: 'EMBEDDED_SMART_WALLET'
    };

    console.log('🏛️ Citizen Wallet initialized:', citizenWallet.address);
    return { success: true, wallet: citizenWallet };
    
  } catch (error) {
    console.error('❌ Citizen Wallet initialization failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current Citizen Wallet
 */
export function getCitizenWallet() {
  return citizenWallet;
}

/**
 * Check if Citizen Wallet is initialized
 */
export function isCitizenWalletInitialized() {
  return citizenWallet !== null;
}

// ============================================
// SENTINEL WALLET (Enforcer/Admin)
// ============================================

/**
 * Get Sentinel Wallet address (Admin/Enforcer)
 * This wallet has special powers: vitalize() and lockSavings()
 */
export function getSentinelWallet() {
  return {
    address: SOVEREIGN_CONFIG.sentinelAddress,
    role: ROLES.SENTINEL,
    powers: ['vitalize', 'lockSavings', 'executeADRS', 'manageBPS']
  };
}

/**
 * Check if current user is Sentinel (Architect)
 */
export async function isSentinel() {
  if (!citizenWallet) return false;
  const profile = await getProfile(citizenWallet.deviceId);
  return profile?.role === ROLES.ARCHITECT || profile?.role === ROLES.SENTINEL;
}

// ============================================
// TREASURY WALLET (National Vault)
// ============================================

/**
 * Get Treasury Wallet address (National Vault)
 * Receives all BPS transaction fees and ADRS recoveries
 */
export function getTreasuryWallet() {
  return {
    address: SOVEREIGN_CONFIG.treasuryAddress,
    purpose: 'NATIONAL_VAULT',
    receives: ['BPS_FEES', 'ADRS_RECOVERIES', 'PROTOCOL_FEES']
  };
}

// ============================================
// ENCRYPTION UTILITIES
// ============================================

/**
 * Encrypt private key using device ID as encryption key
 * Uses AES-GCM for secure encryption
 */
async function encryptPrivateKey(privateKey, deviceId) {
  try {
    // Derive encryption key from device ID
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(deviceId),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('PFF_SOVEREIGN_SALT'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt private key
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      encryptionKey,
      encoder.encode(privateKey)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('❌ Encryption failed:', error);
    throw new Error('Failed to encrypt private key');
  }
}

/**
 * Decrypt private key using device ID
 */
async function decryptPrivateKey(encryptedKey, deviceId) {
  try {
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Derive decryption key from device ID
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(deviceId),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const decryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('PFF_SOVEREIGN_SALT'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Decrypt
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      decryptionKey,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    throw new Error('Failed to decrypt private key');
  }
}

// ============================================
// WALLET BALANCE QUERIES
// ============================================

/**
 * Get token balances for Citizen Wallet
 * UPDATED: Now fetches from Polygon chain instead of Supabase
 * @returns {Promise<{vida: string, dllr: string, usdt: string, error?: string}>}
 */
export async function getWalletBalances() {
  if (!citizenWallet) {
    throw new Error('Citizen Wallet not initialized');
  }

  try {
    // Fetch VIDA balance from Polygon chain
    const { getVidaBalance } = await import('./MintingProtocol.js');
    const vidaBalance = await getVidaBalance(citizenWallet.address);

    if (!vidaBalance.success) {
      // Fallback to Supabase if chain query fails
      console.warn('⚠️ Chain query failed, falling back to Supabase');
      const profile = await getProfile(citizenWallet.deviceId);

      return {
        vida: profile?.data?.vida_balance_spendable || '0',
        dllr: '0',
        usdt: '0',
        error: 'Chain query failed - showing cached balance'
      };
    }

    // Return on-chain balance (spendable only for display)
    return {
      vida: vidaBalance.spendable || '0',
      vidaLocked: vidaBalance.locked || '0',
      vidaTotal: vidaBalance.total || '0',
      dllr: '0', // ⏳ FUTURE FEATURE - DLLR token not deployed yet (Phase 3)
      usdt: '0'  // ⏳ FUTURE FEATURE - USDT integration not deployed yet (Phase 3)
    };
  } catch (error) {
    console.error('❌ Failed to get wallet balances:', error);

    // Show user-friendly error
    throw new Error('⚠️ Network Latency: Unable to fetch balances from blockchain. Please check your internet connection.');
  }
}

/**
 * Get Citizen Wallet signer for transactions
 * @returns {Promise<ethers.Wallet>}
 */
export async function getCitizenSigner() {
  if (!citizenWallet) {
    throw new Error('Citizen Wallet not initialized');
  }

  try {
    const profile = await getProfile(citizenWallet.deviceId);

    if (!profile?.wallet_encrypted_key) {
      throw new Error('Wallet private key not found');
    }

    // Decrypt private key
    const privateKey = await decryptPrivateKey(
      profile.wallet_encrypted_key,
      citizenWallet.deviceId
    );

    // Create wallet instance with provider
    return new ethers.Wallet(privateKey, provider);
  } catch (error) {
    console.error('❌ Failed to get signer:', error);
    throw error;
  }
}

// ============================================
// EXPORTS
// ============================================

export { SOVEREIGN_CONFIG };
