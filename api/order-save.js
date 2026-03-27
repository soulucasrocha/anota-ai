import { sb } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const storeId = req.body?.storeId || req.query?.storeId;

  // ?type=transaction — save PIX transaction (was transaction-save.js)
  if (req.query.type === 'transaction') {
    const { pixId, amount, customer, items, address } = req.body || {};
    if (!pixId || !amount) return res.status(400).json({ error: 'missing fields' });
    await sb().from('transactions').upsert({
      id: pixId, store_id: storeId || null, pix_id: pixId, amount,
      customer: customer || {}, items: items || [], address: address || '',
      status: 'pending', created_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    return res.status(200).json({ ok: true });
  }

  // Default: save order
  const { pixId, items, total, customer, address, status, paymentMethod, deliveryPayment } = req.body || {};
  if (!total) return res.status(400).json({ error: 'missing total' });

  const isDeliveryPay = deliveryPayment === true || ['card_delivery', 'pix_delivery', 'cash'].includes(paymentMethod);
  const order = {
    id: pixId || `ord-${Date.now()}`,
    store_id: storeId || null,
    pix_id: pixId || null,
    items: items || [],
    total,
    customer: customer || {},
    address: address || '',
    status: status || (isDeliveryPay ? 'pending' : 'paid'),
    payment_method: paymentMethod || 'pix_online',
    delivery_payment: isDeliveryPay,
    kanban_status: isDeliveryPay ? 'pending' : 'preparing',
    created_at: new Date().toISOString(),
  };

  await sb().from('orders').upsert(order, { onConflict: 'id' });
  return res.status(200).json({ ok: true });
}
