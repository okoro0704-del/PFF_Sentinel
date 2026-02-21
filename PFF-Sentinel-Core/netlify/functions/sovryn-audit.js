/**
 * SOVRYN Audit API — Audit (Channel 2 + 3) + Mainnet distribution
 * POST /v1/sovryn/audit → accept signed face-scan payload, then releaseVidaCap to hardcoded destinations.
 * Returns 401 if x-sovryn-secret is missing or incorrect (Channel 3).
 * Validates userAddress is not National/Foundation to prevent circular minting.
 * Uses market gas (getFeeData) so the tx is not stuck on Polygon gas spikes.
 */

const MAX_AGE_MS = 60 * 1000;

// Mainnet distribution — hardcoded destinations (must match contract)
const NATIONAL_BLOCK_NG = '0x7EC87F9A1E828De66fAB5bF457A0A302236Fb747';
const FOUNDATION_VAULT = '0x5d1F4d086885b7b1A2cF1afDE0BA8d0c70e02a28';

function getSecret() {
  return process.env.SOVRYN_SECRET || process.env.VITE_SOVRYN_SECRET || '';
}

function normalizeAddress(addr) {
  return (addr && typeof addr === 'string') ? addr.trim().toLowerCase() : '';
}

function validateUserAddress(userAddress) {
  if (!userAddress || typeof userAddress !== 'string') {
    return { valid: false, reason: 'Missing user address' };
  }
  const addr = normalizeAddress(userAddress);
  const national = normalizeAddress(NATIONAL_BLOCK_NG);
  const foundation = normalizeAddress(FOUNDATION_VAULT);
  if (addr === national || addr === foundation) {
    return { valid: false, reason: 'User address cannot be National Block or Foundation Vault (prevents circular minting)' };
  }
  if (addr.length !== 42 || !addr.startsWith('0x')) {
    return { valid: false, reason: 'Invalid address format' };
  }
  return { valid: true };
}

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const secret = getSecret();
  const headerSecret = event.headers['x-sovryn-secret'] || event.headers['X-Sovryn-Secret'];

  if (!secret || headerSecret !== secret) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized: x-sovryn-secret missing or incorrect' }),
    };
  }

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const ts = body.ts;
  if (ts != null && Date.now() - Number(ts) > MAX_AGE_MS) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Audit voided: response after 60s' }),
    };
  }

  const userAddress = body.user_address || body.wallet_address || body.userAddress;
  if (!userAddress) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, received: true, releaseSkipped: true, reason: 'No user address provided' }),
    };
  }
  const validation = validateUserAddress(userAddress);
  if (!validation.valid) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: validation.reason }),
    };
  }

  const rpcUrl = process.env.POLYGON_RPC_URL || process.env.RPC_URL;
  const contractAddress = process.env.CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || process.env.VIDA_TOKEN_ADDRESS;
  const privateKey = process.env.WALLET_PRIVATE_KEY;

  if (!rpcUrl || !contractAddress || !privateKey) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        ok: true,
        received: true,
        releaseSkipped: true,
        reason: 'Missing POLYGON_RPC_URL, CONTRACT_ADDRESS, or WALLET_PRIVATE_KEY',
      }),
    };
  }

  try {
    const { ethers } = require('ethers');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const abi = [
      'function releaseVidaCap(address userAddress, address nationalBlock, address foundationVault)',
    ];
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    const feeData = await provider.getFeeData();
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
      ? feeData.maxPriorityFeePerGas
      : ethers.parseUnits('30', 'gwei');
    const maxFeePerGas = feeData.maxFeePerGas
      ? feeData.maxFeePerGas
      : (feeData.gasPrice ? feeData.gasPrice * 2n : ethers.parseUnits('100', 'gwei'));

    const tx = await contract.releaseVidaCap(
      userAddress,
      NATIONAL_BLOCK_NG,
      FOUNDATION_VAULT,
      {
        maxPriorityFeePerGas,
        maxFeePerGas,
      }
    );

    const receipt = await tx.wait().catch(() => null);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        ok: true,
        received: true,
        releaseTxHash: tx.hash,
        releaseBlock: receipt ? Number(receipt.blockNumber) : null,
      }),
    };
  } catch (err) {
    console.error('releaseVidaCap error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        ok: false,
        error: 'Release failed',
        detail: err.message || String(err),
      }),
    };
  }
};
