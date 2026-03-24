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

export default function FinalizeScreen({ active, address, onAddressChange, getCartTotal, onBack, onAdvance, geoData }) {
  const total      = getCartTotal();
  const hasAddress = address.trim().length > 0;

  const [suggestions, setSuggestions] = useState([]);
  const [showSugg,    setShowSugg]    = useState(false);
  const [searching,   setSearching]   = useState(false);
  const debouncedAddress = useDebounce(address, 500);
  const inputRef = useRef(null);

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
        <div className="finalize-section">
          <h4 className="finalize-section-title">
            Endereço de entrega
            {geoData && (
              <span className="finalize-geo-badge">
                📍 3km de você
              </span>
            )}
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

        <div className="finalize-section">
          <h4 className="finalize-section-title">Forma de pagamento</h4>
          <div className="pay-option selected">
            <div className="pay-option-icon">💳</div>
            <div className="pay-option-info">
              <span className="pay-option-name">PIX</span>
              <span className="pay-option-desc">Pagamento online instantâneo</span>
            </div>
            <span className="pay-badge">Selecionado</span>
          </div>
          <div className="pay-option pay-option-disabled">
            <div className="pay-option-icon">💵</div>
            <div className="pay-option-info">
              <span className="pay-option-name">Pagar na entrega</span>
              <span className="pay-option-desc">Dinheiro ou cartão</span>
            </div>
            <span className="pay-blocked">Indisponível</span>
          </div>
        </div>
      </div>

      <div className="screen-footer">
        <button
          className="screen-advance-btn"
          disabled={!hasAddress}
          onClick={hasAddress ? onAdvance : undefined}
        >
          {hasAddress ? `Ir para pagamento • ${fmtPrice(total)}` : 'Ir para pagamento'}
        </button>
      </div>
    </div>
  );
}
