import { useState, useEffect, useCallback, useRef } from 'react';
import { printOrder as thermalPrintOrder } from '../../utils/thermalPrint';

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
  thermalPrintOrder(order);
}

// Feature 7: Countdown timer
function OrderTimer({ createdAt, deliveryMinutes }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!deliveryMinutes || !createdAt) return null;

  const createdMs = new Date(createdAt).getTime();
  const deadlineMs = createdMs + deliveryMinutes * 60 * 1000;
  const remainingMs = deadlineMs - now;
  const elapsedMs = now - createdMs;

  if (remainingMs > 20 * 60 * 1000) {
    // Normal: more than 20min left
    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);
    return (
      <div style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', marginTop: 4 }}>
        ⏱️ {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')} restantes
      </div>
    );
  } else if (remainingMs > 0) {
    // Warning: ≤ 20min left
    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);
    return (
      <div style={{ fontSize: 12, fontWeight: 600, color: '#d97706', marginTop: 4 }}>
        ⚠️ {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')} — Vai atrasar
      </div>
    );
  } else {
    // Overdue
    const overMins = Math.floor(-remainingMs / 60000);
    const overSecs = Math.floor((-remainingMs % 60000) / 1000);
    return (
      <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginTop: 4 }}>
        🔴 Atrasado {String(overMins).padStart(2,'0')}:{String(overSecs).padStart(2,'0')}
      </div>
    );
  }
}

function applyBotVars(template, order) {
  const nome   = order.customer?.name || '';
  const pedido = String(order.id).slice(-6);
  const total  = 'R$ ' + ((order.total || 0) / 100).toFixed(2).replace('.', ',');
  return template.replace(/\{\{nome\}\}/g, nome).replace(/\{\{pedido\}\}/g, pedido).replace(/\{\{total\}\}/g, total);
}

function OrderCard({ order, token, storeId, onMoved, onFinalized, col, autoPrint, deliveryMinutes, botConfig }) {
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

      // Send WA notification if bot enabled
      const bot = botConfig;
      if (bot?.enabled && bot?.accountId && bot?.[nextStatus]) {
        const phone = (order.customer?.phone || order.wa_phone || '').replace(/\D/g, '');
        if (phone) {
          const message = applyBotVars(bot[nextStatus], order);
          fetch(`/api/wa?action=send&id=${bot.accountId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body: JSON.stringify({ phone, message }),
          }).catch(() => {});
        }
      }
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
  const phone = order.customer?.phone || '';
  const waPhone = phone.replace(/\D/g, '');
  const showTimer = (col === 'preparing' || col === 'delivering') && deliveryMinutes > 0;

  return (
    <div className="kanban-card" style={{ borderTop: `3px solid ${colDef?.color}` }}>
      <div className="kanban-card-header">
        <span className="kanban-order-id">#{String(order.id).slice(-6)}</span>
        <span className="kanban-order-time">{fmtTime(order.created_at || order.createdAt)}</span>
      </div>

      <div className="kanban-customer">
        <span className="kanban-name">👤 {order.customer?.name || '—'}</span>
        {phone && (
          <a
            href={`https://wa.me/55${waPhone}`}
            target="_blank"
            rel="noreferrer"
            className="kanban-phone"
            style={{ color: '#16a34a', textDecoration: 'none', cursor: 'pointer' }}
          >
            📞 {phone}
          </a>
        )}
      </div>

      {showTimer && (
        <OrderTimer createdAt={order.created_at || order.createdAt} deliveryMinutes={deliveryMinutes} />
      )}

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
            <span className="kanban-item-name">{item.name}{item.note ? <span style={{display:'block',fontSize:11,color:'#888',fontWeight:400}}>{item.note}</span> : null}</span>
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

// ── Sound system ──────────────────────────────────────────────────────────────
function buildDefaultChime(ctx) {
  // 3-tone chime: pleasant alert sound
  [[880, 0], [1100, 0.18], [1320, 0.34]].forEach(([freq, delay]) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + delay + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.36);
  });
}

export default function OrdersPage({ token, storeId }) {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [deliveryMinutes, setDeliveryMinutes] = useState(0);
  const [autoPrint, setAutoPrint]     = useState(() => localStorage.getItem('kanban_auto_print') === 'true');
  const [autoAccept, setAutoAccept]   = useState(() => localStorage.getItem('kanban_auto_accept') === 'true');
  const autoAcceptRef = useRef(autoAccept);
  useEffect(() => { autoAcceptRef.current = autoAccept; }, [autoAccept]);
  const autoPrintRef = useRef(autoPrint);
  useEffect(() => { autoPrintRef.current = autoPrint; }, [autoPrint]);

  // Sound state
  const [soundType,    setSoundType]    = useState(() => localStorage.getItem('order_sound_type') || 'default');
  const [soundPanel,   setSoundPanel]   = useState(false);
  const [customLabel,  setCustomLabel]  = useState(() => localStorage.getItem('order_sound_label') || '');
  const audioCtxRef    = useRef(null);
  const customBufRef   = useRef(null);   // decoded AudioBuffer for custom sound
  const knownIdsRef    = useRef(null);   // Set<string> of order IDs seen so far
  const soundTypeRef   = useRef(soundType);
  useEffect(() => { soundTypeRef.current = soundType; }, [soundType]);

  // Unlock AudioContext on first user interaction
  function getAudioCtx() {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }
  useEffect(() => {
    const unlock = () => getAudioCtx();
    document.addEventListener('click', unlock, { once: true });
    return () => document.removeEventListener('click', unlock);
  }, []);

  // Keep AudioContext running even in background tabs
  useEffect(() => {
    const handler = () => { if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Load custom sound from localStorage into AudioBuffer
  useEffect(() => {
    const b64 = localStorage.getItem('order_sound_b64');
    if (!b64) return;
    const ctx = getAudioCtx();
    const bin = atob(b64.split(',')[1] || b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    ctx.decodeAudioData(arr.buffer).then(buf => { customBufRef.current = buf; }).catch(() => {});
  }, []);

  function playSound() {
    const type = soundTypeRef.current;
    if (type === 'off') return;
    try {
      const ctx = getAudioCtx();
      if (type === 'custom' && customBufRef.current) {
        const src = ctx.createBufferSource();
        src.buffer = customBufRef.current;
        src.connect(ctx.destination);
        src.start();
      } else {
        buildDefaultChime(ctx);
      }
    } catch {}
  }

  function handleSoundUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result;
      localStorage.setItem('order_sound_b64', b64);
      localStorage.setItem('order_sound_label', file.name);
      setCustomLabel(file.name);
      // Decode into buffer immediately
      const ctx = getAudioCtx();
      const bin = atob(b64.split(',')[1]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      ctx.decodeAudioData(arr.buffer).then(buf => { customBufRef.current = buf; }).catch(() => {});
      setSoundType('custom');
      localStorage.setItem('order_sound_type', 'custom');
    };
    reader.readAsDataURL(file);
  }

  // Bot config
  const [botConfig, setBotConfig] = useState(null);
  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/admin-products?type=bot&storeId=${storeId}`, { headers: { 'x-admin-token': token } })
      .then(r => r.json()).then(d => setBotConfig(d.bot || null)).catch(() => {});
  }, [token, storeId]);

  // Fetch delivery time
  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/admin-products?type=delivery&storeId=${storeId}`, { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(d => {
        const dt = d.delivery?.delivery_time;
        if (dt && dt > 0) setDeliveryMinutes(dt);
      })
      .catch(() => {});
  }, [token, storeId]);

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

        // Detect new orders and play sound
        const pendingIds = parsed
          .filter(o => (o.kanban_status || o.kanbanStatus || 'pending') === 'pending')
          .map(o => String(o.id));
        if (knownIdsRef.current === null) {
          // First load — just record existing IDs, don't play sound
          knownIdsRef.current = new Set(pendingIds);
        } else {
          const newOnes = pendingIds.filter(id => !knownIdsRef.current.has(id));
          if (newOnes.length > 0) {
            playSound();
            newOnes.forEach(id => knownIdsRef.current.add(id));
          }
          // Clean up IDs that are no longer pending
          const allCurrentIds = new Set(parsed.map(o => String(o.id)));
          knownIdsRef.current.forEach(id => { if (!allCurrentIds.has(id)) knownIdsRef.current.delete(id); });
        }

        // Auto-accept: move all pending → preparing automatically
        if (autoAcceptRef.current) {
          const pending = parsed.filter(o => (o.kanban_status || o.kanbanStatus || 'pending') === 'pending');
          if (pending.length > 0) {
            await Promise.all(pending.map(o => acceptOrder(o)));
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
  }, [token, storeId, acceptOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, 8000);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: soundPanel ? 8 : 20 }}>
        <div>
          <h3 style={{ fontSize: 16, color: '#1e2740', margin: 0 }}>
            🧾 Pedidos em andamento: <strong style={{ color: '#e53935' }}>{total}</strong>
          </h3>
          <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
            Atualiza a cada 8s automaticamente
            {deliveryMinutes > 0 && <span style={{ marginLeft: 8 }}>· ⏱️ Entrega estimada: {deliveryMinutes}min</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`adm-btn${soundPanel ? ' primary' : ' ghost'}`}
            style={{ fontSize: 13 }}
            onClick={() => setSoundPanel(p => !p)}
          >
            🔔 Som: {soundType === 'off' ? 'OFF' : soundType === 'custom' ? 'Custom' : 'Padrão'}
          </button>
          <button className="adm-btn ghost" onClick={fetchOrders} style={{ fontSize: 13 }}>🔄 Atualizar</button>
        </div>
      </div>

      {soundPanel && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#374151' }}>🔔 Notificação sonora de novos pedidos</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {[['off','🔕 Desligado'],['default','🎵 Padrão'],['custom','🎧 Personalizado']].map(([val, lbl]) => (
              <button
                key={val}
                className={`adm-btn${soundType === val ? ' primary' : ' ghost'}`}
                style={{ fontSize: 12, padding: '6px 14px' }}
                onClick={() => { setSoundType(val); localStorage.setItem('order_sound_type', val); }}
              >
                {lbl}
              </button>
            ))}
            <button
              className="adm-btn ghost"
              style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={() => { playSound(); }}
            >
              ▶️ Testar
            </button>
          </div>
          {soundType === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 12, color: '#6b7280' }}>
                {customLabel ? `📂 ${customLabel}` : 'Nenhum arquivo'}
              </label>
              <label className="adm-btn ghost" style={{ fontSize: 12, padding: '5px 12px', cursor: 'pointer' }}>
                📁 Escolher arquivo
                <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleSoundUpload} />
              </label>
            </div>
          )}
          <p style={{ margin: '10px 0 0', fontSize: 11, color: '#9ca3af' }}>
            O som toca mesmo se a aba estiver em segundo plano. Clique na página pelo menos uma vez para ativar o áudio.
          </p>
        </div>
      )}

      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colOrders = byCol(col.key);
          return (
            <div key={col.key} className="kanban-col">
              {/* Button above Pendente column */}
              {col.key === 'pending' && (
                <button
                  className={`adm-btn${autoAccept ? ' primary' : ' ghost'}`}
                  style={{ fontSize: 12, width: '100%', marginBottom: 6, background: autoAccept ? '#16a34a' : undefined, borderColor: autoAccept ? '#16a34a' : undefined }}
                  onClick={() => {
                    const next = !autoAccept;
                    setAutoAccept(next);
                    localStorage.setItem('kanban_auto_accept', String(next));
                    if (next) fetchOrders();
                  }}
                >
                  ✅ Aceitar auto: {autoAccept ? 'ON' : 'OFF'}
                </button>
              )}
              {/* Button above Em Preparo column */}
              {col.key === 'preparing' && (
                <button
                  className={`adm-btn${autoPrint ? ' primary' : ' ghost'}`}
                  style={{ fontSize: 12, width: '100%', marginBottom: 6 }}
                  onClick={() => {
                    const next = !autoPrint;
                    setAutoPrint(next);
                    localStorage.setItem('kanban_auto_print', String(next));
                  }}
                >
                  🖨️ Auto-imprimir: {autoPrint ? 'ON' : 'OFF'}
                </button>
              )}
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
                    <OrderCard
                      key={o.id}
                      order={o}
                      token={token}
                      storeId={storeId}
                      onMoved={handleMoved}
                      onFinalized={handleFinalized}
                      col={col.key}
                      autoPrint={autoPrint}
                      deliveryMinutes={deliveryMinutes}
                      botConfig={botConfig}
                    />
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
