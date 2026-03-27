import { useState, useEffect, useCallback } from 'react';

function fmtMoney(cents) { return 'R$ ' + (cents / 100).toFixed(2).replace('.', ','); }
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABEL = {
  pending:   { label: 'Aguardando',  color: '#f59e0b', bg: '#fffbeb' },
  paid:      { label: 'Pago',        color: '#10b981', bg: '#ecfdf5' },
  expired:   { label: 'Expirado',    color: '#9ca3af', bg: '#f3f4f6' },
  cancelled: { label: 'Cancelado',   color: '#ef4444', bg: '#fef2f2' },
};

export default function TransactionsPage({ token, storeId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [approving, setApproving]       = useState(null);
  const [toast, setToast]               = useState('');
  const [filter, setFilter]             = useState('all');

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
      const data = await res.json();
      if (data.ok) {
        setTransactions(prev =>
          prev.map(t => t.id === tx.id ? { ...t, status: 'paid', updatedAt: new Date().toISOString() } : t)
        );
        showToast('✅ Transação aprovada! Pedido enviado para o Kanban.');
      } else {
        showToast('❌ Erro ao aprovar transação');
      }
    } catch { showToast('❌ Erro de conexão'); }
    setApproving(null);
  }

  async function handleSetStatus(tx, status) {
    try {
      await fetch('/api/admin-transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token, 'x-store-id': storeId || '' },
        body: JSON.stringify({ id: tx.id, status }),
      });
      setTransactions(prev =>
        prev.map(t => t.id === tx.id ? { ...t, status, updatedAt: new Date().toISOString() } : t)
      );
      showToast('✅ Status atualizado');
    } catch { showToast('❌ Erro de conexão'); }
  }

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.status === filter);

  const counts = {
    all:       transactions.length,
    pending:   transactions.filter(t => t.status === 'pending').length,
    paid:      transactions.filter(t => t.status === 'paid').length,
    expired:   transactions.filter(t => t.status === 'expired').length,
  };

  return (
    <>
      {toast && <div className="adm-toast">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 16, color: '#1e2740', margin: 0 }}>
            💳 Transações PIX
          </h3>
          <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
            Todas as cobranças geradas — aprove manualmente para testes
          </p>
        </div>
        <button className="adm-btn ghost" onClick={fetchTransactions} style={{ fontSize: 13 }}>
          🔄 Atualizar
        </button>
      </div>

      {/* Filtro de status */}
      <div className="adm-tabs" style={{ marginBottom: 20 }}>
        {[
          { key: 'all',     label: `Todas (${counts.all})` },
          { key: 'pending', label: `⏳ Aguardando (${counts.pending})` },
          { key: 'paid',    label: `✅ Pagas (${counts.paid})` },
          { key: 'expired', label: `⏰ Expiradas (${counts.expired})` },
        ].map(f => (
          <button
            key={f.key}
            className={`adm-tab${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="adm-card">
        <div className="adm-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="adm-empty" style={{ padding: 40 }}>
              <div className="empty-icon">💳</div>
              <p>Nenhuma transação encontrada</p>
            </div>
          ) : (
            filtered.map(tx => {
              const st = STATUS_LABEL[tx.status] || STATUS_LABEL.pending;
              return (
                <div key={tx.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px 20px',
                  borderBottom: '1px solid #f0f2f5',
                  flexWrap: 'wrap',
                }}>
                  {/* Status badge */}
                  <span style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    color: st.color, background: st.bg, whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {st.label}
                  </span>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e2740' }}>
                      {tx.customer?.name || 'Cliente'}
                      {tx.customer?.phone && (
                        <span style={{ fontWeight: 400, color: '#888', marginLeft: 8, fontSize: 12 }}>
                          📞 {tx.customer.phone}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                      #{String(tx.id).slice(-10)} · {fmtTime(tx.created_at || tx.createdAt)}
                    </div>
                    {tx.address && (
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>📍 {tx.address}</div>
                    )}
                  </div>

                  {/* Itens */}
                  {tx.items?.length > 0 && (
                    <div style={{ fontSize: 11, color: '#666', minWidth: 120, maxWidth: 180 }}>
                      {tx.items.slice(0, 2).map((it, i) => (
                        <div key={i}>{it.qty || 1}x {it.name}</div>
                      ))}
                      {tx.items.length > 2 && <div style={{ color: '#aaa' }}>+{tx.items.length - 2} itens</div>}
                    </div>
                  )}

                  {/* Valor */}
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#1e2740', whiteSpace: 'nowrap' }}>
                    {fmtMoney(tx.amount || 0)}
                  </span>

                  {/* Ações */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {tx.status === 'pending' && (
                      <>
                        <button
                          className="adm-btn primary"
                          style={{ padding: '8px 16px', fontSize: 13 }}
                          disabled={approving === tx.id}
                          onClick={() => handleApprove(tx)}
                        >
                          {approving === tx.id ? '...' : '✅ Aprovar'}
                        </button>
                        <button
                          className="adm-btn ghost"
                          style={{ padding: '8px 12px', fontSize: 12 }}
                          onClick={() => handleSetStatus(tx, 'expired')}
                        >
                          Expirar
                        </button>
                      </>
                    )}
                    {tx.status === 'expired' && (
                      <button
                        className="adm-btn primary"
                        style={{ padding: '8px 16px', fontSize: 13 }}
                        disabled={approving === tx.id}
                        onClick={() => handleApprove(tx)}
                      >
                        {approving === tx.id ? '...' : '✅ Aprovar mesmo assim'}
                      </button>
                    )}
                    {tx.status === 'paid' && (
                      <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                        ✅ Aprovado {fmtTime(tx.updated_at || tx.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
