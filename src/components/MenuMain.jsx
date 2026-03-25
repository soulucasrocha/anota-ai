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

export default function MenuMain({ onItemClick, menu: propMenu }) {
  const M = propMenu || STATIC_MENU;
  return (
    <main className="menu-main">
      {M.destaques?.length > 0 && (
        <section className="menu-section" id="sec-destaques">
          <h2 className="section-title">Destaques</h2>
          <div className="featured-row">
            {M.destaques.map(item => (
              <FeatCard key={item.id} item={item} onClick={onItemClick} />
            ))}
          </div>
        </section>
      )}

      {M.combos?.length > 0 && (
        <section className="menu-section" id="sec-combos">
          <h2 className="section-title">Combos</h2>
          <div className="product-list">
            {M.combos.map(item => <ProdItem key={item.id} item={item} onClick={onItemClick} />)}
          </div>
        </section>
      )}

      {M.minicombos?.length > 0  && <CollapsibleSection id="minicombos" title="Mini Combos"                 items={M.minicombos}  onItemClick={onItemClick} />}
      {M.trio?.length > 0        && <CollapsibleSection id="trio"       title="Trio Pizza"                  items={M.trio}        onItemClick={onItemClick} />}
      {M.salgadas?.length > 0    && <CollapsibleSection id="salgadas"   title="Apenas Pizzas Variadas 35cm" items={M.salgadas}    onItemClick={onItemClick} />}
      {M.metade?.length > 0      && <CollapsibleSection id="metade"     title="Pizza Metade 35cm"           items={M.metade}      onItemClick={onItemClick} />}
      {M.dividas?.length > 0     && <CollapsibleSection id="dividas"    title="Pizzas Dividas 35cm"         items={M.dividas}     onItemClick={onItemClick} />}
      {M.doces?.length > 0       && <CollapsibleSection id="doces"      title="Pizzas Doces"                items={M.doces}       onItemClick={onItemClick} />}
      {M.bebidas?.length > 0     && <CollapsibleSection id="bebidas"    title="Refrigerantes"               items={M.bebidas}     onItemClick={onItemClick} />}
      {M.adicionais?.length > 0  && <CollapsibleSection id="adicionais" title="Adicionais"                  items={M.adicionais}  onItemClick={onItemClick} />}

      <div className="menu-footer">
        <p>🍕 Cardápio Digital • Superp Delivery</p>
      </div>
    </main>
  );
}
