import { verifyAdminToken } from './admin-verify.js';

// KV storage helper — graceful fallback if not connected
async function getKV() {
  try {
    const mod = await import('@vercel/kv');
    return mod.kv;
  } catch { return null; }
}

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  const kv = await getKV();

  // ── GET: list orders ───────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const orders = kv ? (await kv.lrange('orders', 0, 199)) : [];
      return res.status(200).json({ orders: orders || [] });
    } catch {
      return res.status(200).json({ orders: [] });
    }
  }

  // ── POST: save new order ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const order = { ...req.body, id: Date.now(), createdAt: new Date().toISOString() };
    try {
      if (kv) {
        await kv.lpush('orders', JSON.stringify(order));
        await kv.ltrim('orders', 0, 999); // keep last 1000
      }
    } catch (e) { /* KV not set up yet */ }
    return res.status(200).json({ ok: true, order });
  }

  res.status(405).end();
}
