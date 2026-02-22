/**
 * PFF Sentinel — Guardian Dashboard App
 * Main application for Guardian tab with My Fleet and QR Handshake
 */

import { initializeCitizenWallet } from './SovereignWalletTriad.js';
import { initializeMyFleetUI } from './MyFleetUI.js';
import { initializeQRHandshakeUI } from './QRHandshakeUI.js';
import { startRemoteCommandListener, sendDeviceHeartbeat } from './SatelliteDeviceRegistry.js';

// ============================================
// TAB MANAGEMENT
// ============================================

/**
 * Initialize tab switching
 */
function initializeTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const targetContent = document.getElementById(`${targetTab}Tab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

// ============================================
// REMOTE COMMAND HANDLER
// ============================================

/**
 * Handle incoming remote commands
 * @param {Object} command - Command object
 */
function handleRemoteCommand(command) {
  console.log('📡 Remote command received:', command);

  // Show notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #8b5cf6, #ec4899);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.4);
    z-index: 10000;
    font-weight: bold;
  `;
  notification.textContent = `🔔 Remote command: ${command.command_type}`;
  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// ============================================
// HEARTBEAT SENDER
// ============================================

/**
 * Start sending heartbeats
 */
function startHeartbeat() {
  // Send initial heartbeat
  sendDeviceHeartbeat();

  // Send heartbeat every 60 seconds
  setInterval(() => {
    sendDeviceHeartbeat();
  }, 60000);
}

// ============================================
// INITIALIZATION
// ============================================

async function initializeApp() {
  try {
    console.log('🛡️ Initializing Guardian Dashboard...');

    // Initialize Citizen Wallet
    const result = await initializeCitizenWallet();

    if (!result.success) {
      console.error('❌ Wallet initialization failed:', result.error);
      alert('Failed to initialize wallet: ' + result.error);
      return;
    }

    // Initialize tabs
    initializeTabs();

    // Initialize My Fleet UI
    await initializeMyFleetUI('myFleetContainer');

    // Initialize QR Handshake UI
    await initializeQRHandshakeUI('qrHandshakeContainer');

    // Start remote command listener
    startRemoteCommandListener(handleRemoteCommand);

    // Start heartbeat
    startHeartbeat();

    console.log('✅ Guardian Dashboard initialized');
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    alert('Failed to initialize Guardian Dashboard: ' + error.message);
  }
}

// ============================================
// AUTO-INITIALIZATION
// ============================================

(async function init() {
  await initializeApp();
})();

