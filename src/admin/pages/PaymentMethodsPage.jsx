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
  const [defaultPay, setDefaultPay] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/admin-products?type=payments&storeId=${storeId}`, { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(d => {
        const pm = d.paymentMethods || {};
        const { _default, ...rest } = pm;
        setMethods(rest.pix_online !== undefined ? rest : { pix_online: true });
        setDefaultPay(_default || null);
      })
      .catch(() => { setMethods({ pix_online: true }); setDefaultPay(null); });
  }, [token, storeId]);

  async function saveAll(updatedMethods, updatedDefault) {
    setSaving(true);
    try {
      const payload = { ...updatedMethods, _default: updatedDefault };
      await fetch(`/api/admin-products?type=payments&storeId=${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(payload),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  async function toggle(key) {
    const updated = { ...methods, [key]: !methods[key] };
    setMethods(updated);
    await saveAll(updated, defaultPay);
  }

  async function setDefault(key) {
    // Only allow setting default if method is enabled
    if (!methods[key]) return;
    const newDefault = key;
    setDefaultPay(newDefault);
    await saveAll(methods, newDefault);
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
        {METHODS.map(m => {
          const isDefault = defaultPay === m.key;
          const isEnabled = !!methods[m.key];
          return (
            <div key={m.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: isDefault ? '#fffbeb' : '#fff',
              borderRadius: 12, padding: '14px 16px',
              border: `2px solid ${isDefault ? '#f59e0b' : isEnabled ? '#10b981' : '#e5e7eb'}`,
              transition: 'border-color .2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <span style={{ fontSize: 22 }}>{m.icon}</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#1e2740' }}>{m.label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{m.desc}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {/* Default button — only show if enabled */}
                {isEnabled && (
                  <button
                    onClick={() => setDefault(m.key)}
                    title="Definir como padrão"
                    style={{
                      padding: '4px 10px', borderRadius: 8, border: `1.5px solid ${isDefault ? '#f59e0b' : '#e5e7eb'}`,
                      background: isDefault ? '#fef3c7' : '#f9fafb',
                      color: isDefault ? '#b45309' : '#9ca3af',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      transition: 'all .2s',
                    }}
                  >
                    ⭐ {isDefault ? 'Padrão' : 'Padrão?'}
                  </button>
                )}
                {/* Toggle */}
                <button
                  onClick={() => toggle(m.key)}
                  style={{
                    width: 52, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: isEnabled ? '#10b981' : '#d1d5db',
                    position: 'relative', transition: 'background .2s', flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: isEnabled ? 26 : 3,
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    transition: 'left .2s', display: 'block',
                    boxShadow: '0 1px 4px rgba(0,0,0,.18)',
                  }}/>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, padding: 16, background: '#fffbeb', borderRadius: 12, border: '1px solid #fde68a', maxWidth: 560 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
          ⚠️ <strong>Pagamentos na entrega</strong> (cartão, PIX, dinheiro) criam pedidos que precisam ser aceitos manualmente no Kanban antes de ir para preparo.
          <br/><strong>Pagamentos online</strong> (PIX Veno, cartão online) são aceitos automaticamente e já entram em "Em Preparo".
          <br/>⭐ <strong>Padrão</strong>: método pré-selecionado ao finalizar o pedido.
        </p>
      </div>
    </div>
  );
}
