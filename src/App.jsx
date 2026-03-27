import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
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
import DeliveryWaitingScreen from './components/screens/DeliveryWaitingScreen'
import ProductModal from './components/modals/ProductModal'
import CheckoutConfirmPopup from './components/modals/CheckoutConfirmPopup'
import CartBar from './components/CartBar'
import DeliveryBanner from './components/DeliveryBanner'

// ── Persistência de sessão ─────────────────────────────────────────────────
const SESSION_KEY = 'app_session_v2';

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (Date.now() > (d.expiry || 0)) { localStorage.removeItem(SESSION_KEY); return null; }
    return d;
  } catch { return null; }
}

function saveSession(data) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ...data,
      expiry: Date.now() + 24 * 60 * 60 * 1000,
    }));
  } catch {}
}

export default function App() {
  const { slug } = useParams();
  useEffect(() => { persistUtms(); }, []);

  // Carrega sessão salva para restaurar estado após refresh
  const _s = loadSession();

  const [screen, setScreenRaw]    = useState(() => {
    // 0. URL param ?d=<orderId> — delivery order tracking link
    try {
      const dId = new URLSearchParams(window.location.search).get('d');
      if (dId) {
        // Save delivery order for tracking
        const existing = localStorage.getItem('delivery_order_v1');
        if (!existing) {
          localStorage.setItem('delivery_order_v1', JSON.stringify({ orderId: dId, expiry: Date.now() + 86400000 }));
        }
        try { window.history.replaceState({}, '', window.location.pathname); } catch {}
        return 'delivery-waiting';
      }
    } catch {}
    // 1. Delivery order tracking in localStorage
    try {
      const raw = localStorage.getItem('delivery_order_v1');
      if (raw) { const d = JSON.parse(raw); if (Date.now() < d.expiry) return 'delivery-waiting'; }
    } catch {}
    // 2. URL param ?t=<pixId> — link de rastreamento compartilhável
    try {
      const tId = new URLSearchParams(window.location.search).get('t');
      if (tId) {
        // Injeta rastreamento mínimo para o PixScreen restaurar a tela de tracking
        const existing = localStorage.getItem('pix_tracking_v1');
        if (!existing) {
          localStorage.setItem('pix_tracking_v1', JSON.stringify({
            pixId: tId,
            expiry: Date.now() + 86400000,
          }));
        }
        // Limpa o param da URL sem reload
        try { window.history.replaceState({}, '', window.location.pathname); } catch {}
        return 'pix';
      }
    } catch {}
    // 3. PIX tracking salvo (pós-pagamento) tem prioridade
    try {
      const raw = localStorage.getItem('pix_tracking_v1');
      if (raw) { const d = JSON.parse(raw); if (Date.now() < d.expiry) return 'pix'; }
    } catch {}
    return _s?.screen || null;
  });
  const [cart, setCart]           = useState(() => _s?.cart || {});
  const lastAddedKeyRef           = useRef(null);
  const [toast, setToast]         = useState(null);
  const toastTimerRef             = useRef(null);
  const [productModalItem, setProductModalItem] = useState(null);
  const [searchOpen, setSearchOpen]             = useState(false);
  const [checkoutName, setCheckoutName]         = useState(() => _s?.checkoutName || '');
  const [checkoutPhone, setCheckoutPhone]       = useState(() => _s?.checkoutPhone || '');
  const [confirmOpen, setConfirmOpen]           = useState(false);
  const [address, setAddress]                   = useState(() => _s?.address || '');
  const [geoData, setGeoData]                   = useState(null);
  const [dynamicMenu, setDynamicMenu]           = useState(null);
  const [storeId, setStoreId]                   = useState(null);
  const [storeName, setStoreName]               = useState('');
  const [storeLogoUrl, setStoreLogoUrl]         = useState('');
  const [storeWhatsapp, setStoreWhatsapp]       = useState('');
  const [paymentMethod, setPaymentMethod]       = useState(() => _s?.paymentMethod || 'pix_online');
  const [deliveryOrderId, setDeliveryOrderId]   = useState(() => _s?.deliveryOrderId || null);
  const [deliveryChangeNote, setDeliveryChangeNote] = useState(() => _s?.deliveryChangeNote || null);

  // Wrapper de setScreen que salva na sessão
  const setScreen = useCallback((s) => {
    setScreenRaw(s);
  }, []);

  // Salva sessão sempre que estado relevante muda
  useEffect(() => {
    if (screen === 'pix') return; // PIX tem própria persistência
    saveSession({ screen, cart, checkoutName, checkoutPhone, address, paymentMethod, deliveryOrderId, deliveryChangeNote });
  }, [screen, cart, checkoutName, checkoutPhone, address, paymentMethod, deliveryOrderId, deliveryChangeNote]);

  // ── Dynamic menu (from admin blob) ────────────────────────────────────────
  useEffect(() => {
    const params = slug ? `?slug=${slug}` : '';
    fetch(`/api/menu-public${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.menu) setDynamicMenu(d.menu);
        if (d.storeId) setStoreId(d.storeId);
        if (d.storeName) setStoreName(d.storeName);
        if (d.storeLogoUrl) setStoreLogoUrl(d.storeLogoUrl);
        if (d.storeWhatsapp) setStoreWhatsapp(d.storeWhatsapp);
      })
      .catch(() => {}); // silently fall back to static menu
  }, [slug]);

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

  const clearCart = useCallback(() => {
    setCart({});
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }, []);

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

  // ── Delivery order handler ─────────────────────────────────────────────────

  const handleDeliveryOrder = useCallback(async (method, changeFor) => {
    const items = Object.values(cart).map(({ item, qty }) => ({ id: item.id, name: item.name, qty, price: item.price }));
    const orderId = `del-${Date.now()}`;
    const total = getCartTotal();
    // Build change note if cash payment
    const changeNote = (method === 'cash' && changeFor && changeFor * 100 > total)
      ? `Troco para R$${changeFor.toFixed(2).replace('.',',')} (R$${((changeFor * 100 - total) / 100).toFixed(2).replace('.',',')} de troco)`
      : null;
    try {
      await fetch('/api/order-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pixId: orderId,
          items,
          total,
          customer: { name: checkoutName, phone: checkoutPhone },
          address,
          paymentMethod: method,
          deliveryPayment: true,
          storeId: storeId || undefined,
          changeFor: changeFor || null,
          changeNote: changeNote || null,
        }),
      });
    } catch {}
    // Save to localStorage for persistence
    try {
      localStorage.setItem('delivery_order_v1', JSON.stringify({
        orderId,
        amount: total,
        paymentMethod: method,
        expiry: Date.now() + 86400000,
      }));
    } catch {}
    setDeliveryOrderId(orderId);
    setPaymentMethod(method);
    setDeliveryChangeNote(changeNote);
    setScreen('delivery-waiting');
  }, [cart, getCartTotal, checkoutName, checkoutPhone, address, setScreen]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Header onSearchOpen={() => setSearchOpen(true)} showToast={showToast} storeName={storeName} storeLogoUrl={storeLogoUrl} />
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
        onAdvance={(method, changeFor) => {
          setPaymentMethod(method);
          const isOnline = method === 'pix_online' || method === 'card_online';
          if (isOnline) {
            setScreen('pix');
          } else {
            handleDeliveryOrder(method, changeFor);
          }
        }}
        geoData={geoData}
        slug={slug}
      />

      <PixScreen
        active={screen === 'pix'}
        amount={getCartTotal()}
        cart={cart}
        customer={{ name: checkoutName, phone: checkoutPhone }}
        deliveryAddress={address}
        paymentMethod={paymentMethod}
        storeId={storeId}
        onBack={() => setScreen('cart')}
        onPaid={() => { clearCart(); setScreen(null); }}
        showToast={showToast}
      />

      <DeliveryWaitingScreen
        active={screen === 'delivery-waiting'}
        orderId={deliveryOrderId}
        amount={getCartTotal()}
        cart={cart}
        customer={{ name: checkoutName, phone: checkoutPhone }}
        deliveryAddress={address}
        paymentMethod={paymentMethod}
        changeNote={deliveryChangeNote}
        storeWhatsapp={storeWhatsapp}
        storeName={storeName}
        onBack={() => setScreen('finalize')}
        onDone={() => { clearCart(); setScreen(null); }}
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
