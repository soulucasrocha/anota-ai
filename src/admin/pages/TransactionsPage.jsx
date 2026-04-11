import { useState, useEffect, useCallback } from 'react';

function fmtMoney(cents) { return 'R$ ' + (cents / 100).toFixed(2).replace('.', ','); }
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const DATE_RANGES = [
  { key: 'today',     label: 'Hoje'    },
  { key: 'yesterday', label: 'Ontem'   },
  { key: '7d',        label: '7 dias'  },
  { key: '30d',       label: '30 dias' },
  { key: 'all',       label: 'Todos'   },
];

function inRange(isoDate, range) {
  if (range === 'all') return true;
  const d = new Date(isoDate);
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  if (range === 'today')     return d >= todayStart;
  if (range === 'yesterday') return d >= yesterdayStart && d < todayStart;
  if (range === '7d')        return d >= new Date(now - 7  * 86400000);
  if (range === '30d')       return d >= new Date(now - 30 * 86400000);
  return true;
}

const STATUS = {
  pending:   { label: 'Aguardando', bg: '#fffbeb', color: '#f59e0b' },
  paid:      { label: 'Pago',       bg: '#ecfdf5', color: '#10b981' },
  expired:   { label: 'Expirado',   bg: '#f3f4f6', color: '#9ca3af' },
  cancelled: { label: 'Cancelado',  bg: '#fef2f2', color: '#ef4444' },
};

const PM = { pix_online:'PIX Online', card_online:'Cartão Online', card_delivery:'Cartão Entrega', pix_delivery:'PIX Entrega', cash:'Dinheiro' };

export default function TransactionsPage({ token, storeId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading,   setLoading]         = useState(true);
  const [approving, setApproving]       = useState(null);
  const [toast,     setToast]           = useState('');
  const [filter,    setFilter]          = useState('all');
  const [search,    setSearch]          = useState('');
  const [dateRange, setDateRange]       = useState('today');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const fetchTransactions = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    fetch('/api/admin-transactions', { headers: { 'x-admin-token': token, 'x-store-id': storeId } })
      .then(r => r.json())
      .then(d => { setTransactions(d.transactions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, storeId]);

  useEffect(() => {
    fetchTransactions();
    const t = setInterval(fetchTransactions, 30000);
    return () => clearInterval(t);
  }, [fetchTransactions]);

  async function handleApprove(tx) {
    setApproving(tx.id);
    try {
      const res = await fetch('/api/admin-transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token, 'x-store-id': storeId || '' },
        body: JSON.stringify({ id: tx.id, status: 'paid' }),
      });
      if ((await res.json()).ok) {
        setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'paid' } : t));
        showToast('✅ Aprovado! Pedido enviado ao Kanban.');
      }
    } catch { showToast('❌ Erro'); }
    setApproving(null);
  }

  async function handleSetStatus(tx, status) {
    try {
      await fetch('/api/admin-transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token, 'x-store-id': storeId || '' },
        body: JSON.stringify({ id: tx.id, status }),
      });
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status } : t));
    } catch {}
  }

  const dateTx = transactions.filter(t => inRange(t.created_at, dateRange));

  const counts = {
    all:     dateTx.length,
    pending: dateTx.filter(t => t.status === 'pending').length,
    paid:    dateTx.filter(t => t.status === 'paid').length,
    expired: dateTx.filter(t => t.status === 'expired').length,
  };

  const totalPaid    = dateTx.filter(t => t.status === 'paid').reduce((s, t) => s + (t.amount || 0), 0);
  const totalPending = dateTx.filter(t => t.status === 'pending').reduce((s, t) => s + (t.amount || 0), 0);

  const filtered = dateTx
    .filter(t => filter === 'all' || t.status === filter)
    .filter(t => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (t.customer?.name || '').toLowerCase().includes(q) ||
        (t.customer?.phone || '').includes(q) ||
        String(t.id).toLowerCase().includes(q) ||
        (t.hashtag || '').toLowerCase().includes(q)
      );
    });

  const thStyle = { textAlign: 'left', padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '.6px', borderBottom: '1px solid #f0f2f5', background: '#fafafa', textTransform: 'uppercase' };
  const tdStyle = { padding: '13px 16px', fontSize: 13, borderBottom: '1px solid #f0f2f5' };

  return (
    <>
      {toast && <div className="adm-toast">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e2740', margin: 0 }}>Transações</h2>
          <p style={{ fontSize: 14, color: '#aaa', marginTop: 4 }}>Acompanhe pagamentos e aprove transações PIX</p>
        </div>
        <button className="adm-btn ghost" onClick={fetchTransactions} style={{ fontSize: 13 }}>
          🔄 Atualizar
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total',      value: counts.all,     icon: '💳', bg: '#eef2ff', color: '#6366f1' },
          { label: 'Pagas',      value: fmtMoney(totalPaid), icon: '✅', bg: '#ecfdf5', color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="adm-card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1e2740' }}>{s.value}</div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Date range filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {DATE_RANGES.map(r => (
          <button key={r.key} onClick={() => setDateRange(r.key)} style={{
            padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', border: '1.5px solid',
            borderColor: dateRange === r.key ? '#ef4444' : '#e5e7eb',
            background:  dateRange === r.key ? '#fef2f2' : '#fff',
            color:       dateRange === r.key ? '#ef4444' : '#9ca3af',
            transition: 'all .15s',
          }}>{r.label}</button>
        ))}
      </div>

      {/* Filter + search */}
      <div className="adm-card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid #f0f2f5' }}>
          <input
            className="adm-input"
            placeholder="Buscar por nome, telefone, hashtag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, marginBottom: 0 }}
          />
          {[
            { key: 'all',     label: `Todos (${counts.all})` },
            { key: 'pending', label: `⏳ Aguardando (${counts.pending})` },
            { key: 'paid',    label: `✅ Pagos (${counts.paid})` },
            { key: 'expired', label: `⏰ Expirados (${counts.expired})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: '1.5px solid',
                borderColor: filter === f.key ? '#ef4444' : '#e5e7eb',
                background: filter === f.key ? '#fef2f2' : '#fff',
                color: filter === f.key ? '#ef4444' : '#9ca3af',
              }}
            >{f.label}</button>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Data / Hora</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>WhatsApp</th>
                <th style={thStyle}>Itens</th>
                <th style={thStyle}>Campanha</th>
                <th style={thStyle}>Valor</th>
                <th style={thStyle}>Método</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: '#aaa', padding: 40 }}>Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: '#aaa', padding: 40 }}>Nenhuma transação encontrada</td></tr>
              ) : filtered.map(tx => {
                const st = STATUS[tx.status] || STATUS.pending;
                return (
                  <tr key={tx.id} style={{ transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: '#1e2740' }}>{fmtDate(tx.created_at)}</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>{fmtTime(tx.created_at)}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{tx.customer?.name || '—'}</div>
                      {tx.wa_name && tx.wa_name !== tx.customer?.name && (
                        <div style={{ fontSize: 11, color: '#25d366', fontWeight: 600 }}>📱 {tx.wa_name}</div>
                      )}
                      <div style={{ fontSize: 11, color: '#aaa' }}>#{String(tx.id).slice(-8)}</div>
                    </td>
                    <td style={tdStyle}>
                      {(tx.wa_phone || tx.customer?.phone) ? (
                        <a href={`https://wa.me/55${(tx.wa_phone || tx.customer?.phone || '').replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                          style={{ color: '#25d366', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.127 1.534 5.856L.054 23.454a.5.5 0 0 0 .612.612l5.598-1.48A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.953 9.953 0 0 1-5.127-1.42l-.368-.218-3.8 1.004 1.004-3.8-.218-.368A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                          {tx.wa_phone || tx.customer?.phone}
                        </a>
                      ) : <span style={{ color: '#ddd' }}>—</span>}
                    </td>
                    <td style={tdStyle}>
                      {tx.items?.slice(0,2).map((it,i) => (
                        <div key={i} style={{ fontSize: 12, color: '#555' }}>{it.qty||1}x {it.name}</div>
                      ))}
                      {(tx.items?.length || 0) > 2 && <div style={{ fontSize: 11, color: '#aaa' }}>+{tx.items.length - 2}</div>}
                      {!tx.items?.length && <span style={{ color: '#ddd' }}>—</span>}
                    </td>
                    <td style={tdStyle}>
                      {(tx.wa_tag || tx.hashtag)
                        ? <span style={{ background: '#f5f3ff', color: '#7c3aed', fontWeight: 700, fontSize: 11, padding: '3px 9px', borderRadius: 20 }}>#{tx.wa_tag || tx.hashtag}</span>
                        : <span style={{ color: '#ddd' }}>—</span>}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#1e2740' }}>{fmtMoney(tx.amount || 0)}</td>
                    <td style={{ ...tdStyle, fontSize: 12, color: '#666' }}>{PM[tx.payment_method] || 'PIX'}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: st.color, background: st.bg }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {tx.status === 'pending' && (
                          <>
                            <button className="adm-btn primary" style={{ padding: '6px 12px', fontSize: 12 }}
                              disabled={approving === tx.id} onClick={() => handleApprove(tx)}>
                              {approving === tx.id ? '...' : '✅'}
                            </button>
                            <button className="adm-btn ghost" style={{ padding: '6px 10px', fontSize: 12 }}
                              onClick={() => handleSetStatus(tx, 'expired')}>⏰</button>
                          </>
                        )}
                        {tx.status === 'expired' && (
                          <button className="adm-btn ghost" style={{ padding: '6px 12px', fontSize: 12 }}
                            disabled={approving === tx.id} onClick={() => handleApprove(tx)}>
                            {approving === tx.id ? '...' : '✅ Aprovar'}
                          </button>
                        )}
                        {tx.status === 'paid' && (
                          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Aprovado</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
