/**
 * PFF Sentinel — My Fleet UI
 * Device Management Dashboard Component
 * Shows status (Online/Secured/Threat Detected) for all linked devices
 */

import {
  getSatelliteDevices,
  getFleetStatus,
  sendForceLockCommand,
  sendUnlockCommand,
  sendLocateCommand,
  removeSatelliteDevice
} from './SatelliteDeviceRegistry.js';

// ============================================
// MY FLEET UI
// ============================================

/**
 * Initialize My Fleet UI
 * @param {string} containerId - Container element ID
 */
export async function initializeMyFleetUI(containerId = 'myFleetContainer') {
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.warn('⚠️ My Fleet container not found');
    return;
  }

  await renderFleetDashboard(container);
  
  // Auto-refresh every 30 seconds
  setInterval(() => renderFleetDashboard(container), 30000);
}

/**
 * Render fleet dashboard
 * @param {HTMLElement} container - Container element
 */
async function renderFleetDashboard(container) {
  try {
    const [devices, fleetStatus] = await Promise.all([
      getSatelliteDevices(),
      getFleetStatus()
    ]);

    container.innerHTML = `
      <div class="fleet-dashboard">
        <!-- Fleet Status Summary -->
        <div class="fleet-status-summary">
          <h2 style="margin: 0 0 16px 0; font-size: 24px;">
            🛡️ My Fleet
            <span style="font-size: 14px; opacity: 0.7; font-weight: normal;">
              (${fleetStatus.total_devices} devices)
            </span>
          </h2>
          
          <div class="status-grid">
            <div class="status-card status-online">
              <div class="status-icon">🟢</div>
              <div class="status-label">Online</div>
              <div class="status-count">${fleetStatus.online_devices}</div>
            </div>
            
            <div class="status-card status-secured">
              <div class="status-icon">🔒</div>
              <div class="status-label">Secured</div>
              <div class="status-count">${fleetStatus.secured_devices}</div>
            </div>
            
            <div class="status-card status-threat">
              <div class="status-icon">⚠️</div>
              <div class="status-label">Threat Detected</div>
              <div class="status-count">${fleetStatus.threat_detected_devices}</div>
            </div>
            
            <div class="status-card status-offline">
              <div class="status-icon">⚫</div>
              <div class="status-label">Offline</div>
              <div class="status-count">${fleetStatus.offline_devices}</div>
            </div>
            
            <div class="status-card status-locked">
              <div class="status-icon">🔐</div>
              <div class="status-label">Locked</div>
              <div class="status-count">${fleetStatus.locked_devices}</div>
            </div>
          </div>
        </div>

        <!-- Device List -->
        <div class="device-list">
          <h3 style="margin: 24px 0 16px 0; font-size: 18px;">Satellite Devices</h3>
          
          ${devices.length === 0 ? `
            <div class="empty-state">
              <p style="opacity: 0.7; margin: 0;">No satellite devices linked yet.</p>
              <p style="opacity: 0.5; margin: 8px 0 0 0; font-size: 14px;">
                Use QR Handshake to link a new device.
              </p>
            </div>
          ` : devices.map(device => renderDeviceCard(device)).join('')}
        </div>
      </div>
    `;

    // Add event listeners
    devices.forEach(device => {
      attachDeviceEventListeners(device.device_id);
    });

  } catch (error) {
    console.error('❌ Failed to render fleet dashboard:', error);
    container.innerHTML = `<p style="color: red;">Error loading fleet: ${error.message}</p>`;
  }
}

/**
 * Render individual device card
 * @param {Object} device - Device object
 * @returns {string} HTML string
 */
function renderDeviceCard(device) {
  const statusColors = {
    online: '#10b981',
    secured: '#3b82f6',
    threat_detected: '#ef4444',
    offline: '#6b7280',
    locked: '#f59e0b'
  };

  const statusIcons = {
    online: '🟢',
    secured: '🔒',
    threat_detected: '⚠️',
    offline: '⚫',
    locked: '🔐'
  };

  const lastSeen = device.last_seen_at 
    ? new Date(device.last_seen_at).toLocaleString()
    : 'Never';

  return `
    <div class="device-card" data-device-id="${device.device_id}">
      <div class="device-header">
        <div class="device-info">
          <div class="device-icon">${getDeviceIcon(device.device_type)}</div>
          <div>
            <h4 class="device-name">${device.device_name}</h4>
            <p class="device-model">${device.device_model} • ${device.device_os}</p>
          </div>
        </div>
        <div class="device-status" style="background: ${statusColors[device.status]}20; color: ${statusColors[device.status]}; border: 1px solid ${statusColors[device.status]};">
          ${statusIcons[device.status]} ${device.status.replace('_', ' ').toUpperCase()}
        </div>
      </div>
      
      <div class="device-details">
        <div class="detail-item">
          <span class="detail-label">Last Seen</span>
          <span class="detail-value">${lastSeen}</span>
        </div>
        ${device.gps_lat && device.gps_lng ? `
          <div class="detail-item">
            <span class="detail-label">Location</span>
            <span class="detail-value">📍 ${device.gps_lat.toFixed(4)}, ${device.gps_lng.toFixed(4)}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="device-actions">
        ${device.is_locked ? `
          <button class="btn btn-success btn-unlock" data-device-id="${device.device_id}">
            🔓 Unlock
          </button>
        ` : `
          <button class="btn btn-danger btn-lock" data-device-id="${device.device_id}">
            🔒 Force Lock
          </button>
        `}
        <button class="btn btn-secondary btn-locate" data-device-id="${device.device_id}">
          📍 Locate
        </button>
        <button class="btn btn-secondary btn-remove" data-device-id="${device.device_id}">
          🗑️ Remove
        </button>
      </div>
    </div>
  `;
}

/**
 * Get device icon based on type
 * @param {string} type - Device type
 * @returns {string} Icon emoji
 */
function getDeviceIcon(type) {
  const icons = {
    mobile: '📱',
    desktop: '💻',
    tablet: '📲',
    watch: '⌚',
    other: '📟'
  };
  return icons[type] || icons.other;
}

/**
 * Attach event listeners to device card buttons
 * @param {string} deviceId - Device identifier
 */
function attachDeviceEventListeners(deviceId) {
  // Force Lock button
  const btnLock = document.querySelector(`.btn-lock[data-device-id="${deviceId}"]`);
  if (btnLock) {
    btnLock.addEventListener('click', () => handleForceLock(deviceId));
  }

  // Unlock button
  const btnUnlock = document.querySelector(`.btn-unlock[data-device-id="${deviceId}"]`);
  if (btnUnlock) {
    btnUnlock.addEventListener('click', () => handleUnlock(deviceId));
  }

  // Locate button
  const btnLocate = document.querySelector(`.btn-locate[data-device-id="${deviceId}"]`);
  if (btnLocate) {
    btnLocate.addEventListener('click', () => handleLocate(deviceId));
  }

  // Remove button
  const btnRemove = document.querySelector(`.btn-remove[data-device-id="${deviceId}"]`);
  if (btnRemove) {
    btnRemove.addEventListener('click', () => handleRemove(deviceId));
  }
}

/**
 * Handle Force Lock button click
 * @param {string} deviceId - Device identifier
 */
async function handleForceLock(deviceId) {
  const confirmed = confirm(
    '🔒 FORCE LOCK DEVICE\n\n' +
    'This will immediately lock the satellite device remotely.\n\n' +
    'The device will require biometric authentication to unlock.\n\n' +
    'Continue?'
  );

  if (!confirmed) return;

  const btn = document.querySelector(`.btn-lock[data-device-id="${deviceId}"]`);
  if (btn) {
    btn.textContent = '🔄 Locking...';
    btn.disabled = true;
  }

  const result = await sendForceLockCommand(deviceId, 'Manual lock by owner via My Fleet');

  if (result.success) {
    alert('✅ Force Lock command sent successfully!');
    // Refresh UI
    const container = document.getElementById('myFleetContainer');
    if (container) {
      await renderFleetDashboard(container);
    }
  } else {
    alert('❌ Failed to send Force Lock command: ' + result.message);
    if (btn) {
      btn.textContent = '🔒 Force Lock';
      btn.disabled = false;
    }
  }
}

/**
 * Handle Unlock button click
 * @param {string} deviceId - Device identifier
 */
async function handleUnlock(deviceId) {
  const btn = document.querySelector(`.btn-unlock[data-device-id="${deviceId}"]`);
  if (btn) {
    btn.textContent = '🔄 Unlocking...';
    btn.disabled = true;
  }

  const result = await sendUnlockCommand(deviceId);

  if (result.success) {
    alert('✅ Unlock command sent successfully!');
    // Refresh UI
    const container = document.getElementById('myFleetContainer');
    if (container) {
      await renderFleetDashboard(container);
    }
  } else {
    alert('❌ Failed to send Unlock command: ' + result.message);
    if (btn) {
      btn.textContent = '🔓 Unlock';
      btn.disabled = false;
    }
  }
}

/**
 * Handle Locate button click
 * @param {string} deviceId - Device identifier
 */
async function handleLocate(deviceId) {
  const btn = document.querySelector(`.btn-locate[data-device-id="${deviceId}"]`);
  if (btn) {
    btn.textContent = '🔄 Locating...';
    btn.disabled = true;
  }

  const result = await sendLocateCommand(deviceId);

  if (result.success) {
    alert('✅ Locate command sent! Device will update its location.');
    // Refresh UI after 2 seconds to show updated location
    setTimeout(async () => {
      const container = document.getElementById('myFleetContainer');
      if (container) {
        await renderFleetDashboard(container);
      }
    }, 2000);
  } else {
    alert('❌ Failed to send Locate command: ' + result.message);
  }

  if (btn) {
    btn.textContent = '📍 Locate';
    btn.disabled = false;
  }
}

/**
 * Handle Remove button click
 * @param {string} deviceId - Device identifier
 */
async function handleRemove(deviceId) {
  const confirmed = confirm(
    '🗑️ REMOVE DEVICE\n\n' +
    'This will remove the satellite device from your fleet.\n\n' +
    'The device will no longer be managed remotely.\n\n' +
    'Continue?'
  );

  if (!confirmed) return;

  const btn = document.querySelector(`.btn-remove[data-device-id="${deviceId}"]`);
  if (btn) {
    btn.textContent = '🔄 Removing...';
    btn.disabled = true;
  }

  const result = await removeSatelliteDevice(deviceId);

  if (result.success) {
    alert('✅ Device removed from fleet!');
    // Refresh UI
    const container = document.getElementById('myFleetContainer');
    if (container) {
      await renderFleetDashboard(container);
    }
  } else {
    alert('❌ Failed to remove device: ' + result.message);
    if (btn) {
      btn.textContent = '🗑️ Remove';
      btn.disabled = false;
    }
  }
}

