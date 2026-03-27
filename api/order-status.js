import { sb } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).end();

  const { pixId } = req.query;
  if (!pixId) return res.status(400).json({ error: 'missing pixId' });

  const { data: order } = await sb().from('orders')
    .select('kanban_status, updated_at, created_at, address, customer, total, payment_method, delivery_payment')
    .or(`pix_id.eq.${pixId},id.eq.${pixId}`)
    .maybeSingle();

  if (!order) return res.status(200).json({ status: 'pending' });

  return res.status(200).json({
    status:          order.kanban_status || 'pending',
    updatedAt:       order.updated_at    || order.created_at,
    address:         order.address       || '',
    customerName:    order.customer?.name || '',
    total:           order.total         || 0,
    paymentMethod:   order.payment_method || 'pix_online',
    deliveryPayment: order.delivery_payment || false,
  });
}
