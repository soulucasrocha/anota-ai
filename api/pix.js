// Proxy serverless — cria PIX (POST) e consulta status (GET) via Veno
const VENO_API_KEY = 'veno_live_4ec08136a86b71eca6256b181c17f5dc6d5d5cb684933313';

export default async function handler(req, res) {

  // ── GET /api/pix?id=xxx — consulta status do PIX ─────────────────────────
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id parameter' });

    try {
      const response = await fetch(`https://beta.venopayments.com/api/v1/pix/${id}/status`, {
        headers: { 'Authorization': `Bearer ${VENO_API_KEY}` },
      });
      const data = await response.json();

      if (data.status === 'paid' && req.query.orderData) {
        try {
          let orderData = {};
          try { orderData = JSON.parse(decodeURIComponent(req.query.orderData)); } catch {}
          const origin = req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000';
          const ADMIN_USER = process.env.ADMIN_USER || 'lucasrochartt';
          const ADMIN_PASS = process.env.ADMIN_PASS || '123456';
          const token = Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}:dashboard`).toString('base64');
          await fetch(`${origin}/api/admin-orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body: JSON.stringify({ ...orderData, status: 'paid', pixId: id }),
          }).catch(() => {});
        } catch {}
      }

      return res.status(response.ok ? 200 : response.status).json(data);
    } catch (e) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── POST /api/pix — cria novo PIX ─────────────────────────────────────────
  if (req.method === 'POST') {
    const { amount, description, payer, utm_source, utm_medium, utm_campaign, utm_term, utm_content, src, sck } = req.body;
    const payload = {
      amount,
      description: description || 'Pedido Pizzaria',
      ...(payer        && { payer }),
      ...(utm_source   && { utm_source }),
      ...(utm_medium   && { utm_medium }),
      ...(utm_campaign && { utm_campaign }),
      ...(utm_term     && { utm_term }),
      ...(utm_content  && { utm_content }),
      ...(src          && { src }),
      ...(sck          && { sck }),
    };
    try {
      const response = await fetch('https://beta.venopayments.com/api/v1/pix', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${VENO_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      return res.status(response.ok ? 200 : response.status).json(data);
    } catch (e) {
      return res.status(500).json({ error: 'Internal server error', detail: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
