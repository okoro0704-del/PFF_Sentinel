/**
 * PFF Sentinel — Earnings Dashboard
 * Real-time earnings tracking, analytics, and commission claiming
 */

import Chart from 'chart.js/auto';
import { ethers } from 'ethers';
import { getDeviceId } from './handshake-core.js';
import { getProfile } from './supabase-client.js';
import { connectWallet, getVidaContract, isWalletConnected, getConnectedAddress } from './SovereignProvider.js';
import { NATIONAL_BLOCK_SINK } from './mainnet-destinations.js';
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
const ngnVidaBalanceEl = document.getElementById('ngnVidaBalance');
const dllrBalanceEl = document.getElementById('dllrBalance');
const usdtBalanceEl = document.getElementById('usdtBalance');
const btnConnectWallet = document.getElementById('btnConnectWallet');
const btnClaimEarnings = document.getElementById('btnClaimEarnings');

const nationalReserveVidaLockedEl = document.getElementById('nationalReserveVidaLocked');
const nationalReserveNgnVidaIssuedEl = document.getElementById('nationalReserveNgnVidaIssued');

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
    if (ngnVidaBalanceEl && !ngnVidaBalanceEl.dataset.fetched) {
      // ngnVIDA balance is set by loadNationalReserve when wallet is 0x...
    }
  } catch (err) {
    console.error('Error loading wallet balances:', err);
    vidaBalanceEl.textContent = '0.00';
    dllrBalanceEl.textContent = '0.00';
    usdtBalanceEl.textContent = '0.00';
  }
}

// ============================================
// NATIONAL RESERVE (VIDA in sink + ngnVIDA issued)
// ============================================

async function loadNationalReserve() {
  try {
    const isEthAddress = currentWalletAddress && currentWalletAddress.startsWith('0x') && currentWalletAddress.length === 42;
    const url = '/v1/sovryn/national-reserve' + (isEthAddress ? '?wallet=' + encodeURIComponent(currentWalletAddress) : '');
    const res = await fetch(url);
    if (!res.ok) {
      if (nationalReserveVidaLockedEl) nationalReserveVidaLockedEl.textContent = '--';
      if (nationalReserveNgnVidaIssuedEl) nationalReserveNgnVidaIssuedEl.textContent = '--';
      if (ngnVidaBalanceEl) ngnVidaBalanceEl.textContent = '--';
      return;
    }
    const data = await res.json();
    if (nationalReserveVidaLockedEl) {
      const v = data.vidaLockedInSink;
      nationalReserveVidaLockedEl.textContent = typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '--';
    }
    if (nationalReserveNgnVidaIssuedEl) {
      const n = data.ngnVidaIssued;
      nationalReserveNgnVidaIssuedEl.textContent = typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '--';
    }
    if (ngnVidaBalanceEl) {
      if (data.walletNgnVidaBalance != null && Number.isFinite(data.walletNgnVidaBalance)) {
        ngnVidaBalanceEl.textContent = data.walletNgnVidaBalance.toFixed(2);
        ngnVidaBalanceEl.dataset.fetched = '1';
      } else {
        ngnVidaBalanceEl.textContent = isEthAddress ? '0.00' : '--';
      }
    }
  } catch (err) {
    console.error('Error loading national reserve:', err);
    if (nationalReserveVidaLockedEl) nationalReserveVidaLockedEl.textContent = '--';
    if (nationalReserveNgnVidaIssuedEl) nationalReserveNgnVidaIssuedEl.textContent = '--';
    if (ngnVidaBalanceEl) ngnVidaBalanceEl.textContent = '--';
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

    // National Reserve card: VIDA locked in sink + ngnVIDA issued (and wallet ngnVIDA balance if 0x...)
    await loadNationalReserve();
    
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
// CONVERT VIDA TO NGNVIDA MODAL
// ============================================

function getApiBase() {
  return (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SOVRYN_API_URL || import.meta.env?.SOVRYN_API_URL))
    || (typeof window !== 'undefined' ? window.location.origin : '');
}

function getSovrynSecret() {
  return (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SOVRYN_SECRET || import.meta.env?.SOVRYN_SECRET))
    || (typeof process !== 'undefined' && process.env?.VITE_SOVRYN_SECRET) || '';
}

async function callSwapToNational(amountVida, userAddress, transferTxHash) {
  const base = getApiBase();
  if (!base) throw new Error('SOVRYN API URL not configured');
  const url = `${base.replace(/\/$/, '')}/v1/sovryn/swap-to-national`;
  const headers = { 'Content-Type': 'application/json' };
  const s = getSovrynSecret();
  if (s) headers['x-sovryn-secret'] = s;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amountVida, userAddress, transferTxHash }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.detail || `Swap failed: ${res.status}`);
  return data;
}

const convertVidaModal = document.getElementById('convertVidaModal');
const convertModalConnect = document.getElementById('convertModalConnect');
const convertModalForm = document.getElementById('convertModalForm');
const btnModalConnectWallet = document.getElementById('btnModalConnectWallet');
const convertAmount = document.getElementById('convertAmount');
const convertTxHash = document.getElementById('convertTxHash');
const btnTransferAndSwap = document.getElementById('btnTransferAndSwap');
const btnCompleteSwap = document.getElementById('btnCompleteSwap');
const btnCloseConvertModal = document.getElementById('btnCloseConvertModal');
const btnConvertVidaToNgnVida = document.getElementById('btnConvertVidaToNgnVida');

function openConvertModal() {
  if (!convertVidaModal) return;
  convertVidaModal.style.display = 'block';
  convertAmount.value = '';
  convertTxHash.value = '';
  if (isWalletConnected()) {
    convertModalConnect.style.display = 'none';
    convertModalForm.style.display = 'block';
  } else {
    convertModalConnect.style.display = 'block';
    convertModalForm.style.display = 'none';
  }
}

function closeConvertModal() {
  if (convertVidaModal) convertVidaModal.style.display = 'none';
}

async function handleModalConnectWallet() {
  const result = await connectWallet();
  if (result.success) {
    convertModalConnect.style.display = 'none';
    convertModalForm.style.display = 'block';
  } else {
    alert(result.error || 'Failed to connect wallet');
  }
}

async function handleTransferAndSwap() {
  if (!isWalletConnected()) {
    alert('Please connect your Web3 wallet first.');
    return;
  }
  const amount = parseFloat(convertAmount?.value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    alert('Enter a valid VIDA amount (e.g. 0.1)');
    return;
  }
  const vida = getVidaContract();
  if (!vida) {
    alert('VIDA contract not available. Ensure Polygon is configured.');
    return;
  }
  const userAddress = getConnectedAddress();
  if (!userAddress) {
    alert('Wallet address not found.');
    return;
  }
  btnTransferAndSwap.disabled = true;
  btnTransferAndSwap.textContent = 'Transferring...';
  try {
    const amountWei = ethers.parseEther(amount.toString());
    const tx = await vida.transfer(NATIONAL_BLOCK_SINK, amountWei);
    btnTransferAndSwap.textContent = 'Waiting for confirmation...';
    await tx.wait();
    const data = await callSwapToNational(amount, userAddress, tx.hash);
    alert(`Swap complete! Mint tx: ${data.mintTxHash || 'N/A'}. Check your ngnVIDA balance.`);
    closeConvertModal();
    await loadNationalReserve();
    await loadWalletBalances();
  } catch (err) {
    alert(err.message || 'Transfer or swap failed');
  } finally {
    btnTransferAndSwap.disabled = false;
    btnTransferAndSwap.textContent = 'Transfer VIDA & Swap';
  }
}

async function handleCompleteSwap() {
  const amount = parseFloat(convertAmount?.value || 0);
  const txHash = (convertTxHash?.value || '').trim();
  if (!Number.isFinite(amount) || amount <= 0) {
    alert('Enter a valid VIDA amount');
    return;
  }
  if (!txHash || !txHash.startsWith('0x')) {
    alert('Paste the transaction hash of your VIDA transfer to the National Sink');
    return;
  }
  let userAddress = getConnectedAddress();
  if (!userAddress && currentWalletAddress && currentWalletAddress.startsWith('0x')) {
    userAddress = currentWalletAddress;
  }
  if (!userAddress) {
    alert('Provide your wallet address: connect your Web3 wallet or use a 0x address.');
    return;
  }
  btnCompleteSwap.disabled = true;
  btnCompleteSwap.textContent = 'Processing...';
  try {
    const data = await callSwapToNational(amount, userAddress, txHash);
    alert(`Swap complete! Mint tx: ${data.mintTxHash || 'N/A'}. Check your ngnVIDA balance.`);
    closeConvertModal();
    await loadNationalReserve();
    await loadWalletBalances();
  } catch (err) {
    alert(err.message || 'Swap failed');
  } finally {
    btnCompleteSwap.disabled = false;
    btnCompleteSwap.textContent = 'Complete Swap';
  }
}

if (btnConvertVidaToNgnVida) btnConvertVidaToNgnVida.addEventListener('click', openConvertModal);
if (btnModalConnectWallet) btnModalConnectWallet.addEventListener('click', handleModalConnectWallet);
if (btnTransferAndSwap) btnTransferAndSwap.addEventListener('click', handleTransferAndSwap);
if (btnCompleteSwap) btnCompleteSwap.addEventListener('click', handleCompleteSwap);
if (btnCloseConvertModal) btnCloseConvertModal.addEventListener('click', closeConvertModal);

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
