import { useState } from 'react'
import { MENU } from '../data/menu'
import { fmtPrice } from '../utils/helpers'

const ALL_ITEMS = Object.values(MENU).flat();

export default function SearchOverlay({ open, onClose, onItemClick }) {
  const [query, setQuery] = useState('');

  const results = query.trim()
    ? ALL_ITEMS.filter(i =>
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        (i.desc || '').toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <div className={'search-overlay' + (open ? ' open' : '')}>
      <div className="search-header">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar no cardápio..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus={open}
        />
        <button className="search-close-btn" onClick={handleClose}>✕</button>
      </div>
      <div className="search-results">
        {query.trim() && results.length === 0 && (
          <p className="search-no-results">Nenhum produto encontrado 🔍</p>
        )}
        {results.map(item => (
          <div
            key={item.id}
            className={'search-item' + (item.soldOut ? ' prod-sold-out' : '')}
            onClick={!item.soldOut ? () => { setQuery(''); onItemClick(item); } : undefined}
          >
            <div className="search-item-emoji">
              {item.img
                ? <img src={item.img} alt="" loading="lazy" className="search-item-photo" />
                : <span>🍕</span>}
            </div>
            <div className="prod-info">
              <div className="prod-name">{item.name}</div>
              <div className="prod-price">{fmtPrice(item.price)}</div>
            </div>
            {item.soldOut && (
              <span className="sold-out-badge" style={{ position: 'static', marginLeft: 'auto' }}>
                Esgotado
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
