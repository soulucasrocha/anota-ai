import { useState } from 'react';

const PAPER_WIDTHS = [
  { label: '58mm (pequena)', value: 200 },
  { label: '80mm (padrão)', value: 300 },
];

export default function PrinterPage({ store }) {
  const [paperWidth, setPaperWidth] = useState(() => Number(localStorage.getItem('print_paper_width') || 300));
  const [printers, setPrinters] = useState(() => {
    try { return JSON.parse(localStorage.getItem('saved_printers') || '[]'); } catch { return []; }
  });
  const [activePrinter, setActivePrinter] = useState(() => localStorage.getItem('active_printer') || '');
  const [newPrinterName, setNewPrinterName] = useState('');

  function addPrinter() {
    if (!newPrinterName.trim()) return;
    const updated = [...printers, newPrinterName.trim()];
    setPrinters(updated);
    localStorage.setItem('saved_printers', JSON.stringify(updated));
    if (!activePrinter) {
      setActivePrinter(newPrinterName.trim());
      localStorage.setItem('active_printer', newPrinterName.trim());
    }
    setNewPrinterName('');
  }
  function removePrinter(name) {
    const updated = printers.filter(p => p !== name);
    setPrinters(updated);
    localStorage.setItem('saved_printers', JSON.stringify(updated));
    if (activePrinter === name) {
      const next = updated[0] || '';
      setActivePrinter(next);
      localStorage.setItem('active_printer', next);
    }
  }
  function selectPrinter(name) {
    setActivePrinter(name);
    localStorage.setItem('active_printer', name);
  }

  function savePaperWidth(w) {
    setPaperWidth(w);
    localStorage.setItem('print_paper_width', String(w));
  }

  function testPrint() {
    const now = new Date().toLocaleString('pt-BR');
    const html = `
      <html><head><style>
        body { font-family: monospace; font-size: 14px; width: ${paperWidth}px; padding: 8px; margin: 0; }
        hr { border: 1px dashed #000; margin: 6px 0; }
        center { text-align: center; }
      </style></head><body>
        <center><b>${store?.name || 'Minha Loja'}</b></center>
        <center>TESTE DE IMPRESSÃO</center>
        <center>${now}</center>
        <hr/>
        <b>Pedido:</b> #123456<br/>
        <b>Cliente:</b> João da Silva<br/>
        <b>Tel:</b> (11) 99999-9999<br/>
        <b>End.:</b> Rua Exemplo, 123<br/>
        <hr/>
        1x Pizza Calabresa 35cm &nbsp; R$ 24,99<br/>
        2x Guaraná 1,5l &nbsp; R$ 18,00<br/>
        <hr/>
        <b>TOTAL: R$ 42,99</b><br/>
        Pgto: PIX Online<br/>
        <br/><br/>
      </body></html>`;
    const w = window.open('', '_blank', `width=${paperWidth + 60},height=500`);
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }

  return (
    <>
      {/* Impressoras cadastradas */}
      <div className="adm-card" style={{ marginBottom: 0 }}>
        <div className="adm-card-header"><h3>🖨️ Impressoras Cadastradas</h3></div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: '#666' }}>Cadastre o nome das suas impressoras térmicas. A impressora ativa será selecionada automaticamente ao imprimir.</p>

          <div style={{ display: 'flex', gap: 8 }}>
            <input className="adm-input" placeholder="Nome da impressora (ex: Térmica 80mm)" value={newPrinterName} onChange={e => setNewPrinterName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPrinter()} style={{ flex: 1 }} />
            <button className="adm-btn primary" onClick={addPrinter} disabled={!newPrinterName.trim()}>Adicionar</button>
          </div>

          {printers.length === 0 ? (
            <p style={{ fontSize: 13, color: '#bbb', textAlign: 'center', padding: '12px 0' }}>Nenhuma impressora cadastrada</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {printers.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: activePrinter === p ? '#eff6ff' : '#f9fafb', borderRadius: 10, border: `1.5px solid ${activePrinter === p ? '#3b82f6' : '#e5e7eb'}` }}>
                  <span style={{ flex: 1, fontWeight: activePrinter === p ? 700 : 400, color: activePrinter === p ? '#1d4ed8' : '#374151' }}>
                    {activePrinter === p ? '✅ ' : ''}{p}
                  </span>
                  {activePrinter !== p && (
                    <button className="adm-btn ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => selectPrinter(p)}>Ativar</button>
                  )}
                  <button className="adm-btn danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => removePrinter(p)}>🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-header">
          <h3>🖨️ Configuração da Impressora</h3>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Largura do papel */}
          <div>
            <label className="adm-label">Largura do papel</label>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              {PAPER_WIDTHS.map(p => (
                <button
                  key={p.value}
                  className={`adm-btn${paperWidth === p.value ? ' primary' : ' ghost'}`}
                  onClick={() => savePaperWidth(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Teste de impressão */}
          <div>
            <label className="adm-label">Teste de impressão</label>
            <p style={{ fontSize: 13, color: '#888', margin: '4px 0 10px' }}>
              Clique abaixo para imprimir um pedido de exemplo e verificar o alinhamento.
            </p>
            <button className="adm-btn primary" onClick={testPrint}>
              🖨️ Imprimir teste
            </button>
          </div>

          {/* Instruções */}
          <div className="adm-card" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <div className="adm-card-body">
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>📋 Como conectar sua impressora térmica</p>
              <ol style={{ fontSize: 13, color: '#555', lineHeight: 1.8, paddingLeft: 18 }}>
                <li>Conecte a impressora térmica ao computador via <b>USB</b> ou <b>Bluetooth</b></li>
                <li>Instale o driver da impressora no sistema operacional</li>
                <li>No Windows: vá em <b>Configurações → Impressoras → Adicionar impressora</b></li>
                <li>Nas configurações da impressora, defina o tamanho do papel para <b>58mm ou 80mm</b></li>
                <li>Quando clicar em <b>"🖨️ Imprimir pedido"</b> no Kanban, o diálogo de impressão abrirá</li>
                <li>Selecione sua impressora térmica e confirme</li>
              </ol>
              <p style={{ fontSize: 12, color: '#aaa', marginTop: 10 }}>
                💡 Dica: defina sua impressora térmica como padrão no sistema para que o diálogo abra direto nela.
              </p>
            </div>
          </div>

          {/* Auto-print info */}
          <div className="adm-card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div className="adm-card-body">
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#1d4ed8' }}>⚡ Impressão automática</p>
              <p style={{ fontSize: 13, color: '#3b82f6' }}>
                Ative o botão <b>"🖨️ Auto-imprimir: ON"</b> na aba <b>Pedidos (Kanban)</b>.<br/>
                Quando um pedido for movido para <b>"Em Preparo"</b>, o comprovante será impresso automaticamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
