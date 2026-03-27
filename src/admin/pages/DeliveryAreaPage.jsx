import { useState, useEffect } from 'react';

function fmtFee(cents) {
  if (!cents && cents !== 0) return '';
  return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');
}

export default function DeliveryAreaPage({ token, storeId }) {
  const [address,      setAddress]      = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [minOrder,     setMinOrder]     = useState('');
  const [cities,       setCities]       = useState([]); // [{name, fee, expanded, neighborhoods:[{name,fee}]}]
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);

  // Selected city index for neighborhood panel
  const [selectedCity, setSelectedCity] = useState(null);

  // Add city form
  const [newCityName, setNewCityName] = useState('');
  const [newCityFee,  setNewCityFee]  = useState('');

  // Add neighborhood form
  const [newNbName, setNewNbName] = useState('');
  const [newNbFee,  setNewNbFee]  = useState('');

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/admin-products?type=delivery&storeId=${storeId}`, {
      headers: { 'x-admin-token': token }
    })
      .then(r => r.json())
      .then(d => {
        setAddress(d.delivery?.address || '');
        setDeliveryTime(d.delivery?.delivery_time != null ? String(d.delivery.delivery_time) : '');
        setMinOrder(d.delivery?.min_order != null ? String(d.delivery.min_order / 100) : '');
        // Load cities (new format) or migrate from old areas format
        if (d.delivery?.cities) {
          setCities(d.delivery.cities);
        } else if (d.delivery?.areas) {
          // Migrate old areas → cities
          const migrated = d.delivery.areas.map(a => ({
            name: a.name,
            fee: a.fee || 0,
            neighborhoods: a.desc
              ? a.desc.split(',').map(n => ({ name: n.trim(), fee: a.fee || 0 }))
              : [],
          }));
          setCities(migrated);
        }
      })
      .catch(() => {});
  }, [token, storeId]);

  async function save() {
    setSaving(true);
    await fetch('/api/admin-products?type=delivery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token, 'x-store-id': storeId },
      body: JSON.stringify({
        delivery: {
          address,
          delivery_time: deliveryTime !== '' ? Number(deliveryTime) : null,
          min_order: minOrder !== '' ? Math.round(Number(minOrder) * 100) : 0,
          cities,
        },
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addCity() {
    if (!newCityName) return;
    const fee = newCityFee !== '' ? Math.round(Number(newCityFee) * 100) : 0;
    setCities(prev => [...prev, { name: newCityName, fee, neighborhoods: [] }]);
    setNewCityName('');
    setNewCityFee('');
  }

  function removeCity(ci) {
    setCities(prev => prev.filter((_, i) => i !== ci));
    if (selectedCity === ci) setSelectedCity(null);
    else if (selectedCity > ci) setSelectedCity(selectedCity - 1);
  }

  function updateCityFee(ci, feeStr) {
    const fee = feeStr !== '' ? Math.round(Number(feeStr) * 100) : 0;
    setCities(prev => prev.map((c, i) => {
      if (i !== ci) return c;
      // Auto-update neighborhoods that still have the old city fee
      const oldFee = c.fee;
      const updatedNbs = c.neighborhoods.map(nb =>
        nb.fee === oldFee ? { ...nb, fee } : nb
      );
      return { ...c, fee, neighborhoods: updatedNbs };
    }));
  }

  function addNeighborhood(ci) {
    if (!newNbName) return;
    const city = cities[ci];
    const fee = newNbFee !== '' ? Math.round(Number(newNbFee) * 100) : city.fee;
    setCities(prev => prev.map((c, i) =>
      i === ci ? { ...c, neighborhoods: [...c.neighborhoods, { name: newNbName, fee }] } : c
    ));
    setNewNbName('');
    setNewNbFee('');
  }

  function removeNeighborhood(ci, ni) {
    setCities(prev => prev.map((c, i) =>
      i === ci ? { ...c, neighborhoods: c.neighborhoods.filter((_, j) => j !== ni) } : c
    ));
  }

  function updateNeighborhoodFee(ci, ni, feeStr) {
    const fee = feeStr !== '' ? Math.round(Number(feeStr) * 100) : 0;
    setCities(prev => prev.map((c, i) =>
      i === ci ? {
        ...c,
        neighborhoods: c.neighborhoods.map((nb, j) => j === ni ? { ...nb, fee } : nb),
      } : c
    ));
  }

  const mapsUrl = address
    ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : null;

  const city = selectedCity !== null ? cities[selectedCity] : null;

  return (
    <>
      {/* Store Address */}
      <div className="adm-card">
        <div className="adm-card-header"><h3>📍 Endereço da Loja</h3></div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="adm-label">Endereço completo</label>
            <input
              className="adm-input"
              placeholder="Ex: Rua das Flores, 123, Bairro, Cidade - UF"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>
          {mapsUrl && (
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <iframe title="Localização" src={mapsUrl} width="100%" height="260"
                style={{ display: 'block', border: 'none' }} allowFullScreen loading="lazy" />
            </div>
          )}
        </div>
      </div>

      {/* Delivery settings */}
      <div className="adm-card">
        <div className="adm-card-header"><h3>⚙️ Configurações de Entrega</h3></div>
        <div className="adm-card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="adm-label">⏱️ Tempo de entrega (minutos)</label>
            <input className="adm-input" type="number" min="1" placeholder="Ex: 45"
              value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} />
            <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Timer do Kanban.</p>
          </div>
          <div>
            <label className="adm-label">💰 Pedido mínimo (R$)</label>
            <input className="adm-input" type="number" min="0" step="0.01" placeholder="Ex: 30.00"
              value={minOrder} onChange={e => setMinOrder(e.target.value)} />
            <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>0 = sem mínimo.</p>
          </div>
        </div>
      </div>

      {/* Cities & Neighborhoods — sidebar layout */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h3>🏙️ Cidades e Bairros</h3>
          <span style={{ fontSize: 13, color: '#aaa' }}>{cities.length} cidade(s)</span>
        </div>
        <div className="adm-card-body" style={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: 340, borderTop: '1px solid #f3f4f6' }}>

            {/* LEFT — Cities sidebar */}
            <div style={{ borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '10px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: .5 }}>Cidades</p>
              </div>

              {/* Cities list */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {cities.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                    Nenhuma cidade ainda
                  </div>
                )}
                {cities.map((c, ci) => (
                  <div
                    key={ci}
                    onClick={() => setSelectedCity(ci === selectedCity ? null : ci)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px', cursor: 'pointer',
                      background: selectedCity === ci ? '#fef2f2' : 'transparent',
                      borderLeft: selectedCity === ci ? '3px solid #e53935' : '3px solid transparent',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background .15s',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#1e2740', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                        {c.fee > 0 ? fmtFee(c.fee) : 'Grátis'} · {c.neighborhoods.length} bairro(s)
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); removeCity(ci); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 14, padding: 2, flexShrink: 0 }}
                      title="Remover cidade"
                    >✕</button>
                  </div>
                ))}
              </div>

              {/* Add city form */}
              <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>➕ Nova cidade</p>
                <input
                  className="adm-input" placeholder="Nome da cidade"
                  value={newCityName} onChange={e => setNewCityName(e.target.value)}
                  style={{ marginBottom: 6 }}
                />
                <input
                  className="adm-input" type="number" step="0.01" placeholder="Taxa padrão (R$)"
                  value={newCityFee} onChange={e => setNewCityFee(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <button className="adm-btn primary" onClick={addCity} disabled={!newCityName}
                  style={{ width: '100%', fontSize: 12 }}>
                  ➕ Adicionar cidade
                </button>
              </div>
            </div>

            {/* RIGHT — Neighborhoods panel */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {!city ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: '#aaa', padding: 40 }}>
                  <span style={{ fontSize: 32 }}>🏘️</span>
                  <p style={{ fontSize: 13, margin: 0 }}>Selecione uma cidade para gerenciar os bairros</p>
                </div>
              ) : (
                <>
                  {/* City header */}
                  <div style={{ padding: '12px 16px', background: '#fef2f2', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, color: '#1e2740', fontSize: 14 }}>{city.name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Taxa padrão: {city.fee > 0 ? fmtFee(city.fee) : 'Grátis'} · aplicada automaticamente nos bairros</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: 12, color: '#6b7280' }}>Taxa (R$)</label>
                      <input
                        type="number" step="0.01"
                        placeholder="0.00"
                        value={city.fee > 0 ? (city.fee / 100).toFixed(2) : ''}
                        onChange={e => updateCityFee(selectedCity, e.target.value)}
                        style={{ width: 80, border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}
                      />
                    </div>
                  </div>

                  {/* Neighborhoods list */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                    {city.neighborhoods.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                        Nenhum bairro cadastrado. Adicione abaixo.
                      </div>
                    ) : (
                      city.neighborhoods.map((nb, ni) => (
                        <div key={ni} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 16px', borderBottom: '1px solid #f3f4f6',
                        }}>
                          <span style={{ flex: 1, fontSize: 13, color: '#374151', fontWeight: 500 }}>📍 {nb.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="number" step="0.01"
                              value={nb.fee > 0 ? (nb.fee / 100).toFixed(2) : ''}
                              onChange={e => updateNeighborhoodFee(selectedCity, ni, e.target.value)}
                              placeholder="Grátis"
                              style={{ width: 80, border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 7px', fontSize: 12 }}
                            />
                            <span style={{ fontSize: 11, color: '#aaa' }}>R$</span>
                          </div>
                          <button
                            onClick={() => removeNeighborhood(selectedCity, ni)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 14 }}
                          >✕</button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add neighborhood form */}
                  <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Nome do bairro</label>
                      <input
                        className="adm-input"
                        placeholder="Ex: Centro"
                        value={newNbName}
                        onChange={e => setNewNbName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addNeighborhood(selectedCity)}
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                    <div style={{ width: 100 }}>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Taxa (R$)</label>
                      <input
                        className="adm-input"
                        type="number" step="0.01"
                        placeholder={city.fee > 0 ? (city.fee / 100).toFixed(2) : '0.00'}
                        value={newNbFee}
                        onChange={e => setNewNbFee(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addNeighborhood(selectedCity)}
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                    <button
                      className="adm-btn primary"
                      onClick={() => addNeighborhood(selectedCity)}
                      disabled={!newNbName}
                      style={{ whiteSpace: 'nowrap', fontSize: 13 }}
                    >
                      ➕ Adicionar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
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
