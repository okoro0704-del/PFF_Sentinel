/**
 * PFF Sentinel — Channel 4: Geographic & Device Pinning (The Origin)
 * Verifies request from authorized device and expected country_code (e.g. 'NG').
 * If IP suggests VPN or location mismatch with user's registered location, flag for manual audit before minting 11 VIDA.
 */

import { isDeviceBound, getDeviceUUID } from './hardware-sync.js';
import { getCurrentLocation, getLocationStatus } from './location-layer.js';
import { getProfile } from './supabase-client.js';

/** Expected country code (e.g. 'NG'). Set via env or config. */
const EXPECTED_COUNTRY = () =>
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_EXPECTED_COUNTRY || import.meta.env?.EXPECTED_COUNTRY)) ||
  (typeof process !== 'undefined' && process.env?.VITE_EXPECTED_COUNTRY) ||
  'NG';

/** Optional: API that returns { country_code, is_vpn } for current IP. Leave empty to use GPS-only. */
const GEO_API_URL = () =>
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GEO_CHECK_URL || import.meta.env?.GEO_CHECK_URL)) ||
  '';

/**
 * Resolve country from IP (if GEO_CHECK_URL is set) or from profile/GPS.
 * @param {string} [deviceId]
 * @returns {Promise<{ country_code: string, source: 'ip'|'profile'|'gps'|'default' }>}
 */
async function getCountryForRequest(deviceId) {
  const geoUrl = GEO_API_URL();
  if (geoUrl) {
    try {
      const res = await fetch(geoUrl);
      if (res.ok) {
        const data = await res.json();
        const code = (data.country_code || data.countryCode || data.country || '').toUpperCase().slice(0, 2);
        if (code) return { country_code: code, source: 'ip' };
      }
    } catch (_) {}
  }

  if (deviceId) {
    const profile = await getProfile(deviceId);
    if (profile.success && profile.data?.country_code) {
      return { country_code: (profile.data.country_code || '').toUpperCase().slice(0, 2), source: 'profile' };
    }
  }

  const gpsStatus = getLocationStatus();
  const loc = getCurrentLocation();
  if (gpsStatus === 'locked' && loc?.countryCode) {
    return { country_code: (loc.countryCode || '').toUpperCase().slice(0, 2), source: 'gps' };
  }

  return { country_code: EXPECTED_COUNTRY(), source: 'default' };
}

/**
 * Channel 4: Run origin check — device authorized + country match; VPN/geo mismatch → manual audit.
 * @param {string} [deviceId] - From getDeviceUUID()
 * @returns {Promise<{
 *   allowed: boolean;
 *   country_code: string;
 *   expected_country: string;
 *   suspected_vpn: boolean;
 *   geo_mismatch: boolean;
 *   manual_audit_required: boolean;
 *   reason?: string;
 * }>}
 */
export async function checkOrigin(deviceId) {
  const expected = EXPECTED_COUNTRY().toUpperCase().slice(0, 2);
  const device = deviceId ?? (await getDeviceUUID());

  const deviceBound = await isDeviceBound();
  if (!deviceBound) {
    return {
      allowed: false,
      country_code: '',
      expected_country: expected,
      suspected_vpn: false,
      geo_mismatch: false,
      manual_audit_required: true,
      reason: 'DEVICE_NOT_AUTHORIZED',
    };
  }

  const { country_code, source } = await getCountryForRequest(device);
  const geoMismatch = country_code && expected && country_code !== expected;

  // VPN detection: if backend/GEO API provides it, use it; otherwise we don't set suspected_vpn
  let suspectedVpn = false;
  const geoUrl = GEO_API_URL();
  if (geoUrl) {
    try {
      const res = await fetch(geoUrl);
      if (res.ok) {
        const data = await res.json();
        suspectedVpn = !!data.is_vpn || !!data.vpn || !!data.proxy;
      }
    } catch (_) {}
  }

  const manualAuditRequired = suspectedVpn || geoMismatch;

  return {
    allowed: true,
    country_code: country_code || expected,
    expected_country: expected,
    suspected_vpn: suspectedVpn,
    geo_mismatch: geoMismatch,
    manual_audit_required: manualAuditRequired,
    reason: manualAuditRequired
      ? (suspectedVpn ? 'SUSPECTED_VPN' : 'GEO_MISMATCH')
      : undefined,
  };
}
