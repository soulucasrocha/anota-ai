/**
 * Thermal printing via QZ Tray (silent) with fallback to window.print()
 * QZ Tray must be installed and running: https://qz.io/download/
 */

// Self-signed certificate for QZ Tray — allows silent connection without popup
const QZ_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDYzCCAkugAwIBAgIUBlSR7BOOzP4bdsbaDNXorUmT3u8wDQYJKoZIhvcNAQEL
BQAwQTEfMB0GA1UEAwwWb2ktYW5vdGEtYWkudmVyY2VsLmFwcDERMA8GA1UECgwI
UGl6emFyaWExCzAJBgNVBAYTAkJSMB4XDTI2MDMyNzA4NTQ0MVoXDTM2MDMyNDA4
NTQ0MVowQTEfMB0GA1UEAwwWb2ktYW5vdGEtYWkudmVyY2VsLmFwcDERMA8GA1UE
CgwIUGl6emFyaWExCzAJBgNVBAYTAkJSMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
MIIBCgKCAQEAp1punKA2zahPVJFe0tRcWIe9RJFKHodY/5IsHR68bbo6orRvucLE
oOebb/WByU3W/nH5ZhES96IwxYhyC21P09K6W7dddKyBGZtz+5ehj+tpgPtfUj90
x+1Dc8kficM6epDKmqgAcb1ORusrCC+lDk3/13VJu9DeP/ff6gZh44McuaTiUjE3
InY3N9dwzGGOOLRLmo/bJ5ifZ0+tGeEYdMMiCofKUpglhQwTD5kU94mpGPQkTWa6
WIPEhIM4tdSjFV1omkEXhn1Vvy5diRD6jV/WUqIeAOBLhlYH435bXUHxm2PXayqm
pXSppzFLs819KVRZe40ZWwDTJYkAB7VHiQIDAQABo1MwUTAdBgNVHQ4EFgQUTF1r
UxRyk8rgnNV6OF5hby+33eIwHwYDVR0jBBgwFoAUTF1rUxRyk8rgnNV6OF5hby+3
3eIwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAha4U7kFbRCnk
5tvpZTr02YrpKADxaoFJPnwVRGFiRlB+J5MAqAiysK7aUM7c8swWypWgUqrL5bW1
6xzNEFWmI0sbnT3Je/+4yDJ4QRaEu17ORWZOrVwPgCR6GQI95PFTLjPbadqew6yk
7Hoj1/fAEh5o/CJB73/RTcKH33CI3gIAj0e3vahs1Sd11Y1aebYov+H+sJ0Rv0CR
tAanFly4my77ioH2xo1ia6YuBV8C/ATUQQwcNSOsitjPLQMK/ktlq9qSukthwn9G
dFDA4Suhe0aW/7tq50VWOqVeJLDfR5iV3ibdxZHBTwXLFF1wDbOAqZ1Kdfa7EEJl
ytexwuTNUA==
-----END CERTIFICATE-----`;

const QZ_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCnWm6coDbNqE9U
kV7S1FxYh71EkUoeh1j/kiwdHrxtujqitG+5wsSg55tv9YHJTdb+cflmERL3ojDF
iHILbU/T0rpbt110rIEZm3P7l6GP62mA+19SP3TH7UNzyR+Jwzp6kMqaqABxvU5G
6ysIL6UOTf/XdUm70N4/99/qBmHjgxy5pOJSMTcidjc313DMYY44tEuaj9snmJ9n
T60Z4Rh0wyIKh8pSmCWFDBMPmRT3iakY9CRNZrpYg8SEgzi11KMVXWiaQReGfVW/
Ll2JEPqNX9ZSoh4A4EuGVgfjfltdQfGbY9drKqaldKmnMUuzzX0pVFl7jRlbANMl
iQAHtUeJAgMBAAECggEAC0eI8kFJpE+aZjGklZrmzPg8IVeWCmv2q4YNd1p7mn0t
Z8s3xwpJsKsfkrqWOGxIx+5EYBTZRYu+1Ad74UmJMnaO5TDdCYi5bFGKDgxkoSO9
oQoAPRXGEBYNoGuPNryr77gb0bPuULwwvw6pYDQ+4JGRA3N2KGSd4CubocUzmo7/
Fzk1mR+3F7bX1dXHzfrTpdDq4Z2tO1k/61PjC6l+1Wje9dmHUk+0BHsTddYQlrUZ
ttOUcax2smpWk2Yxl5iVi6yl2foM1lBA6RvS1Az5+JwMw1Hko5iQvpxUWqcVPxoQ
zAQI1hzxGHPXBsFIM9JKyD7/JjUTAHA2M4RZU92bYQKBgQDf4xI3UZFVf11pmWr/
+fQbZIL/mkng8tJAONn64dnFxMl8OshTv+MnlBXdYzHIn2/BugdzBfr7i5pPmcnl
YFNCLysVLxTBBjgjuYvyoYZZC9hJjY0c24pZ492Eg21I4Lb1GgOulZEoUSKhFcuu
P/lNezal8YVrs4j85w8VRVeC4QKBgQC/W34gJiA0qdwZMNJVjY+G1HqDXnwwlQbc
kLqDFyD547JPo7deTHZscifCKEEq2BnhHaJiV6WQbY6ww8L/WmR4zGUUXL2UbY9F
sRANgDHzBhElOVy6S4KBymX4HzXFiBgm427RB4NFCADHsAuPjSuob+Bnd47XiLl0
/qRKxA0BqQKBgGQn6tBAdymuTpWdAlb89I0Ei+3YkdBGEHSWej1Xp9pnTFN84H1G
zFG6V4WwiGbdnFsn44k7VaoOK7wMaltomhZzj2xsoXYwWBDzQn4KcFWJjPpqjoQo
Wl4YJ9LOEKeXj4FaX+dMFaHZmgpB+9o52EcnJa1avHsP1+p7Wy4C1UFBAoGAITdQ
fWQg0wNpITZITHF2KIFZgtQz2nsD5eV5eqfZIYdUvF4+xi+fntNx81HpffZlB56N
QWTVaGycCDLy9kBKkG1qXk562fjqlb5WewF1qimzcDK01eGllcH8UUWZn+Av0RBJ
fB9BugnZmNAGMbTfjy1cVpl6Qg+JobVR72h4mYECgYB7M7ZR36DrS+dJGG1NuUi5
jbHJYXQTBmE5Kl3B5z3jsIQ4hhxNcZ3+M8y/NqXfdoEN8FZM1EvIz2BpRqGa0x0e
0GezYJUsbPxI/jcg/mAmwiEdG90qBdJ3zvjNrbt08aqfSi4Z2jvxj4MqKvzxA/tZ
XE/Ukkx5Ve1OLR5L8woHDw==
-----END PRIVATE KEY-----`;

// Import private key for Web Crypto API signing
let _cryptoKey = null;
async function getCryptoKey() {
  if (_cryptoKey) return _cryptoKey;
  const pem = QZ_PRIVATE_KEY.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  _cryptoKey = await crypto.subtle.importKey(
    'pkcs8', der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
    false, ['sign']
  );
  return _cryptoKey;
}

async function signRequest(toSign) {
  try {
    const key = await getCryptoKey();
    const enc = new TextEncoder();
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(toSign));
    return btoa(String.fromCharCode(...new Uint8Array(sig)));
  } catch {
    return '';
  }
}

let _connected = false;
let _connecting = false;

export async function connectQZ() {
  if (typeof window.qz === 'undefined') return false;
  if (window.qz.websocket.isActive()) { _connected = true; return true; }
  if (_connecting) return false;
  _connecting = true;
  try {
    // Signed certificate mode — no popup in QZ Tray (strict mode off)
    window.qz.security.setCertificatePromise((resolve) => resolve(QZ_CERTIFICATE));
    window.qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
      signRequest(toSign).then(resolve).catch(reject);
    });
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
