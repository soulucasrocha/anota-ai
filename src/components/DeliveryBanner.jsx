export default function DeliveryBanner({ geoData }) {
  const street = geoData?.shortAddress || '';
  const km     = geoData?.km || '3';

  return (
    <div className="delivery-banner">
      <span className="delivery-banner__pin">📍</span>
      <span className="delivery-banner__text">
        {street
          ? <><strong>{street}</strong> — {km}km próximo de você!</>
          : <><strong>{km}km próximo de você!</strong> Entrega grátis em 30 minutos</>
        }
        {street && <span className="delivery-banner__sub"> · Entrega grátis em 30 min</span>}
      </span>
      <span className="delivery-banner__badge">Grátis</span>
    </div>
  );
}
