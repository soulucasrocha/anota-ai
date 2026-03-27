import { useState, useEffect } from 'react';

const DAYS = [
  { key: 'seg', label: 'Segunda' },
  { key: 'ter', label: 'Terça' },
  { key: 'qua', label: 'Quarta' },
  { key: 'qui', label: 'Quinta' },
  { key: 'sex', label: 'Sexta' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

function initHours(stored) {
  return DAYS.map(d => {
    const found = (stored || []).find(h => h.day === d.key);
    return found
      ? { ...found }
      : { day: d.key, enabled: false, open: '18:00', close: '23:00' };
  });
}

export default function StoreProfilePage({ token, storeId, store, onUpdated }) {
  const [name,      setName]      = useState(store?.name      || '');
  const [slug,      setSlug]      = useState(store?.slug      || '');
  const [logoUrl,   setLogoUrl]   = useState(store?.logo_url  || '');
  const [whatsapp,  setWhatsapp]  = useState(store?.whatsapp  || '');
  const [hours,     setHours]     = useState(() => initHours(store?.hours));
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  // Sincroniza campos quando store carrega/muda (ex: após refresh)
  useEffect(() => {
    if (!store) return;
    setName(store.name || '');
    setSlug(store.slug || '');
    setLogoUrl(store.logo_url || '');
    setWhatsapp(store.whatsapp || '');
    setHours(initHours(store.hours));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id]);

  function handleNameChange(val) {
    setName(val);
    const auto = val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setSlug(auto);
  }

  function updateHour(idx, field, value) {
    setHours(prev => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  }

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/admin-stores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id: storeId, name, slug, logo_url: logoUrl, whatsapp, hours }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onUpdated?.();
    } catch {}
    setSaving(false);
  }

  const storeFrontUrl = slug ? `${window.location.origin}/${slug}` : '';

  return (
    <div style={{ maxWidth: 540 }}>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, color: '#1e2740', margin: 0 }}>🏪 Perfil da Loja</h3>
        <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
          Alterações aparecem imediatamente no cardápio digital.
          {saved && <span style={{ color: '#10b981', fontWeight: 600, marginLeft: 8 }}>✓ Salvo!</span>}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="adm-label">Nome da loja</label>
          <input className="adm-input" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Ex: Pizzaria do João" />
        </div>
        <div>
          <label className="adm-label">Slug (URL da loja)</label>
          <input className="adm-input" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="ex-pizzaria-do-joao" />
          <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Gerado automaticamente do nome. Pode editar manualmente.</p>
        </div>
        <div>
          <label className="adm-label">URL do logo (imagem)</label>
          <input className="adm-input" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
          {logoUrl && <img src={logoUrl} alt="Logo" style={{ marginTop: 8, height: 60, borderRadius: 8, objectFit: 'contain', background: '#f5f5f5', padding: 4 }} onError={e => e.target.style.display='none'} />}
        </div>
        <div>
          <label className="adm-label">WhatsApp da loja</label>
          <input
            className="adm-input"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))}
            placeholder="Ex: 11999998888 (só números, com DDD)"
            maxLength={15}
          />
          <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
            Número com DDD, sem espaços ou símbolos. Ex: <b>11999998888</b><br/>
            Aparece como botão "Falar com a loja" no pedido do cliente.
          </p>
        </div>

        {/* Store Hours */}
        <div>
          <label className="adm-label">🕐 Horários de funcionamento</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {DAYS.map((d, idx) => {
              const h = hours[idx];
              return (
                <div key={d.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: h.enabled ? '#f0fdf4' : '#f9fafb',
                  borderRadius: 8, padding: '10px 12px',
                  border: `1px solid ${h.enabled ? '#86efac' : '#e5e7eb'}`,
                }}>
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => updateHour(idx, 'enabled', !h.enabled)}
                    style={{
                      width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                      background: h.enabled ? '#10b981' : '#d1d5db',
                      position: 'relative', transition: 'background .2s', flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 2, left: h.enabled ? 20 : 2,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: 'left .2s', display: 'block',
                      boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                    }}/>
                  </button>
                  <span style={{ width: 70, fontSize: 13, fontWeight: 600, color: h.enabled ? '#166534' : '#9ca3af' }}>
                    {d.label}
                  </span>
                  {h.enabled ? (
                    <>
                      <input
                        type="time"
                        value={h.open}
                        onChange={e => updateHour(idx, 'open', e.target.value)}
                        style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px', fontSize: 13, color: '#374151' }}
                      />
                      <span style={{ fontSize: 12, color: '#6b7280' }}>às</span>
                      <input
                        type="time"
                        value={h.close}
                        onChange={e => updateHour(idx, 'close', e.target.value)}
                        style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px', fontSize: 13, color: '#374151' }}
                      />
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Fechado</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {storeFrontUrl && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 12 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#166534' }}>🔗 Link do cardápio:</p>
            <a href={storeFrontUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#16a34a', fontWeight: 700, wordBreak: 'break-all' }}>{storeFrontUrl}</a>
          </div>
        )}
        <button className="adm-btn primary" onClick={save} disabled={saving}>
          {saving ? 'Salvando...' : '💾 Salvar alterações'}
        </button>
      </div>
    </div>
  );
}
