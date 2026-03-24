// Proxy serverless — cria PIX via Veno e repassa UTMs diretamente
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const VENO_API_KEY = 'veno_live_4ec08136a86b71eca6256b181c17f5dc6d5d5cb684933313';

  const {
    amount,
    description,
    payer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    src,
    sck,
  } = req.body;

  const payload = {
    amount,
    description: description || 'Pedido Pizzaria',
    ...(payer && { payer }),
    ...(utm_source    && { utm_source }),
    ...(utm_medium    && { utm_medium }),
    ...(utm_campaign  && { utm_campaign }),
    ...(utm_term      && { utm_term }),
    ...(utm_content   && { utm_content }),
    ...(src           && { src }),
    ...(sck           && { sck }),
  };

  try {
    const response = await fetch('https://beta.venopayments.com/api/v1/pix', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VENO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    res.status(response.ok ? 200 : response.status).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
