/**
 * PFF Sentinel - VIDA Split Verifier
 * Verifies 5-5-1 VIDA distribution on-chain before showing "Verified" status
 */

import { ethers } from 'ethers';

// Configuration
const POLYGON_RPC_URLS = [
  'https://polygon-rpc.com',
  'https://polygon-pokt.nodies.app',
  'https://polygon-bor-rpc.publicnode.com',
  'https://1rpc.io/matic'
];

const VIDA_TOKEN_ADDRESS = import.meta.env.VITE_VIDA_TOKEN_ADDRESS || '0xc226fFb538b6f80F05d5F0Ee0758E5D85a42DE0C';
const NATIONAL_TREASURY = import.meta.env.VITE_NATIONAL_TREASURY_ADDRESS || '0x4c81E768f4B201bCd7E924f671ABA1B162786b48';
const FOUNDATION_VAULT = import.meta.env.VITE_FOUNDATION_VAULT_ADDRESS || '0xDD8046422Bbeba12FD47DE854639abF7FB6E0858';

// VIDA Token ABI (minimal)
const VIDA_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function getSpendableBalance(address owner) view returns (uint256)',
  'function getLockedBalance(address owner) view returns (uint256)'
];

/**
 * Verify VIDA split (5-5-1) on-chain
 * @param {string} userAddress - User wallet address
 * @returns {Promise<{verified: boolean, userBalance: number, treasuryBalance: number, foundationBalance: number, error?: string}>}
 */
export async function verifyVidaSplit(userAddress) {
  try {
    // Fetch balances from chain
    const [userBal, treasuryBal, foundationBal] = await Promise.all([
      getChainBalance(userAddress),
      getChainBalance(NATIONAL_TREASURY),
      getChainBalance(FOUNDATION_VAULT)
    ]);

    // Check if split is correct (5-5-1)
    // Allow small rounding difference (0.01 VIDA)
    const userCorrect = Math.abs(userBal.total - 5) < 0.01;
    const treasuryCorrect = Math.abs(treasuryBal.total - 5) < 0.01;
    const foundationCorrect = Math.abs(foundationBal.total - 1) < 0.01;

    const verified = userCorrect && treasuryCorrect && foundationCorrect;

    return {
      verified,
      userBalance: userBal.total,
      treasuryBalance: treasuryBal.total,
      foundationBalance: foundationBal.total,
      details: {
        user: userBal,
        treasury: treasuryBal,
        foundation: foundationBal
      }
    };

  } catch (error) {
    console.error('❌ VIDA split verification failed:', error);
    return {
      verified: false,
      userBalance: 0,
      treasuryBalance: 0,
      foundationBalance: 0,
      error: error.message
    };
  }
}

/**
 * Get VIDA balance from chain with RPC fallback
 * @param {string} address - Wallet address
 * @returns {Promise<{spendable: number, locked: number, total: number}>}
 */
async function getChainBalance(address) {
  let lastError;

  for (const rpcUrl of POLYGON_RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(VIDA_TOKEN_ADDRESS, VIDA_ABI, provider);

      const [spendable, locked] = await Promise.all([
        contract.getSpendableBalance(address),
        contract.getLockedBalance(address)
      ]);

      const spendableNum = parseFloat(ethers.formatUnits(spendable, 18));
      const lockedNum = parseFloat(ethers.formatUnits(locked, 18));

      return {
        spendable: spendableNum,
        locked: lockedNum,
        total: spendableNum + lockedNum
      };

    } catch (error) {
      lastError = error;
      continue; // Try next RPC
    }
  }

  throw new Error(`Failed to fetch balance from all RPCs: ${lastError?.message}`);
}

/**
 * Verify vitalization status with on-chain split check
 * @param {Object} supabaseData - Data from Supabase (vida_minted, wallet_address, etc.)
 * @returns {Promise<{verified: boolean, reason?: string, splitDetails?: Object}>}
 */
export async function verifyVitalizationStatus(supabaseData) {
  // Check Supabase flag first
  if (!supabaseData.vida_minted) {
    return {
      verified: false,
      reason: 'Not vitalized in database'
    };
  }

  if (!supabaseData.wallet_address) {
    return {
      verified: false,
      reason: 'No wallet address found'
    };
  }

  // Verify on-chain split
  const splitResult = await verifyVidaSplit(supabaseData.wallet_address);

  if (!splitResult.verified) {
    return {
      verified: false,
      reason: 'VIDA split (5-5-1) not correctly distributed on-chain',
      splitDetails: splitResult
    };
  }

  // Both checks passed
  return {
    verified: true,
    splitDetails: splitResult
  };
}

/**
 * Display split verification results in UI
 * @param {HTMLElement} container - Container element
 * @param {Object} splitResult - Result from verifyVidaSplit()
 */
export function displaySplitVerification(container, splitResult) {
  if (!container) return;

  const { verified, userBalance, treasuryBalance, foundationBalance, error } = splitResult;

  if (error) {
    container.innerHTML = `
      <div style="background: rgba(220, 38, 38, 0.2); border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 12px 0;">
        <h4 style="margin: 0 0 8px 0; color: #fca5a5;">⚠️ Split Verification Failed</h4>
        <p style="margin: 0; font-size: 14px; opacity: 0.9;">${error}</p>
      </div>
    `;
    return;
  }

  const statusColor = verified ? '#10b981' : '#f59e0b';
  const statusIcon = verified ? '✅' : '⚠️';

  container.innerHTML = `
    <div style="background: rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 16px; margin: 12px 0;">
      <h4 style="margin: 0 0 12px 0; color: ${statusColor};">${statusIcon} VIDA Split Verification</h4>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 14px;">
        <div style="text-align: center;">
          <div style="font-weight: bold; margin-bottom: 4px;">User</div>
          <div style="font-size: 20px; color: ${Math.abs(userBalance - 5) < 0.01 ? '#10b981' : '#f59e0b'};">${userBalance.toFixed(2)} VIDA</div>
          <div style="opacity: 0.7; font-size: 12px;">Expected: 5</div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: bold; margin-bottom: 4px;">Treasury</div>
          <div style="font-size: 20px; color: ${Math.abs(treasuryBalance - 5) < 0.01 ? '#10b981' : '#f59e0b'};">${treasuryBalance.toFixed(2)} VIDA</div>
          <div style="opacity: 0.7; font-size: 12px;">Expected: 5</div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: bold; margin-bottom: 4px;">Foundation</div>
          <div style="font-size: 20px; color: ${Math.abs(foundationBalance - 1) < 0.01 ? '#10b981' : '#f59e0b'};">${foundationBalance.toFixed(2)} VIDA</div>
          <div style="opacity: 0.7; font-size: 12px;">Expected: 1</div>
        </div>
      </div>
    </div>
  `;
}

