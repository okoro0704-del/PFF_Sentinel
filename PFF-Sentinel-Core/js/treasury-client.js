/**
 * PFF Sentinel — Treasury Client (Phase 2)
 * Subscription management, earnings tracking, and payment processing
 */

import { supabase } from './supabase-client.js';

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Create or update subscription
 * @param {Object} subscriptionData - { citizen_device_id, sentinel_wallet_address, plan_tier, plan_amount }
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function upsertSubscription(subscriptionData) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        ...subscriptionData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Subscription upsert error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Subscription upsert exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Get subscriptions for a Sentinel
 * @param {string} sentinelWalletAddress - Sentinel's wallet address
 * @returns {Promise<{success: boolean, data?: any[], error?: any}>}
 */
export async function getSentinelSubscriptions(sentinelWalletAddress) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('sentinel_wallet_address', sentinelWalletAddress)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get subscriptions error:', error);
      return { success: false, error };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Get subscriptions exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Get subscription count by tier for a Sentinel
 * @param {string} sentinelWalletAddress - Sentinel's wallet address
 * @returns {Promise<{success: boolean, data?: Object, error?: any}>}
 */
export async function getSubscriptionCounts(sentinelWalletAddress) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan_tier, plan_amount')
      .eq('sentinel_wallet_address', sentinelWalletAddress)
      .eq('status', 'active');

    if (error) {
      console.error('Get subscription counts error:', error);
      return { success: false, error };
    }

    // Count by tier
    const counts = {
      basic: 0,    // $100
      standard: 0, // $200
      premium: 0,  // $500
      elite: 0,    // $1000
      total: data?.length || 0
    };

    data?.forEach(sub => {
      counts[sub.plan_tier] = (counts[sub.plan_tier] || 0) + 1;
    });

    return { success: true, data: counts };
  } catch (err) {
    console.error('Get subscription counts exception:', err);
    return { success: false, error: err };
  }
}

// ============================================
// EARNINGS MANAGEMENT
// ============================================

/**
 * Record commission earning
 * @param {Object} earningData - { sentinel_wallet_address, citizen_device_id, subscription_id, commission_tier, commission_amount, plan_amount, vida_amount }
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function recordEarning(earningData) {
  try {
    const { data, error } = await supabase
      .from('sentinel_earnings')
      .insert(earningData)
      .select()
      .single();

    if (error) {
      console.error('Record earning error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Record earning exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Get pending earnings for a Sentinel
 * @param {string} sentinelWalletAddress - Sentinel's wallet address
 * @returns {Promise<{success: boolean, data?: any[], total?: number, error?: any}>}
 */
export async function getPendingEarnings(sentinelWalletAddress) {
  try {
    const { data, error } = await supabase
      .from('sentinel_earnings')
      .select('*')
      .eq('sentinel_wallet_address', sentinelWalletAddress)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get pending earnings error:', error);
      return { success: false, error };
    }

    const total = data?.reduce((sum, earning) => sum + Number(earning.vida_amount), 0) || 0;

    return { success: true, data: data || [], total };
  } catch (err) {
    console.error('Get pending earnings exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Mark earnings as claimed
 * @param {string[]} earningIds - Array of earning IDs to mark as claimed
 * @param {string} transactionHash - Blockchain transaction hash
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function markEarningsClaimed(earningIds, transactionHash) {
  try {
    const { data, error } = await supabase
      .from('sentinel_earnings')
      .update({
        status: 'claimed',
        transaction_hash: transactionHash,
        claimed_at: new Date().toISOString()
      })
      .in('id', earningIds)
      .select();

    if (error) {
      console.error('Mark earnings claimed error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Mark earnings claimed exception:', err);
    return { success: false, error: err };
  }
}

// ============================================
// ANALYTICS & STATS
// ============================================

/**
 * Get verification stats for a Sentinel
 * @param {string} sentinelWalletAddress - Sentinel's wallet address
 * @param {number} days - Number of days to fetch (default 30)
 * @returns {Promise<{success: boolean, data?: any[], error?: any}>}
 */
export async function getVerificationStats(sentinelWalletAddress, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('verification_stats')
      .select('*')
      .eq('sentinel_wallet_address', sentinelWalletAddress)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('Get verification stats error:', error);
      return { success: false, error };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Get verification stats exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Update daily verification stats
 * @param {string} sentinelWalletAddress - Sentinel's wallet address
 * @param {Object} stats - { total_verifications, successful_verifications, failed_verifications, total_earnings_usd, total_earnings_vida }
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function updateDailyStats(sentinelWalletAddress, stats) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('verification_stats')
      .upsert({
        sentinel_wallet_address: sentinelWalletAddress,
        date: today,
        ...stats,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'sentinel_wallet_address,date'
      })
      .select()
      .single();

    if (error) {
      console.error('Update daily stats error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Update daily stats exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Calculate projected monthly revenue
 * @param {string} sentinelWalletAddress - Sentinel's wallet address
 * @returns {Promise<{success: boolean, projected?: number, error?: any}>}
 */
export async function getProjectedMonthlyRevenue(sentinelWalletAddress) {
  try {
    // Get active subscriptions
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('plan_amount')
      .eq('sentinel_wallet_address', sentinelWalletAddress)
      .eq('status', 'active');

    if (error) {
      console.error('Get projected revenue error:', error);
      return { success: false, error };
    }

    // Calculate commission based on plan tiers
    const projected = subscriptions?.reduce((total, sub) => {
      let commission = 10; // Default tier1
      if (sub.plan_amount >= 200 && sub.plan_amount < 500) commission = 20; // tier2
      if (sub.plan_amount >= 500) commission = 30; // tier3
      return total + commission;
    }, 0) || 0;

    return { success: true, projected };
  } catch (err) {
    console.error('Get projected revenue exception:', err);
    return { success: false, error: err };
  }
}

// ============================================
// PAYMENT TRANSACTIONS
// ============================================

/**
 * Record payment transaction
 * @param {Object} transactionData - { subscription_id, from_address, to_address, amount_usd, amount_vida, transaction_hash, transaction_type }
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function recordTransaction(transactionData) {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert(transactionData)
      .select()
      .single();

    if (error) {
      console.error('Record transaction error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Record transaction exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Update transaction status
 * @param {string} transactionId - Transaction ID
 * @param {string} status - New status ('confirmed' or 'failed')
 * @param {Object} details - { block_number, gas_used, confirmed_at }
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function updateTransactionStatus(transactionId, status, details = {}) {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .update({
        status,
        ...details
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      console.error('Update transaction status error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Update transaction status exception:', err);
    return { success: false, error: err };
  }
}
