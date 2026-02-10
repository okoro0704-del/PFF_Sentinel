/**
 * PFF Sentinel — Sovereign Provider (RSK Web3)
 * Rootstock (RSK) blockchain connection for VIDA token and on-chain verification
 */

import { ethers } from 'ethers';

// Rootstock (RSK) Network Configuration
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

// Default to testnet (change to 'mainnet' for production)
const ACTIVE_NETWORK = import.meta.env.VITE_RSK_NETWORK || 'testnet';

// Token Contract Addresses (deploy your contracts and update these)
const VIDA_TOKEN_ADDRESS = import.meta.env.VITE_VIDA_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000';
const DLLR_TOKEN_ADDRESS = import.meta.env.VITE_DLLR_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000';
const USDT_TOKEN_ADDRESS = import.meta.env.VITE_USDT_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000';

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
let signer = null;
let vidaContract = null;
let dllrContract = null;
let usdtContract = null;
let connectedAddress = null;

/**
 * Initialize RSK provider (read-only)
 * @returns {ethers.JsonRpcProvider}
 */
export function initProvider() {
  if (!provider) {
    const network = RSK_NETWORKS[ACTIVE_NETWORK];
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

/**
 * Connect wallet (MetaMask or other Web3 wallet)
 * @returns {Promise<{success: boolean, address?: string, error?: any}>}
 */
export async function connectWallet() {
  try {
    if (!window.ethereum) {
      return { 
        success: false, 
        error: 'No Web3 wallet detected. Please install MetaMask.' 
      };
    }

    // Request account access
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });

    if (!accounts || accounts.length === 0) {
      return { success: false, error: 'No accounts found' };
    }

    // Create browser provider and signer
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    signer = await browserProvider.getSigner();
    connectedAddress = await signer.getAddress();

    // Check if connected to correct network
    const network = await browserProvider.getNetwork();
    const expectedChainId = RSK_NETWORKS[ACTIVE_NETWORK].chainId;

    if (Number(network.chainId) !== expectedChainId) {
      // Request network switch
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${expectedChainId.toString(16)}` }]
        });
      } catch (switchError) {
        // Network not added, try to add it
        if (switchError.code === 4902) {
          await addRSKNetwork();
        } else {
          throw switchError;
        }
      }
    }

    // Initialize token contracts
    vidaContract = new ethers.Contract(VIDA_TOKEN_ADDRESS, VIDA_TOKEN_ABI, signer);
    dllrContract = new ethers.Contract(DLLR_TOKEN_ADDRESS, ERC20_ABI, signer);
    usdtContract = new ethers.Contract(USDT_TOKEN_ADDRESS, ERC20_ABI, signer);

    return { success: true, address: connectedAddress };
  } catch (err) {
    console.error('Wallet connection error:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * Add RSK network to MetaMask
 */
async function addRSKNetwork() {
  const network = RSK_NETWORKS[ACTIVE_NETWORK];
  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: `0x${network.chainId.toString(16)}`,
      chainName: network.name,
      nativeCurrency: { name: 'RBTC', symbol: 'RBTC', decimals: 18 },
      rpcUrls: [network.rpcUrl],
      blockExplorerUrls: [network.explorerUrl]
    }]
  });
}

/**
 * Get connected wallet address
 * @returns {string|null}
 */
export function getConnectedAddress() {
  return connectedAddress;
}

/**
 * Get VIDA token contract instance
 * @returns {ethers.Contract|null}
 */
export function getVidaContract() {
  return vidaContract;
}

/**
 * Check if wallet is connected
 * @returns {boolean}
 */
export function isWalletConnected() {
  return !!connectedAddress && !!signer;
}

/**
 * Get network info
 * @returns {Object}
 */
export function getNetworkInfo() {
  return RSK_NETWORKS[ACTIVE_NETWORK];
}

/**
 * Get DLLR token contract instance
 * @returns {ethers.Contract|null}
 */
export function getDllrContract() {
  return dllrContract;
}

/**
 * Get USDT token contract instance
 * @returns {ethers.Contract|null}
 */
export function getUsdtContract() {
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

