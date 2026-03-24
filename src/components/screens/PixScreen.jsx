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

export default function PixScreen({ active, amount, customer, onBack, onPaid, showToast }) {
  const [pixKey, setPixKey]       = useState('Gerando PIX...');
  const [ready, setReady]         = useState(false);
  const [copyState, setCopyState] = useState('idle');
  const [countdown, setCountdown] = useState(TOTAL_SECS);
  const [expired, setExpired]     = useState(false);
  const [paid, setPaid]           = useState(false);
  const [redirectCount, setRedirectCount] = useState(3);

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
      setRedirectCount(3);
      startCountdown();
      createPix();
    } else {
      stopAll();
    }
    return stopAll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!paid) return;
    const t = setInterval(() => {
      setRedirectCount(c => {
        if (c <= 1) {
          clearInterval(t);
          window.location.href = 'https://recusa-4-90.vercel.app/';
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [paid]);

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
    return (
      <div className={'screen' + (active ? ' active' : '')}>
        <div className="pix-screen-body" style={{ justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '52px 20px 44px' }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: '#27ae60', fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Pedido Confirmado!</h2>
            <p style={{ color: '#888', fontSize: 14, lineHeight: 1.8 }}>
              Pagamento recebido com sucesso!<br />
              🍕 Sua pizza já está sendo preparada.<br />
              Redirecionando em <strong style={{ color: '#27ae60' }}>{redirectCount}</strong>s...
            </p>
          </div>
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
