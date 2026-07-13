const crypto = require('crypto');
const {
  withStore,
  hashPassword,
  makeToken,
  json,
  readBody,
  corsHeaders,
} = require('../lib/store');

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '*';
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    for (const [k, v] of Object.entries(corsHeaders(origin))) res.setHeader(k, v);
    return res.end();
  }
  if (req.method !== 'POST') return json(res, 405, { detail: 'Method not allowed' }, origin);

  try {
    const body = await readBody(req);
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const password = String(body.password || '');
    const name = String(body.name || '').trim();

    if (!email || !email.includes('@')) {
      return json(res, 400, { detail: 'Valid email required' }, origin);
    }
    if (password.length < 6) {
      return json(res, 400, { detail: 'Password must be at least 6 characters' }, origin);
    }

    const result = await withStore(async (db) => {
      if (db.users[email]) {
        return { persist: false, value: { error: 409, detail: 'An account with this email already exists' } };
      }
      const id = crypto.randomBytes(12).toString('hex');
      const { hash, salt } = hashPassword(password);
      db.users[email] = {
        id,
        email,
        name,
        salt,
        password_hash: hash,
        library: [],
        progress: {},
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      const token = makeToken(id, email);
      return {
        persist: true,
        value: {
          token,
          user: { id, email, name },
          source: 'cloud',
        },
      };
    });

    if (result.error) return json(res, result.error, { detail: result.detail }, origin);
    return json(res, 200, result, origin);
  } catch (err) {
    console.error('register error', err);
    return json(res, 500, { detail: err.message || 'Server error' }, origin);
  }
};
