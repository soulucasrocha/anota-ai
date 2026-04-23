import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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

/* ── Distância em linha reta (Haversine) ─────────────────────────────────── */
function calcDistance(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))).toFixed(1);
}

/* ── Destino (vermelho) ──────────────────────────────────────────────────── */
function destIcon() {
  return L.divIcon({
    className: '',
    iconSize:   [36, 44],
    iconAnchor: [18, 44],
    html: `
      <div style="text-align:center">
        <div style="
          width:30px;height:30px;border-radius:50%;
          background:#e53935;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 3px 8px rgba(229,57,53,.45);
          font-size:15px;border:3px solid #fff;
        ">📦</div>
        <div style="width:0;height:0;margin:0 auto;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #e53935"></div>
      </div>`,
  });
}

/* ── Ajusta zoom para encaixar rota ─────────────────────────────────────── */
function FitRoute({ points }) {
  const map  = useMap();
  const prev = useRef('');
  useEffect(() => {
    if (points.length < 2) return;
    const key = points.map(p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join('|');
    if (key === prev.current) return;
    prev.current = key;
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 });
  }, [points]);
  return null;
}

/* ── Mini mapa de rota — usado nos cards "Disponíveis" ───────────────────── */
export function MiniRouteMap({ address, gpsPos, storePos }) {
  const [dest,      setDest]      = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (!address) return;
    const key = address.trim().toLowerCase();
    if (key in GEO_CACHE) { setDest(GEO_CACHE[key]); return; }
    setGeocoding(true);
    geocodeAddress(address).then(c => { setDest(c); setGeocoding(false); });
  }, [address]);

  const routePoints = gpsPos && dest
    ? [[gpsPos.lat, gpsPos.lng], [dest.lat, dest.lng]]
    : dest ? [[dest.lat, dest.lng]] : [];

  const center = dest
    ? [dest.lat, dest.lng]
    : gpsPos    ? [gpsPos.lat, gpsPos.lng]
    : storePos  ? [storePos.lat, storePos.lng]
    : [-22.8083, -43.4394];

  const dist = gpsPos && dest ? calcDistance(gpsPos, dest) : null;

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1.5px solid #dbeafe', margin: '8px 0', position: 'relative' }}>
      {/* Distância badge */}
      {dist && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: 'rgba(30,39,64,.88)', color: '#fff',
          borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700,
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          📍 {dist} km até a entrega
        </div>
      )}
      {geocoding && (
        <div style={{
          position: 'absolute', top: 6, left: 6, zIndex: 1000,
          background: 'rgba(30,39,64,.85)', color: '#fbbf24',
          borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700,
          pointerEvents: 'none',
        }}>
          ⏳ Localizando...
        </div>
      )}

      <MapContainer
        center={center}
        zoom={13}
        style={{ height: 180, width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {routePoints.length >= 2 && <FitRoute points={routePoints} />}

        {/* Posição do entregador */}
        {gpsPos && (
          <Marker position={[gpsPos.lat, gpsPos.lng]} icon={myPosIcon()}>
            <Popup>🏍️ Você está aqui</Popup>
          </Marker>
        )}

        {/* Destino da entrega */}
        {dest && (
          <Marker position={[dest.lat, dest.lng]} icon={destIcon()}>
            <Popup>📦 {address}</Popup>
          </Marker>
        )}

        {/* Linha de rota */}
        {routePoints.length === 2 && (
          <Polyline
            positions={routePoints}
            pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.75, dashArray: '9 6' }}
          />
        )}
      </MapContainer>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function DriverMap({ orders, gpsPos, storePos }) {
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
  // Centro: GPS próprio > posição da loja > Mesquita/RJ (fallback)
  const initCenter = gpsPos
    ? [gpsPos.lat, gpsPos.lng]
    : storePos ? [storePos.lat, storePos.lng]
    : [-22.8083, -43.4394];

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
