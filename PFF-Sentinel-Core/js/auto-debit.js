/**
 * PFF Sentinel — Auto-Debit Protocol
 * Handles VIDA token transfers from Citizen's spendable vault to Sentinel's wallet
 */

import { ethers } from 'ethers';
import { getVidaContract, getProvider } from './SovereignProvider.js';
import { recordTransaction, updateTransactionStatus, recordEarning } from './treasury-client.js';

// VIDA price in USD (this should be fetched from an oracle in production)
const VIDA_PRICE_USD = 1.0; // $1 per VIDA for now

// ============================================
// PAYMENT PROCESSING
// ============================================

/**
 * Process subscription payment from Citizen to Sentinel
 * @param {Object} paymentData - { citizen_wallet_address, sentinel_wallet_address, plan_amount_usd, subscription_id }
 * @returns {Promise<{success: boolean, transactionHash?: string, error?: any}>}
 */
export async function processSubscriptionPayment(paymentData) {
  const {
    citizen_wallet_address,
    sentinel_wallet_address,
    plan_amount_usd,
    subscription_id
  } = paymentData;

  try {
    console.log(`Processing payment: $${plan_amount_usd} from ${citizen_wallet_address} to ${sentinel_wallet_address}`);

    // Calculate VIDA amount
    const vidaAmount = plan_amount_usd / VIDA_PRICE_USD;
    const vidaAmountWei = ethers.parseEther(vidaAmount.toString());

    // Get VIDA contract
    const vidaContract = getVidaContract();
    if (!vidaContract) {
      throw new Error('VIDA contract not initialized');
    }

    // Check Citizen's spendable balance
    const spendableBalance = await vidaContract.getSpendableBalance(citizen_wallet_address);
    
    if (spendableBalance < vidaAmountWei) {
      const balanceInVida = ethers.formatEther(spendableBalance);
      throw new Error(`Insufficient spendable balance. Required: ${vidaAmount} VIDA, Available: ${balanceInVida} VIDA`);
    }

    // Record pending transaction
    const transactionRecord = await recordTransaction({
      subscription_id,
      from_address: citizen_wallet_address,
      to_address: sentinel_wallet_address,
      amount_usd: plan_amount_usd,
      amount_vida: vidaAmount,
      transaction_type: 'subscription',
      status: 'pending'
    });

    if (!transactionRecord.success) {
      throw new Error('Failed to record transaction');
    }

    const transactionId = transactionRecord.data.id;

    // Execute transfer (Citizen must approve this transaction)
    // Note: This requires the Citizen's wallet to sign the transaction
    const provider = getProvider();
    const signer = await provider.getSigner();
    const vidaContractWithSigner = vidaContract.connect(signer);

    console.log(`Transferring ${vidaAmount} VIDA...`);
    const tx = await vidaContractWithSigner.transfer(sentinel_wallet_address, vidaAmountWei);
    
    console.log(`Transaction submitted: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    // Update transaction status
    await updateTransactionStatus(transactionId, 'confirmed', {
      block_number: receipt.blockNumber,
      gas_used: receipt.gasUsed.toString(),
      confirmed_at: new Date().toISOString()
    });

    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      vidaAmount
    };

  } catch (err) {
    console.error('Payment processing error:', err);
    
    // Update transaction status to failed if we have a transaction ID
    if (err.transactionId) {
      await updateTransactionStatus(err.transactionId, 'failed');
    }

    return {
      success: false,
      error: err.message || 'Payment processing failed'
    };
  }
}

/**
 * Calculate commission for a plan
 * @param {number} planAmount - Plan amount in USD
 * @returns {Object} - { tier, commission_usd, commission_vida }
 */
export function calculateCommission(planAmount) {
  let tier = 'tier1';
  let commission_usd = 10;

  if (planAmount >= 200 && planAmount < 500) {
    tier = 'tier2';
    commission_usd = 20;
  } else if (planAmount >= 500) {
    tier = 'tier3';
    commission_usd = 30;
  }

  const commission_vida = commission_usd / VIDA_PRICE_USD;

  return {
    tier,
    commission_usd,
    commission_vida
  };
}

/**
 * Process subscription with payment and commission
 * @param {Object} subscriptionData - { citizen_device_id, citizen_wallet_address, sentinel_wallet_address, plan_tier, plan_amount }
 * @returns {Promise<{success: boolean, subscription?: any, payment?: any, earning?: any, error?: any}>}
 */
export async function processSubscriptionWithPayment(subscriptionData) {
  const {
    citizen_device_id,
    citizen_wallet_address,
    sentinel_wallet_address,
    plan_tier,
    plan_amount,
    subscription_id
  } = subscriptionData;

  try {
    // Process payment
    const paymentResult = await processSubscriptionPayment({
      citizen_wallet_address,
      sentinel_wallet_address,
      plan_amount_usd: plan_amount,
      subscription_id
    });

    if (!paymentResult.success) {
      throw new Error(paymentResult.error);
    }

    // Calculate commission
    const commission = calculateCommission(plan_amount);

    // Record earning for Sentinel
    const earningResult = await recordEarning({
      sentinel_wallet_address,
      citizen_device_id,
      subscription_id,
      commission_tier: commission.tier,
      commission_amount: commission.commission_usd,
      plan_amount,
      vida_amount: commission.commission_vida,
      transaction_hash: paymentResult.transactionHash,
      status: 'pending'
    });

    if (!earningResult.success) {
      console.error('Failed to record earning:', earningResult.error);
    }

    return {
      success: true,
      payment: paymentResult,
      earning: earningResult.data
    };

  } catch (err) {
    console.error('Subscription processing error:', err);
    return {
      success: false,
      error: err.message || 'Subscription processing failed'
    };
  }
}

