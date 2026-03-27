import { verifyAdminToken } from './_verify.js';
import { sb } from './_supabase.js';

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).end();

  const storeId = req.query.storeId || req.headers['x-store-id'];
  if (!storeId) return res.status(400).json({ error: 'missing storeId' });

  const { data: orders } = await sb()
    .from('orders')
    .select('id, total, created_at, status, kanban_status, items, customer, address, payment_method')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  const allOrders = orders || [];
  const paid = allOrders.filter(o => o.status === 'paid' || (o.kanban_status && o.kanban_status !== 'pending'));

  // Revenue totals
  const totalRevenue = paid.reduce((s, o) => s + (o.total || 0), 0);
  const today = new Date().toDateString();
  const todayPaid = paid.filter(o => new Date(o.created_at).toDateString() === today);
  const todayRevenue = todayPaid.reduce((s, o) => s + (o.total || 0), 0);
  const todayOrders = todayPaid.length;
  const avgTicket = paid.length > 0 ? Math.round(totalRevenue / paid.length) : 0;

  // Revenue by day — last 7 days
  const revenueByDay = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const dayOrders = paid.filter(o => new Date(o.created_at).toDateString() === dateStr);
    const total = dayOrders.reduce((s, o) => s + (o.total || 0), 0);
    revenueByDay.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      total,
    });
  }

  // Top products
  const productCounts = {};
  paid.forEach(o => {
    (o.items || []).forEach(item => {
      const name = item.name || item.id || 'Produto';
      productCounts[name] = (productCounts[name] || 0) + (item.qty || 1);
    });
  });
  const topProducts = Object.entries(productCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent orders (last 10)
  const recentOrders = allOrders.slice(0, 10).map(o => ({
    id: o.id,
    customer: o.customer,
    address: o.address,
    items: o.items,
    total: o.total,
    status: o.status,
    created_at: o.created_at,
    paymentMethod: o.payment_method,
  }));

  return res.status(200).json({
    totalRevenue,
    todayRevenue,
    totalOrders: paid.length,
    todayOrders,
    avgTicket,
    revenueByDay,
    topProducts,
    recentOrders,
  });
}
