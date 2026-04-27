import { useState, useEffect, useCallback } from 'react';

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return new Date(lastSeen) > new Date(Date.now() - 5 * 60 * 1000);
}

export default function DriversPage({ token, storeId }) {
  const [tab,          setTab]          = useState('list'); // 'list' | 'online' | 'stats'
  const [drivers,      setDrivers]      = useState([]);
  const [online,       setOnline]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [onlineLoading,setOnlineLoading]= useState(false);
  const [form,         setForm]         = useState({ name: '', phone: '', email: '', login: '', password: '' });
  const [showPwd,      setShowPwd]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [editId,       setEditId]       = useState(null);
  const [copied,       setCopied]       = useState(false);
  const [statsData,    setStatsData]    = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsPeriod,  setStatsPeriod]  = useState('today'); // 'today' | 'yesterday' | 'week'

  const driverUrl = `${window.location.origin}/motorista?loja=${storeId}`;

  async function fetchDrivers() {
    const r = await fetch(`/api/driver?scope=admin&storeId=${storeId}`, {
      headers: { 'x-admin-token': token, 'x-store-id': storeId },
    });
    const d = await r.json();
    setDrivers(d.drivers || []);
    setLoading(false);
  }

  const fetchStats = useCallback(async () => {
    if (!storeId) return;
    setStatsLoading(true);
    try {
      const r = await fetch(`/api/driver?scope=stats&storeId=${storeId}`, {
        headers: { 'x-admin-token': token, 'x-store-id': storeId },
      });
      const d = await r.json();
      setStatsData(d);
    } catch {}
    setStatsLoading(false);
  }, [token, storeId]);

  const fetchOnline = useCallback(async () => {
    if (!storeId) return;
    setOnlineLoading(true);
    try {
      const r = await fetch(`/api/driver?scope=online&storeId=${storeId}`, {
        headers: { 'x-admin-token': token, 'x-store-id': storeId },
      });
      const d = await r.json();
      setOnline(d.drivers || []);
    } catch {}
    setOnlineLoading(false);
  }, [token, storeId]);

  useEffect(() => { if (storeId) fetchDrivers(); }, [storeId]);

  // Auto-refresh online tab every 15s when active
  useEffect(() => {
    if (tab !== 'online') return;
    fetchOnline();
    const t = setInterval(fetchOnline, 15000);
    return () => clearInterval(t);
  }, [tab, fetchOnline]);

  // Load stats when tab is active
  useEffect(() => {
    if (tab === 'stats') fetchStats();
  }, [tab, fetchStats]);

  function startEdit(driver) {
    setEditId(driver.id);
    setForm({ name: driver.name, phone: driver.phone || '', email: driver.email || '', login: driver.login || '', password: '' });
    setError('');
  }

  function cancelEdit() {
    setEditId(null);
    setForm({ name: '', phone: '', email: '', login: '', password: '' });
    setError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name || !form.login) { setError('Nome e login são obrigatórios'); return; }
    if (!editId && !form.password) { setError('Senha é obrigatória'); return; }
    setSaving(true); setError('');
    const method = editId ? 'PATCH' : 'POST';
    const body   = editId
      ? { id: editId, name: form.name, phone: form.phone, email: form.email, login: form.login, ...(form.password ? { password: form.password } : {}) }
      : form;
    const r = await fetch(`/api/driver?scope=admin&storeId=${storeId}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token, 'x-store-id': storeId },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) { setError(d.error || 'Erro ao salvar'); return; }
    cancelEdit();
    fetchDrivers();
  }

  async function toggleActive(driver) {
    await fetch(`/api/driver?scope=admin&storeId=${storeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token, 'x-store-id': storeId },
      body: JSON.stringify({ id: driver.id, active: !driver.active }),
    });
    fetchDrivers();
  }

  const onlineCount = online.filter(d => d.online).length;

  if (loading) return <div style={{ color: '#aaa', padding: 40, textAlign: 'center' }}>Carregando...</div>;

  return (
    <div>
      {/* Link do app */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e40af' }}>📱 Link do App do Entregador</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#3b82f6', wordBreak: 'break-all' }}>{driverUrl}</p>
        </div>
        <button className="adm-btn ghost" style={{ fontSize: 12 }}
          onClick={() => { navigator.clipboard.writeText(driverUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? '✅ Copiado!' : '📋 Copiar link'}
        </button>
        <a href={driverUrl} target="_blank" rel="noreferrer" className="adm-btn ghost" style={{ fontSize: 12, textDecoration: 'none' }}>
          🌐 Abrir
        </a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className={`adm-btn${tab === 'list' ? ' primary' : ' ghost'}`}
          style={{ fontSize: 13 }}
          onClick={() => setTab('list')}
        >
          👥 Entregadores
          <span style={{ marginLeft: 6, background: 'rgba(0,0,0,0.15)', borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
            {drivers.filter(d => d.active).length}
          </span>
        </button>
        <button
          className={`adm-btn${tab === 'online' ? ' primary' : ' ghost'}`}
          style={{ fontSize: 13 }}
          onClick={() => setTab('online')}
        >
          🟢 Online agora
          {onlineCount > 0 && (
            <span style={{ marginLeft: 6, background: '#16a34a', color: '#fff', borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
              {onlineCount}
            </span>
          )}
        </button>
        <button
          className={`adm-btn${tab === 'stats' ? ' primary' : ' ghost'}`}
          style={{ fontSize: 13 }}
          onClick={() => setTab('stats')}
        >
          📊 Resumo
        </button>
      </div>

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        <>
          {/* Form */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: 15, color: '#1e2740', fontWeight: 700 }}>
              {editId ? '✏️ Editar entregador' : '➕ Adicionar entregador'}
            </h4>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nome *</label>
                  <input className="adm-input" placeholder="João da Silva"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Usuário (login) *</label>
                  <input className="adm-input" placeholder="joaoentregador"
                    autoCapitalize="none" autoCorrect="off"
                    value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value.replace(/\s/g,'') }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    Senha {editId ? '(deixe vazio para não alterar)' : '*'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input className="adm-input" type={showPwd ? 'text' : 'password'}
                      placeholder={editId ? '••••••••' : 'mínimo 4 caracteres'}
                      value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      style={{ paddingRight: 36 }} />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
                      {showPwd ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Telefone</label>
                  <input className="adm-input" placeholder="(11) 99999-0000"
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              {error && <p style={{ margin: 0, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>⚠️ {error}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" className="adm-btn primary" disabled={saving} style={{ fontSize: 13 }}>
                  {saving ? 'Salvando...' : editId ? '💾 Atualizar' : '➕ Criar entregador'}
                </button>
                {editId && (
                  <button type="button" className="adm-btn ghost" onClick={cancelEdit} style={{ fontSize: 13 }}>Cancelar</button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: 15, color: '#1e2740', fontWeight: 700 }}>Entregadores cadastrados</h4>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{drivers.filter(d => d.active).length} ativos</span>
            </div>
            {drivers.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#aaa', padding: 40, fontSize: 14 }}>Nenhum entregador cadastrado</p>
            ) : (
              drivers.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid #f9fafb', opacity: d.active ? 1 : 0.5 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: d.active ? '#e53935' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>
                      {d.name[0]?.toUpperCase()}
                    </div>
                    {isOnline(d.last_seen) && (
                      <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, background: '#16a34a', borderRadius: '50%', border: '2px solid #fff' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#1e2740' }}>{d.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
                      👤 <strong style={{ color: '#374151' }}>{d.login || '—'}</strong>
                      {d.phone && <span> · {d.phone}</span>}
                      {isOnline(d.last_seen) && <span style={{ marginLeft: 8, color: '#16a34a', fontWeight: 600 }}>● Online</span>}
                      {!d.active && <span style={{ marginLeft: 8, color: '#dc2626', fontWeight: 600 }}> · Inativo</span>}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="adm-btn ghost" style={{ fontSize: 12 }} onClick={() => startEdit(d)}>✏️ Editar</button>
                    <button className="adm-btn ghost"
                      style={{ fontSize: 12, color: d.active ? '#dc2626' : '#16a34a', borderColor: d.active ? '#fca5a5' : '#86efac' }}
                      onClick={() => toggleActive(d)}>
                      {d.active ? '⏸ Desativar' : '▶ Ativar'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── STATS TAB ── */}
      {tab === 'stats' && (
        <div>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              { key: 'today',     label: '📅 Hoje'   },
              { key: 'yesterday', label: '🗓️ Ontem'  },
              { key: 'week',      label: '📆 Semana' },
              { key: 'month',     label: '🗃️ Mês'    },
            ].map(p => (
              <button
                key={p.key}
                className={`adm-btn${statsPeriod === p.key ? ' primary' : ' ghost'}`}
                style={{ fontSize: 13 }}
                onClick={() => setStatsPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
            <button
              className="adm-btn ghost"
              style={{ fontSize: 12, marginLeft: 'auto' }}
              onClick={fetchStats}
              disabled={statsLoading}
            >
              {statsLoading ? '...' : '🔄 Atualizar'}
            </button>
          </div>

          {statsLoading && !statsData ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Carregando...</div>
          ) : (() => {
            const allDrivers  = statsData?.drivers || [];
            const statsMap    = statsData?.stats   || {};

            // Inclui somente entregadores que têm entregas no período OU todos os ativos
            const rows = allDrivers.map(d => ({
              ...d,
              p: statsMap[d.id]?.[statsPeriod] || { count: 0, total: 0, commission: 0 },
            })).sort((a, b) => b.p.commission - a.p.commission);

            const totals = rows.reduce(
              (acc, r) => ({ count: acc.count + r.p.count, total: acc.total + r.p.total, commission: acc.commission + r.p.commission }),
              { count: 0, total: 0, commission: 0 }
            );

            const fmt = v => (v / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            const periodLabel = { today: 'Hoje', yesterday: 'Ontem', week: 'Esta semana', month: 'Últimos 30 dias' }[statsPeriod];

            return (
              <div>
                {rows.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 20px', fontSize: 14 }}>
                    <p style={{ fontSize: 32, marginBottom: 8 }}>📊</p>
                    Sem dados para exibir
                  </div>
                ) : (
                  <>
                    {/* Driver cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                      {rows.map(d => (
                        <div key={d.id} style={{
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: 14,
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          opacity: d.p.count === 0 ? 0.45 : 1,
                        }}>
                          {/* Avatar */}
                          <div style={{
                            width: 44, height: 44, borderRadius: '50%',
                            background: d.p.count > 0 ? '#e53935' : '#e5e7eb',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0,
                          }}>
                            {d.name[0]?.toUpperCase()}
                          </div>

                          {/* Name */}
                          <div style={{ minWidth: 120, flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#1e2740' }}>{d.name}</p>
                            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{periodLabel}</p>
                          </div>

                          {/* Stats grid */}
                          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <div style={{ textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e2740', lineHeight: 1 }}>{d.p.count}</p>
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>entregas</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#059669', lineHeight: 1 }}>{fmt(d.p.total)}</p>
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>em pedidos</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#d97706', lineHeight: 1 }}>{fmt(d.p.commission)}</p>
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>comissão</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals row */}
                    <div style={{
                      background: '#1e2740',
                      borderRadius: 14,
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 20,
                      flexWrap: 'wrap',
                    }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', flex: 1 }}>
                        📊 Total — {periodLabel}
                        <span style={{ marginLeft: 8, fontSize: 12, color: '#93c5fd', fontWeight: 400 }}>
                          {rows.filter(r => r.p.count > 0).length} entregador{rows.filter(r => r.p.count > 0).length !== 1 ? 'es' : ''}
                        </span>
                      </p>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{totals.count}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#93c5fd', fontWeight: 600 }}>entregas</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#6ee7b7', lineHeight: 1 }}>{fmt(totals.total)}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#93c5fd', fontWeight: 600 }}>em pedidos</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fcd34d', lineHeight: 1 }}>{fmt(totals.commission)}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#93c5fd', fontWeight: 600 }}>comissão</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── ONLINE TAB ── */}
      {tab === 'online' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
              Atualiza a cada 15s • Entregadores vistos nos últimos 5 minutos = online
            </p>
            <button className="adm-btn ghost" style={{ fontSize: 12 }} onClick={fetchOnline} disabled={onlineLoading}>
              {onlineLoading ? '...' : '🔄 Atualizar'}
            </button>
          </div>

          {online.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 20px', fontSize: 14 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🛵</p>
              Nenhum entregador ativo no momento
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {online.map(d => {
                const assignment = d.currentAssignment;
                const statusLabel = assignment?.status === 'assigned' ? '⏳ Aceito' : assignment?.status === 'picked' ? '🚗 Em rota' : null;
                const mapsUrl = d.location_lat && d.location_lng
                  ? `https://www.google.com/maps?q=${d.location_lat},${d.location_lng}`
                  : null;

                return (
                  <div key={d.id} style={{
                    background: '#fff',
                    border: `2px solid ${d.online ? '#86efac' : '#e5e7eb'}`,
                    borderRadius: 14,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                  }}>
                    {/* Avatar + online dot */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: d.online ? '#e53935' : '#9ca3af',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 800, fontSize: 20,
                      }}>
                        {d.name[0]?.toUpperCase()}
                      </div>
                      <span style={{
                        position: 'absolute', bottom: 1, right: 1,
                        width: 12, height: 12, borderRadius: '50%',
                        background: d.online ? '#16a34a' : '#9ca3af',
                        border: '2px solid #fff',
                      }} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <strong style={{ fontSize: 15, color: '#1e2740' }}>{d.name}</strong>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: d.online ? '#d1fae5' : '#f3f4f6',
                          color: d.online ? '#065f46' : '#6b7280',
                        }}>
                          {d.online ? '● Online' : '○ Offline'}
                        </span>
                        {statusLabel && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#dbeafe', color: '#1e40af' }}>
                            {statusLabel}
                          </span>
                        )}
                      </div>

                      <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280' }}>
                        Visto pela última vez: {fmtTime(d.last_seen)}
                        {d.phone && <span style={{ marginLeft: 8 }}>· {d.phone}</span>}
                      </p>

                      {assignment && (
                        <p style={{ margin: '0 0 4px', fontSize: 12, color: '#374151' }}>
                          📦 Pedido #{String(assignment.order_id).slice(-6)} — {statusLabel || 'Atribuído'}
                        </p>
                      )}
                      {!assignment && d.online && (
                        <p style={{ margin: '0 0 4px', fontSize: 12, color: '#9ca3af' }}>Aguardando pedido</p>
                      )}

                      {/* GPS */}
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 12, color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', marginTop: 2 }}
                        >
                          📍 Ver localização no mapa
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>
                            (atualizado {fmtTime(d.location_updated_at)})
                          </span>
                        </a>
                      ) : (
                        <span style={{ fontSize: 12, color: '#d1d5db' }}>📍 Localização não disponível</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
