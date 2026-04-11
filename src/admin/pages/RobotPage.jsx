import { useState, useEffect } from 'react';

const STEPS = [
  { key: 'preparing',  label: '👨‍🍳 Pedido aceito — Em preparo',  color: '#3b82f6' },
  { key: 'delivering', label: '🛵 Saiu para entrega',             color: '#8b5cf6' },
  { key: 'delivered',  label: '✅ Pedido entregue',               color: '#10b981' },
];

const VARS = ['{{nome}}', '{{pedido}}', '{{total}}'];

export default function RobotPage({ token, storeId }) {
  const [bot,     setBot]     = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/admin-products?type=bot&storeId=${storeId}`, { headers: { 'x-admin-token': token } })
      .then(r => r.json()).then(d => setBot(d.bot)).catch(() => {});
    fetch('/api/wa?action=accounts', { headers: { 'x-admin-token': token } })
      .then(r => r.json()).then(d => setAccounts(Array.isArray(d) ? d : [])).catch(() => {});
  }, [storeId, token]);

  async function save() {
    setSaving(true);
    await fetch(`/api/admin-products?type=bot&storeId=${storeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(bot),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function set(key, val) { setBot(b => ({ ...b, [key]: val })); }

  if (!bot) return <div style={{ color: '#aaa', padding: 40 }}>Carregando...</div>;

  const connectedAccounts = accounts.filter(a => a.status === 'connected' || a.state === 'open');

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '14px 18px', marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#15803d', fontWeight: 600 }}>
          🤖 O Robô envia mensagens automáticas no WhatsApp do cliente quando o pedido avança no kanban.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#16a34a' }}>
          Variáveis disponíveis: {VARS.map(v => <code key={v} style={{ background: '#dcfce7', padding: '1px 5px', borderRadius: 4, marginRight: 6 }}>{v}</code>)}
        </p>
      </div>

      {/* Enable toggle + account selector */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1e2740' }}>Robô ativo</span>
          <button
            onClick={() => set('enabled', !bot.enabled)}
            style={{
              padding: '6px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: bot.enabled ? '#16a34a' : '#e5e7eb',
              color: bot.enabled ? '#fff' : '#6b7280',
            }}
          >
            {bot.enabled ? '✅ ON' : 'OFF'}
          </button>
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
          Conta WhatsApp para envio
        </label>
        {connectedAccounts.length === 0 ? (
          <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>
            ⚠️ Nenhuma conta conectada. Conecte uma conta na aba <strong>Integrações</strong>.
          </p>
        ) : (
          <select
            value={bot.accountId || ''}
            onChange={e => set('accountId', e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
          >
            <option value="">Selecionar conta...</option>
            {connectedAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.name || a.phone || a.id}</option>
            ))}
          </select>
        )}
      </div>

      {/* Message templates */}
      {STEPS.map(step => (
        <div key={step.key} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: step.color, display: 'block', marginBottom: 8 }}>
            {step.label}
          </label>
          <textarea
            rows={4}
            value={bot[step.key] || ''}
            onChange={e => set(step.key, e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }}
            placeholder={`Mensagem enviada quando pedido vai para "${step.label}"...`}
          />
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>
            {(bot[step.key] || '').length} caracteres
          </p>
        </div>
      ))}

      <button
        className="adm-btn primary"
        style={{ width: '100%', padding: '12px', fontSize: 14 }}
        onClick={save}
        disabled={saving}
      >
        {saving ? 'Salvando...' : saved ? '✅ Salvo!' : '💾 Salvar configurações'}
      </button>
    </div>
  );
}
