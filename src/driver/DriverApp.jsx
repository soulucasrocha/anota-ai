import { useState, useEffect, useCallback } from 'react';
import './driver.css';
import DriverMap, { MiniRouteMap } from './DriverMap';

function fmtMoney(cents) { return 'R$ ' + (cents / 100).toFixed(2).replace('.', ','); }
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateKey(iso) {
  if (!iso) return 'sem-data';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function groupByDay(orders) {
  const map = {};
  orders.forEach(o => {
    const key = fmtDateKey(o.delivered_at || o.created_at);
    if (!map[key]) map[key] = { label: fmtDate(o.delivered_at || o.created_at), orders: [] };
    map[key].orders.push(o);
  });
  // Sort keys descending (most recent first)
  return Object.entries(map).sort(([a],[b]) => b.localeCompare(a));
}

// ── Login com usuário + senha ──────────────────────────────────────────────────
function LoginPage({ storeId, onLogin }) {
  const [login,    setLogin]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    if (!login || !password) return;
    setLoading(true); setError('');
    const r = await fetch('/api/driver?scope=auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: login.trim(), password }),
    });
    const d = await r.json().catch(() => ({}));
    setLoading(false);
    if (r.ok) onLogin(d.token, d.driver);
    else setError(d.error || 'Login ou senha inválidos');
  }

  return (
    <div className="drv-login">
      <div className="drv-login-card">
        <div className="drv-login-icon">🛵</div>
        <h1 className="drv-login-title">Área do Entregador</h1>
        <p className="drv-login-sub">Entre com seu usuário e senha</p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="drv-field">
            <label className="drv-label">Usuário</label>
            <input
              className="drv-input"
              type="text"
              placeholder="seu_usuario"
              autoCapitalize="none"
              autoCorrect="off"
              value={login}
              onChange={e => setLogin(e.target.value)}
              autoFocus
            />
          </div>
          <div className="drv-field">
            <label className="drv-label">Senha</label>
            <div className="drv-pwd-wrap">
              <input
                className="drv-input"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="drv-pwd-toggle"
                onClick={() => setShowPwd(v => !v)}
                tabIndex={-1}
              >
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {error && <p className="drv-error">{error}</p>}
          <button className="drv-btn primary" type="submit" disabled={loading || !login || !password}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── History card ───────────────────────────────────────────────────────────────
function HistoryCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const commission = order.driver_commission != null ? order.driver_commission : null;
  const customer   = order.customer || {};
  const phone    = customer.phone || '';
  const waPhone  = phone.replace(/\D/g, '');
  const items    = order.items || [];

  return (
    <div className="drv-hist-card">
      {/* Top: ID + time */}
      <div className="drv-hist-card-top">
        <span className="drv-hist-id">#{orderNum(order)}</span>
        <span className="drv-hist-time">{fmtTime(order.delivered_at || order.created_at)}</span>
        <span style={{ fontSize: 11, background: '#d1fae5', color: '#065f46', fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>✅ Entregue</span>
      </div>

      {/* Comissão — always visible */}
      {commission != null && (
        <div className="drv-fee-row" style={{ marginTop: 8, marginBottom: 8, background: '#eff6ff', borderRadius: 8, padding: '6px 10px' }}>
          <span className="drv-fee-label" style={{ color: '#1d4ed8', fontWeight: 700 }}>🏍️ Sua comissão</span>
          <span className="drv-fee-val" style={{ color: '#1d4ed8', fontWeight: 800 }}>{commission > 0 ? fmtMoney(commission) : 'Sem comissão'}</span>
        </div>
      )}

      {/* Toggle */}
      <button className="drv-details-toggle" onClick={() => setExpanded(v => !v)}>
        {expanded ? '▲ Ocultar detalhes' : '▼ Ver detalhes do pedido'}
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="drv-card-detail">
          {customer.name && <p className="drv-detail-name">👤 {customer.name}</p>}
          {phone && (
            <a href={`https://wa.me/55${waPhone}`} className="drv-detail-phone" target="_blank" rel="noreferrer">
              📞 {phone}
            </a>
          )}
          {order.address && (
            <div className="drv-card-addr" style={{ marginBottom: 10 }}>
              <span>📍</span><span>{order.address}</span>
            </div>
          )}
          {items.length > 0 && (
            <div className="drv-items">
              {items.map((it, i) => (
                <div key={i} className="drv-item-row">
                  <span className="drv-item-qty">{it.qty || 1}x</span>
                  <span className="drv-item-name">{it.name}</span>
                </div>
              ))}
            </div>
          )}
          {order.change_note && <p className="drv-change-note">💵 {order.change_note}</p>}
          <div className="drv-total-row">
            <span>Pagamento</span>
            <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 13 }}>
              {PM_LABELS[order.payment_method] || '—'}
            </span>
          </div>
          <div className="drv-total-row" style={{ marginTop: 4 }}>
            <span>Total do pedido</span>
            <span className="drv-card-total">{fmtMoney(order.total || 0)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Build Google Maps route URL ─────────────────────────────────────────────
function buildMapsUrl(addresses) {
  const valid = addresses.filter(Boolean);
  if (valid.length === 0) return null;
  if (valid.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(valid[0])}&travelmode=driving`;
  }
  // Multi-stop: /dir/stop1/stop2/.../stopN — Google Maps opens route planner
  return `https://www.google.com/maps/dir/${valid.map(a => encodeURIComponent(a)).join('/')}`;
}

// ── Order card ─────────────────────────────────────────────────────────────────
function orderNum(order) { return order.daily_number ? String(order.daily_number) : String(order.id).slice(-6); }

const PM_LABELS = {
  pix_online:    'PIX Online',
  card_online:   'Cartão Online',
  card_delivery: 'Cartão na Entrega',
  pix_delivery:  'PIX na Entrega',
  cash:          'Dinheiro',
};

function OrderCard({ order, mode, onAction, loading, activeAddresses, gpsPos, storePos }) {
  const [expanded, setExpanded] = useState(false);
  const items      = order.items || [];
  const customer   = order.customer || {};
  const phone      = customer.phone || '';
  const waPhone    = phone.replace(/\D/g, '');
  const assignSt   = order.assignment?.status;
  const commission = order.driver_commission != null ? order.driver_commission : null;

  // Route: if there are multiple active deliveries, use all addresses; otherwise just this one
  const routeAddresses = activeAddresses && activeAddresses.length > 1
    ? activeAddresses
    : [order.address].filter(Boolean);
  const mapsUrl = buildMapsUrl(routeAddresses);

  return (
    <div className={'drv-card' + (mode === 'mine' ? ' drv-card-mine' : '')}>

      {/* ── Top row: ID + time + status ── */}
      <div className="drv-card-top" style={{ cursor: 'default' }}>
        <div>
          <span className="drv-card-id">#{orderNum(order)}</span>
          <span className="drv-card-time">{fmtTime(order.created_at)}</span>
          {mode === 'mine' && (
            <span className={'drv-status-badge drv-st-' + (assignSt || 'assigned')}>
              {assignSt === 'assigned' ? '⏳ Aceito' : assignSt === 'picked' ? '🚗 Em rota' : '✅ Entregue'}
            </span>
          )}
        </div>
      </div>

      {/* ── Mapa de rota (apenas em Disponíveis) ── */}
      {mode === 'available' && order.address && (
        <MiniRouteMap address={order.address} gpsPos={gpsPos} storePos={storePos} />
      )}

      {/* ── Comissão — always visible ── */}
      {commission != null && (
        <div className="drv-fee-row" style={{ background: '#eff6ff', borderRadius: 8, padding: '6px 10px', margin: '6px 0' }}>
          <span className="drv-fee-label" style={{ color: '#1d4ed8', fontWeight: 700 }}>🏍️ Sua comissão</span>
          <span className="drv-fee-val" style={{ color: '#1d4ed8', fontWeight: 800 }}>{commission > 0 ? fmtMoney(commission) : 'Sem comissão'}</span>
        </div>
      )}

      {/* ── Ver detalhes toggle ── */}
      <button className="drv-details-toggle" onClick={() => setExpanded(v => !v)}>
        {expanded ? '▲ Ocultar detalhes' : '▼ Ver detalhes do pedido'}
      </button>

      {/* ── Expanded details ── */}
      {expanded && (
        <div className="drv-card-detail">
          {customer.name && <p className="drv-detail-name">👤 {customer.name}</p>}
          {phone && (
            <a href={`https://wa.me/55${waPhone}`} className="drv-detail-phone" target="_blank" rel="noreferrer">
              📞 {phone}
            </a>
          )}

          {order.address && (
            <div className="drv-card-addr" style={{ marginBottom: 10 }}>
              <span>📍</span>
              <span>{order.address}</span>
            </div>
          )}

          {/* Route button inside details */}
          {mode === 'mine' && (assignSt === 'assigned' || assignSt === 'picked') && mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="drv-route-btn" style={{ marginBottom: 12 }}>
              🗺️ {activeAddresses && activeAddresses.length > 1
                ? `Traçar rota (${activeAddresses.length} paradas)`
                : 'Traçar rota'}
            </a>
          )}

          <div className="drv-items">
            {items.map((it, i) => (
              <div key={i} className="drv-item-row">
                <span className="drv-item-qty">{it.qty || 1}x</span>
                <span className="drv-item-name">
                  {it.name}
                  {it.note && <span style={{ display: 'block', fontSize: 11, color: '#9ca3af' }}>{it.note}</span>}
                </span>
              </div>
            ))}
          </div>

          {order.change_note && <p className="drv-change-note">💵 {order.change_note}</p>}

          <div className="drv-total-row">
            <span>Pagamento</span>
            <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 13 }}>
              {PM_LABELS[order.payment_method] || '—'}
            </span>
          </div>
          <div className="drv-total-row" style={{ marginTop: 4 }}>
            <span>Total do pedido</span>
            <span className="drv-card-total">{fmtMoney(order.total || 0)}</span>
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="drv-card-actions">
        {mode === 'available' && (
          <button className="drv-btn accept" onClick={() => onAction(order.id, 'accept')} disabled={loading}>
            {loading ? '...' : '✋ Aceitar entrega'}
          </button>
        )}
        {mode === 'mine' && assignSt === 'assigned' && (
          <button className="drv-btn pickup" onClick={() => onAction(order.id, 'pickup')} disabled={loading}>
            {loading ? '...' : '📦 Coletei o pedido'}
          </button>
        )}
        {mode === 'mine' && assignSt === 'picked' && (
          <button className="drv-btn deliver" onClick={() => onAction(order.id, 'delivered')} disabled={loading}>
            {loading ? '...' : '✅ Entregue ao cliente'}
          </button>
        )}
        {mode === 'mine' && assignSt === 'delivered' && (
          <span className="drv-done-badge">✅ Concluído</span>
        )}
      </div>
    </div>
  );
}

// ── Main app ───────────────────────────────────────────────────────────────────
export default function DriverApp({ storeId }) {
  // Kill the store's global body padding — App.css adds it for all routes
  useEffect(() => {
    const b = document.body;
    const prevPT = b.style.paddingTop;
    const prevPB = b.style.paddingBottom;
    b.style.paddingTop    = '0';
    b.style.paddingBottom = '0';
    return () => {
      b.style.paddingTop    = prevPT;
      b.style.paddingBottom = prevPB;
    };
  }, []);
  const [token,    setToken]    = useState(() => localStorage.getItem('drv_token') || null);
  const [driver,   setDriver]   = useState(() => { try { return JSON.parse(localStorage.getItem('drv_info') || 'null'); } catch { return null; } });
  const [tab,       setTab]       = useState('available');
  const [available, setAvailable] = useState([]);
  const [mine,      setMine]      = useState([]);
  const [history,   setHistory]   = useState([]);
  const [histLoaded,setHistLoaded]= useState(false);
  const [loading,   setLoading]   = useState(false);
  const [acting,    setActing]    = useState(null); // orderId being acted on
  const [gpsOk,     setGpsOk]     = useState(null); // null=unknown, true=ok, false=denied
  const [gpsPos,    setGpsPos]    = useState(null); // { lat, lng }
  const [storePos,  setStorePos]  = useState(null); // { lat, lng } — posição da loja

  function handleLogin(t, d) {
    localStorage.setItem('drv_token', t);
    localStorage.setItem('drv_info', JSON.stringify(d));
    setToken(t); setDriver(d);
  }

  function handleLogout() {
    localStorage.removeItem('drv_token');
    localStorage.removeItem('drv_info');
    setToken(null); setDriver(null);
  }

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch('/api/driver?scope=history', {
        headers: { 'x-driver-token': token },
      });
      if (!r.ok) return;
      const d = await r.json();
      setHistory(d.history || []);
      setHistLoaded(true);
    } catch {}
  }, [token]);

  // Load history when tab is first opened
  useEffect(() => {
    if (tab === 'history' && !histLoaded) fetchHistory();
  }, [tab, histLoaded, fetchHistory]);

  // ── GPS tracking ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    if (!navigator.geolocation) { setGpsOk(false); return; }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsOk(true);
        setGpsPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        fetch('/api/driver?scope=location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-driver-token': token },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => {});
      },
      () => setGpsOk(false),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [token]);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch('/api/driver?scope=orders', {
        headers: { 'x-driver-token': token },
      });
      if (r.status === 401) { handleLogout(); return; }
      const d = await r.json();
      setAvailable(d.available || []);
      setMine(d.mine || []);
      if (d.storePos) setStorePos(d.storePos);
    } catch {}
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchOrders();
    const t = setInterval(fetchOrders, 10000);
    return () => clearInterval(t);
  }, [fetchOrders, token]);

  async function handleAction(orderId, action) {
    setActing(orderId);
    try {
      await fetch('/api/driver?scope=orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-driver-token': token },
        body: JSON.stringify({ orderId, action }),
      });
      await fetchOrders();
      if (action === 'accept') setTab('mine');
    } catch {}
    setActing(null);
  }

  if (!token || !driver) return <LoginPage storeId={storeId} onLogin={handleLogin} />;

  const activeOrders = mine.filter(o => o.assignment?.status !== 'delivered');
  const doneOrders   = mine.filter(o => o.assignment?.status === 'delivered');

  // All addresses currently in active delivery (for multi-stop route)
  const activeAddresses = activeOrders
    .filter(o => ['assigned','picked'].includes(o.assignment?.status))
    .map(o => o.address)
    .filter(Boolean);

  return (
    <div className="drv-app">
      {/* Header */}
      <header className="drv-header">
        <div className="drv-header-left">
          <span className="drv-header-icon">🛵</span>
          <div>
            <p className="drv-header-name">{driver.name}</p>
            <p className="drv-header-status">
              ● Online
              {gpsOk === true  && <span style={{ marginLeft: 8, color: '#4ade80' }}>📍 GPS ativo</span>}
              {gpsOk === false && <span style={{ marginLeft: 8, color: '#fbbf24' }}>⚠️ GPS desativado</span>}
            </p>
          </div>
        </div>
        <button className="drv-logout-btn" onClick={handleLogout}>Sair</button>
      </header>

      {/* Tabs */}
      <div className="drv-tabs">
        <button
          className={'drv-tab' + (tab === 'available' ? ' active' : '')}
          onClick={() => setTab('available')}
        >
          Disponíveis
          {available.length > 0 && <span className="drv-tab-badge">{available.length}</span>}
        </button>
        <button
          className={'drv-tab' + (tab === 'mine' ? ' active' : '')}
          onClick={() => setTab('mine')}
        >
          Meus pedidos
          {activeOrders.length > 0 && <span className="drv-tab-badge drv-badge-mine">{activeOrders.length}</span>}
        </button>
        <button
          className={'drv-tab' + (tab === 'history' ? ' active' : '')}
          onClick={() => setTab('history')}
        >
          Histórico
        </button>
      </div>

      {/* Content */}
      <div className="drv-content">
        {tab === 'available' && (
          <>
            {available.length === 0
              ? <div className="drv-empty">Nenhum pedido disponível no momento</div>
              : available.map(o => (
                <OrderCard
                  key={o.id}
                  order={o}
                  mode="available"
                  onAction={handleAction}
                  loading={acting === o.id}
                  gpsPos={gpsPos}
                  storePos={storePos}
                />
              ))
            }
          </>
        )}
        {tab === 'mine' && (
          <>
            {/* Mapa de todas as entregas ativas */}
            {(activeOrders.length > 0 || doneOrders.length > 0) && (
              <div style={{ marginBottom: 14 }}>
                <DriverMap orders={mine} gpsPos={gpsPos} storePos={storePos} />
              </div>
            )}
            {activeOrders.length === 0 && doneOrders.length === 0
              ? <div className="drv-empty">Você ainda não aceitou nenhum pedido</div>
              : null
            }
            {activeOrders.map(o => (
              <OrderCard key={o.id} order={o} mode="mine" onAction={handleAction} loading={acting === o.id} activeAddresses={activeAddresses} />
            ))}
            {doneOrders.length > 0 && (
              <>
                <p className="drv-section-label">Concluídos hoje</p>
                {doneOrders.map(o => (
                  <OrderCard key={o.id} order={o} mode="mine" onAction={handleAction} loading={false} />
                ))}
              </>
            )}
          </>
        )}

        {tab === 'history' && (
          <>
            {!histLoaded ? (
              <div className="drv-empty">Carregando histórico...</div>
            ) : history.length === 0 ? (
              <div className="drv-empty">
                <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                Nenhuma entrega realizada ainda
              </div>
            ) : (
              <>
                {/* Summary bar — shows total fees earned */}
                <div className="drv-hist-summary">
                  <div className="drv-hist-stat">
                    <span className="drv-hist-stat-val">{history.length}</span>
                    <span className="drv-hist-stat-label">Entregas</span>
                  </div>
                  <div className="drv-hist-stat">
                    <span className="drv-hist-stat-val">{fmtMoney(history.reduce((s,o) => s + (o.driver_commission ?? o.delivery_fee ?? 0), 0))}</span>
                    <span className="drv-hist-stat-label">Total em comissões</span>
                  </div>
                </div>

                {/* Days */}
                {groupByDay(history).map(([dayKey, { label, orders: dayOrders }]) => {
                  const dayFees = dayOrders.reduce((s,o) => s + (o.driver_commission ?? o.delivery_fee ?? 0), 0);
                  return (
                    <div key={dayKey} className="drv-hist-day">
                      <div className="drv-hist-day-header">
                        <span className="drv-hist-day-label">{label}</span>
                        <span className="drv-hist-day-meta">{dayOrders.length} entregas · {fmtMoney(dayFees)}</span>
                      </div>
                      {dayOrders.map(o => (
                        <HistoryCard key={o.id} order={o} />
                      ))}
                    </div>
                  );
                })}

                <button
                  className="drv-refresh-btn"
                  style={{ width: '100%', marginTop: 16, textAlign: 'center' }}
                  onClick={() => { setHistLoaded(false); fetchHistory(); }}
                >
                  🔄 Atualizar histórico
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Bottom refresh */}
      <div className="drv-footer">
        {tab !== 'history' && (
          <>
            <button className="drv-refresh-btn" onClick={fetchOrders}>🔄 Atualizar</button>
            <span className="drv-refresh-note">Atualiza a cada 10s</span>
          </>
        )}
        {tab === 'history' && (
          <span className="drv-refresh-note">Histórico de todas as suas entregas</span>
        )}
      </div>
    </div>
  );
}
