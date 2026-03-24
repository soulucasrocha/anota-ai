export default function DeliveryBanner({ geoData }) {
  const street = geoData?.shortAddress || '';

  return (
    <div className="delivery-banner">
      <span className="delivery-banner__pin">📍</span>
      <span className="delivery-banner__text">
        {street
          ? <><strong>{street}</strong> — 3km próximo de você! · Entrega grátis em 30 min</>
          : <><strong>3km próximo de você!</strong> Entrega grátis em 30 minutos</>
        }
      </span>
      <span className="delivery-banner__badge">Grátis</span>
    </div>
  );
}
