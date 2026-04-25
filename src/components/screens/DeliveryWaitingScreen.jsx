import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { fmtPrice } from '../../utils/helpers'

const DriverTrackingMap = lazy(() => import('./DriverTrackingMap'))

const STATUS_INFO = {
  pending:    { dots: 0, text: 'Aguardando aceitação da loja... 🕐', accepted: false },
  preparing:  { dots: 1, text: 'Pedido aceito! Sendo preparado 👨‍🍳', accepted: true },
  delivering: { dots: 2, text: 'Seu pedido saiu para entrega! 🛵', accepted: true },
  delivered:  { dots: 3, text: 'Pedido entregue com sucesso! ✅', accepted: true },
};

const LS_KEY = 'delivery_order_v1';

function saveDeliveryOrder(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ ...data, expiry: Date.now() + 86400000 })); } catch {}
}
function loadDeliveryOrder() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (Date.now() > d.expiry) { localStorage.removeItem(LS_KEY); return null; }
    return d;
  } catch { return null; }
}
function clearDeliveryOrder() { try { localStorage.removeItem(LS_KEY); } catch {} }

const PM_LABEL = {
  card_delivery: 'Cartão na Entrega',
  pix_delivery:  'PIX na Entrega',
  cash:          'Dinheiro',
};

const PM_NAME = {
  card_delivery: 'Cartão na Entrega',
  pix_delivery:  'PIX na Entrega',
  cash:          'Dinheiro',
};

function buildWhatsappUrl(whatsapp, { orderId, cart, customer, deliveryAddress, paymentMethod, amount, changeNote }) {
  const num = '55' + whatsapp.replace(/\D/g, '');
  const items = cart
    ? Object.values(cart).map(({ item, qty }) => `  ${qty}x ${item.name}`).join('\n')
    : '';
  const total = amount ? 'R$ ' + (amount / 100).toFixed(2).replace('.', ',') : '';
  const msg = [
    `Ola! Acabei de fazer um pedido.`,
    ``,
    `Pedido: #${String(orderId).slice(-6)}`,
    customer?.name ? `Cliente: ${customer.name}` : '',
    customer?.phone ? `Telefone: ${customer.phone}` : '',
    deliveryAddress ? `Endereco: ${deliveryAddress}` : '',
    ``,
    items ? `Itens:\n${items}` : '',
    ``,
    total ? `Total: ${total}` : '',
    paymentMethod ? `Pagamento: ${PM_NAME[paymentMethod] || paymentMethod}` : '',
    changeNote ? changeNote : '',
  ].filter(Boolean).join('\n');
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

export default function DeliveryWaitingScreen({ active, orderId, amount, cart, customer, deliveryAddress, paymentMethod, changeNote: changeNoteProp, changeFor: changeForProp, storeWhatsapp, storeName, onBack, onDone }) {
  const [orderStatus, setOrderStatus] = useState('pending');
  const [driverName,  setDriverName]  = useState(null);
  const [driverPos,   setDriverPos]   = useState(null);  // { lat, lng }
  const [etaInfo,     setEtaInfo]     = useState(null);  // { minutes, arrival }
  const [linkCopied, setLinkCopied]   = useState(false);
  const pollRef     = useRef(null);
  const orderIdRef  = useRef(orderId);
  const amountRef   = useRef(amount);

  // Restaura changeFor/changeNote do localStorage se props estiverem vazios (pós-refresh)
  const saved = loadDeliveryOrder();
  const changeFor  = changeForProp  ?? saved?.changeFor  ?? null;
  const changeNote = changeNoteProp ?? saved?.changeNote ?? null;

  useEffect(() => { orderIdRef.current = orderId; }, [orderId]);
  useEffect(() => { amountRef.current  = amount;  }, [amount]);

  const startPolling = (id) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/order-save?pixId=${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status) setOrderStatus(data.status);
        if (data.total && !amountRef.current) amountRef.current = data.total;
        if (data.driverName) setDriverName(data.driverName);
        if (data.driverLat && data.driverLng) setDriverPos({ lat: data.driverLat, lng: data.driverLng });
      } catch {}
    }, 6000);
  };

  useEffect(() => {
    if (active) {
      // Restore from localStorage if refreshed
      const saved = loadDeliveryOrder();
      const oid = orderId || saved?.orderId;
      if (!oid) return;
      orderIdRef.current = oid;
      if (saved?.amount) amountRef.current = saved.amount;
      setOrderStatus('pending');
      // Immediate fetch
      fetch(`/api/order-save?pixId=${oid}`)
        .then(r => r.json())
        .then(d => {
          if (d.status) setOrderStatus(d.status);
          if (d.driverName) setDriverName(d.driverName);
          if (d.driverLat && d.driverLng) setDriverPos({ lat: d.driverLat, lng: d.driverLng });
        })
        .catch(() => {});
      startPolling(oid);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, orderId]);

  function handleDone() {
    clearDeliveryOrder();
    clearInterval(pollRef.current);
    onDone();
  }

  function copyLink() {
    const link = `${window.location.origin}/?d=${orderIdRef.current}`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }).catch(() => alert('Link do pedido:\n' + `${window.location.origin}/?d=${orderIdRef.current}`));
  }

  const stInfo = STATUS_INFO[orderStatus] || STATUS_INFO.pending;
  const { dots, text, accepted } = stInfo;

  const pad = n => String(n).padStart(2, '0');
  // ETA real do mapa (OSRM) ou estimativa estática de fallback
  const now  = new Date();
  const etaFallback = `${pad(new Date(now.getTime()+25*60000).getHours())}:${pad(new Date(now.getTime()+25*60000).getMinutes())} - ${pad(new Date(now.getTime()+35*60000).getHours())}:${pad(new Date(now.getTime()+35*60000).getMinutes())}`;
  const etaDisplay = etaInfo
    ? `~${etaInfo.arrival}  (${etaInfo.minutes} min)`
    : etaFallback;

  return (
    <div className={'screen tracking-screen' + (active ? ' active' : '')}>
      {/* top bar */}
      <div className="tracking-topbar">
        <button className="tracking-back-btn" onClick={handleDone}>
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <button className="tracking-help-btn">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
          Ajuda
        </button>
      </div>

      <div className="tracking-body">
        {/* ETA / status header */}
        <div className="tracking-eta-row">
          <div>
            <p className="tracking-eta-label">{accepted ? 'Previsão de entrega' : 'Status do pedido'}</p>
            <p className="tracking-eta-time">{accepted ? etaDisplay : 'Aguardando...'}</p>
          </div>
          <p className="tracking-realtime">Atualizado em<br/>tempo real</p>
        </div>

        {/* Progress */}
        <div className="tracking-progress">
          <div className="tracking-progress-line">
            <div className="tracking-progress-fill" style={{
              width: dots === 0 ? '0%' : dots === 1 ? '0%' : dots === 2 ? '50%' : '100%',
              transition: 'width 0.8s ease',
            }}/>
          </div>
          <div className="tracking-dots">
            <span className={`tracking-dot${dots >= 1 ? ' active' : ''}`}/>
            <span className={`tracking-dot${dots >= 2 ? ' active' : ''}`}/>
            <span className={`tracking-dot${dots >= 3 ? ' active' : ''}`}/>
          </div>
        </div>

        {/* Waiting banner (only when pending) */}
        {!accepted && (
          <div className="delivery-waiting-banner">
            <div className="delivery-waiting-spinner"/>
            <div>
              <p className="delivery-waiting-title">Aguardando aceitação da loja</p>
              <p className="delivery-waiting-sub">Você receberá uma atualização assim que o pedido for aceito</p>
            </div>
          </div>
        )}

        {/* Status card */}
        <div className="tracking-status-card">
          <div className="tracking-status-text">
            <svg viewBox="0 0 24 24" width="16" height="16" style={{flexShrink:0,marginTop:2}}><circle cx="12" cy="12" r="10" fill="#e8001d"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>{text}</span>
          </div>
          <svg viewBox="0 0 24 24" width="18" height="18" style={{flexShrink:0,color:'#bbb'}}><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
        </div>

        {/* Payment method info */}
        <div className="tracking-section">
          <p className="tracking-section-title">Forma de pagamento</p>
          <div className="tracking-address-box">
            <p className="tracking-address-text" style={{ color: '#e8001d', fontWeight: 700 }}>
              {PM_LABEL[paymentMethod] || 'Pagamento na entrega'}
            </p>
            {paymentMethod === 'cash' && changeFor && changeFor > 0 ? (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                  <span>Total do pedido:</span>
                  <span style={{ fontWeight: 700 }}>{fmtPrice(amountRef.current || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                  <span>Pagamento em dinheiro:</span>
                  <span style={{ fontWeight: 700 }}>R$ {Number(changeFor).toFixed(2).replace('.', ',')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#15803d', fontWeight: 700, borderTop: '1px dashed #d1fae5', paddingTop: 4 }}>
                  <span>Troco:</span>
                  <span>{changeFor * 100 > (amountRef.current || 0) ? fmtPrice(changeFor * 100 - (amountRef.current || 0)) : 'Sem troco'}</span>
                </div>
              </div>
            ) : changeNote ? (
              <p style={{ color: '#15803d', fontWeight: 600, fontSize: 13, marginTop: 4 }}>
                💵 {changeNote}
              </p>
            ) : null}
          </div>
        </div>

        {/* WhatsApp button (no lugar do copiar link) */}
        {storeWhatsapp && (
          <a
            href={buildWhatsappUrl(storeWhatsapp, { orderId: orderIdRef.current, cart, customer, deliveryAddress, paymentMethod, amount: amountRef.current, changeNote })}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              textDecoration: 'none', background: '#25D366', color: '#fff',
              fontWeight: 700, fontSize: 15, borderRadius: 14, padding: '14px 24px',
              margin: '4px 0', boxShadow: '0 4px 14px rgba(37,211,102,.35)',
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Acompanhar pedido pelo WhatsApp
          </a>
        )}

        {/* Card do entregador — aparece quando um driver aceitar */}
        {driverName && (
          <div className="tracking-section">
            <p className="tracking-section-title">Seu entregador</p>
            <div className="tracking-address-box" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px' }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%',
                background: '#e53935', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 20,
              }}>
                {driverName[0]?.toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1e2740' }}>{driverName}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                  {orderStatus === 'delivering' ? '🛵 A caminho de você' : '📦 Preparando seu pedido'}
                </p>
              </div>
            </div>

            {/* Mapa em tempo real — só aparece quando o entregador saiu para entrega */}
            {orderStatus === 'delivering' && driverPos && (
              <div style={{ marginTop: 10 }}>
                <Suspense fallback={
                  <div style={{ height: 230, borderRadius: 16, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
                    🗺️ Carregando mapa...
                  </div>
                }>
                  <DriverTrackingMap
                    driverPos={driverPos}
                    address={deliveryAddress}
                    onEta={setEtaInfo}
                  />
                </Suspense>
              </div>
            )}

            {/* Badge "saiu para entrega" sem GPS */}
            {orderStatus === 'delivering' && !driverPos && (
              <div style={{
                marginTop: 8, padding: '8px 12px', borderRadius: 10,
                background: '#fef9c3', border: '1px solid #fde047',
                fontSize: 12, color: '#854d0e', fontWeight: 600,
              }}>
                📡 Aguardando localização GPS do entregador...
              </div>
            )}
          </div>
        )}

        {/* Address */}
        <div className="tracking-section">
          <p className="tracking-section-title">Entrega em</p>
          <div className="tracking-address-box">
            {deliveryAddress
              ? <p className="tracking-address-text">{deliveryAddress}</p>
              : <div className="tracking-address-blur"/>
            }
          </div>
        </div>

        {/* Order total */}
        <div className="tracking-section">
          <div className="tracking-total-row">
            <span>Total</span>
            <span>{fmtPrice(amountRef.current || 0)}</span>
          </div>
        </div>

        {/* Fallback contact if no WhatsApp */}
        {!storeWhatsapp && (
          <button className="tracking-contact-btn" onClick={handleDone}>
            Fale com a loja
            <svg viewBox="0 0 24 24" width="17" height="17"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}
