import { verifyAdminToken } from './admin-verify.js';
import { blobRead } from './admin-blob.js';

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).end();

  const orders = await blobRead('data/orders.json') || [];

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now - 7 * 86400000);

  const todayOrders = orders.filter(o => (o.createdAt || '').startsWith(todayStr));
  const weekOrders  = orders.filter(o => new Date(o.createdAt) >= weekAgo);

  // Revenue by day (last 7 days)
  const days = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    days[key] = 0;
  }
  weekOrders.forEach(o => {
    const key = (o.createdAt || '').slice(0, 10);
    if (key in days) days[key] += (o.total || 0);
  });

  // Top products
  const productCount = {};
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      productCount[item.name] = (productCount[item.name] || 0) + (item.qty || 1);
    });
  });
  const topProducts = Object.entries(productCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
  const avgTicket = orders.length ? Math.round(totalRevenue / orders.length) : 0;

  return res.status(200).json({
    totalOrders: orders.length,
    todayOrders: todayOrders.length,
    todayRevenue,
    totalRevenue,
    avgTicket,
    topProducts,
    revenueByDay: Object.entries(days).map(([date, total]) => ({
      date,
      label: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
      total,
    })),
    recentOrders: orders.slice(0, 10),
  });
}
