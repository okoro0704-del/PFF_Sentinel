/**
 * SOVRYN Audit API — Audit (Channel 2 + 3)
 * POST /v1/sovryn/audit → accept signed face-scan payload.
 * Returns 401 if x-sovryn-secret is missing or incorrect (Channel 3).
 * Optionally validates nonce/ts within 60s (Channel 2).
 */

const MAX_AGE_MS = 60 * 1000;

function getSecret() {
  return process.env.SOVRYN_SECRET || process.env.VITE_SOVRYN_SECRET || '';
}

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const secret = getSecret();
  const headerSecret = event.headers['x-sovryn-secret'] || event.headers['X-Sovryn-Secret'];

  if (!secret || headerSecret !== secret) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized: x-sovryn-secret missing or incorrect' }),
    };
  }

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const ts = body.ts;
  if (ts != null && Date.now() - Number(ts) > MAX_AGE_MS) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Audit voided: response after 60s' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ ok: true, received: true }),
  };
};
