import { useState } from 'react';

const NAV = [
  { key: 'dashboard',    icon: '📊', label: 'Dashboard'           },
  { key: 'products',     icon: '🍕', label: 'Cardápio'             },
  { key: 'orders',       icon: '🧾', label: 'Pedidos (Kanban)'     },
  { key: 'transactions', icon: '💳', label: 'Transações'           },
  { key: 'campaigns',    icon: '🎨', label: 'Criativo'             },
  { key: 'integrations', icon: '🔌', label: 'Integrações'          },
  { key: 'robot',        icon: '🤖', label: 'Robô'                  },
  { key: 'deliveries',   icon: '🛵', label: 'Entregas'               },
  { key: 'drivers',      icon: '🪪', label: 'Entregadores'           },
  { key: 'payments',     icon: '💲', label: 'Formas de Pagamento'  },
  { key: 'profile',      icon: '🏪', label: 'Perfil da Loja'       },
  { key: 'delivery',     icon: '🗺️', label: 'Área de Entrega'      },
  { key: 'printer',      icon: '🖨️', label: 'Impressora'           },
];

export default function AdminLayout({ page, setPage, onLogout, children, stores, storeId, onStoreSwitch, onCreateStore, currentStore }) {
  const [creatingStore, setCreatingStore] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');

  const titles = {
    dashboard: 'Dashboard', products: 'Cardápio',
    orders: 'Pedidos (Kanban)', transactions: 'Transações',
    campaigns: 'Criativo', integrations: 'Integrações', robot: 'Robô WhatsApp', deliveries: 'Entregas', drivers: 'Entregadores',
    payments: 'Formas de Pagamento', profile: 'Perfil da Loja',
    delivery: 'Área de Entrega', printer: 'Impressora',
  };

  function handleCreateStore(e) {
    e.preventDefault();
    if (!newName || !newSlug) return;
    onCreateStore(newName, newSlug);
    setNewName(''); setNewSlug(''); setCreatingStore(false);
  }

  return (
    <div className="adm-layout" style={{ gridTemplateColumns: '64px 220px 1fr' }}>
      {/* ── Store switcher (far left) ── */}
      <aside className="adm-store-rail">
        <div className="adm-store-rail-title">Lojas</div>
        {(stores || []).map(s => (
          <button
            key={s.id}
            className={'adm-store-btn' + (s.id === storeId ? ' active' : '')}
            onClick={() => onStoreSwitch(s.id)}
            title={s.name}
          >
            {s.logo_url
              ? <img src={s.logo_url} alt={s.name} className="adm-store-logo" />
              : <span className="adm-store-initial">{s.name[0]?.toUpperCase()}</span>
            }
          </button>
        ))}
        <button
          className="adm-store-btn adm-store-add"
          onClick={() => setCreatingStore(true)}
          title="Criar nova loja"
        >+</button>

        {creatingStore && (
          <div className="adm-create-store-popup">
            <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Nova Loja</p>
            <form onSubmit={handleCreateStore}>
              <input className="adm-input-sm" placeholder="Nome da loja" value={newName}
                onChange={e => { setNewName(e.target.value); setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')); }} />
              <input className="adm-input-sm" placeholder="slug (ex: minha-pizzaria)" value={newSlug}
                onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button type="submit" className="adm-btn primary" style={{ flex: 1, fontSize: 12 }}>Criar</button>
                <button type="button" className="adm-btn ghost" style={{ fontSize: 12 }} onClick={() => setCreatingStore(false)}>✕</button>
              </div>
            </form>
          </div>
        )}
      </aside>

      {/* ── Nav sidebar ── */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-brand">
          <div className="brand-icon">
            {currentStore?.logo_url
              ? <img src={currentStore.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
              : '🍕'
            }
          </div>
          <div>
            <h1>{currentStore?.name || 'Admin'}</h1>
            <span>/{currentStore?.slug || '...'}</span>
          </div>
        </div>

        <div className="adm-sidebar-section">
          <div className="adm-sidebar-section-label">Menu</div>
          {NAV.map(n => (
            <button key={n.key} className={`adm-nav-link${page === n.key ? ' active' : ''}`} onClick={() => setPage(n.key)}>
              <span className="nav-icon">{n.icon}</span>{n.label}
            </button>
          ))}
        </div>

        <div className="adm-sidebar-footer">
          <button className="adm-logout-btn" onClick={onLogout}><span className="nav-icon">🚪</span>Sair</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="adm-main">
        <div className="adm-topbar">
          <h2>{titles[page] || 'Dashboard'}</h2>
          <div className="adm-topbar-user"><span>L</span>lucasrochartt</div>
        </div>
        <div className="adm-content">{children}</div>
      </div>
    </div>
  );
}
