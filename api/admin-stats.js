import { verifyAdminToken } from './_verify.js';
import { sb } from './_supabase.js';

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).end();

  const storeId = req.query.storeId || req.headers['x-store-id'];
  if (!storeId) return res.status(400).json({ error: 'missing storeId' });

  const { data: orders } = await sb().from('orders').select('total, created_at, status, kanban_status').eq('store_id', storeId);
  const { data: txs }    = await sb().from('transactions').select('amount, status, created_at').eq('store_id', storeId);

  const paid = (orders || []).filter(o => o.status === 'paid' || o.kanban_status !== 'pending');
  const totalRevenue = paid.reduce((s, o) => s + (o.total || 0), 0);
  const todayOrders  = paid.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length;
  const pendingTxs   = (txs || []).filter(t => t.status === 'pending').length;

  return res.status(200).json({
    totalRevenue,
    totalOrders: paid.length,
    todayOrders,
    pendingTransactions: pendingTxs,
  });
}
