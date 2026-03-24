import { useEffect, useRef } from 'react';

function fmtPrice(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CartBar({ cartCount, cartTotal, visible, onClick }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (visible) {
      el.classList.add('cart-bar--visible');
    } else {
      el.classList.remove('cart-bar--visible');
    }
  }, [visible]);

  return (
    <div className="cart-bar" ref={ref} onClick={onClick} role="button" aria-label="Ver carrinho">
      <span className="cart-bar__count">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</span>
      <span className="cart-bar__label">Ver carrinho</span>
      <span className="cart-bar__total">{fmtPrice(cartTotal)}</span>
    </div>
  );
}
