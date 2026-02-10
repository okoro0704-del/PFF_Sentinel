/**
 * PFF Sentinel — Shadow UI (Decoy when Duress)
 * Fake balances, limited functionality; Money-Out silently disabled.
 */

import { isShadowMode, setShadowMode } from './shadow-state.js';

let shadowEl = null;

const FAKE_BALANCE = '2,847.00';
const FAKE_ACTIVITY = [
  { desc: 'Deposit', amount: '+500.00', time: 'Today 10:32' },
  { desc: 'Transfer to Savings', amount: '-200.00', time: 'Yesterday' },
  { desc: 'Deposit', amount: '+1,200.00', time: 'Jan 28' },
];

/**
 * Show Shadow UI (decoy). Real Money-Out is disabled via canPerformMoneyOut().
 */
export function showShadowUI() {
  if (shadowEl && shadowEl.isConnected) return;
  shadowEl = document.createElement('div');
  shadowEl.id = 'pff-shadow-ui';
  shadowEl.className = 'shadow-ui';
  shadowEl.innerHTML = `
    <div class="shadow-ui-header">
      <h2>Account</h2>
      <span class="shadow-ui-badge">Limited view</span>
    </div>
    <div class="shadow-ui-balance">
      <span class="shadow-ui-label">Available balance</span>
      <span class="shadow-ui-amount">$${FAKE_BALANCE}</span>
    </div>
    <div class="shadow-ui-activity">
      <h3>Recent activity</h3>
      <ul class="shadow-ui-list">
        ${FAKE_ACTIVITY.map((a) => `<li><span>${a.desc}</span><span>${a.amount}</span><span class="shadow-ui-time">${a.time}</span></li>`).join('')}
      </ul>
    </div>
    <div class="shadow-ui-actions">
      <button type="button" class="btn btn-secondary" id="shadowBtnSend">Send money</button>
      <button type="button" class="btn btn-secondary" id="shadowBtnExit">Exit limited view</button>
    </div>
    <p class="shadow-ui-note">Some features are temporarily limited.</p>
  `;
  document.body.appendChild(shadowEl);

  shadowEl.querySelector('#shadowBtnSend').addEventListener('click', () => {
    alert('Transfer is not available right now. Please try again later.');
  });
  shadowEl.querySelector('#shadowBtnExit').addEventListener('click', () => {
    setShadowMode(false);
    hideShadowUI();
  });
}

/**
 * Hide Shadow UI.
 */
export function hideShadowUI() {
  if (shadowEl && shadowEl.parentNode) {
    shadowEl.parentNode.removeChild(shadowEl);
    shadowEl = null;
  }
}

/**
 * If shadow mode is active (e.g. after reload), show Shadow UI.
 */
export function applyShadowStateIfActive() {
  if (isShadowMode()) showShadowUI();
}
