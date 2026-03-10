// Proxy serverless — evita CORS ao chamar a Veno do browser
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const VENO_API_KEY = 'veno_live_588f3a6b299b02e5a6c1a27147b192272e4be28899b814ba';

  try {
    const response = await fetch('https://beta.venopayments.com/api/v1/pix', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VENO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.ok ? 200 : response.status).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
