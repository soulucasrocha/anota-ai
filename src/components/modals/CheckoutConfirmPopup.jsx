export default function CheckoutConfirmPopup({ open, name, phone, onEdit, onConfirm }) {
  if (!open) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-card">
        <h3 className="popup-title">Confirmar dados</h3>
        <div className="confirm-info">
          <strong>Nome:</strong> {name}<br />
          <strong>WhatsApp:</strong> {phone}
        </div>
        <button className="popup-btn-secondary" onClick={onEdit}>Editar informações</button>
        <button className="popup-btn-primary" onClick={onConfirm}>Confirmar</button>
      </div>
    </div>
  );
}
