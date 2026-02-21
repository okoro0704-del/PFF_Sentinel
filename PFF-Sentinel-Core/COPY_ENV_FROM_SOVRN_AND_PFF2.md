# Copy env from sovrn + pff2 → this Netlify project

I **cannot read** your Netlify Environment Variables (they’re only in your Netlify dashboard).  
Use this as a checklist: copy from **sovrn** and **pff2** in the UI, then add any missing ones below.

---

## What’s visible from the sites (no dashboard access)

- **https://sovrn.netlify.app**  
  - Page text says it uses: **`NEXT_PUBLIC_API_URL`** and **`NEXT_PUBLIC_API_KEY`**.  
  - So in **sovrn**’s Netlify env you should have at least those two; copy their **values** here.

- **https://pff2.netlify.app**  
  - Public page only shows “PFF — Vitalization Manifesto” and “Loading…”.  
  - No env var names are visible; **pff2** likely has Supabase, RSK, and maybe RSL vars. Copy **all** env vars from **pff2**’s Netlify → Environment variables into this project where the names match below.

---

## Step 1: Copy from Netlify (you do this)

1. **sovrn.netlify.app**  
   Netlify → **sovrn** site → **Site configuration** → **Environment variables**.  
   Copy every variable (especially **NEXT_PUBLIC_API_URL**, **NEXT_PUBLIC_API_KEY**, and any Supabase/SOVRYN/secret vars).

2. **pff2.netlify.app**  
   Netlify → **pff2** site → **Site configuration** → **Environment variables**.  
   Copy every variable (Supabase, RSK, VIDA, RSL, etc.).

3. **This project** (PFF Sentinel)  
   Netlify → **this** site → **Site configuration** → **Environment variables**.  
   Add the variables listed in the table below. Use values you copied from sovrn/pff2 where the meaning matches; fill “What I don’t have” yourself.

---

## Step 2: Mapping into this project

Set these on **this** Netlify site. Use values from sovrn/pff2 when the name or purpose matches.

| Variable to set here | Copy from sovrn? | Copy from pff2? | If you don’t have it |
|----------------------|------------------|------------------|----------------------|
| **NEXT_PUBLIC_SUPABASE_URL** | Maybe (if they use same Supabase) | Yes, if they have SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL | Use your Supabase project URL |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | Maybe | Yes, if they have SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY | Use your Supabase anon key |
| **NEXT_PUBLIC_API_URL** | **Yes** (they mention it) | Maybe | Backend API base URL (e.g. sovrn or this site) |
| **NEXT_PUBLIC_API_KEY** | **Yes** (they mention it) | Maybe | Same value as API key on backend |
| **SOVRYN_SECRET** | Yes, if present | Maybe | Shared secret for /v1/sovryn/* (must match backend) |
| **NEXT_PUBLIC_SOVRYN_API_URL** | — | — | **This site’s URL** (e.g. `https://your-pff-sentinel.netlify.app`) |
| **NEXT_PUBLIC_SOVRYN_SECRET** | Yes, if present | Maybe | Same value as SOVRYN_SECRET (for client header) |
| **NEXT_PUBLIC_RSK_NETWORK** | Maybe | Yes, if present | `testnet` or `mainnet` |
| **NEXT_PUBLIC_VIDA_TOKEN_ADDRESS** | Maybe | Yes, if present | VIDA contract address |
| **NEXT_PUBLIC_DLLR_TOKEN_ADDRESS** | Maybe | Yes, if present | DLLR contract or leave empty |
| **NEXT_PUBLIC_USDT_TOKEN_ADDRESS** | Maybe | Yes, if present | USDT contract or leave empty |
| **NEXT_PUBLIC_EXPECTED_COUNTRY** | Maybe | Yes, if present | e.g. `NG` |
| **RSL_WS_URL** | Maybe | Yes, if present | RSL WebSocket URL (wss://…) |
| **RSL_POLL_URL** | Maybe | Yes, if present | RSL poll URL (https://…) |
| **NEXT_PUBLIC_GEO_CHECK_URL** | — | — | Optional; only if you use a geo API |
| **NEXT_PUBLIC_LIVENESS_MIN** | — | — | Optional; e.g. `0.98` or `0.01` for dev |

---

## What I don’t have (you need to get these)

I can’t see your Netlify env, so **you** must copy or create:

1. **Supabase**  
   - **NEXT_PUBLIC_SUPABASE_URL**  
   - **NEXT_PUBLIC_SUPABASE_ANON_KEY**  
   From: pff2 (or sovrn) if they use the same Supabase project. Otherwise from Supabase dashboard → Settings → API.

2. **SOVRYN / API**  
   - **NEXT_PUBLIC_API_URL** and **NEXT_PUBLIC_API_KEY** from **sovrn** (they’re mentioned on the page).  
   - **SOVRYN_SECRET** and **NEXT_PUBLIC_SOVRYN_SECRET** (same value): from sovrn or your backend if you have a shared secret.

3. **This site’s URL**  
   - **NEXT_PUBLIC_SOVRYN_API_URL** = **this** Netlify site’s URL (e.g. `https://your-pff-sentinel.netlify.app`). Not from sovrn/pff2.

4. **Blockchain (if you use them)**  
   - **NEXT_PUBLIC_RSK_NETWORK**, **NEXT_PUBLIC_VIDA_TOKEN_ADDRESS**, **NEXT_PUBLIC_DLLR_TOKEN_ADDRESS**, **NEXT_PUBLIC_USDT_TOKEN_ADDRESS**  
   From: pff2 (or sovrn) if they’re set there; otherwise from your deployment/contract config.

5. **RSL (if you use Remote Sovereign Lock)**  
   - **RSL_WS_URL**, **RSL_POLL_URL**  
   From: pff2 or your LifeOS/RSL backend.

6. **Optional**  
   - **NEXT_PUBLIC_EXPECTED_COUNTRY** (e.g. `NG`)  
   - **NEXT_PUBLIC_GEO_CHECK_URL**, **NEXT_PUBLIC_LIVENESS_MIN** if you use them.

---

## Optional: use this project’s names on sovrn/pff2

If you prefer **this** project’s names everywhere, on sovrn/pff2 you could add (and use in code if needed):

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- `NEXT_PUBLIC_SOVRYN_API_URL` (pointing to this site or the audit API)  
- `NEXT_PUBLIC_SOVRYN_SECRET`  
- `SOVRYN_SECRET` (for any serverless functions)

Then you can copy the same keys from sovrn/pff2 into this project without renaming.

---

**Summary:** Copy all env from **sovrn** and **pff2** in Netlify into this site. Set **NEXT_PUBLIC_SOVRYN_API_URL** to **this** site’s URL. Whatever isn’t in sovrn/pff2 (Supabase, VIDA, RSL, etc.) you get from your Supabase/contract/RSL config and add here.
