// Proxy serverless — consulta status do PIX na Veno e salva pedido ao confirmar
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const VENO_API_KEY = 'veno_live_4ec08136a86b71eca6256b181c17f5dc6d5d5cb684933313';
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  try {
    const response = await fetch(`https://beta.venopayments.com/api/v1/pix/${id}/status`, {
      headers: { 'Authorization': `Bearer ${VENO_API_KEY}` },
    });

    const data = await response.json();

    // ── Save order to KV when PIX is confirmed ──────────────────────────────
    if (data.status === 'paid' && req.query.orderData) {
      try {
        let orderData = {};
        try { orderData = JSON.parse(decodeURIComponent(req.query.orderData)); } catch {}

        // Save via admin-orders API internally
        const origin = req.headers.host
          ? `https://${req.headers.host}`
          : 'http://localhost:3000';

        const ADMIN_USER = process.env.ADMIN_USER || 'lucasrochartt';
        const ADMIN_PASS = process.env.ADMIN_PASS || '123456';
        const token = Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}:dashboard`).toString('base64');

        await fetch(`${origin}/api/admin-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
          body: JSON.stringify({ ...orderData, status: 'paid', pixId: id }),
        }).catch(() => {});
      } catch { /* silently ignore */ }
    }

    res.status(response.ok ? 200 : response.status).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
