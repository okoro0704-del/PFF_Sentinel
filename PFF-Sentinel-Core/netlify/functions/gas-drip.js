/**
 * Automated Gas Drip — POST /v1/sovryn/gas-drip
 * Sends a small amount of POL to Sentinels with active subscriptions so they can pay gas.
 * Run monthly via external cron (e.g. cron-job.org).
 *
 * Amount per user: GAS_DRIP_AMOUNT env (default 0.001 POL).
 * Requires: x-sovryn-secret, WALLET_PRIVATE_KEY, POLYGON_RPC_URL, SUPABASE_*.
 */

function getSecret() {
  return process.env.SOVRYN_SECRET || process.env.VITE_SOVRYN_SECRET || '';
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

function isValidEthAddress(addr) {
  const a = normalizeAddress(addr);
  return a.length === 42 && a.startsWith('0x');
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const secret = getSecret();
  const headerSecret = event.headers['x-sovryn-secret'] || event.headers['X-Sovryn-Secret'];
  if (!secret || headerSecret !== secret) {
    return json(401, { error: 'Unauthorized: x-sovryn-secret missing or incorrect' });
  }

  const rpcUrl = process.env.POLYGON_RPC_URL || process.env.RPC_URL;
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dripAmount = parseFloat(process.env.GAS_DRIP_AMOUNT || '0.001') || 0.001;

  if (!rpcUrl || !privateKey) {
    return json(500, { error: 'Server misconfiguration: POLYGON_RPC_URL and WALLET_PRIVATE_KEY required' });
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    return json(500, { error: 'Server misconfiguration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for drip tracking' });
  }

  const { ethers } = require('ethers');
  const { createClient } = require('@supabase/supabase-js');
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const dripMonth = new Date().toISOString().slice(0, 7);

  try {
    const { data: subs, error: subsErr } = await supabase
      .from('subscriptions')
      .select('sentinel_wallet_address')
      .eq('status', 'active');

    if (subsErr) {
      console.error('Gas drip: subscription query failed', subsErr);
      return json(500, { error: 'Failed to query subscriptions', detail: subsErr.message });
    }

    const addresses = [...new Set((subs || []).map(s => s.sentinel_wallet_address).filter(Boolean))].filter(isValidEthAddress);
    if (addresses.length === 0) {
      return json(200, { ok: true, sent: 0, message: 'No eligible addresses' });
    }

    const { data: alreadySent } = await supabase
      .from('gas_drip_history')
      .select('wallet_address')
      .eq('drip_month', dripMonth);

    const sentSet = new Set((alreadySent || []).map(r => normalizeAddress(r.wallet_address)));
    const toSend = addresses.filter(a => !sentSet.has(normalizeAddress(a)));

    if (toSend.length === 0) {
      return json(200, { ok: true, sent: 0, message: 'All eligible addresses already received drip this month' });
    }

    const amountWei = ethers.parseEther(dripAmount.toString());
    const results = [];
    const feeData = await provider.getFeeData();
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('30', 'gwei');
    const maxFeePerGas = feeData.maxFeePerGas || (feeData.gasPrice ? feeData.gasPrice * 2n : ethers.parseUnits('100', 'gwei'));
    const opts = { maxPriorityFeePerGas, maxFeePerGas };

    for (const addr of toSend) {
      try {
        const tx = await wallet.sendTransaction({
          to: addr,
          value: amountWei,
          ...opts,
        });
        await tx.wait();
        results.push({ address: addr, txHash: tx.hash, ok: true });
        await supabase.from('gas_drip_history').insert({
          wallet_address: addr,
          drip_month: dripMonth,
          amount_pol: dripAmount,
          tx_hash: tx.hash,
        });
      } catch (err) {
        results.push({ address: addr, ok: false, error: err.message || String(err) });
      }
    }

    const sent = results.filter(r => r.ok).length;
    return json(200, { ok: true, sent, total: toSend.length, results });
  } catch (err) {
    console.error('Gas drip error:', err);
    return json(500, { error: 'Gas drip failed', detail: err.message || String(err) });
  }
};
