const {
  withStore,
  verifyToken,
  json,
  readBody,
  getBearer,
  corsHeaders,
} = require('../lib/store');

function findUser(db, payload) {
  if (!payload?.sub) return null;
  for (const u of Object.values(db.users || {})) {
    if (u.id === payload.sub) return u;
  }
  return null;
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '*';
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    for (const [k, v] of Object.entries(corsHeaders(origin))) res.setHeader(k, v);
    return res.end();
  }

  try {
    const token = getBearer(req);
    const payload = verifyToken(token);
    if (!payload) {
      return json(res, 401, { detail: 'Invalid or expired token — please sign in again' }, origin);
    }

    if (req.method === 'GET') {
      const result = await withStore(async (db) => {
        const user = findUser(db, payload);
        if (!user) {
          return { persist: false, value: { error: 401, detail: 'User not found — please sign in again' } };
        }
        return {
          persist: false,
          value: {
            library: Array.isArray(user.library) ? user.library : [],
            progress: user.progress && typeof user.progress === 'object' ? user.progress : {},
          },
        };
      });
      if (result.error) return json(res, result.error, { detail: result.detail }, origin);
      return json(res, 200, result, origin);
    }

    if (req.method === 'PUT') {
      const body = await readBody(req);
      const library = Array.isArray(body.library) ? body.library : [];
      const progress = body.progress && typeof body.progress === 'object' ? body.progress : {};
      const raw = JSON.stringify({ library, progress });
      if (raw.length > 4_500_000) {
        return json(res, 413, { detail: 'Data too large — remove large voice memos and retry' }, origin);
      }

      const result = await withStore(async (db) => {
        const user = findUser(db, payload);
        if (!user) {
          return { persist: false, value: { error: 401, detail: 'User not found — please sign in again' } };
        }
        user.library = library;
        user.progress = progress;
        user.updated_at = Date.now();
        return { persist: true, value: { ok: true } };
      });
      if (result.error) return json(res, result.error, { detail: result.detail }, origin);
      return json(res, 200, result, origin);
    }

    return json(res, 405, { detail: 'Method not allowed' }, origin);
  } catch (err) {
    console.error('me/data error', err);
    return json(res, 500, { detail: err.message || 'Server error' }, origin);
  }
};
