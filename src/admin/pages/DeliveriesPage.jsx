import { useState, useEffect } from 'react';

/* ─── Platform definitions ─────────────────────────────────────────────────── */
const PLATFORMS = [
  {
    key: 'ifood',
    name: 'iFood Entregador',
    emoji: '🍔',
    color: '#ea1d2c',
    colorLight: '#fff5f5',
    colorBorder: '#fca5a5',
    tag: 'Sob Demanda',
    tagColor: '#ea1d2c',
    desc: 'Chame um motoboy iFood para pedidos do seu cardápio. Botão aparece no Kanban ao mover para "Em Entrega".',
    docsUrl: 'https://developer.ifood.com.br',
    portalUrl: 'https://portal.ifood.com.br',
    fields: [],
    steps: [
      { n: '1', text: 'Clique em "Salvar e ativar" abaixo para habilitar o botão no Kanban.' },
      { n: '2', text: 'Quando um pedido for para "Em Entrega", aparece o botão 🛵 Chamar iFood.' },
      { n: '3', text: 'Clique para abrir o iFood Gestor já na seção "Sob Demanda > Pedidos de outros canais".' },
      { n: '4', text: 'Clique em "Solicitar entrega" no iFood para despachar o motoboy.' },
    ],
    note: null,
    autoTrigger: false,
    manualButton: true,
  },
  {
    key: '99food',
    name: '99 Entregas',
    emoji: '🟡',
    color: '#f5a623',
    colorLight: '#fffbeb',
    colorBorder: '#fcd34d',
    tag: '99 Empresas',
    tagColor: '#d97706',
    desc: 'Solicite corridas de moto para entrega via 99 Empresas. Requer conta 99 Empresas ativa com acesso à API.',
    docsUrl: 'https://developer.99app.com',
    portalUrl: 'https://empresas.99app.com',
    fields: [
      { key: 'apiKey',    label: 'API Key',    placeholder: 'Ex: 99_key_abc123...',  secret: true  },
      { key: 'accountId', label: 'Account ID', placeholder: 'Ex: acc_xyz789',         secret: false },
    ],
    steps: [
      { n: '1', text: 'Acesse o portal 99 Empresas e crie uma conta.' },
      { n: '2', text: 'No painel, vá em Integrações > API.' },
      { n: '3', text: 'Copie a API Key e o Account ID.' },
      { n: '4', text: 'Cole abaixo e clique em Conectar.' },
    ],
    note: 'A 99 Empresas oferece API para integração direta. Para pedidos de logística avulsos, o portal web também pode ser usado.',
    autoTrigger: false,
  },
];

/* ─── Helper ──────────────────────────────────────────────────────────────── */
function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: bg || '#f3f4f6', color: color || '#6b7280',
    }}>{label}</span>
  );
}

/* ─── Platform Card ──────────────────────────────────────────────────────── */
function PlatformCard({ platform, config, onChange, onSave, saving, saved, token }) {
  const [open,       setOpen]       = useState(false);
  const [showSecret, setShowSecret] = useState({});
  const [testing,    setTesting]    = useState(false);
  const [testResult, setTestResult] = useState(null);

  const isConnected = !!(config?.connected);
  const autoEnabled = !!(config?.autoEnabled);
  const allFilled   = platform.fields.length === 0 ? true : platform.fields.every(f => config?.[f.key]);

  function toggleSecret(key) {
    setShowSecret(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleTestLogin() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch('/api/wa?action=ifood-test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ email: config?.email, password: config?.password }),
      });
      const d = await r.json();
      if (r.ok) {
        setTestResult({ ok: true, msg: '✅ Login realizado com sucesso! Sessão salva.', screenshot: d.screenshot, url: d.url });
      } else {
        setTestResult({ ok: false, msg: `❌ ${d.error || 'Login falhou'}`, screenshot: d.screenshot, url: d.currentUrl });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: `❌ Sem conexão com o backend: ${e.message}` });
    }
    setTesting(false);
  }

  async function handleConnect() {
    onSave(platform.key, { ...config, connected: allFilled });
  }

  async function handleDisconnect() {
    onSave(platform.key, { ...config, connected: false, autoEnabled: false });
  }

  function toggleAuto() {
    onSave(platform.key, { ...config, autoEnabled: !autoEnabled });
  }

  return (
    <div style={{
      border: `2px solid ${isConnected ? platform.color : platform.colorBorder}`,
      borderRadius: 16, background: '#fff',
      boxShadow: isConnected ? `0 0 0 3px ${platform.colorLight}` : 'none',
      overflow: 'hidden', transition: 'all 0.2s',
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Logo icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: `linear-gradient(135deg, ${platform.color}, ${platform.color}cc)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, boxShadow: `0 4px 12px ${platform.color}44`,
        }}>
          {platform.emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#1e2740' }}>{platform.name}</span>
            <Badge
              label={isConnected ? '● Conectado' : '○ Não conectado'}
              color={isConnected ? '#16a34a' : '#9ca3af'}
              bg={isConnected ? '#dcfce7' : '#f3f4f6'}
            />
            <Badge label={platform.tag} color={platform.tagColor} bg={platform.colorLight} />
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{platform.desc}</p>
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          style={{
            padding: '7px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
            background: open ? '#f9fafb' : '#fff', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {open ? '▲ Fechar' : '▼ Configurar'}
        </button>
      </div>

      {/* ── Config panel ── */}
      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '20px', background: '#fafafa' }}>
          {/* Steps */}
          <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Como configurar
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {platform.steps.map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 50, background: platform.color,
                  color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                }}>{s.n}</div>
                <span style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.5 }}>{s.text}</span>
              </div>
            ))}
          </div>

          {/* Credential fields */}
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Credenciais
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
            {platform.fields.map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  {f.label}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={f.secret && !showSecret[f.key] ? 'password' : 'text'}
                    placeholder={f.placeholder}
                    value={config?.[f.key] || ''}
                    onChange={e => onChange({ ...config, [f.key]: e.target.value })}
                    style={{
                      width: '100%', padding: `9px ${f.secret ? '34px' : '12px'} 9px 12px`,
                      borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12,
                      boxSizing: 'border-box', background: '#fff',
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  {f.secret && (
                    <button
                      onClick={() => toggleSecret(f.key)}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0,
                      }}
                    >
                      {showSecret[f.key] ? '🙈' : '👁️'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          {platform.note && (
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#713f12' }}>⚠️ {platform.note}</p>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={handleConnect}
              disabled={saving}
              style={{
                padding: '9px 22px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                background: platform.color, color: '#fff', transition: 'background 0.2s',
              }}
            >
              {saving ? '⏳ Salvando...' : isConnected ? '✅ Ativado — Atualizar' : '🔗 Salvar e ativar'}
            </button>
            {isConnected && (
              <button
                onClick={handleDisconnect}
                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Desativar
              </button>
            )}
            <a
              href={platform.portalUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '9px 18px', borderRadius: 8, border: `1px solid ${platform.color}`, fontWeight: 600, fontSize: 12,
                color: platform.color, textDecoration: 'none',
              }}
            >
              🌐 Abrir portal ↗
            </a>
          </div>

          {/* Test result feedback */}
          {testResult && (
            <div style={{ marginTop: 12 }}>
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: testResult.ok ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${testResult.ok ? '#86efac' : '#fca5a5'}`,
                fontSize: 12, fontWeight: 600, color: testResult.ok ? '#16a34a' : '#dc2626',
              }}>
                {testResult.msg}
                {testResult.url && (
                  <span style={{ display: 'block', fontWeight: 400, color: '#6b7280', marginTop: 4 }}>
                    🌐 URL: {testResult.url}
                  </span>
                )}
              </div>
              {testResult.screenshot && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                    📸 Screenshot do que o browser viu:
                  </p>
                  <img
                    src={`data:image/png;base64,${testResult.screenshot}`}
                    alt="screenshot iFood"
                    style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb', maxHeight: 300, objectFit: 'contain', background: '#f9fafb' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Auto-trigger toggle (iFood only) */}
          {platform.autoTrigger && isConnected && (
            <div style={{ marginTop: 14, padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e2740' }}>⚡ Automação automática</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                  Solicita entregador automaticamente ao mover pedido para "Em Entrega"
                </p>
              </div>
              <button
                onClick={toggleAuto}
                style={{
                  padding: '7px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 12,
                  background: autoEnabled ? '#16a34a' : '#e5e7eb',
                  color: autoEnabled ? '#fff' : '#6b7280',
                  transition: 'all 0.2s',
                }}
              >
                {autoEnabled ? '✅ ON' : '○ OFF'}
              </button>
            </div>
          )}

          {saved && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#16a34a', fontWeight: 700 }}>✅ Salvo com sucesso!</p>
          )}
        </div>
      )}

      {/* ── Connected action bar ── */}
      {isConnected && (
        <div style={{
          borderTop: `2px solid ${platform.colorBorder}`,
          padding: '12px 20px',
          background: platform.colorLight,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
              ✅ Integração ativa
            </span>
            <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>
              {platform.autoTrigger && autoEnabled
                ? '⚡ Automação ON — entregador solicitado automaticamente'
                : 'Botão "Chamar entregador" disponível no Kanban'}
            </span>
          </div>
          <a
            href={platform.portalUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 8, background: platform.color,
              color: '#fff', fontWeight: 700, fontSize: 12, textDecoration: 'none',
              boxShadow: `0 2px 8px ${platform.color}55`,
            }}
          >
            🛵 Abrir {platform.tag} ↗
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── How it works section ─────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { icon: '🧾', title: 'Pedido entra no Kanban', desc: 'O cliente faz o pedido no cardápio digital.' },
    { icon: '👨‍🍳', title: 'Aceito e preparado',      desc: 'Você aceita o pedido e começa o preparo.' },
    { icon: '🛵', title: 'Chamar entregador',        desc: 'Ao mover para "Em Entrega", aparece o botão para acionar iFood ou 99.' },
    { icon: '✅', title: 'Entregue',                  desc: 'Marque como entregue ao finalizar.' },
  ];
  return (
    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 16, padding: '20px 24px', marginTop: 24 }}>
      <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: '#0369a1' }}>🔄 Fluxo de entrega integrado</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e0f2fe' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#1e2740' }}>{s.title}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ────────────────────────────────────────────────────────────── */
export default function DeliveriesPage({ token, storeId }) {
  const [integrations, setIntegrations] = useState({});
  const [saving,       setSaving]       = useState(null);
  const [saved,        setSaved]        = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/admin-products?type=delivery-integrations&storeId=${storeId}`, {
      headers: { 'x-admin-token': token },
    })
      .then(r => r.json())
      .then(d => { setIntegrations(d.integrations || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, storeId]);

  async function handleSave(key, cfg) {
    setSaving(key);
    const updated = { ...integrations, [key]: cfg };
    try {
      await fetch(`/api/admin-products?type=delivery-integrations&storeId=${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(updated),
      });
      setIntegrations(updated);
      setSaved(key);
      setTimeout(() => setSaved(null), 3000);
    } catch {}
    setSaving(null);
  }

  const connected = PLATFORMS.filter(p => integrations[p.key]?.connected);

  if (loading) return <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Carregando...</div>;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 20, color: '#1e2740', margin: '0 0 8px', fontWeight: 800 }}>
          🛵 Integrações de Entrega
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          Conecte plataformas de logística para chamar motoboys diretamente pelo painel Kanban.
          {connected.length > 0 && (
            <span style={{ marginLeft: 8, color: '#16a34a', fontWeight: 700 }}>
              {connected.length} plataforma{connected.length > 1 ? 's' : ''} conectada{connected.length > 1 ? 's' : ''} ✓
            </span>
          )}
        </p>
      </div>

      {/* ── Platform cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {PLATFORMS.map(p => (
          <PlatformCard
            key={p.key}
            platform={p}
            config={integrations[p.key] || {}}
            onChange={cfg => setIntegrations(prev => ({ ...prev, [p.key]: cfg }))}
            onSave={handleSave}
            saving={saving === p.key}
            saved={saved === p.key}
            token={token}
          />
        ))}
      </div>

      {/* ── How it works ── */}
      <HowItWorks />

      {/* ── Info box ── */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginTop: 20 }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#475569' }}>ℹ️ Informações importantes</p>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {[
            'iFood e 99 exigem conta empresarial ativa com contrato de parceria logística.',
            'As credenciais são salvas com segurança e nunca expostas no front-end.',
            'Sem contrato de API, use os botões de acesso rápido ao portal de cada plataforma.',
            'O botão "Chamar entregador" aparece no card do Kanban ao mover o pedido para "Em Entrega".',
          ].map((t, i) => (
            <li key={i} style={{ fontSize: 12, color: '#64748b', marginBottom: 5, lineHeight: 1.5 }}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
