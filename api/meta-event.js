// Serverless — envia evento de compra para Meta via Conversions API (CAPI)
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PIXEL_ID      = '930795412870152';
  const ACCESS_TOKEN  = 'EAAYVcxytQrABRCALovoSTcNa3qllr0HtFJ83Vy5ud7YkynrbSQtWqjd39ZA1IdZADvZCSmc1eES19NOqRR7cdi046DqvZBUOoo0leX2L7NbdZAuaVZBWZA38kfzFjT6K8j8FZBKswK3kx5MppRUtwYiko3q6UVmQGg8w7KPKoDzbQkrGX9l8vbb3FU638CJ4ieorKAZDZD';

  const {
    event_name = 'Purchase',
    value,
    currency = 'BRL',
    event_id,
    order_id,
  } = req.body;

  const eventData = {
    event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id:   event_id || order_id || String(Date.now()),
    action_source: 'website',
    custom_data: {
      value:    (value || 0) / 100,
      currency,
      content_type: 'product',
    },
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ data: [eventData] }),
      }
    );
    const data = await response.json();
    res.status(response.ok ? 200 : response.status).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
