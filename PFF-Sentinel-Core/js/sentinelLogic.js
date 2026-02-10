/**
 * PFF Sentinel — Bonded to Master Backend
 * Ensures Sentinel has Service Role–equivalent access (or proper RLS) to read
 * citizens and vaults tables in the Master Supabase project.
 *
 * IMPORTANT: Use the same SUPABASE_URL and SUPABASE_ANON_KEY as PFF and SOVRYN CHAIN.
 * For full bypass of RLS (e.g. server-side Sentinel), use SUPABASE_SERVICE_ROLE_KEY
 * only in a secure backend — never in browser/client code.
 */

import { supabase } from './supabase-client.js';

/**
 * Check Sentinel access to Master Backend.
 * RLS must allow: SELECT on citizens, SELECT on vaults (or use service_role server-side).
 * @returns {Promise<{ citizensOk: boolean, vaultsOk: boolean, error?: any }>}
 */
export async function checkSentinelPermissions() {
  const result = { citizensOk: false, vaultsOk: false };

  try {
    // Try reading citizens (Master may use 'citizens' table; fallback to 'profiles' as citizen source)
    const citizensTable = 'citizens';
    const { data: citizensData, error: citizensError } = await supabase
      .from(citizensTable)
      .select('*')
      .limit(1);

    if (citizensError) {
      const fallback = await supabase.from('profiles').select('device_id').limit(1);
      result.citizensOk = !fallback.error;
      if (!result.citizensOk) result.citizensError = fallback.error || citizensError;
    } else {
      result.citizensOk = true;
    }
  } catch (e) {
    result.citizensError = e;
  }

  try {
    const { error: vaultsError } = await supabase
      .from('vaults')
      .select('*')
      .limit(1);
    result.vaultsOk = !vaultsError;
    if (vaultsError) result.vaultsError = vaultsError;
  } catch (e) {
    result.vaultsError = e;
  }

  return result;
}

/**
 * Read citizens from Master Backend.
 * Uses 'citizens' table if present; otherwise returns profiles (citizen records).
 * Requires RLS permitting Sentinel/anon or Service Role.
 * @param {Object} options - { limit, offset }
 * @returns {Promise<{ success: boolean, data?: any[], error?: any }>}
 */
export async function getCitizens(options = {}) {
  const { limit = 100, offset = 0 } = options;
  try {
    const { data, error } = await supabase
      .from('citizens')
      .select('*')
      .range(offset, offset + limit - 1);

    if (!error) return { success: true, data: data || [] };
    const fallback = await supabase.from('profiles').select('*').range(offset, offset + limit - 1);
    if (!fallback.error) return { success: true, data: fallback.data || [] };
    return { success: false, error: fallback.error || error };
  } catch (err) {
    console.error('Sentinel getCitizens error:', err);
    return { success: false, error: err };
  }
}

/**
 * Read vaults from Master Backend.
 * Requires RLS permitting Sentinel/anon or Service Role.
 * @param {Object} options - { limit, offset }
 * @returns {Promise<{ success: boolean, data?: any[], error?: any }>}
 */
export async function getVaults(options = {}) {
  const { limit = 100, offset = 0 } = options;
  try {
    const { data, error } = await supabase
      .from('vaults')
      .select('*')
      .range(offset, offset + limit - 1);

    if (error) return { success: false, error };
    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Sentinel getVaults error:', err);
    return { success: false, error: err };
  }
}
