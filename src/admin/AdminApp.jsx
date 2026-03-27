import { useState, useEffect } from 'react';
import '../admin/admin.css';
import LoginPage          from './pages/LoginPage';
import AdminLayout        from './components/AdminLayout';
import DashboardHome      from './pages/DashboardHome';
import ProductsPage       from './pages/ProductsPage';
import ReportsPage        from './pages/ReportsPage';
import OrdersPage         from './pages/OrdersPage';
import TransactionsPage   from './pages/TransactionsPage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import StoreProfilePage   from './pages/StoreProfilePage';
import TrackingPage       from './pages/TrackingPage';

export default function AdminApp() {
  const [token,   setToken]   = useState(() => localStorage.getItem('adm_token') || null);
  const [page,    setPage]    = useState('dashboard');
  const [stores,  setStores]  = useState([]);
  const [storeId, setStoreId] = useState(() => localStorage.getItem('adm_store') || null);

  useEffect(() => { document.body.classList.add('admin-body'); return () => document.body.classList.remove('admin-body'); }, []);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin-stores', { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(d => {
        const list = d.stores || [];
        setStores(list);
        if (!storeId && list.length > 0) {
          setStoreId(list[0].id);
          localStorage.setItem('adm_store', list[0].id);
        }
      })
      .catch(() => {});
  }, [token]);

  function switchStore(id) {
    setStoreId(id);
    localStorage.setItem('adm_store', id);
    setPage('dashboard');
  }

  function handleLogout() {
    localStorage.removeItem('adm_token');
    localStorage.removeItem('adm_store');
    setToken(null);
  }

  if (!token) return <LoginPage onLogin={setToken} />;

  const currentStore = stores.find(s => s.id === storeId);
  const pages = {
    dashboard:    <DashboardHome    token={token} storeId={storeId} />,
    products:     <ProductsPage     token={token} storeId={storeId} />,
    reports:      <ReportsPage      token={token} storeId={storeId} />,
    orders:       <OrdersPage       token={token} storeId={storeId} />,
    transactions: <TransactionsPage token={token} storeId={storeId} />,
    payments:     <PaymentMethodsPage token={token} storeId={storeId} />,
    profile:      <StoreProfilePage token={token} storeId={storeId} store={currentStore} onUpdated={() => {
      fetch('/api/admin-stores', { headers: { 'x-admin-token': token } })
        .then(r => r.json()).then(d => setStores(d.stores || [])).catch(() => {});
    }} />,
    tracking:     <TrackingPage     token={token} storeId={storeId} />,
  };

  return (
    <AdminLayout
      page={page} setPage={setPage} onLogout={handleLogout}
      stores={stores} storeId={storeId} onStoreSwitch={switchStore}
      onCreateStore={(name, slug) => {
        fetch('/api/admin-stores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
          body: JSON.stringify({ name, slug }),
        }).then(r => r.json()).then(d => {
          if (d.store) {
            setStores(prev => [...prev, d.store]);
            switchStore(d.store.id);
          }
        }).catch(() => {});
      }}
      currentStore={currentStore}
    >
      {pages[page] || pages.dashboard}
    </AdminLayout>
  );
}
