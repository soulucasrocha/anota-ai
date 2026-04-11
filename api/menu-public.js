import { sb, getStoreBySlug } from './_supabase.js';

// Fallback order when no categories configured in store_settings
const DEFAULT_ORDER = ['destaques','combos','minicombos','trio','salgadas','metade','dividas','doces','bebidas','adicionais'];

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
      const { data } = await sb().from('stores').select('id').eq('active', true).limit(1).maybeSingle();
      storeId = data?.id;
    }
    if (!storeId) return res.status(200).json({ source: 'static', paymentMethods: { pix_online: true } });

    // Get store info + settings + products in parallel
    const [{ data: storeInfo }, { data: settings }, { data: products }, { data: trackingRow }] = await Promise.all([
      sb().from('stores').select('name, logo_url, whatsapp, hours').eq('id', storeId).maybeSingle(),
      sb().from('store_settings').select('payment_methods, delivery, categories').eq('store_id', storeId).maybeSingle(),
      sb().from('products').select('id,category,name,description,price,old_price,tag,img,active,sold_out,steps,subproducts,subproduct_limit,sort_order').eq('store_id', storeId).eq('active', true).order('sort_order').order('name'),
      sb().from('store_settings').select('tracking').eq('store_id', storeId).maybeSingle(),
    ]);

    const paymentMethods = settings?.payment_methods || { pix_online: true, card_online: false, card_delivery: false, pix_delivery: false, cash: false };
    const defaultPayment = settings?.payment_methods?._default || null;
    const delivery = settings?.delivery || {};
    const minOrder = delivery?.min_order || 0;

    // Determine category order: from store_settings if available, else fallback
    const savedCats = (settings?.categories || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const ORDER = savedCats.length > 0
      ? savedCats.map(c => c.id)
      : DEFAULT_ORDER;

    // Build categories list for the frontend nav
    const categoriesList = savedCats.length > 0
      ? savedCats.map(c => ({ id: c.id, label: c.name, description: c.description || '' }))
      : DEFAULT_ORDER.map(id => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1), description: '' }));

    const tracking = trackingRow?.tracking || {};
    const storeMeta = {
      storeName:    storeInfo?.name || '',
      storeLogoUrl: storeInfo?.logo_url || '',
      storeWhatsapp: storeInfo?.whatsapp || '',
      storeHours:   storeInfo?.hours || [],
      defaultPayment,
      minOrder,
      categories: categoriesList,
      pixelId: tracking.pixel_id || null,
      gtmId:   tracking.gtm_id   || null,
      deliveryZones:   delivery?.zones   || [],
      deliveryAddress: delivery?.address || '',
    };

    if (!products || !products.length) {
      return res.status(200).json({ source: 'static', paymentMethods, storeId, ...storeMeta });
    }

    // Build menu keyed by category, in ORDER
    const menu = {};
    ORDER.forEach(cat => { menu[cat] = []; });
    products.forEach(p => {
      if (menu[p.category] !== undefined) {
        menu[p.category].push({ ...p, desc: p.description });
      } else {
        // Product with unrecognized category: add dynamically
        menu[p.category] = [{ ...p, desc: p.description }];
      }
    });

    return res.status(200).json({ source: 'blob', menu, paymentMethods, storeId, ...storeMeta });
  } catch (e) {
    return res.status(200).json({ source: 'static', paymentMethods: { pix_online: true } });
  }
}
