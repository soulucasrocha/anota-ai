import { verifyAdminToken } from './admin-verify.js';
import { blobRead, blobAppend } from './admin-blob.js';

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  // ── GET: list orders ───────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const orders = await blobRead('data/orders.json') || [];
    return res.status(200).json({ orders });
  }

  // ── POST: save new order ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const order = { ...req.body, id: Date.now(), createdAt: new Date().toISOString() };
    await blobAppend('data/orders.json', order);
    return res.status(200).json({ ok: true, order });
  }

  res.status(405).end();
}
