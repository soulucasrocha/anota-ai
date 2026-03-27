import { useState } from 'react';

export default function StoreProfilePage({ token, storeId, store, onUpdated }) {
  const [name,    setName]    = useState(store?.name     || '');
  const [logoUrl, setLogoUrl] = useState(store?.logo_url || '');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/admin-stores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id: storeId, name, logo_url: logoUrl }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onUpdated?.();
    } catch {}
    setSaving(false);
  }

  const storeFrontUrl = store?.slug ? `${window.location.origin}/${store.slug}` : '';

  return (
    <div style={{ maxWidth: 500 }}>
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
          <input className="adm-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pizzaria do João" />
        </div>
        <div>
          <label className="adm-label">URL do logo (imagem)</label>
          <input className="adm-input" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
          {logoUrl && <img src={logoUrl} alt="Logo" style={{ marginTop: 8, height: 60, borderRadius: 8, objectFit: 'contain', background: '#f5f5f5', padding: 4 }} onError={e => e.target.style.display='none'} />}
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
