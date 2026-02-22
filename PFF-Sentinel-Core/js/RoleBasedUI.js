/**
 * PFF Sentinel — Role-Based UI
 * Show/hide UI elements based on user role (CITIZEN, SENTINEL, ARCHITECT)
 * 
 * CITIZEN: See only BPS/SSS tools, wallet balance, transaction history
 * SENTINEL/ARCHITECT: See earnings dashboard, subscription management, admin tools
 */

import { getCitizenWallet, isSentinel, ROLES } from './SovereignWalletTriad.js';

// ============================================
// ROLE-BASED UI INITIALIZATION
// ============================================

/**
 * Initialize role-based UI on page load
 * Shows/hides elements based on user role
 */
export async function initializeRoleBasedUI() {
  try {
    const wallet = getCitizenWallet();
    
    if (!wallet) {
      console.warn('⚠️ Citizen Wallet not initialized. Cannot apply role-based UI.');
      return;
    }

    const role = wallet.role;
    const isSentinelRole = await isSentinel();

    console.log(`🎭 Initializing UI for role: ${role}`);

    if (role === ROLES.CITIZEN && !isSentinelRole) {
      showCitizenTools();
      hideSentinelTools();
    } else if (role === ROLES.SENTINEL || role === ROLES.ARCHITECT || isSentinelRole) {
      showSentinelTools();
      showCitizenTools(); // Sentinels can also see citizen tools
    }

    console.log('✅ Role-based UI initialized');
  } catch (error) {
    console.error('❌ Role-based UI initialization failed:', error);
  }
}

// ============================================
// CITIZEN UI (BPS/SSS Tools)
// ============================================

/**
 * Show Citizen tools (BPS/SSS)
 */
export function showCitizenTools() {
  // Show BPS/SSS tools
  const citizenElements = document.querySelectorAll('[data-role="citizen"]');
  citizenElements.forEach(el => {
    el.style.display = '';
    el.classList.remove('hidden');
  });

  // Show wallet balance
  const walletBalance = document.getElementById('walletBalance');
  if (walletBalance) {
    walletBalance.style.display = '';
  }

  // Show transaction history
  const txHistory = document.getElementById('transactionHistory');
  if (txHistory) {
    txHistory.style.display = '';
  }

  console.log('👤 Citizen tools visible');
}

/**
 * Hide Citizen tools
 */
export function hideCitizenTools() {
  const citizenElements = document.querySelectorAll('[data-role="citizen"]');
  citizenElements.forEach(el => {
    el.style.display = 'none';
    el.classList.add('hidden');
  });

  console.log('👤 Citizen tools hidden');
}

// ============================================
// SENTINEL UI (Admin Tools)
// ============================================

/**
 * Show Sentinel tools (Admin Dashboard)
 */
export function showSentinelTools() {
  // Show Sentinel admin tools
  const sentinelElements = document.querySelectorAll('[data-role="sentinel"]');
  sentinelElements.forEach(el => {
    el.style.display = '';
    el.classList.remove('hidden');
  });

  // Show earnings dashboard
  const earningsDashboard = document.getElementById('earningsDashboard');
  if (earningsDashboard) {
    earningsDashboard.style.display = '';
  }

  // Show subscription management
  const subscriptionMgmt = document.getElementById('subscriptionManagement');
  if (subscriptionMgmt) {
    subscriptionMgmt.style.display = '';
  }

  // Show vitalize/lockSavings buttons
  const vitalizeBtn = document.getElementById('btnVitalize');
  if (vitalizeBtn) {
    vitalizeBtn.style.display = '';
  }

  const lockSavingsBtn = document.getElementById('btnLockSavings');
  if (lockSavingsBtn) {
    lockSavingsBtn.style.display = '';
  }

  console.log('🛡️ Sentinel tools visible');
}

/**
 * Hide Sentinel tools
 */
export function hideSentinelTools() {
  const sentinelElements = document.querySelectorAll('[data-role="sentinel"]');
  sentinelElements.forEach(el => {
    el.style.display = 'none';
    el.classList.add('hidden');
  });

  console.log('🛡️ Sentinel tools hidden');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if current page requires Sentinel role
 * @returns {boolean}
 */
export function isPageSentinelOnly() {
  const sentinelPages = ['earnings.html', 'plans.html', 'admin.html'];
  const currentPage = window.location.pathname.split('/').pop();
  return sentinelPages.includes(currentPage);
}

/**
 * Redirect to appropriate page based on role
 */
export async function redirectBasedOnRole() {
  const wallet = getCitizenWallet();
  
  if (!wallet) {
    return;
  }

  const isSentinelRole = await isSentinel();
  const isOnSentinelPage = isPageSentinelOnly();

  // If Citizen tries to access Sentinel page, redirect to index
  if (!isSentinelRole && isOnSentinelPage) {
    console.warn('⚠️ Unauthorized access. Redirecting to home...');
    window.location.href = 'index-four-pillar.html';
  }
}

