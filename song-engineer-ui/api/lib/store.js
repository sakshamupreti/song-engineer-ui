/**
 * Durable user store for SongEngineer sync.
 * Primary: JSONBlob (works without env vars)
 * Optional: SE_SYNC_BLOB_ID override
 *
 * Note: free JSONBlob expires ~24h unless kept alive (see /api/cron/keepalive).
 */

const BLOB_ID =
  process.env.SE_SYNC_BLOB_ID || '019f598a-cc89-73fb-8c8c-fb7c7e80a53e';
const BLOB_URL = `https://jsonblob.com/api/jsonBlob/${BLOB_ID}`;
const AUTH_SECRET = process.env.SE_AUTH_SECRET || 'songengineer-prod-sync-v2';

// Warm instance cache
let cache = null;
let cacheAt = 0;
let writeChain = Promise.resolve();

function emptyDb() {
  return { users: {}, meta: { app: 'songengineer', v: 2 } };
}

async function loadDb() {
  const now = Date.now();
  if (cache && now - cacheAt < 3000) return cache;
  try {
    const res = await fetch(BLOB_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`blob load ${res.status}`);
    const data = await res.json();
    if (!data || typeof data !== 'object') throw new Error('bad blob');
    if (!data.users || typeof data.users !== 'object') data.users = {};
    cache = data;
    cacheAt = now;
    return data;
  } catch (err) {
    console.error('store load failed', err);
    if (cache) return cache;
    cache = emptyDb();
    cacheAt = now;
    return cache;
  }
}

async function saveDb(db) {
  cache = db;
  cacheAt = Date.now();
  const res = await fetch(BLOB_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(db),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`blob save ${res.status}: ${text.slice(0, 200)}`);
  }
  return true;
}

/** Serialize writes to avoid lost updates */
export function withStore(fn) {
  const run = writeChain.then(async () => {
    const db = await loadDb();
    const result = await fn(db);
    if (result && result.persist) {
      await saveDb(db);
    }
    return result && 'value' in result ? result.value : result;
  });
  writeChain = run.catch(() => {});
  return run;
}

export function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}

export function hashPassword(password, saltB64) {
  const crypto = require('crypto');
  const salt = saltB64 ? Buffer.from(saltB64, 'base64') : crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return {
    hash: hash.toString('base64'),
    salt: salt.toString('base64'),
  };
}

export function makeToken(userId, email) {
  const crypto = require('crypto');
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = b64urlJson({
    sub: userId,
    email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90,
  });
  const sig = b64url(
    crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${sig}`;
}

export function verifyToken(token) {
  const crypto = require('crypto');
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expect = b64url(
    crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${payload}`).digest()
  );
  // timing-safe compare
  const a = Buffer.from(expect);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    if (json.exp && json.exp < Math.floor(Date.now() / 1000)) return null;
    return json;
  } catch {
    return null;
  }
}

export function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function json(res, status, body, origin) {
  res.statusCode = status;
  const headers = {
    'Content-Type': 'application/json',
    ...corsHeaders(origin),
  };
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 5_000_000) {
        reject(new Error('body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export function getBearer(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  if (typeof h === 'string' && h.toLowerCase().startsWith('bearer ')) {
    return h.slice(7).trim();
  }
  return null;
}

export { BLOB_ID, BLOB_URL, AUTH_SECRET };
