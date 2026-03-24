import { useEffect, useRef, useState } from 'react'

export default function BottomNav({ cartCount, onHome, onOrders, onCart }) {
  const [activeBtn, setActiveBtn] = useState('inicio');
  const [pulse, setPulse] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (cartCount > prevCountRef.current) {
      setPulse(true);
      setTimeout(() => setPulse(false), 300);
    }
    prevCountRef.current = cartCount;
  }, [cartCount]);

  return (
    <nav className="bottom-nav">
      <button
        className={'nav-btn' + (activeBtn === 'inicio' ? ' active' : '')}
        onClick={() => { onHome(); setActiveBtn('inicio'); }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        <span>Início</span>
      </button>
      <button
        className={'nav-btn' + (activeBtn === 'pedidos' ? ' active' : '')}
        onClick={() => { onOrders(); setActiveBtn('pedidos'); }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>
        <span>Pedidos</span>
      </button>
      <button
        className={'nav-btn' + (activeBtn === 'carrinho' ? ' active' : '')}
        onClick={() => { onCart(); setActiveBtn('carrinho'); }}
      >
        <div className="cart-wrap">
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M17 18c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.9 18 9 18h12v-2H9.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 23.45 5H5.21l-.94-2H1zm8 16c-1.1 0-1.99.9-1.99 2S7.9 22 9 22s2-.9 2-2-.9-2-2-2z"/></svg>
          <span className={'cart-badge' + (cartCount > 0 ? ' visible' : '') + (pulse ? ' pulse' : '')}>
            {cartCount}
          </span>
        </div>
        <span>Carrinho</span>
      </button>
    </nav>
  );
}
