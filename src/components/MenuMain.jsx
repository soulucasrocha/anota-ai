import { useState } from 'react'
import { MENU } from '../data/menu'
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

export default function MenuMain({ onItemClick }) {
  return (
    <main className="menu-main">
      <section className="menu-section" id="sec-destaques">
        <h2 className="section-title">Destaques</h2>
        <div className="featured-row">
          {MENU.destaques.map(item => (
            <FeatCard key={item.id} item={item} onClick={onItemClick} />
          ))}
        </div>
      </section>

      <section className="menu-section" id="sec-combos">
        <h2 className="section-title">Combos</h2>
        <div className="product-list">
          {MENU.combos.map(item => <ProdItem key={item.id} item={item} onClick={onItemClick} />)}
        </div>
      </section>

      <CollapsibleSection id="minicombos" title="Mini Combos"                    items={MENU.minicombos}  onItemClick={onItemClick} />
      <CollapsibleSection id="trio"       title="Trio Pizza"                     items={MENU.trio}        onItemClick={onItemClick} />
      <CollapsibleSection id="salgadas"   title="Apenas Pizzas Variadas 35cm"    items={MENU.salgadas}    onItemClick={onItemClick} />
      <CollapsibleSection id="metade"     title="Pizza Metade 35cm"              items={MENU.metade}      onItemClick={onItemClick} />
      <CollapsibleSection id="dividas"    title="Pizzas Dividas 35cm"            items={MENU.dividas}     onItemClick={onItemClick} />
      <CollapsibleSection id="doces"      title="Pizzas Doces"                   items={MENU.doces}       onItemClick={onItemClick} />
      <CollapsibleSection id="bebidas"    title="Refrigerantes"                  items={MENU.bebidas}     onItemClick={onItemClick} />
      <CollapsibleSection id="adicionais" title="Adicionais"                     items={MENU.adicionais}  onItemClick={onItemClick} />

      <div className="menu-footer">
        <p>🍕 Cardápio Digital • Superp Delivery</p>
      </div>
    </main>
  );
}
