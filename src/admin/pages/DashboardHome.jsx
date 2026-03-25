import { useState, useEffect } from 'react';

function fmtMoney(cents) {
  return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function BarChart({ data }) {
  if (!data || !data.length) return <div className="adm-empty"><div className="empty-icon">📊</div><p>Sem dados ainda</p></div>;
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="adm-chart-wrap">
      {data.map(d => (
        <div key={d.date} className="adm-chart-bar-group">
          <div className="bar-val">{d.total > 0 ? fmtMoney(d.total).replace('R$ ','') : ''}</div>
          <div className="adm-chart-bar-track">
            <div className="adm-chart-bar" style={{ height: `${Math.max((d.total / max) * 100, d.total > 0 ? 6 : 0)}%` }} />
          </div>
          <div className="bar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardHome({ token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin-stats', { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Carregando...</div>;

  const s = stats || {};

  const CARDS = [
    { icon: '💰', color: 'green',  label: 'Faturamento Hoje',   value: fmtMoney(s.todayRevenue || 0), sub: `Total: ${fmtMoney(s.totalRevenue || 0)}` },
    { icon: '🛒', color: 'blue',   label: 'Pedidos Hoje',        value: s.todayOrders || 0,             sub: `Total: ${s.totalOrders || 0} pedidos` },
    { icon: '🎯', color: 'orange', label: 'Ticket Médio',        value: fmtMoney(s.avgTicket || 0),    sub: 'por pedido' },
    { icon: '🏆', color: 'red',    label: 'Produto Mais Vendido', value: s.topProducts?.[0]?.name?.split(' ').slice(0, 3).join(' ') || '—', sub: `${s.topProducts?.[0]?.count || 0} vendidos` },
  ];

  return (
    <>
      {/* Stat cards */}
      <div className="adm-stats-grid">
        {CARDS.map(c => (
          <div key={c.label} className="adm-stat-card">
            <div className={`adm-stat-icon ${c.color}`}>{c.icon}</div>
            <div className="adm-stat-info">
              <label>{c.label}</label>
              <div className="adm-stat-value">{c.value}</div>
              <div className="adm-stat-sub">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        {/* Revenue chart */}
        <div className="adm-card">
          <div className="adm-card-header"><h3>📊 Faturamento — últimos 7 dias</h3></div>
          <div className="adm-card-body">
            <BarChart data={s.revenueByDay || []} />
          </div>
        </div>

        {/* Top products */}
        <div className="adm-card">
          <div className="adm-card-header"><h3>🏆 Mais vendidos</h3></div>
          <div className="adm-card-body">
            {(!s.topProducts || s.topProducts.length === 0) ? (
              <div className="adm-empty"><div className="empty-icon">🍕</div><p>Sem vendas ainda</p></div>
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
      </div>

      {/* Recent orders */}
      <div className="adm-card">
        <div className="adm-card-header"><h3>🧾 Pedidos recentes</h3></div>
        {(!s.recentOrders || s.recentOrders.length === 0) ? (
          <div className="adm-empty" style={{ padding: 32 }}>
            <div className="empty-icon">🛒</div>
            <p>Nenhum pedido registrado ainda.<br/><small style={{color:'#bbb'}}>Os pedidos aparecerão aqui assim que o PIX for confirmado.</small></p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Endereço</th>
                  <th>Itens</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {s.recentOrders.map(o => (
                  <tr key={o.id}>
                    <td><b>{o.customer?.name || o.customerName || '—'}</b><br/><span style={{color:'#aaa',fontSize:12}}>{o.customer?.phone || o.customerPhone || ''}</span></td>
                    <td style={{fontSize:12,color:'#666'}}>{o.address || '—'}</td>
                    <td style={{fontSize:12}}>{(o.items || []).map(i => i.name).join(', ').slice(0, 40) || '—'}</td>
                    <td><b style={{color:'#e53935'}}>{fmtMoney(o.total || 0)}</b></td>
                    <td><span className={`adm-badge ${o.status === 'paid' ? 'green' : 'orange'}`}>{o.status === 'paid' ? 'Pago' : 'Pendente'}</span></td>
                    <td style={{fontSize:12,color:'#888'}}>{fmtDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
