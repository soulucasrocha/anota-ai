import { useState, useEffect } from 'react';

export default function TrackingPage({ token, storeId }) {
  const [data,   setData]   = useState({ pixel_id: '', webhook_url: '', utms: {} });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/admin-products?type=tracking&storeId=${storeId}`, { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(d => { if (d.tracking) setData({ pixel_id: '', webhook_url: '', utms: {}, ...d.tracking }); })
      .catch(() => {});
  }, [token, storeId]);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/admin-products?type=tracking&storeId=${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(data),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, color: '#1e2740', margin: 0 }}>📡 Rastreamento</h3>
        <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
          Configurações individuais de tracking para esta loja.
          {saved && <span style={{ color: '#10b981', fontWeight: 600, marginLeft: 8 }}>✓ Salvo!</span>}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="adm-label">🎯 Pixel de Conversão Facebook (ID)</label>
          <input className="adm-input" value={data.pixel_id} onChange={e => setData(d => ({ ...d, pixel_id: e.target.value }))} placeholder="Ex: 1234567890123456" />
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Insira apenas o ID numérico do seu Pixel do Facebook Ads.</p>
        </div>
        <div>
          <label className="adm-label">🔗 Webhook URL</label>
          <input className="adm-input" value={data.webhook_url} onChange={e => setData(d => ({ ...d, webhook_url: e.target.value }))} placeholder="https://seu-gateway.com/webhook" />
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Receba notificações de pagamento (compatível com Veno, outros gateways).</p>
        </div>
        <div>
          <label className="adm-label">📊 UTM padrão (JSON)</label>
          <textarea
            className="adm-input"
            rows={4}
            value={typeof data.utms === 'object' ? JSON.stringify(data.utms, null, 2) : data.utms}
            onChange={e => { try { setData(d => ({ ...d, utms: JSON.parse(e.target.value) })); } catch { setData(d => ({ ...d, utms: e.target.value })); } }}
            placeholder={'{\n  "utm_source": "instagram",\n  "utm_medium": "social"\n}'}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>
        <button className="adm-btn primary" onClick={save} disabled={saving || !storeId}>
          {saving ? 'Salvando...' : '💾 Salvar configurações'}
        </button>
      </div>
    </div>
  );
}
