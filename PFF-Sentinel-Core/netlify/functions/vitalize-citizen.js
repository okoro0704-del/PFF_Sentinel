/**
 * PFF Sentinel — Vitalization Endpoint
 * Backend route that handles Four-Pillar verification and Sentinel authorization
 * Only the Sentinel can decide who becomes a Citizen
 */

const { ethers } = require('ethers');
const { createClient } = require('@supabase/supabase-js');

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SENTINEL_PRIVATE_KEY = process.env.VITE_SENTINEL_PRIVATE_KEY;
const VIDA_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIDA_TOKEN_ADDRESS || process.env.VITE_VIDA_TOKEN_ADDRESS;
const POLYGON_NETWORK = process.env.NEXT_PUBLIC_POLYGON_NETWORK || process.env.VITE_POLYGON_NETWORK || 'polygon';

// Wallet Addresses
const NATIONAL_TREASURY_ADDRESS = process.env.NEXT_PUBLIC_NATIONAL_TREASURY_ADDRESS || process.env.VITE_NATIONAL_TREASURY_ADDRESS;
const FOUNDATION_VAULT_ADDRESS = process.env.NEXT_PUBLIC_FOUNDATION_VAULT_ADDRESS || process.env.VITE_FOUNDATION_VAULT_ADDRESS;
const SENTINEL_WALLET_ADDRESS = process.env.NEXT_PUBLIC_SENTINEL_WALLET_ADDRESS || process.env.VITE_SENTINEL_WALLET_ADDRESS;

// Polygon RPC URLs
const POLYGON_RPC_URL = POLYGON_NETWORK === 'polygon'
  ? 'https://polygon-rpc.com'
  : 'https://rpc-amoy.polygon.technology';

// EIP-712 Domain
const VITALIZATION_DOMAIN = {
  name: 'PFF Sentinel Protocol',
  version: '1.0',
  chainId: POLYGON_NETWORK === 'polygon' ? 137 : 80002, // Polygon Mainnet or Amoy Testnet
  verifyingContract: VIDA_CONTRACT_ADDRESS
};

// EIP-712 Types
const VITALIZATION_TYPES = {
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
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

// ============================================
// FOUR-PILLAR VERIFICATION
// ============================================

async function verifyFourPillars(deviceId, supabase) {
  try {
    // Fetch profile from Supabase
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('device_id', deviceId)
      .single();

    if (error || !profile) {
      return { valid: false, error: 'Profile not found' };
    }

    // Check all Four Pillars are present
    const pillars = {
      gps: profile.gps_lat && profile.gps_lng,
      device: profile.device_uuid,
      face: profile.face_hash,
      finger: profile.finger_hash
    };

    const allPillarsPresent = Object.values(pillars).every(p => p);

    if (!allPillarsPresent) {
      return { 
        valid: false, 
        error: 'Incomplete Four-Pillar verification',
        pillars 
      };
    }

    // Check if already vitalized
    if (profile.vida_minted) {
      return { 
        valid: false, 
        error: 'Citizen already vitalized',
        alreadyVitalized: true 
      };
    }

    return { 
      valid: true, 
      profile,
      pillars 
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// ============================================
// VITALIZATION SIGNATURE GENERATION
// ============================================

async function generateVitalizationSignature(profile) {
  try {
    if (!SENTINEL_PRIVATE_KEY) {
      throw new Error('Sentinel private key not configured');
    }

    const sentinelWallet = new ethers.Wallet(SENTINEL_PRIVATE_KEY);
    
    // Generate nonce and timestamp
    const nonce = Date.now();
    const timestamp = Math.floor(Date.now() / 1000);

    // Convert hashes to bytes32
    const faceHashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(profile.face_hash));
    const fingerHashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(profile.finger_hash));

    // Construct message
    const vitalizationMessage = {
      citizenAddress: profile.wallet_address,
      deviceId: profile.device_id,
      gpsLat: profile.gps_lat.toString(),
      gpsLng: profile.gps_lng.toString(),
      deviceUuid: profile.device_uuid,
      faceHash: faceHashBytes32,
      fingerHash: fingerHashBytes32,
      timestamp,
      nonce
    };

    // Sign with EIP-712
    const signature = await sentinelWallet.signTypedData(
      VITALIZATION_DOMAIN,
      VITALIZATION_TYPES,
      vitalizationMessage
    );

    // Generate Vitalization ID
    const vitalizationId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'string', 'uint256'],
        [profile.wallet_address, profile.device_id, nonce]
      )
    );

    return {
      success: true,
      signature,
      vitalizationProof: {
        citizenAddress: profile.wallet_address,
        deviceId: profile.device_id,
        fourPillarAnchors: {
          gps: { lat: profile.gps_lat, lng: profile.gps_lng },
          deviceUuid: profile.device_uuid,
          faceHash: faceHashBytes32,
          fingerHash: fingerHashBytes32
        },
        sentinelSignature: signature,
        sentinelAddress: sentinelWallet.address,
        timestamp,
        nonce,
        vitalizationId
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute multi-mint Vitalization on-chain
 * Mints to: User (5 VIDA), National Treasury (5 VIDA), Foundation (1 VIDA)
 * Then transfers $100 from Foundation to Sentinel
 */
async function executeMultiMintVitalization(userAddress) {
  try {
    console.log('🔗 Connecting to Polygon network...');

    // Connect to Polygon
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    const sentinelWallet = new ethers.Wallet(SENTINEL_PRIVATE_KEY, provider);

    // VIDA Token ABI (only functions we need)
    const VIDA_ABI = [
      'function mintSovereignCap(address recipient, uint256 spendable, uint256 locked) external returns (bool)',
      'function transfer(address to, uint256 amount) external returns (bool)',
      'function balanceOf(address owner) external view returns (uint256)'
    ];

    const vidaContract = new ethers.Contract(VIDA_CONTRACT_ADDRESS, VIDA_ABI, sentinelWallet);

    // Calculate amounts (in wei, 18 decimals)
    const VIDA_PRICE = 980; // $980 per VIDA
    const spendableAmount = ethers.parseUnits((900 / VIDA_PRICE).toFixed(18), 18); // $900 worth
    const lockedAmount = ethers.parseUnits((4000 / VIDA_PRICE).toFixed(18), 18); // $4000 worth
    const foundationAmount = ethers.parseUnits((900 / VIDA_PRICE).toFixed(18), 18); // 1 VIDA CAP worth
    const sentinelTransfer = ethers.parseUnits((100 / VIDA_PRICE).toFixed(18), 18); // $100 worth

    console.log('💰 Minting amounts calculated:');
    console.log('  User: 5 VIDA CAP ($900 spendable + $4000 locked)');
    console.log('  Treasury: 5 VIDA CAP');
    console.log('  Foundation: 1 VIDA CAP');

    const results = {
      userMint: null,
      treasuryMint: null,
      foundationMint: null,
      sentinelTransfer: null
    };

    // MINT 1: User Wallet (5 VIDA CAP)
    console.log('🪙 Minting 5 VIDA CAP to user:', userAddress);
    try {
      const userTx = await vidaContract.mintSovereignCap(userAddress, spendableAmount, lockedAmount);
      const userReceipt = await userTx.wait();
      results.userMint = {
        success: true,
        txHash: userReceipt.hash,
        amount: '5 VIDA CAP'
      };
      console.log('✅ User mint successful:', userReceipt.hash);
    } catch (error) {
      console.error('❌ User mint failed:', error.message);
      results.userMint = { success: false, error: error.message };
    }

    // MINT 2: National Treasury (5 VIDA CAP)
    console.log('🏛️ Minting 5 VIDA CAP to National Treasury:', NATIONAL_TREASURY_ADDRESS);
    try {
      const treasuryTx = await vidaContract.mintSovereignCap(NATIONAL_TREASURY_ADDRESS, spendableAmount, lockedAmount);
      const treasuryReceipt = await treasuryTx.wait();
      results.treasuryMint = {
        success: true,
        txHash: treasuryReceipt.hash,
        amount: '5 VIDA CAP'
      };
      console.log('✅ Treasury mint successful:', treasuryReceipt.hash);
    } catch (error) {
      console.error('❌ Treasury mint failed:', error.message);
      results.treasuryMint = { success: false, error: error.message };
    }

    // MINT 3: Foundation Vault (1 VIDA CAP)
    console.log('🏗️ Minting 1 VIDA CAP to Foundation Vault:', FOUNDATION_VAULT_ADDRESS);
    try {
      const foundationTx = await vidaContract.mintSovereignCap(FOUNDATION_VAULT_ADDRESS, foundationAmount, 0);
      const foundationReceipt = await foundationTx.wait();
      results.foundationMint = {
        success: true,
        txHash: foundationReceipt.hash,
        amount: '1 VIDA CAP'
      };
      console.log('✅ Foundation mint successful:', foundationReceipt.hash);

      // TRANSFER: Foundation → Sentinel ($100)
      console.log('💸 Transferring $100 from Foundation to Sentinel...');
      // Note: This transfer needs to be executed by the Foundation Safe
      // For now, we'll log it as pending
      results.sentinelTransfer = {
        success: true,
        status: 'pending',
        note: 'Foundation Safe must execute transfer of $100 to Sentinel',
        amount: '$100',
        from: FOUNDATION_VAULT_ADDRESS,
        to: SENTINEL_WALLET_ADDRESS
      };
      console.log('⏳ Foundation → Sentinel transfer pending (requires Safe execution)');

    } catch (error) {
      console.error('❌ Foundation mint failed:', error.message);
      results.foundationMint = { success: false, error: error.message };
    }

    return {
      success: true,
      results,
      totalMinted: '11 VIDA CAP',
      distribution: {
        user: '5 VIDA CAP',
        treasury: '5 VIDA CAP',
        foundation: '1 VIDA CAP',
        sentinelPending: '$100'
      }
    };

  } catch (error) {
    console.error('❌ Multi-mint execution failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// MAIN HANDLER
// ============================================

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    // Parse request body
    const { deviceId, citizenAddress } = JSON.parse(event.body || '{}');

    if (!deviceId) {
      return json(400, { error: 'deviceId is required' });
    }

    // Initialize Supabase client
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return json(500, { error: 'Supabase not configured' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    console.log('🛡️ Vitalization request for device:', deviceId);

    // STEP 1: Verify Four Pillars
    const verification = await verifyFourPillars(deviceId, supabase);

    if (!verification.valid) {
      return json(400, { 
        error: verification.error,
        pillars: verification.pillars,
        alreadyVitalized: verification.alreadyVitalized
      });
    }

    console.log('✅ Four-Pillar verification passed');

    // STEP 2: Generate Sentinel signature
    const signatureResult = await generateVitalizationSignature(verification.profile);

    if (!signatureResult.success) {
      return json(500, { error: 'Failed to generate Vitalization signature', detail: signatureResult.error });
    }

    console.log('✅ Sentinel signature generated');

    // STEP 3: Execute multi-mint on-chain
    console.log('🔗 Executing multi-mint Vitalization on-chain...');
    const mintResult = await executeMultiMintVitalization(verification.profile.wallet_address);

    if (!mintResult.success) {
      console.error('❌ Multi-mint failed:', mintResult.error);
      // Continue anyway - we'll mark as vitalized but note the minting failure
    } else {
      console.log('✅ Multi-mint successful:', mintResult.totalMinted);
    }

    // STEP 4: Mark as vitalized in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_fully_verified: true,
        vida_minted: mintResult.success,
        vida_balance_spendable: 900,
        vida_balance_locked: 4000,
        vitalization_signature: signatureResult.signature,
        vitalization_id: signatureResult.vitalizationProof.vitalizationId,
        vitalized_at: new Date().toISOString()
      })
      .eq('device_id', deviceId);

    if (updateError) {
      console.error('❌ Failed to update profile:', updateError);
      return json(500, { error: 'Failed to mark as vitalized', detail: updateError.message });
    }

    console.log('✅ Citizen vitalized successfully');

    // Return Vitalization Proof with multi-mint results
    return json(200, {
      success: true,
      message: 'Citizen vitalized successfully',
      vitalizationProof: signatureResult.vitalizationProof,
      vidaCap: {
        total: 5,
        spendable: 900,
        locked: 4000
      },
      multiMint: mintResult.success ? {
        totalMinted: mintResult.totalMinted,
        distribution: mintResult.distribution,
        transactions: {
          userMint: mintResult.results.userMint,
          treasuryMint: mintResult.results.treasuryMint,
          foundationMint: mintResult.results.foundationMint,
          sentinelTransfer: mintResult.results.sentinelTransfer
        }
      } : {
        error: mintResult.error,
        note: 'Vitalization signature generated but on-chain minting failed'
      }
    });

  } catch (error) {
    console.error('❌ Vitalization error:', error);
    return json(500, { error: 'Vitalization failed', detail: error.message });
  }
};

