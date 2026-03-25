// Public endpoint — called by client when PIX is confirmed
// No auth needed to write; only /api/admin-orders (auth required) to read
import { blobAppend } from './admin-blob.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { pixId, items, total, customer, address, status } = req.body || {};
  if (!total) return res.status(400).json({ error: 'missing total' });

  const order = {
    id: pixId || `ord-${Date.now()}`,
    pixId,
    items: items || [],
    total,
    customer: customer || {},
    address: address || '',
    status: status || 'paid',
    kanbanStatus: 'pending',   // kanban column: pending | preparing | delivering | delivered
    createdAt: new Date().toISOString(),
  };

  await blobAppend('data/orders.json', order);
  return res.status(200).json({ ok: true });
}
