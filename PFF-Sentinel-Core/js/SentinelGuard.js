/**
 * PFF Sentinel — SentinelGuard (Admin/Enforcer Functions)
 * Only ARCHITECT/SENTINEL role can execute these functions
 * 
 * POWERS:
 * - vitalize() — ADRS recovery function
 * - lockSavings() — SSS lock function
 * - collectBPSFees() — Collect transaction fees to Treasury
 * - paymasterSign() — Sign transactions as Paymaster (gasless)
 */

import { ethers } from 'ethers';
import { isSentinel, getSentinelWallet, getTreasuryWallet, SOVEREIGN_CONFIG } from './SovereignWalletTriad.js';

// ============================================
// ADRS CONTRACT ABI (Minimal)
// ============================================

const ADRS_ABI = [
  'function vitalize(address citizenAddress) external',
  'function getRecoveryAmount(address citizenAddress) external view returns (uint256)',
  'event Vitalized(address indexed citizen, uint256 amount)'
];

// ============================================
// SSS CONTRACT ABI (Minimal)
// ============================================

const SSS_ABI = [
  'function lockSavings(address citizenAddress, uint256 amount) external',
  'function getLockedBalance(address citizenAddress) external view returns (uint256)',
  'event SavingsLocked(address indexed citizen, uint256 amount)'
];

// ============================================
// BPS CONTRACT ABI (Minimal)
// ============================================

const BPS_ABI = [
  'function collectFees(bytes32 transactionHash) external',
  'function getFeeAmount(bytes32 transactionHash) external view returns (uint256)',
  'event FeesCollected(bytes32 indexed txHash, uint256 amount)'
];

// ============================================
// SENTINEL GUARD FUNCTIONS
// ============================================

/**
 * Execute ADRS vitalize() function
 * Recovers funds from a citizen's ADRS account to Treasury
 * @param {string} citizenAddress - Citizen wallet address
 * @returns {Promise<{success: boolean, txHash?: string, error?: string}>}
 */
export async function executeVitalize(citizenAddress) {
  try {
    // Verify caller is Sentinel
    const isSentinelRole = await isSentinel();
    if (!isSentinelRole) {
      return { success: false, error: 'Unauthorized: Only Sentinel can execute vitalize()' };
    }

    // Get Sentinel wallet (requires private key from env)
    const sentinelPrivateKey = import.meta.env.VITE_SENTINEL_PRIVATE_KEY;
    if (!sentinelPrivateKey) {
      return { success: false, error: 'Sentinel private key not configured' };
    }

    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(SOVEREIGN_CONFIG.network.rpcUrl);
    const sentinelSigner = new ethers.Wallet(sentinelPrivateKey, provider);

    // Initialize ADRS contract
    const adrsContract = new ethers.Contract(
      SOVEREIGN_CONFIG.contracts.adrs,
      ADRS_ABI,
      sentinelSigner
    );

    // Check recovery amount
    const recoveryAmount = await adrsContract.getRecoveryAmount(citizenAddress);
    console.log(`💰 ADRS Recovery Amount: ${ethers.formatEther(recoveryAmount)} VIDA`);

    // Execute vitalize
    const tx = await adrsContract.vitalize(citizenAddress);
    console.log(`⚡ Vitalize transaction sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ Vitalize confirmed in block ${receipt.blockNumber}`);

    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('❌ Vitalize failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Execute SSS lockSavings() function
 * Locks a citizen's savings in the SSS contract
 * @param {string} citizenAddress - Citizen wallet address
 * @param {string} amount - Amount to lock (in VIDA)
 * @returns {Promise<{success: boolean, txHash?: string, error?: string}>}
 */
export async function executeLockSavings(citizenAddress, amount) {
  try {
    // Verify caller is Sentinel
    const isSentinelRole = await isSentinel();
    if (!isSentinelRole) {
      return { success: false, error: 'Unauthorized: Only Sentinel can execute lockSavings()' };
    }

    // Get Sentinel wallet
    const sentinelPrivateKey = import.meta.env.VITE_SENTINEL_PRIVATE_KEY;
    if (!sentinelPrivateKey) {
      return { success: false, error: 'Sentinel private key not configured' };
    }

    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(SOVEREIGN_CONFIG.network.rpcUrl);
    const sentinelSigner = new ethers.Wallet(sentinelPrivateKey, provider);

    // Initialize SSS contract
    const sssContract = new ethers.Contract(
      SOVEREIGN_CONFIG.contracts.sss,
      SSS_ABI,
      sentinelSigner
    );

    // Convert amount to wei
    const amountWei = ethers.parseEther(amount);

    // Execute lockSavings
    const tx = await sssContract.lockSavings(citizenAddress, amountWei);
    console.log(`🔒 LockSavings transaction sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ LockSavings confirmed in block ${receipt.blockNumber}`);

    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('❌ LockSavings failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Collect BPS transaction fees to Treasury
 * @param {string} transactionHash - Transaction hash to collect fees from
 * @returns {Promise<{success: boolean, txHash?: string, error?: string}>}
 */
export async function collectBPSFees(transactionHash) {
  try {
    // Verify caller is Sentinel
    const isSentinelRole = await isSentinel();
    if (!isSentinelRole) {
      return { success: false, error: 'Unauthorized: Only Sentinel can collect BPS fees' };
    }

    // Get Sentinel wallet
    const sentinelPrivateKey = import.meta.env.VITE_SENTINEL_PRIVATE_KEY;
    if (!sentinelPrivateKey) {
      return { success: false, error: 'Sentinel private key not configured' };
    }

    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(SOVEREIGN_CONFIG.network.rpcUrl);
    const sentinelSigner = new ethers.Wallet(sentinelPrivateKey, provider);

    // Initialize BPS contract
    const bpsContract = new ethers.Contract(
      SOVEREIGN_CONFIG.contracts.bps,
      BPS_ABI,
      sentinelSigner
    );

    // Convert transaction hash to bytes32
    const txHashBytes32 = ethers.keccak256(transactionHash);

    // Check fee amount
    const feeAmount = await bpsContract.getFeeAmount(txHashBytes32);
    console.log(`💰 BPS Fee Amount: ${ethers.formatEther(feeAmount)} VIDA`);

    // Execute collectFees
    const tx = await bpsContract.collectFees(txHashBytes32);
    console.log(`💸 CollectFees transaction sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ Fees collected in block ${receipt.blockNumber}`);

    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('❌ CollectFees failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign transaction as Paymaster (for gasless transactions)
 * @param {Object} transaction - Transaction object to sign
 * @returns {Promise<{success: boolean, signedTx?: string, error?: string}>}
 */
export async function paymasterSign(transaction) {
  try {
    // Verify caller is Sentinel
    const isSentinelRole = await isSentinel();
    if (!isSentinelRole) {
      return { success: false, error: 'Unauthorized: Only Sentinel can act as Paymaster' };
    }

    // Get Sentinel wallet
    const sentinelPrivateKey = import.meta.env.VITE_SENTINEL_PRIVATE_KEY;
    if (!sentinelPrivateKey) {
      return { success: false, error: 'Sentinel private key not configured' };
    }

    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(SOVEREIGN_CONFIG.network.rpcUrl);
    const sentinelSigner = new ethers.Wallet(sentinelPrivateKey, provider);

    // Sign transaction
    const signedTx = await sentinelSigner.signTransaction(transaction);
    console.log('✅ Transaction signed by Paymaster');

    return { success: true, signedTx };
  } catch (error) {
    console.error('❌ Paymaster signing failed:', error);
    return { success: false, error: error.message };
  }
}

