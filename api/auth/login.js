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

    const result = await withStore(async (db) => {
      const user = db.users[email];
      if (!user) {
        return { persist: false, value: { error: 401, detail: 'Invalid email or password' } };
      }
      const { hash } = hashPassword(password, user.salt);
      if (hash !== user.password_hash) {
        return { persist: false, value: { error: 401, detail: 'Invalid email or password' } };
      }
      const token = makeToken(user.id, user.email);
      return {
        persist: false,
        value: {
          token,
          user: { id: user.id, email: user.email, name: user.name || '' },
          source: 'cloud',
        },
      };
    });

    if (result.error) return json(res, result.error, { detail: result.detail }, origin);
    return json(res, 200, result, origin);
  } catch (err) {
    console.error('login error', err);
    return json(res, 500, { detail: err.message || 'Server error' }, origin);
  }
};
