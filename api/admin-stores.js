import { verifyAdminToken } from './_verify.js';
import { sb } from './_supabase.js';

export default async function handler(req, res) {
  if (!verifyAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  // GET — list all stores
  if (req.method === 'GET') {
    const { data, error } = await sb().from('stores').select('*, store_settings(payment_methods, tracking)').order('created_at');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ stores: data || [] });
  }

  // POST — create store
  if (req.method === 'POST') {
    const { name, slug, logo_url } = req.body || {};
    if (!name || !slug) return res.status(400).json({ error: 'name and slug required' });
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const { data: store, error } = await sb().from('stores').insert({ name, slug: cleanSlug, logo_url: logo_url || '' }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    // Create default settings
    await sb().from('store_settings').insert({ store_id: store.id });
    return res.status(200).json({ ok: true, store });
  }

  // PATCH — update store (name, logo_url)
  if (req.method === 'PATCH') {
    const { id, name, logo_url } = req.body || {};
    if (!id) return res.status(400).json({ error: 'missing id' });
    const updates = {};
    if (name      !== undefined) updates.name     = name;
    if (logo_url  !== undefined) updates.logo_url = logo_url;
    const { error } = await sb().from('stores').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // DELETE — deactivate store
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'missing id' });
    await sb().from('stores').update({ active: false }).eq('id', id);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
