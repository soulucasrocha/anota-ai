import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ── Geocode cache (session-level) ───────────────────────────────────────── */
const GEO_CACHE = {};
let lastGeoTs = 0;

async function geocodeAddress(address) {
  if (!address) return null;
  const key = address.trim().toLowerCase();
  if (key in GEO_CACHE) return GEO_CACHE[key];

  const wait = Math.max(0, 1100 - (Date.now() - lastGeoTs));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastGeoTs = Date.now();

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
      { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } }
    );
    const data = await res.json();
    const coords = data[0]
      ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      : null;
    GEO_CACHE[key] = coords;
    return coords;
  } catch {
    GEO_CACHE[key] = null;
    return null;
  }
}

/* ── Status config ───────────────────────────────────────────────────────── */
const STATUS = {
  pending:    { color: '#f59e0b', label: 'Pendente',    emoji: '⏳' },
  preparing:  { color: '#3b82f6', label: 'Em preparo',  emoji: '👨‍🍳' },
  delivering: { color: '#8b5cf6', label: 'Em entrega',  emoji: '🛵' },
};

/* ── Custom icons ─────────────────────────────────────────────────────────── */
function orderIcon(orderId, status) {
  const cfg   = STATUS[status] || STATUS.pending;
  const color = cfg.color;
  const id    = String(orderId).slice(-4);

  return L.divIcon({
    className: '',
    iconSize:   [80, 48],
    iconAnchor: [40, 48],
    html: `
      <div style="text-align:center">
        <div style="
          background:${color};color:#fff;font-size:12px;font-weight:800;
          padding:5px 10px;border-radius:8px;white-space:nowrap;display:inline-block;
          box-shadow:0 3px 10px rgba(0,0,0,.3);
          border:2px solid rgba(255,255,255,.8);
          letter-spacing:.3px
        ">🚩 #${id}</div>
        <div style="
          width:0;height:0;margin:0 auto;
          border-left:8px solid transparent;
          border-right:8px solid transparent;
          border-top:10px solid ${color}
        "></div>
      </div>`,
  });
}

function driverIcon(name, online) {
  const first = (name || '?').split(' ')[0];
  const border = online ? '#4ade80' : '#6b7280';
  return L.divIcon({
    className: '',
    iconSize:   [100, 36],
    iconAnchor: [50, 18],
    html: `
      <div style="
        background:#1e2740;color:#fff;font-size:11px;font-weight:700;
        padding:6px 12px;border-radius:20px;white-space:nowrap;
        box-shadow:0 3px 10px rgba(0,0,0,.4);
        border:2.5px solid ${border};
        display:inline-flex;align-items:center;gap:5px
      ">🏍️ ${first}</div>`,
  });
}

function storeIcon() {
  return L.divIcon({
    className: '',
    iconSize:   [44, 44],
    iconAnchor: [22, 44],
    html: `
      <div style="text-align:center">
        <div style="
          background:#e53935;color:#fff;font-size:20px;
          width:40px;height:40px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 3px 12px rgba(229,57,53,.5);
          border:3px solid #fff
        ">🍕</div>
        <div style="
          width:0;height:0;margin:0 auto;
          border-left:6px solid transparent;
          border-right:6px solid transparent;
          border-top:8px solid #e53935
        "></div>
      </div>`,
  });
}

/* ── Set center + zoom on store load ─────────────────────────────────────── */
function SetView({ center, zoom }) {
  const map = useMap();
  const set  = useRef(false);
  useEffect(() => {
    if (!center || set.current) return;
    set.current = true;
    map.setView(center, zoom);
  }, [center]);
  return null;
}

/* ── Auto-fit to all markers (called once when markers first appear) ──────── */
function FitBounds({ points }) {
  const map  = useMap();
  const prev = useRef('');
  useEffect(() => {
    if (!points.length) return;
    const key = points.map(p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join('|');
    if (key === prev.current) return;
    prev.current = key;
    map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 15 });
  }, [points]);
  return null;
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function OrdersMap({ orders, token, storeId }) {
  const [orderCoords, setOrderCoords] = useState({}); // orderId → {lat,lng}|null
  const [storeCoords, setStoreCoords] = useState(null);
  const [drivers,     setDrivers]     = useState([]);
  const [geocoding,   setGeocoding]   = useState(false);

  /* 1. Fetch + geocode store address for centering */
  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/admin-products?type=delivery&storeId=${storeId}`, {
      headers: { 'x-admin-token': token },
    })
      .then(r => r.json())
      .then(async d => {
        const addr = d.delivery?.address;
        if (!addr) return;
        const c = await geocodeAddress(addr);
        if (c) setStoreCoords(c);
      })
      .catch(() => {});
  }, [storeId, token]);

  /* 2. Geocode active order addresses */
  const ordersKey = orders.map(o => o.id + '|' + (o.address || '') + '|' + (o.kanban_status || '')).join(',');
  useEffect(() => {
    const active = orders.filter(o => {
      const st = o.kanban_status || o.kanbanStatus || 'pending';
      return ['pending', 'preparing', 'delivering'].includes(st) && o.address;
    });
    const todo = active.filter(o => !(String(o.id) in orderCoords));
    if (!todo.length) return;

    let alive = true;
    setGeocoding(true);
    (async () => {
      for (const o of todo) {
        if (!alive) break;
        const c = await geocodeAddress(o.address);
        if (alive) setOrderCoords(prev => ({ ...prev, [String(o.id)]: c }));
      }
      if (alive) setGeocoding(false);
    })();
    return () => { alive = false; };
  }, [ordersKey]);

  /* 3. Fetch driver GPS every 12s */
  const fetchDrivers = useCallback(async () => {
    try {
      const r = await fetch(`/api/driver?scope=online&storeId=${storeId}`, {
        headers: { 'x-admin-token': token, 'x-store-id': storeId },
      });
      const d = await r.json();
      setDrivers((d.drivers || []).filter(drv => drv.location_lat && drv.location_lng));
    } catch {}
  }, [token, storeId]);

  useEffect(() => {
    fetchDrivers();
    const t = setInterval(fetchDrivers, 12000);
    return () => clearInterval(t);
  }, [fetchDrivers]);

  /* Active orders visible on map */
  const activeOrders = orders.filter(o => {
    const st = o.kanban_status || o.kanbanStatus || 'pending';
    return ['pending', 'preparing', 'delivering'].includes(st);
  });

  /* Points for FitBounds */
  const orderPoints = activeOrders
    .map(o => orderCoords[String(o.id)])
    .filter(Boolean)
    .map(c => [c.lat, c.lng]);
  const driverPoints = drivers.map(d => [d.location_lat, d.location_lng]);
  const storePoint   = storeCoords ? [[storeCoords.lat, storeCoords.lng]] : [];
  const allPoints    = [...storePoint, ...orderPoints, ...driverPoints];

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  /* Build orderId → order map for driver popups */
  const orderById = {};
  orders.forEach(o => { orderById[String(o.id)] = o; });

  /* Driver–order route lines (when driver has picked up = 'picked') */
  const routeLines = drivers.flatMap(drv => {
    if (!drv.currentAssignment) return [];
    const { order_id, status } = drv.currentAssignment;
    if (status !== 'picked') return [];
    const oc = orderCoords[String(order_id)];
    if (!oc) return [];
    return [{
      key: `${drv.id}-${order_id}`,
      from: [drv.location_lat, drv.location_lng],
      to:   [oc.lat, oc.lng],
    }];
  });

  return (
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,.07)' }}>

      {/* Top overlay: counters + geocoding notice */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 1000,
        background: 'rgba(30,39,64,.88)', color: '#fff',
        borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700,
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <span>📦 {activeOrders.length} pedidos</span>
        <span>🏍️ {drivers.length} online</span>
        {geocoding && <span style={{ color: '#fbbf24' }}>⏳ localizando...</span>}
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 1000,
        background: 'rgba(255,255,255,.93)', backdropFilter: 'blur(6px)',
        borderRadius: 10, padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,.15)',
        fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <span style={{ fontWeight: 800, color: '#1e2740', marginBottom: 2 }}>Legenda</span>
        {Object.entries(STATUS).map(([st, cfg]) => (
          <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: cfg.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: '#374151' }}>{cfg.emoji} {cfg.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#e53935', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ color: '#374151' }}>🍕 Loja</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 2, background: '#8b5cf6', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ color: '#374151' }}>Rota em entrega</span>
        </div>
      </div>

      <MapContainer
        center={[-15.7942, -47.8825]}  /* Brasil — sobrescrito pelo SetView */
        zoom={13}
        style={{ height: 500, width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />

        {/* Center on store when loaded */}
        {storeCoords && (
          <SetView center={[storeCoords.lat, storeCoords.lng]} zoom={14} />
        )}

        {/* Fit all markers once they appear */}
        {allPoints.length > 1 && <FitBounds points={allPoints} />}

        {/* Store marker */}
        {storeCoords && (
          <Marker position={[storeCoords.lat, storeCoords.lng]} icon={storeIcon()}>
            <Popup>
              <strong>🍕 Loja</strong><br />
              Ponto de partida das entregas
            </Popup>
          </Marker>
        )}

        {/* Order markers */}
        {activeOrders.map(o => {
          const c  = orderCoords[String(o.id)];
          if (!c) return null;
          const st = o.kanban_status || o.kanbanStatus || 'pending';
          const cfg = STATUS[st] || STATUS.pending;
          return (
            <Marker key={o.id} position={[c.lat, c.lng]} icon={orderIcon(o.id, st)}>
              <Popup>
                <div style={{ fontSize: 13, minWidth: 170 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                    #{String(o.id).slice(-6)}
                    <span style={{ marginLeft: 6, fontSize: 11, background: cfg.color, color: '#fff', padding: '2px 6px', borderRadius: 99 }}>
                      {cfg.emoji} {cfg.label}
                    </span>
                  </div>
                  {o.customer?.name && <div>👤 {o.customer.name}</div>}
                  {o.address        && <div>📍 {o.address}</div>}
                  <div>💰 R$ {((o.total || 0) / 100).toFixed(2).replace('.', ',')}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Driver markers */}
        {drivers.map(d => {
          const online = d.last_seen && d.last_seen > fiveMinAgo;
          const assign = d.currentAssignment;
          return (
            <Marker
              key={d.id}
              position={[d.location_lat, d.location_lng]}
              icon={driverIcon(d.name, online)}
            >
              <Popup>
                <div style={{ fontSize: 13, minWidth: 160 }}>
                  <strong style={{ fontSize: 14 }}>🏍️ {d.name}</strong><br />
                  <span style={{ color: online ? '#16a34a' : '#6b7280' }}>
                    {online ? '🟢 Online' : '⚫ Offline'}
                  </span>
                  {assign && (
                    <>
                      <br />
                      📦 Pedido #{String(assign.order_id).slice(-6)}
                      <span style={{ marginLeft: 4, color: assign.status === 'picked' ? '#8b5cf6' : '#3b82f6', fontWeight: 700 }}>
                        · {assign.status === 'picked' ? '🛵 Em rota' : '⏳ Aceito'}
                      </span>
                    </>
                  )}
                  {!assign && online && <div style={{ color: '#9ca3af' }}>Aguardando pedido</div>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Route lines: driver → order destination (when status = picked) */}
        {routeLines.map(line => (
          <Polyline
            key={line.key}
            positions={[line.from, line.to]}
            pathOptions={{ color: '#8b5cf6', weight: 3, opacity: 0.7, dashArray: '8 6' }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
