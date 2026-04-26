// Haversine distance in km between two [lat,lng] points
export function distanceKm(a, b) {
  const R = 6371;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Ray-casting point-in-polygon for [[lat,lng],...] polygon
export function pointInPolygon(pt, polygon) {
  const [px, py] = pt;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > py) !== (yj > py))
      && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Given store position, customer position and list of zones,
 * returns the best matching zone (smallest circle / any polygon), or null.
 * storePos é opcional para zonas polígono (só necessário para zonas círculo).
 */
export function findZone(storePos, customerPos, zones) {
  if (!zones?.length || !customerPos) return null;

  // Para círculo precisamos de storePos; para polígono não
  const dist = storePos ? distanceKm(storePos, customerPos) : Infinity;

  const matches = zones.filter(z => {
    if (z.type === 'polygon') return pointInPolygon(customerPos, z.points || []);
    return storePos && dist <= (z.radiusKm || 0);
  });

  if (!matches.length) return null;

  // Polígono tem prioridade sobre círculo
  const polygons = matches.filter(z => z.type === 'polygon');
  if (polygons.length) return polygons[0];

  return matches.sort((a, b) => a.radiusKm - b.radiusKm)[0];
}

let _lastGeoTs = 0;
const _geoCache = {};

export async function geocodeAddress(addr, nearPos = null) {
  if (!addr) return null;
  const key = addr.trim().toLowerCase();
  if (key in _geoCache) return _geoCache[key];

  async function tryFetch(q) {
    const wait = Math.max(0, 1100 - (Date.now() - _lastGeoTs));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    _lastGeoTs = Date.now();
    let url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`;
    if (nearPos) {
      const d = 0.18;
      url += `&viewbox=${nearPos[1]-d},${nearPos[0]+d},${nearPos[1]+d},${nearPos[0]-d}&bounded=0`;
    }
    const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } });
    const data = await res.json();
    return data[0] ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
  }

  let c = null;
  try {
    c = await tryFetch(addr);
    if (!c) c = await tryFetch(addr.replace(/,\s*\d+\b/g, '').trim() + ', RJ');
    if (!c) {
      const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) c = await tryFetch(`${parts[0]}, ${parts[parts.length - 1]}, RJ`);
    }
  } catch {}
  _geoCache[key] = c;
  return c;
}
