import { useState, useEffect, useRef, useCallback } from 'react';

const TABS = [
  { key: 'whatsapp', label: '📱 WhatsApp' },
  { key: 'pixel',    label: '🎯 Pixels'   },
  { key: 'gtm',      label: '📈 Google Tag Manager' },
];

// ── WhatsApp API helpers (calls Vercel proxy → R Tracker on Railway) ─────────
const wa = {
  list:       ()       => fetch('/api/wa?action=accounts').then(r => r.json()),
  add:        (name)   => fetch('/api/wa?action=accounts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name }) }).then(r => r.json()),
  del:        (id)     => fetch(`/api/wa?action=delete&id=${id}`, { method: 'DELETE' }),
  status:     (id)     => fetch(`/api/wa?action=status&id=${id}`).then(r => r.json()),
  qr:         (id)     => fetch(`/api/wa?action=qr&id=${id}`).then(r => r.ok ? r.json() : null),
  reconnect:  (id)     => fetch(`/api/wa?action=reconnect&id=${id}`, { method: 'POST' }),
  disconnect: (id)     => fetch(`/api/wa?action=disconnect&id=${id}`, { method: 'POST' }),
  pairing:    (id, ph) => fetch(`/api/wa?action=pairing&id=${id}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ phone: ph }) }).then(r => r.json()),
};

export default function IntegrationsPage({ token, storeId }) {
  const [tab, setTab] = useState('whatsapp');

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  const [accounts,     setAccounts]     = useState([]);
  const [waConfigured, setWaConfigured] = useState(true);
  const [waLoading,    setWaLoading]    = useState(false);
  const [connectingId, setConnectingId] = useState(null);
  const [qr,           setQr]           = useState(null);
  const [pairingCode,  setPairingCode]  = useState('');
  const [pairingPhone, setPairingPhone] = useState('');
  const [waMode,       setWaMode]       = useState('qr');
  const [waStatus,     setWaStatus]     = useState(null);
  const [addModal,     setAddModal]     = useState(false);
  const [newName,      setNewName]      = useState('');
  const pollRef = useRef(null);

  // ── Meta Pixel & GTM ──────────────────────────────────────────────────────
  const [pixel,      setPixel]      = useState('');
  const [pixelToken, setPixelToken] = useState('');
  const [gtm,        setGtm]        = useState('');

  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  // Load saved pixel/gtm settings
  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/admin-products?type=tracking&storeId=${storeId}`, { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(d => {
        if (d.tracking) {
          setPixel(d.tracking.pixel_id || '');
          setPixelToken(d.tracking.pixel_access_token || '');
          setGtm(d.tracking.gtm_id || '');
        }
      }).catch(() => {});
  }, [token, storeId]);

  // Load WhatsApp accounts on mount
  useEffect(() => {
    refreshAccounts();
  }, []);

  async function refreshAccounts() {
    setWaLoading(true);
    try {
      const data = await wa.list();
      if (data?.configured === false) { setWaConfigured(false); setAccounts([]); }
      else if (Array.isArray(data)) { setWaConfigured(true); setAccounts(data); }
    } catch {}
    setWaLoading(false);
  }

  async function saveTracking(patch) {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin-products?type=tracking&storeId=${storeId}`, { headers: { 'x-admin-token': token } });
      const d = await r.json();
      await fetch(`/api/admin-products?type=tracking&storeId=${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ ...(d.tracking || {}), ...patch }),
      });
      showToast('✅ Salvo!');
    } catch { showToast('❌ Erro ao salvar'); }
    setSaving(false);
  }

  // ── Polling for QR / status ───────────────────────────────────────────────
  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPoll = useCallback((accId) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const s = await wa.status(accId);
        setWaStatus(s.status);
        setAccounts(prev => prev.map(a => a.id === accId ? { ...a, status: s.status, hasQR: s.hasQR } : a));

        // Pairing code arrives via polling (Railway stores it on the instance)
        if (s.pairingCode) setPairingCode(s.pairingCode);

        if (s.status === 'connected') {
          setQr(null); setPairingCode('');
          stopPoll();
          return;
        }
        if (s.hasQR && waMode === 'qr') {
          const qrData = await wa.qr(accId);
          if (qrData?.qr) setQr(qrData.qr);
        }
      } catch {}
    }, 2000);
  }, [stopPoll, waMode]);

  useEffect(() => () => stopPoll(), [stopPoll]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function addAccount() {
    const name = newName.trim() || `bt${accounts.length}`;
    setAddModal(false);
    setNewName('');
    setWaLoading(true);
    try {
      const acc = await wa.add(name);
      if (acc?.id) {
        setAccounts(prev => [...prev, { ...acc, status: 'connecting' }]);
        openConnect(acc);
      } else if (acc?.configured === false) {
        // silently ignored — UI already shows "Backend não configurado"
      } else {
        showToast('❌ Erro ao adicionar instância');
      }
    } catch { showToast('❌ Erro ao adicionar instância'); }
    setWaLoading(false);
  }

  async function deleteAccount(acc) {
    try {
      await wa.del(acc.id);
      setAccounts(prev => prev.filter(a => a.id !== acc.id));
      if (connectingId === acc.id) { setConnectingId(null); stopPoll(); }
    } catch { showToast('❌ Erro ao remover'); }
  }

  async function reconnectAccount(acc) {
    await wa.reconnect(acc.id);
    openConnect(acc);
  }

  async function disconnectAccount(acc) {
    await wa.disconnect(acc.id);
    setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, status: 'disconnected' } : a));
    if (connectingId === acc.id) { setConnectingId(null); stopPoll(); setQr(null); setPairingCode(''); }
    showToast('✅ Desconectado');
  }

  function openConnect(acc) {
    setConnectingId(acc.id);
    setQr(null); setPairingCode(''); setWaStatus('connecting'); setWaMode('qr');
    startPoll(acc.id);
  }

  async function requestPairingCode(accId) {
    if (!pairingPhone) { showToast('Informe o número'); return; }
    stopPoll();
    try {
      const res = await wa.pairing(accId, pairingPhone.replace(/\D/g, ''));
      if (res?.code) { setPairingCode(res.code); setWaStatus('qr'); }
      else showToast('⏳ Aguardando código...');
    } catch { showToast('❌ Erro ao solicitar código'); }
    // Resume polling to detect 'connected'
    startPoll(accId);
  }

  const connectedCount = accounts.filter(a => a.status === 'connected').length;

  return (
    <>
      {toast && <div className="adm-toast">{toast}</div>}

      {/* Modal — nome da instância */}
      {addModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center' }}
          onClick={() => setAddModal(false)}>
          <div style={{ background:'#fff',borderRadius:14,padding:'28px 28px 20px',width:340,boxShadow:'0 8px 32px rgba(0,0,0,.18)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:700,fontSize:16,marginBottom:16 }}>Nova instância WhatsApp</div>
            <label style={{ fontSize:13,fontWeight:600,color:'#555',display:'block',marginBottom:6 }}>Nome</label>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAccount()}
              placeholder={`bt${accounts.length}`}
              style={{ width:'100%',boxSizing:'border-box',padding:'9px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:14,marginBottom:18,outline:'none' }}
            />
            <div style={{ display:'flex',gap:10,justifyContent:'flex-end' }}>
              <button onClick={() => setAddModal(false)} style={{ padding:'8px 18px',borderRadius:8,border:'1.5px solid #e5e7eb',background:'#fff',fontSize:13,cursor:'pointer' }}>Cancelar</button>
              <button onClick={addAccount} style={{ padding:'8px 18px',borderRadius:8,border:'none',background:'#25d366',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer' }}>Criar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e2740', margin: 0 }}>Integrações</h2>
        <p style={{ fontSize: 14, color: '#aaa', marginTop: 4 }}>Conecte suas ferramentas e automatize seu negócio.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f3f4f6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', border: 'none', transition: 'all .15s',
            background: tab === t.key ? '#fff' : 'transparent',
            color:      tab === t.key ? '#1e2740' : '#9ca3af',
            boxShadow:  tab === t.key ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── WhatsApp tab ── */}
      {tab === 'whatsapp' && (
        <div className="adm-card">
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1e2740' }}>WhatsApp</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                {accounts.length > 0 ? `${connectedCount} de ${accounts.length} conectados` : 'Nenhuma instância'}
              </div>
            </div>
            <button onClick={() => { setNewName(''); setAddModal(true); }} disabled={waLoading} style={{
              background: '#25d366', border: 'none', borderRadius: 8,
              padding: '8px 18px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', color: '#fff',
            }}>
              {waLoading ? '...' : '+ Adicionar'}
            </button>
          </div>

          {/* Accounts list */}
          <div style={{ padding: '8px 0' }}>
            {waLoading && accounts.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>Carregando...</div>
            )}
            {!waLoading && !waConfigured && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⚙️</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#ef4444' }}>Backend não configurado</div>
                <div style={{ fontSize: 12 }}>Adicione a variável <b>WA_BACKEND_URL</b> no Vercel para ativar o WhatsApp</div>
              </div>
            )}
            {!waLoading && waConfigured && accounts.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📱</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Nenhuma instância</div>
                <div style={{ fontSize: 12 }}>Clique em "+ Adicionar" para criar</div>
              </div>
            )}
            {accounts.map(acc => {
              const isConn = acc.status === 'connected';
              return (
                <div key={acc.id} style={{ padding: '14px 20px', borderBottom: '1px solid #f9fafb', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📱</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e2740' }}>{acc.name || acc.id}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: isConn ? '#10b981' : '#ef4444', display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: isConn ? '#10b981' : '#ef4444', fontWeight: 600 }}>{isConn ? 'Conectado' : 'Desconectado'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!isConn && (
                      <button onClick={() => openConnect(acc)} style={{ background: '#25d366', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
                        Conectar
                      </button>
                    )}
                    <button onClick={() => reconnectAccount(acc)} title="Reconectar" style={{ background: 'none', border: '1.5px solid #e5e7eb', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↻</button>
                    {isConn && (
                      <button onClick={() => disconnectAccount(acc)} title="Desconectar" style={{ background: 'none', border: '1.5px solid #e5e7eb', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 15, color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
                    )}
                    <button onClick={() => deleteAccount(acc)} title="Remover" style={{ background: 'none', border: '1.5px solid #fee2e2', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* QR / pairing panel */}
          {connectingId && (
            <div style={{ margin: '0 20px 20px', border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#1e2740' }}>
                  {waStatus === 'connected' ? '✅ WhatsApp Conectado!' : waStatus === 'qr' ? '📲 Escaneie o QR Code' : '⏳ Conectando...'}
                </span>
                <button onClick={() => { setConnectingId(null); stopPoll(); setQr(null); setPairingCode(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>✕</button>
              </div>

              {waStatus === 'connected' ? (
                <div style={{ padding: '28px', textAlign: 'center' }}>
                  <div style={{ fontSize: 44 }}>✅</div>
                  <div style={{ fontWeight: 700, color: '#10b981', marginTop: 10, fontSize: 15 }}>Conectado com sucesso!</div>
                </div>
              ) : (
                <div style={{ padding: 20 }}>
                  {/* Mode toggle */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {[{ k:'qr', l:'📱 QR Code' }, { k:'code', l:'🔢 Código' }].map(m => (
                      <button key={m.k} onClick={() => { setWaMode(m.k); setQr(null); setPairingCode(''); }} style={{
                        padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', border: '1.5px solid',
                        borderColor: waMode === m.k ? '#25d366' : '#e5e7eb',
                        background:  waMode === m.k ? '#ecfdf5' : '#fff',
                        color:       waMode === m.k ? '#10b981' : '#9ca3af',
                      }}>{m.l}</button>
                    ))}
                  </div>

                  {waMode === 'qr' && (
                    <div style={{ textAlign: 'center' }}>
                      {qr ? (
                        <>
                          <img src={qr} alt="QR Code" style={{ width: 200, height: 200, border: '3px solid #e5e7eb', borderRadius: 12 }} />
                          <p style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>WhatsApp → Aparelhos conectados → Conectar aparelho</p>
                          <p style={{ fontSize: 12, color: '#f59e0b' }}>⏳ Aguardando leitura...</p>
                        </>
                      ) : (
                        <p style={{ fontSize: 13, color: '#9ca3af', padding: '20px 0' }}>⏳ Gerando QR Code...</p>
                      )}
                    </div>
                  )}

                  {waMode === 'code' && (
                    <div>
                      {pairingCode ? (
                        <div style={{ textAlign: 'center', padding: '16px', background: '#f5f3ff', borderRadius: 12, border: '2px solid #7c3aed' }}>
                          <p style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, marginBottom: 8 }}>Digite este código no WhatsApp</p>
                          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 8, color: '#4c1d95', fontFamily: 'monospace' }}>{pairingCode}</div>
                          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>WhatsApp → Aparelhos conectados → Conectar com número</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                          <div style={{ flex: 1 }}>
                            <label className="adm-label">Número do WhatsApp</label>
                            <input className="adm-input" style={{ marginBottom: 0 }} placeholder="5521999999999" value={pairingPhone} onChange={e => setPairingPhone(e.target.value)} />
                          </div>
                          <button className="adm-btn primary" onClick={() => requestPairingCode(connectingId)}>Gerar Código</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Como funciona */}
          <div style={{ margin: '0 20px 20px', background: '#f9fafb', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e2740', marginBottom: 10 }}>Como funciona</div>
            {[
              'Adicione quantos WhatsApps quiser — cada um rastreia campanhas diferentes.',
              'Clique em "Conectar" e escaneie o QR com o celular.',
              'Quando um lead enviar mensagem com a tag (ex: #cv1), o sistema registra.',
              'Acompanhe os resultados no Dashboard por criativo.',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ background: '#25d366', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i+1}</span>
                <span style={{ fontSize: 12, color: '#666' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pixels tab ── */}
      {tab === 'pixel' && (
        <div className="adm-card">
          <div style={{ borderBottom: '1px solid #f0f2f5', padding: '14px 20px', fontWeight: 700, fontSize: 14, color: '#1e2740' }}>🎯 Meta Pixel — Conversions API (CAPI)</div>
          <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>Como funciona</div>
              {['Quando um cliente finaliza um pedido no cardápio', 'O sistema envia automaticamente um evento Purchase via API', 'A Meta recebe o evento server-side (mais confiável que browser pixel)', 'Você vê as conversões no Gerenciador de Anúncios'].map((t, i) => (
                <div key={i} style={{ fontSize: 12, color: '#0369a1', display: 'flex', gap: 8, marginBottom: 3 }}>
                  <span style={{ background: '#0369a1', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, marginTop: 1 }}>{i+1}</span>
                  {t}
                </div>
              ))}
            </div>
            <div>
              <label className="adm-label">Pixel ID</label>
              <input className="adm-input" placeholder="Ex: 1234567890123456" value={pixel} onChange={e => setPixel(e.target.value)} />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Meta Business Suite → Gerenciador de Eventos → Pixel → Configurações</p>
            </div>
            <div>
              <label className="adm-label">Access Token (CAPI)</label>
              <input className="adm-input" type="password" placeholder="EAAxxxxxxx..." value={pixelToken} onChange={e => setPixelToken(e.target.value)} />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Gerenciador de Eventos → Configurações → Conversions API → Gerar token</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="adm-btn primary" onClick={() => saveTracking({ pixel_id: pixel, pixel_access_token: pixelToken })} disabled={saving}>{saving ? '...' : '💾 Salvar'}</button>
              {pixel && pixelToken && <span style={{ fontSize: 12, color: '#10b981' }}>● CAPI ativo</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── GTM tab ── */}
      {tab === 'gtm' && (
        <div className="adm-card">
          <div style={{ borderBottom: '1px solid #f0f2f5', padding: '14px 20px', fontWeight: 700, fontSize: 14, color: '#1e2740' }}>📈 Google Tag Manager</div>
          <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="adm-label">Container ID</label>
              <input className="adm-input" placeholder="GTM-XXXXXXX" value={gtm} onChange={e => setGtm(e.target.value.toUpperCase())} />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>tagmanager.google.com → seu container → ID no topo</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="adm-btn primary" onClick={() => saveTracking({ gtm_id: gtm })} disabled={saving}>{saving ? '...' : '💾 Salvar'}</button>
              {gtm && <span style={{ fontSize: 12, color: '#10b981', alignSelf: 'center' }}>● Snippet injetado no cardápio digital</span>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
