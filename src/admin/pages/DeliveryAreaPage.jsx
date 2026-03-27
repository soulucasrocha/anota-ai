import { useState, useEffect } from 'react';

export default function DeliveryAreaPage({ token, storeId }) {
  const [address, setAddress] = useState('');
  const [areas, setAreas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // New area form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newFee, setNewFee] = useState('');
  const [editIdx, setEditIdx] = useState(null);

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/admin-products?type=delivery&storeId=${storeId}`, {
      headers: { 'x-admin-token': token }
    })
      .then(r => r.json())
      .then(d => {
        setAddress(d.delivery?.address || '');
        setAreas(d.delivery?.areas || []);
      })
      .catch(() => {});
  }, [token, storeId]);

  async function save() {
    setSaving(true);
    await fetch('/api/admin-products?type=delivery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token, 'x-store-id': storeId },
      body: JSON.stringify({ delivery: { address, areas } }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addArea() {
    if (!newName || !newFee) return;
    const area = { name: newName, desc: newDesc, fee: Math.round(Number(newFee) * 100) };
    if (editIdx !== null) {
      setAreas(prev => prev.map((a, i) => i === editIdx ? area : a));
      setEditIdx(null);
    } else {
      setAreas(prev => [...prev, area]);
    }
    setNewName(''); setNewDesc(''); setNewFee('');
  }

  function editArea(idx) {
    const a = areas[idx];
    setNewName(a.name); setNewDesc(a.desc || ''); setNewFee((a.fee / 100).toFixed(2));
    setEditIdx(idx);
  }

  function removeArea(idx) {
    setAreas(prev => prev.filter((_, i) => i !== idx));
  }

  const mapsUrl = address
    ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : null;

  return (
    <>
      {/* Store Address */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h3>📍 Endereço da Loja</h3>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="adm-label">Endereço completo</label>
            <input
              className="adm-input"
              placeholder="Ex: Rua das Flores, 123, Bairro, Cidade - UF"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
            <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Será mostrado no mapa abaixo e usado como referência de entrega.</p>
          </div>
          {mapsUrl && (
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <iframe
                title="Localização da loja"
                src={mapsUrl}
                width="100%"
                height="300"
                style={{ display: 'block', border: 'none' }}
                allowFullScreen
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>

      {/* Delivery Areas */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h3>🗺️ Áreas de Entrega</h3>
          <span style={{ fontSize: 13, color: '#aaa' }}>{areas.length} área(s) cadastrada(s)</span>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Add area form */}
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#374151' }}>
              {editIdx !== null ? '✏️ Editar área' : '➕ Nova área de entrega'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label className="adm-label">Nome da área *</label>
                <input className="adm-input" placeholder="Ex: Centro" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div>
                <label className="adm-label">Taxa de entrega (R$) *</label>
                <input className="adm-input" type="number" step="0.01" placeholder="Ex: 5.00" value={newFee} onChange={e => setNewFee(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className="adm-label">Bairros / descrição</label>
              <input className="adm-input" placeholder="Ex: Bairro São João, Vila Nova, Centro" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="adm-btn primary" onClick={addArea} disabled={!newName || !newFee}>
                {editIdx !== null ? '💾 Salvar edição' : '➕ Adicionar área'}
              </button>
              {editIdx !== null && (
                <button className="adm-btn ghost" onClick={() => { setEditIdx(null); setNewName(''); setNewDesc(''); setNewFee(''); }}>Cancelar</button>
              )}
            </div>
          </div>

          {/* Areas list */}
          {areas.length === 0 ? (
            <div className="adm-empty">
              <div className="empty-icon">🗺️</div>
              <p>Nenhuma área cadastrada ainda.<br /><small style={{ color: '#bbb' }}>Adicione regiões com o valor da taxa de entrega.</small></p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {areas.map((area, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{area.name}</p>
                    {area.desc && <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>{area.desc}</p>}
                  </div>
                  <span style={{ background: '#ecfdf5', color: '#059669', fontWeight: 700, fontSize: 13, padding: '4px 10px', borderRadius: 8 }}>
                    R$ {(area.fee / 100).toFixed(2).replace('.', ',')}
                  </span>
                  <button className="adm-btn ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => editArea(idx)}>✏️</button>
                  <button className="adm-btn danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => removeArea(idx)}>🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="adm-btn primary" onClick={save} disabled={saving} style={{ minWidth: 160 }}>
          {saving ? 'Salvando...' : saved ? '✅ Salvo!' : '💾 Salvar configurações'}
        </button>
      </div>
    </>
  );
}
