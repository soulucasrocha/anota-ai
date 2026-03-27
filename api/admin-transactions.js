import { verifyAdminToken } from './_verify.js';
import { sb } from './_supabase.js';

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  const storeId = req.query.storeId || req.body?.storeId || req.headers['x-store-id'];
  if (!storeId) return res.status(400).json({ error: 'missing storeId' });

  if (req.method === 'GET') {
    const { data } = await sb().from('transactions').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
    return res.status(200).json({ transactions: data || [] });
  }

  if (req.method === 'PATCH') {
    const { id, status } = req.body || {};
    if (!id || !status) return res.status(400).json({ error: 'missing id or status' });

    const { data: tx } = await sb().from('transactions').select('*').eq('id', String(id)).maybeSingle();
    if (!tx) return res.status(404).json({ error: 'transaction not found' });

    await sb().from('transactions').update({ status, updated_at: new Date().toISOString() }).eq('id', String(id));

    if (status === 'paid') {
      const { data: existing } = await sb().from('orders').select('id').or(`pix_id.eq.${id},id.eq.${id}`).eq('store_id', storeId).maybeSingle();
      if (!existing) {
        const order = {
          id: tx.pix_id || tx.id,
          store_id: storeId,
          pix_id: tx.pix_id || tx.id,
          items: tx.items || [],
          total: tx.amount,
          customer: tx.customer || {},
          address: tx.address || '',
          status: 'paid',
          payment_method: 'pix_online',
          kanban_status: 'preparing',
          created_at: tx.created_at,
          approved_at: new Date().toISOString(),
        };
        await sb().from('orders').insert(order);
      }
    }

    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
