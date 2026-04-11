import { sb } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const storeId = req.body?.storeId || req.query?.storeId;

  // ?type=transaction — save PIX transaction (was transaction-save.js)
  if (req.query.type === 'transaction') {
    const { pixId, amount, customer, items, address, hashtag } = req.body || {};
    if (!pixId || !amount) return res.status(400).json({ error: 'missing fields' });
    await sb().from('transactions').upsert({
      id: pixId, store_id: storeId || null, pix_id: pixId, amount,
      customer: customer || {}, items: items || [], address: address || '',
      hashtag: hashtag || null,
      status: 'pending', created_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    return res.status(200).json({ ok: true });
  }

  // Default: save order
  const { pixId, items, total, delivery_fee, customer, address, status, paymentMethod, deliveryPayment, changeFor, changeNote, hashtag } = req.body || {};
  if (!total) return res.status(400).json({ error: 'missing total' });

  // Cross-reference customer phone with WhatsApp leads to get tag + name
  let waTag = hashtag || null;
  let waName = null;
  const phone = customer?.phone ? customer.phone.replace(/\D/g, '') : null;
  if (phone) {
    const { data: lead } = await sb()
      .from('wa_leads')
      .select('tag, name')
      .eq('phone', phone)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lead) { waTag = waTag || lead.tag; waName = lead.name; }
  }

  const isDeliveryPay = deliveryPayment === true || ['card_delivery', 'pix_delivery', 'cash'].includes(paymentMethod);
  const resolvedStatus = status || (isDeliveryPay ? 'pending' : 'paid');
  const kanbanStatus = (resolvedStatus === 'paid' && !isDeliveryPay) ? 'preparing' : 'pending';
  const order = {
    id: pixId || `ord-${Date.now()}`,
    store_id: storeId || null,
    pix_id: pixId || null,
    items: items || [],
    total,
    customer: customer || {},
    address: address || '',
    status: resolvedStatus,
    payment_method: paymentMethod || 'pix_online',
    delivery_payment: isDeliveryPay,
    kanban_status: kanbanStatus,
    finalized: false,
    delivery_fee: delivery_fee || 0,
    change_for: changeFor || null,
    change_note: changeNote || null,
    hashtag: waTag,
    wa_tag: waTag,
    wa_name: waName,
    wa_phone: phone,
    created_at: new Date().toISOString(),
  };

  await sb().from('orders').upsert(order, { onConflict: 'id' });
  return res.status(200).json({ ok: true });
}
