import { useState, useEffect, useRef } from 'react'
import { fmtPrice } from '../../utils/helpers'
import { getUtms, sendUtmifyOrder } from '../../utils/utmify'

const TOTAL_SECS = 300;
const CIRC = 2 * Math.PI * 54;

// ── Meta Pixel helpers ───────────────────────────────────────────────────────

function firePixelPurchase(value, orderId) {
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Purchase', {
        value:    value / 100,
        currency: 'BRL',
        order_id: orderId,
      });
    }
  } catch (e) { console.warn('fbq:', e); }
}

async function sendCapiPurchase(value, orderId) {
  try {
    await fetch('/api/meta-event', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        event_name: 'Purchase',
        value,
        currency:  'BRL',
        event_id:  orderId,
        order_id:  orderId,
      }),
    });
  } catch (e) { console.warn('CAPI:', e); }
}

// ────────────────────────────────────────────────────────────────────────────

export default function PixScreen({ active, amount, customer, deliveryAddress, onBack, onPaid, showToast }) {
  const [pixKey, setPixKey]       = useState('Gerando PIX...');
  const [ready, setReady]         = useState(false);
  const [copyState, setCopyState] = useState('idle');
  const [countdown, setCountdown] = useState(TOTAL_SECS);
  const [expired, setExpired]     = useState(false);
  const [paid, setPaid]           = useState(false);

  const countdownRef = useRef(null);
  const pollRef      = useRef(null);
  const pixIdRef     = useRef(null);
  const amountRef    = useRef(amount);

  const stopAll = () => {
    clearInterval(countdownRef.current);
    clearInterval(pollRef.current);
  };

  const startCountdown = () => {
    clearInterval(countdownRef.current);
    let secs = TOTAL_SECS;
    setCountdown(TOTAL_SECS);
    setExpired(false);
    countdownRef.current = setInterval(() => {
      secs--;
      setCountdown(secs);
      if (secs <= 0) {
        clearInterval(countdownRef.current);
        clearInterval(pollRef.current);
        setExpired(true);
      }
    }, 1000);
  };

  const startPolling = (id) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (!id) return;
      try {
        const res = await fetch(`/api/pix-status?id=${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'paid') {
          stopAll();
          const approvedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
          const customerData = customer
            ? { name: customer.name || '', email: '', phone: customer.phone || '', document: '' }
            : null;
          sendUtmifyOrder(id, 'paid', amountRef.current, approvedDate, customerData);
          firePixelPurchase(amountRef.current, id);
          sendCapiPurchase(amountRef.current, id);
          setPaid(true);
        }
        if (data.status === 'expired' || data.status === 'cancelled') {
          clearInterval(pollRef.current);
          setPixKey('PIX expirado. Feche e tente novamente.');
        }
      } catch {}
    }, 4000);
  };

  const createPix = async () => {
    try {
      const utms = getUtms();
      const res = await fetch('/api/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:       amountRef.current,
          description:  'Pedido Pizzaria',
          payer: customer ? {
            name:  customer.name  || undefined,
            phone: customer.phone || undefined,
          } : undefined,
          ...utms,
        }),
      });
      if (!res.ok) throw new Error('api error');
      const data = await res.json();
      pixIdRef.current = data.id;
      setPixKey(data.pix_copy_paste);
      setReady(true);
      const customerData = customer
        ? { name: customer.name || '', email: '', phone: customer.phone || '', document: '' }
        : null;
      sendUtmifyOrder(data.id, 'waiting_payment', amountRef.current, null, customerData);
      startPolling(data.id);
    } catch {
      setPixKey('Erro ao gerar PIX. Feche e tente novamente.');
    }
  };

  const handleNewKey = () => {
    setExpired(false);
    setPixKey('Gerando PIX...');
    setReady(false);
    setCopyState('idle');
    startCountdown();
    createPix();
  };

  useEffect(() => {
    if (active) {
      amountRef.current = amount;
      setPixKey('Gerando PIX...');
      setReady(false);
      setCopyState('idle');
      setPaid(false);
      startCountdown();
      createPix();
    } else {
      stopAll();
    }
    return stopAll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // redirect removed — now shows iFood-style tracking screen

  const doCopy = () => {
    navigator.clipboard.writeText(pixKey).then(() => {
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    });
  };

  const m = String(Math.floor(countdown / 60)).padStart(2, '0');
  const s = String(countdown % 60).padStart(2, '0');
  const dashOffset = CIRC * (1 - countdown / TOTAL_SECS);

  if (paid) {
    const now = new Date();
    const from = new Date(now.getTime() + 25 * 60000);
    const to   = new Date(now.getTime() + 35 * 60000);
    const pad  = n => String(n).padStart(2, '0');
    const eta  = `${pad(from.getHours())}:${pad(from.getMinutes())} - ${pad(to.getHours())}:${pad(to.getMinutes())}`;

    return (
      <div className={'screen tracking-screen' + (active ? ' active' : '')}>
        {/* top bar */}
        <div className="tracking-topbar">
          <button className="tracking-back-btn" onClick={onPaid}>
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          </button>
          <button className="tracking-help-btn">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
            Ajuda
          </button>
        </div>

        <div className="tracking-body">
          {/* ETA */}
          <div className="tracking-eta-row">
            <div>
              <p className="tracking-eta-label">Previsão de entrega</p>
              <p className="tracking-eta-time">{eta}</p>
            </div>
            <p className="tracking-realtime">Atualizado em<br/>tempo real</p>
          </div>

          {/* progress bar */}
          <div className="tracking-progress">
            <div className="tracking-progress-line">
              <div className="tracking-progress-fill"/>
            </div>
            <div className="tracking-dots">
              <span className="tracking-dot active"/>
              <span className="tracking-dot"/>
              <span className="tracking-dot"/>
            </div>
          </div>

          {/* status */}
          <div className="tracking-status-card">
            <div className="tracking-status-text">
              <svg viewBox="0 0 24 24" width="16" height="16" style={{flexShrink:0,marginTop:2}}><circle cx="12" cy="12" r="10" fill="#e8001d"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>O pedido está sendo preparado e logo sairá pra entrega</span>
            </div>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{flexShrink:0,color:'#bbb'}}><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
          </div>

          {/* ifood delivery notice */}
          <div className="tracking-ifood-banner">
            <img src="https://logodownload.org/wp-content/uploads/2017/05/ifood-logo.png" alt="iFood" className="tracking-ifood-logo"/>
            <p>A entrega do seu pedido será feita por<br/><strong>Entregadores Parceiros iFood.</strong></p>
          </div>

          {/* address */}
          <div className="tracking-section">
            <p className="tracking-section-title">Entrega em</p>
            <div className="tracking-address-box">
              {deliveryAddress
                ? <p className="tracking-address-text">{deliveryAddress}</p>
                : <div className="tracking-address-blur"/>
              }
            </div>
            <p className="tracking-trackable">
              <svg viewBox="0 0 24 24" width="13" height="13"><path fill="#e8001d" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              Esta entrega é rastreável
            </p>
          </div>

          {/* order code */}
          <div className="tracking-section">
            <p className="tracking-section-title">Código para receber o produto</p>
            <div className="tracking-code-box">
              <span className="tracking-code">0101</span>
              <p className="tracking-code-hint">Informe esse código ao entregador</p>
            </div>
          </div>

          {/* order details */}
          <div className="tracking-section">
            <p className="tracking-section-title">Detalhes do pedido</p>
            <div className="tracking-detail-row">
              <div className="tracking-detail-blur"/>
              <svg viewBox="0 0 24 24" width="18" height="18" style={{color:'#e8001d',flexShrink:0}}><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
            </div>
            <div className="tracking-total-row">
              <span>Total</span>
              <span>{fmtPrice(amountRef.current)}</span>
            </div>
          </div>

          {/* fale com loja */}
          <button className="tracking-contact-btn" onClick={onPaid}>
            Fale com a loja
            <svg viewBox="0 0 24 24" width="17" height="17"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={'screen' + (active ? ' active' : '')}>
      <div className="pix-header">
        <button className="screen-back-btn" onClick={() => { stopAll(); onBack(); }}>
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Voltar
        </button>
        <span className="pix-header-title">Pagamento</span>
        <div style={{ width: 70 }} />
      </div>

      <div className="pix-screen-body">
        <h2 className="pix-awaiting-title">Aguardando pagamento Pix...</h2>
        <p className="pix-amount-display">{fmtPrice(amount)}</p>

        <div className="pix-timer-wrap">
          {expired ? (
            <div className="pix-expired-wrap">
              <span className="pix-expired-icon">⏰</span>
              <span className="pix-expired-label">Tempo esgotado</span>
              <button className="pix-new-key-btn" onClick={handleNewKey}>🔄 Gerar nova chave PIX</button>
            </div>
          ) : (
            <>
              <p className="pix-timer-label">Tempo restante</p>
              <div className="pix-ring-wrap">
                <svg className="pix-ring-svg" viewBox="0 0 130 130">
                  <circle className="pix-ring-bg" cx="65" cy="65" r="54"/>
                  <circle className="pix-ring-fg" cx="65" cy="65" r="54" style={{ strokeDashoffset: dashOffset }}/>
                </svg>
                <span className="pix-timer-num">{m}:{s}</span>
              </div>
            </>
          )}
        </div>

        <div className="pix-code-section">
          <p className="pix-code-label">Pague com <strong>Pix copia e cola</strong>:</p>
          <div className="pix-code-row">
            <span className="pix-code-text">{pixKey}</span>
            <button className="pix-inline-copy" disabled={!ready} onClick={doCopy}>
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            </button>
          </div>
        </div>

        <button
          className={'pix-copy-btn' + (copyState === 'copied' ? ' copied' : '')}
          disabled={!ready}
          onClick={doCopy}
        >
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          {copyState === 'copied' ? 'Copiado! ✓' : 'Copiar código'}
        </button>

        <button
          className="pix-paid-btn"
          onClick={() => { startPolling(pixIdRef.current); showToast('Verificando pagamento...'); }}
        >
          Já paguei
        </button>
      </div>
    </div>
  );
}
