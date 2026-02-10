/**
 * PFF Sentinel — Status bridge: minting_status COMPLETED → Vault Secured UI
 * Listens for minting_status == 'COMPLETED' (or vida_minted == true) on profiles
 * and triggers a 'Vault Secured' notification on the UI.
 *
 * Ensure Realtime is enabled for table `profiles` in Supabase:
 * Dashboard → Database → Replication → enable for public.profiles
 */

import { supabase } from './supabase-client.js';

const VAULT_SECURED_EVENT = 'pff-vault-secured';

/**
 * Start the listener that watches for minting_status == 'COMPLETED'.
 * When detected, dispatches a custom event so the UI can show "Vault Secured".
 * @param {Object} [options] - { deviceId: filter to this device only }
 * @returns {() => void} unsubscribe function
 */
export function startMintingStatusListener(options = {}) {
  const { deviceId } = options;

  const channel = supabase
    .channel('minting-status-bridge')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: deviceId ? `device_id=eq.${deviceId}` : undefined,
      },
      (payload) => {
        const row = payload.new || payload;
        const completed =
          row.minting_status === 'COMPLETED' || row.vida_minted === true;
        if (completed) {
          window.dispatchEvent(
            new CustomEvent(VAULT_SECURED_EVENT, {
              detail: {
                device_id: row.device_id,
                minting_status: row.minting_status,
                vida_minted: row.vida_minted,
              },
            })
          );
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to Vault Secured notifications (e.g. in app entry point).
 * @param {(detail: any) => void} callback
 * @returns {() => void} unsubscribe
 */
export function onVaultSecured(callback) {
  const handler = (e) => callback(e.detail || {});
  window.addEventListener(VAULT_SECURED_EVENT, handler);
  return () => window.removeEventListener(VAULT_SECURED_EVENT, handler);
}

export { VAULT_SECURED_EVENT };
