export default function StoreInfoBar() {
  return (
    <div className="store-info-bar">
      <div className="info-left">
        <span className="dot-open"></span>
        <span className="status-text">Aberto</span>
        <span className="sep">•</span>
        <span>Sem pedido mínimo</span>
      </div>
      <span className="profile-link">Perfil da loja</span>
    </div>
  );
}
