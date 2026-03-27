import { verifyAdminToken } from './_verify.js';
import { sb } from './_supabase.js';

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  const storeId = req.query.storeId || req.body?.storeId || req.headers['x-store-id'];
  if (!storeId) return res.status(400).json({ error: 'missing storeId' });

  if (req.method === 'GET') {
    const { data } = await sb().from('orders').select('*').eq('store_id', storeId).or('finalized.eq.false,finalized.is.null').order('created_at', { ascending: false });
    return res.status(200).json({ orders: data || [] });
  }

  if (req.method === 'PATCH') {
    const { id, kanbanStatus } = req.body || {};
    if (!id || !kanbanStatus) return res.status(400).json({ error: 'missing id or kanbanStatus' });
    await sb().from('orders').update({ kanban_status: kanbanStatus, updated_at: new Date().toISOString() }).eq('id', String(id)).eq('store_id', storeId);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'missing id' });
    await sb().from('orders').update({ finalized: true, finalized_at: new Date().toISOString() }).eq('id', String(id)).eq('store_id', storeId);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
