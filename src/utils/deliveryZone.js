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
 */
export function findZone(storePos, customerPos, zones) {
  if (!zones?.length || !storePos || !customerPos) return null;

  const dist = distanceKm(storePos, customerPos);

  // Collect all matching zones
  const matches = zones.filter(z => {
    if (z.type === 'polygon') return pointInPolygon(customerPos, z.points || []);
    return dist <= (z.radiusKm || 0);
  });

  if (!matches.length) return null;

  // Prefer smallest circle; polygon wins over circle if both match
  const polygons = matches.filter(z => z.type === 'polygon');
  if (polygons.length) return polygons[0];

  return matches.sort((a, b) => a.radiusKm - b.radiusKm)[0];
}

export async function geocodeAddress(addr) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1&countrycodes=br`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    const data = await r.json();
    if (data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {}
  return null;
}
