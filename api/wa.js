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
      const r = await fetch(backendUrl(`/whatsapp/${id}/send-message`), {
        method: 'POST',
        headers: hdrs({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ phone, message }),
      });
      let body; try { body = await r.json(); } catch { body = {}; }
      return res.status(r.status).json(body);
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

    // GET /api/wa?action=probe — check backend deployment status
    if (action === 'probe' && method === 'GET') {
      const results = {};
      // Check health
      try {
        const r = await fetch(backendUrl('/health'), { headers: hdrs() });
        let body; try { body = await r.text(); } catch { body = ''; }
        results.health = { status: r.status, body: body.slice(0, 200) };
      } catch(e) { results.health = { error: e.message }; }
      // Check if new send-message route exists (POST with empty body → 400 means route exists)
      try {
        const r = await fetch(backendUrl(`/whatsapp/${id || 'test'}/send-message`), {
          method: 'POST', headers: hdrs({ 'Content-Type': 'application/json' }), body: '{}',
        });
        let body; try { body = await r.text(); } catch { body = ''; }
        results.sendRoute = { status: r.status, body: body.slice(0, 200), note: r.status === 400 ? '✅ ROTA EXISTE' : r.status === 404 ? '❌ AINDA NÃO DEPLOYOU' : '?' };
      } catch(e) { results.sendRoute = { error: e.message }; }
      return res.status(200).json(results);
    }

    // POST /api/wa?action=ifood-test-login — testa login iFood
    if (action === 'ifood-test-login' && method === 'POST') {
      const r = await fetch(backendUrl('/ifood/test-login'), {
        method: 'POST',
        headers: hdrs({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(req.body),
      });
      let body; try { body = await r.json(); } catch { body = {}; }
      return res.status(r.status).json(body);
    }

    // POST /api/wa?action=ifood-request-delivery — aciona entregador iFood
    if (action === 'ifood-request-delivery' && method === 'POST') {
      const r = await fetch(backendUrl('/ifood/request-delivery'), {
        method: 'POST',
        headers: hdrs({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(req.body),
      });
      let body; try { body = await r.json(); } catch { body = {}; }
      return res.status(r.status).json(body);
    }

    res.status(400).json({ error: 'Action inválida' });
  } catch (e) {
    res.status(502).json({ error: 'Backend indisponível', detail: e.message });
  }
}
