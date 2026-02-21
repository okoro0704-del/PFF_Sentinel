/**
 * National Lock-Up Bridge — POST /v1/sovryn/swap-to-national (swapToNational)
 *
 * Security: Route only allowed when x-sovryn-secret matches SOVRYN_SECRET.
 * Step A (Verify): Wait for VIDA transfer to land in NATIONAL_BLOCK_SINK via transferTxHash.
 * Step B (Calculate): Use current USD/NGN rate with $1,000 anchor → nVIDA amount.
 * Step C (Execute): Call ngnVIDA.mint(userAddress, calculatedAmount) from Sentinel wallet (contract: NGN_VIDA_CONTRACT).
 * Reserve: Increment national_blocks.total_vida_reserved for Nigeria.
 *
 * Inputs: amountVida, userAddress, transferTxHash.
 */

// Hardcoded mainnet addresses (National Lock-Up Bridge)
const NATIONAL_BLOCK_SINK = '0x7EC87F9A1E828De66fAB5bF457A0A302236Fb747';
const NGN_VIDA_CONTRACT = '0x839a16B255720EE8ba525555075BA763172be284';
const COUNTRY_NG = 'NG';

// $1,000 anchor: 1 VIDA = $1,000 USD value in Naira (calculatedAmount = amountVida * 1000 * usdToNgn)
const USD_ANCHOR_PER_VIDA = 1000;

function getSecret() {
  return process.env.SOVRYN_SECRET || process.env.VITE_SOVRYN_SECRET || '';
}

/** Get current USD/NGN rate; fallback to env USD_TO_NGN_RATE or 1500 */
async function getUsdToNgnRate() {
  const envRate = process.env.USD_TO_NGN_RATE;
  if (envRate != null && envRate !== '') {
    const n = Number(envRate);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const url = process.env.USD_NGN_RATE_URL || 'https://api.exchangerate-api.com/v4/latest/USD';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Rate API ${res.status}`);
    const data = await res.json();
    const rate = data.rates && (data.rates.NGN ?? data.rates.ngn);
    if (rate != null && Number(rate) > 0) return Number(rate);
  } catch (e) {
    console.warn('USD/NGN fetch failed, using fallback:', e.message);
  }
  return Number(process.env.USD_TO_NGN_FALLBACK || '1500') || 1500;
}

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...headers },
    body: JSON.stringify(body),
  };
}

function normalizeAddress(addr) {
  return (addr && typeof addr === 'string') ? addr.trim().toLowerCase() : '';
}

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  // Security: only allow swapToNational when SOVRYN_SECRET is valid
  const secret = getSecret();
  const headerSecret = event.headers['x-sovryn-secret'] || event.headers['X-Sovryn-Secret'];
  if (!secret || headerSecret !== secret) {
    return json(401, { error: 'Unauthorized: x-sovryn-secret missing or incorrect' });
  }

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const amountVida = body.amountVida != null ? Number(body.amountVida) : NaN;
  const userAddress = body.userAddress || body.user_address;
  const transferTxHash = body.transferTxHash || body.transfer_tx_hash;

  if (!Number.isFinite(amountVida) || amountVida <= 0) {
    return json(400, { error: 'Invalid or missing amountVida (must be a positive number)' });
  }
  if (!userAddress || typeof userAddress !== 'string') {
    return json(400, { error: 'Missing userAddress' });
  }
  const user = normalizeAddress(userAddress);
  if (user.length !== 42 || !user.startsWith('0x')) {
    return json(400, { error: 'Invalid userAddress format' });
  }
  if (!transferTxHash || typeof transferTxHash !== 'string') {
    return json(400, { error: 'Missing transferTxHash (proof of VIDA transfer to National Block Sink)' });
  }

  const rpcUrl = process.env.POLYGON_RPC_URL || process.env.RPC_URL;
  const vidaTokenAddress = process.env.VIDA_TOKEN_ADDRESS || process.env.CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const ngnVidaAddress = process.env.NGN_VIDA_CONTRACT_ADDRESS || NGN_VIDA_CONTRACT;
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rpcUrl || !vidaTokenAddress) {
    return json(500, { error: 'Server misconfiguration: POLYGON_RPC_URL and VIDA_TOKEN_ADDRESS required' });
  }
  if (!privateKey) {
    return json(500, { error: 'Server misconfiguration: WALLET_PRIVATE_KEY required for mint' });
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    return json(500, { error: 'Server misconfiguration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for reserve tracking' });
  }

  const { ethers } = require('ethers');
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const sink = normalizeAddress(NATIONAL_BLOCK_SINK);

  // Step A (Verify): Wait for VIDA transfer to land in the Sink
  const amountWei = ethers.parseEther(String(amountVida));
  const transferTopic = ethers.id('Transfer(address,address,uint256)');
  let receipt;
  try {
    receipt = await provider.waitForTransaction(transferTxHash);
  } catch (e) {
    return json(400, { error: 'Invalid or unknown transferTxHash', detail: e.message });
  }
  if (!receipt || receipt.status !== 1) {
    return json(400, { error: 'Transfer transaction not found or failed' });
  }
  const vidaAddress = normalizeAddress(vidaTokenAddress);
  const log = receipt.logs.find(l => {
    const addr = (l.address || '').toLowerCase();
    return addr === vidaAddress && l.topics && l.topics[0] === transferTopic;
  });
  if (!log || log.topics.length < 3) {
    return json(400, { error: 'No VIDA Transfer event found in the given transaction' });
  }
  const from = ethers.getAddress('0x' + log.topics[1].slice(-40));
  const to = ethers.getAddress('0x' + log.topics[2].slice(-40));
  const value = (log.data && log.data !== '0x') ? BigInt(log.data) : 0n;
  if (normalizeAddress(from) !== user) {
    return json(400, { error: 'Transfer from address does not match userAddress' });
  }
  if (normalizeAddress(to) !== sink) {
    return json(400, { error: 'Transfer to address is not the National Block Sink' });
  }
  if (value < amountWei) {
    return json(400, { error: 'Transfer amount is less than amountVida' });
  }

  // Calculate: current USD/NGN rate with $1,000 anchor → nVIDA amount
  const usdToNgn = await getUsdToNgnRate();
  const nairaPerVida = USD_ANCHOR_PER_VIDA * usdToNgn;
  const calculatedAmount = BigInt(Math.floor(amountVida * nairaPerVida));

  // Step C (Execute): ngnVIDA.mint(userAddress, calculatedAmount) from Sentinel wallet
  const wallet = new ethers.Wallet(privateKey, provider);
  const ngnVidaAbi = ['function mint(address to, uint256 nairaAmount)'];
  const ngnVida = new ethers.Contract(ngnVidaAddress, ngnVidaAbi, wallet);
  let mintTx;
  try {
    const feeData = await provider.getFeeData();
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('30', 'gwei');
    const maxFeePerGas = feeData.maxFeePerGas || (feeData.gasPrice ? feeData.gasPrice * 2n : ethers.parseUnits('100', 'gwei'));
    mintTx = await ngnVida.mint(userAddress, calculatedAmount, { maxPriorityFeePerGas, maxFeePerGas });
    await mintTx.wait();
  } catch (err) {
    console.error('ngnVIDA.mint error:', err);
    return json(500, { error: 'Mint failed', detail: err.message || String(err) });
  }

  // Reserve tracking: increment total_vida_reserved for Nigeria
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: row, error: selectErr } = await supabase
    .from('national_blocks')
    .select('total_vida_reserved')
    .eq('country_code', COUNTRY_NG)
    .maybeSingle();
  if (selectErr) {
    console.error('Reserve select failed:', selectErr);
    return json(500, { error: 'Reserve tracking failed', mintTxHash: mintTx.hash, detail: selectErr.message });
  }
  const currentReserved = (row && row.total_vida_reserved != null) ? Number(row.total_vida_reserved) : 0;
  const newTotal = currentReserved + amountVida;
  const { error: upsertErr } = await supabase.from('national_blocks').upsert(
    { country_code: COUNTRY_NG, total_vida_reserved: newTotal, updated_at: new Date().toISOString() },
    { onConflict: 'country_code' }
  );
  if (upsertErr) {
    console.error('Reserve update failed:', upsertErr);
    return json(500, { error: 'Mint succeeded but reserve tracking failed', mintTxHash: mintTx.hash, detail: upsertErr.message });
  }

  return json(200, {
    ok: true,
    transferTxHash,
    mintTxHash: mintTx.hash,
    amountVida,
    calculatedAmount: calculatedAmount.toString(),
    usdToNgnRate: usdToNgn,
    countryCode: COUNTRY_NG,
  });
};
