/**
 * PFF Sentinel — Gasless Paymaster
 * Sentinel acts as Paymaster to sponsor transactions for Citizens
 * Citizens never need to hold native Gas (POL) to perform transactions
 */

import { ethers } from 'ethers';
import { paymasterSign } from './SentinelGuard.js';
import { SOVEREIGN_CONFIG } from './SovereignWalletTriad.js';

// ============================================
// PAYMASTER CONFIGURATION
// ============================================

const PAYMASTER_CONFIG = {
  enabled: import.meta.env.VITE_PAYMASTER_ENABLED === 'true',
  gasSponsorLimit: parseFloat(import.meta.env.VITE_GAS_SPONSOR_LIMIT || '0.01'), // Max POL per transaction
  maxGasPrice: ethers.parseUnits('1', 'gwei') // Max gas price to sponsor
};

// ============================================
// GAS ESTIMATION
// ============================================

/**
 * Estimate gas cost for a transaction
 * @param {Object} transaction - Transaction object
 * @returns {Promise<{gasLimit: bigint, gasPrice: bigint, totalCost: bigint}>}
 */
export async function estimateGasCost(transaction) {
  try {
    const provider = new ethers.JsonRpcProvider(SOVEREIGN_CONFIG.network.rpcUrl);

    // Estimate gas limit
    const gasLimit = await provider.estimateGas(transaction);

    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || PAYMASTER_CONFIG.maxGasPrice;

    // Calculate total cost
    const totalCost = gasLimit * gasPrice;

    console.log(`⛽ Gas Estimate: ${gasLimit.toString()} units @ ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    console.log(`💰 Total Cost: ${ethers.formatEther(totalCost)} POL`);

    return { gasLimit, gasPrice, totalCost };
  } catch (error) {
    console.error('❌ Gas estimation failed:', error);
    throw error;
  }
}

/**
 * Check if transaction is within sponsor limit
 * @param {bigint} totalCost - Total gas cost in wei
 * @returns {boolean}
 */
function isWithinSponsorLimit(totalCost) {
  const limitWei = ethers.parseEther(PAYMASTER_CONFIG.gasSponsorLimit.toString());
  return totalCost <= limitWei;
}

// ============================================
// GASLESS TRANSACTION SPONSORSHIP
// ============================================

/**
 * Sponsor a transaction (Sentinel pays gas)
 * @param {Object} transaction - Transaction object from Citizen
 * @param {string} citizenAddress - Citizen wallet address
 * @returns {Promise<{success: boolean, txHash?: string, error?: string}>}
 */
export async function sponsorTransaction(transaction, citizenAddress) {
  try {
    if (!PAYMASTER_CONFIG.enabled) {
      return { success: false, error: 'Paymaster is not enabled' };
    }

    console.log(`🎁 Sponsoring transaction for Citizen: ${citizenAddress}`);

    // Estimate gas cost
    const { gasLimit, gasPrice, totalCost } = await estimateGasCost(transaction);

    // Check if within sponsor limit
    if (!isWithinSponsorLimit(totalCost)) {
      return { 
        success: false, 
        error: `Gas cost exceeds sponsor limit: ${ethers.formatEther(totalCost)} POL` 
      };
    }

    // Add gas parameters to transaction
    const sponsoredTx = {
      ...transaction,
      gasLimit,
      gasPrice,
      chainId: SOVEREIGN_CONFIG.network.chainId
    };

    // Sign transaction with Paymaster (Sentinel)
    const signResult = await paymasterSign(sponsoredTx);
    
    if (!signResult.success) {
      return { success: false, error: signResult.error };
    }

    // Submit gasless transaction
    const result = await submitGaslessTransaction(signResult.signedTx);
    
    return result;
  } catch (error) {
    console.error('❌ Transaction sponsorship failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit gasless transaction to network
 * @param {string} signedTx - Signed transaction hex string
 * @returns {Promise<{success: boolean, txHash?: string, error?: string}>}
 */
export async function submitGaslessTransaction(signedTx) {
  try {
    const provider = new ethers.JsonRpcProvider(SOVEREIGN_CONFIG.network.rpcUrl);

    // Broadcast transaction
    const tx = await provider.broadcastTransaction(signedTx);
    console.log(`📡 Gasless transaction broadcast: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('❌ Transaction submission failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Paymaster status
 * @returns {Object}
 */
export function getPaymasterStatus() {
  return {
    enabled: PAYMASTER_CONFIG.enabled,
    gasSponsorLimit: PAYMASTER_CONFIG.gasSponsorLimit,
    maxGasPrice: ethers.formatUnits(PAYMASTER_CONFIG.maxGasPrice, 'gwei') + ' gwei'
  };
}

