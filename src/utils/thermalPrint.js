/**
 * Thermal printing via QZ Tray (silent) with fallback to window.print()
 * QZ Tray must be installed and running: https://qz.io/download/
 */

let _connected = false;
let _connecting = false;

export async function connectQZ() {
  if (typeof window.qz === 'undefined') return false;
  if (_connected && window.qz.websocket.isActive()) return true;
  if (_connecting) return false;
  _connecting = true;
  try {
    // Disable certificate validation for self-signed cert
    window.qz.security.setCertificatePromise(() => Promise.resolve());
    window.qz.security.setSignatureAlgorithm('SHA512');
    window.qz.security.setSignaturePromise(() => Promise.resolve());
    await window.qz.websocket.connect();
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

/**
 * Print an order.
 * - If QZ Tray is connected: prints silently to the active printer
 * - Otherwise: fallback to window.print() (opens dialog)
 */
export async function printOrder(order) {
  const paperWidth = Number(localStorage.getItem('print_paper_width') || 300);
  const printerName = localStorage.getItem('active_printer') || '';
  const html = buildPrintHTML(order, paperWidth);

  // Try QZ Tray silent print
  const connected = await connectQZ();
  if (connected) {
    try {
      const cfg = window.qz.configs.create(printerName || null, {
        margins: 0,
        colorType: 'blackwhite',
        duplex: false,
      });
      await window.qz.print(cfg, [{
        type: 'pixel',
        format: 'html',
        flavor: 'plain',
        data: html,
        options: {
          pageWidth: paperWidth === 200 ? 2.28 : 3.15, // 58mm or 80mm in inches
          pageHeight: 0, // auto
        },
      }]);
      return; // success — no dialog opened
    } catch (e) {
      console.warn('QZ Tray print failed, falling back:', e);
    }
  }

  // Fallback: browser print dialog
  const w = window.open('', '_blank', `width=${paperWidth + 60},height=500`);
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  setTimeout(() => w.close(), 1000);
}
