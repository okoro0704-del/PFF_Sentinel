/**
 * PFF Sentinel — Sovereign Provider (RSK Web3)
 * Rootstock (RSK) blockchain connection for VIDA token and on-chain verification
 */

import { ethers } from 'ethers';

// Network Configuration: RSK + Polygon (mainnet)
const RSK_NETWORKS = {
  mainnet: {
    chainId: 30,
    name: 'RSK Mainnet',
    rpcUrl: 'https://public-node.rsk.co',
    explorerUrl: 'https://explorer.rsk.co'
  },
  testnet: {
    chainId: 31,
    name: 'RSK Testnet',
    rpcUrl: 'https://public-node.testnet.rsk.co',
    explorerUrl: 'https://explorer.testnet.rsk.co'
  }
};

const POLYGON_NETWORKS = {
  mainnet: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com'
  },
  testnet: {
    chainId: 80001,
    name: 'Polygon Amoy',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorerUrl: 'https://amoy.polygonscan.com'
  }
};

// All networks keyed by chain type and mainnet/testnet
const CHAINS = { rsk: RSK_NETWORKS, polygon: POLYGON_NETWORKS };

// Next.js: NEXT_PUBLIC_* or Vite: VITE_*. Values: testnet | mainnet | polygon | polygon_testnet
const NETWORK_ENV =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_RSK_NETWORK) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RSK_NETWORK) ||
  'testnet';

// Resolve to { chain, network } e.g. { chain: 'rsk', network: 'mainnet' } or { chain: 'polygon', network: 'mainnet' }
function resolveNetwork() {
  const v = (NETWORK_ENV || '').toLowerCase();
  if (v === 'polygon' || v === 'polygon_mainnet') return { chain: 'polygon', network: 'mainnet' };
  if (v === 'polygon_testnet' || v === 'polygon_amoy') return { chain: 'polygon', network: 'testnet' };
  if (v === 'mainnet') return { chain: 'rsk', network: 'mainnet' };
  return { chain: 'rsk', network: 'testnet' };
}

const { chain: ACTIVE_CHAIN, network: ACTIVE_NETWORK } = resolveNetwork();

// Contract address: NEXT_PUBLIC_CONTRACT_ADDRESS (mainnet hook) overrides VIDA_TOKEN_ADDRESS
const CONTRACT_ADDRESS_ENV =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CONTRACT_ADDRESS) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CONTRACT_ADDRESS);
const VIDA_TOKEN_ADDRESS =
  CONTRACT_ADDRESS_ENV ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_VIDA_TOKEN_ADDRESS) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VIDA_TOKEN_ADDRESS) ||
  '0x0000000000000000000000000000000000000000';
const DLLR_TOKEN_ADDRESS =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DLLR_TOKEN_ADDRESS) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DLLR_TOKEN_ADDRESS) ||
  '0x0000000000000000000000000000000000000000';
const USDT_TOKEN_ADDRESS =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_USDT_TOKEN_ADDRESS) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USDT_TOKEN_ADDRESS) ||
  '0x0000000000000000000000000000000000000000';

// Standard ERC-20 ABI (for DLLR and USDT)
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

// VIDA Token ABI (ERC-20 + custom minting function)
const VIDA_TOKEN_ABI = [
  // ERC-20 Standard
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  
  // Custom VIDA Functions
  'function mintSovereignCap(address recipient, uint256 spendable, uint256 locked) returns (bool)',
  'function getSpendableBalance(address owner) view returns (uint256)',
  'function getLockedBalance(address owner) view returns (uint256)',
  'function unlockTokens(address owner, uint256 amount) returns (bool)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event SovereignCapMinted(address indexed recipient, uint256 spendable, uint256 locked)'
];

let provider = null;
let vidaContract = null;
let dllrContract = null;
let usdtContract = null;

/**
 * Initialize provider (read-only) — RSK or Polygon based on ACTIVE_CHAIN
 * @returns {ethers.JsonRpcProvider}
 */
export function initProvider() {
  if (!provider) {
    const networks = CHAINS[ACTIVE_CHAIN] || RSK_NETWORKS;
    const network = networks[ACTIVE_NETWORK] || networks.testnet;
    provider = new ethers.JsonRpcProvider(network.rpcUrl, {
      chainId: network.chainId,
      name: network.name
    });
  }
  return provider;
}

/**
 * Get current provider
 * @returns {ethers.JsonRpcProvider}
 */
export function getProvider() {
  return provider || initProvider();
}

// ============================================
// EXTERNAL WALLET FUNCTIONS REMOVED
// PFF uses internal Sovereign Wallets only
// See SovereignWalletTriad.js for wallet management
// ============================================

/**
 * Get VIDA token contract instance (read-only)
 * @returns {ethers.Contract|null}
 */
export function getVidaContract() {
  if (!vidaContract) {
    const p = getProvider();
    vidaContract = new ethers.Contract(VIDA_TOKEN_ADDRESS, VIDA_TOKEN_ABI, p);
  }
  return vidaContract;
}

/**
 * Get network info (RSK or Polygon)
 * @returns {Object}
 */
export function getNetworkInfo() {
  const networks = CHAINS[ACTIVE_CHAIN] || RSK_NETWORKS;
  return networks[ACTIVE_NETWORK] || networks.testnet;
}

/**
 * Get DLLR token contract instance (read-only)
 * @returns {ethers.Contract|null}
 */
export function getDllrContract() {
  if (!dllrContract) {
    const p = getProvider();
    dllrContract = new ethers.Contract(DLLR_TOKEN_ADDRESS, ERC20_ABI, p);
  }
  return dllrContract;
}

/**
 * Get USDT token contract instance (read-only)
 * @returns {ethers.Contract|null}
 */
export function getUsdtContract() {
  if (!usdtContract) {
    const p = getProvider();
    usdtContract = new ethers.Contract(USDT_TOKEN_ADDRESS, ERC20_ABI, p);
  }
  return usdtContract;
}

/**
 * Get token balance for any ERC-20 token
 * @param {string} tokenAddress - Token contract address
 * @param {string} walletAddress - Wallet address to check
 * @returns {Promise<string>} - Balance in ether format
 */
export async function getTokenBalance(tokenAddress, walletAddress) {
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, getProvider());
    const balance = await contract.balanceOf(walletAddress);
    return ethers.formatEther(balance);
  } catch (err) {
    console.error(`Error getting token balance for ${tokenAddress}:`, err);
    return '0.00';
  }
}

/**
 * Get all token balances (VIDA, DLLR, USDT)
 * @param {string} walletAddress - Wallet address to check
 * @returns {Promise<{vida: string, dllr: string, usdt: string}>}
 */
export async function getAllTokenBalances(walletAddress) {
  try {
    const [vidaBalance, dllrBalance, usdtBalance] = await Promise.all([
      vidaContract ? vidaContract.balanceOf(walletAddress).then(b => ethers.formatEther(b)) : '0.00',
      dllrContract ? dllrContract.balanceOf(walletAddress).then(b => ethers.formatEther(b)) : '0.00',
      usdtContract ? usdtContract.balanceOf(walletAddress).then(b => ethers.formatEther(b)) : '0.00'
    ]);

    return {
      vida: vidaBalance,
      dllr: dllrBalance,
      usdt: usdtBalance
    };
  } catch (err) {
    console.error('Error getting token balances:', err);
    return {
      vida: '0.00',
      dllr: '0.00',
      usdt: '0.00'
    };
  }
}

