// Public menu API — reads from Blob (admin edits), falls back to null (client uses static)
import { blobRead } from './admin-blob.js';

const ORDER = ['destaques','combos','minicombos','trio','salgadas','metade','dividas','doces','bebidas','adicionais'];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Cache for 10 seconds on CDN
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');

  try {
    const products = await blobRead('data/products.json');
    if (!products || !products.length) {
      return res.status(200).json({ source: 'static' }); // client uses static menu.js
    }

    // Convert flat array → MENU format grouped by category
    const menu = {};
    ORDER.forEach(cat => { menu[cat] = []; });

    products.forEach(p => {
      if (p.active !== false && menu[p.category] !== undefined) {
        menu[p.category].push(p);
      }
    });

    return res.status(200).json({ source: 'blob', menu });
  } catch {
    return res.status(200).json({ source: 'static' });
  }
}
