/**
 * PFF Sentinel — Earnings Dashboard
 * Real-time earnings tracking, analytics, and commission claiming
 */

import Chart from 'chart.js/auto';
import { getDeviceId } from './handshake-core.js';
import { getProfile } from './supabase-client.js';
import {
  getSentinelSubscriptions,
  getSubscriptionCounts,
  getPendingEarnings,
  markEarningsClaimed,
  getVerificationStats,
  getProjectedMonthlyRevenue
} from './treasury-client.js';

// DOM Elements
const walletAddressEl = document.getElementById('walletAddress');
const vidaBalanceEl = document.getElementById('vidaBalance');
const dllrBalanceEl = document.getElementById('dllrBalance');
const usdtBalanceEl = document.getElementById('usdtBalance');
const btnConnectWallet = document.getElementById('btnConnectWallet');
const btnClaimEarnings = document.getElementById('btnClaimEarnings');

const totalRegistrationsEl = document.getElementById('totalRegistrations');
const activeSubscriptionsEl = document.getElementById('activeSubscriptions');
const pendingEarningsEl = document.getElementById('pendingEarnings');
const projectedMonthlyEl = document.getElementById('projectedMonthly');

const earningsTableBody = document.getElementById('earningsTableBody');

const basicCountEl = document.getElementById('basicCount');
const standardCountEl = document.getElementById('standardCount');
const premiumCountEl = document.getElementById('premiumCount');
const eliteCountEl = document.getElementById('eliteCount');
const basicRevenueEl = document.getElementById('basicRevenue');
const standardRevenueEl = document.getElementById('standardRevenue');
const premiumRevenueEl = document.getElementById('premiumRevenue');
const eliteRevenueEl = document.getElementById('eliteRevenue');

let verificationsChart = null;
let revenueChart = null;
let currentWalletAddress = null;
let pendingEarningsData = [];

// ============================================
// INTERNAL WALLET INITIALIZATION
// ============================================

async function initializeDashboard() {
  try {
    // Get device ID (PFF internal wallet identifier)
    const deviceId = await getDeviceId();

    if (!deviceId) {
      walletAddressEl.textContent = 'Error: Device ID not found';
      return;
    }

    // Get profile from database
    const profile = await getProfile(deviceId);

    if (!profile) {
      walletAddressEl.textContent = 'Error: Profile not found';
      return;
    }

    // Use internal wallet address
    currentWalletAddress = profile.wallet_address || `pff-wallet-${deviceId}`;
    walletAddressEl.textContent = `Wallet: ${currentWalletAddress}`;

    // Load dashboard data
    await loadDashboardData();
  } catch (err) {
    console.error('Dashboard initialization error:', err);
    walletAddressEl.textContent = 'Error loading dashboard';
  }
}

// ============================================
// WALLET BALANCES (From Supabase)
// ============================================

async function loadWalletBalances() {
  try {
    if (!currentWalletAddress) return;

    // Get device ID from wallet address
    const deviceId = await getDeviceId();
    const profile = await getProfile(deviceId);

    if (profile) {
      // Display VIDA balances from database
      const spendable = parseFloat(profile.vida_balance_spendable || 0);
      const locked = parseFloat(profile.vida_balance_locked || 0);
      const total = spendable + locked;

      vidaBalanceEl.textContent = total.toFixed(2);
      dllrBalanceEl.textContent = '0.00'; // Placeholder until DLLR integration
      usdtBalanceEl.textContent = '0.00'; // Placeholder until USDT integration
    } else {
      vidaBalanceEl.textContent = '0.00';
      dllrBalanceEl.textContent = '0.00';
      usdtBalanceEl.textContent = '0.00';
    }
  } catch (err) {
    console.error('Error loading wallet balances:', err);
    vidaBalanceEl.textContent = '0.00';
    dllrBalanceEl.textContent = '0.00';
    usdtBalanceEl.textContent = '0.00';
  }
}

// ============================================
// DASHBOARD DATA
// ============================================

async function loadDashboardData() {
  try {
    if (!currentWalletAddress) return;

    // Load subscription counts
    const countsResult = await getSubscriptionCounts(currentWalletAddress);
    if (countsResult.success) {
      const counts = countsResult.data;
      
      totalRegistrationsEl.textContent = counts.total;
      activeSubscriptionsEl.textContent = counts.total;
      
      // Update subscription breakdown
      basicCountEl.textContent = counts.basic || 0;
      standardCountEl.textContent = counts.standard || 0;
      premiumCountEl.textContent = counts.premium || 0;
      eliteCountEl.textContent = counts.elite || 0;
      
      basicRevenueEl.textContent = `$${(counts.basic || 0) * 10}`;
      standardRevenueEl.textContent = `$${(counts.standard || 0) * 20}`;
      premiumRevenueEl.textContent = `$${(counts.premium || 0) * 30}`;
      eliteRevenueEl.textContent = `$${(counts.elite || 0) * 30}`;
    }

    // Load pending earnings
    const earningsResult = await getPendingEarnings(currentWalletAddress);
    if (earningsResult.success) {
      pendingEarningsData = earningsResult.data;
      pendingEarningsEl.textContent = `$${earningsResult.total.toFixed(2)}`;
      
      // Update earnings table
      updateEarningsTable(earningsResult.data);
      
      // Enable claim button if there are pending earnings
      btnClaimEarnings.disabled = earningsResult.data.length === 0;
    }

    // Load projected monthly revenue
    const projectedResult = await getProjectedMonthlyRevenue(currentWalletAddress);
    if (projectedResult.success) {
      projectedMonthlyEl.textContent = `$${projectedResult.projected}`;
    }

    // Load verification stats and update charts
    await loadVerificationStats();
    
    // Load wallet balances
    await loadWalletBalances();
  } catch (err) {
    console.error('Error loading dashboard data:', err);
  }
}

// ============================================
// EARNINGS TABLE
// ============================================

function updateEarningsTable(earnings) {
  if (!earnings || earnings.length === 0) {
    earningsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No pending earnings</td></tr>';
    return;
  }

  earningsTableBody.innerHTML = earnings.map(earning => `
    <tr>
      <td>${new Date(earning.created_at).toLocaleDateString()}</td>
      <td>${earning.citizen_device_id.substring(0, 12)}...</td>
      <td>${earning.commission_tier.toUpperCase()}</td>
      <td>$${earning.commission_amount}</td>
      <td>${earning.vida_amount} VIDA</td>
      <td><span class="status-badge status-${earning.status}">${earning.status}</span></td>
    </tr>
  `).join('');
}

// ============================================
// CLAIM EARNINGS
// ============================================

async function handleClaimEarnings() {
  try {
    if (pendingEarningsData.length === 0) {
      alert('No pending earnings to claim');
      return;
    }

    btnClaimEarnings.textContent = 'Processing...';
    btnClaimEarnings.disabled = true;

    // Calculate total VIDA to transfer
    const totalVida = pendingEarningsData.reduce((sum, e) => sum + Number(e.vida_amount), 0);

    // TODO: Implement actual VIDA transfer from contract
    // For now, simulate transaction
    const txHash = '0x' + Math.random().toString(16).substring(2, 66);

    console.log(`Claiming ${totalVida} VIDA for ${pendingEarningsData.length} earnings`);

    // Mark earnings as claimed
    const earningIds = pendingEarningsData.map(e => e.id);
    const result = await markEarningsClaimed(earningIds, txHash);

    if (result.success) {
      alert(`Successfully claimed ${totalVida} VIDA!\nTransaction: ${txHash}`);

      // Reload dashboard
      await loadDashboardData();
    } else {
      alert(`Failed to claim earnings: ${result.error}`);
    }

    btnClaimEarnings.textContent = 'Claim Earnings';
  } catch (err) {
    console.error('Claim earnings error:', err);
    alert('Failed to claim earnings');
    btnClaimEarnings.textContent = 'Claim Earnings';
    btnClaimEarnings.disabled = false;
  }
}

// ============================================
// CHARTS
// ============================================

async function loadVerificationStats() {
  try {
    if (!currentWalletAddress) return;

    const statsResult = await getVerificationStats(currentWalletAddress, 30);

    if (statsResult.success && statsResult.data.length > 0) {
      const stats = statsResult.data;

      // Prepare data for charts
      const dates = stats.map(s => new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      const verifications = stats.map(s => s.total_verifications || 0);
      const earnings = stats.map(s => s.total_earnings_usd || 0);

      // Update verifications chart
      updateVerificationsChart(dates, verifications);

      // Update revenue chart
      updateRevenueChart(dates, earnings);
    } else {
      // No data yet, show sample data
      const sampleDates = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      const sampleData = Array(30).fill(0);

      updateVerificationsChart(sampleDates, sampleData);
      updateRevenueChart(sampleDates, sampleData);
    }
  } catch (err) {
    console.error('Error loading verification stats:', err);
  }
}

function updateVerificationsChart(labels, data) {
  const ctx = document.getElementById('verificationsChart');

  if (verificationsChart) {
    verificationsChart.destroy();
  }

  verificationsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Daily Verifications',
        data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            color: 'rgba(59, 130, 246, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            color: 'rgba(59, 130, 246, 0.1)'
          }
        }
      }
    }
  });
}

function updateRevenueChart(labels, data) {
  const ctx = document.getElementById('revenueChart');

  if (revenueChart) {
    revenueChart.destroy();
  }

  revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Daily Revenue ($)',
        data,
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
        borderColor: '#8b5cf6',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#94a3b8',
            callback: function(value) {
              return '$' + value;
            }
          },
          grid: {
            color: 'rgba(59, 130, 246, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            color: 'rgba(59, 130, 246, 0.1)'
          }
        }
      }
    }
  });
}

// ============================================
// EVENT LISTENERS
// ============================================

btnClaimEarnings.addEventListener('click', handleClaimEarnings);

// ============================================
// INITIALIZATION
// ============================================

(async function init() {
  console.log('💰 Sentinel Earnings Dashboard initialized');

  // Hide connect wallet button (using internal PFF wallets)
  if (btnConnectWallet) {
    btnConnectWallet.style.display = 'none';
  }

  // Auto-initialize with internal wallet
  await initializeDashboard();
})();
