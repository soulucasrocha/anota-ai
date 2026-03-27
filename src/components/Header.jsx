export default function Header({ onSearchOpen, showToast, storeName, storeLogoUrl }) {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: (storeName || 'Cardápio'), url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => showToast('🔗 Link copiado!'));
    }
  };

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-left">
          <div className="store-logo">
            {storeLogoUrl
              ? <img src={storeLogoUrl} alt={storeName || 'Logo'} />
              : <span style={{ fontSize: 28 }}>🍕</span>
            }
          </div>
          <span className="store-name">{storeName || 'Cardápio'}</span>
        </div>
        <div className="header-right">
          <button className="hdr-btn" title="Buscar" onClick={onSearchOpen}>
            <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          </button>
          <button className="hdr-btn" title="Compartilhar" onClick={handleShare}>
            <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92zM18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 7.02c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>
          </button>
        </div>
      </div>
    </header>
  );
}
