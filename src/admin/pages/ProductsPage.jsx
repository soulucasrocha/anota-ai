import { useState, useEffect, useRef } from 'react';
import { STEP_TPL } from '../../data/menu';

const SUPABASE_URL = 'https://tdbhqynyzejshhxrzfzj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkYmhxeW55emVqc2hoeHJ6ZnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTI3NjQsImV4cCI6MjA4OTk4ODc2NH0.vajQ3GN5E15QTtDDn67BtT94G0BD38knspfxBo6UVTE';

async function uploadImage(file, folder = 'misc') {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/menu-images/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SUPABASE_ANON}`, 'Content-Type': file.type || 'image/jpeg', 'x-upsert': 'true' },
    body: file,
  });
  if (!r.ok) throw new Error('Upload falhou');
  return `${SUPABASE_URL}/storage/v1/object/public/menu-images/${path}`;
}

function ImgUpload({ value, onChange, folder = 'misc', label = 'Foto' }) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef(null);

  async function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try { onChange(await uploadImage(f, folder)); }
    catch { alert('Erro ao enviar imagem. Verifique o tamanho (máx 5MB) e tente novamente.'); }
    setUploading(false);
    e.target.value = '';
  }

  return (
    <div>
      <label className="adm-label">{label}</label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {value ? (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src={value} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
              onError={e => { e.target.style.display = 'none'; }} />
            <button onClick={() => onChange('')}
              style={{ position: 'absolute', top: -7, right: -7, border: 'none', background: '#ef4444', color: '#fff', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.25)' }}>
              ×
            </button>
          </div>
        ) : (
          <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: '1px dashed #d1d5db', flexShrink: 0 }}>🖼️</div>
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" className="adm-btn ghost" style={{ fontSize: 12, alignSelf: 'flex-start' }}
            onClick={() => ref.current?.click()} disabled={uploading}>
            {uploading ? '⏳ Enviando...' : '📷 Escolher foto'}
          </button>
          <input className="adm-input" placeholder="Ou cole URL da imagem" value={value || ''} onChange={e => onChange(e.target.value)} style={{ fontSize: 12 }} />
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

function fmtMoney(cents) { return 'R$ ' + (cents / 100).toFixed(2).replace('.', ','); }
function genId() { return 'cat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7); }

const DEFAULT_CATS = [
  { id: 'destaques',  name: 'Destaques',       description: '', img: '' },
  { id: 'combos',     name: 'Combos',           description: '', img: '' },
  { id: 'minicombos', name: 'Mini Combos',      description: '', img: '' },
  { id: 'trio',       name: 'Trio Pizza',       description: '', img: '' },
  { id: 'salgadas',   name: 'Pizzas Variadas',  description: '', img: '' },
  { id: 'metade',     name: 'Pizza Metade',     description: '', img: '' },
  { id: 'dividas',    name: 'Dividas',          description: '', img: '' },
  { id: 'doces',      name: 'Pizzas Doces',     description: '', img: '' },
  { id: 'bebidas',    name: 'Refrigerantes',    description: '', img: '' },
  { id: 'adicionais', name: 'Adicionais',       description: '', img: '' },
].map((c, i) => ({ ...c, sort_order: i }));

const EMPTY_PRODUCT = {
  id: '', name: '', description: '', price: '', oldPrice: '', tag: '', img: '', active: true,
  category: '', subproducts: [], subproduct_limit: 0,
};
const EMPTY_CATEGORY = { id: '', name: '', description: '', img: '', sort_order: 0 };

export default function ProductsPage({ token, storeId }) {
  const [categories, setCategories] = useState([]);
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [toggling,   setToggling]   = useState(null);

  // Drag-and-drop state
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);   // product id hovered
  const [dragOverCat, setDragOverCat] = useState(null); // category id hovered (empty zone)

  const [minOrder,  setMinOrder]  = useState('');
  const [savingMin, setSavingMin] = useState(false);
  const [savedMin,  setSavedMin]  = useState(false);

  const [catForm,   setCatForm]   = useState(null);
  const [savingCat, setSavingCat] = useState(false);

  const [prodForm, setProdForm] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  // ── Fetch all ──────────────────────────────────────────────────────────
  function fetchAll() {
    if (!storeId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/admin-products?storeId=${storeId}`, { headers: { 'x-admin-token': token } }).then(r => r.json()),
      fetch(`/api/admin-products?type=categories&storeId=${storeId}`, { headers: { 'x-admin-token': token } }).then(r => r.json()),
      fetch(`/api/admin-products?type=delivery&storeId=${storeId}`, { headers: { 'x-admin-token': token } }).then(r => r.json()),
    ]).then(async ([prodData, catData, delData]) => {
      const prods = prodData.products || [];
      let cats = (catData.categories || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      if (cats.length === 0) {
        cats = DEFAULT_CATS;
        await fetch(`/api/admin-products?type=categories&storeId=${storeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
          body: JSON.stringify({ categories: cats }),
        });
      }

      setProducts(prods);
      setCategories(cats);
      const raw = delData.delivery?.min_order;
      setMinOrder(raw != null && raw > 0 ? String(raw / 100) : '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => { fetchAll(); }, [token, storeId]);

  // ── Min order ──────────────────────────────────────────────────────────
  async function saveMinOrder() {
    setSavingMin(true);
    await fetch('/api/admin-products?type=delivery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token, 'x-store-id': storeId },
      body: JSON.stringify({ delivery: { min_order: minOrder !== '' ? Math.round(Number(minOrder) * 100) : 0 } }),
    });
    setSavingMin(false); setSavedMin(true); setTimeout(() => setSavedMin(false), 2000);
  }

  // ── Categories persistence ─────────────────────────────────────────────
  async function persistCategories(newCats) {
    setCategories(newCats);
    await fetch(`/api/admin-products?type=categories&storeId=${storeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ categories: newCats }),
    });
  }

  function moveCat(idx, dir) {
    const arr = [...categories];
    const to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    arr.forEach((c, i) => { c.sort_order = i; });
    persistCategories(arr);
  }

  function openNewCat() { setCatForm({ ...EMPTY_CATEGORY, id: genId(), sort_order: categories.length }); }
  function openEditCat(cat) { setCatForm({ ...cat, img: cat.img || '' }); }

  async function saveCat() {
    if (!catForm.name.trim()) return;
    setSavingCat(true);
    const exists = categories.find(c => c.id === catForm.id);
    let newCats;
    if (exists) {
      newCats = categories.map(c => c.id === catForm.id ? { ...catForm, sort_order: c.sort_order } : c);
    } else {
      newCats = [...categories, { ...catForm, sort_order: categories.length }];
    }
    await persistCategories(newCats);
    setSavingCat(false);
    setCatForm(null);
    showToast('✅ Categoria salva!');
  }

  async function duplicateCat(cat) {
    const newCat = { ...cat, id: genId(), name: cat.name + ' (Cópia)', sort_order: categories.length };
    await persistCategories([...categories, newCat]);
    showToast('✅ Categoria duplicada!');
  }

  async function deleteCat(catId) {
    if (!confirm('Remover esta categoria? Os produtos dela ficam sem categoria.')) return;
    const newCats = categories.filter(c => c.id !== catId).map((c, i) => ({ ...c, sort_order: i }));
    await persistCategories(newCats);
    showToast('🗑️ Categoria removida');
  }

  // ── Products CRUD ──────────────────────────────────────────────────────
  function openNewProduct(catId) { setProdForm({ ...EMPTY_PRODUCT, id: genId(), category: catId }); }

  function openEditProduct(p) {
    setProdForm({
      id:               p.id,
      name:             p.name || '',
      description:      p.desc || p.description || '',
      price:            p.price ? (p.price / 100).toFixed(2) : '',
      oldPrice:         p.old_price ? (p.old_price / 100).toFixed(2) : (p.oldPrice ? (p.oldPrice / 100).toFixed(2) : ''),
      tag:              p.tag || '',
      img:              p.img || '',
      active:           p.active !== false,
      category:         p.category || '',
      subproducts:      (() => {
        const raw = Array.isArray(p.subproducts) ? p.subproducts : [];
        // If already has groups, use them
        if (raw.length > 0 && raw[0]?.__type === 'group') return raw;
        // Auto-convert old flat format to group format
        if (raw.length > 0) {
          return [{ id: genId(), __type: 'group', title: 'Opções', subtitle: '', required: p.subproduct_limit || 0, options: raw.map(sp => ({ ...sp, img: sp.img || '' })) }];
        }
        // No subproducts: import from static steps (excluding 'notes')
        const stepKeys = (Array.isArray(p.steps) ? p.steps : []).filter(k => k !== 'notes' && STEP_TPL[k]);
        return stepKeys.map(k => {
          const tpl = STEP_TPL[k];
          return {
            id: genId(), __type: 'group',
            title: tpl.title || '',
            subtitle: tpl.subtitle || '',
            required: tpl.required || 0,
            options: (tpl.options || []).map(o => ({ id: o.id, name: o.name, description: o.desc || '', img: o.img || '' })),
          };
        });
      })(),
      subproduct_limit: 0,
    });
  }

  async function saveProd() {
    if (!prodForm.name.trim() || !prodForm.price) { showToast('❌ Nome e preço são obrigatórios'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin-products?storeId=${storeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({
          storeId,
          id:               prodForm.id,
          category:         prodForm.category,
          name:             prodForm.name,
          desc:             prodForm.description,
          price:            prodForm.price,
          oldPrice:         prodForm.oldPrice || undefined,
          tag:              prodForm.tag || undefined,
          img:              prodForm.img || '',
          active:           prodForm.active,
          subproducts:      prodForm.subproducts || [],
          subproduct_limit: prodForm.subproduct_limit || 0,
        }),
      });
      const data = await res.json();
      if (data.ok) { showToast('✅ Produto salvo!'); setProdForm(null); fetchAll(); }
      else showToast('❌ ' + (data.error || 'Erro ao salvar'));
    } catch { showToast('❌ Erro de conexão'); }
    setSaving(false);
  }

  async function duplicateProd(p) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin-products?storeId=${storeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({
          storeId, id: genId(), category: p.category,
          name: p.name + ' (Cópia)',
          desc: p.desc || p.description || '',
          price: (p.price / 100).toFixed(2),
          oldPrice: p.old_price ? (p.old_price / 100).toFixed(2) : undefined,
          tag: p.tag || undefined, img: p.img || '',
          active: p.active,
          subproducts: p.subproducts || [],
          subproduct_limit: p.subproduct_limit || 0,
        }),
      });
      const data = await res.json();
      if (data.ok) { showToast('✅ Produto duplicado!'); fetchAll(); }
      else showToast('❌ Erro ao duplicar');
    } catch { showToast('❌ Erro de conexão'); }
    setSaving(false);
  }

  async function deleteProd(id) {
    if (!confirm('Remover este produto?')) return;
    await fetch(`/api/admin-products?id=${id}&storeId=${storeId}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
    setProducts(prev => prev.filter(x => x.id !== id));
    showToast('🗑️ Produto removido');
  }

  async function toggleActive(p) {
    setToggling(p.id);
    const newActive = p.active !== false ? false : true;
    try {
      await fetch(`/api/admin-products?storeId=${storeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({
          storeId, id: p.id, category: p.category, name: p.name,
          desc: p.desc || p.description || '', price: (p.price / 100).toFixed(2),
          img: p.img || '', active: newActive,
          subproducts: p.subproducts || [], subproduct_limit: p.subproduct_limit || 0,
        }),
      });
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: newActive } : x));
    } catch { showToast('❌ Erro ao atualizar'); }
    setToggling(null);
  }

  // ── Drag-and-drop ─────────────────────────────────────────────────────
  function handleDragStart(e, prod) {
    setDraggingId(prod.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', prod.id);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
    setDragOverCat(null);
  }

  function handleDragOverProd(e, prod) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (prod.id !== draggingId) {
      setDragOverId(prod.id);
      setDragOverCat(null);
    }
  }

  function handleDragOverCatZone(e, catId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCat(catId);
    setDragOverId(null);
  }

  async function handleDrop(e, targetProdId, targetCatId) {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    setDragOverCat(null);

    if (!sourceId || sourceId === targetProdId) return;

    const dragged = products.find(p => p.id === sourceId);
    if (!dragged) return;

    const fromCatId = dragged.category;
    const toCatId = targetCatId;
    const sameCategory = fromCatId === toCatId;
    let newProducts = [...products];
    let reorderPayload = [];

    if (sameCategory) {
      const catProds = newProducts.filter(p => p.category === fromCatId).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const fromIdx = catProds.findIndex(p => p.id === sourceId);
      const toIdx = targetProdId ? catProds.findIndex(p => p.id === targetProdId) : catProds.length - 1;
      if (fromIdx === toIdx || toIdx === -1) return;
      const reordered = [...catProds];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      reorderPayload = reordered.map((p, i) => ({ id: p.id, sort_order: i }));
      newProducts = newProducts.map(p => { const r = reorderPayload.find(r => r.id === p.id); return r ? { ...p, sort_order: r.sort_order } : p; });
    } else {
      // Change category of dragged product
      newProducts = newProducts.map(p => p.id === sourceId ? { ...p, category: toCatId } : p);
      // Reorder source (without dragged)
      const srcProds = newProducts.filter(p => p.category === fromCatId).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      // Reorder target (insert dragged at position)
      const tgtProds = newProducts.filter(p => p.category === toCatId).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const withoutDragged = tgtProds.filter(p => p.id !== sourceId);
      const insertAt = targetProdId ? withoutDragged.findIndex(p => p.id === targetProdId) : withoutDragged.length;
      withoutDragged.splice(insertAt >= 0 ? insertAt : withoutDragged.length, 0, { ...dragged, category: toCatId });
      const srcReorder = srcProds.map((p, i) => ({ id: p.id, sort_order: i }));
      const tgtReorder = withoutDragged.map((p, i) => ({ id: p.id, sort_order: i }));
      reorderPayload = [...srcReorder, ...tgtReorder];
      newProducts = newProducts.map(p => { const r = reorderPayload.find(r => r.id === p.id); return r ? { ...p, sort_order: r.sort_order } : p; });
    }

    setProducts(newProducts);

    // Persist category change first (if cross-category)
    if (!sameCategory) {
      await fetch(`/api/admin-products?storeId=${storeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({
          storeId, id: dragged.id, category: toCatId, name: dragged.name,
          desc: dragged.desc || dragged.description || '',
          price: (dragged.price / 100).toFixed(2),
          oldPrice: dragged.old_price ? (dragged.old_price / 100).toFixed(2) : undefined,
          tag: dragged.tag || undefined, img: dragged.img || '',
          active: dragged.active, subproducts: dragged.subproducts || [],
          subproduct_limit: dragged.subproduct_limit || 0,
        }),
      });
    }
    // Persist sort_orders
    if (reorderPayload.length > 0) {
      await fetch(`/api/admin-products?storeId=${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ reorder: reorderPayload }),
      });
    }
  }

  // ── Product reorder (buttons) ──────────────────────────────────────────
  async function moveProd(catId, prodIdx, dir) {
    const catProds = products.filter(p => p.category === catId);
    const toIdx = prodIdx + dir;
    if (toIdx < 0 || toIdx >= catProds.length) return;

    // Swap sort_order values
    const a = catProds[prodIdx];
    const b = catProds[toIdx];
    const newSortA = b.sort_order ?? toIdx;
    const newSortB = a.sort_order ?? prodIdx;

    // Optimistic update in state
    setProducts(prev => prev.map(p => {
      if (p.id === a.id) return { ...p, sort_order: newSortA };
      if (p.id === b.id) return { ...p, sort_order: newSortB };
      return p;
    }));

    // Persist to DB
    await fetch(`/api/admin-products?storeId=${storeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ reorder: [{ id: a.id, sort_order: newSortA }, { id: b.id, sort_order: newSortB }] }),
    });
  }

  // ── Option-groups (steps) helpers ─────────────────────────────────────
  function addGroup() {
    const g = { id: genId(), __type: 'group', title: '', subtitle: '', required: 0, options: [] };
    setProdForm(f => ({ ...f, subproducts: [...(f.subproducts || []), g] }));
  }
  function updateGroup(gi, field, val) {
    setProdForm(f => { const gs = [...(f.subproducts || [])]; gs[gi] = { ...gs[gi], [field]: val }; return { ...f, subproducts: gs }; });
  }
  function removeGroup(gi) {
    setProdForm(f => ({ ...f, subproducts: (f.subproducts || []).filter((_, i) => i !== gi) }));
  }
  function moveGroup(gi, dir) {
    setProdForm(f => {
      const gs = [...(f.subproducts || [])]; const to = gi + dir;
      if (to < 0 || to >= gs.length) return f;
      [gs[gi], gs[to]] = [gs[to], gs[gi]]; return { ...f, subproducts: gs };
    });
  }
  function addOption(gi) {
    setProdForm(f => { const gs = [...(f.subproducts || [])]; gs[gi] = { ...gs[gi], options: [...(gs[gi].options || []), { id: genId(), name: '', description: '', img: '' }] }; return { ...f, subproducts: gs }; });
  }
  function updateOption(gi, oi, field, val) {
    setProdForm(f => { const gs = [...(f.subproducts || [])]; const opts = [...(gs[gi].options || [])]; opts[oi] = { ...opts[oi], [field]: val }; gs[gi] = { ...gs[gi], options: opts }; return { ...f, subproducts: gs }; });
  }
  function removeOption(gi, oi) {
    setProdForm(f => { const gs = [...(f.subproducts || [])]; gs[gi] = { ...gs[gi], options: (gs[gi].options || []).filter((_, i) => i !== oi) }; return { ...f, subproducts: gs }; });
  }
  function moveOption(gi, oi, dir) {
    setProdForm(f => { const gs = [...(f.subproducts || [])]; const opts = [...(gs[gi].options || [])]; const to = oi + dir; if (to < 0 || to >= opts.length) return f; [opts[oi], opts[to]] = [opts[to], opts[oi]]; gs[gi] = { ...gs[gi], options: opts }; return { ...f, subproducts: gs }; });
  }

  if (loading) return <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Carregando cardápio...</div>;

  const catIds = new Set(categories.map(c => c.id));
  const orphans = products.filter(p => !catIds.has(p.category));

  return (
    <>
      {toast && <div className="adm-toast">{toast}</div>}

      {/* ── Category modal ───────────────────────────────────────────── */}
      {catForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 460, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 18px', fontSize: 17 }}>
              {categories.find(c => c.id === catForm.id) ? '✏️ Editar Categoria' : '➕ Nova Categoria'}
            </h3>

            <label className="adm-label">Nome da categoria *</label>
            <input className="adm-input" placeholder="Ex: Pizzas Salgadas" value={catForm.name}
              onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} style={{ marginBottom: 14 }} autoFocus />

            <label className="adm-label">Descrição (opcional)</label>
            <textarea className="adm-input" placeholder="Ex: Nossas pizzas mais pedidas" value={catForm.description}
              onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))}
              style={{ minHeight: 56, marginBottom: 14, resize: 'vertical' }} />

            <ImgUpload value={catForm.img || ''} onChange={v => setCatForm(f => ({ ...f, img: v }))} folder="categorias" label="Foto da categoria (opcional)" />

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="adm-btn primary" onClick={saveCat} disabled={savingCat || !catForm.name.trim()}>
                {savingCat ? 'Salvando...' : '💾 Salvar'}
              </button>
              <button className="adm-btn ghost" onClick={() => setCatForm(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Product side-panel ───────────────────────────────────────── */}
      {prodForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}>
          <div style={{ background: '#fff', width: 520, maxWidth: '96vw', height: '100%', overflowY: 'auto', padding: '20px 24px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                {products.find(p => p.id === prodForm.id) ? '✏️ Editar Produto' : '➕ Novo Produto'}
              </h3>
              <button onClick={() => setProdForm(null)} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>✕</button>
            </div>

            <div>
              <label className="adm-label">Categoria</label>
              <select className="adm-input" value={prodForm.category} onChange={e => setProdForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">— Sem categoria —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="adm-label">Nome do produto *</label>
              <input className="adm-input" placeholder="Ex: Pizza Calabresa 35cm"
                value={prodForm.name} onChange={e => setProdForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div>
              <label className="adm-label">Descrição (opcional)</label>
              <textarea className="adm-input" placeholder="Ex: Molho, Muçarela, Calabresa, Orégano"
                value={prodForm.description} onChange={e => setProdForm(f => ({ ...f, description: e.target.value }))}
                style={{ minHeight: 54, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="adm-label">Preço (R$) *</label>
                <input className="adm-input" type="number" step="0.01" min="0" placeholder="24.99"
                  value={prodForm.price} onChange={e => setProdForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="adm-label">Preço "de" (R$)</label>
                <input className="adm-input" type="number" step="0.01" min="0" placeholder="Opcional"
                  value={prodForm.oldPrice} onChange={e => setProdForm(f => ({ ...f, oldPrice: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="adm-label">Tag de promoção</label>
              <input className="adm-input" placeholder="Ex: 32% OFF, NOVO, DESTAQUE"
                value={prodForm.tag} onChange={e => setProdForm(f => ({ ...f, tag: e.target.value }))} />
            </div>

            <ImgUpload value={prodForm.img} onChange={v => setProdForm(f => ({ ...f, img: v }))} folder="produtos" label="Foto do produto" />

            <div>
              <label className="adm-label">Status</label>
              <select className="adm-input" value={prodForm.active ? 'true' : 'false'}
                onChange={e => setProdForm(f => ({ ...f, active: e.target.value === 'true' }))}>
                <option value="true">✅ Ativo (visível no cardápio)</option>
                <option value="false">❌ Inativo (oculto)</option>
              </select>
            </div>

            {/* ── Grupos de Opções (Steps) ── */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginTop: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e2740' }}>📋 Grupos de Opções</h4>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>Ex: "Escolha os sabores", "Escolha o refrigerante"</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid #d1d5db', color: '#374151', cursor: 'pointer', background: '#fff' }}
                    value=""
                    onChange={e => {
                      const key = e.target.value;
                      if (!key || !STEP_TPL[key]) return;
                      const tpl = STEP_TPL[key];
                      const group = {
                        id: genId(), __type: 'group',
                        title: tpl.title || '',
                        subtitle: tpl.subtitle || '',
                        required: tpl.required || 0,
                        options: (tpl.options || []).map(o => ({ id: o.id, name: o.name, description: o.desc || '', img: o.img || '' })),
                      };
                      setProdForm(f => ({ ...f, subproducts: [...(f.subproducts || []), group] }));
                    }}
                  >
                    <option value="">↓ Importar</option>
                    <option value="salgadas2">2 Pizzas Salgadas</option>
                    <option value="salgadas3">3 Pizzas Salgadas</option>
                    <option value="salgadas4">4 Pizzas Salgadas</option>
                    <option value="doce1">1 Pizza Doce</option>
                    <option value="refri1">1 Refrigerante</option>
                    <option value="refri2">2 Refrigerantes</option>
                  </select>
                  <button className="adm-btn primary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={addGroup}>+ Grupo</button>
                </div>
              </div>

              {(prodForm.subproducts || []).length === 0 ? (
                <div style={{ color: '#bbb', fontSize: 13, textAlign: 'center', padding: '16px 0', border: '1px dashed #e5e7eb', borderRadius: 8, marginTop: 10 }}>
                  Nenhum grupo. Clique em "+ Grupo" para adicionar.
                </div>
              ) : (
                (prodForm.subproducts || []).map((grp, gi) => (
                  <div key={grp.id || gi} style={{ marginTop: 12, border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                    {/* Group header */}
                    <div style={{ background: '#f8faff', padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input className="adm-input" placeholder="Título do grupo *  (Ex: Escolha os sabores:)"
                          value={grp.title || ''} onChange={e => updateGroup(gi, 'title', e.target.value)} style={{ marginBottom: 0, fontWeight: 600 }} />
                        <input className="adm-input" placeholder="Subtítulo  (Ex: Escolha 3 sabores)"
                          value={grp.subtitle || ''} onChange={e => updateGroup(gi, 'subtitle', e.target.value)} style={{ marginBottom: 0 }} />
                      </div>
                      {/* Required + actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'nowrap' }}>Qtd. obrig.</span>
                        <input className="adm-input" type="number" min="0" style={{ width: 56, textAlign: 'center', padding: '4px 6px' }}
                          value={grp.required || 0} onChange={e => updateGroup(gi, 'required', parseInt(e.target.value) || 0)} />
                        <span style={{ fontSize: 10, color: grp.required > 0 ? '#dc2626' : '#10b981' }}>
                          {grp.required > 0 ? `Obrig. ${grp.required}` : 'Opcional'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                        <button onClick={() => moveGroup(gi, -1)} disabled={gi === 0} style={{ border: '1px solid #e5e7eb', background: gi===0?'#f3f4f6':'#fff', borderRadius: 4, cursor: gi===0?'default':'pointer', fontSize: 11, padding: '2px 6px', color: gi===0?'#ccc':'#555' }}>↑</button>
                        <button onClick={() => moveGroup(gi, 1)} disabled={gi === (prodForm.subproducts||[]).length-1} style={{ border: '1px solid #e5e7eb', background: gi===(prodForm.subproducts||[]).length-1?'#f3f4f6':'#fff', borderRadius: 4, cursor: gi===(prodForm.subproducts||[]).length-1?'default':'pointer', fontSize: 11, padding: '2px 6px', color: gi===(prodForm.subproducts||[]).length-1?'#ccc':'#555' }}>↓</button>
                        <button onClick={() => removeGroup(gi)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>🗑️</button>
                      </div>
                    </div>

                    {/* Options list */}
                    <div style={{ padding: '8px 12px 12px' }}>
                      {(grp.options || []).length === 0 ? (
                        <div style={{ color: '#bbb', fontSize: 12, textAlign: 'center', padding: '10px 0' }}>Nenhuma opção ainda.</div>
                      ) : (
                        (grp.options || []).map((opt, oi) => (
                          <div key={opt.id || oi} style={{ marginBottom: 8, background: '#f9fafb', borderRadius: 8, padding: 8, border: '1px solid #f0f0f0' }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <input className="adm-input" placeholder="Nome da opção *  (Ex: Muçarela)"
                                  value={opt.name || ''} onChange={e => updateOption(gi, oi, 'name', e.target.value)} style={{ marginBottom: 0 }} />
                                <input className="adm-input" placeholder="Descrição (Ex: Molho, Muçarela, Tomate)"
                                  value={opt.description || ''} onChange={e => updateOption(gi, oi, 'description', e.target.value)} style={{ marginBottom: 0 }} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                                <button onClick={() => moveOption(gi, oi, -1)} disabled={oi === 0} style={{ border: '1px solid #e5e7eb', background: oi===0?'#f3f4f6':'#fff', borderRadius: 4, cursor: oi===0?'default':'pointer', fontSize: 10, padding: '2px 5px', color: oi===0?'#ccc':'#555' }}>↑</button>
                                <button onClick={() => moveOption(gi, oi, 1)} disabled={oi === (grp.options||[]).length-1} style={{ border: '1px solid #e5e7eb', background: oi===(grp.options||[]).length-1?'#f3f4f6':'#fff', borderRadius: 4, cursor: oi===(grp.options||[]).length-1?'default':'pointer', fontSize: 10, padding: '2px 5px', color: oi===(grp.options||[]).length-1?'#ccc':'#555' }}>↓</button>
                                <button onClick={() => removeOption(gi, oi)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: '1px 3px' }}>×</button>
                              </div>
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <ImgUpload value={opt.img || ''} onChange={v => updateOption(gi, oi, 'img', v)} folder="opcoes" label="Foto (opcional)" />
                            </div>
                          </div>
                        ))
                      )}
                      <button className="adm-btn ghost" style={{ fontSize: 12, marginTop: 4, width: '100%' }} onClick={() => addOption(gi)}>
                        + Adicionar opção
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid #e5e7eb', marginTop: 4 }}>
              <button className="adm-btn primary" onClick={saveProd} disabled={saving}>
                {saving ? 'Salvando...' : '💾 Salvar Produto'}
              </button>
              <button className="adm-btn ghost" onClick={() => setProdForm(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Min order ────────────────────────────────────────────────── */}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-header"><h3>💰 Pedido Mínimo</h3></div>
        <div className="adm-card-body" style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="adm-label">Valor mínimo do pedido (R$)</label>
            <input className="adm-input" type="number" min="0" step="0.01"
              placeholder="Ex: 20.00  (deixe vazio para sem mínimo)"
              value={minOrder} onChange={e => setMinOrder(e.target.value)} />
            <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>O cliente só pode avançar acima deste valor.</p>
          </div>
          <button className="adm-btn primary" onClick={saveMinOrder} disabled={savingMin} style={{ whiteSpace: 'nowrap', marginBottom: 22 }}>
            {savingMin ? 'Salvando...' : savedMin ? '✅ Salvo!' : '💾 Salvar'}
          </button>
        </div>
      </div>

      {/* ── Categories toolbar ───────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#1e2740', fontWeight: 700 }}>
          📋 Categorias
          <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 13, marginLeft: 6 }}>({categories.length})</span>
        </h3>
        <button className="adm-btn primary" onClick={openNewCat}>+ Nova Categoria</button>
      </div>

      {/* ── Category + products (always expanded) ────────────────────── */}
      {categories.map((cat, idx) => {
        const catProducts = products.filter(p => p.category === cat.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        return (
          <div key={cat.id} className="adm-card" style={{ marginBottom: 14 }}>
            {/* Category header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid #f3f4f6' }}>
              {/* Reorder */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <button onClick={() => moveCat(idx, -1)} disabled={idx === 0}
                  style={{ border: '1px solid #e5e7eb', background: idx===0?'#f3f4f6':'#fff', borderRadius: 4, cursor: idx===0?'default':'pointer', fontSize: 11, padding: '2px 6px', color: idx===0?'#ccc':'#555', lineHeight: 1 }}>↑</button>
                <button onClick={() => moveCat(idx, 1)} disabled={idx === categories.length-1}
                  style={{ border: '1px solid #e5e7eb', background: idx===categories.length-1?'#f3f4f6':'#fff', borderRadius: 4, cursor: idx===categories.length-1?'default':'pointer', fontSize: 11, padding: '2px 6px', color: idx===categories.length-1?'#ccc':'#555', lineHeight: 1 }}>↓</button>
              </div>

              {/* Category image */}
              {cat.img
                ? <img src={cat.img} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 7, flexShrink: 0, border: '1px solid #e5e7eb' }} onError={e => { e.target.style.display='none'; }} />
                : <div style={{ width: 40, height: 40, background: '#f3f4f6', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📋</div>
              }

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1e2740' }}>{cat.name}</div>
                {cat.description && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{cat.description}</div>}
              </div>

              {/* Count */}
              <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>
                {catProducts.length} produto{catProducts.length !== 1 ? 's' : ''}
              </span>

              {/* Actions */}
              <button className="adm-btn ghost" style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }} onClick={() => openEditCat(cat)}>✏️</button>
              <button className="adm-btn ghost" style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }} title="Duplicar categoria" onClick={() => duplicateCat(cat)}>⧉</button>
              <button className="adm-btn danger" style={{ padding: '4px 8px', fontSize: 12, flexShrink: 0 }} onClick={() => deleteCat(cat.id)}>🗑️</button>
              <button className="adm-btn primary" style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }} onClick={() => openNewProduct(cat.id)}>+ Produto</button>
            </div>

            {/* Product rows — drop zone for the whole list */}
            <div
              style={{ padding: catProducts.length ? '4px 14px 8px' : '0 14px', minHeight: draggingId ? 48 : undefined, transition: 'background .15s', background: dragOverCat === cat.id ? '#eff6ff' : undefined, borderRadius: dragOverCat === cat.id ? '0 0 10px 10px' : undefined }}
              onDragOver={e => handleDragOverCatZone(e, cat.id)}
              onDrop={e => handleDrop(e, null, cat.id)}
            >
              {catProducts.length === 0 ? (
                <div style={{ color: dragOverCat === cat.id ? '#3b82f6' : '#bbb', fontSize: 13, textAlign: 'center', padding: '14px 0', border: dragOverCat === cat.id ? '2px dashed #3b82f6' : '2px dashed transparent', borderRadius: 8, transition: 'all .15s' }}>
                  {dragOverCat === cat.id ? '⬇️ Soltar aqui' : <>Nenhum produto.{' '}<button className="adm-btn ghost" style={{ fontSize: 12, padding: '3px 10px' }} onClick={() => openNewProduct(cat.id)}>+ Adicionar</button></>}
                </div>
              ) : (
                catProducts.map((p, pi) => {
                  const isActive = p.active !== false;
                  const isDragging = draggingId === p.id;
                  const isOver = dragOverId === p.id;
                  return (
                    <div key={p.id}
                      draggable
                      onDragStart={e => handleDragStart(e, p)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => handleDragOverProd(e, p)}
                      onDrop={e => handleDrop(e, p.id, cat.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f9fafb', opacity: isDragging ? 0.35 : 1, borderTop: isOver ? '2px solid #3b82f6' : '2px solid transparent', cursor: 'grab', transition: 'opacity .15s, border-color .1s', background: isOver ? '#f0f7ff' : undefined }}>
                      {/* Drag handle + reorder buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                        <span style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1, cursor: 'grab', userSelect: 'none' }} title="Arraste para mover">⠿</span>
                        <button onClick={() => moveProd(cat.id, pi, -1)} disabled={pi === 0}
                          style={{ border: '1px solid #e5e7eb', background: pi===0?'#f3f4f6':'#fff', borderRadius: 4, cursor: pi===0?'default':'pointer', fontSize: 10, padding: '1px 5px', color: pi===0?'#ccc':'#555', lineHeight: 1 }}>↑</button>
                        <button onClick={() => moveProd(cat.id, pi, 1)} disabled={pi === catProducts.length-1}
                          style={{ border: '1px solid #e5e7eb', background: pi===catProducts.length-1?'#f3f4f6':'#fff', borderRadius: 4, cursor: pi===catProducts.length-1?'default':'pointer', fontSize: 10, padding: '1px 5px', color: pi===catProducts.length-1?'#ccc':'#555', lineHeight: 1 }}>↓</button>
                      </div>
                      {p.img
                        ? <img src={p.img} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 7, flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                        : <div style={{ width: 48, height: 48, background: '#f3f4f6', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🍕</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: isActive ? '#1e2740' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        {p.desc && <div style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.desc}</div>}
                        {(p.subproducts || []).length > 0 && (
                          <div style={{ fontSize: 11, color: '#8b5cf6', marginTop: 1 }}>
                            📦 {p.subproducts.length} sub-produto{p.subproducts.length!==1?'s':''}
                            {p.subproduct_limit > 0 ? ` · máx ${p.subproduct_limit}` : ''}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981', flexShrink: 0 }}>{fmtMoney(p.price)}</span>
                      <button onClick={() => toggleActive(p)} disabled={toggling === p.id} title={isActive ? 'Desativar' : 'Ativar'}
                        style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: isActive ? '#10b981' : '#d1d5db', position: 'relative', transition: 'background .2s', flexShrink: 0, opacity: toggling === p.id ? 0.6 : 1 }}>
                        <span style={{ position: 'absolute', top: 2, left: isActive ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', display: 'block', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                      </button>
                      <button className="adm-btn ghost" style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }} onClick={() => openEditProduct(p)}>✏️</button>
                      <button className="adm-btn ghost" style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }} title="Duplicar produto" onClick={() => duplicateProd(p)}>⧉</button>
                      <button className="adm-btn danger" style={{ padding: '4px 8px', fontSize: 12, flexShrink: 0 }} onClick={() => deleteProd(p.id)}>🗑️</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}

      {/* ── Orphan products ───────────────────────────────────────────── */}
      {orphans.length > 0 && (
        <div className="adm-card" style={{ marginBottom: 10, borderLeft: '3px solid #f59e0b' }}>
          <div style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13, color: '#92400e', background: '#fffbeb', borderRadius: '8px 8px 0 0' }}>
            ⚠️ Produtos sem categoria ({orphans.length}) — edite para atribuir uma categoria
          </div>
          <div style={{ padding: '4px 14px 12px' }}>
            {orphans.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e2740' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#f59e0b' }}>categoria: {p.category || '(nenhuma)'}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981', flexShrink: 0 }}>{fmtMoney(p.price)}</span>
                <button className="adm-btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openEditProduct(p)}>✏️</button>
                <button className="adm-btn danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => deleteProd(p.id)}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
