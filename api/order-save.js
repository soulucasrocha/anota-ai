import { sb } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  // GET ?pixId= — order status (merged from order-status.js)
  if (req.method === 'GET') {
    const { pixId } = req.query;
    if (!pixId) return res.status(400).json({ error: 'missing pixId' });
    const { data: order } = await sb().from('orders')
      .select('id, kanban_status, updated_at, created_at, address, customer, total, payment_method, delivery_payment')
      .or(`pix_id.eq.${pixId},id.eq.${pixId}`)
      .maybeSingle();
    if (!order) return res.status(200).json({ status: 'pending' });

    // Buscar nome e localização GPS do entregador se houver assignment ativo
    let driverName = null, driverLat = null, driverLng = null, driverUpdatedAt = null;
    const { data: assignment } = await sb()
      .from('order_assignments')
      .select('driver_id, status')
      .eq('order_id', String(order.id))
      .in('status', ['assigned', 'picked'])
      .maybeSingle();
    if (assignment?.driver_id) {
      const { data: drv } = await sb()
        .from('drivers')
        .select('name, location_lat, location_lng, location_updated_at')
        .eq('id', assignment.driver_id)
        .maybeSingle();
      driverName      = drv?.name               || null;
      driverLat       = drv?.location_lat        || null;
      driverLng       = drv?.location_lng        || null;
      driverUpdatedAt = drv?.location_updated_at || null;
    }

    return res.status(200).json({
      status: order.kanban_status || 'pending',
      updatedAt: order.updated_at || order.created_at,
      address: order.address || '',
      customerName: order.customer?.name || '',
      total: order.total || 0,
      paymentMethod: order.payment_method || 'pix_online',
      deliveryPayment: order.delivery_payment || false,
      driverName,
      driverLat,
      driverLng,
      driverUpdatedAt,
    });
  }

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
  const { pixId, items, total, delivery_fee, driver_commission, customer, address, status, paymentMethod, deliveryPayment, changeFor, changeNote, hashtag } = req.body || {};
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

  // ── Numeração diária (reinicia todo dia à meia-noite BRT = UTC-3) ──────────
  let dailyNumber = null;
  if (storeId) {
    const nowBr      = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const todayBr    = nowBr.toISOString().slice(0, 10); // "YYYY-MM-DD" em BRT
    const dayStart   = new Date(`${todayBr}T03:00:00.000Z`); // 00:00 BRT = 03:00 UTC
    const dayEnd     = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const { count }  = await sb()
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString());
    dailyNumber = (count || 0) + 1;
  }

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
    driver_commission: driver_commission || 0,
    change_for: changeFor || null,
    change_note: changeNote || null,
    daily_number: dailyNumber,
    hashtag: waTag,
    wa_tag: waTag,
    wa_name: waName,
    wa_phone: phone,
    created_at: new Date().toISOString(),
  };

  await sb().from('orders').upsert(order, { onConflict: 'id' });
  return res.status(200).json({ ok: true });
}
