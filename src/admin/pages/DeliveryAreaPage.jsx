import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, Polygon, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ZONE_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899'];
const DEFAULT_CENTER = [-23.5505, -46.6333];

function fmtFee(cents) {
  if (!cents) return 'Grátis';
  return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');
}

async function geocodeAddress(addr) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    const data = await r.json();
    if (data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {}
  return null;
}

function genId() { return Math.random().toString(36).slice(2, 9); }

function MapReCenter({ pos }) {
  const map = useMap();
  useEffect(() => { if (pos) map.setView(pos, 14); }, [pos]);
  return null;
}

// Handles map clicks for polygon drawing
function DrawHandler({ drawing, onMapClick, onDblClick }) {
  useMapEvents({
    click: (e) => { if (drawing) onMapClick([e.latlng.lat, e.latlng.lng]); },
    dblclick: (e) => { if (drawing) { e.originalEvent.preventDefault(); onDblClick(); } },
  });
  return null;
}

// Draggable, deletable dot markers for polygon vertices
function DotMarker({ pos, index, color, onDelete, onMove }) {
  const normalIcon = L.divIcon({
    className: '',
    html: `<div title="Arraste para mover · clique direito para excluir" style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.5);cursor:grab"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
  return (
    <Marker
      position={pos}
      icon={normalIcon}
      draggable
      eventHandlers={{
        dragend: (e) => onMove(index, [e.target.getLatLng().lat, e.target.getLatLng().lng]),
        contextmenu: (e) => { L.DomEvent.stop(e); onDelete(index); },
        click: (e) => { if (e.originalEvent?.ctrlKey || e.originalEvent?.metaKey) onDelete(index); },
      }}
    />
  );
}

export default function DeliveryAreaPage({ token, storeId }) {
  const [address,      setAddress]      = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [defaultFee,   setDefaultFee]   = useState('5.00'); // taxa base (fora das zonas)
  const [zones,        setZones]        = useState([]);
  const [storePos,     setStorePos]     = useState(null);
  const [geocoding,    setGeocoding]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);

  // Zone form
  const [newName,      setNewName]      = useState('');
  const [newRadius,    setNewRadius]    = useState('');
  const [newFee,       setNewFee]       = useState('');
  const [newDriverFee, setNewDriverFee] = useState('');
  const [editId,       setEditId]       = useState(null);
  const [zoneType,     setZoneType]     = useState('circle'); // 'circle' | 'polygon'

  // Polygon drawing state
  const [drawing,    setDrawing]    = useState(false);
  const [draftPts,   setDraftPts]   = useState([]); // [[lat,lng],...] in progress

  // Load
  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/admin-products?type=delivery&storeId=${storeId}`, {
      headers: { 'x-admin-token': token }
    })
      .then(r => r.json())
      .then(d => {
        setAddress(d.delivery?.address || '');
        setDeliveryTime(d.delivery?.delivery_time != null ? String(d.delivery.delivery_time) : '');
        if (d.delivery?.default_fee != null) {
          setDefaultFee((d.delivery.default_fee / 100).toFixed(2));
        }
        if (d.delivery?.zones?.length) {
          setZones(d.delivery.zones);
        } else if (d.delivery?.cities?.length) {
          const migrated = d.delivery.cities.map((c, i) => ({
            id: genId(), name: c.name, type: 'circle',
            radiusKm: (i + 1) * 3, fee: c.fee || 0,
            color: ZONE_COLORS[i % ZONE_COLORS.length],
          }));
          setZones(migrated);
        }
      })
      .catch(() => {});
  }, [token, storeId]);

  // Geocode
  useEffect(() => {
    if (!address || address.length < 6) return;
    const t = setTimeout(async () => {
      setGeocoding(true);
      const pos = await geocodeAddress(address);
      if (pos) setStorePos(pos);
      setGeocoding(false);
    }, 800);
    return () => clearTimeout(t);
  }, [address]);

  async function save() {
    setSaving(true);
    await fetch('/api/admin-products?type=delivery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token, 'x-store-id': storeId },
      body: JSON.stringify({
        delivery: {
          address,
          delivery_time: deliveryTime !== '' ? Number(deliveryTime) : null,
          default_fee: defaultFee !== '' ? Math.round(Number(defaultFee) * 100) : 500,
          zones,
          cities: zones.map(z => ({ name: z.name, fee: z.fee, neighborhoods: [] })),
        },
      }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addOrUpdateZone() {
    if (!newName) return;
    if (zoneType === 'circle' && !newRadius) return;
    const fee       = newFee       !== '' ? Math.round(Number(newFee)       * 100) : 0;
    const driverFee = newDriverFee !== '' ? Math.round(Number(newDriverFee) * 100) : 0;
    const color = editId
      ? zones.find(z => z.id === editId)?.color || ZONE_COLORS[zones.length % ZONE_COLORS.length]
      : ZONE_COLORS[zones.length % ZONE_COLORS.length];

    if (editId) {
      setZones(prev => prev.map(z => z.id === editId
        ? zoneType === 'circle'
          ? { ...z, name: newName, type: 'circle', radiusKm: Number(newRadius), fee, driverFee }
          : { ...z, name: newName, type: 'polygon', points: draftPts, fee, driverFee }
        : z
      ));
      setEditId(null);
    } else {
      const zone = zoneType === 'circle'
        ? { id: genId(), name: newName, type: 'circle', radiusKm: Number(newRadius), fee, driverFee, color }
        : { id: genId(), name: newName, type: 'polygon', points: draftPts, fee, driverFee, color };
      setZones(prev => [...prev, zone]);
    }
    setNewName(''); setNewRadius(''); setNewFee(''); setNewDriverFee('');
    setDraftPts([]); setDrawing(false);
  }

  function startEdit(z) {
    setEditId(z.id);
    setZoneType(z.type || 'circle');
    setNewName(z.name);
    setNewRadius(z.type === 'circle' ? String(z.radiusKm) : '');
    setNewFee(z.fee > 0 ? (z.fee / 100).toFixed(2) : '');
    setNewDriverFee(z.driverFee > 0 ? (z.driverFee / 100).toFixed(2) : '');
    if (z.type === 'polygon') setDraftPts(z.points || []);
  }

  function cancelEdit() {
    setEditId(null); setDrawing(false); setDraftPts([]);
    setNewName(''); setNewRadius(''); setNewFee(''); setNewDriverFee('');
  }

  // Polygon drawing handlers
  const handleMapClick = useCallback((pt) => {
    setDraftPts(prev => [...prev, pt]);
  }, []);

  const finishPolygon = useCallback(() => {
    if (draftPts.length < 3) return;
    setDrawing(false);
  }, [draftPts]);

  function undoLastPoint() {
    setDraftPts(prev => prev.slice(0, -1));
  }

  function deletePoint(index) {
    setDraftPts(prev => prev.filter((_, i) => i !== index));
  }

  function movePoint(index, newPos) {
    setDraftPts(prev => prev.map((pt, i) => i === index ? newPos : pt));
  }

  function startDraw() {
    setDraftPts([]);
    setDrawing(true);
  }

  const center = storePos || DEFAULT_CENTER;
  const sortedZones = [...zones].sort((a, b) => {
    const ra = a.type === 'circle' ? a.radiusKm : 999;
    const rb = b.type === 'circle' ? b.radiusKm : 999;
    return rb - ra;
  });

  const canSaveZone = newName && (
    (zoneType === 'circle' && newRadius) ||
    (zoneType === 'polygon' && draftPts.length >= 3)
  );

  return (
    <>
      {/* Address + time + default fee */}
      <div className="adm-card">
        <div className="adm-card-header"><h3>📍 Endereço da Loja</h3></div>
        <div className="adm-card-body" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="adm-label">Endereço completo</label>
            <input className="adm-input" placeholder="Ex: Rua das Flores, 123, Centro, São Paulo - SP"
              value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div style={{ flexShrink: 0 }}>
            <label className="adm-label">Tempo de entrega (min)</label>
            <input className="adm-input" type="number" min="1" placeholder="45"
              value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} style={{ width: 120 }} />
          </div>
          <div style={{ flexShrink: 0 }}>
            <label className="adm-label">
              Taxa base (R$)
              <span style={{ marginLeft: 6, fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>fora das zonas</span>
            </label>
            <input className="adm-input" type="number" step="0.01" min="0" placeholder="5.00"
              value={defaultFee} onChange={e => setDefaultFee(e.target.value)} style={{ width: 110 }} />
          </div>
        </div>
        <div style={{ padding: '0 16px 12px', fontSize: 12, color: '#9ca3af' }}>
          💡 A taxa base é cobrada quando o endereço do cliente está fora das zonas ou não foi possível localizá-lo.
        </div>
      </div>

      {/* Map + Zones */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h3>🗺️ Zonas de Entrega</h3>
          <span style={{ fontSize: 12, color: '#aaa' }}>
            {geocoding ? '🔍 Localizando...' : storePos ? '📍 Loja localizada' : 'Configure o endereço acima'}
          </span>
        </div>
        <div className="adm-card-body" style={{ padding: 0 }}>

          {/* Drawing hint bar */}
          {drawing && (
            <div style={{
              background: '#eff6ff', borderBottom: '1px solid #bfdbfe',
              padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 13, color: '#1d4ed8', flex: 1 }}>
                ✏️ <strong>Modo desenho ativo</strong> — clique no mapa para adicionar pontos · arraste os pontos para mover · clique direito no ponto para excluir · duplo clique para fechar.
                {draftPts.length > 0 && ` (${draftPts.length} ponto${draftPts.length > 1 ? 's' : ''})`}
              </span>
              {draftPts.length > 0 && (
                <button onClick={undoLastPoint}
                  style={{ fontSize: 12, background: '#fff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#374151' }}>
                  ↩ Desfazer
                </button>
              )}
              {draftPts.length >= 3 && (
                <button onClick={finishPolygon}
                  style={{ fontSize: 12, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                  ✅ Fechar área
                </button>
              )}
              <button onClick={() => { setDrawing(false); setDraftPts([]); }}
                style={{ fontSize: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#ef4444' }}>
                ✕ Cancelar
              </button>
            </div>
          )}

          {/* MAP */}
          <div style={{ height: 420, position: 'relative', cursor: drawing ? 'crosshair' : 'default' }}>
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl doubleClickZoom={!drawing}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
              {storePos && <MapReCenter pos={storePos} />}
              <DrawHandler drawing={drawing} onMapClick={handleMapClick} onDblClick={finishPolygon} />

              {/* Store marker */}
              {storePos && (
                <Marker position={storePos}>
                  <Popup>📍 Sua loja</Popup>
                </Marker>
              )}

              {/* Saved zones */}
              {sortedZones.map(z => (
                z.type === 'polygon' && z.points?.length >= 3 ? (
                  <Polygon key={z.id} positions={z.points}
                    pathOptions={{ color: z.color, fillColor: z.color, fillOpacity: 0.15, weight: 2 }}>
                    <Popup><strong>{z.name}</strong><br />Taxa: {fmtFee(z.fee)}</Popup>
                  </Polygon>
                ) : z.type !== 'polygon' && storePos ? (
                  <Circle key={z.id} center={storePos} radius={z.radiusKm * 1000}
                    pathOptions={{ color: z.color, fillColor: z.color, fillOpacity: 0.12, weight: 2 }}>
                    <Popup><strong>{z.name}</strong><br />Raio: {z.radiusKm} km<br />Taxa: {fmtFee(z.fee)}</Popup>
                  </Circle>
                ) : null
              ))}

              {/* Draft polygon being drawn */}
              {draftPts.length >= 2 && (
                <Polyline positions={draftPts}
                  pathOptions={{ color: '#1d4ed8', weight: 2, dashArray: '6 4' }} />
              )}
              {draftPts.length >= 3 && (
                <Polygon positions={draftPts}
                  pathOptions={{ color: '#1d4ed8', fillColor: '#1d4ed8', fillOpacity: 0.1, weight: 2, dashArray: '6 4' }} />
              )}
              {draftPts.map((pt, i) => (
                <DotMarker key={i} index={i} pos={pt} color="#1d4ed8"
                  onDelete={deletePoint} onMove={movePoint} />
              ))}
            </MapContainer>

            {/* Legend */}
            {zones.length > 0 && (
              <div style={{
                position: 'absolute', bottom: 24, left: 12, zIndex: 1000,
                background: 'rgba(255,255,255,.95)', borderRadius: 10,
                padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,.15)',
              }}>
                {zones.map(z => (
                  <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <div style={{ width: 12, height: 12, borderRadius: z.type === 'polygon' ? 2 : '50%', background: z.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#374151' }}>
                      {z.name}
                      {z.type === 'circle' ? ` — ${z.radiusKm}km` : ' — personalizado'}
                      {' — '}{fmtFee(z.fee)}
                      {z.driverFee > 0 && <span style={{ color: '#1d4ed8' }}> · 🏍️ {fmtFee(z.driverFee)}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zones table */}
          <div style={{ borderTop: '1px solid #f3f4f6' }}>
            {zones.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                Nenhuma zona configurada. Adicione abaixo.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Zona</th>
                    <th style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>Tipo</th>
                    <th style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>Área</th>
                    <th style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>Taxa cliente</th>
                    <th style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>Comissão entregador</th>
                    <th style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map(z => (
                    <tr key={z.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: z.type === 'polygon' ? 2 : '50%', background: z.color }} />
                          <span style={{ fontWeight: 600, color: '#1e2740' }}>{z.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                          background: z.type === 'polygon' ? '#eff6ff' : '#f3f4f6',
                          color: z.type === 'polygon' ? '#1d4ed8' : '#6b7280',
                        }}>
                          {z.type === 'polygon' ? '✏️ Personalizado' : '⭕ Raio'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', color: '#374151' }}>
                        {z.type === 'circle' ? `até ${z.radiusKm} km` : `${z.points?.length || 0} pontos`}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <span style={{
                          background: z.fee === 0 ? '#ecfdf5' : '#fef3c7',
                          color: z.fee === 0 ? '#10b981' : '#92400e',
                          padding: '2px 8px', borderRadius: 6, fontWeight: 600, fontSize: 12,
                        }}>
                          {fmtFee(z.fee)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <span style={{
                          background: !z.driverFee ? '#f9fafb' : '#eff6ff',
                          color: !z.driverFee ? '#9ca3af' : '#1d4ed8',
                          padding: '2px 8px', borderRadius: 6, fontWeight: 600, fontSize: 12,
                        }}>
                          {z.driverFee > 0 ? fmtFee(z.driverFee) : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button onClick={() => startEdit(z)}
                            style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                            ✏️ Editar
                          </button>
                          <button onClick={() => setZones(prev => prev.filter(x => x.id !== z.id))}
                            style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#ef4444' }}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Add / Edit form */}
          <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 12px' }}>
              {editId ? '✏️ Editar zona' : '➕ Nova zona de entrega'}
            </p>

            {/* Type selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[
                { v: 'circle',  label: '⭕ Por raio (km)' },
                { v: 'polygon', label: '✏️ Área personalizada' },
              ].map(opt => (
                <button key={opt.v} onClick={() => { setZoneType(opt.v); setDraftPts([]); setDrawing(false); }}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                    border: zoneType === opt.v ? '2px solid #e53935' : '2px solid #e5e7eb',
                    background: zoneType === opt.v ? '#fef2f2' : '#fff',
                    color: zoneType === opt.v ? '#e53935' : '#374151',
                    fontWeight: zoneType === opt.v ? 700 : 400,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 2, minWidth: 140 }}>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Nome da zona</label>
                <input className="adm-input" placeholder="Ex: Centro, Zona Norte..."
                  value={newName} onChange={e => setNewName(e.target.value)} style={{ marginBottom: 0 }} />
              </div>

              {zoneType === 'circle' ? (
                <div style={{ width: 130 }}>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Raio máximo (km)</label>
                  <input className="adm-input" type="number" step="0.5" min="0.5" placeholder="Ex: 5"
                    value={newRadius} onChange={e => setNewRadius(e.target.value)} style={{ marginBottom: 0 }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: '#6b7280' }}>Área no mapa</label>
                  {!drawing ? (
                    <button onClick={startDraw}
                      style={{
                        padding: '7px 14px', background: draftPts.length >= 3 ? '#ecfdf5' : '#eff6ff',
                        color: draftPts.length >= 3 ? '#10b981' : '#1d4ed8',
                        border: `1px solid ${draftPts.length >= 3 ? '#86efac' : '#bfdbfe'}`,
                        borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      }}>
                      {draftPts.length >= 3 ? `✅ ${draftPts.length} pontos desenhados` : '✏️ Desenhar no mapa'}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: '#1d4ed8', padding: '7px 0' }}>
                      ✏️ Clique no mapa para adicionar pontos...
                    </span>
                  )}
                </div>
              )}

              <div style={{ width: 130 }}>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  Taxa cliente (R$)
                </label>
                <input className="adm-input" type="number" step="0.01" placeholder="0 = Grátis"
                  value={newFee} onChange={e => setNewFee(e.target.value)} style={{ marginBottom: 0 }} />
              </div>

              <div style={{ width: 150 }}>
                <label style={{ fontSize: 11, color: '#1d4ed8', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                  🏍️ Comissão entregador (R$)
                </label>
                <input className="adm-input" type="number" step="0.01" placeholder="0.00"
                  value={newDriverFee} onChange={e => setNewDriverFee(e.target.value)} style={{ marginBottom: 0 }} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="adm-btn primary" onClick={addOrUpdateZone}
                  disabled={!canSaveZone}
                  style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                  {editId ? '✅ Salvar' : '➕ Adicionar zona'}
                </button>
                {editId && (
                  <button className="adm-btn" onClick={cancelEdit} style={{ fontSize: 13 }}>Cancelar</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="adm-btn primary" onClick={save} disabled={saving} style={{ minWidth: 180 }}>
          {saving ? 'Salvando...' : saved ? '✅ Salvo!' : '💾 Salvar configurações'}
        </button>
      </div>
    </>
  );
}
