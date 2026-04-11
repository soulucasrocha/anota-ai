import { useState, useEffect } from 'react';

const STEPS = [
  { key: 'preparing',  label: '👨‍🍳 Pedido aceito — Em preparo',  color: '#3b82f6' },
  { key: 'delivering', label: '🛵 Saiu para entrega',             color: '#8b5cf6' },
  { key: 'delivered',  label: '✅ Pedido entregue',               color: '#10b981' },
];

const VARS = ['{{nome}}', '{{pedido}}', '{{total}}'];

export default function RobotPage({ token, storeId }) {
  const [bot,       setBot]       = useState(null);
  const [accounts,  setAccounts]  = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testStep,  setTestStep]  = useState('preparing');
  const [testLog,   setTestLog]   = useState(null); // null | { ok, msg }
  const [testing,   setTesting]   = useState(false);

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/admin-products?type=bot&storeId=${storeId}`, { headers: { 'x-admin-token': token } })
      .then(r => r.json()).then(d => setBot(d.bot)).catch(() => {});
    fetch('/api/wa?action=accounts', { headers: { 'x-admin-token': token } })
      .then(r => r.json()).then(d => setAccounts(Array.isArray(d) ? d : [])).catch(() => {});
  }, [storeId, token]);

  async function save() {
    setSaving(true);
    const r = await fetch(`/api/admin-products?type=bot&storeId=${storeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(bot),
    });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (r.ok && d.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else setTestLog({ ok: false, msg: `Erro ao salvar: ${JSON.stringify(d)}` });
  }

  async function testSend() {
    if (!testPhone) return setTestLog({ ok: false, msg: 'Informe o número de teste.' });
    if (!bot?.accountId) return setTestLog({ ok: false, msg: 'Selecione a conta WhatsApp acima.' });
    const template = bot?.[testStep] || '';
    const message = template
      .replace(/\{\{nome\}\}/g, 'Cliente Teste')
      .replace(/\{\{pedido\}\}/g, '123456')
      .replace(/\{\{total\}\}/g, 'R$ 49,90');
    setTesting(true); setTestLog(null);
    try {
      const r = await fetch(`/api/wa?action=send&id=${bot.accountId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ phone: testPhone.replace(/\D/g, ''), message }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setTestLog({ ok: true,  msg: `✅ Enviado! Resposta: ${JSON.stringify(d)}` });
      else      setTestLog({ ok: false, msg: `❌ Erro ${r.status}: ${JSON.stringify(d)}` });
    } catch(e) {
      setTestLog({ ok: false, msg: `❌ Exceção: ${e.message}` });
    }
    setTesting(false);
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

      {/* Test send panel */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#374151' }}>🧪 Testar envio</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <input
            placeholder="Número (ex: 5511999999999)"
            value={testPhone}
            onChange={e => setTestPhone(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
          />
          <select
            value={testStep}
            onChange={e => setTestStep(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
          >
            {STEPS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button className="adm-btn primary" style={{ fontSize: 13 }} onClick={testSend} disabled={testing}>
            {testing ? '⏳ Enviando...' : '📤 Testar'}
          </button>
        </div>
        {testLog && (
          <div style={{ padding: '10px 12px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all',
            background: testLog.ok ? '#f0fdf4' : '#fef2f2',
            color:      testLog.ok ? '#15803d' : '#dc2626',
            border: `1px solid ${testLog.ok ? '#86efac' : '#fecaca'}`,
          }}>
            {testLog.msg}
          </div>
        )}
      </div>

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
