import { useState, useEffect } from 'react';
import '../admin/admin.css';
import LoginPage      from './pages/LoginPage';
import AdminLayout    from './components/AdminLayout';
import DashboardHome  from './pages/DashboardHome';
import ProductsPage   from './pages/ProductsPage';
import ReportsPage    from './pages/ReportsPage';
import OrdersPage     from './pages/OrdersPage';

export default function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem('adm_token') || null);
  const [page,  setPage]  = useState('dashboard');

  // Apply admin body class so CSS scoping works cleanly
  useEffect(() => {
    document.body.classList.add('admin-body');
    return () => document.body.classList.remove('admin-body');
  }, []);

  function handleLogout() {
    localStorage.removeItem('adm_token');
    setToken(null);
  }

  if (!token) return <LoginPage onLogin={setToken} />;

  const pages = {
    dashboard: <DashboardHome token={token} />,
    products:  <ProductsPage  token={token} />,
    reports:   <ReportsPage   token={token} />,
    orders:    <OrdersPage    token={token} />,
  };

  return (
    <AdminLayout page={page} setPage={setPage} onLogout={handleLogout}>
      {pages[page] || pages.dashboard}
    </AdminLayout>
  );
}
