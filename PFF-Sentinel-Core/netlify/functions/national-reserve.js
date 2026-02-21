/**
 * National Reserve — GET /v1/sovryn/national-reserve
 * Read-only: returns VIDA locked in sink (0x7EC8...b747) and ngnVIDA total issued.
 * Optional ?wallet=0x... returns that address's ngnVIDA balance for dashboard display.
 */

const NATIONAL_BLOCK_SINK = '0x7EC87F9A1E828De66fAB5bF457A0A302236Fb747';
const NGN_VIDA_CONTRACT = '0x839a16B255720EE8ba525555075BA763172be284';
const DECIMALS = 18;

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...headers },
    body: JSON.stringify(body),
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const rpcUrl = process.env.POLYGON_RPC_URL || process.env.RPC_URL;
  const vidaTokenAddress = process.env.VIDA_TOKEN_ADDRESS || process.env.CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const ngnVidaAddress = process.env.NGN_VIDA_CONTRACT_ADDRESS || NGN_VIDA_CONTRACT;

  if (!rpcUrl || !vidaTokenAddress) {
    return json(500, { error: 'Server misconfiguration: POLYGON_RPC_URL and VIDA_TOKEN_ADDRESS required' });
  }

  const walletParam = event.queryStringParameters?.wallet || event.queryStringParameters?.address;
  const wallet = (walletParam && typeof walletParam === 'string') ? walletParam.trim() : null;

  const { ethers } = require('ethers');
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const erc20Abi = [
    'function balanceOf(address account) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
  ];

  try {
    const vida = new ethers.Contract(vidaTokenAddress, erc20Abi, provider);
    const ngnVida = new ethers.Contract(ngnVidaAddress, erc20Abi, provider);

    const [vidaLockedWei, ngnVidaSupplyWei] = await Promise.all([
      vida.balanceOf(NATIONAL_BLOCK_SINK),
      ngnVida.totalSupply(),
    ]);

    const vidaLocked = Number(ethers.formatUnits(vidaLockedWei, DECIMALS));
    const ngnVidaIssued = Number(ethers.formatUnits(ngnVidaSupplyWei, DECIMALS));

    const result = {
      vidaLockedInSink: vidaLocked,
      ngnVidaIssued,
      sinkAddress: NATIONAL_BLOCK_SINK,
    };

    if (wallet && wallet.length === 42 && wallet.startsWith('0x')) {
      const balanceWei = await ngnVida.balanceOf(wallet);
      result.walletNgnVidaBalance = Number(ethers.formatUnits(balanceWei, DECIMALS));
    }

    return json(200, result);
  } catch (err) {
    console.error('national-reserve error:', err);
    return json(500, { error: 'Failed to fetch reserve data', detail: err.message || String(err) });
  }
};
