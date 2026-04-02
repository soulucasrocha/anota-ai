import { useState } from 'react'
import { MENU as STATIC_MENU } from '../data/menu'
import { fmtPrice } from '../utils/helpers'

function FeatCard({ item, onClick }) {
  return (
    <div className="feat-card" onClick={() => onClick(item)}>
      {item.tag && <span className="feat-tag">{item.tag}</span>}
      <div className="feat-card-img">
        {item.img
          ? <img src={item.img} alt="" loading="lazy" className="feat-card-photo" />
          : <span>🍕</span>}
      </div>
      <div className="feat-card-body">
        <div className="feat-card-name">{item.name}</div>
        {item.oldPrice && <span className="feat-card-old">{fmtPrice(item.oldPrice)}</span>}
        <div className="feat-card-price">{fmtPrice(item.price)}</div>
      </div>
    </div>
  );
}

function ProdItem({ item, onClick }) {
  return (
    <div
      className={'prod-item' + (item.soldOut ? ' prod-sold-out' : '')}
      onClick={!item.soldOut ? () => onClick(item) : undefined}
    >
      <div className="prod-info">
        <div className="prod-name">{item.name}</div>
        <div className="prod-desc">{item.desc || ''}</div>
        <div className="prod-price-row">
          {item.oldPrice && <span className="prod-old">{fmtPrice(item.oldPrice)}</span>}
          <span className="prod-price">{fmtPrice(item.price)}</span>
          {item.tag && <span className="prod-discount">{item.tag}</span>}
        </div>
      </div>
      <div className="prod-img">
        {item.img
          ? <img src={item.img} alt="" loading="lazy" className="prod-img-photo" />
          : <span>🍕</span>}
      </div>
      {item.soldOut && <span className="sold-out-badge">Esgotado</span>}
    </div>
  );
}

function CollapsibleSection({ id, title, items, onItemClick }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <section className="menu-section" id={'sec-' + id}>
      <div
        className={'section-header-coll' + (collapsed ? ' collapsed' : '')}
        onClick={() => setCollapsed(c => !c)}
      >
        <h2 className="section-title">{title}</h2>
        <svg className="chevron" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
        </svg>
      </div>
      <div className={'product-list' + (collapsed ? ' hidden' : '')}>
        {items.map(item => <ProdItem key={item.id} item={item} onClick={onItemClick} />)}
      </div>
    </section>
  );
}

// Category id → display title mapping (fallback for static/hardcoded categories)
const CAT_TITLE = {
  destaques:  'Destaques',
  combos:     'Combos',
  minicombos: 'Mini Combos',
  trio:       'Trio Pizza',
  salgadas:   'Apenas Pizzas Variadas 35cm',
  metade:     'Pizza Metade 35cm',
  dividas:    'Pizzas Dividas 35cm',
  doces:      'Pizzas Doces',
  bebidas:    'Refrigerantes',
  adicionais: 'Adicionais',
};

export default function MenuMain({ onItemClick, menu: propMenu, categories }) {
  const M = propMenu || STATIC_MENU;

  // Determine render order: use categories from API if provided, else Object.keys(M)
  const catOrder = (categories && categories.length > 0)
    ? categories.map(c => c.id)
    : Object.keys(M);

  return (
    <main className="menu-main">
      {catOrder.map(catId => {
        const items = M[catId];
        if (!items || items.length === 0) return null;

        // "destaques" renders as horizontal featured cards
        if (catId === 'destaques') {
          return (
            <section key={catId} className="menu-section" id="sec-destaques">
              <h2 className="section-title">Destaques</h2>
              <div className="featured-row">
                {items.map(item => (
                  <FeatCard key={item.id} item={item} onClick={onItemClick} />
                ))}
              </div>
            </section>
          );
        }

        // "combos" renders as a flat list (no collapsible)
        if (catId === 'combos') {
          return (
            <section key={catId} className="menu-section" id="sec-combos">
              <h2 className="section-title">
                {categories?.find(c => c.id === catId)?.label || CAT_TITLE[catId] || catId}
              </h2>
              <div className="product-list">
                {items.map(item => <ProdItem key={item.id} item={item} onClick={onItemClick} />)}
              </div>
            </section>
          );
        }

        // All other categories as collapsible sections
        const title = categories?.find(c => c.id === catId)?.label
          || CAT_TITLE[catId]
          || catId;

        return (
          <CollapsibleSection
            key={catId}
            id={catId}
            title={title}
            items={items}
            onItemClick={onItemClick}
          />
        );
      })}

      <div className="menu-footer">
        <p>🍕 Cardápio Digital • Superp Delivery</p>
      </div>
    </main>
  );
}
