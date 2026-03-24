import { fmtPrice } from '../../utils/helpers'

export default function CartScreen({ active, cart, getCartTotal, getCartCount, onBack, onClear, onAdvance, onInc, onDec }) {
  const count = getCartCount();
  const total = getCartTotal();

  return (
    <div className={'screen' + (active ? ' active' : '')}>
      <div className="screen-header">
        <button className="screen-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Cardápio
        </button>
        <h2 className="screen-title">Meu Pedido</h2>
        <button className="screen-clear-btn" onClick={onClear}>Limpar</button>
      </div>

      <div className="screen-body">
        {count === 0 ? (
          <p className="cart-screen-empty">Seu carrinho está vazio 🛒</p>
        ) : (
          <>
            {Object.entries(cart).map(([key, { item, qty }]) => (
              <div key={key} className="cart-screen-item">
                <div className="cart-screen-img">
                  {item.img
                    ? <img src={item.img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span>{item.emoji || '🍕'}</span>}
                </div>
                <div className="cart-screen-info">
                  <div className="cart-screen-name">{item.name}</div>
                  {item.cartNote && <div className="cart-screen-note">{item.cartNote}</div>}
                  <div className="cart-screen-price">{fmtPrice(item.price * qty)}</div>
                </div>
                <div className="cart-screen-qty">
                  <button className="cart-screen-qty-btn" onClick={() => onDec(key)}>−</button>
                  <span className="cart-screen-qty-num">{qty}</span>
                  <button className="cart-screen-qty-btn" onClick={() => onInc(key)}>+</button>
                </div>
              </div>
            ))}
            <div className="cart-screen-total-row">
              <span>Total</span>
              <span className="cart-screen-total">{fmtPrice(total)}</span>
            </div>
          </>
        )}
      </div>

      <div className="screen-footer">
        <button
          className="screen-advance-btn"
          disabled={count === 0}
          onClick={onAdvance}
        >
          {count > 0 ? `Avançar • ${fmtPrice(total)}` : 'Avançar'}
        </button>
      </div>
    </div>
  );
}
