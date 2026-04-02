import { useState, useEffect, useRef, useCallback } from 'react'
import { fmtPrice } from '../../utils/helpers'
import { searchAddress } from '../../utils/geo'

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

const PM_INFO = {
  pix_online:    { icon: '⚡', label: 'PIX Online',       desc: 'Pagamento instantâneo', online: true },
  card_online:   { icon: '💳', label: 'Cartão Online',    desc: 'Crédito/débito online', online: true },
  card_delivery: { icon: '💳', label: 'Cartão na Entrega',desc: 'Pague ao receber',      online: false },
  pix_delivery:  { icon: '📱', label: 'PIX na Entrega',   desc: 'Pague ao receber',      online: false },
  cash:          { icon: '💵', label: 'Dinheiro',         desc: 'Dinheiro ao receber',   online: false },
};

export default function FinalizeScreen({ active, address, onAddressChange, getCartTotal, onBack, onAdvance, geoData, slug, paymentMethodsData, defaultPaymentData }) {
  const total      = getCartTotal();
  const hasAddress = address.trim().length > 0;

  const [suggestions, setSuggestions] = useState([]);
  const [showSugg,    setShowSugg]    = useState(false);
  const [searching,   setSearching]   = useState(false);
  const [payMethods,  setPayMethods]  = useState({});
  const [selectedPay, setSelectedPay] = useState(null);
  const [changeFor,   setChangeFor]   = useState('');
  const debouncedAddress = useDebounce(address, 500);
  const inputRef = useRef(null);

  // Apply payment methods from App.jsx props (already fetched on load)
  useEffect(() => {
    if (!paymentMethodsData) return;
    setPayMethods(paymentMethodsData);
    const def = defaultPaymentData;
    if (def && paymentMethodsData[def]) {
      setSelectedPay(def);
    } else {
      const first = Object.keys(PM_INFO).find(k => paymentMethodsData[k]);
      setSelectedPay(first || null);
    }
  }, [paymentMethodsData, defaultPaymentData]);

  // Fallback fetch if props not available (e.g. direct URL access)
  useEffect(() => {
    if (!active || paymentMethodsData) return;
    fetch(`/api/menu-public${slug ? `?slug=${slug}` : ''}`)
      .then(r => r.json())
      .then(d => {
        if (d.paymentMethods) {
          setPayMethods(d.paymentMethods);
          const def = d.defaultPayment;
          if (def && d.paymentMethods[def]) {
            setSelectedPay(def);
          } else {
            const first = Object.keys(PM_INFO).find(k => d.paymentMethods[k]);
            setSelectedPay(first || null);
          }
        }
      })
      .catch(() => {});
  }, [active, slug, paymentMethodsData]);

  // Autocomplete
  useEffect(() => {
    if (!active) return;
    if (debouncedAddress.length < 4) { setSuggestions([]); return; }
    let cancelled = false;
    setSearching(true);
    searchAddress(debouncedAddress).then(res => {
      if (!cancelled) { setSuggestions(res); setSearching(false); }
    });
    return () => { cancelled = true; };
  }, [debouncedAddress, active]);

  // Pré-preenche quando geoData chegar e campo ainda vazio
  useEffect(() => {
    if (geoData?.shortAddress && !address) {
      onAddressChange(geoData.shortAddress);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoData]);

  const pickSuggestion = useCallback((label) => {
    onAddressChange(label);
    setSuggestions([]);
    setShowSugg(false);
    inputRef.current?.blur();
  }, [onAddressChange]);

  const hasEnabledPay = Object.keys(PM_INFO).some(k => payMethods[k]);
  const isPayDisabled = !selectedPay || !payMethods[selectedPay];

  const btnLabel = () => {
    if (!hasAddress) return 'Informe o endereço';
    if (!hasEnabledPay) return 'Sem forma de pagamento';
    const info = PM_INFO[selectedPay];
    if (info?.online) return `Ir para pagamento • ${fmtPrice(total)}`;
    return `Confirmar pedido • ${fmtPrice(total)}`;
  };

  return (
    <div className={'screen' + (active ? ' active' : '')}>
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Identificação
        </button>
        <h2 className="screen-title">Finalizar Pedido</h2>
        <div style={{ width: 100 }} />
      </div>

      <div className="screen-body">
        {/* Endereço */}
        <div className="finalize-section">
          <h4 className="finalize-section-title">
            Endereço de entrega
            {geoData && <span className="finalize-geo-badge">📍 3km de você</span>}
          </h4>
          <div className="address-autocomplete-wrap">
            <input
              ref={inputRef}
              className="checkout-input"
              placeholder="Rua, número, bairro"
              autoComplete="off"
              value={address}
              onChange={e => { onAddressChange(e.target.value); setShowSugg(true); }}
              onFocus={() => setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 150)}
            />
            {searching && <span className="address-searching">🔍</span>}
            {showSugg && suggestions.length > 0 && (
              <ul className="address-suggestions">
                {suggestions.map((s, i) => (
                  <li key={i} className="address-suggestion-item" onMouseDown={() => pickSuggestion(s)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" style={{flexShrink:0,color:'#e8001d'}}>
                      <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {geoData?.shortAddress && address === geoData.shortAddress && (
            <p className="finalize-geo-hint">📍 Endereço detectado automaticamente</p>
          )}
        </div>

        {/* Forma de pagamento */}
        <div className="finalize-section">
          <h4 className="finalize-section-title">Forma de pagamento</h4>
          {Object.keys(PM_INFO).filter(key => !!payMethods[key]).map(key => {
            const info = PM_INFO[key];
            const sel = selectedPay === key;
            return (
              <div
                key={key}
                className={'pay-option' + (sel ? ' selected' : '')}
                onClick={() => setSelectedPay(key)}
                style={{ cursor: 'pointer' }}
              >
                <div className="pay-option-icon">{info.icon}</div>
                <div className="pay-option-info">
                  <span className="pay-option-name">{info.label}</span>
                  <span className="pay-option-desc">{info.desc}</span>
                </div>
                {sel && <span className="pay-badge">Selecionado</span>}
              </div>
            );
          })}
          {/* Cash change field */}
          {selectedPay === 'cash' && (
            <div className="cash-change-box">
              <label className="cash-change-label">💵 Troco para quanto? <span style={{color:'#aaa',fontWeight:400}}>(opcional)</span></label>
              <input
                type="number"
                className="checkout-input"
                placeholder="Ex: 100"
                value={changeFor}
                onChange={e => setChangeFor(e.target.value)}
                style={{ marginTop: 8 }}
              />
              {changeFor && Number(changeFor) > 0 && (
                <p className="cash-change-info">
                  {Number(changeFor) * 100 > total
                    ? `Troco: ${fmtPrice(Number(changeFor) * 100 - total)}`
                    : '✅ Sem troco necessário'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Informações de entrega */}
        <div className="finalize-section finalize-delivery-info">
          <p className="finalize-delivery-text">
            Nossas entregas são terceirizadas, as entregas são feitas pela
          </p>
          <div className="finalize-delivery-logos">
            <span className="finalize-delivery-partner">
              <img
                src="https://logodownload.org/wp-content/uploads/2017/05/ifood-logo.png"
                alt="iFood"
                className="finalize-partner-logo"
                onError={e => { e.target.style.display='none'; }}
              />
              iFood
            </span>
            <span className="finalize-delivery-or">ou pela</span>
            <span className="finalize-delivery-partner">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/99_Logo.svg/512px-99_Logo.svg.png"
                alt="99food"
                className="finalize-partner-logo finalize-partner-logo-99"
                onError={e => { e.target.style.display='none'; }}
              />
              99food
            </span>
          </div>
        </div>
      </div>

      <div className="screen-footer">
        <button
          className="screen-advance-btn"
          disabled={!hasAddress || isPayDisabled}
          onClick={() => hasAddress && !isPayDisabled && onAdvance(selectedPay, changeFor ? Number(changeFor) : null)}
        >
          {btnLabel()}
        </button>
      </div>
    </div>
  );
}
