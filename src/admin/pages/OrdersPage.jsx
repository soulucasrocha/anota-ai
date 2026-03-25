import { useState, useEffect } from 'react';

function fmtMoney(cents) { return 'R$ ' + (cents / 100).toFixed(2).replace('.', ','); }
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function OrdersPage({ token }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    fetch('/api/admin-orders', { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(d => {
        const raw = d.orders || [];
        setOrders(raw.map(x => { try { return typeof x === 'string' ? JSON.parse(x) : x; } catch { return null; } }).filter(Boolean));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (loading) return <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Carregando pedidos...</div>;

  return (
    <>
      <div className="adm-tabs">
        <button className={`adm-tab${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>Todos ({orders.length})</button>
        <button className={`adm-tab${filter === 'paid' ? ' active' : ''}`} onClick={() => setFilter('paid')}>✅ Pagos ({orders.filter(o => o.status === 'paid').length})</button>
        <button className={`adm-tab${filter === 'pending' ? ' active' : ''}`} onClick={() => setFilter('pending')}>⏳ Pendentes ({orders.filter(o => o.status !== 'paid').length})</button>
      </div>

      <div className="adm-card">
        <div className="adm-card-header">
          <h3>🧾 Pedidos</h3>
          <span style={{ fontSize: 13, color: '#aaa' }}>{filtered.length} pedidos</span>
        </div>

        {filtered.length === 0 ? (
          <div className="adm-empty" style={{ padding: 48 }}>
            <div className="empty-icon">🛒</div>
            <p>Nenhum pedido encontrado.<br /><small style={{ color: '#bbb' }}>Os pedidos aparecerão aqui após o PIX ser confirmado.</small></p>
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
                  <th>Itens pedidos</th>
                  <th>Total</th>
                  <th>Pagamento</th>
                  <th>Data / Hora</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => (
                  <tr key={o.id || i}>
                    <td style={{ color: '#aaa', fontSize: 12, fontWeight: 700 }}>#{filtered.length - i}</td>
                    <td>
                      <b style={{ color: '#1e2740' }}>{o.customer?.name || o.customerName || '—'}</b>
                    </td>
                    <td style={{ fontSize: 13, color: '#666' }}>{o.customer?.phone || o.customerPhone || '—'}</td>
                    <td style={{ fontSize: 12, color: '#666', maxWidth: 160 }}>{o.address || '—'}</td>
                    <td style={{ fontSize: 12, maxWidth: 220 }}>
                      {(o.items || []).map((item, idx) => (
                        <div key={idx}>{item.qty || 1}x {item.name}</div>
                      ))}
                    </td>
                    <td><b style={{ color: '#e53935', fontSize: 15 }}>{fmtMoney(o.total || 0)}</b></td>
                    <td>
                      <span className={`adm-badge ${o.status === 'paid' ? 'green' : 'orange'}`}>
                        {o.status === 'paid' ? '✅ Pago' : '⏳ Pendente'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{fmtDate(o.createdAt)}</td>
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
