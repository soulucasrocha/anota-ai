import { useState } from 'react';

const NAV = [
  { key: 'dashboard',  icon: '📊', label: 'Dashboard'       },
  { key: 'products',   icon: '🍕', label: 'Produtos'         },
  { key: 'reports',    icon: '📈', label: 'Relatórios'       },
  { key: 'orders',     icon: '🧾', label: 'Pedidos'          },
];

export default function AdminLayout({ page, setPage, onLogout, children }) {
  const titles = {
    dashboard: 'Dashboard',
    products:  'Gestão de Produtos',
    reports:   'Relatórios de Vendas',
    orders:    'Histórico de Pedidos',
  };

  return (
    <div className="adm-layout">
      {/* ── Sidebar ── */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-brand">
          <div className="brand-icon">🍕</div>
          <div>
            <h1>Pizzaria Admin</h1>
            <span>Painel de controle</span>
          </div>
        </div>

        <div className="adm-sidebar-section">
          <div className="adm-sidebar-section-label">Menu</div>
          {NAV.map(n => (
            <button
              key={n.key}
              className={`adm-nav-link${page === n.key ? ' active' : ''}`}
              onClick={() => setPage(n.key)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>

        <div className="adm-sidebar-footer">
          <button className="adm-logout-btn" onClick={onLogout}>
            <span className="nav-icon">🚪</span>
            Sair
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="adm-main">
        <div className="adm-topbar">
          <h2>{titles[page] || 'Dashboard'}</h2>
          <div className="adm-topbar-user">
            <span>L</span>
            lucasrochartt
          </div>
        </div>
        <div className="adm-content">
          {children}
        </div>
      </div>
    </div>
  );
}
