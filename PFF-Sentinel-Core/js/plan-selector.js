/**
 * PFF Sentinel — Plan Selector
 * Subscription tier selection and upgrade flow
 */

import { initializeCitizenWallet, getCitizenWallet } from './SovereignWalletTriad.js';
import { upsertSubscription, getSentinelSubscriptions } from './treasury-client.js';

// DOM Elements
const walletInfo = document.getElementById('walletInfo');
const planCards = document.querySelectorAll('.plan-card');
const selectButtons = document.querySelectorAll('.btn-select[data-tier]');

let currentWalletAddress = null;
let currentDeviceId = null;
let currentSubscription = null;

// ============================================
// SOVEREIGN WALLET INITIALIZATION
// ============================================

async function initializePage() {
  try {
    // Initialize Citizen Wallet (Sovereign Multi-Wallet Architecture)
    const result = await initializeCitizenWallet();

    if (!result.success) {
      walletInfo.innerHTML = `<p style="color: red;">Error: ${result.error}</p>`;
      return;
    }

    const wallet = getCitizenWallet();
    currentWalletAddress = wallet.address;
    currentDeviceId = wallet.deviceId;

    // Update wallet info
    walletInfo.innerHTML = `
      <p>Sovereign Wallet</p>
      <p class="address">${currentWalletAddress}</p>
      <p style="font-size: 0.875rem; margin-top: 8px;">Device: ${currentDeviceId.substring(0, 16)}...</p>
    `;

    // Load current subscription
    await loadCurrentSubscription();

  } catch (err) {
    console.error('Initialization error:', err);
  }
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

async function loadCurrentSubscription() {
  try {
    const result = await getSentinelSubscriptions(currentWalletAddress);
    
    if (result.success && result.data.length > 0) {
      // Get the most recent active subscription
      currentSubscription = result.data[0];
      
      // Update UI to show current plan
      selectButtons.forEach(btn => {
        const tier = btn.getAttribute('data-tier');
        
        if (tier === currentSubscription.plan_tier) {
          btn.textContent = 'Current Plan';
          btn.disabled = true;
          btn.style.background = '#22c55e';
          
          // Add current plan badge
          const card = btn.closest('.plan-card');
          if (!card.querySelector('.current-plan-badge')) {
            const badge = document.createElement('div');
            badge.className = 'current-plan-badge';
            badge.textContent = '✓ Active';
            btn.parentNode.insertBefore(badge, btn);
          }
        } else {
          btn.textContent = `Upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)}`;
        }
      });
    }
  } catch (err) {
    console.error('Error loading subscription:', err);
  }
}

async function handlePlanSelection(tier, amount) {
  try {
    if (!currentWalletAddress) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (!currentDeviceId) {
      alert('Device ID not found. Please refresh the page.');
      return;
    }
    
    // Confirm selection
    const confirmMsg = currentSubscription 
      ? `Upgrade to ${tier.toUpperCase()} plan for $${amount}/month?`
      : `Subscribe to ${tier.toUpperCase()} plan for $${amount}/month?`;
    
    if (!confirm(confirmMsg)) {
      return;
    }
    
    // Disable all buttons
    selectButtons.forEach(btn => btn.disabled = true);
    
    // Update button text
    const clickedButton = event.target;
    clickedButton.textContent = 'Processing...';
    
    // Create subscription data
    const subscriptionData = {
      citizen_device_id: currentDeviceId,
      sentinel_wallet_address: currentWalletAddress,
      plan_tier: tier,
      plan_amount: amount,
      status: 'active',
      auto_debit_enabled: true,
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    };
    
    // Save to database
    const result = await upsertSubscription(subscriptionData);
    
    if (result.success) {
      alert(`Successfully subscribed to ${tier.toUpperCase()} plan!`);
      
      // Reload page to show updated subscription
      await loadCurrentSubscription();
      
      // Re-enable buttons
      selectButtons.forEach(btn => btn.disabled = false);
    } else {
      alert(`Subscription failed: ${result.error.message || 'Unknown error'}`);
      
      // Re-enable buttons
      selectButtons.forEach(btn => {
        btn.disabled = false;
        btn.textContent = `Select ${btn.getAttribute('data-tier')}`;
      });
    }
    
  } catch (err) {
    console.error('Plan selection error:', err);
    alert('Failed to process subscription');
    
    // Re-enable buttons
    selectButtons.forEach(btn => {
      btn.disabled = false;
      btn.textContent = `Select ${btn.getAttribute('data-tier')}`;
    });
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

btnConnectWallet.addEventListener('click', handleConnectWallet);

selectButtons.forEach(btn => {
  btn.addEventListener('click', (event) => {
    const tier = btn.getAttribute('data-tier');
    const card = btn.closest('.plan-card');
    const amount = parseInt(card.getAttribute('data-amount'));
    handlePlanSelection(tier, amount);
  });
});

// ============================================
// AUTO-INITIALIZATION
// ============================================

(async function init() {
  console.log('💎 Plan Selector initialized');

  // Auto-initialize with Sovereign Wallet
  await initializePage();
})();

