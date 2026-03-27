import { useState, useEffect, useCallback, useRef } from 'react';

function fmtMoney(cents) { return 'R$ ' + (cents / 100).toFixed(2).replace('.', ','); }
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const COLUMNS = [
  { key: 'pending',    label: 'Pendente',    emoji: '⏳', color: '#f59e0b', bg: '#fffbeb' },
  { key: 'preparing',  label: 'Em Preparo',  emoji: '👨‍🍳', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'delivering', label: 'Em Entrega',  emoji: '🛵', color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'delivered',  label: 'Entregue',    emoji: '✅', color: '#10b981', bg: '#ecfdf5' },
];

const NEXT = { pending: 'preparing', preparing: 'delivering', delivering: 'delivered' };
const NEXT_LABEL = { pending: '👨‍🍳 Aceitar e preparar', preparing: '🛵 Saiu para entrega', delivering: '✅ Marcar entregue' };

const PM_LABEL = {
  pix_online:    { icon: '⚡', label: 'PIX Online',        color: '#6366f1' },
  card_online:   { icon: '💳', label: 'Cartão Online',     color: '#3b82f6' },
  card_delivery: { icon: '💳', label: 'Cartão na Entrega', color: '#f59e0b' },
  pix_delivery:  { icon: '📱', label: 'PIX na Entrega',    color: '#8b5cf6' },
  cash:          { icon: '💵', label: 'Dinheiro',          color: '#10b981' },
};

function printOrder(order) {
  const fmtPrice = (c) => 'R$ ' + (c / 100).toFixed(2).replace('.', ',');
  const now = new Date().toLocaleString('pt-BR');
  const pm = { pix_online:'PIX Online', card_online:'Cartão Online', card_delivery:'Cartão na Entrega', pix_delivery:'PIX na Entrega', cash:'Dinheiro' };
  const lines = [
    `<center><b>PEDIDO #${String(order.id).slice(-6)}</b></center>`,
    `<center>${now}</center>`,
    `<hr/>`,
    `<b>Cliente:</b> ${order.customer?.name || '—'}<br/>`,
    order.customer?.phone ? `<b>Tel:</b> ${order.customer.phone}<br/>` : '',
    order.address ? `<b>End.:</b> ${order.address}<br/>` : '',
    `<hr/>`,
    ...(order.items || []).map(i => `${i.qty || 1}x ${i.name} &nbsp; ${fmtPrice((i.price || 0) * (i.qty || 1))}<br/>`),
    `<hr/>`,
    `<b>TOTAL: ${fmtPrice(order.total || 0)}</b><br/>`,
    (order.payment_method || order.paymentMethod) ? `Pgto: ${pm[order.payment_method || order.paymentMethod] || '—'}<br/>` : '',
  ].join('');
  const w = window.open('', '_blank', 'width=400,height=600');
  w.document.write(`<html><head><style>body{font-family:monospace;font-size:14px;width:300px;padding:8px}hr{border:1px dashed #000}</style></head><body>${lines}<br/><br/></body></html>`);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}

function OrderCard({ order, token, storeId, onMoved, onFinalized, col, autoPrint }) {
  const [moving,    setMoving]    = useState(false);
  const [finishing, setFinishing] = useState(false);

  async function moveNext() {
    const nextStatus = NEXT[col];
    if (!nextStatus) return;
    setMoving(true);
    try {
      await fetch('/api/admin-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token, 'x-store-id': storeId || '' },
        body: JSON.stringify({ id: order.id, kanbanStatus: nextStatus }),
      });
      onMoved(order.id, nextStatus);
      if (nextStatus === 'preparing' && autoPrint) printOrder(order);
    } catch {}
    setMoving(false);
  }

  async function finalize() {
    setFinishing(true);
    try {
      await fetch(`/api/admin-orders?id=${order.id}&storeId=${storeId || ''}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token, 'x-store-id': storeId || '' },
      });
      onFinalized(order.id);
    } catch {}
    setFinishing(false);
  }

  const colDef = COLUMNS.find(c => c.key === col);

  return (
    <div className="kanban-card" style={{ borderTop: `3px solid ${colDef?.color}` }}>
      <div className="kanban-card-header">
        <span className="kanban-order-id">#{String(order.id).slice(-6)}</span>
        <span className="kanban-order-time">{fmtTime(order.created_at || order.createdAt)}</span>
      </div>

      <div className="kanban-customer">
        <span className="kanban-name">👤 {order.customer?.name || '—'}</span>
        {order.customer?.phone && (
          <span className="kanban-phone">📞 {order.customer.phone}</span>
        )}
      </div>

      {order.address && (
        <div className="kanban-address">📍 {order.address}</div>
      )}

      {order.change_note && (
        <div className="kanban-address" style={{ color: '#15803d', fontWeight: 600 }}>
          💵 {order.change_note}
        </div>
      )}

      {(order.payment_method || order.paymentMethod) && (() => {
        const pm = PM_LABEL[order.payment_method || order.paymentMethod];
        return pm ? (
          <div className="kanban-payment-badge" style={{ color: pm.color }}>
            {pm.icon} {pm.label}
          </div>
        ) : null;
      })()}

      <div className="kanban-items">
        {(order.items || []).slice(0, 3).map((item, i) => (
          <div key={i} className="kanban-item-row">
            <span className="kanban-item-qty">{item.qty || 1}x</span>
            <span className="kanban-item-name">{item.name}</span>
          </div>
        ))}
        {(order.items || []).length > 3 && (
          <div className="kanban-item-row" style={{ color: '#aaa' }}>
            +{order.items.length - 3} itens
          </div>
        )}
      </div>

      <div className="kanban-card-footer">
        <span className="kanban-total">{fmtMoney(order.total || 0)}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {NEXT_LABEL[col] && (
            <button className="kanban-move-btn" onClick={moveNext} disabled={moving}
              style={{ background: NEXT[col] ? COLUMNS.find(c=>c.key===NEXT[col])?.color : '#ccc' }}>
              {moving ? '...' : NEXT_LABEL[col]}
            </button>
          )}
          <button className="kanban-move-btn" onClick={() => printOrder(order)}
            style={{ background: '#374151', fontSize: 12 }}>
            🖨️ Imprimir pedido
          </button>
          {col === 'delivered' && (
            <button className="kanban-move-btn" onClick={finalize} disabled={finishing}
              style={{ background: '#6b7280', fontSize: 12 }}>
              {finishing ? '...' : '🗑️ Finalizar e remover'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage({ token, storeId }) {
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('kanban_auto_print') === 'true');
  const [autoAccept, setAutoAccept] = useState(() => localStorage.getItem('kanban_auto_accept') === 'true');
  const autoAcceptRef = useRef(autoAccept);
  useEffect(() => { autoAcceptRef.current = autoAccept; }, [autoAccept]);
  const autoPrintRef = useRef(autoPrint);
  useEffect(() => { autoPrintRef.current = autoPrint; }, [autoPrint]);

  const acceptOrder = useCallback(async (order) => {
    await fetch('/api/admin-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token, 'x-store-id': storeId || '' },
      body: JSON.stringify({ id: order.id, kanbanStatus: 'preparing' }),
    });
    if (autoPrintRef.current) printOrder(order);
    return order.id;
  }, [token, storeId]);

  const fetchOrders = useCallback(() => {
    if (!storeId) return;
    fetch('/api/admin-orders', { headers: { 'x-admin-token': token, 'x-store-id': storeId } })
      .then(r => r.json())
      .then(async d => {
        const raw = d.orders || [];
        const parsed = raw.map(x => {
          try { return typeof x === 'string' ? JSON.parse(x) : x; } catch { return null; }
        }).filter(Boolean);

        // Auto-accept: move all pending → preparing automatically
        if (autoAcceptRef.current) {
          const pending = parsed.filter(o => (o.kanban_status || o.kanbanStatus || 'pending') === 'pending');
          if (pending.length > 0) {
            await Promise.all(pending.map(o => acceptOrder(o)));
            // Update local state: flip them to preparing
            const acceptedIds = new Set(pending.map(o => String(o.id)));
            const updated = parsed.map(o =>
              acceptedIds.has(String(o.id))
                ? { ...o, kanban_status: 'preparing', kanbanStatus: 'preparing' }
                : o
            );
            setOrders(updated);
            setLoading(false);
            return;
          }
        }

        setOrders(parsed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, storeId, acceptOrder]);

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 30s
    const t = setInterval(fetchOrders, 30000);
    return () => clearInterval(t);
  }, [fetchOrders]);

  function handleMoved(id, newStatus) {
    setOrders(prev => prev.map(o => String(o.id) === String(id) ? { ...o, kanban_status: newStatus, kanbanStatus: newStatus } : o));
  }

  function handleFinalized(id) {
    setOrders(prev => prev.filter(o => String(o.id) !== String(id)));
  }

  const getKanbanStatus = (o) => o.kanban_status || o.kanbanStatus || 'pending';
  const byCol = (col) => orders.filter(o => getKanbanStatus(o) === col);

  if (loading) return <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Carregando pedidos...</div>;

  const total = orders.filter(o => getKanbanStatus(o) !== 'delivered').length;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 16, color: '#1e2740', margin: 0 }}>
            🧾 Pedidos em andamento: <strong style={{ color: '#e53935' }}>{total}</strong>
          </h3>
          <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Atualiza a cada 30s automaticamente</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="adm-btn ghost" onClick={fetchOrders} style={{ fontSize: 13 }}>🔄 Atualizar</button>
          <button
            className={`adm-btn${autoAccept ? ' primary' : ' ghost'}`}
            style={{ fontSize: 13, background: autoAccept ? '#16a34a' : undefined, borderColor: autoAccept ? '#16a34a' : undefined }}
            onClick={() => {
              const next = !autoAccept;
              setAutoAccept(next);
              localStorage.setItem('kanban_auto_accept', String(next));
              if (next) fetchOrders(); // run immediately when turned ON
            }}
          >
            ✅ Aceitar auto: {autoAccept ? 'ON' : 'OFF'}
          </button>
          <button
            className={`adm-btn${autoPrint ? ' primary' : ' ghost'}`}
            style={{ fontSize: 13 }}
            onClick={() => {
              const next = !autoPrint;
              setAutoPrint(next);
              localStorage.setItem('kanban_auto_print', String(next));
            }}
          >
            🖨️ Auto-imprimir: {autoPrint ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colOrders = byCol(col.key);
          return (
            <div key={col.key} className="kanban-col">
              <div className="kanban-col-header" style={{ borderBottom: `2px solid ${col.color}` }}>
                <span className="kanban-col-icon">{col.emoji}</span>
                <span className="kanban-col-label">{col.label}</span>
                <span className="kanban-col-count" style={{ background: col.color }}>{colOrders.length}</span>
              </div>

              <div className="kanban-col-body">
                {colOrders.length === 0 ? (
                  <div className="kanban-empty">Nenhum pedido</div>
                ) : (
                  colOrders.map(o => (
                    <OrderCard key={o.id} order={o} token={token} storeId={storeId} onMoved={handleMoved} onFinalized={handleFinalized} col={col.key} autoPrint={autoPrint} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
