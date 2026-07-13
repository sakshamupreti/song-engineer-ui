/**
 * Keeps the JSONBlob store from expiring (free tier ~24h).
 * Configure Vercel Cron: /api/cron/keepalive every 12 hours.
 */
const { BLOB_URL, BLOB_ID } = require('../lib/store');

module.exports = async function handler(req, res) {
  // Optional protection
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${secret}`) {
      res.statusCode = 401;
      res.end('unauthorized');
      return;
    }
  }

  try {
    const get = await fetch(BLOB_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!get.ok) throw new Error(`get ${get.status}`);
    const data = await get.json();
    data.meta = { ...(data.meta || {}), lastKeepalive: new Date().toISOString() };
    const put = await fetch(BLOB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    });
    if (!put.ok) throw new Error(`put ${put.status}`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, blob: BLOB_ID, users: Object.keys(data.users || {}).length }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
};
