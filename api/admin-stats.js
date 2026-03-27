import { verifyAdminToken } from './_verify.js';
import { sb } from './_supabase.js';

// Brazil UTC-3 date helpers
function brazilDateStr(date) {
  // Returns YYYY-MM-DD in UTC-3
  const d = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function getBrazilPeriodRange(period) {
  const now = new Date();
  const todayBR = brazilDateStr(now);

  if (period === 'today') {
    return { start: `${todayBR}T03:00:00.000Z`, end: null, label: 'hoje' };
  }
  if (period === 'yesterday') {
    const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yestBR = brazilDateStr(yest);
    return { start: `${yestBR}T03:00:00.000Z`, end: `${todayBR}T03:00:00.000Z`, label: 'ontem' };
  }
  if (period === '7d') {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dBR = brazilDateStr(d);
    return { start: `${dBR}T03:00:00.000Z`, end: null, label: '7 dias' };
  }
  if (period === '30d') {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dBR = brazilDateStr(d);
    return { start: `${dBR}T03:00:00.000Z`, end: null, label: '30 dias' };
  }
  // 'all' or default — no date filter
  return { start: null, end: null, label: 'total' };
}

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).end();

  const storeId = req.query.storeId || req.headers['x-store-id'];
  if (!storeId) return res.status(400).json({ error: 'missing storeId' });

  const period = req.query.period || 'today';
  const { start, end } = getBrazilPeriodRange(period);

  let query = sb()
    .from('orders')
    .select('id, total, created_at, status, kanban_status, items, customer, address, payment_method')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (start) query = query.gte('created_at', start);
  if (end)   query = query.lt('created_at', end);

  const { data: orders } = await query;

  const allOrders = orders || [];
  const paid = allOrders.filter(o => o.status === 'paid' || (o.kanban_status && o.kanban_status !== 'pending'));

  // Revenue totals
  const totalRevenue = paid.reduce((s, o) => s + (o.total || 0), 0);
  const today = new Date().toDateString();
  const todayPaid = paid.filter(o => new Date(o.created_at).toDateString() === today);
  const todayRevenue = todayPaid.reduce((s, o) => s + (o.total || 0), 0);
  const todayOrders = todayPaid.length;
  const avgTicket = paid.length > 0 ? Math.round(totalRevenue / paid.length) : 0;

  // Revenue by day — last 7 days (always show 7-day chart regardless of filter)
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

  return res.status(200).json({
    totalRevenue,
    todayRevenue,
    totalOrders: paid.length,
    todayOrders,
    avgTicket,
    revenueByDay,
    topProducts,
  });
}
