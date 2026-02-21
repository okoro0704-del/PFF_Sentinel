# Netlify environment variables — PFF Sentinel

Copy the values from your **other project** (PFF, SOVRYN CHAIN, or LifeOS backend) into Netlify for this site.

**Where to set:** Netlify → Your site → **Site configuration** → **Environment variables** (or **Build & deploy** → **Environment**).

---

## 1. Variables to add in Netlify

Set these in Netlify. Use the same values as in your other project where noted.

| Variable | Where it's used | Copy from / Notes |
|----------|------------------|-------------------|
| **NEXT_PUBLIC_SUPABASE_URL** | Supabase client (browser) | Same as PFF / SOVRYN CHAIN `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | Supabase client (browser) | Same as PFF / SOVRYN CHAIN `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **SOVRYN_SECRET** | Netlify Functions (sovryn-challenge, sovryn-audit) | Your shared SOVRYN secret; **must match** what the frontend sends as `NEXT_PUBLIC_SOVRYN_SECRET` |
| **NEXT_PUBLIC_SOVRYN_API_URL** | Browser (audit API base URL) | **This Netlify site URL** (e.g. `https://your-pff-sentinel.netlify.app`) so `/v1/sovryn/*` hits the functions |
| **NEXT_PUBLIC_SOVRYN_SECRET** | Browser (x-sovryn-secret header) | Same value as `SOVRYN_SECRET` (only for client requests) |
| **NEXT_PUBLIC_RSK_NETWORK** | RSK/blockchain (browser) | `testnet` or `mainnet` — match other project |
| **NEXT_PUBLIC_CONTRACT_ADDRESS** | VIDA contract (mainnet hook; overrides VIDA_TOKEN_ADDRESS) | New mainnet contract address |
| **NEXT_PUBLIC_VIDA_TOKEN_ADDRESS** | VIDA contract (browser) | Same as other project `VIDA_TOKEN_ADDRESS` / `NEXT_PUBLIC_VIDA_TOKEN_ADDRESS` |
| **NEXT_PUBLIC_DLLR_TOKEN_ADDRESS** | DLLR contract (browser) | Same as other project if you use DLLR |
| **NEXT_PUBLIC_USDT_TOKEN_ADDRESS** | USDT contract (browser) | Same as other project if you use USDT |
| **NEXT_PUBLIC_EXPECTED_COUNTRY** | Origin pinning (browser) | e.g. `NG` — match your allowed country |
| **RSL_WS_URL** | RSL listener (browser if set at build) | Same as LifeOS/RSL backend `wss://...` |
| **RSL_POLL_URL** | RSL listener (browser if set at build) | Same as LifeOS/RSL backend `https://...` |
| **NEXT_PUBLIC_GEO_CHECK_URL** | (Optional) Geo/VPN check | Your geo API URL if you use one |
| **NEXT_PUBLIC_LIVENESS_MIN** | (Optional) Liveness threshold | e.g. `0.98` or `0.01` for dev |
| **POLYGON_RPC_URL** | Netlify Function (sovryn-audit) | Polygon RPC (e.g. `https://polygon-rpc.com` or Alchemy/Infura) for `releaseVidaCap` |
| **CONTRACT_ADDRESS** | Netlify Function (sovryn-audit) | Same as `NEXT_PUBLIC_CONTRACT_ADDRESS` — VIDA contract that has `releaseVidaCap` |
| **WALLET_PRIVATE_KEY** | Netlify Function (sovryn-audit, swap-to-national) | Signer wallet private key (no `0x` prefix or with; keep secret). Used server-side for `releaseVidaCap` and nVida.mint. |
| **SUPABASE_SERVICE_ROLE_KEY** | Netlify Function (swap-to-national) | Supabase service role key (bypasses RLS). Required to increment `national_blocks.total_vida_reserved`. |
| **NGN_VIDA_CONTRACT_ADDRESS** | (Optional) Netlify Function (swap-to-national) | Override ngnVIDA contract (default: `0x839a16B255720EE8ba525555075BA763172be284`). |
| **USD_TO_NGN_RATE** | (Optional) Netlify Function (swap-to-national) | Fixed USD→NGN rate; if set, skips live rate fetch. |
| **USD_NGN_RATE_URL** | (Optional) Netlify Function (swap-to-national) | API URL for live USD/NGN (default: exchangerate-api.com v4). |
| **USD_TO_NGN_FALLBACK** | (Optional) Netlify Function (swap-to-national) | Fallback rate if live fetch fails (default 1500). |
| **GAS_DRIP_AMOUNT** | (Optional) Netlify Function (gas-drip) | POL amount per user (default 0.001). Run via external cron monthly. |

---

## 2. Copy-paste template (fill from other project)

Use this as a checklist. Replace the placeholders with values from your **other project** and then add each line in Netlify’s **Environment variables** (key = name, value = after `=`).

```env
# --- Supabase (must match PFF & SOVRYN CHAIN) ---
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# --- SOVRYN Audit (this Netlify site + secret) ---
NEXT_PUBLIC_SOVRYN_API_URL=https://YOUR-PFF-SENTINEL-SITE.netlify.app
NEXT_PUBLIC_SOVRYN_SECRET=your-shared-sovryn-secret
SOVRYN_SECRET=your-shared-sovryn-secret

# --- RSK / Tokens (match other project) ---
NEXT_PUBLIC_RSK_NETWORK=testnet
NEXT_PUBLIC_VIDA_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_DLLR_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_USDT_TOKEN_ADDRESS=0x...

# --- RSL (match LifeOS backend) ---
RSL_WS_URL=wss://your-lifeos.netlify.app/.netlify/functions/rsl-ws
RSL_POLL_URL=https://your-lifeos.netlify.app/.netlify/functions/rsl-poll

# --- Origin pinning ---
NEXT_PUBLIC_EXPECTED_COUNTRY=NG
```

---

## 3. Scopes in Netlify

- **Build / deploy:** Add all of the above so they’re available at build time. For a **static** deploy with no build, Netlify still stores them; client-side code may need to get config from an endpoint or from a small build that injects them.
- **Functions:** `SOVRYN_SECRET`, `POLYGON_RPC_URL`, `CONTRACT_ADDRESS` (or `NEXT_PUBLIC_CONTRACT_ADDRESS`), and `WALLET_PRIVATE_KEY` are read by sovryn-audit. The **swap-to-national** function also needs `VIDA_TOKEN_ADDRESS`, `NGN_VIDA_CONTRACT_ADDRESS` (optional; default ngnVIDA contract above), `WALLET_PRIVATE_KEY`, `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`), and `SUPABASE_SERVICE_ROLE_KEY`. The rest are for the frontend.

---

## 4. Quick mapping from “other project”

| If your other project has… | Set in Netlify as… |
|----------------------------|--------------------|
| `SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `VITE_SUPABASE_*` | `NEXT_PUBLIC_SUPABASE_*` (same value) |
| `VIDA_TOKEN_ADDRESS` / `VITE_VIDA_*` | `NEXT_PUBLIC_VIDA_TOKEN_ADDRESS` |
| `RSK_NETWORK` / `VITE_RSK_*` | `NEXT_PUBLIC_RSK_NETWORK` |
| RSL backend URLs | `RSL_WS_URL`, `RSL_POLL_URL` |
| SOVRYN secret | `SOVRYN_SECRET` and `NEXT_PUBLIC_SOVRYN_SECRET` (same value) |
| This site’s URL | `NEXT_PUBLIC_SOVRYN_API_URL` |

After you set them, trigger a **new deploy** so the new variables are used.
