/**
 * SOVRYN Audit API — Challenge (Channel 2)
 * GET /v1/sovryn/challenge → one-time nonce, valid 60s.
 * Returns 401 if x-sovryn-secret is missing or incorrect (Channel 3).
 */

const crypto = require('crypto');
const NONCE_TTL_SEC = 60;

function getSecret() {
  return process.env.SOVRYN_SECRET || process.env.VITE_SOVRYN_SECRET || '';
}

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'GET') {
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

  const nonce = crypto.randomBytes(16).toString('hex');
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      nonce,
      challenge: nonce,
      expires_in: NONCE_TTL_SEC,
    }),
  };
};
