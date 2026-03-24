export function persistUtms() {
  const p = new URLSearchParams(window.location.search);
  ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','src','sck'].forEach(k => {
    const v = p.get(k);
    if (v) sessionStorage.setItem('utm_' + k, v);
  });
}

export function getUtms() {
  const p = new URLSearchParams(window.location.search);
  const get = k => p.get(k) || sessionStorage.getItem('utm_' + k) || null;
  return {
    utm_source:   get('utm_source'),
    utm_medium:   get('utm_medium'),
    utm_campaign: get('utm_campaign'),
    utm_term:     get('utm_term'),
    utm_content:  get('utm_content'),
    src:          get('src'),
    sck:          get('sck'),
  };
}

const UTMIFY_TOKEN = 'prb96d12vAUsGSDjeIRvwFkSCqUEcH1HnQOB';
const UTMIFY_BASE  = 'https://api.utmify.com.br/api-credentials/orders';

export async function sendUtmifyOrder(orderId, status, amountCents, approvedDate = null, customer = null) {
  const utms = getUtms();
  const now  = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const payload = {
    orderId:       String(orderId),
    platform:      'other',
    paymentMethod: 'pix',
    status,
    createdAt:     now,
    approvedDate:  approvedDate || null,
    refundedAt:    null,
    customer: customer || { name: '', email: '', phone: '', document: '' },
    products: [{
      id:           'pedido-pizzaria',
      name:         'Pedido Pizzaria',
      planId:       null,
      planName:     null,
      quantity:     1,
      priceInCents: amountCents,
    }],
    trackingParameters: utms,
    commission: {
      totalPriceInCents:     amountCents,
      gatewayFeeInCents:     0,
      userCommissionInCents: amountCents,
    },
  };
  try {
    await fetch(UTMIFY_BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-token': UTMIFY_TOKEN },
      body:    JSON.stringify(payload),
    });
  } catch (e) { console.warn('Utmify:', e); }
}
