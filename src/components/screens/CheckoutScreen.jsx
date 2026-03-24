export default function CheckoutScreen({ active, name, phone, onNameChange, onPhoneChange, onBack, onAdvance }) {
  const valid = name.trim().length >= 1 && phone.replace(/\D/g, '').length >= 10;

  return (
    <div className={'screen' + (active ? ' active' : '')}>
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Carrinho
        </button>
        <h2 className="screen-title">Identificação</h2>
        <div style={{ width: 80 }} />
      </div>

      <div className="screen-body checkout-form-body">
        <p className="checkout-intro">Para finalizar, preencha seus dados:</p>
        <div className="checkout-field">
          <label className="checkout-label">Seu nome</label>
          <input
            className="checkout-input"
            placeholder="Ex: João"
            autoComplete="given-name"
            value={name}
            onChange={e => onNameChange(e.target.value)}
          />
        </div>
        <div className="checkout-field">
          <label className="checkout-label">WhatsApp</label>
          <input
            className="checkout-input"
            type="tel"
            placeholder="Ex: 11999999999"
            autoComplete="tel"
            inputMode="numeric"
            value={phone}
            onChange={e => onPhoneChange(e.target.value)}
          />
        </div>
      </div>

      <div className="screen-footer">
        <button className="screen-advance-btn" disabled={!valid} onClick={valid ? onAdvance : undefined}>
          Avançar
        </button>
      </div>
    </div>
  );
}
