import { verifyAdminToken } from './admin-verify.js';

async function getKV() {
  try { const m = await import('@vercel/kv'); return m.kv; } catch { return null; }
}

// Static menu fallback
const STATIC_PRODUCTS = [
  { id: 'dest-calabresa', category: 'destaques', name: 'Pizza Calabresa 35cm', desc: 'Molho, Muçarela, Calabresa, Orégano', price: 2499, oldPrice: 3699, tag: 'PROMO', img: 'https://client-assets.anota.ai/produtos/65528552aecca100197b7610/202309300548_01YC_i', active: true },
  { id: 'dest1', category: 'destaques', name: 'Combo Super 4 Pizza 35cm + 2 Refrigerante', desc: '4 Pizzas qualquer sabor + 2 Guaraná ou Pepsi 1,5l', price: 12999, oldPrice: 13989, tag: '7% OFF', img: 'https://client-assets.anota.ai/produtos/65528552aecca100197b7610/202309300513_JH58_i', active: true },
  { id: 'c1', category: 'combos', name: 'Combo Duplo 2 Pizza 35cm + 1 Refrigerante', desc: '2 Pizzas qualquer sabor + Guaraná ou Pepsi 1,5l', price: 6499, img: 'https://client-assets.anota.ai/produtos/65528552aecca100197b7610/202309300514_5A60_i', active: true },
  { id: 'sal1', category: 'salgadas', name: 'Margherita', desc: 'Molho, Muçarela, Tomate, Manjericão seco', price: 2999, img: 'https://client-assets.anota.ai/produtos/65528552aecca100197b7610/202309300607_I5J0_i', active: true },
  { id: 'sal2', category: 'salgadas', name: 'Calabresa', desc: 'Pizza Calabresa 35cm', price: 3299, img: 'https://client-assets.anota.ai/produtos/65528552aecca100197b7610/202309300548_01YC_i', active: true },
  { id: 'sal3', category: 'salgadas', name: 'Bacon', desc: 'Pizza Bacon 35cm', price: 3299, img: 'https://client-assets.anota.ai/produtos/65528552aecca100197b7610/202309300602_J030_i', active: true },
  { id: 'sal4', category: 'salgadas', name: 'Mista', desc: 'Pizza Mista 35cm', price: 3299, img: 'https://client-assets.anota.ai/produtos/65528552aecca100197b7610/202309300603_7K33_i', active: true },
  { id: 'sal5', category: 'salgadas', name: 'Americana', desc: 'Pizza Americana 35cm', price: 3399, img: 'https://client-assets.anota.ai/produtos/65528552aecca100197b7610/202309300554_0Y52_i', active: true },
  { id: 'sal6', category: 'salgadas', name: 'Frango Com Requeijão', desc: 'Pizza Frango Com Requeijão 35cm', price: 3399, img: 'https://client-assets.anota.ai/produtos/65528552aecca100197b7610/202309300553_4U2S_i', active: true },
  { id: 'sal7', category: 'salgadas', name: 'Via Brasil (Portuguesa)', desc: 'Pizza Via Brasil (Portuguesa) 35cm', price: 3499, img: 'https://client-assets.anota.ai/produtos/65528552aecca100197b7610/202309300604_N81Q_i', active: true },
  { id: 'beb1', category: 'bebidas', name: 'Guaraná Antarctica 1,5l', desc: 'Refrigerante gelado', price: 900, img: '', active: true },
  { id: 'beb2', category: 'bebidas', name: 'Pepsi 1,5l', desc: 'Refrigerante gelado', price: 900, img: '', active: true },
];

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  const kv = await getKV();

  // ── GET: list products ─────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const stored = kv ? await kv.get('products') : null;
      return res.status(200).json({ products: stored || STATIC_PRODUCTS });
    } catch {
      return res.status(200).json({ products: STATIC_PRODUCTS });
    }
  }

  // ── POST: add / update product ─────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      let products = STATIC_PRODUCTS;
      if (kv) {
        const stored = await kv.get('products');
        if (stored) products = stored;
      }
      const newProduct = {
        ...req.body,
        id: req.body.id || `prod-${Date.now()}`,
        active: req.body.active !== false,
        createdAt: new Date().toISOString(),
      };
      // update or insert
      const idx = products.findIndex(p => p.id === newProduct.id);
      if (idx >= 0) products[idx] = newProduct;
      else products.unshift(newProduct);
      if (kv) await kv.set('products', products);
      return res.status(200).json({ ok: true, product: newProduct, products });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── DELETE: remove product ─────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      let products = STATIC_PRODUCTS;
      if (kv) { const stored = await kv.get('products'); if (stored) products = stored; }
      const filtered = products.filter(p => p.id !== id);
      if (kv) await kv.set('products', filtered);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).end();
}
