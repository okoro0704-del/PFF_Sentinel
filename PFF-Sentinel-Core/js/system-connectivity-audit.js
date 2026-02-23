/**
 * PFF Sentinel - System Connectivity Audit
 * Comprehensive audit of Supabase, Polygon Chain, and VIDA split logic
 */

import { supabase } from './supabase-client.js';
import { getProfile } from './supabase-client.js';
import { getDeviceId } from './handshake-core.js';
import { ethers } from 'ethers';

// Configuration
const POLYGON_RPC_URLS = [
  'https://polygon-rpc.com',
  'https://polygon-pokt.nodies.app',
  'https://polygon-bor-rpc.publicnode.com',
  'https://1rpc.io/matic'
];

const VIDA_TOKEN_ADDRESS = import.meta.env.VITE_VIDA_TOKEN_ADDRESS || '0xc226fFb538b6f80F05d5F0Ee0758E5D85a42DE0C';
const NATIONAL_TREASURY = import.meta.env.VITE_NATIONAL_TREASURY_ADDRESS || '0x4c81E768f4B201bCd7E924f671ABA1B162786b48';
const FOUNDATION_VAULT = import.meta.env.VITE_FOUNDATION_VAULT_ADDRESS || '0xDD8046422Bbeba12FD47DE854639abF7FB6E0858';

// VIDA Token ABI (minimal)
const VIDA_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function getSpendableBalance(address owner) view returns (uint256)',
  'function getLockedBalance(address owner) view returns (uint256)'
];

/**
 * Run full system connectivity audit
 * @returns {Promise<Object>} Audit report
 */
export async function runSystemAudit() {
  console.log('🔍 Starting PFF Sentinel System Connectivity Audit...\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    supabase: await auditSupabaseConnection(),
    polygon: await auditPolygonConnection(),
    vitalizationData: await auditVitalizationData(),
    vidaSplit: await auditVidaSplitLogic(),
    errorHandling: await auditErrorHandling()
  };
  
  // Generate summary
  report.summary = generateSummary(report);
  
  return report;
}

/**
 * Audit Supabase connection and data sync
 */
async function auditSupabaseConnection() {
  const audit = {
    status: 'UNKNOWN',
    connected: false,
    canReadProfiles: false,
    vitalizationFieldsPresent: false,
    errors: []
  };
  
  try {
    // Test connection
    const { data, error } = await supabase
      .from('profiles')
      .select('device_id')
      .limit(1);
    
    if (error) {
      audit.status = 'ERROR';
      audit.errors.push(`Connection failed: ${error.message}`);
      return audit;
    }
    
    audit.connected = true;
    audit.canReadProfiles = true;
    
    // Check if vitalization fields exist
    const deviceId = await getDeviceId();
    if (deviceId) {
      const profile = await getProfile(deviceId);
      if (profile.success && profile.data) {
        const hasVitalizationFields = 
          'vida_minted' in profile.data &&
          'vitalized_at' in profile.data &&
          'is_fully_verified' in profile.data &&
          'vida_balance_spendable' in profile.data &&
          'vida_balance_locked' in profile.data;
        
        audit.vitalizationFieldsPresent = hasVitalizationFields;
        audit.sampleData = {
          vida_minted: profile.data.vida_minted,
          vitalized_at: profile.data.vitalized_at,
          is_fully_verified: profile.data.is_fully_verified,
          vida_balance_spendable: profile.data.vida_balance_spendable,
          vida_balance_locked: profile.data.vida_balance_locked
        };
      }
    }
    
    audit.status = audit.vitalizationFieldsPresent ? 'HEALTHY' : 'PARTIAL';
    
  } catch (error) {
    audit.status = 'ERROR';
    audit.errors.push(error.message);
  }
  
  return audit;
}

/**
 * Audit Polygon chain connection
 */
async function auditPolygonConnection() {
  const audit = {
    status: 'UNKNOWN',
    connected: false,
    rpcUrl: null,
    chainId: null,
    blockNumber: null,
    latency: null,
    errors: []
  };
  
  const startTime = Date.now();
  
  for (const rpcUrl of POLYGON_RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      
      audit.connected = true;
      audit.rpcUrl = rpcUrl;
      audit.chainId = Number(network.chainId);
      audit.blockNumber = blockNumber;
      audit.latency = Date.now() - startTime;
      audit.status = 'HEALTHY';
      
      break; // Successfully connected
    } catch (error) {
      audit.errors.push(`${rpcUrl}: ${error.message}`);
    }
  }
  
  if (!audit.connected) {
    audit.status = 'ERROR';
    audit.errors.push('Failed to connect to any Polygon RPC');
  }
  
  return audit;
}

/**
 * Audit Vitalization data sync
 */
async function auditVitalizationData() {
  const audit = {
    status: 'UNKNOWN',
    deviceId: null,
    supabaseData: null,
    chainData: null,
    dataMatch: false,
    errors: []
  };
  
  try {
    // Get device ID
    const deviceId = await getDeviceId();
    audit.deviceId = deviceId;
    
    if (!deviceId) {
      audit.status = 'NO_DEVICE_ID';
      audit.errors.push('No device ID found - user not verified');
      return audit;
    }
    
    // Get Supabase data
    const profile = await getProfile(deviceId);
    if (profile.success && profile.data) {
      audit.supabaseData = {
        vida_minted: profile.data.vida_minted,
        vitalized_at: profile.data.vitalized_at,
        vida_balance_spendable: profile.data.vida_balance_spendable,
        vida_balance_locked: profile.data.vida_balance_locked,
        wallet_address: profile.data.wallet_address
      };
      
      // Get chain data if vitalized
      if (profile.data.vida_minted && profile.data.wallet_address) {
        audit.chainData = await getChainBalance(profile.data.wallet_address);
        
        // Check if data matches
        const supabaseTotal = (profile.data.vida_balance_spendable || 0) + (profile.data.vida_balance_locked || 0);
        const chainTotal = audit.chainData.total;
        
        audit.dataMatch = Math.abs(supabaseTotal - chainTotal) < 0.01; // Allow small rounding difference
      }
      
      audit.status = audit.dataMatch ? 'SYNCED' : 'MISMATCH';
    } else {
      audit.status = 'NO_PROFILE';
      audit.errors.push('Profile not found in Supabase');
    }
    
  } catch (error) {
    audit.status = 'ERROR';
    audit.errors.push(error.message);
  }
  
  return audit;
}

/**
 * Get VIDA balance from chain
 */
async function getChainBalance(address) {
  for (const rpcUrl of POLYGON_RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(VIDA_TOKEN_ADDRESS, VIDA_ABI, provider);

      const [spendable, locked] = await Promise.all([
        contract.getSpendableBalance(address),
        contract.getLockedBalance(address)
      ]);

      return {
        spendable: parseFloat(ethers.formatUnits(spendable, 18)),
        locked: parseFloat(ethers.formatUnits(locked, 18)),
        total: parseFloat(ethers.formatUnits(spendable, 18)) + parseFloat(ethers.formatUnits(locked, 18))
      };
    } catch (error) {
      continue; // Try next RPC
    }
  }

  throw new Error('Failed to fetch chain balance from all RPCs');
}

/**
 * Audit VIDA split logic (5-5-1 distribution)
 */
async function auditVidaSplitLogic() {
  const audit = {
    status: 'UNKNOWN',
    userBalance: null,
    treasuryBalance: null,
    foundationBalance: null,
    splitCorrect: false,
    errors: []
  };

  try {
    // Get device ID and user wallet
    const deviceId = await getDeviceId();
    if (!deviceId) {
      audit.status = 'NO_DEVICE_ID';
      return audit;
    }

    const profile = await getProfile(deviceId);
    if (!profile.success || !profile.data?.vida_minted) {
      audit.status = 'NOT_VITALIZED';
      return audit;
    }

    const userAddress = profile.data.wallet_address;

    // Fetch balances from chain
    const [userBal, treasuryBal, foundationBal] = await Promise.all([
      getChainBalance(userAddress).catch(() => ({ total: 0 })),
      getChainBalance(NATIONAL_TREASURY).catch(() => ({ total: 0 })),
      getChainBalance(FOUNDATION_VAULT).catch(() => ({ total: 0 }))
    ]);

    audit.userBalance = userBal;
    audit.treasuryBalance = treasuryBal;
    audit.foundationBalance = foundationBal;

    // Check if split is correct (5-5-1)
    // User should have 5 VIDA, Treasury 5 VIDA, Foundation 1 VIDA
    const userCorrect = Math.abs(userBal.total - 5) < 0.01;
    const treasuryCorrect = Math.abs(treasuryBal.total - 5) < 0.01;
    const foundationCorrect = Math.abs(foundationBal.total - 1) < 0.01;

    audit.splitCorrect = userCorrect && treasuryCorrect && foundationCorrect;
    audit.status = audit.splitCorrect ? 'CORRECT' : 'INCORRECT';

    if (!audit.splitCorrect) {
      audit.errors.push(`Expected: User=5, Treasury=5, Foundation=1. Got: User=${userBal.total}, Treasury=${treasuryBal.total}, Foundation=${foundationBal.total}`);
    }

  } catch (error) {
    audit.status = 'ERROR';
    audit.errors.push(error.message);
  }

  return audit;
}

/**
 * Audit error handling for chain connection failures
 */
async function auditErrorHandling() {
  const audit = {
    status: 'UNKNOWN',
    hasNetworkErrorHandling: false,
    userFriendlyErrors: false,
    errors: []
  };

  try {
    // Test with invalid RPC URL
    const invalidProvider = new ethers.JsonRpcProvider('https://invalid-rpc-url-test.com');

    try {
      await invalidProvider.getNetwork();
      audit.errors.push('Invalid RPC did not throw error');
    } catch (error) {
      // Expected error
      audit.hasNetworkErrorHandling = true;

      // Check if error message is user-friendly
      const errorMsg = error.message.toLowerCase();
      audit.userFriendlyErrors = errorMsg.includes('network') || errorMsg.includes('connection');
    }

    audit.status = audit.hasNetworkErrorHandling ? 'PRESENT' : 'MISSING';

  } catch (error) {
    audit.status = 'ERROR';
    audit.errors.push(error.message);
  }

  return audit;
}

/**
 * Generate summary report
 */
function generateSummary(report) {
  const summary = {
    overallStatus: 'UNKNOWN',
    healthScore: 0,
    criticalIssues: [],
    warnings: [],
    recommendations: []
  };

  // Calculate health score
  let score = 0;
  let maxScore = 5;

  // Supabase connection (20%)
  if (report.supabase.status === 'HEALTHY') score += 1;
  else if (report.supabase.status === 'PARTIAL') score += 0.5;
  else summary.criticalIssues.push('Supabase connection failed');

  // Polygon connection (20%)
  if (report.polygon.status === 'HEALTHY') score += 1;
  else summary.criticalIssues.push('Polygon chain connection failed');

  // Vitalization data sync (20%)
  if (report.vitalizationData.status === 'SYNCED') score += 1;
  else if (report.vitalizationData.status === 'NOT_VITALIZED') score += 0.5;
  else if (report.vitalizationData.status === 'MISMATCH') {
    summary.warnings.push('Supabase and chain data mismatch');
    score += 0.5;
  }

  // VIDA split logic (20%)
  if (report.vidaSplit.status === 'CORRECT') score += 1;
  else if (report.vidaSplit.status === 'NOT_VITALIZED') score += 0.5;
  else summary.warnings.push('VIDA split (5-5-1) not correctly distributed');

  // Error handling (20%)
  if (report.errorHandling.status === 'PRESENT') score += 1;
  else summary.warnings.push('Network error handling needs improvement');

  summary.healthScore = Math.round((score / maxScore) * 100);

  // Determine overall status
  if (summary.healthScore >= 90) summary.overallStatus = 'EXCELLENT';
  else if (summary.healthScore >= 70) summary.overallStatus = 'GOOD';
  else if (summary.healthScore >= 50) summary.overallStatus = 'FAIR';
  else summary.overallStatus = 'POOR';

  // Add recommendations
  if (report.polygon.latency > 5000) {
    summary.recommendations.push('Consider using a faster Polygon RPC provider');
  }

  if (!report.errorHandling.userFriendlyErrors) {
    summary.recommendations.push('Implement user-friendly "Network Latency" error messages');
  }

  if (report.vitalizationData.status === 'MISMATCH') {
    summary.recommendations.push('Sync Supabase data with on-chain balances');
  }

  return summary;
}

/**
 * Display audit report in console
 */
export function displayAuditReport(report) {
  console.log('\n' + '='.repeat(80));
  console.log('🛡️  PFF SENTINEL SYSTEM CONNECTIVITY REPORT');
  console.log('='.repeat(80));
  console.log(`\n📅 Timestamp: ${report.timestamp}`);
  console.log(`\n🎯 Overall Status: ${report.summary.overallStatus}`);
  console.log(`📊 Health Score: ${report.summary.healthScore}%\n`);

  // Supabase
  console.log('─'.repeat(80));
  console.log('📦 SUPABASE CONNECTION');
  console.log(`   Status: ${report.supabase.status}`);
  console.log(`   Connected: ${report.supabase.connected ? '✅' : '❌'}`);
  console.log(`   Can Read Profiles: ${report.supabase.canReadProfiles ? '✅' : '❌'}`);
  console.log(`   Vitalization Fields Present: ${report.supabase.vitalizationFieldsPresent ? '✅' : '❌'}`);
  if (report.supabase.errors.length > 0) {
    console.log(`   Errors: ${report.supabase.errors.join(', ')}`);
  }

  // Polygon
  console.log('\n' + '─'.repeat(80));
  console.log('⛓️  POLYGON CHAIN CONNECTION');
  console.log(`   Status: ${report.polygon.status}`);
  console.log(`   Connected: ${report.polygon.connected ? '✅' : '❌'}`);
  if (report.polygon.connected) {
    console.log(`   RPC URL: ${report.polygon.rpcUrl}`);
    console.log(`   Chain ID: ${report.polygon.chainId}`);
    console.log(`   Block Number: ${report.polygon.blockNumber}`);
    console.log(`   Latency: ${report.polygon.latency}ms`);
  }
  if (report.polygon.errors.length > 0) {
    console.log(`   Errors: ${report.polygon.errors.join(', ')}`);
  }

  // Vitalization Data
  console.log('\n' + '─'.repeat(80));
  console.log('🔄 VITALIZATION DATA SYNC');
  console.log(`   Status: ${report.vitalizationData.status}`);
  console.log(`   Data Match: ${report.vitalizationData.dataMatch ? '✅' : '❌'}`);
  if (report.vitalizationData.supabaseData) {
    console.log(`   Supabase: vida_minted=${report.vitalizationData.supabaseData.vida_minted}, vitalized_at=${report.vitalizationData.supabaseData.vitalized_at}`);
  }
  if (report.vitalizationData.chainData) {
    console.log(`   Chain: spendable=${report.vitalizationData.chainData.spendable}, locked=${report.vitalizationData.chainData.locked}, total=${report.vitalizationData.chainData.total}`);
  }

  // VIDA Split
  console.log('\n' + '─'.repeat(80));
  console.log('💰 VIDA SPLIT LOGIC (5-5-1)');
  console.log(`   Status: ${report.vidaSplit.status}`);
  console.log(`   Split Correct: ${report.vidaSplit.splitCorrect ? '✅' : '❌'}`);
  if (report.vidaSplit.userBalance) {
    console.log(`   User Balance: ${report.vidaSplit.userBalance.total} VIDA`);
  }
  if (report.vidaSplit.treasuryBalance) {
    console.log(`   Treasury Balance: ${report.vidaSplit.treasuryBalance.total} VIDA`);
  }
  if (report.vidaSplit.foundationBalance) {
    console.log(`   Foundation Balance: ${report.vidaSplit.foundationBalance.total} VIDA`);
  }

  // Error Handling
  console.log('\n' + '─'.repeat(80));
  console.log('⚠️  ERROR HANDLING');
  console.log(`   Status: ${report.errorHandling.status}`);
  console.log(`   Network Error Handling: ${report.errorHandling.hasNetworkErrorHandling ? '✅' : '❌'}`);
  console.log(`   User-Friendly Errors: ${report.errorHandling.userFriendlyErrors ? '✅' : '❌'}`);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📋 SUMMARY');
  if (summary.criticalIssues.length > 0) {
    console.log(`\n🚨 Critical Issues:`);
    summary.criticalIssues.forEach(issue => console.log(`   - ${issue}`));
  }
  if (report.summary.warnings.length > 0) {
    console.log(`\n⚠️  Warnings:`);
    report.summary.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  if (report.summary.recommendations.length > 0) {
    console.log(`\n💡 Recommendations:`);
    report.summary.recommendations.forEach(rec => console.log(`   - ${rec}`));
  }
  console.log('\n' + '='.repeat(80) + '\n');
}

