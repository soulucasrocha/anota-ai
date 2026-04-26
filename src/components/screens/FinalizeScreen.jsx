import { useState, useEffect, useRef, useCallback } from 'react'
import { fmtPrice } from '../../utils/helpers'
import { searchAddress, getUserGeo } from '../../utils/geo'
import { geocodeAddress, findZone } from '../../utils/deliveryZone'

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

export default function FinalizeScreen({
  active, address, onAddressChange, getCartTotal, onBack, onAdvance,
  geoData, slug, paymentMethodsData, defaultPaymentData,
  deliveryZones, deliveryAddress, deliveryDefaultFee, deliveryDefaultDriverFee,
  storeLatLng, onDeliveryFeeChange,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg,    setShowSugg]    = useState(false);
  const [searching,   setSearching]   = useState(false);
  const [payMethods,  setPayMethods]  = useState({});
  const [selectedPay, setSelectedPay] = useState(null);
  const [changeFor,   setChangeFor]   = useState('');
  const [addrNumber,  setAddrNumber]  = useState('');
  const [city,        setCity]        = useState('');
  const [gpsLoading,  setGpsLoading]  = useState(false);

  // Delivery zone state
  const [zoneChecking, setZoneChecking]   = useState(false);
  const [matchedZone,  setMatchedZone]    = useState(null);
  const [outsideArea,  setOutsideArea]    = useState(false);
  const [geoFailed,    setGeoFailed]      = useState(false);
  // storePos como [lat, lng] — usa coordenadas salvas ou geocodifica o endereço
  const [storePos, setStorePos] = useState(() => storeLatLng || null);
  useEffect(() => { if (storeLatLng) setStorePos(storeLatLng); }, [storeLatLng]);

  const DEFAULT_FEE        = deliveryDefaultFee       ?? 500;
  const DEFAULT_DRIVER_FEE = deliveryDefaultDriverFee ?? 0;

  const debouncedAddress = useDebounce(address, 800);
  const debouncedCity    = useDebounce(city, 800);
  const inputRef = useRef(null);

  const zonesConfigured = Array.isArray(deliveryZones) && deliveryZones.length > 0;

  // Payment methods
  useEffect(() => {
    if (!paymentMethodsData) return;
    setPayMethods(paymentMethodsData);
    const def = defaultPaymentData;
    if (def && paymentMethodsData[def]) setSelectedPay(def);
    else setSelectedPay(Object.keys(PM_INFO).find(k => paymentMethodsData[k]) || null);
  }, [paymentMethodsData, defaultPaymentData]);

  useEffect(() => {
    if (!active || paymentMethodsData) return;
    fetch(`/api/menu-public${slug ? `?slug=${slug}` : ''}`)
      .then(r => r.json())
      .then(d => {
        if (!d.paymentMethods) return;
        setPayMethods(d.paymentMethods);
        const def = d.defaultPayment;
        if (def && d.paymentMethods[def]) setSelectedPay(def);
        else setSelectedPay(Object.keys(PM_INFO).find(k => d.paymentMethods[k]) || null);
      })
      .catch(() => {});
  }, [active, slug, paymentMethodsData]);

  // Geocode store address once
  useEffect(() => {
    if (!deliveryAddress || storePos) return;
    geocodeAddress(deliveryAddress).then(pos => { if (pos) setStorePos(pos); });
  }, [deliveryAddress, storePos]);

  // Autocomplete suggestions
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

  // Pre-fill from geolocation (initial auto-detect on page load)
  useEffect(() => {
    if (!geoData) return;
    if (geoData.shortAddress && !address) onAddressChange(geoData.shortAddress);
    if (geoData.houseNumber && !addrNumber) setAddrNumber(geoData.houseNumber);
    if (geoData.city && !city) setCity(geoData.city);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoData]);

  // GPS button — request fresh location and fill all fields
  const handleGps = useCallback(async () => {
    setGpsLoading(true);
    try {
      const geo = await getUserGeo();
      if (geo.shortAddress) onAddressChange(geo.shortAddress);
      if (geo.houseNumber)  setAddrNumber(geo.houseNumber);
      if (geo.city)         setCity(geo.city);
    } catch {
      // permission denied or timeout — silently ignore
    }
    setGpsLoading(false);
  }, [onAddressChange]);

  // Check delivery zone when address or city changes
  useEffect(() => {
    // Monta endereço completo (rua + cidade) para geocodificação mais precisa
    const fullAddr = [debouncedAddress, debouncedCity].filter(Boolean).join(', ');
    if (!active || !zonesConfigured || fullAddr.length < 6) {
      setMatchedZone(null); setOutsideArea(false); setGeoFailed(false);
      onDeliveryFeeChange?.(0);
      return;
    }
    let cancelled = false;
    setZoneChecking(true);
    geocodeAddress(fullAddr, storePos).then(async customerPos => {
      if (cancelled) return;
      if (!customerPos) {
        setMatchedZone(null); setOutsideArea(false); setGeoFailed(true);
        onDeliveryFeeChange?.(DEFAULT_FEE);
        setZoneChecking(false);
        return;
      }
      // storePos é opcional — findZone funciona sem ele para zonas polígono
      let sPos = storePos;
      if (!sPos && deliveryAddress) sPos = await geocodeAddress(deliveryAddress);
      if (cancelled) return;
      const zone = findZone(sPos, customerPos, deliveryZones);
      setMatchedZone(zone);
      setGeoFailed(false);
      setOutsideArea(!zone);
      onDeliveryFeeChange?.(zone?.fee ?? DEFAULT_FEE);
      setZoneChecking(false);
    }).catch(() => {
      if (!cancelled) {
        setMatchedZone(null); setOutsideArea(false); setGeoFailed(true);
        onDeliveryFeeChange?.(DEFAULT_FEE);
        setZoneChecking(false);
      }
    });
    return () => { cancelled = true; };
  }, [debouncedAddress, debouncedCity, active, zonesConfigured]);

  // pickSuggestion — handles object { label, street, houseNumber, city } from searchAddress
  const pickSuggestion = useCallback((s) => {
    const streetPart = typeof s === 'object' ? (s.street || s.label || '') : s;
    onAddressChange(streetPart);
    if (typeof s === 'object') {
      if (s.houseNumber) setAddrNumber(s.houseNumber);
      if (s.city)        setCity(s.city);
    }
    setSuggestions([]);
    setShowSugg(false);
    inputRef.current?.blur();
  }, [onAddressChange]);

  const hasAddress    = address.trim().length > 0;
  const hasNumber     = addrNumber.trim().length > 0;
  const hasCity       = city.trim().length > 0;
  const hasEnabledPay = Object.keys(PM_INFO).some(k => payMethods[k]);
  const isPayDisabled = !selectedPay || !payMethods[selectedPay];
  const canAdvance    = hasAddress && hasNumber && hasCity && !isPayDisabled;

  const deliveryFee      = matchedZone ? (matchedZone.fee       ?? 0) : (geoFailed || outsideArea ? DEFAULT_FEE        : 0);
  const driverCommission = matchedZone ? (matchedZone.driverFee ?? 0) : (geoFailed || outsideArea ? DEFAULT_DRIVER_FEE : DEFAULT_DRIVER_FEE);
  const total       = getCartTotal();
  const grandTotal  = total + deliveryFee;

  const btnLabel = () => {
    if (!hasAddress) return 'Informe o endereço';
    if (!hasNumber)  return 'Informe o número';
    if (!hasCity)    return 'Informe a cidade';
    if (!hasEnabledPay) return 'Sem forma de pagamento';
    const info = PM_INFO[selectedPay];
    if (info?.online) return `Ir para pagamento • ${fmtPrice(grandTotal)}`;
    return `Confirmar pedido • ${fmtPrice(grandTotal)}`;
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
            {geoData && <span className="finalize-geo-badge">📍 {geoData.km}km de você</span>}
          </h4>

          {/* GPS button */}
          <button
            onClick={handleGps}
            disabled={gpsLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: gpsLoading ? '#f3f4f6' : '#eff6ff',
              color: gpsLoading ? '#9ca3af' : '#1d4ed8',
              border: '1px solid ' + (gpsLoading ? '#e5e7eb' : '#bfdbfe'),
              borderRadius: 10, padding: '9px 14px',
              fontSize: 13, fontWeight: 700, cursor: gpsLoading ? 'default' : 'pointer',
              width: '100%', marginBottom: 10, transition: 'all .15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{gpsLoading ? '⏳' : '📍'}</span>
            {gpsLoading ? 'Localizando...' : 'Usar minha localização'}
          </button>

          <div className="address-autocomplete-wrap">
            <input
              ref={inputRef}
              className="checkout-input"
              placeholder="Rua e bairro *"
              autoComplete="off"
              value={address}
              onChange={e => { onAddressChange(e.target.value); setShowSugg(true); setMatchedZone(null); setOutsideArea(false); }}
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
                    {typeof s === 'object' ? s.label : s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              className="checkout-input"
              placeholder="Número *"
              style={{ flex: '0 0 120px' }}
              value={addrNumber}
              onChange={e => setAddrNumber(e.target.value)}
            />
            <input
              className="checkout-input"
              placeholder="Cidade *"
              style={{ flex: 1 }}
              value={city}
              onChange={e => setCity(e.target.value)}
            />
          </div>

          {/* Zone feedback */}
          {zonesConfigured && hasAddress && (
            <div style={{ marginTop: 10 }}>
              {zoneChecking ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 14 }}>🔍</span>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Verificando taxa de entrega...</span>
                </div>
              ) : matchedZone ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #86efac' }}>
                  <span style={{ fontSize: 16 }}>✅</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                      Entregamos aqui — {matchedZone.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: '#15803d' }}>
                      Taxa de entrega: <strong>{deliveryFee === 0 ? 'Grátis' : fmtPrice(deliveryFee)}</strong>
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Resumo de valores */}
        {deliveryFee > 0 && (
          <div className="finalize-section">
            <h4 className="finalize-section-title">Resumo</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
              <span>Subtotal</span><span>{fmtPrice(total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
              <span>Taxa de entrega {matchedZone?.name ? `(${matchedZone.name})` : '(padrão)'}</span>
              <span style={{ color: '#e53935', fontWeight: 600 }}>+ {fmtPrice(deliveryFee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#1e2740', borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
              <span>Total</span><span>{fmtPrice(grandTotal)}</span>
            </div>
          </div>
        )}

        {/* Forma de pagamento */}
        <div className="finalize-section">
          <h4 className="finalize-section-title">Forma de pagamento</h4>
          {Object.keys(PM_INFO).filter(key => !!payMethods[key]).map(key => {
            const info = PM_INFO[key];
            const sel = selectedPay === key;
            return (
              <div key={key} className={'pay-option' + (sel ? ' selected' : '')} onClick={() => setSelectedPay(key)} style={{ cursor: 'pointer' }}>
                <div className="pay-option-icon">{info.icon}</div>
                <div className="pay-option-info">
                  <span className="pay-option-name">{info.label}</span>
                  <span className="pay-option-desc">{info.desc}</span>
                </div>
                {sel && <span className="pay-badge">Selecionado</span>}
              </div>
            );
          })}
          {selectedPay === 'cash' && (
            <div className="cash-change-box">
              <label className="cash-change-label">💵 Troco para quanto? <span style={{color:'#aaa',fontWeight:400}}>(opcional)</span></label>
              <input type="number" className="checkout-input" placeholder="Ex: 100"
                value={changeFor} onChange={e => setChangeFor(e.target.value)} style={{ marginTop: 8 }} />
              {changeFor && Number(changeFor) > 0 && (
                <p className="cash-change-info">
                  {Number(changeFor) * 100 > grandTotal
                    ? `Troco: ${fmtPrice(Number(changeFor) * 100 - grandTotal)}`
                    : '✅ Sem troco necessário'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="screen-footer">
        <button
          className="screen-advance-btn"
          disabled={!canAdvance}
          onClick={() => canAdvance && onAdvance(selectedPay, changeFor ? Number(changeFor) : null, addrNumber.trim(), city.trim(), driverCommission)}
        >
          {btnLabel()}
        </button>
      </div>
    </div>
  );
}
