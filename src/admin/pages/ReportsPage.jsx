import { useState, useEffect } from 'react';

function fmtMoney(cents) { return 'R$ ' + (cents / 100).toFixed(2).replace('.', ','); }
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function BarChart({ data }) {
  if (!data || !data.length) return <div className="adm-empty"><div className="empty-icon">📊</div><p>Sem dados ainda</p></div>;
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="adm-chart-wrap" style={{ height: 180 }}>
      {data.map(d => (
        <div key={d.date} className="adm-chart-bar-group">
          <div className="bar-val" style={{ fontSize: 9 }}>{d.total > 0 ? 'R$' + (d.total/100).toFixed(0) : ''}</div>
          <div className="adm-chart-bar-track">
            <div className="adm-chart-bar" style={{ height: `${Math.max((d.total / max) * 100, d.total > 0 ? 4 : 0)}%` }} />
          </div>
          <div className="bar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage({ token, storeId }) {
  const [stats, setStats]   = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('resumo');

  useEffect(() => {
    if (!storeId) return;
    Promise.all([
      fetch(`/api/admin-stats?storeId=${storeId}`,  { headers: { 'x-admin-token': token } }).then(r => r.json()),
      fetch('/api/admin-orders', { headers: { 'x-admin-token': token, 'x-store-id': storeId } }).then(r => r.json()),
    ]).then(([s, o]) => {
      setStats(s);
      const raw = o.orders || [];
      setOrders(raw.map(x => { try { return typeof x === 'string' ? JSON.parse(x) : x; } catch { return null; } }).filter(Boolean));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token, storeId]);

  if (loading) return <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Carregando relatórios...</div>;

  const s = stats || {};

  // Summary cards
  const cards = [
    { icon: '💰', color: 'green',  label: 'Faturamento Total', value: fmtMoney(s.totalRevenue || 0) },
    { icon: '🛒', color: 'blue',   label: 'Total de Pedidos',  value: s.totalOrders || 0 },
    { icon: '🎯', color: 'orange', label: 'Ticket Médio',      value: fmtMoney(s.avgTicket || 0) },
    { icon: '📅', color: 'red',    label: 'Pedidos Hoje',      value: s.todayOrders || 0 },
  ];

  return (
    <>
      {/* Summary cards */}
      <div className="adm-stats-grid" style={{ marginBottom: 24 }}>
        {cards.map(c => (
          <div key={c.label} className="adm-stat-card">
            <div className={`adm-stat-icon ${c.color}`}>{c.icon}</div>
            <div className="adm-stat-info">
              <label>{c.label}</label>
              <div className="adm-stat-value">{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="adm-tabs">
        <button className={`adm-tab${tab === 'resumo' ? ' active' : ''}`} onClick={() => setTab('resumo')}>📊 Resumo</button>
        <button className={`adm-tab${tab === 'pedidos' ? ' active' : ''}`} onClick={() => setTab('pedidos')}>🧾 Todos os pedidos</button>
      </div>

      {tab === 'resumo' && (
        <>
          {/* Revenue chart */}
          <div className="adm-card">
            <div className="adm-card-header"><h3>📈 Faturamento — últimos 7 dias</h3></div>
            <div className="adm-card-body">
              <BarChart data={s.revenueByDay || []} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Top products */}
            <div className="adm-card">
              <div className="adm-card-header"><h3>🏆 Produtos mais vendidos</h3></div>
              <div className="adm-card-body">
                {(!s.topProducts || s.topProducts.length === 0) ? (
                  <div className="adm-empty"><div className="empty-icon">🍕</div><p>Sem dados ainda</p></div>
                ) : (
                  s.topProducts.map((p, i) => {
                    const max = s.topProducts[0].count;
                    return (
                      <div key={p.name} className="adm-top-bar-row">
                        <span className="adm-top-bar-label">#{i + 1} {p.name}</span>
                        <div className="adm-top-bar-track">
                          <div className="adm-top-bar-fill" style={{ width: `${(p.count / max) * 100}%` }} />
                        </div>
                        <span className="adm-top-bar-count">{p.count}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Orders by status */}
            <div className="adm-card">
              <div className="adm-card-header"><h3>📋 Status dos pedidos</h3></div>
              <div className="adm-card-body">
                {orders.length === 0 ? (
                  <div className="adm-empty"><div className="empty-icon">🛒</div><p>Sem pedidos ainda</p></div>
                ) : (() => {
                  const paid    = orders.filter(o => o.status === 'paid').length;
                  const pending = orders.length - paid;
                  const total   = orders.length;
                  return (
                    <>
                      <div className="adm-top-bar-row">
                        <span className="adm-top-bar-label">✅ Pagos</span>
                        <div className="adm-top-bar-track">
                          <div className="adm-top-bar-fill" style={{ width: `${(paid/total)*100}%`, background: 'linear-gradient(90deg, #66bb6a, #43a047)' }} />
                        </div>
                        <span className="adm-top-bar-count" style={{color:'#43a047'}}>{paid}</span>
                      </div>
                      <div className="adm-top-bar-row">
                        <span className="adm-top-bar-label">⏳ Pendentes</span>
                        <div className="adm-top-bar-track">
                          <div className="adm-top-bar-fill" style={{ width: `${(pending/total)*100}%`, background: 'linear-gradient(90deg, #ffa726, #fb8c00)' }} />
                        </div>
                        <span className="adm-top-bar-count" style={{color:'#fb8c00'}}>{pending}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'pedidos' && (
        <div className="adm-card">
          <div className="adm-card-header">
            <h3>🧾 Histórico completo de pedidos</h3>
            <span style={{ fontSize: 13, color: '#aaa' }}>{orders.length} pedidos</span>
          </div>
          {orders.length === 0 ? (
            <div className="adm-empty" style={{ padding: 48 }}>
              <div className="empty-icon">🛒</div>
              <p>Nenhum pedido registrado.<br /><small style={{ color: '#bbb' }}>Os pedidos aparecem aqui após confirmação do PIX.</small></p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Telefone</th>
                    <th>Endereço</th>
                    <th>Itens</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o.id || i}>
                      <td style={{ color: '#aaa', fontSize: 12 }}>#{orders.length - i}</td>
                      <td><b>{o.customer?.name || o.customerName || '—'}</b></td>
                      <td style={{ fontSize: 12, color: '#666' }}>{o.customer?.phone || o.customerPhone || '—'}</td>
                      <td style={{ fontSize: 12, color: '#666', maxWidth: 150 }}>{o.address || '—'}</td>
                      <td style={{ fontSize: 12, maxWidth: 200 }}>{(o.items || []).map(i => `${i.qty || 1}x ${i.name}`).join(', ').slice(0, 60) || '—'}</td>
                      <td><b style={{ color: '#e53935' }}>{fmtMoney(o.total || 0)}</b></td>
                      <td><span className={`adm-badge ${o.status === 'paid' ? 'green' : 'orange'}`}>{o.status === 'paid' ? 'Pago' : 'Pendente'}</span></td>
                      <td style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{fmtDate(o.created_at || o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
