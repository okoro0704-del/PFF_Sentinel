/**
 * PFF Sentinel — Minting Protocol
 * Automated VIDA token minting when is_fully_verified becomes TRUE
 * Releases 5 VIDA CAP: $900 spendable + $4000 locked
 */

import { ethers } from 'ethers';
import { connectWallet, getVidaContract, isWalletConnected, getConnectedAddress } from './SovereignProvider.js';
import { isFullyVerified, isVidaMinted, markVidaMinted } from './supabase-client.js';

// VIDA Token Configuration
const VIDA_CAP = {
  total: 5, // 5 VIDA tokens
  spendable: 900, // $900 USD equivalent (spendable)
  locked: 4000 // $4000 USD equivalent (locked until conditions met)
};

// Convert USD to VIDA token units (assuming 18 decimals like standard ERC-20)
// 1 VIDA = $980 USD, so 5 VIDA = $4900 total
const VIDA_DECIMALS = 18;

/**
 * Convert VIDA amount to token units (with 18 decimals)
 * @param {number} amount - Amount in VIDA
 * @returns {bigint}
 */
function toTokenUnits(amount) {
  return ethers.parseUnits(amount.toString(), VIDA_DECIMALS);
}

/**
 * Convert token units to VIDA amount
 * @param {bigint} units - Token units
 * @returns {string}
 */
function fromTokenUnits(units) {
  return ethers.formatUnits(units, VIDA_DECIMALS);
}

/**
 * Check if user is eligible for VIDA minting
 * @param {string} deviceId - Device ID
 * @returns {Promise<{eligible: boolean, reason?: string}>}
 */
export async function checkMintingEligibility(deviceId) {
  try {
    // Check if fully verified in Supabase
    const verified = await isFullyVerified(deviceId);
    if (!verified) {
      return { eligible: false, reason: 'Profile not fully verified (Four-Pillar incomplete)' };
    }

    // Check if VIDA already minted
    const minted = await isVidaMinted(deviceId);
    if (minted) {
      return { eligible: false, reason: 'VIDA already minted for this device' };
    }

    // Check wallet connection
    if (!isWalletConnected()) {
      return { eligible: false, reason: 'Wallet not connected' };
    }

    return { eligible: true };
  } catch (err) {
    console.error('Eligibility check error:', err);
    return { eligible: false, reason: err.message || 'Unknown error' };
  }
}

/**
 * Mint 5 VIDA CAP to user's wallet
 * @param {string} deviceId - Device ID
 * @param {string} recipientAddress - Wallet address to receive VIDA (optional, uses connected wallet if not provided)
 * @returns {Promise<{success: boolean, txHash?: string, error?: any}>}
 */
export async function mintVidaCap(deviceId, recipientAddress = null) {
  try {
    // Check eligibility
    const eligibility = await checkMintingEligibility(deviceId);
    if (!eligibility.eligible) {
      return { success: false, error: eligibility.reason };
    }

    // Get recipient address
    const recipient = recipientAddress || getConnectedAddress();
    if (!recipient) {
      return { success: false, error: 'No recipient address provided' };
    }

    // Get VIDA contract
    const vidaContract = getVidaContract();
    if (!vidaContract) {
      return { success: false, error: 'VIDA contract not initialized' };
    }

    // Convert amounts to token units
    const spendableUnits = toTokenUnits(VIDA_CAP.spendable / 980); // Convert USD to VIDA
    const lockedUnits = toTokenUnits(VIDA_CAP.locked / 980); // Convert USD to VIDA

    console.log('Minting VIDA CAP:', {
      recipient,
      spendable: fromTokenUnits(spendableUnits),
      locked: fromTokenUnits(lockedUnits),
      totalVIDA: VIDA_CAP.total
    });

    // Call smart contract mintSovereignCap function
    const tx = await vidaContract.mintSovereignCap(
      recipient,
      spendableUnits,
      lockedUnits
    );

    console.log('VIDA minting transaction sent:', tx.hash);

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      // Mark as minted in Supabase
      await markVidaMinted(deviceId, VIDA_CAP.spendable, VIDA_CAP.locked);

      console.log('VIDA minting successful:', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      });

      return { 
        success: true, 
        txHash: receipt.hash,
        spendable: VIDA_CAP.spendable,
        locked: VIDA_CAP.locked
      };
    } else {
      return { success: false, error: 'Transaction failed' };
    }
  } catch (err) {
    console.error('VIDA minting error:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * Get VIDA balance for an address
 * @param {string} address - Wallet address
 * @returns {Promise<{success: boolean, spendable?: string, locked?: string, total?: string, error?: any}>}
 */
export async function getVidaBalance(address) {
  try {
    const vidaContract = getVidaContract();
    if (!vidaContract) {
      // Try read-only contract
      const { getProvider } = await import('./SovereignProvider.js');
      const provider = getProvider();
      const readOnlyContract = new ethers.Contract(
        vidaContract.target,
        vidaContract.interface,
        provider
      );
      
      const [spendable, locked] = await Promise.all([
        readOnlyContract.getSpendableBalance(address),
        readOnlyContract.getLockedBalance(address)
      ]);

      const spendableStr = fromTokenUnits(spendable);
      const lockedStr = fromTokenUnits(locked);
      const total = (parseFloat(spendableStr) + parseFloat(lockedStr)).toString();

      return { 
        success: true, 
        spendable: spendableStr, 
        locked: lockedStr,
        total
      };
    }

    const [spendable, locked] = await Promise.all([
      vidaContract.getSpendableBalance(address),
      vidaContract.getLockedBalance(address)
    ]);

    const spendableStr = fromTokenUnits(spendable);
    const lockedStr = fromTokenUnits(locked);
    const total = (parseFloat(spendableStr) + parseFloat(lockedStr)).toString();

    return { 
      success: true, 
      spendable: spendableStr, 
      locked: lockedStr,
      total
    };
  } catch (err) {
    console.error('Get VIDA balance error:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * Auto-mint VIDA when verification is complete
 * Call this after successful Four-Pillar verification
 * @param {string} deviceId - Device ID
 * @returns {Promise<{success: boolean, txHash?: string, error?: any}>}
 */
export async function autoMintOnVerification(deviceId) {
  try {
    // Ensure wallet is connected
    if (!isWalletConnected()) {
      const connectResult = await connectWallet();
      if (!connectResult.success) {
        return { success: false, error: 'Failed to connect wallet: ' + connectResult.error };
      }
    }

    // Mint VIDA CAP
    return await mintVidaCap(deviceId);
  } catch (err) {
    console.error('Auto-mint error:', err);
    return { success: false, error: err.message || err };
  }
}

