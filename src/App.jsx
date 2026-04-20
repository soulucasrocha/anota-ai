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

  // Captura hashtag de campanha (?ref=HASHTAG) e persiste na sessão
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) sessionStorage.setItem('campaign_ref', ref);
  }, []);

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
  const [deliveryChangeFor, setDeliveryChangeFor] = useState(() => _s?.deliveryChangeFor || null);
  const [storeHours, setStoreHours]             = useState([]);
  const [minOrder, setMinOrder]                 = useState(0);
  const [menuCategories, setMenuCategories]     = useState([]);
  const [paymentMethods, setPaymentMethods]     = useState(null);
  const [defaultPayment, setDefaultPayment]     = useState(null);
  const [deliveryZones,      setDeliveryZones]      = useState([]);
  const [deliveryAddress,    setDeliveryAddress]    = useState('');
  const [deliveryFee,        setDeliveryFee]        = useState(0);
  const [deliveryDefaultFee, setDeliveryDefaultFee] = useState(500);

  // Wrapper de setScreen que salva na sessão
  const setScreen = useCallback((s) => {
    setScreenRaw(s);
  }, []);

  // Salva sessão sempre que estado relevante muda
  useEffect(() => {
    if (screen === 'pix') return; // PIX tem própria persistência
    saveSession({ screen, cart, checkoutName, checkoutPhone, address, paymentMethod, deliveryOrderId, deliveryChangeNote, deliveryChangeFor });
  }, [screen, cart, checkoutName, checkoutPhone, address, paymentMethod, deliveryOrderId, deliveryChangeNote, deliveryChangeFor]);

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
        if (d.storeHours) setStoreHours(d.storeHours);
        if (d.minOrder != null) setMinOrder(d.minOrder);
        if (d.categories && d.categories.length > 0) setMenuCategories(d.categories);
        if (d.paymentMethods) setPaymentMethods(d.paymentMethods);
        if (d.defaultPayment) setDefaultPayment(d.defaultPayment);
        if (d.deliveryZones)      setDeliveryZones(d.deliveryZones);
        if (d.deliveryAddress)    setDeliveryAddress(d.deliveryAddress);
        if (d.deliveryDefaultFee != null) setDeliveryDefaultFee(d.deliveryDefaultFee);
        // Inject tracking scripts
        if (d.gtmId && !document.getElementById('gtm-script')) {
          const s = document.createElement('script');
          s.id = 'gtm-script';
          s.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${d.gtmId}');`;
          document.head.appendChild(s);
        }
        if (d.pixelId && !document.getElementById('fb-pixel-script')) {
          const s = document.createElement('script');
          s.id = 'fb-pixel-script';
          s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${d.pixelId}');fbq('track','PageView');`;
          document.head.appendChild(s);
        }
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

  // ── Store hours / closed check ────────────────────────────────────────────

  function isStoreClosed() {
    if (!storeHours || storeHours.length === 0) return false;
    const now = new Date();
    // Brazil UTC-3
    const brNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const dayIdx = brNow.getUTCDay(); // 0=Sun..6=Sat
    const dayKeys = ['dom','seg','ter','qua','qui','sex','sab'];
    const todayKey = dayKeys[dayIdx];
    const todayHours = storeHours.find(h => h.day === todayKey);
    if (!todayHours || !todayHours.enabled) return true;
    const [openH, openM] = (todayHours.open || '00:00').split(':').map(Number);
    const [closeH, closeM] = (todayHours.close || '23:59').split(':').map(Number);
    const nowMinutes = brNow.getUTCHours() * 60 + brNow.getUTCMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    return nowMinutes < openMinutes || nowMinutes >= closeMinutes;
  }

  function getNextOpenTime() {
    if (!storeHours || storeHours.length === 0) return null;
    const now = new Date();
    const brNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const dayKeys = ['dom','seg','ter','qua','qui','sex','sab'];
    const nowMinutes = brNow.getUTCHours() * 60 + brNow.getUTCMinutes();
    // Check today and next 6 days
    for (let i = 0; i < 7; i++) {
      const d = new Date(brNow.getTime() + i * 86400000);
      const key = dayKeys[d.getUTCDay()];
      const h = storeHours.find(x => x.day === key);
      if (!h || !h.enabled) continue;
      const [openH, openM] = (h.open || '00:00').split(':').map(Number);
      const openMinutes = openH * 60 + openM;
      if (i === 0 && openMinutes <= nowMinutes) continue; // already past today's open
      return h.open;
    }
    return null;
  }

  const storeClosed = isStoreClosed();
  const nextOpen = storeClosed ? getNextOpenTime() : null;

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

  const handleDeliveryOrder = useCallback(async (method, changeFor, fullAddress) => {
    const items = Object.values(cart).map(({ item, qty }) => ({ id: item.id, name: item.name, qty, price: item.price, note: item.cartNote || '' }));
    const orderId = `del-${Date.now()}`;
    const subtotal = getCartTotal();
    const total = subtotal + deliveryFee;
    const addr = fullAddress || address;
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
          delivery_fee: deliveryFee,
          customer: { name: checkoutName, phone: checkoutPhone },
          address: addr,
          paymentMethod: method,
          deliveryPayment: true,
          storeId: storeId || undefined,
          changeFor: changeFor || null,
          changeNote: changeNote || null,
          hashtag: sessionStorage.getItem('campaign_ref') || null,
        }),
      });
    } catch {}
    // Save to localStorage for persistence
    try {
      localStorage.setItem('delivery_order_v1', JSON.stringify({
        orderId,
        amount: total,
        paymentMethod: method,
        changeFor: changeFor || null,
        changeNote: changeNote || null,
        expiry: Date.now() + 86400000,
      }));
    } catch {}
    setDeliveryOrderId(orderId);
    setPaymentMethod(method);
    setDeliveryChangeNote(changeNote);
    setDeliveryChangeFor(changeFor || null);
    setScreen('delivery-waiting');
  }, [cart, getCartTotal, checkoutName, checkoutPhone, address, deliveryFee, storeId, setScreen]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Header onSearchOpen={() => setSearchOpen(true)} showToast={showToast} storeName={storeName} storeLogoUrl={storeLogoUrl} />
      {storeClosed && (
        <div style={{
          background: '#dc2626', color: '#fff',
          textAlign: 'center', padding: '10px 16px',
          fontSize: 14, fontWeight: 600, letterSpacing: 0.2,
        }}>
          🔴 Fechado{nextOpen ? ` · Abre às ${nextOpen}` : ''}
        </div>
      )}

      <CategoryNav categories={menuCategories} />
      <MenuMain onItemClick={handleItemClick} menu={dynamicMenu} categories={menuCategories} />

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
        onAdvance={() => {
          if (storeClosed) { showToast('🔴 Loja fechada no momento'); return; }
          setScreen('checkout');
        }}
        onInc={incCartItem}
        onDec={removeFromCart}
        minOrder={minOrder}
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
        onAdvance={(method, changeFor, addrNumber, city) => {
          let fullAddress = address;
          if (addrNumber) fullAddress = `${address}${address ? `, nº ${addrNumber}` : addrNumber}`;
          if (city) fullAddress = `${fullAddress}${fullAddress ? `, ${city}` : city}`;
          if (addrNumber || city) setAddress(fullAddress);
          setPaymentMethod(method);
          const isOnline = method === 'pix_online' || method === 'card_online';
          if (isOnline) {
            setScreen('pix');
          } else {
            handleDeliveryOrder(method, changeFor, fullAddress);
          }
        }}
        geoData={geoData}
        slug={slug}
        paymentMethodsData={paymentMethods}
        defaultPaymentData={defaultPayment}
        deliveryZones={deliveryZones}
        deliveryAddress={deliveryAddress}
        deliveryDefaultFee={deliveryDefaultFee}
        onDeliveryFeeChange={setDeliveryFee}
      />

      <PixScreen
        active={screen === 'pix'}
        amount={getCartTotal() + deliveryFee}
        deliveryFee={deliveryFee}
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
        changeFor={deliveryChangeFor}
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
