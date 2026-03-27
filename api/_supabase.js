import { createClient } from '@supabase/supabase-js';

const URL  = process.env.SUPABASE_URL  || 'https://tdbhqynyzejshhxrzfzj.supabase.co';
const KEY  = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkYmhxeW55emVqc2hoeHJ6ZnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTI3NjQsImV4cCI6MjA4OTk4ODc2NH0.vajQ3GN5E15QTtDDn67BtT94G0BD38knspfxBo6UVTE';

let _client = null;
export function sb() {
  if (!_client) _client = createClient(URL, KEY);
  return _client;
}

export async function getStoreBySlug(slug) {
  const { data } = await sb().from('stores').select('id,slug,name,logo_url').eq('slug', slug).eq('active', true).maybeSingle();
  return data;
}

export async function getStoreId(req) {
  // Priority: body.storeId > query.storeId > header x-store-id > first store
  const id = req.body?.storeId || req.query?.storeId || req.headers['x-store-id'];
  if (id) return id;
  // fallback: return first active store
  const { data } = await sb().from('stores').select('id').eq('active', true).limit(1).maybeSingle();
  return data?.id || null;
}
