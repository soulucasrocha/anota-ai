// Serverless — envia evento de compra para Meta via Conversions API (CAPI)
import { sb } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { event_name = 'Purchase', value, currency = 'BRL', event_id, order_id, store_id } = req.body;

  // Load pixel config from store tracking settings
  let PIXEL_ID, ACCESS_TOKEN;
  if (store_id) {
    const { data: store } = await sb().from('stores').select('settings').eq('id', store_id).maybeSingle();
    const tracking = store?.settings?.tracking || {};
    PIXEL_ID     = tracking.pixel_id;
    ACCESS_TOKEN = tracking.pixel_access_token;
  }

  if (!PIXEL_ID || !ACCESS_TOKEN) return res.status(400).json({ error: 'Pixel not configured' });

  const eventData = {
    event_name,
    event_time:    Math.floor(Date.now() / 1000),
    event_id:      event_id || order_id || String(Date.now()),
    action_source: 'website',
    custom_data: {
      value:        (value || 0) / 100,
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
}
