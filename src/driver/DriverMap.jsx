import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ── Geocode cache (session-level) ─────────────────────────────────────────── */
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
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(address)}`,
      { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } }
    );
    const data = await res.json();
    const c = data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
    GEO_CACHE[key] = c;
    return c;
  } catch {
    GEO_CACHE[key] = null;
    return null;
  }
}

/* ── Delivery flag icon ────────────────────────────────────────────────────── */
function deliveryIcon(orderId, status) {
  const color = status === 'picked' ? '#8b5cf6' : '#2563eb';
  const emoji = status === 'picked' ? '🛵' : '📦';
  const id    = String(orderId).slice(-6);
  return L.divIcon({
    className: '',
    iconSize:   [90, 50],
    iconAnchor: [45, 50],
    html: `
      <div style="text-align:center">
        <div style="
          background:${color};color:#fff;font-size:12px;font-weight:800;
          padding:5px 10px;border-radius:8px;white-space:nowrap;display:inline-block;
          box-shadow:0 3px 10px rgba(0,0,0,.35);
          border:2px solid rgba(255,255,255,.85);
          letter-spacing:.3px;
        ">${emoji} #${id}</div>
        <div style="
          width:0;height:0;margin:0 auto;
          border-left:8px solid transparent;
          border-right:8px solid transparent;
          border-top:10px solid ${color};
        "></div>
      </div>`,
  });
}

/* ── My position icon ─────────────────────────────────────────────────────── */
function myPosIcon() {
  return L.divIcon({
    className: '',
    iconSize:   [44, 44],
    iconAnchor: [22, 22],
    html: `
      <div style="
        width:40px;height:40px;border-radius:50%;
        background:#1e2740;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 0 0 7px rgba(30,39,64,.22), 0 3px 10px rgba(0,0,0,.35);
        font-size:20px;
        border:3px solid #fff;
      ">🏍️</div>`,
  });
}

/* ── Auto-fit to all markers ─────────────────────────────────────────────── */
function FitBounds({ points }) {
  const map  = useMap();
  const prev = useRef('');
  useEffect(() => {
    if (!points.length) return;
    const key = points.map(p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join('|');
    if (key === prev.current) return;
    prev.current = key;
    map.fitBounds(L.latLngBounds(points), { padding: [55, 55], maxZoom: 15 });
  }, [points]);
  return null;
}

/* ── Center on GPS when first available ─────────────────────────────────── */
function CenterOnGps({ pos }) {
  const map = useMap();
  const set = useRef(false);
  useEffect(() => {
    if (!pos || set.current) return;
    set.current = true;
    map.setView([pos.lat, pos.lng], 14);
  }, [pos]);
  return null;
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function DriverMap({ orders, gpsPos }) {
  // only orders that are actively being delivered (accepted or picked up)
  const active = orders.filter(o => ['assigned', 'picked'].includes(o.assignment?.status));

  const [coords,   setCoords]   = useState({}); // orderId → {lat,lng}|null
  const [geocoding, setGeocoding] = useState(false);

  // Re-geocode whenever active order list changes
  const ordersKey = active.map(o => o.id + '|' + (o.address || '')).join(',');
  useEffect(() => {
    const todo = active.filter(o => o.address && !(String(o.id) in coords));
    if (!todo.length) return;
    let alive = true;
    setGeocoding(true);
    (async () => {
      for (const o of todo) {
        if (!alive) break;
        const c = await geocodeAddress(o.address);
        if (alive) setCoords(prev => ({ ...prev, [String(o.id)]: c }));
      }
      if (alive) setGeocoding(false);
    })();
    return () => { alive = false; };
  }, [ordersKey]);

  const orderPoints = active
    .map(o => coords[String(o.id)])
    .filter(Boolean)
    .map(c => [c.lat, c.lng]);

  const gpsPoint  = gpsPos ? [[gpsPos.lat, gpsPos.lng]] : [];
  const allPoints = [...orderPoints, ...gpsPoint];
  const initCenter = gpsPos ? [gpsPos.lat, gpsPos.lng] : [-15.7942, -47.8825];

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid #e5e7eb', position: 'relative', boxShadow: '0 2px 10px rgba(0,0,0,.07)' }}>

      {/* Status overlay */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 1000,
        background: 'rgba(30,39,64,.9)', color: '#fff',
        borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700,
        display: 'flex', gap: 10, alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <span>🚩 {active.length} {active.length === 1 ? 'entrega' : 'entregas'}</span>
        {geocoding && <span style={{ color: '#fbbf24' }}>⏳ localizando...</span>}
        {gpsPos    && <span style={{ color: '#4ade80' }}>📍 GPS</span>}
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 1000,
        background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(4px)',
        borderRadius: 10, padding: '7px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,.15)',
        fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4,
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#2563eb', display: 'inline-block' }} />
          <span>📦 Aceito</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#8b5cf6', display: 'inline-block' }} />
          <span>🛵 Em rota</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#1e2740', display: 'inline-block' }} />
          <span>🏍️ Você</span>
        </div>
      </div>

      <MapContainer
        center={initCenter}
        zoom={14}
        style={{ height: 420, width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />

        {/* Center on GPS when first becomes available */}
        {gpsPos && <CenterOnGps pos={gpsPos} />}

        {/* Fit all markers once they appear */}
        {allPoints.length > 1 && <FitBounds points={allPoints} />}

        {/* Driver's own position */}
        {gpsPos && (
          <Marker position={[gpsPos.lat, gpsPos.lng]} icon={myPosIcon()}>
            <Popup>📍 Você está aqui</Popup>
          </Marker>
        )}

        {/* Delivery markers — flag with order number */}
        {active.map(o => {
          const c = coords[String(o.id)];
          if (!c) return null;
          const status = o.assignment?.status;
          return (
            <Marker key={o.id} position={[c.lat, c.lng]} icon={deliveryIcon(o.id, status)}>
              <Popup>
                <div style={{ fontSize: 13, minWidth: 165 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 5 }}>
                    #{String(o.id).slice(-6)}
                    <span style={{
                      marginLeft: 6, fontSize: 11,
                      background: status === 'picked' ? '#8b5cf6' : '#2563eb',
                      color: '#fff', padding: '2px 7px', borderRadius: 99,
                    }}>
                      {status === 'picked' ? '🛵 Em rota' : '📦 Aceito'}
                    </span>
                  </div>
                  {o.customer?.name && (
                    <div style={{ marginBottom: 3 }}>👤 {o.customer.name}</div>
                  )}
                  {o.address && (
                    <div style={{ color: '#374151', lineHeight: 1.4 }}>📍 {o.address}</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Empty-state overlay */}
      {active.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(243,244,246,.9)', gap: 10,
        }}>
          <span style={{ fontSize: 38 }}>🗺️</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#6b7280' }}>
            Nenhuma entrega ativa
          </span>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            Aceite um pedido para ver no mapa
          </span>
        </div>
      )}
    </div>
  );
}
