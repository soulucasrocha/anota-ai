// ── Coordenadas da loja (atualizar conforme endereço real) ───────────────────
const STORE_LAT = -23.5505;
const STORE_LON = -46.6333;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildShortAddress(a) {
  const street   = a.road || a.pedestrian || a.footway || a.path || '';
  const number   = a.house_number ? `, ${a.house_number}` : '';
  const district = a.suburb || a.neighbourhood || a.quarter || a.city_district || '';
  return [street + number, district].filter(Boolean).join(', ');
}

/** Pede localização e retorna { km, shortAddress, fullAddress, lat, lon } */
export function getUserGeo() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject('unsupported');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const km = haversineKm(STORE_LAT, STORE_LON, lat, lon).toFixed(1);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'SuperpDelivery/1.0' } }
          );
          const data = await res.json();
          const a = data.address || {};
          const shortAddress = buildShortAddress(a);
          const fullAddress  = data.display_name || shortAddress;
          resolve({ km, shortAddress, fullAddress, lat, lon });
        } catch {
          resolve({ km, shortAddress: '', fullAddress: '', lat, lon });
        }
      },
      () => reject('denied'),
      { timeout: 8000 }
    );
  });
}

/** Autocomplete de endereço via Nominatim (Brasil) */
export async function searchAddress(query) {
  if (!query || query.trim().length < 4) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&countrycodes=br&limit=6`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'SuperpDelivery/1.0' } }
    );
    const data = await res.json();
    return data
      .map(item => {
        const a = item.address || {};
        const street   = a.road || a.pedestrian || '';
        const number   = a.house_number ? `, ${a.house_number}` : '';
        const district = a.suburb || a.neighbourhood || '';
        const city     = a.city || a.town || a.municipality || '';
        const label    = [street + number, district, city].filter(Boolean).join(', ');
        return label || null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}
