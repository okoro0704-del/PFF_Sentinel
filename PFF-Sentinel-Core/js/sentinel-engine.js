/**
 * PFF Sentinel Engine — The Scribe
 * Cryptographic signature system for Vitalization
 * Only the Sentinel can authorize citizenship via Four-Pillar verification
 */

import { ethers } from 'ethers';
import { getSentinelWallet, SOVEREIGN_CONFIG } from './SovereignWalletTriad.js';

// ============================================
// SENTINEL ENGINE CONFIGURATION
// ============================================

const SENTINEL_ENGINE_CONFIG = {
  // Vitalization signature domain
  domain: {
    name: 'PFF Sentinel Protocol',
    version: '1.0',
    chainId: SOVEREIGN_CONFIG.network.chainId,
    verifyingContract: SOVEREIGN_CONFIG.contracts.vida
  },
  
  // EIP-712 typed data for Vitalization
  types: {
    Vitalization: [
      { name: 'citizenAddress', type: 'address' },
      { name: 'deviceId', type: 'string' },
      { name: 'gpsLat', type: 'string' },
      { name: 'gpsLng', type: 'string' },
      { name: 'deviceUuid', type: 'string' },
      { name: 'faceHash', type: 'bytes32' },
      { name: 'fingerHash', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'nonce', type: 'uint256' }
    ]
  }
};

// ============================================
// VITALIZATION SIGNATURE (THE SCRIBE)
// ============================================

/**
 * Generate Sentinel signature for Vitalization
 * This cryptographic proof authorizes a Citizen to receive 5 VIDA CAP
 * 
 * @param {Object} fourPillarData - Four-Pillar verification data
 * @returns {Promise<{success: boolean, signature?: string, vitalizationProof?: Object, error?: string}>}
 */
export async function generateVitalizationSignature(fourPillarData) {
  try {
    const {
      citizenAddress,
      deviceId,
      gpsLat,
      gpsLng,
      deviceUuid,
      faceHash,
      fingerHash
    } = fourPillarData;

    // Validate all Four Pillars are present
    if (!citizenAddress || !deviceId || !gpsLat || !gpsLng || !deviceUuid || !faceHash || !fingerHash) {
      return { success: false, error: 'Incomplete Four-Pillar data' };
    }

    // Get Sentinel wallet (requires private key)
    const sentinelPrivateKey = import.meta.env.VITE_SENTINEL_PRIVATE_KEY;
    if (!sentinelPrivateKey) {
      return { success: false, error: 'Sentinel private key not configured' };
    }

    const sentinelWallet = new ethers.Wallet(sentinelPrivateKey);
    console.log('🛡️ Sentinel Engine: Generating Vitalization signature...');

    // Generate nonce (unique per vitalization)
    const nonce = Date.now();
    const timestamp = Math.floor(Date.now() / 1000);

    // Convert hashes to bytes32 format
    const faceHashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(faceHash));
    const fingerHashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(fingerHash));

    // Construct Vitalization message
    const vitalizationMessage = {
      citizenAddress,
      deviceId,
      gpsLat: gpsLat.toString(),
      gpsLng: gpsLng.toString(),
      deviceUuid,
      faceHash: faceHashBytes32,
      fingerHash: fingerHashBytes32,
      timestamp,
      nonce
    };

    // Sign with EIP-712 (structured data signing)
    const signature = await sentinelWallet.signTypedData(
      SENTINEL_ENGINE_CONFIG.domain,
      SENTINEL_ENGINE_CONFIG.types,
      vitalizationMessage
    );

    console.log('✅ Vitalization signature generated:', signature.slice(0, 20) + '...');

    // Construct Vitalization Proof (to be stored on-chain)
    const vitalizationProof = {
      citizenAddress,
      deviceId,
      fourPillarAnchors: {
        gps: { lat: gpsLat, lng: gpsLng },
        deviceUuid,
        faceHash: faceHashBytes32,
        fingerHash: fingerHashBytes32
      },
      sentinelSignature: signature,
      sentinelAddress: sentinelWallet.address,
      timestamp,
      nonce,
      vitalizationId: ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'string', 'uint256'],
          [citizenAddress, deviceId, nonce]
        )
      )
    };

    return {
      success: true,
      signature,
      vitalizationProof
    };
  } catch (error) {
    console.error('❌ Vitalization signature failed:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// VITALIZATION VERIFICATION
// ============================================

/**
 * Verify Sentinel signature for Vitalization
 * Ensures the signature was created by the authorized Sentinel
 * 
 * @param {Object} vitalizationProof - Vitalization proof object
 * @returns {Promise<{valid: boolean, sentinelAddress?: string, error?: string}>}
 */
export async function verifyVitalizationSignature(vitalizationProof) {
  try {
    const {
      citizenAddress,
      deviceId,
      fourPillarAnchors,
      sentinelSignature,
      timestamp,
      nonce
    } = vitalizationProof;

    // Reconstruct message
    const vitalizationMessage = {
      citizenAddress,
      deviceId,
      gpsLat: fourPillarAnchors.gps.lat.toString(),
      gpsLng: fourPillarAnchors.gps.lng.toString(),
      deviceUuid: fourPillarAnchors.deviceUuid,
      faceHash: fourPillarAnchors.faceHash,
      fingerHash: fourPillarAnchors.fingerHash,
      timestamp,
      nonce
    };

    // Recover signer address from signature
    const recoveredAddress = ethers.verifyTypedData(
      SENTINEL_ENGINE_CONFIG.domain,
      SENTINEL_ENGINE_CONFIG.types,
      vitalizationMessage,
      sentinelSignature
    );

    // Verify signer is the authorized Sentinel
    const authorizedSentinel = SOVEREIGN_CONFIG.sentinelAddress;
    const isValid = recoveredAddress.toLowerCase() === authorizedSentinel.toLowerCase();

    if (isValid) {
      console.log('✅ Vitalization signature verified. Sentinel:', recoveredAddress);
    } else {
      console.error('❌ Invalid Sentinel signature. Expected:', authorizedSentinel, 'Got:', recoveredAddress);
    }

    return {
      valid: isValid,
      sentinelAddress: recoveredAddress
    };
  } catch (error) {
    console.error('❌ Signature verification failed:', error);
    return { valid: false, error: error.message };
  }
}

// ============================================
// EXPORT
// ============================================

export const SentinelEngine = {
  generateVitalizationSignature,
  verifyVitalizationSignature,
  config: SENTINEL_ENGINE_CONFIG
};

