import { verifyAdminToken } from './admin-verify.js';
import { blobRead, blobAppend, blobWrite } from './admin-blob.js';

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  // ── GET: list orders ───────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const orders = await blobRead('data/orders.json') || [];
    return res.status(200).json({ orders });
  }

  // ── POST: save new order ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const order = { ...req.body, id: req.body.id || Date.now(), createdAt: req.body.createdAt || new Date().toISOString() };
    await blobAppend('data/orders.json', order);
    return res.status(200).json({ ok: true, order });
  }

  // ── PATCH: update kanban status ────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { id, kanbanStatus } = req.body || {};
    if (!id || !kanbanStatus) return res.status(400).json({ error: 'missing id or kanbanStatus' });
    const orders = await blobRead('data/orders.json') || [];
    const idx = orders.findIndex(o => String(o.id) === String(id));
    if (idx >= 0) {
      orders[idx].kanbanStatus = kanbanStatus;
      orders[idx].updatedAt = new Date().toISOString();
      await blobWrite('data/orders.json', orders);
    }
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
