import { useState, useEffect, useCallback } from 'react';

function fmtMoney(cents) { return 'R$ ' + (cents / 100).toFixed(2).replace('.', ','); }

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

const PERIODS = [
  { key: 'today',     label: 'Hoje' },
  { key: 'yesterday', label: 'Ontem' },
  { key: '7d',        label: '7 dias' },
  { key: '30d',       label: '30 dias' },
  { key: 'all',       label: 'Total' },
];

export default function ReportsPage({ token, storeId }) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState('today');

  const fetchStats = useCallback((p) => {
    if (!storeId) return;
    setLoading(true);
    fetch(`/api/admin-stats?storeId=${storeId}&period=${p}`, { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(s => { setStats(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, storeId]);

  useEffect(() => { fetchStats(period); }, [fetchStats, period]);

  if (loading) return <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Carregando relatórios...</div>;

  const s = stats || {};
  const periodLabel = PERIODS.find(p => p.key === period)?.label || 'Hoje';

  const cards = [
    { icon: '💰', color: 'green',  label: `Faturamento (${periodLabel})`, value: fmtMoney(s.totalRevenue || 0) },
    { icon: '🛒', color: 'blue',   label: `Pedidos (${periodLabel})`,     value: s.totalOrders || 0 },
    { icon: '🎯', color: 'orange', label: 'Ticket Médio',                  value: fmtMoney(s.avgTicket || 0) },
  ];

  return (
    <>
      {/* Period filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: period === p.key ? '#e53935' : '#f3f4f6',
              color: period === p.key ? '#fff' : '#374151',
              transition: 'all .15s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

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

      {/* Revenue chart */}
      <div className="adm-card">
        <div className="adm-card-header"><h3>📈 Faturamento — últimos 7 dias</h3></div>
        <div className="adm-card-body">
          <BarChart data={s.revenueByDay || []} />
        </div>
      </div>

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
    </>
  );
}
