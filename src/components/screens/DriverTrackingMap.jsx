import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ── Geocode cache ─────────────────────────────────────────────────────────── */
const GEO_CACHE = {};
let lastGeoTs = 0;

async function geocodeAddress(address) {
  if (!address) return null;
  const rawParts = address.split(',').map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  const parts = rawParts.filter(p => { const k = p.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  const deduped = parts.join(', ');
  const key = deduped.toLowerCase();
  if (key in GEO_CACHE) return GEO_CACHE[key];

  async function tryFetch(q) {
    const wait = Math.max(0, 1100 - (Date.now() - lastGeoTs));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastGeoTs = Date.now();
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`,
      { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } }
    );
    const data = await res.json();
    return data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
  }

  let c = null;
  try {
    c = await tryFetch(deduped);
    if (!c) c = await tryFetch(deduped.replace(/,\s*\d+\b/g, '').trim() + ', RJ');
    if (!c && parts.length >= 2) c = await tryFetch(`${parts[0]}, ${parts[parts.length - 1]}, RJ`);
    if (!c && parts.length >= 2) {
      const noNum = parts[0].replace(/\b\d+\b/g, '').trim();
      if (noNum && noNum !== parts[0]) c = await tryFetch(`${noNum}, ${parts[parts.length - 1]}, RJ`);
    }
  } catch {}
  GEO_CACHE[key] = c;
  return c;
}

/* ── OSRM route (estrada real) ─────────────────────────────────────────────── */
async function fetchOsrmRoute(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const route = data.routes[0];
    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    return { duration: route.duration, distance: route.distance, coords };
  } catch { return null; }
}

/* ── ETA por linha reta (fallback Haversine a 25 km/h) ────────────────────── */
function haversineSec(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  const km = R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
  return Math.ceil((km / 25) * 3600); // segundos a 25 km/h
}

function fmtTime(date) {
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}

/* ── Ajusta zoom para encaixar rota ──────────────────────────────────────── */
function FitRoute({ points }) {
  const map  = useMap();
  const prev = useRef('');
  useEffect(() => {
    if (points.length < 2) return;
    const key = points.map(p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join('|');
    if (key === prev.current) return;
    prev.current = key;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
  }, [points]);
  return null;
}

/* ── Ícones ──────────────────────────────────────────────────────────────── */
function driverIcon() {
  return L.divIcon({
    className: '',
    iconSize:   [44, 44],
    iconAnchor: [22, 22],
    html: `<div style="
      width:40px;height:40px;border-radius:50%;background:#e53935;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 0 7px rgba(229,57,53,.18),0 3px 10px rgba(0,0,0,.3);
      font-size:20px;border:3px solid #fff;">🛵</div>`,
  });
}

function destIcon() {
  return L.divIcon({
    className: '',
    iconSize:   [36, 46],
    iconAnchor: [18, 46],
    html: `
      <div style="text-align:center">
        <div style="
          width:32px;height:32px;border-radius:50%;background:#1d4ed8;
          display:inline-flex;align-items:center;justify-content:center;
          box-shadow:0 3px 8px rgba(29,78,216,.45);font-size:16px;border:3px solid #fff;
        ">🏠</div>
        <div style="width:0;height:0;margin:0 auto;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #1d4ed8"></div>
      </div>`,
  });
}

/* ── Componente principal ────────────────────────────────────────────────── */
export default function DriverTrackingMap({ driverPos, address, onEta }) {
  const [dest,       setDest]       = useState(null);
  const [routeCoords,setRouteCoords]= useState([]);
  const [eta,        setEta]        = useState(null);   // { minutes, arrival }
  const lastFetchPos = useRef(null);

  /* Geocode do endereço de entrega — só uma vez */
  useEffect(() => {
    if (!address) return;
    geocodeAddress(address).then(setDest);
  }, [address]);

  /* Busca rota OSRM quando entregador se move > 80m */
  useEffect(() => {
    if (!driverPos || !dest) return;

    if (lastFetchPos.current) {
      const dLat = (driverPos.lat - lastFetchPos.current.lat) * Math.PI / 180;
      const dLng = (driverPos.lng - lastFetchPos.current.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lastFetchPos.current.lat*Math.PI/180)*Math.cos(driverPos.lat*Math.PI/180)*Math.sin(dLng/2)**2;
      const meters = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      if (meters < 80) return; // não se moveu o suficiente
    }
    lastFetchPos.current = driverPos;

    (async () => {
      let seconds, coords;
      const osrm = await fetchOsrmRoute(driverPos, dest);
      if (osrm) {
        seconds = osrm.duration;
        coords  = osrm.coords;
      } else {
        seconds = haversineSec(driverPos, dest);
        coords  = [[driverPos.lat, driverPos.lng], [dest.lat, dest.lng]];
      }
      setRouteCoords(coords);
      const minutes = Math.max(1, Math.ceil(seconds / 60));
      const arrival = new Date(Date.now() + seconds * 1000);
      const etaObj  = { minutes, arrival: fmtTime(arrival) };
      setEta(etaObj);
      onEta?.(etaObj);
    })();
  }, [driverPos, dest]);

  const boundsPoints = [
    driverPos ? [driverPos.lat, driverPos.lng] : null,
    dest      ? [dest.lat,      dest.lng]       : null,
  ].filter(Boolean);

  const center = driverPos
    ? [driverPos.lat, driverPos.lng]
    : dest ? [dest.lat, dest.lng]
    : [-22.8083, -43.4394];

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1.5px solid #dbeafe', position: 'relative', boxShadow: '0 4px 16px rgba(29,78,216,.1)' }}>

      {/* Badge ETA */}
      {eta && (
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: '#1d4ed8', color: '#fff',
          borderRadius: 20, padding: '6px 18px', fontSize: 13, fontWeight: 700,
          whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(29,78,216,.45)',
          pointerEvents: 'none',
        }}>
          🛵 {eta.minutes} min · chegada ~{eta.arrival}
        </div>
      )}

      {/* Legenda */}
      <div style={{
        position: 'absolute', bottom: 10, right: 10, zIndex: 1000,
        background: 'rgba(255,255,255,.95)', borderRadius: 10, padding: '6px 10px',
        boxShadow: '0 2px 8px rgba(0,0,0,.12)', fontSize: 11,
        display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>🛵</span><span style={{ color: '#e53935', fontWeight: 700 }}>Entregador</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>🏠</span><span style={{ color: '#1d4ed8', fontWeight: 700 }}>Seu endereço</span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={14}
        style={{ height: 230, width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {boundsPoints.length >= 2 && <FitRoute points={boundsPoints} />}

        {driverPos && (
          <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon()} />
        )}
        {dest && (
          <Marker position={[dest.lat, dest.lng]} icon={destIcon()} />
        )}
        {routeCoords.length >= 2 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.85 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
