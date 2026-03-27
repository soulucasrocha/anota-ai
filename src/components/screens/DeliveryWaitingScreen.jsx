import { useState, useEffect, useRef } from 'react'
import { fmtPrice } from '../../utils/helpers'

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

export default function DeliveryWaitingScreen({ active, orderId, amount, customer, deliveryAddress, paymentMethod, onBack, onDone }) {
  const [orderStatus, setOrderStatus] = useState('pending');
  const [linkCopied, setLinkCopied]   = useState(false);
  const pollRef     = useRef(null);
  const orderIdRef  = useRef(orderId);
  const amountRef   = useRef(amount);

  useEffect(() => { orderIdRef.current = orderId; }, [orderId]);
  useEffect(() => { amountRef.current  = amount;  }, [amount]);

  const startPolling = (id) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/order-status?pixId=${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status) setOrderStatus(data.status);
        if (data.total && !amountRef.current) amountRef.current = data.total;
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
      fetch(`/api/order-status?pixId=${oid}`)
        .then(r => r.json())
        .then(d => { if (d.status) setOrderStatus(d.status); })
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

  const now  = new Date();
  const from = new Date(now.getTime() + 25 * 60000);
  const to   = new Date(now.getTime() + 35 * 60000);
  const pad  = n => String(n).padStart(2, '0');
  const eta  = `${pad(from.getHours())}:${pad(from.getMinutes())} - ${pad(to.getHours())}:${pad(to.getMinutes())}`;

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
            <p className="tracking-eta-time">{accepted ? eta : 'Aguardando...'}</p>
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
          </div>
        </div>

        {/* Link compartilhável */}
        <button
          className={'tracking-share-btn' + (linkCopied ? ' copied' : '')}
          onClick={copyLink}
        >
          {linkCopied ? (
            <>
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              Link copiado!
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
              Copiar link do pedido
            </>
          )}
        </button>

        {/* iFood/99food delivery notice */}
        <div className="tracking-ifood-banner">
          <img src="https://logodownload.org/wp-content/uploads/2017/05/ifood-logo.png" alt="iFood" className="tracking-ifood-logo"/>
          <p>A entrega do seu pedido será feita por<br/><strong>Entregadores Parceiros iFood.</strong></p>
        </div>

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

        {/* Contact/done button */}
        <button className="tracking-contact-btn" onClick={handleDone}>
          Fale com a loja
          <svg viewBox="0 0 24 24" width="17" height="17"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
        </button>
      </div>
    </div>
  );
}
