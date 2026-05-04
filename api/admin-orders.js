import { verifyAdminToken } from './_verify.js';
import { sb } from './_supabase.js';
import { sendWaNotification } from './_wa-notify.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  const storeId = req.query.storeId || req.body?.storeId || req.headers['x-store-id'];
  if (!storeId) return res.status(400).json({ error: 'missing storeId' });

  if (req.method === 'GET') {
    const { data } = await sb().from('orders').select('*').eq('store_id', storeId).or('finalized.eq.false,finalized.is.null').order('created_at', { ascending: true });
    return res.status(200).json({ orders: data || [] });
  }

  if (req.method === 'PATCH') {
    const { id, kanbanStatus, cancelReason } = req.body || {};
    if (!id || !kanbanStatus) return res.status(400).json({ error: 'missing id or kanbanStatus' });

    const update = { kanban_status: kanbanStatus, updated_at: new Date().toISOString() };
    if (kanbanStatus === 'cancelled') {
      update.finalized = true;
      update.finalized_at = new Date().toISOString();
      if (cancelReason) update.cancel_reason = cancelReason;
    }

    await sb().from('orders').update(update).eq('id', String(id)).eq('store_id', storeId);

    // WhatsApp: Pedido saiu para entrega
    if (kanbanStatus === 'delivering') {
      sb().from('orders')
        .select('wa_phone, customer, daily_number')
        .eq('id', String(id))
        .maybeSingle()
        .then(({ data: ord }) => {
          const phone = ord?.wa_phone || ord?.customer?.phone;
          if (!phone) return;
          const num = ord?.daily_number || '';
          const firstName = (ord?.customer?.name || '').split(' ')[0];
          const greeting  = firstName ? `, ${firstName}` : '';
          const msg = `🛵 *Pedido${num ? ` #${num}` : ''} saiu para entrega!*\n\nOlá${greeting}! Seu pedido está a caminho e logo chegará até você. 📦`;
          sendWaNotification(storeId, phone, msg);
        })
        .catch(() => {});
    }

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
