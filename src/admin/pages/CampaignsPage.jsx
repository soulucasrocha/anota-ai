import { useState, useEffect } from 'react';

function genId() { return Math.random().toString(36).slice(2, 10); }

export default function CampaignsPage({ token, storeId, store }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState('');
  const [form,      setForm]      = useState({ name: '', hashtag: '' });
  const [adding,    setAdding]    = useState(false);

  const slug    = store?.slug || '';
  const baseUrl = `https://oi-anota-ai.vercel.app/${slug}`;

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/admin-products?type=settings&storeId=${storeId}`, { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(d => { setCampaigns(d.settings?.campaigns || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, storeId]);

  async function saveCampaigns(list) {
    setSaving(true);
    try {
      await fetch(`/api/admin-products?type=settings&storeId=${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ campaigns: list }),
      });
      setCampaigns(list);
      showToast('✅ Salvo!');
    } catch { showToast('❌ Erro'); }
    setSaving(false);
  }

  function addCampaign() {
    if (!form.name.trim() || !form.hashtag.trim()) { showToast('Preencha nome e hashtag'); return; }
    const tag = form.hashtag.replace(/^#/, '').replace(/\s+/g, '_').trim();
    saveCampaigns([...campaigns, { id: genId(), name: form.name.trim(), hashtag: tag, created_at: new Date().toISOString() }]);
    setForm({ name: '', hashtag: '' });
    setAdding(false);
  }

  function copyLink(tag) {
    navigator.clipboard.writeText(`${baseUrl}?ref=${tag}`).then(() => showToast('✅ Link copiado!'));
  }

  const thStyle = { textAlign: 'left', padding: '11px 18px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '.6px', borderBottom: '1px solid #f0f2f5', background: '#fafafa', textTransform: 'uppercase' };
  const tdStyle = { padding: '14px 18px', fontSize: 13, borderBottom: '1px solid #f0f2f5' };

  return (
    <>
      {toast && <div className="adm-toast">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e2740', margin: 0 }}>Campanhas</h2>
          <p style={{ fontSize: 14, color: '#aaa', marginTop: 4 }}>Crie links com hashtags para rastrear a origem dos seus pedidos.</p>
        </div>
        <button className="adm-btn primary" onClick={() => setAdding(v => !v)}>
          + Nova Campanha
        </button>
      </div>

      {/* New campaign form */}
      {adding && (
        <div className="adm-card" style={{ marginBottom: 20 }}>
          <div style={{ borderBottom: '1px solid #f0f2f5', padding: '14px 20px', fontWeight: 700, fontSize: 14 }}>Nova Campanha</div>
          <div className="adm-card-body">
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label className="adm-label">Nome da campanha</label>
                <input className="adm-input" placeholder="Ex: Stories Instagram" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label className="adm-label">Hashtag</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7c3aed', fontWeight: 700, fontSize: 14 }}>#</span>
                  <input className="adm-input" style={{ paddingLeft: 24 }} placeholder="stories_jan" value={form.hashtag}
                    onChange={e => setForm(f => ({ ...f, hashtag: e.target.value.replace(/\s/g, '_').replace(/^#/, '') }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="adm-btn primary" onClick={addCampaign} disabled={saving}>
                  {saving ? '...' : 'Criar'}
                </button>
                <button className="adm-btn ghost" onClick={() => setAdding(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div style={{ background: '#eef2ff', border: '1px solid #c7d4f9', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#4f46e5', marginBottom: 20 }}>
        <span>💡</span>
        <span>Compartilhe o link <strong>?ref=hashtag</strong> no WhatsApp ou redes sociais. Quando o cliente fizer um pedido, a campanha aparece na aba <strong>Transações</strong>.</span>
      </div>

      {/* Table */}
      <div className="adm-card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Campanha</th>
              <th style={thStyle}>Hashtag</th>
              <th style={thStyle}>Link de rastreamento</th>
              <th style={thStyle}>Criada em</th>
              <th style={thStyle}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#aaa', padding: 40 }}>Carregando...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: 48 }}>
                <div style={{ color: '#d1d5db', fontSize: 36, marginBottom: 10 }}>🏷️</div>
                <p style={{ color: '#aaa', fontSize: 14 }}>Nenhuma campanha criada</p>
                <p style={{ color: '#bbb', fontSize: 12, marginTop: 4 }}>Clique em "+ Nova Campanha" para começar</p>
              </td></tr>
            ) : campaigns.map(c => (
              <tr key={c.id}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ ...tdStyle, fontWeight: 600, color: '#1e2740' }}>{c.name}</td>
                <td style={tdStyle}>
                  <span style={{ background: '#f5f3ff', color: '#7c3aed', fontWeight: 700, fontSize: 12, padding: '4px 12px', borderRadius: 20 }}>
                    #{c.hashtag}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontSize: 12, color: '#64748b', maxWidth: 280 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {baseUrl}?ref={c.hashtag}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontSize: 12, color: '#aaa' }}>
                  {new Date(c.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="adm-btn ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => copyLink(c.hashtag)}>
                      📋 Copiar Link
                    </button>
                    <button
                      style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
                      onClick={() => saveCampaigns(campaigns.filter(x => x.id !== c.id))}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#ef4444'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
