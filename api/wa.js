// Proxy para o backend Baileys (R Tracker no Railway)
// URL configurada via variável de ambiente WA_BACKEND_URL

const WA_URL = process.env.WA_BACKEND_URL || '';
const WA_KEY = process.env.WA_BACKEND_KEY || '';

function backendUrl(path) {
  return `${WA_URL.replace(/\/$/, '')}${path}`;
}
function hdrs(extra = {}) {
  return { ...(WA_KEY ? { 'x-api-key': WA_KEY } : {}), ...extra };
}

export default async function handler(req, res) {
  if (!WA_URL) return res.status(200).json({ configured: false, accounts: [] });

  const { action, id } = req.query;
  const method = req.method;

  try {
    // GET /api/wa?action=accounts
    if (action === 'accounts' && method === 'GET') {
      const r = await fetch(backendUrl('/whatsapp/accounts'), { headers: hdrs() });
      return res.status(r.status).json(await r.json());
    }

    // POST /api/wa?action=accounts
    if (action === 'accounts' && method === 'POST') {
      const r = await fetch(backendUrl('/whatsapp/accounts'), {
        method: 'POST',
        headers: hdrs({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(req.body),
      });
      return res.status(r.status).json(await r.json());
    }

    // DELETE /api/wa?action=delete&id=xxx
    if (action === 'delete' && method === 'DELETE') {
      const r = await fetch(backendUrl(`/whatsapp/accounts/${id}`), { method: 'DELETE', headers: hdrs() });
      return res.status(r.status).end();
    }

    // GET /api/wa?action=status&id=xxx
    if (action === 'status' && method === 'GET') {
      const r = await fetch(backendUrl(`/whatsapp/${id}/status`), { headers: hdrs() });
      return res.status(r.status).json(await r.json());
    }

    // GET /api/wa?action=qr&id=xxx
    if (action === 'qr' && method === 'GET') {
      const r = await fetch(backendUrl(`/whatsapp/${id}/qr-image`), { headers: hdrs() });
      if (!r.ok) return res.status(404).json({ error: 'QR não disponível' });
      return res.status(200).json(await r.json());
    }

    // POST /api/wa?action=reconnect&id=xxx
    if (action === 'reconnect' && method === 'POST') {
      const r = await fetch(backendUrl(`/whatsapp/${id}/reconnect`), { method: 'POST', headers: hdrs() });
      return res.status(r.status).json(await r.json());
    }

    // POST /api/wa?action=disconnect&id=xxx
    if (action === 'disconnect' && method === 'POST') {
      const r = await fetch(backendUrl(`/whatsapp/${id}/disconnect`), { method: 'POST', headers: hdrs() });
      return res.status(r.status).json(await r.json());
    }

    // POST /api/wa?action=send&id=xxx  — send WhatsApp message
    if (action === 'send' && method === 'POST') {
      const { phone, message } = req.body || {};
      if (!phone || !message) return res.status(400).json({ error: 'missing phone or message' });
      if (!id) return res.status(400).json({ error: 'missing account id' });

      // Try multiple endpoint/payload variants (discover correct one)
      const candidates = [
        { url: backendUrl(`/whatsapp/${id}/send-message`), body: { phone, message } },
        { url: backendUrl(`/whatsapp/${id}/send-message`), body: { to: phone, text: message } },
        { url: backendUrl(`/whatsapp/${id}/send-text`),    body: { phone, message } },
        { url: backendUrl(`/whatsapp/${id}/message`),      body: { phone, message } },
        { url: backendUrl(`/whatsapp/${id}/send`),         body: { phone, message } },
        { url: backendUrl(`/send-message`),                body: { id, phone, message } },
        { url: backendUrl(`/send`),                        body: { id, phone, message } },
      ];

      for (const c of candidates) {
        console.log('[wa/send] trying:', c.url);
        const r = await fetch(c.url, {
          method: 'POST',
          headers: hdrs({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(c.body),
        });
        let body; try { body = await r.json(); } catch { body = {}; }
        console.log('[wa/send] status:', r.status, 'body:', JSON.stringify(body).slice(0, 200));
        if (r.status !== 404) {
          return res.status(r.status).json({ ...body, _endpoint: c.url.replace(WA_URL, '') });
        }
      }
      return res.status(404).json({ error: 'No send endpoint found on backend', tried: candidates.map(c => c.url.replace(WA_URL, '')) });
    }

    // POST /api/wa?action=pairing&id=xxx
    if (action === 'pairing' && method === 'POST') {
      const r = await fetch(backendUrl(`/whatsapp/${id}/pairing-code`), {
        method: 'POST',
        headers: hdrs({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(req.body),
      });
      return res.status(r.status).json(await r.json());
    }

    res.status(400).json({ error: 'Action inválida' });
  } catch (e) {
    res.status(502).json({ error: 'Backend indisponível', detail: e.message });
  }
}
