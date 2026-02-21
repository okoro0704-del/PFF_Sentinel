/**
 * Mainnet distribution — hardcoded destinations for releaseVidaCap
 * Used by the Sentinel UI (display) and must match the audit API / contract.
 */

/** National Block Nigeria — mainnet destination */
export const NATIONAL_BLOCK_NG = '0x7EC87F9A1E828De66fAB5bF457A0A302236Fb747';

/** National Block Sink — lock-up destination for swapToNational (same as NATIONAL_BLOCK_NG) */
export const NATIONAL_BLOCK_SINK = '0x7EC87F9A1E828De66fAB5bF457A0A302236Fb747';

/** ngnVIDA token contract — mint target for National Lock-Up Bridge */
export const NGN_VIDA_CONTRACT = '0x839a16B255720EE8ba525555075BA763172be284';

/** Display symbol for national Naira-backed token */
export const NGN_VIDA_SYMBOL = 'ngnVIDA';

/** Foundation Vault — mainnet destination */
export const FOUNDATION_VAULT = '0x5d1F4d086885b7b1A2cF1afDE0BA8d0c70e02a28';

const DESTINATIONS = [NATIONAL_BLOCK_NG.toLowerCase(), FOUNDATION_VAULT.toLowerCase()];

/**
 * Validation: user address must not be a destination (prevents circular minting).
 * @param {string} userAddress
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateUserAddress(userAddress) {
  if (!userAddress || typeof userAddress !== 'string') {
    return { valid: false, reason: 'Missing user address' };
  }
  const addr = userAddress.trim().toLowerCase();
  if (DESTINATIONS.includes(addr)) {
    return { valid: false, reason: 'User address cannot be National Block or Foundation Vault' };
  }
  if (addr.length !== 42 || !addr.startsWith('0x')) {
    return { valid: false, reason: 'Invalid address format' };
  }
  return { valid: true };
}
