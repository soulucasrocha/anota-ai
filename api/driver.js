/**
 * /api/driver — all driver + admin actions
 * ?scope=auth     → login (global, no storeId needed)
 * ?scope=orders   → driver order fetch + actions
 * ?scope=location → driver sends GPS
 * ?scope=online   → admin: who is online (requires x-admin-token)
 * ?scope=admin    → admin CRUD drivers (requires x-admin-token)
 */
import { sb } from './_supabase.js';
import { verifyAdminToken } from './_verify.js';

function parseDriverToken(req) {
  const raw = req.headers['x-driver-token'] || req.query.token || '';
  try {
    const [driverId, storeId] = Buffer.from(raw, 'base64').toString().split(':');
    if (!driverId || !storeId) return null;
    return { driverId, storeId };
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const scope = req.query.scope || '';

  // ── AUTH: login global sem storeId ──────────────────────────────────────────
  if (scope === 'auth') {
    if (req.method !== 'POST') return res.status(405).end();
    const { login, password } = req.body || {};
    if (!login || !password) return res.status(400).json({ error: 'Login e senha obrigatórios' });

    const { data: driver } = await sb()
      .from('drivers')
      .select('id,name,phone,store_id,active')
      .eq('login', login.trim())
      .eq('password', password.trim())
      .eq('active', true)
      .maybeSingle();

    if (!driver) return res.status(401).json({ error: 'Login ou senha inválidos' });

    // Mark online
    await sb().from('drivers').update({ last_seen: new Date().toISOString() }).eq('id', driver.id);

    const token = Buffer.from(`${driver.id}:${driver.store_id}:${Date.now()}`).toString('base64');
    return res.status(200).json({ ok: true, token, driver });
  }

  // ── LOCATION: driver sends GPS coordinates ──────────────────────────────────
  if (scope === 'location') {
    if (req.method !== 'POST') return res.status(405).end();
    const auth = parseDriverToken(req);
    if (!auth) return res.status(401).json({ error: 'Token inválido' });

    const { lat, lng } = req.body || {};
    if (!lat || !lng) return res.status(400).json({ error: 'lat e lng obrigatórios' });

    await sb().from('drivers').update({
      location_lat: lat,
      location_lng: lng,
      location_updated_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    }).eq('id', auth.driverId);

    return res.status(200).json({ ok: true });
  }

  // ── ONLINE: admin view who's online + locations ─────────────────────────────
  if (scope === 'online') {
    if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });
    const storeId = req.query.storeId || req.headers['x-store-id'];
    if (!storeId) return res.status(400).json({ error: 'missing storeId' });

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: drivers } = await sb()
      .from('drivers')
      .select('id,name,phone,last_seen,location_lat,location_lng,location_updated_at,active')
      .eq('store_id', storeId)
      .eq('active', true)
      .order('last_seen', { ascending: false });

    // Get active assignments
    const { data: assignments } = await sb()
      .from('order_assignments')
      .select('driver_id,order_id,status')
      .eq('store_id', storeId)
      .in('status', ['assigned', 'picked']);

    const assignByDriver = {};
    (assignments || []).forEach(a => { assignByDriver[a.driver_id] = a; });

    const enriched = (drivers || []).map(d => ({
      ...d,
      online: d.last_seen && d.last_seen > fiveMinAgo,
      currentAssignment: assignByDriver[d.id] || null,
    }));

    return res.status(200).json({ drivers: enriched });
  }

  // ── ORDERS: driver fetch + actions ──────────────────────────────────────────
  if (scope === 'orders') {
    const auth = parseDriverToken(req);
    if (!auth) return res.status(401).json({ error: 'Token inválido' });
    const { driverId, storeId } = auth;

    // Update last_seen heartbeat
    await sb().from('drivers').update({ last_seen: new Date().toISOString() }).eq('id', driverId);

    if (req.method === 'GET') {
      // Fetch all active orders (pending + preparing + delivering)
      const { data: orders } = await sb()
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .or('finalized.eq.false,finalized.is.null')
        .in('kanban_status', ['pending', 'preparing', 'delivering'])
        .order('created_at', { ascending: true });

      const { data: assignments } = await sb()
        .from('order_assignments')
        .select('*')
        .eq('store_id', storeId)
        .not('status', 'eq', 'delivered');

      // Build maps
      const assignMap = {};
      (assignments || []).forEach(a => { assignMap[a.order_id] = a; });

      // Deduplicate by id
      const seen = new Set();
      const parsed = (orders || []).map(o => {
        try { return typeof o === 'string' ? JSON.parse(o) : o; } catch { return null; }
      }).filter(o => {
        if (!o) return false;
        if (seen.has(String(o.id))) return false;
        seen.add(String(o.id));
        return true;
      });

      const enriched  = parsed.map(o => ({ ...o, assignment: assignMap[String(o.id)] || null }));
      // Available: no assignment OR unassigned
      const available = enriched.filter(o => !o.assignment || !o.assignment.driver_id);
      // Mine: assigned to this driver
      const mine      = enriched.filter(o => o.assignment?.driver_id === driverId);

      // Fetch store position for map centering
      const { data: stSettings } = await sb()
        .from('store_settings')
        .select('delivery')
        .eq('store_id', storeId)
        .maybeSingle();
      const del = stSettings?.delivery || {};
      const storePos = (del.store_lat && del.store_lng)
        ? { lat: del.store_lat, lng: del.store_lng }
        : null;

      return res.status(200).json({ available, mine, storePos });
    }

    if (req.method === 'PATCH') {
      const { orderId, action } = req.body || {};
      if (!orderId || !action) return res.status(400).json({ error: 'orderId e action obrigatórios' });

      if (action === 'accept') {
        const { data: ex } = await sb()
          .from('order_assignments')
          .select('id,driver_id')
          .eq('order_id', String(orderId))
          .eq('store_id', storeId)
          .maybeSingle();

        if (ex?.driver_id && ex.driver_id !== driverId)
          return res.status(409).json({ error: 'Pedido já aceito por outro entregador' });

        await sb().from('order_assignments').upsert({
          order_id: String(orderId), store_id: storeId,
          driver_id: driverId, status: 'assigned',
          assigned_at: new Date().toISOString(),
        }, { onConflict: 'order_id,store_id' });

        // Move to preparing if still pending
        await sb().from('orders')
          .update({ kanban_status: 'preparing', updated_at: new Date().toISOString() })
          .eq('id', String(orderId)).eq('store_id', storeId).eq('kanban_status', 'pending');

        return res.status(200).json({ ok: true });
      }

      if (action === 'pickup') {
        await sb().from('order_assignments')
          .update({ status: 'picked', picked_at: new Date().toISOString() })
          .eq('order_id', String(orderId)).eq('driver_id', driverId);
        await sb().from('orders')
          .update({ kanban_status: 'delivering', updated_at: new Date().toISOString() })
          .eq('id', String(orderId)).eq('store_id', storeId);
        return res.status(200).json({ ok: true });
      }

      if (action === 'delivered') {
        await sb().from('order_assignments')
          .update({ status: 'delivered', delivered_at: new Date().toISOString() })
          .eq('order_id', String(orderId)).eq('driver_id', driverId);
        await sb().from('orders')
          .update({ kanban_status: 'delivered', updated_at: new Date().toISOString() })
          .eq('id', String(orderId)).eq('store_id', storeId);
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'action inválida' });
    }

    return res.status(405).end();
  }

  // ── ASSIGNMENTS: admin map of orderId → driverName ──────────────────────────
  if (scope === 'assignments') {
    if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });
    const storeId = req.query.storeId || req.headers['x-store-id'];
    if (!storeId) return res.status(400).json({ error: 'missing storeId' });

    const { data: assignments } = await sb()
      .from('order_assignments')
      .select('order_id, driver_id, status')
      .eq('store_id', storeId)
      .in('status', ['assigned', 'picked']);

    if (!assignments?.length) return res.status(200).json({ map: {} });

    const driverIds = [...new Set(assignments.map(a => a.driver_id))];
    const { data: drivers } = await sb()
      .from('drivers')
      .select('id, name')
      .in('id', driverIds);

    const nameById = {};
    (drivers || []).forEach(d => { nameById[d.id] = d.name; });

    const map = {};
    assignments.forEach(a => {
      map[String(a.order_id)] = nameById[a.driver_id] || '?';
    });

    return res.status(200).json({ map });
  }

  // ── HISTORY: driver's past deliveries ──────────────────────────────────────
  if (scope === 'history') {
    if (req.method !== 'GET') return res.status(405).end();
    const auth = parseDriverToken(req);
    if (!auth) return res.status(401).json({ error: 'Token inválido' });
    const { driverId } = auth;

    // Last 200 delivered assignments for this driver
    const { data: assignments } = await sb()
      .from('order_assignments')
      .select('order_id, delivered_at, assigned_at, picked_at')
      .eq('driver_id', driverId)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(200);

    if (!assignments?.length) return res.status(200).json({ history: [] });

    const orderIds = assignments.map(a => a.order_id);
    const { data: orders } = await sb()
      .from('orders')
      .select('id, daily_number, total, delivery_fee, driver_commission, address, customer, items, created_at, cancel_reason, payment_method, change_for, change_note')
      .in('id', orderIds);

    const orderMap = {};
    (orders || []).forEach(o => { orderMap[String(o.id)] = o; });

    const history = assignments.map(a => {
      const o = orderMap[String(a.order_id)];
      if (!o) return null;
      return { ...o, delivered_at: a.delivered_at, assigned_at: a.assigned_at, picked_at: a.picked_at };
    }).filter(Boolean);

    return res.status(200).json({ history });
  }

  // ── ADMIN: manage drivers ────────────────────────────────────────────────────
  if (scope === 'admin') {
    if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });
    const storeId = req.query.storeId || req.body?.storeId || req.headers['x-store-id'];
    if (!storeId) return res.status(400).json({ error: 'missing storeId' });

    if (req.method === 'GET') {
      const { data } = await sb()
        .from('drivers')
        .select('id,name,phone,email,login,active,last_seen,created_at')
        .eq('store_id', storeId)
        .order('created_at', { ascending: true });
      return res.status(200).json({ drivers: data || [] });
    }

    if (req.method === 'POST') {
      const { name, phone, email, login, password } = req.body || {};
      if (!name || !login || !password) return res.status(400).json({ error: 'nome, login e senha são obrigatórios' });
      const { data: exists } = await sb().from('drivers').select('id').eq('login', login.trim()).maybeSingle();
      if (exists) return res.status(409).json({ error: 'Login já em uso' });
      const { data, error } = await sb().from('drivers').insert({
        store_id: storeId, name, phone: phone || null,
        email: email || null, login: login.trim(), password: password.trim(), pin: login.trim(), active: true,
      }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ driver: data });
    }

    if (req.method === 'PATCH') {
      const { id, ...fields } = req.body || {};
      if (!id) return res.status(400).json({ error: 'missing id' });
      const allowed = {};
      ['name','phone','email','login','password','active'].forEach(k => {
        if (fields[k] !== undefined) allowed[k] = fields[k];
      });
      await sb().from('drivers').update(allowed).eq('id', id).eq('store_id', storeId);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'missing id' });
      await sb().from('drivers').update({ active: false }).eq('id', id).eq('store_id', storeId);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  }

  // ── STATS: resumo por entregador (hoje / ontem / semana) ──────────────────
  if (scope === 'stats') {
    if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });
    const storeId = req.query.storeId || req.headers['x-store-id'];
    if (!storeId) return res.status(400).json({ error: 'missing storeId' });

    // BRT = UTC-3
    function brtMidnight(daysAgo = 0) {
      const brtMs  = Date.now() - 3 * 60 * 60 * 1000;
      const d      = new Date(brtMs);
      d.setUTCDate(d.getUTCDate() - daysAgo);
      d.setUTCHours(0, 0, 0, 0);
      return new Date(d.getTime() + 3 * 60 * 60 * 1000);
    }
    function brtWeekStart() {
      const brtNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const day    = brtNow.getUTCDay(); // 0=Dom
      brtNow.setUTCDate(brtNow.getUTCDate() - (day === 0 ? 6 : day - 1));
      brtNow.setUTCHours(0, 0, 0, 0);
      return new Date(brtNow.getTime() + 3 * 60 * 60 * 1000);
    }

    const weekStart      = brtWeekStart().toISOString();
    const todayStart     = brtMidnight(0).toISOString();
    const yesterdayStart = brtMidnight(1).toISOString();
    const monthStart     = brtMidnight(30).toISOString();
    // Fetch desde o mais antigo dos períodos (30 dias garante ontem mesmo em segunda-feira)
    const fetchFrom      = monthStart;

    // Entregas concluídas nos últimos 30 dias
    const { data: assignments } = await sb()
      .from('order_assignments')
      .select('driver_id, order_id, delivered_at')
      .eq('store_id', storeId)
      .eq('status', 'delivered')
      .gte('delivered_at', fetchFrom)
      .order('delivered_at', { ascending: false });

    const { data: driverRows } = await sb()
      .from('drivers')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('active', true);

    if (!assignments?.length) return res.status(200).json({ stats: {}, drivers: driverRows || [] });

    const orderIds = [...new Set(assignments.map(a => a.order_id))];
    const { data: orders } = await sb()
      .from('orders')
      .select('id, total, driver_commission')
      .in('id', orderIds);

    const orderMap = {};
    (orders || []).forEach(o => { orderMap[String(o.id)] = o; });

    function empty() { return { count: 0, total: 0, commission: 0 }; }

    const stats = {};
    for (const a of assignments) {
      const o   = orderMap[String(a.order_id)];
      if (!o) continue;
      const did = a.driver_id;
      if (!stats[did]) stats[did] = { today: empty(), yesterday: empty(), week: empty(), month: empty() };

      const total      = o.total            || 0;
      const commission = o.driver_commission || 0;

      // mês (sempre — filtramos desde monthStart)
      stats[did].month.count++;
      stats[did].month.total      += total;
      stats[did].month.commission += commission;

      // semana
      if (a.delivered_at >= weekStart) {
        stats[did].week.count++;
        stats[did].week.total      += total;
        stats[did].week.commission += commission;
      }

      // hoje / ontem
      if (a.delivered_at >= todayStart) {
        stats[did].today.count++;
        stats[did].today.total      += total;
        stats[did].today.commission += commission;
      } else if (a.delivered_at >= yesterdayStart) {
        stats[did].yesterday.count++;
        stats[did].yesterday.total      += total;
        stats[did].yesterday.commission += commission;
      }
    }

    return res.status(200).json({ stats, drivers: driverRows || [] });
  }

  return res.status(400).json({ error: 'scope inválido' });
}
