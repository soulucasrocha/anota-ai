import { useState, useEffect } from 'react';

const METHODS = [
  { key: 'pix_online',     icon: '⚡', label: 'PIX Online',        desc: 'Pagamento instantâneo via Veno Payments' },
  { key: 'card_online',    icon: '💳', label: 'Cartão Online',      desc: 'Cartão de crédito/débito online' },
  { key: 'card_delivery',  icon: '💳', label: 'Cartão na Entrega',  desc: 'Cliente paga com cartão ao receber' },
  { key: 'pix_delivery',   icon: '📱', label: 'PIX na Entrega',     desc: 'Cliente paga PIX ao receber o pedido' },
  { key: 'cash',           icon: '💵', label: 'Dinheiro',           desc: 'Pagamento em espécie na entrega' },
];

export default function PaymentMethodsPage({ token, storeId }) {
  const [methods, setMethods]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/admin-products?type=payments&storeId=${storeId}`, { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(d => setMethods(d.paymentMethods || {}))
      .catch(() => setMethods({ pix_online: true }));
  }, [token, storeId]);

  async function toggle(key) {
    const updated = { ...methods, [key]: !methods[key] };
    setMethods(updated);
    setSaving(true);
    try {
      await fetch(`/api/admin-products?type=payments&storeId=${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(updated),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  if (!methods) return <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Carregando...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, color: '#1e2740', margin: 0 }}>💳 Formas de Pagamento</h3>
        <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
          Ative ou desative as formas de pagamento disponíveis no cardápio digital.
          {saved && <span style={{ color: '#10b981', fontWeight: 600, marginLeft: 8 }}>✓ Salvo!</span>}
          {saving && !saved && <span style={{ color: '#f59e0b', marginLeft: 8 }}>Salvando...</span>}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520 }}>
        {METHODS.map(m => (
          <div key={m.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#fff', borderRadius: 12, padding: '16px 20px',
            border: `2px solid ${methods[m.key] ? '#10b981' : '#e5e7eb'}`,
            transition: 'border-color .2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 24 }}>{m.icon}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#1e2740' }}>{m.label}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{m.desc}</p>
              </div>
            </div>
            <button
              onClick={() => toggle(m.key)}
              style={{
                width: 52, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: methods[m.key] ? '#10b981' : '#d1d5db',
                position: 'relative', transition: 'background .2s', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: methods[m.key] ? 26 : 3,
                width: 22, height: 22, borderRadius: '50%', background: '#fff',
                transition: 'left .2s', display: 'block',
                boxShadow: '0 1px 4px rgba(0,0,0,.18)',
              }}/>
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, padding: 16, background: '#fffbeb', borderRadius: 12, border: '1px solid #fde68a', maxWidth: 520 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
          ⚠️ <strong>Pagamentos na entrega</strong> (cartão, PIX, dinheiro) criam pedidos que precisam ser aceitos manualmente no Kanban antes de ir para preparo.
          <br/><strong>Pagamentos online</strong> (PIX Veno, cartão online) são aceitos automaticamente e já entram em "Em Preparo".
        </p>
      </div>
    </div>
  );
}
