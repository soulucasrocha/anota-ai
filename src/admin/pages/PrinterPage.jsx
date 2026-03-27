import { useState, useEffect } from 'react';
import { connectQZ, isQZConnected, getQZPrinters, printOrder } from '../../utils/thermalPrint';

const PAPER_WIDTHS = [
  { label: '58mm (pequena)', value: 200 },
  { label: '80mm (padrão)', value: 300 },
];

const MOCK_ORDER = {
  id: 'test-000001',
  customer: { name: 'Cliente Teste', phone: '(11) 99999-9999' },
  address: 'Rua Exemplo, 123, Centro',
  items: [{ qty: 1, name: 'Pizza Calabresa 35cm', price: 2499 }, { qty: 2, name: 'Guaraná 1,5l', price: 900 }],
  total: 4299,
  payment_method: 'cash',
  change_note: 'Troco para R$50,00 (R$7,01 de troco)',
};

export default function PrinterPage({ store }) {
  const [paperWidth,     setPaperWidth]     = useState(() => Number(localStorage.getItem('print_paper_width') || 300));
  const [printers,       setPrinters]       = useState(() => { try { return JSON.parse(localStorage.getItem('saved_printers') || '[]'); } catch { return []; } });
  const [activePrinter,  setActivePrinter]  = useState(() => localStorage.getItem('active_printer') || '');
  const [newPrinterName, setNewPrinterName] = useState('');
  const [qzStatus,       setQzStatus]       = useState('checking');
  const [qzPrinters,     setQzPrinters]     = useState([]);

  useEffect(() => {
    async function check(isRetry = false) {
      if (!isRetry) setQzStatus('checking');
      const ok = await connectQZ();
      if (ok) {
        setQzStatus('connected');
        const list = await getQZPrinters();
        setQzPrinters(list);
      } else if (!isRetry) {
        // QZ Tray might still be initializing — retry once after 2s
        setTimeout(() => check(true), 2000);
      } else {
        setQzStatus('disconnected');
      }
    }
    check();
  }, []);

  async function reconnectQZ() {
    setQzStatus('checking');
    const ok = await connectQZ();
    if (ok) {
      setQzStatus('connected');
      const list = await getQZPrinters();
      setQzPrinters(list);
    } else {
      // Retry once after 2 seconds
      setTimeout(async () => {
        const ok2 = await connectQZ();
        if (ok2) {
          setQzStatus('connected');
          const list = await getQZPrinters();
          setQzPrinters(list);
        } else {
          setQzStatus('disconnected');
        }
      }, 2000);
    }
  }

  function savePaperWidth(w) {
    setPaperWidth(w);
    localStorage.setItem('print_paper_width', String(w));
  }

  function addPrinter() {
    if (!newPrinterName.trim()) return;
    const updated = [...printers, newPrinterName.trim()];
    setPrinters(updated);
    localStorage.setItem('saved_printers', JSON.stringify(updated));
    if (!activePrinter) { setActivePrinter(newPrinterName.trim()); localStorage.setItem('active_printer', newPrinterName.trim()); }
    setNewPrinterName('');
  }

  function removePrinter(name) {
    const updated = printers.filter(p => p !== name);
    setPrinters(updated);
    localStorage.setItem('saved_printers', JSON.stringify(updated));
    if (activePrinter === name) { const next = updated[0] || ''; setActivePrinter(next); localStorage.setItem('active_printer', next); }
  }

  function selectPrinter(name) { setActivePrinter(name); localStorage.setItem('active_printer', name); }

  function addQZPrinter(name) {
    if (!printers.includes(name)) {
      const updated = [...printers, name];
      setPrinters(updated);
      localStorage.setItem('saved_printers', JSON.stringify(updated));
    }
    selectPrinter(name);
  }

  const statusColor = { checking: '#f59e0b', connected: '#10b981', disconnected: '#ef4444' };
  const statusLabel = { checking: 'Verificando...', connected: '✅ Conectado', disconnected: '❌ Desconectado' };

  return (
    <>
      {/* Como liberar QZ Tray de vez */}
      <div className="adm-card" style={{ borderLeft: '4px solid #f59e0b' }}>
        <div className="adm-card-header">
          <h3>🔐 Liberar QZ Tray de vez — faça isso UMA VEZ SÓ</h3>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 14 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#92400e', margin: '0 0 8px' }}>
              Quando aparecer o popup do QZ Tray:
            </p>
            <ol style={{ fontSize: 13, color: '#78350f', lineHeight: 2, paddingLeft: 18, margin: 0 }}>
              <li>Marque a caixa <strong>"Remember this decision"</strong> ✅</li>
              <li>Depois clique em <strong>"Allow"</strong></li>
            </ol>
            <p style={{ fontSize: 12, color: '#92400e', margin: '8px 0 0', fontStyle: 'italic' }}>
              Pronto! Nunca mais vai pedir permissão.
            </p>
          </div>
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 14 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#0369a1', margin: '0 0 8px' }}>
              OU adicione o site manualmente no Site Manager:
            </p>
            <ol style={{ fontSize: 13, color: '#075985', lineHeight: 2, paddingLeft: 18, margin: '0 0 10px' }}>
              <li>Clique com o botão direito no ícone do QZ Tray (barra de tarefas, perto do relógio)</li>
              <li>Clique em <strong>"Site Manager"</strong></li>
              <li>Na aba <strong>"Allowed"</strong>, clique no botão <strong>"+"</strong></li>
              <li>Digite o endereço abaixo e pressione Enter</li>
              <li>Clique em <strong>"Close"</strong></li>
            </ol>
            <div style={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', fontSize: 13, color: '#0c4a6e', fontWeight: 700 }}>
              https://oi-anota-ai.vercel.app
            </div>
          </div>
        </div>
      </div>

      {/* QZ Tray Status */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h3>🔌 QZ Tray — Impressão Silenciosa</h3>
          <span style={{ fontSize: 12, fontWeight: 700, color: statusColor[qzStatus] }}>{statusLabel[qzStatus]}</span>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {qzStatus === 'connected' ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 14 }}>
              <p style={{ color: '#16a34a', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>✅ QZ Tray conectado! Impressão automática ativa.</p>
              <p style={{ color: '#166534', fontSize: 13, margin: 0 }}>Pedidos serão impressos diretamente na impressora, sem abrir nenhuma janela.</p>
              {qzPrinters.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 6 }}>Impressoras detectadas — clique para ativar:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {qzPrinters.map(p => (
                      <button key={p} className={`adm-btn${activePrinter === p ? ' primary' : ' ghost'}`} style={{ fontSize: 12 }} onClick={() => addQZPrinter(p)}>
                        {activePrinter === p ? '✅ ' : ''}{p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : qzStatus === 'disconnected' ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: 14 }}>
              <p style={{ color: '#dc2626', fontWeight: 700, fontSize: 14, margin: '0 0 8px' }}>QZ Tray não encontrado</p>
              <p style={{ fontSize: 13, color: '#991b1b', margin: '0 0 10px' }}>Para impressão silenciosa, instale o QZ Tray no computador com a impressora:</p>
              <ol style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 2, paddingLeft: 18, margin: '0 0 12px' }}>
                <li>Acesse <a href="https://qz.io/download/" target="_blank" rel="noreferrer" style={{ color: '#dc2626' }}><b>qz.io/download</b></a> e baixe o QZ Tray</li>
                <li>Instale e execute (fica na bandeja do Windows)</li>
                <li>Clique em <b>"Reconectar"</b> abaixo</li>
              </ol>
              <button className="adm-btn primary" onClick={reconnectQZ}>🔄 Reconectar QZ Tray</button>
            </div>
          ) : (
            <p style={{ color: '#f59e0b', fontSize: 13 }}>Verificando conexão com QZ Tray...</p>
          )}
          {qzStatus !== 'connected' && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12 }}>
              <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>
                <b>⚠️ Sem QZ Tray:</b> a impressão abrirá o diálogo do Windows normalmente. Com QZ Tray ativo, imprime silenciosamente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Impressoras cadastradas */}
      <div className="adm-card">
        <div className="adm-card-header"><h3>🖨️ Impressoras Cadastradas</h3></div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
            Cadastre o nome exato da impressora (igual ao nome no Windows).
            {activePrinter && <span style={{ color: '#16a34a', fontWeight: 700 }}> Ativa: {activePrinter}</span>}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="adm-input" placeholder="Nome da impressora (igual ao Windows)" value={newPrinterName} onChange={e => setNewPrinterName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPrinter()} style={{ flex: 1 }} />
            <button className="adm-btn primary" onClick={addPrinter} disabled={!newPrinterName.trim()}>Adicionar</button>
          </div>
          {printers.length === 0 ? (
            <p style={{ fontSize: 13, color: '#bbb', textAlign: 'center', padding: '12px 0' }}>Nenhuma impressora cadastrada</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {printers.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: activePrinter === p ? '#eff6ff' : '#f9fafb', borderRadius: 10, border: `1.5px solid ${activePrinter === p ? '#3b82f6' : '#e5e7eb'}` }}>
                  <span style={{ flex: 1, fontWeight: activePrinter === p ? 700 : 400, color: activePrinter === p ? '#1d4ed8' : '#374151' }}>{activePrinter === p ? '✅ ' : '🖨️ '}{p}</span>
                  {activePrinter !== p && <button className="adm-btn ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => selectPrinter(p)}>Ativar</button>}
                  <button className="adm-btn danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => removePrinter(p)}>🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Largura do papel */}
      <div className="adm-card">
        <div className="adm-card-header"><h3>📄 Largura do Papel</h3></div>
        <div className="adm-card-body" style={{ display: 'flex', gap: 10 }}>
          {PAPER_WIDTHS.map(p => (
            <button key={p.value} className={`adm-btn${paperWidth === p.value ? ' primary' : ' ghost'}`} onClick={() => savePaperWidth(p.value)}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Teste */}
      <div className="adm-card">
        <div className="adm-card-header"><h3>🧪 Teste de Impressão</h3></div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: '#666' }}>
            {qzStatus === 'connected'
              ? `Imprimirá silenciosamente em: ${activePrinter || '(impressora padrão do sistema)'}`
              : 'Sem QZ Tray conectado, abrirá o diálogo do Windows.'}
          </p>
          <button className="adm-btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => printOrder(MOCK_ORDER)}>
            🖨️ Imprimir pedido de teste
          </button>
        </div>
      </div>
    </>
  );
}
