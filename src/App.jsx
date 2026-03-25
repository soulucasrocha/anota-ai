import { useState, useCallback, useEffect, useRef } from 'react'
import { persistUtms } from './utils/utmify'
import { getUserGeo } from './utils/geo'
import Header from './components/Header'
import StoreInfoBar from './components/StoreInfoBar'
import CategoryNav from './components/CategoryNav'
import MenuMain from './components/MenuMain'
import BottomNav from './components/BottomNav'
import SearchOverlay from './components/SearchOverlay'
import CartScreen from './components/screens/CartScreen'
import CheckoutScreen from './components/screens/CheckoutScreen'
import FinalizeScreen from './components/screens/FinalizeScreen'
import PixScreen from './components/screens/PixScreen'
import ProductModal from './components/modals/ProductModal'
import CheckoutConfirmPopup from './components/modals/CheckoutConfirmPopup'
import CartBar from './components/CartBar'
import DeliveryBanner from './components/DeliveryBanner'

export default function App() {
  useEffect(() => { persistUtms(); }, []);

  const [screen, setScreen]       = useState(null);
  const [cart, setCart]           = useState({});
  const lastAddedKeyRef           = useRef(null);
  const [toast, setToast]         = useState(null);
  const toastTimerRef             = useRef(null);
  const [productModalItem, setProductModalItem] = useState(null);
  const [searchOpen, setSearchOpen]             = useState(false);
  const [checkoutName, setCheckoutName]         = useState('');
  const [checkoutPhone, setCheckoutPhone]       = useState('');
  const [confirmOpen, setConfirmOpen]           = useState(false);
  const [address, setAddress]                   = useState('');
  const [geoData, setGeoData]                   = useState(null);
  const [dynamicMenu, setDynamicMenu]           = useState(null);

  // ── Dynamic menu (from admin blob) ────────────────────────────────────────
  useEffect(() => {
    fetch('/api/menu-public')
      .then(r => r.json())
      .then(d => { if (d.menu) setDynamicMenu(d.menu); })
      .catch(() => {}); // silently fall back to static menu
  }, []);

  // ── Geolocation ───────────────────────────────────────────────────────────
  useEffect(() => {
    getUserGeo()
      .then(geo => {
        setGeoData(geo);
        setAddress(prev => prev || geo.shortAddress); // pré-preenche só se vazio
      })
      .catch(() => {}); // permissão negada — silencioso
  }, []);

  // ── Cart helpers ──────────────────────────────────────────────────────────

  const getCartTotal = useCallback(() =>
    Object.values(cart).reduce((s, { item, qty }) => s + item.price * qty, 0), [cart]);

  const getCartCount = useCallback(() =>
    Object.values(cart).reduce((s, { qty }) => s + qty, 0), [cart]);

  const addToCart = useCallback((item) => {
    setCart(prev => {
      const entry = prev[item.id];
      return entry
        ? { ...prev, [item.id]: { ...entry, qty: entry.qty + 1 } }
        : { ...prev, [item.id]: { item, qty: 1 } };
    });
  }, []);

  const addConfiguredToCart = useCallback((item, note, price) => {
    const key = item.id + '_' + Date.now();
    const newItem = { ...item, id: key, cartNote: note, price };
    setCart(prev => ({ ...prev, [key]: { item: newItem, qty: 1 } }));
    lastAddedKeyRef.current = key;
    return key;
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart(prev => {
      const entry = prev[id];
      if (!entry) return prev;
      if (entry.qty > 1) return { ...prev, [id]: { ...entry, qty: entry.qty - 1 } };
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const incCartItem = useCallback((id) => {
    setCart(prev => {
      const entry = prev[id];
      if (!entry) return prev;
      return { ...prev, [id]: { ...entry, qty: entry.qty + 1 } };
    });
  }, []);

  const clearCart = useCallback(() => setCart({}), []);

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 1800);
  }, []);

  // ── Item click ────────────────────────────────────────────────────────────

  const handleItemClick = useCallback((item) => {
    if (item.soldOut) return;
    if (item.steps) {
      setProductModalItem(item);
    } else {
      addToCart(item);
      showToast('Adicionado ao carrinho ✅');
    }
  }, [addToCart, showToast]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Header onSearchOpen={() => setSearchOpen(true)} showToast={showToast} />
      <StoreInfoBar />
      <CategoryNav />
      <DeliveryBanner geoData={geoData} />
      <MenuMain onItemClick={handleItemClick} menu={dynamicMenu} />

      <CartBar
        cartCount={getCartCount()}
        cartTotal={getCartTotal()}
        visible={screen === null && getCartCount() > 0}
        onClick={() => setScreen('cart')}
      />

      <BottomNav
        cartCount={getCartCount()}
        onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onOrders={() => showToast('🧾 Sem pedidos anteriores')}
        onCart={() => setScreen('cart')}
      />

      <CartScreen
        active={screen === 'cart'}
        cart={cart}
        getCartTotal={getCartTotal}
        getCartCount={getCartCount}
        onBack={() => setScreen(null)}
        onClear={() => { clearCart(); setScreen(null); showToast('Carrinho limpo 🗑️'); }}
        onAdvance={() => setScreen('checkout')}
        onInc={incCartItem}
        onDec={removeFromCart}
      />

      <CheckoutScreen
        active={screen === 'checkout'}
        name={checkoutName}
        phone={checkoutPhone}
        onNameChange={setCheckoutName}
        onPhoneChange={setCheckoutPhone}
        onBack={() => setScreen('cart')}
        onAdvance={() => setConfirmOpen(true)}
      />

      <CheckoutConfirmPopup
        open={confirmOpen}
        name={checkoutName}
        phone={checkoutPhone}
        onEdit={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); setScreen('finalize'); }}
      />

      <FinalizeScreen
        active={screen === 'finalize'}
        address={address}
        onAddressChange={setAddress}
        getCartTotal={getCartTotal}
        onBack={() => setScreen('checkout')}
        onAdvance={() => setScreen('pix')}
        geoData={geoData}
      />

      <PixScreen
        active={screen === 'pix'}
        amount={getCartTotal()}
        cart={cart}
        customer={{ name: checkoutName, phone: checkoutPhone }}
        deliveryAddress={address}
        onBack={() => setScreen('finalize')}
        onPaid={() => { clearCart(); setScreen(null); }}
        showToast={showToast}
      />

      <ProductModal
        item={productModalItem}
        onClose={() => setProductModalItem(null)}
        onAddToCart={addConfiguredToCart}
        onInc={incCartItem}
        onDec={removeFromCart}
        getCartEntry={(key) => cart[key]}
        onAdvanceToCart={() => { setProductModalItem(null); setScreen('cart'); }}
        lastAddedKeyRef={lastAddedKeyRef}
      />

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onItemClick={(item) => { setSearchOpen(false); handleItemClick(item); }}
      />

      {toast && (
        <div style={{
          position: 'fixed', bottom: getCartCount() > 0 && screen === null ? '132px' : '72px', left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', color: '#fff', padding: '10px 18px', borderRadius: '24px',
          fontSize: '14px', fontWeight: '600', zIndex: 500,
          pointerEvents: 'none', whiteSpace: 'nowrap', maxWidth: 'calc(100vw - 40px)',
        }}>
          {toast}
        </div>
      )}
    </>
  );
}
