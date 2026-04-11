import { verifyAdminToken } from './_verify.js';
import { sb, getStoreId } from './_supabase.js';

const B = 'https://client-assets.anota.ai/produtos/65528552aecca100197b7610/';
const STATIC_PRODUCTS = [
  { id: 'dest-calabresa', category: 'destaques', name: 'Pizza Calabresa 35cm', description: 'Molho, Muçarela, Calabresa, Orégano', price: 2499, old_price: 3699, tag: '32% OFF', img: B+'202309300548_01YC_i', active: true, steps: ['notes'] },
  { id: 'dest1', category: 'destaques', name: 'Combo Super 4 Pizza 35cm + 2 Refrigerante', description: '4 Pizzas qualquer sabor + 2 Guaraná ou Pepsi 1,5l', price: 12999, old_price: 13989, tag: '7% OFF', img: B+'202309300513_JH58_i', active: true, steps: ['salgadas4','refri2','notes'] },
  { id: 'dest2', category: 'destaques', name: '3 Pizza Salgadas 35cm + 1 Refrigerante', description: '3 Pizzas salgadas qualquer sabor + 1 Guaraná ou Pepsi 1,5l', price: 8927, old_price: 9599, tag: '7% OFF', img: B+'-1706189781018blob', active: true, steps: ['salgadas3','refri1','notes'] },
  { id: 'sal1', category: 'salgadas', name: 'Margherita', description: 'Molho, Muçarela, Tomate, Manjericão', price: 2999, img: B+'202309300607_I5J0_i', active: true, steps: ['notes'] },
  { id: 'sal2', category: 'salgadas', name: 'Calabresa', description: 'Pizza Calabresa 35cm', price: 3299, img: B+'202309300548_01YC_i', active: true, steps: ['notes'] },
  { id: 'beb1', category: 'bebidas', name: 'Guaraná Antarctica 1,5l', description: 'Refrigerante gelado', price: 900, img: '', active: true },
  { id: 'beb2', category: 'bebidas', name: 'Pepsi 1,5l', description: 'Refrigerante gelado', price: 900, img: '', active: true },
];

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  const storeId = req.query.storeId || req.body?.storeId || req.headers['x-store-id'];

  // ── Payment methods config ─────────────────────────────────────────────
  const DEFAULT_PM = { pix_online: true, card_online: false, card_delivery: false, pix_delivery: false, cash: false };
  if (req.query.type === 'payments') {
    if (!storeId) return res.status(400).json({ error: 'missing storeId' });
    if (req.method === 'GET') {
      const { data } = await sb().from('store_settings').select('payment_methods').eq('store_id', storeId).maybeSingle();
      return res.status(200).json({ paymentMethods: data?.payment_methods || DEFAULT_PM });
    }
    if (req.method === 'PATCH') {
      await sb().from('store_settings').upsert({ store_id: storeId, payment_methods: req.body, updated_at: new Date().toISOString() }, { onConflict: 'store_id' });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).end();
  }

  // ── Delivery config ────────────────────────────────────────────────────
  if (req.query.type === 'delivery') {
    const storeId = req.query.storeId || req.body?.storeId || req.headers['x-store-id'];
    if (!storeId) return res.status(400).json({ error: 'missing storeId' });
    if (req.method === 'GET') {
      const { data } = await sb().from('store_settings').select('delivery').eq('store_id', storeId).maybeSingle();
      return res.status(200).json({ delivery: data?.delivery || { address: '', areas: [] } });
    }
    if (req.method === 'PATCH' || req.method === 'POST') {
      const { delivery } = req.body || {};
      // Merge with existing data to avoid overwriting unrelated fields
      const { data: existing } = await sb().from('store_settings').select('delivery').eq('store_id', storeId).maybeSingle();
      const merged = { ...(existing?.delivery || {}), ...delivery };
      await sb().from('store_settings').upsert({ store_id: storeId, delivery: merged }, { onConflict: 'store_id' });
      return res.status(200).json({ ok: true });
    }
  }

  // ── Bot (WhatsApp robot) config ───────────────────────────────────────
  if (req.query.type === 'bot') {
    if (!storeId) return res.status(400).json({ error: 'missing storeId' });
    const DEFAULT_BOT = {
      enabled: false, accountId: '',
      preparing: 'Olá {{nome}}! 🍕 Seu pedido #{{pedido}} foi aceito e já está sendo preparado. Logo chegará até você!',
      delivering: 'Olá {{nome}}! 🛵 Seu pedido #{{pedido}} saiu para entrega! Está a caminho.',
      delivered: 'Olá {{nome}}! ✅ Seu pedido #{{pedido}} foi entregue. Obrigado pela preferência! 😋',
    };
    if (req.method === 'GET') {
      const { data } = await sb().from('store_settings').select('bot_messages').eq('store_id', storeId).maybeSingle();
      return res.status(200).json({ bot: { ...DEFAULT_BOT, ...(data?.bot_messages || {}) } });
    }
    if (req.method === 'PATCH') {
      await sb().from('store_settings').upsert({ store_id: storeId, bot_messages: req.body, updated_at: new Date().toISOString() }, { onConflict: 'store_id' });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).end();
  }

  // ── Categories config ─────────────────────────────────────────────────
  if (req.query.type === 'categories') {
    if (!storeId) return res.status(400).json({ error: 'missing storeId' });
    if (req.method === 'GET') {
      const { data } = await sb().from('store_settings').select('categories').eq('store_id', storeId).maybeSingle();
      return res.status(200).json({ categories: data?.categories || [] });
    }
    if (req.method === 'PATCH') {
      const { categories } = req.body || {};
      const { data: existing } = await sb().from('store_settings').select('categories').eq('store_id', storeId).maybeSingle();
      void existing; // merge not needed — full replace
      await sb().from('store_settings').upsert({ store_id: storeId, categories: categories || [] }, { onConflict: 'store_id' });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).end();
  }

  // ── Tracking config ────────────────────────────────────────────────────
  if (req.query.type === 'tracking') {
    if (!storeId) return res.status(400).json({ error: 'missing storeId' });
    if (req.method === 'GET') {
      const { data } = await sb().from('store_settings').select('tracking').eq('store_id', storeId).maybeSingle();
      return res.status(200).json({ tracking: data?.tracking || {} });
    }
    if (req.method === 'PATCH') {
      await sb().from('store_settings').upsert({ store_id: storeId, tracking: req.body, updated_at: new Date().toISOString() }, { onConflict: 'store_id' });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).end();
  }

  // ── Generic settings (campaigns, integrations, etc.) ──────────────────
  if (req.query.type === 'settings') {
    if (!storeId) return res.status(400).json({ error: 'missing storeId' });
    if (req.method === 'GET') {
      const { data } = await sb().from('store_settings').select('settings').eq('store_id', storeId).maybeSingle();
      return res.status(200).json({ settings: data?.settings || {} });
    }
    if (req.method === 'PATCH') {
      const { data: existing } = await sb().from('store_settings').select('settings').eq('store_id', storeId).maybeSingle();
      const merged = { ...(existing?.settings || {}), ...req.body };
      await sb().from('store_settings').upsert({ store_id: storeId, settings: merged }, { onConflict: 'store_id' });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).end();
  }

  if (!storeId) return res.status(400).json({ error: 'missing storeId' });

  // ── GET products ────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data } = await sb().from('products').select('*').eq('store_id', storeId).order('sort_order').order('created_at');
    const products = (data || []).map(p => ({ ...p, desc: p.description, subproducts: p.subproducts || [], subproduct_limit: p.subproduct_limit || 0 }));
    return res.status(200).json({ products });
  }

  // ── PATCH reorder products ───────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { reorder } = req.body || {};
    if (Array.isArray(reorder)) {
      await Promise.all(reorder.map(({ id, sort_order }) =>
        sb().from('products').update({ sort_order }).eq('store_id', storeId).eq('id', id)
      ));
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'missing reorder array' });
  }

  // ── POST: add/update ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const incoming = { ...req.body };
    delete incoming.storeId;
    const price     = Math.round(parseFloat(incoming.price) * 100);
    const old_price = incoming.oldPrice ? Math.round(parseFloat(incoming.oldPrice) * 100) : null;
    const payload = {
      store_id:    storeId,
      id:          incoming.id || `prod-${Date.now()}`,
      category:    incoming.category || 'destaques',
      name:        incoming.name,
      description: incoming.desc || incoming.description || '',
      price,
      old_price,
      tag:              incoming.tag || null,
      img:              incoming.img || '',
      active:           incoming.active !== false,
      sold_out:         incoming.soldOut || incoming.sold_out || false,
      steps:            incoming.steps || ['notes'],
      subproducts:      incoming.subproducts || [],
      subproduct_limit: incoming.subproduct_limit || 0,
    };
    await sb().from('products').upsert(payload, { onConflict: 'store_id,id' });
    return res.status(200).json({ ok: true, product: { ...payload, desc: payload.description } });
  }

  // ── DELETE ──────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query;
    await sb().from('products').delete().eq('store_id', storeId).eq('id', id);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
