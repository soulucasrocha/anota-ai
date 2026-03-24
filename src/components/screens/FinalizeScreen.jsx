import { fmtPrice } from '../../utils/helpers'

export default function FinalizeScreen({ active, address, onAddressChange, getCartTotal, onBack, onAdvance }) {
  const total = getCartTotal();
  const hasAddress = address.trim().length > 0;

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
          <h4 className="finalize-section-title">Endereço de entrega</h4>
          <input
            className="checkout-input"
            placeholder="Rua, número, bairro"
            autoComplete="street-address"
            value={address}
            onChange={e => onAddressChange(e.target.value)}
          />
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
