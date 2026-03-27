/**
 * Thermal printing via QZ Tray (silent) with fallback to window.print()
 * QZ Tray must be installed and running: https://qz.io/download/
 */

let _connected = false;
let _connecting = false;

export async function connectQZ() {
  if (typeof window.qz === 'undefined') return false;
  if (window.qz.websocket.isActive()) { _connected = true; return true; }
  if (_connecting) return false;
  _connecting = true;
  try {
    // Unsigned mode — works for local/dev without a signed certificate
    window.qz.security.setCertificatePromise((resolve) => resolve());
    window.qz.security.setSignaturePromise((toSign) => (resolve) => resolve());
    await window.qz.websocket.connect({ retries: 2, delay: 1 });
    _connected = true;
    _connecting = false;
    return true;
  } catch {
    _connected = false;
    _connecting = false;
    return false;
  }
}

export function isQZConnected() {
  return typeof window.qz !== 'undefined' && window.qz.websocket.isActive();
}

export async function getQZPrinters() {
  if (!isQZConnected()) return [];
  try {
    return await window.qz.printers.find();
  } catch {
    return [];
  }
}

function buildPrintHTML(order, paperWidth = 300) {
  const fmtPrice = (c) => 'R$ ' + (c / 100).toFixed(2).replace('.', ',');
  const now = new Date().toLocaleString('pt-BR');
  const pm = {
    pix_online: 'PIX Online', card_online: 'Cartao Online',
    card_delivery: 'Cartao na Entrega', pix_delivery: 'PIX na Entrega', cash: 'Dinheiro',
  };
  const lines = [
    `<center><b>PEDIDO #${String(order.id).slice(-6)}</b></center>`,
    `<center>${now}</center>`,
    `<hr/>`,
    `<b>Cliente:</b> ${order.customer?.name || '—'}<br/>`,
    order.customer?.phone ? `<b>Tel:</b> ${order.customer.phone}<br/>` : '',
    order.address ? `<b>End.:</b> ${order.address}<br/>` : '',
    order.change_note ? `<b>${order.change_note}</b><br/>` : '',
    `<hr/>`,
    ...(order.items || []).map(i => `${i.qty || 1}x ${i.name} &nbsp; ${fmtPrice((i.price || 0) * (i.qty || 1))}<br/>`),
    `<hr/>`,
    `<b>TOTAL: ${fmtPrice(order.total || 0)}</b><br/>`,
    `Pgto: ${pm[order.payment_method || order.paymentMethod] || '—'}<br/>`,
    `<br/><br/>`,
  ].join('');

  return `<html><head><style>
    body { font-family: monospace; font-size: 13px; width: ${paperWidth}px; padding: 6px; margin: 0; }
    hr { border: 1px dashed #000; margin: 4px 0; }
    center { text-align: center; }
    b { font-weight: bold; }
  </style></head><body>${lines}</body></html>`;
}

function buildEscPos(order) {
  const ESC = '\x1B', GS = '\x1D', LF = '\n';
  const SEP = '--------------------------------' + LF;
  const fmtPrice = (c) => 'R$ ' + (c / 100).toFixed(2).replace('.', ',');
  const pm = { pix_online:'PIX Online', card_online:'Cartao Online', card_delivery:'Cartao na Entrega', pix_delivery:'PIX na Entrega', cash:'Dinheiro' };
  const now = new Date().toLocaleString('pt-BR');

  const lines = [];
  const add = (s) => lines.push({ type: 'raw', format: 'plain', data: s });

  add(ESC + '@');                        // init
  add(ESC + 'a\x01');                    // center
  add(ESC + 'E\x01');                    // bold on
  add(`PEDIDO #${String(order.id).slice(-6)}` + LF);
  add(ESC + 'E\x00');                    // bold off
  add(now + LF);
  add(ESC + 'a\x00');                    // left align
  add(SEP);
  if (order.customer?.name)  add(`Cliente: ${order.customer.name}` + LF);
  if (order.customer?.phone) add(`Tel: ${order.customer.phone}` + LF);
  if (order.address)         add(`End: ${order.address}` + LF);
  if (order.change_note)     add(`${order.change_note}` + LF);
  add(SEP);
  (order.items || []).forEach(i => {
    const name  = (i.name || '').slice(0, 22).padEnd(22);
    const price = fmtPrice((i.price || 0) * (i.qty || 1)).padStart(10);
    add(`${i.qty || 1}x ${name}${price}` + LF);
  });
  add(SEP);
  add(ESC + 'E\x01');
  add(`TOTAL: ${fmtPrice(order.total || 0)}` + LF);
  add(ESC + 'E\x00');
  add(`Pgto: ${pm[order.payment_method || order.paymentMethod] || '—'}` + LF);
  add(LF + LF + LF);
  add(GS + 'V\x00');                    // cut paper
  return lines;
}

/**
 * Print an order.
 * - QZ Tray conectado: imprime silenciosamente via ESC/POS
 * - Fallback: window.print() (abre diálogo)
 * Returns: 'qz' | 'browser' | 'error'
 */
export async function printOrder(order) {
  const paperWidth  = Number(localStorage.getItem('print_paper_width') || 300);
  const printerName = localStorage.getItem('active_printer') || '';

  const connected = await connectQZ();
  if (connected) {
    try {
      const cfg = window.qz.configs.create(printerName || null);
      await window.qz.print(cfg, buildEscPos(order));
      return 'qz';
    } catch (e) {
      console.warn('QZ Tray ESC/POS failed, trying HTML:', e);
      // Second attempt with HTML pixel mode
      try {
        const cfg2 = window.qz.configs.create(printerName || null);
        await window.qz.print(cfg2, [{
          type: 'pixel', format: 'html', flavor: 'plain',
          data: buildPrintHTML(order, paperWidth),
          options: { pageWidth: paperWidth === 200 ? 2.28 : 3.15, pageHeight: 0 },
        }]);
        return 'qz';
      } catch (e2) {
        console.warn('QZ Tray HTML failed too, fallback browser:', e2);
      }
    }
  }

  // Fallback: browser print dialog
  const html = buildPrintHTML(order, paperWidth);
  const w = window.open('', '_blank', `width=${paperWidth + 60},height=500`);
  if (!w) return 'error';
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  setTimeout(() => w.close(), 1200);
  return 'browser';
}
