import { verifyAdminToken } from './_verify.js';
import { sb } from './_supabase.js';

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  const storeId = req.query.storeId || req.body?.storeId || req.headers['x-store-id'];
  if (!storeId) return res.status(400).json({ error: 'missing storeId' });

  if (req.method === 'GET') {
    // Pull from orders table (all payment methods)
    const { data: orders } = await sb()
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    // Also pull PIX-online transactions pending approval
    const { data: txs } = await sb()
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    // Merge: transactions not yet in orders
    const orderIds = new Set((orders || []).map(o => String(o.id)));
    const pendingTxs = (txs || []).filter(t => !orderIds.has(String(t.pix_id)) && !orderIds.has(String(t.id)));

    const allTx = [
      ...(orders || []).map(o => ({
        id:             o.id,
        store_id:       o.store_id,
        customer:       o.customer,
        items:          o.items,
        amount:         o.total,
        payment_method: o.payment_method,
        status:         (o.status === 'paid' || o.kanban_status) ? 'paid' : 'pending',
        hashtag:        o.hashtag || null,
        wa_tag:         o.wa_tag || o.hashtag || null,
        wa_name:        o.wa_name || o.customer?.name || null,
        wa_phone:       o.wa_phone || o.customer?.phone || null,
        address:        o.address || '',
        created_at:     o.created_at,
        _source:        'order',
      })),
      ...pendingTxs.map(t => ({
        id:             t.id,
        store_id:       t.store_id,
        customer:       t.customer,
        items:          t.items,
        amount:         t.amount,
        payment_method: 'pix_online',
        status:         t.status || 'pending',
        hashtag:        t.hashtag || null,
        address:        t.address || '',
        created_at:     t.created_at,
        _source:        'transaction',
      })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({ transactions: allTx });
  }

  if (req.method === 'PATCH') {
    const { id, status } = req.body || {};
    if (!id || !status) return res.status(400).json({ error: 'missing id or status' });

    // Try transactions table first
    const { data: tx } = await sb().from('transactions').select('*').eq('id', String(id)).maybeSingle();

    if (tx) {
      await sb().from('transactions').update({ status, updated_at: new Date().toISOString() }).eq('id', String(id));

      if (status === 'paid') {
        const { data: existing } = await sb().from('orders').select('id').or(`pix_id.eq.${id},id.eq.${id}`).eq('store_id', storeId).maybeSingle();
        if (!existing) {
          await sb().from('orders').insert({
            id:             tx.pix_id || tx.id,
            store_id:       storeId,
            pix_id:         tx.pix_id || tx.id,
            items:          tx.items || [],
            total:          tx.amount,
            customer:       tx.customer || {},
            address:        tx.address || '',
            status:         'paid',
            payment_method: 'pix_online',
            kanban_status:  'preparing',
            created_at:     tx.created_at,
            approved_at:    new Date().toISOString(),
          });
        }
      }
    } else {
      // It's an order — update status directly
      await sb().from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', String(id)).eq('store_id', storeId);
    }

    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
