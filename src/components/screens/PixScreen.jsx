import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
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

async function sendCapiPurchase(value, orderId, storeId) {
  try {
    await fetch('/api/meta-event', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        event_name: 'Purchase',
        value,
        currency:   'BRL',
        event_id:   orderId,
        order_id:   orderId,
        store_id:   storeId,
      }),
    });
  } catch (e) { console.warn('CAPI:', e); }
}

// ────────────────────────────────────────────────────────────────────────────

async function saveOrderToDashboard({ pixId, cart, amount, customer, address, storeId }) {
  try {
    const items = Object.values(cart || {}).map(({ item, qty }) => ({
      id: item.id, name: item.name, qty, price: item.price, note: item.cartNote || '',
    }));
    await fetch('/api/order-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pixId, items, total: amount, customer, address, status: 'paid', storeId: storeId || undefined }),
    });
  } catch (e) { console.warn('order-save:', e); }
}

// ── Status do pedido em tempo real ───────────────────────────────────────────
const STATUS_INFO = {
  pending:    { dots: 1, text: 'Pedido recebido! Será preparado em breve ⏳' },
  preparing:  { dots: 1, text: 'O pedido está sendo preparado 👨‍🍳' },
  delivering: { dots: 2, text: 'Seu pedido saiu para entrega! 🛵' },
  delivered:  { dots: 3, text: 'Pedido entregue com sucesso! ✅' },
};

const LS_KEY         = 'pix_tracking_v1';
const LS_PENDING_KEY = 'pix_pending_v1';

function saveTracking(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ ...data, expiry: Date.now() + 86400000 })); } catch {}
}
function loadTracking() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (Date.now() > d.expiry) { localStorage.removeItem(LS_KEY); return null; }
    return d;
  } catch { return null; }
}
function clearTracking() { try { localStorage.removeItem(LS_KEY); } catch {} }

// ── PIX pendente (antes do pagamento) ────────────────────────────────────────
function savePending(data) {
  try { localStorage.setItem(LS_PENDING_KEY, JSON.stringify({ ...data, savedAt: Date.now() })); } catch {}
}
function loadPending() {
  try {
    const raw = localStorage.getItem(LS_PENDING_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    const elapsed = (Date.now() - d.savedAt) / 1000;
    if (elapsed >= TOTAL_SECS) { localStorage.removeItem(LS_PENDING_KEY); return null; }
    return { ...d, remainingSecs: Math.floor(TOTAL_SECS - elapsed) };
  } catch { return null; }
}
function clearPending() { try { localStorage.removeItem(LS_PENDING_KEY); } catch {} }

export default function PixScreen({ active, amount, cart, customer, deliveryAddress, storeId, onBack, onPaid, showToast }) {
  const [pixKey, setPixKey]               = useState('Gerando PIX...');
  const [qrCode, setQrCode]               = useState(null);
  const [ready, setReady]                 = useState(false);
  const [copyState, setCopyState]         = useState('idle');
  const [countdown, setCountdown]         = useState(TOTAL_SECS);
  const [expired, setExpired]             = useState(false);
  const [paid, setPaid]                   = useState(false);
  const [orderStatus, setOrderStatus]     = useState('pending');
  const [linkCopied, setLinkCopied]       = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [summaryOpen, setSummaryOpen]     = useState(false);

  const countdownRef   = useRef(null);
  const pollRef        = useRef(null);
  const statusPollRef  = useRef(null);
  const pixIdRef       = useRef(null);
  const amountRef      = useRef(amount);
  const customerRef    = useRef(customer);
  const addressRef     = useRef(deliveryAddress);

  // Mantém refs atualizadas
  useEffect(() => { customerRef.current  = customer;        }, [customer]);
  useEffect(() => { addressRef.current   = deliveryAddress; }, [deliveryAddress]);

  const stopAll = () => {
    clearInterval(countdownRef.current);
    clearInterval(pollRef.current);
    clearInterval(statusPollRef.current);
  };

  // ── Polling de status do pedido para o cliente ────────────────────────────
  const startStatusPolling = (pixId) => {
    clearInterval(statusPollRef.current);
    statusPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/order-status?pixId=${pixId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status) setOrderStatus(data.status);
      } catch {}
    }, 8000); // Atualiza a cada 8s
  };

  const startCountdown = (initialSecs = TOTAL_SECS) => {
    clearInterval(countdownRef.current);
    let secs = initialSecs;
    setCountdown(secs);
    setExpired(false);
    countdownRef.current = setInterval(() => {
      secs--;
      setCountdown(secs);
      if (secs <= 0) {
        clearInterval(countdownRef.current);
        clearInterval(pollRef.current);
        clearPending();
        setExpired(true);
      }
    }, 1000);
  };

  const startPolling = (id) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (!id) return;
      try {
        const res = await fetch(`/api/pix?id=${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'paid') {
          stopAll();
          clearPending();
          const approvedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
          const cust = customerRef.current;
          const customerData = cust
            ? { name: cust.name || '', email: '', phone: cust.phone || '', document: '' }
            : null;
          sendUtmifyOrder(id, 'paid', amountRef.current, approvedDate, customerData);
          firePixelPurchase(amountRef.current, id);
          sendCapiPurchase(amountRef.current, id, storeId);
          saveOrderToDashboard({
            pixId: id,
            cart,
            amount: amountRef.current,
            customer: cust,
            address: addressRef.current,
            storeId,
          });
          // Salva estado para persistir no refresh
          saveTracking({
            pixId: id,
            amount: amountRef.current,
            customer: cust,
            deliveryAddress: addressRef.current,
          });
          setOrderStatus('pending');
          startStatusPolling(id);
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
          storeId:      storeId || undefined,
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
      // Gera QR Code localmente a partir do código copia-e-cola
      if (data.pix_copy_paste) {
        QRCode.toDataURL(data.pix_copy_paste, {
          width: 220,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        }).then(url => setQrCode(url)).catch(() => {});
      }
      setReady(true);
      // Salva PIX pendente para restaurar após refresh
      savePending({
        pixId:   data.id,
        pixKey:  data.pix_copy_paste,
        amount:  amountRef.current,
        customer: customerRef.current,
        address:  addressRef.current,
      });
      // Salva transação para aparecer no painel de Transações
      const cust = customerRef.current;
      const items = Object.values(cart || {}).map(({ item, qty }) => ({ id: item.id, name: item.name, qty, price: item.price, note: item.cartNote || '' }));
      fetch('/api/order-save?type=transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixId: data.id, amount: amountRef.current, customer: cust, items, address: addressRef.current, storeId: storeId || undefined, hashtag: sessionStorage.getItem('campaign_ref') || null }),
      }).catch(() => {});
      const customerData = cust
        ? { name: cust.name || '', email: '', phone: cust.phone || '', document: '' }
        : null;
      sendUtmifyOrder(data.id, 'waiting_payment', amountRef.current, null, customerData);
      startPolling(data.id);
    } catch {
      setPixKey('Erro ao gerar PIX. Feche e tente novamente.');
    }
  };

  const handleNewKey = () => {
    clearPending();
    setExpired(false);
    setPixKey('Gerando PIX...');
    setQrCode(null);
    setReady(false);
    setCopyState('idle');
    startCountdown();
    createPix();
  };

  useEffect(() => {
    if (active) {
      // ── 1. Tenta restaurar tela de rastreamento (pós-pagamento) ───────────
      const saved = loadTracking();
      if (saved?.pixId) {
        pixIdRef.current  = saved.pixId;
        amountRef.current = saved.amount || amount;
        setOrderStatus('pending');
        startStatusPolling(saved.pixId);
        // Busca status + detalhes imediatos (inclui address/customerName/total)
        fetch(`/api/order-status?pixId=${saved.pixId}`)
          .then(r => r.json())
          .then(d => {
            if (d.status) setOrderStatus(d.status);
            // Atualiza amount caso venha do link compartilhado (sem amount local)
            if (d.total && !amountRef.current) amountRef.current = d.total;
          })
          .catch(() => {});
        setPaid(true);
        return;
      }

      // ── 2. Tenta restaurar PIX pendente (antes do pagamento) ─────────────
      const pending = loadPending();
      if (pending?.pixId && pending.pixKey && pending.remainingSecs > 0) {
        pixIdRef.current  = pending.pixId;
        amountRef.current = pending.amount || amount;
        setPixKey(pending.pixKey);
        setReady(true);
        setCopyState('idle');
        setPaid(false);
        setOrderStatus('pending');
        // Regenera QR Code a partir do código salvo
        QRCode.toDataURL(pending.pixKey, {
          width: 220, margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        }).then(url => setQrCode(url)).catch(() => {});
        startCountdown(pending.remainingSecs);
        startPolling(pending.pixId);
        return;
      }

      // ── 3. Fluxo normal: gerar novo PIX ──────────────────────────────────
      amountRef.current = amount;
      setPixKey('Gerando PIX...');
      setQrCode(null);
      setReady(false);
      setCopyState('idle');
      setPaid(false);
      setOrderStatus('pending');
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
    const saved  = loadTracking();
    const addr   = deliveryAddress || saved?.deliveryAddress || '';
    const now    = new Date();
    const from   = new Date(now.getTime() + 25 * 60000);
    const to     = new Date(now.getTime() + 35 * 60000);
    const pad    = n => String(n).padStart(2, '0');
    const eta    = `${pad(from.getHours())}:${pad(from.getMinutes())} - ${pad(to.getHours())}:${pad(to.getMinutes())}`;
    const stInfo = STATUS_INFO[orderStatus] || STATUS_INFO.pending;
    const dots   = stInfo.dots;

    function handleClose() {
      clearTracking();
      stopAll();
      onPaid();
    }

    function copyTrackingLink() {
      const link = `${window.location.origin}/?t=${pixIdRef.current}`;
      navigator.clipboard.writeText(link).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
      }).catch(() => {
        // fallback: mostra alert com o link
        alert('Link do pedido:\n' + link);
      });
    }

    return (
      <div className={'screen tracking-screen' + (active ? ' active' : '')}>
        {/* top bar */}
        <div className="tracking-topbar">
          <button className="tracking-back-btn" onClick={handleClose}>
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

          {/* progress bar dinâmico */}
          <div className="tracking-progress">
            <div className="tracking-progress-line">
              <div className="tracking-progress-fill" style={{
                width: dots === 1 ? '0%' : dots === 2 ? '50%' : '100%',
                transition: 'width 0.8s ease',
              }}/>
            </div>
            <div className="tracking-dots">
              <span className={`tracking-dot${dots >= 1 ? ' active' : ''}`}/>
              <span className={`tracking-dot${dots >= 2 ? ' active' : ''}`}/>
              <span className={`tracking-dot${dots >= 3 ? ' active' : ''}`}/>
            </div>
          </div>

          {/* status dinâmico */}
          <div className="tracking-status-card">
            <div className="tracking-status-text">
              <svg viewBox="0 0 24 24" width="16" height="16" style={{flexShrink:0,marginTop:2}}><circle cx="12" cy="12" r="10" fill="#e8001d"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>{stInfo.text}</span>
            </div>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{flexShrink:0,color:'#bbb'}}><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
          </div>

          {/* link compartilhável do pedido */}
          <button
            className={'tracking-share-btn' + (linkCopied ? ' copied' : '')}
            onClick={copyTrackingLink}
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

          {/* ifood delivery notice */}
          <div className="tracking-ifood-banner">
            <img src="https://logodownload.org/wp-content/uploads/2017/05/ifood-logo.png" alt="iFood" className="tracking-ifood-logo"/>
            <p>A entrega do seu pedido será feita por<br/><strong>Entregadores Parceiros iFood.</strong></p>
          </div>

          {/* address */}
          <div className="tracking-section">
            <p className="tracking-section-title">Entrega em</p>
            <div className="tracking-address-box">
              {addr
                ? <p className="tracking-address-text">{addr}</p>
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
          <button className="tracking-contact-btn" onClick={handleClose}>
            Fale com a loja
            <svg viewBox="0 0 24 24" width="17" height="17"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
          </button>
        </div>
      </div>
    );
  }

  // ── Resumo do pedido ─────────────────────────────────────────────────────
  const cartItems = Object.values(cart || {});

  function handleBackClick() {
    // Se PIX já expirou ou não foi gerado ainda, volta direto
    if (expired || !ready) { stopAll(); clearPending(); onBack(); return; }
    setShowBackConfirm(true);
  }

  function handleCancelPix() {
    stopAll();
    clearPending();
    setShowBackConfirm(false);
    onBack();
  }

  return (
    <div className={'screen' + (active ? ' active' : '')}>

      {/* ── Popup confirmação de voltar ── */}
      {showBackConfirm && (
        <div className="pix-back-overlay">
          <div className="pix-back-popup">
            <div className="pix-back-popup-icon">⚠️</div>
            <h3 className="pix-back-popup-title">Cancelar pagamento?</h3>
            <p className="pix-back-popup-text">
              Existe um PIX gerado de <strong>{fmtPrice(amount)}</strong>.<br/>
              Ao voltar, o código será cancelado e você poderá adicionar mais itens ou escolher outro método.
            </p>
            <button className="pix-back-popup-cancel" onClick={handleCancelPix}>
              Sim, cancelar e voltar ao carrinho
            </button>
            <button className="pix-back-popup-keep" onClick={() => setShowBackConfirm(false)}>
              Continuar no PIX
            </button>
          </div>
        </div>
      )}

      <div className="pix-header">
        <button className="screen-back-btn" onClick={handleBackClick}>
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

        {/* QR Code */}
        <div className="pix-qr-wrap">
          {qrCode ? (
            <>
              <img src={qrCode} alt="QR Code PIX" className="pix-qr-img" />
              <p className="pix-qr-hint">Aponte a câmera do celular para o QR Code</p>
            </>
          ) : (
            <div className="pix-qr-placeholder">
              <div className="pix-qr-spinner" />
            </div>
          )}
        </div>

        <div className="pix-code-section">
          <p className="pix-code-label">Ou pague com <strong>Pix copia e cola</strong>:</p>
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

        {/* ── Resumo do pedido ── */}
        {cartItems.length > 0 && (
          <div className="pix-summary">
            <div className="pix-summary-header">🧾 Resumo do pedido</div>
            <div className="pix-summary-body">
              {cartItems.map(({ item, qty }) => (
                <div key={item.id} className="pix-summary-row">
                  <span className="pix-summary-qty">{qty}x</span>
                  <span className="pix-summary-name">{item.name}</span>
                  <span className="pix-summary-price">{fmtPrice(item.price * qty)}</span>
                </div>
              ))}
              <div className="pix-summary-total">
                <span>Total</span>
                <span>{fmtPrice(amount)}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
