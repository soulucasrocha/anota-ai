import { sb, getStoreBySlug } from './_supabase.js';

const ORDER = ['destaques','combos','minicombos','trio','salgadas','metade','dividas','doces','bebidas','adicionais'];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  try {
    const slug = req.query.slug;
    let storeId = req.query.storeId;

    if (!storeId && slug) {
      const store = await getStoreBySlug(slug);
      storeId = store?.id;
    }
    if (!storeId) {
      // fallback: first active store
      const { data } = await sb().from('stores').select('id').eq('active', true).limit(1).maybeSingle();
      storeId = data?.id;
    }
    if (!storeId) return res.status(200).json({ source: 'static', paymentMethods: { pix_online: true } });

    // Get store info + payment methods in parallel
    const [{ data: storeInfo }, { data: settings }] = await Promise.all([
      sb().from('stores').select('name, logo_url').eq('id', storeId).maybeSingle(),
      sb().from('store_settings').select('payment_methods').eq('store_id', storeId).maybeSingle(),
    ]);
    const paymentMethods = settings?.payment_methods || { pix_online: true, card_online: false, card_delivery: false, pix_delivery: false, cash: false };

    // Get products
    const { data: products } = await sb().from('products').select('id,category,name,description,price,old_price,tag,img,active,sold_out,steps').eq('store_id', storeId).eq('active', true);

    const storeMeta = { storeName: storeInfo?.name || '', storeLogoUrl: storeInfo?.logo_url || '' };

    if (!products || !products.length) {
      return res.status(200).json({ source: 'static', paymentMethods, storeId, ...storeMeta });
    }

    const menu = {};
    ORDER.forEach(cat => { menu[cat] = []; });
    products.forEach(p => {
      if (menu[p.category] !== undefined) {
        menu[p.category].push({ ...p, desc: p.description });
      }
    });

    return res.status(200).json({ source: 'blob', menu, paymentMethods, storeId, ...storeMeta });
  } catch (e) {
    return res.status(200).json({ source: 'static', paymentMethods: { pix_online: true } });
  }
}
