import { useState, useEffect } from 'react';

const CATS = ['destaques','combos','minicombos','trio','salgadas','metade','dividas','doces','bebidas','adicionais'];

function fmtMoney(cents) { return 'R$ ' + (cents / 100).toFixed(2).replace('.', ','); }

export default function ProductsPage({ token }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('list');
  const [search, setSearch]     = useState('');
  const [toast, setToast]       = useState('');
  const [saving, setSaving]     = useState(false);

  // Form state
  const [form, setForm] = useState({
    id: '', category: 'salgadas', name: '', desc: '', price: '', oldPrice: '', tag: '', img: '', active: true,
  });
  const [editId, setEditId] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function fetchProducts() {
    setLoading(true);
    fetch('/api/admin-products', { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(d => { setProducts(d.products || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { fetchProducts(); }, [token]);

  function startEdit(p) {
    setForm({
      id: p.id, category: p.category || 'salgadas', name: p.name, desc: p.desc || '',
      price: (p.price / 100).toFixed(2), oldPrice: p.oldPrice ? (p.oldPrice / 100).toFixed(2) : '',
      tag: p.tag || '', img: p.img || '', active: p.active !== false,
    });
    setEditId(p.id);
    setTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setForm({ id: '', category: 'salgadas', name: '', desc: '', price: '', oldPrice: '', tag: '', img: '', active: true });
    setEditId(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      id: editId || undefined,
      price: Math.round(parseFloat(form.price) * 100),
      oldPrice: form.oldPrice ? Math.round(parseFloat(form.oldPrice) * 100) : undefined,
    };
    try {
      const res = await fetch('/api/admin-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setProducts(data.products || products);
        showToast(editId ? '✅ Produto atualizado!' : '✅ Produto adicionado!');
        resetForm();
        setTab('list');
      } else {
        showToast('❌ Erro ao salvar: ' + (data.error || 'desconhecido'));
      }
    } catch { showToast('❌ Erro de conexão'); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Remover este produto?')) return;
    try {
      await fetch(`/api/admin-products?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      });
      setProducts(p => p.filter(x => x.id !== id));
      showToast('🗑️ Produto removido');
    } catch { showToast('❌ Erro ao remover'); }
  }

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {toast && <div className="adm-toast">{toast}</div>}

      {/* Tabs */}
      <div className="adm-tabs">
        <button className={`adm-tab${tab === 'list' ? ' active' : ''}`} onClick={() => { setTab('list'); resetForm(); }}>
          📋 Lista de Produtos ({products.length})
        </button>
        <button className={`adm-tab${tab === 'form' ? ' active' : ''}`} onClick={() => { setTab('form'); resetForm(); }}>
          ➕ {editId ? 'Editar Produto' : 'Novo Produto'}
        </button>
      </div>

      {/* ── Product list ── */}
      {tab === 'list' && (
        <div className="adm-card">
          <div className="adm-card-header">
            <h3>Todos os produtos</h3>
            <button className="adm-btn primary" onClick={() => { resetForm(); setTab('form'); }}>+ Novo produto</button>
          </div>
          <div className="adm-card-body">
            <div className="adm-search">
              <input placeholder="🔍 Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#aaa', padding: 32 }}>Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="adm-empty"><div className="empty-icon">🍕</div><p>Nenhum produto encontrado</p></div>
            ) : (
              filtered.map(p => (
                <div key={p.id} className="adm-product-item">
                  {p.img
                    ? <img src={p.img} alt={p.name} className="adm-product-img" onError={e => e.target.style.display='none'} />
                    : <div className="adm-product-img" style={{background:'#f0f2f5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🍕</div>
                  }
                  <div className="adm-product-info">
                    <h4>{p.name}</h4>
                    <p>{p.desc}</p>
                    <span className="adm-badge blue" style={{marginTop:4}}>{p.category}</span>
                    {p.tag && <span className="adm-badge orange" style={{marginTop:4,marginLeft:4}}>{p.tag}</span>}
                  </div>
                  <span className="adm-product-price">{fmtMoney(p.price)}</span>
                  <div className="adm-product-actions">
                    <span className={`adm-badge ${p.active !== false ? 'green' : 'red'}`}>
                      {p.active !== false ? 'Ativo' : 'Inativo'}
                    </span>
                    <button className="adm-btn ghost" style={{padding:'6px 12px',fontSize:12}} onClick={() => startEdit(p)}>✏️ Editar</button>
                    <button className="adm-btn danger" style={{padding:'6px 10px',fontSize:12}} onClick={() => handleDelete(p.id)}>🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Product form ── */}
      {tab === 'form' && (
        <div className="adm-card">
          <div className="adm-card-header">
            <h3>{editId ? '✏️ Editar produto' : '➕ Adicionar produto'}</h3>
          </div>
          <div className="adm-card-body">
            <form onSubmit={handleSave}>
              <div className="adm-form-grid">
                <div className="adm-field adm-form-full">
                  <label>Nome do produto *</label>
                  <input required placeholder="Ex: Pizza Calabresa 35cm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>

                <div className="adm-field adm-form-full">
                  <label>Descrição</label>
                  <textarea placeholder="Ex: Molho, Muçarela, Calabresa, Orégano" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
                </div>

                <div className="adm-field">
                  <label>Categoria *</label>
                  <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="adm-field">
                  <label>Preço (R$) *</label>
                  <input required type="number" step="0.01" min="0" placeholder="24.99" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>

                <div className="adm-field">
                  <label>Preço original / "de" (R$)</label>
                  <input type="number" step="0.01" min="0" placeholder="36.99 (opcional)" value={form.oldPrice} onChange={e => setForm(f => ({ ...f, oldPrice: e.target.value }))} />
                </div>

                <div className="adm-field">
                  <label>Tag de promoção</label>
                  <input placeholder="Ex: 32% OFF, PROMOÇÃO, NOVO" value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} />
                </div>

                <div className="adm-field adm-form-full">
                  <label>URL da foto do produto</label>
                  <input placeholder="https://..." value={form.img} onChange={e => setForm(f => ({ ...f, img: e.target.value }))} />
                  {form.img && (
                    <img src={form.img} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} onError={e => e.target.style.display='none'} />
                  )}
                </div>

                <div className="adm-field">
                  <label>Status</label>
                  <select value={form.active ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, active: e.target.value === 'true' }))}>
                    <option value="true">✅ Ativo (visível no cardápio)</option>
                    <option value="false">❌ Inativo (oculto)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="submit" className="adm-btn primary" disabled={saving}>
                  {saving ? 'Salvando...' : editId ? '💾 Atualizar produto' : '➕ Adicionar produto'}
                </button>
                <button type="button" className="adm-btn ghost" onClick={() => { resetForm(); setTab('list'); }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
