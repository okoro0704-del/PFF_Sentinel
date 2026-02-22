/**
 * PFF Sentinel — Satellite Device Registry
 * Multi-device management with QR handshake and remote commands
 * 
 * FEATURES:
 * - Device Fleet Management
 * - QR Handshake for Device Linking
 * - Remote Commands (Force Lock, Unlock, Locate)
 * - Real-time Device Status Monitoring
 */

import { getCitizenWallet } from './SovereignWalletTriad.js';
import { getProfile } from './supabase-client.js';
import { supabase } from './supabase-client.js';
import { ethers } from 'ethers';

// ============================================
// DEVICE REGISTRY CONFIGURATION
// ============================================

const JOIN_TOKEN_EXPIRY_MINUTES = 15;
const HEARTBEAT_TIMEOUT_MINUTES = 5;

// ============================================
// DEVICE FLEET MANAGEMENT
// ============================================

/**
 * Get all satellite devices for current user
 * @returns {Promise<Array>}
 */
export async function getSatelliteDevices() {
  try {
    const wallet = getCitizenWallet();
    
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    const { data, error } = await supabase
      .from('sentinel_devices')
      .select('*')
      .eq('owner_device_id', wallet.deviceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('❌ Failed to get satellite devices:', error);
    return [];
  }
}

/**
 * Get fleet status summary
 * @returns {Promise<Object>}
 */
export async function getFleetStatus() {
  try {
    const wallet = getCitizenWallet();
    
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    const { data, error } = await supabase
      .rpc('get_fleet_status', { user_device_id: wallet.deviceId });

    if (error) throw error;

    return data && data.length > 0 ? data[0] : {
      total_devices: 0,
      online_devices: 0,
      secured_devices: 0,
      threat_detected_devices: 0,
      offline_devices: 0,
      locked_devices: 0
    };
  } catch (error) {
    console.error('❌ Failed to get fleet status:', error);
    return {
      total_devices: 0,
      online_devices: 0,
      secured_devices: 0,
      threat_detected_devices: 0,
      offline_devices: 0,
      locked_devices: 0
    };
  }
}

/**
 * Update device status
 * @param {string} deviceId - Device identifier
 * @param {string} status - New status (online, secured, threat_detected, offline, locked)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function updateDeviceStatus(deviceId, status) {
  try {
    const { error } = await supabase
      .from('sentinel_devices')
      .update({
        status: status,
        last_seen_at: new Date().toISOString()
      })
      .eq('device_id', deviceId);

    if (error) throw error;

    return { success: true, message: 'Device status updated' };
  } catch (error) {
    console.error('❌ Failed to update device status:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send heartbeat for current device
 * @returns {Promise<{success: boolean}>}
 */
export async function sendDeviceHeartbeat() {
  try {
    const wallet = getCitizenWallet();
    
    if (!wallet) {
      return { success: false };
    }

    const { error } = await supabase
      .from('sentinel_devices')
      .update({
        last_heartbeat_at: new Date().toISOString(),
        status: 'online'
      })
      .eq('device_id', wallet.deviceId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send heartbeat:', error);
    return { success: false };
  }
}

/**
 * Remove satellite device
 * @param {string} deviceId - Device identifier to remove
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function removeSatelliteDevice(deviceId) {
  try {
    const wallet = getCitizenWallet();
    
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    const { error } = await supabase
      .from('sentinel_devices')
      .delete()
      .eq('device_id', deviceId)
      .eq('owner_device_id', wallet.deviceId);

    if (error) throw error;

    return { success: true, message: 'Device removed from fleet' };
  } catch (error) {
    console.error('❌ Failed to remove device:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// QR HANDSHAKE LOGIC
// ============================================

/**
 * Generate encrypted QR code with Satellite Join Token
 * @returns {Promise<{success: boolean, token: string, qrData: string, expiresAt: string}>}
 */
export async function generateSatelliteJoinToken() {
  try {
    const wallet = getCitizenWallet();

    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    // Generate random token
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');

    // Create encrypted payload
    const expiresAt = new Date(Date.now() + JOIN_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    const payload = {
      token: token,
      ownerDeviceId: wallet.deviceId,
      ownerWalletAddress: wallet.address,
      expiresAt: expiresAt.toISOString(),
      timestamp: Date.now()
    };

    // Encrypt payload with wallet address as key
    const encryptedPayload = await encryptJoinPayload(JSON.stringify(payload), wallet.address);

    // Store in database
    const { error } = await supabase
      .from('satellite_join_tokens')
      .insert({
        token: token,
        encrypted_payload: encryptedPayload,
        owner_device_id: wallet.deviceId,
        owner_wallet_address: wallet.address,
        expires_at: expiresAt.toISOString()
      });

    if (error) throw error;

    // Create QR data (JSON string)
    const qrData = JSON.stringify({
      type: 'PFF_SATELLITE_JOIN',
      token: token,
      payload: encryptedPayload,
      version: '1.0'
    });

    console.log('✅ Satellite Join Token generated:', token.substring(0, 16) + '...');

    return {
      success: true,
      token: token,
      qrData: qrData,
      expiresAt: expiresAt.toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to generate join token:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Encrypt join payload using AES-GCM
 * @param {string} payload - Payload to encrypt
 * @param {string} key - Encryption key (wallet address)
 * @returns {Promise<string>}
 */
async function encryptJoinPayload(payload, key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);

  // Derive key from wallet address
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key.padEnd(32, '0').substring(0, 32)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const cryptoKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('PFF_SATELLITE_JOIN'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    cryptoKey,
    data
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt join payload using AES-GCM
 * @param {string} encryptedPayload - Encrypted payload (base64)
 * @param {string} key - Decryption key (wallet address)
 * @returns {Promise<Object>}
 */
async function decryptJoinPayload(encryptedPayload, key) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Decode base64
  const combined = Uint8Array.from(atob(encryptedPayload), c => c.charCodeAt(0));

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  // Derive key from wallet address
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key.padEnd(32, '0').substring(0, 32)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const cryptoKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('PFF_SATELLITE_JOIN'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    cryptoKey,
    encrypted
  );

  return JSON.parse(decoder.decode(decrypted));
}

/**
 * Scan and join satellite device using QR code
 * @param {string} qrData - QR code data (JSON string)
 * @param {Object} deviceInfo - Device information
 * @returns {Promise<{success: boolean, message: string, deviceId: string}>}
 */
export async function joinSatelliteDevice(qrData, deviceInfo) {
  try {
    const wallet = getCitizenWallet();

    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    // Parse QR data
    const qrPayload = JSON.parse(qrData);

    if (qrPayload.type !== 'PFF_SATELLITE_JOIN') {
      throw new Error('Invalid QR code type');
    }

    // Verify token in database
    const { data: tokenData, error: tokenError } = await supabase
      .from('satellite_join_tokens')
      .select('*')
      .eq('token', qrPayload.token)
      .eq('status', 'pending')
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Invalid or expired join token');
    }

    // Check if token expired
    if (new Date(tokenData.expires_at) < new Date()) {
      await supabase
        .from('satellite_join_tokens')
        .update({ status: 'expired' })
        .eq('token', qrPayload.token);

      throw new Error('Join token has expired');
    }

    // Decrypt payload
    const payload = await decryptJoinPayload(qrPayload.payload, tokenData.owner_wallet_address);

    // Create satellite device entry
    const { data: deviceData, error: deviceError } = await supabase
      .from('sentinel_devices')
      .insert({
        owner_device_id: payload.ownerDeviceId,
        owner_wallet_address: payload.ownerWalletAddress,
        device_id: wallet.deviceId,
        device_name: deviceInfo.name || 'Unnamed Device',
        device_type: deviceInfo.type || 'mobile',
        device_model: deviceInfo.model || 'Unknown',
        device_os: deviceInfo.os || 'Unknown',
        device_os_version: deviceInfo.osVersion || 'Unknown',
        status: 'online',
        last_seen_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
        join_token: qrPayload.token,
        join_token_used: true
      })
      .select()
      .single();

    if (deviceError) throw deviceError;

    // Mark token as used
    await supabase
      .from('satellite_join_tokens')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        used_by_device_id: wallet.deviceId
      })
      .eq('token', qrPayload.token);

    console.log('✅ Satellite device joined:', deviceData.device_id);

    return {
      success: true,
      message: 'Device successfully linked to fleet',
      deviceId: deviceData.device_id
    };
  } catch (error) {
    console.error('❌ Failed to join satellite device:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// REMOTE COMMANDS
// ============================================

/**
 * Send Force Lock command to satellite device
 * @param {string} targetDeviceId - Target device identifier
 * @param {string} reason - Lock reason
 * @returns {Promise<{success: boolean, message: string, commandId: string}>}
 */
export async function sendForceLockCommand(targetDeviceId, reason = 'Manual lock by owner') {
  try {
    const wallet = getCitizenWallet();

    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    // Verify ownership
    const { data: deviceData, error: deviceError } = await supabase
      .from('sentinel_devices')
      .select('*')
      .eq('device_id', targetDeviceId)
      .eq('owner_device_id', wallet.deviceId)
      .single();

    if (deviceError || !deviceData) {
      throw new Error('Device not found or not owned by you');
    }

    // Create remote command
    const { data: commandData, error: commandError } = await supabase
      .from('satellite_remote_commands')
      .insert({
        command_type: 'force_lock',
        command_payload: { reason: reason },
        target_device_id: targetDeviceId,
        issued_by_device_id: wallet.deviceId,
        issued_by_wallet_address: wallet.address,
        status: 'pending',
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (commandError) throw commandError;

    // Update device status
    await supabase
      .from('sentinel_devices')
      .update({
        is_locked: true,
        locked_at: new Date().toISOString(),
        locked_by: wallet.address,
        lock_reason: reason,
        status: 'locked'
      })
      .eq('device_id', targetDeviceId);

    console.log('✅ Force Lock command sent:', commandData.id);

    return {
      success: true,
      message: 'Force Lock command sent successfully',
      commandId: commandData.id
    };
  } catch (error) {
    console.error('❌ Failed to send Force Lock command:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send Unlock command to satellite device
 * @param {string} targetDeviceId - Target device identifier
 * @returns {Promise<{success: boolean, message: string, commandId: string}>}
 */
export async function sendUnlockCommand(targetDeviceId) {
  try {
    const wallet = getCitizenWallet();

    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    // Create remote command
    const { data: commandData, error: commandError } = await supabase
      .from('satellite_remote_commands')
      .insert({
        command_type: 'unlock',
        target_device_id: targetDeviceId,
        issued_by_device_id: wallet.deviceId,
        issued_by_wallet_address: wallet.address,
        status: 'pending',
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (commandError) throw commandError;

    // Update device status
    await supabase
      .from('sentinel_devices')
      .update({
        is_locked: false,
        locked_at: null,
        locked_by: null,
        lock_reason: null,
        status: 'online'
      })
      .eq('device_id', targetDeviceId);

    console.log('✅ Unlock command sent:', commandData.id);

    return {
      success: true,
      message: 'Unlock command sent successfully',
      commandId: commandData.id
    };
  } catch (error) {
    console.error('❌ Failed to send Unlock command:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send Locate command to satellite device
 * @param {string} targetDeviceId - Target device identifier
 * @returns {Promise<{success: boolean, message: string, commandId: string}>}
 */
export async function sendLocateCommand(targetDeviceId) {
  try {
    const wallet = getCitizenWallet();

    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    // Create remote command
    const { data: commandData, error: commandError } = await supabase
      .from('satellite_remote_commands')
      .insert({
        command_type: 'locate',
        target_device_id: targetDeviceId,
        issued_by_device_id: wallet.deviceId,
        issued_by_wallet_address: wallet.address,
        status: 'pending',
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (commandError) throw commandError;

    console.log('✅ Locate command sent:', commandData.id);

    return {
      success: true,
      message: 'Locate command sent successfully',
      commandId: commandData.id
    };
  } catch (error) {
    console.error('❌ Failed to send Locate command:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// REAL-TIME COMMAND LISTENER
// ============================================

let commandListener = null;

/**
 * Start listening for remote commands (for satellite devices)
 * @param {Function} onCommand - Callback when command received
 */
export function startRemoteCommandListener(onCommand) {
  const wallet = getCitizenWallet();

  if (!wallet) {
    console.warn('⚠️ Wallet not initialized, cannot start command listener');
    return;
  }

  console.log('👂 Starting remote command listener...');

  commandListener = supabase
    .channel('remote_commands')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'satellite_remote_commands',
      filter: `target_device_id=eq.${wallet.deviceId}`
    }, (payload) => {
      console.log('📡 Remote command received:', payload.new);

      if (onCommand) {
        onCommand(payload.new);
      }

      // Auto-execute command
      executeRemoteCommand(payload.new);
    })
    .subscribe();
}

/**
 * Stop listening for remote commands
 */
export function stopRemoteCommandListener() {
  if (commandListener) {
    commandListener.unsubscribe();
    commandListener = null;
    console.log('🛑 Remote command listener stopped');
  }
}

/**
 * Execute remote command on this device
 * @param {Object} command - Command object
 */
async function executeRemoteCommand(command) {
  try {
    console.log(`🔧 Executing command: ${command.command_type}`);

    switch (command.command_type) {
      case 'force_lock':
        await executeForceLock(command);
        break;
      case 'unlock':
        await executeUnlock(command);
        break;
      case 'locate':
        await executeLocate(command);
        break;
      case 'de_vitalize':
        await executeDeVitalize(command);
        break;
      default:
        console.warn('⚠️ Unknown command type:', command.command_type);
    }

    // Mark command as executed
    await supabase
      .from('satellite_remote_commands')
      .update({
        status: 'executed',
        executed_at: new Date().toISOString()
      })
      .eq('id', command.id);

  } catch (error) {
    console.error('❌ Failed to execute command:', error);

    // Mark command as failed
    await supabase
      .from('satellite_remote_commands')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('id', command.id);
  }
}

/**
 * Execute Force Lock command
 * @param {Object} command - Command object
 */
async function executeForceLock(command) {
  const { setRemoteLockState } = await import('./lock-state.js');
  const { showRemoteLockOverlay } = await import('./lock-overlay.js');

  setRemoteLockState(true);
  showRemoteLockOverlay();

  console.log('🔒 Device force locked:', command.command_payload?.reason || 'No reason provided');
}

/**
 * Execute Unlock command
 * @param {Object} command - Command object
 */
async function executeUnlock(command) {
  const { setRemoteLockState, setLockState } = await import('./lock-state.js');
  const { hideLockOverlay } = await import('./lock-overlay.js');

  setRemoteLockState(false);
  setLockState(false);

  // Try to hide overlay if it exists
  try {
    hideLockOverlay();
  } catch (e) {
    // Overlay might not exist
  }

  console.log('🔓 Device unlocked remotely');
}

/**
 * Execute Locate command
 * @param {Object} command - Command object
 */
async function executeLocate(command) {
  const { getCurrentLocation } = await import('./location-layer.js');

  const location = getCurrentLocation();

  // Update device location in database
  await supabase
    .from('sentinel_devices')
    .update({
      gps_lat: location.lat,
      gps_lng: location.lng
    })
    .eq('device_id', command.target_device_id);

  console.log('📍 Location updated:', location);
}

/**
 * Execute De-Vitalize command
 * @param {Object} command - Command object
 */
async function executeDeVitalize(command) {
  const { setRemoteLockState } = await import('./lock-state.js');
  const { showRemoteLockOverlay } = await import('./lock-overlay.js');

  setRemoteLockState(true);
  showRemoteLockOverlay();

  console.log('🔴 Device de-vitalized remotely');
}

