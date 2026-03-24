// ─── UTM persistence ─────────────────────────────────────────────────────────

(function persistUtms() {
  const p = new URLSearchParams(window.location.search);
  ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','src','sck'].forEach(k => {
    const v = p.get(k);
    if (v) sessionStorage.setItem('utm_' + k, v);
  });
})();

function getUtms() {
  const p = new URLSearchParams(window.location.search);
  const get = k => p.get(k) || sessionStorage.getItem('utm_' + k) || '';
  return {
    utm_source:   get('utm_source'),
    utm_medium:   get('utm_medium'),
    utm_campaign: get('utm_campaign'),
    utm_term:     get('utm_term'),
    utm_content:  get('utm_content'),
    src:          get('src'),
    sck:          get('sck'),
  };
}

// ─── UTMify ───────────────────────────────────────────────────────────────────

const UTMIFY_TOKEN = 'LwK6NIhKS5SJSICvxc07UDv6zZhLVqssa7yH';
const UTMIFY_BASE  = 'https://api.utmify.com.br/api-credentials/orders';

async function sendUtmifyOrder(orderId, status, amountCents, approvedDate = null) {
  const utms = getUtms();
  const now  = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const payload = {
    orderId:       String(orderId),
    platform:      'other',
    paymentMethod: 'pix',
    status,
    createdAt:     now,
    approvedDate:  approvedDate || null,
    refundedAt:    null,
    customer:      { name: '', email: '', phone: '', document: '' },
    products: [{
      id:           'pedido-pizzaria',
      name:         'Pedido Pizzaria',
      planId:       'pedido-pizzaria',
      planName:     'Pedido Pizzaria',
      quantity:     1,
      priceInCents: amountCents,
    }],
    trackingParameters: utms,
    commission: {
      totalPriceInCents:     amountCents,
      gatewayFeeInCents:     0,
      userCommissionInCents: amountCents,
    },
  };
  try {
    await fetch(UTMIFY_BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-token': UTMIFY_TOKEN },
      body:    JSON.stringify(payload),
    });
  } catch (e) { console.warn('Utmify:', e); }
}

// ─── Pizza flavor data ────────────────────────────────────────────────────────

const B = 'https://client-assets.anota.ai/produtos/65528552aecca100197b7610/';

const PIZZA_FLAVORS = [
  { id: 'fl-mussarela',  name: 'Muçarela',               desc: 'Molho, Muçarela, Tomate, Orégano',                                      img: B + '202309300607_I5J0_i' },
  { id: 'fl-margherita', name: 'Margherita',              desc: 'Molho, Muçarela, Tomate, Manjericão seco',                               img: B + '202309300607_I5J0_i' },
  { id: 'fl-calabresa',  name: 'Calabresa',               desc: 'Molho, Muçarela, Calabresa, Orégano',                                   img: B + '202309300548_01YC_i' },
  { id: 'fl-americana',  name: 'Americana',               desc: 'Molho, Muçarela, Bacon em pedaços, Orégano',                            img: B + '202309300554_0Y52_i' },
  { id: 'fl-bacon',      name: 'Bacon',                   desc: 'Molho, Muçarela, Bacon em pedaços, Orégano',                            img: B + '202309300602_J030_i' },
  { id: 'fl-mista',      name: 'Mista',                   desc: 'Molho, Muçarela, Calabresa e Bacon, Orégano',                           img: B + '202309300603_7K33_i' },
  { id: 'fl-frango',     name: 'Frango Com Requeijão',    desc: 'Molho, Muçarela, Frango, Requeijão, Orégano',                           img: B + '202309300553_4U2S_i' },
  { id: 'fl-viabrasil',  name: 'Via Brasil (Portuguesa)', desc: 'Molho, Muçarela, Calabresa, Bacon, Milho, Ervilha, Tomate, Pimentão',   img: B + '202309300604_N81Q_i' },
];

const SWEET_PIZZAS = [
  { id: 'fl-doce', name: 'Pizza Doce 35cm', desc: 'Pizza doce 35cm', img: 'https://anotaai.s3.us-west-2.amazonaws.com/pizzas/1pizza' },
];

const PIZZA_FLAVORS_PRICED = [
  { id: 'fl-mussarela',  name: 'Muçarela',               desc: 'Molho, Muçarela, Tomate, Orégano',                                      img: B + '202309300607_I5J0_i', price: 3000 },
  { id: 'fl-margherita', name: 'Margherita',              desc: 'Molho, Muçarela, Tomate, Manjericão seco',                               img: B + '202309300607_I5J0_i', price: 3000 },
  { id: 'fl-calabresa',  name: 'Calabresa',               desc: 'Molho, Muçarela, Calabresa, Orégano',                                   img: B + '202309300548_01YC_i', price: 3299 },
  { id: 'fl-bacon',      name: 'Bacon',                   desc: 'Molho, Muçarela, Bacon em pedaços, Orégano',                            img: B + '202309300602_J030_i', price: 3299 },
  { id: 'fl-americana',  name: 'Americana',               desc: 'Molho, Muçarela, Bacon em pedaços, Orégano',                            img: B + '202309300554_0Y52_i', price: 3399 },
  { id: 'fl-frango',     name: 'Frango Com Requeijão',    desc: 'Molho, Muçarela, Frango, Requeijão, Orégano',                           img: B + '202309300553_4U2S_i', price: 3399 },
  { id: 'fl-mista',      name: 'Mista',                   desc: 'Molho, Muçarela, Calabresa e Bacon, Orégano',                           img: B + '202309300603_7K33_i', price: 3399 },
  { id: 'fl-viabrasil',  name: 'Via Brasil (Portuguesa)', desc: 'Molho, Muçarela, Calabresa, Bacon, Milho, Ervilha, Tomate, Pimentão',   img: B + '202309300604_N81Q_i', price: 3499 },
];

const BEVERAGES_LIST = [
  { id: 'bev-guarana', name: 'Guaraná Antarctica 1,5l', desc: 'Garrafa 1,5l' },
  { id: 'bev-pepsi',   name: 'Pepsi 1,5l',              desc: 'Garrafa 1,5l' },
];

// ─── Step templates ───────────────────────────────────────────────────────────

const STEP_TPL = {
  salgadas2: { type: 'flavors',      title: 'Escolha os sabores:',          subtitle: 'Escolha 2 sabores',          required: 2, options: PIZZA_FLAVORS },
  salgadas3: { type: 'flavors',      title: 'Escolha os sabores:',          subtitle: 'Escolha 3 sabores',          required: 3, options: PIZZA_FLAVORS },
  salgadas4: { type: 'flavors',      title: 'Escolha os sabores:',          subtitle: 'Escolha 4 sabores',          required: 4, options: PIZZA_FLAVORS },
  doce1:     { type: 'flavors',      title: 'Escolha a pizza doce:',        subtitle: 'Escolha 1 sabor',            required: 1, options: SWEET_PIZZAS },
  refri1:    { type: 'beverage',     title: 'Escolha o refrigerante:',      subtitle: 'Escolha 1 item',             required: 1, options: BEVERAGES_LIST },
  refri2:    { type: 'beverage',     title: 'Escolha os refrigerantes:',    subtitle: 'Escolha 2 itens',            required: 2, options: BEVERAGES_LIST },
  halves:    { type: 'pizza-halves', title: 'Sabor PIZZA 35CM (8 PEDAÇOS)', subtitle: 'Escolha entre 1 a 2 sabores', min: 1, max: 2, options: PIZZA_FLAVORS_PRICED },
  notes:     { type: 'notes' },
};

function resolveSteps(keys) {
  return (keys || ['notes']).map(k => STEP_TPL[k] || { type: 'notes' });
}

// ─── Menu data ────────────────────────────────────────────────────────────────

const MENU = {
  destaques: [
    {
      id: 'dest1', name: 'Combo Super 4 Pizza De 35cm + 2 Refrigerante',
      desc: '4 Pizzas qualquer sabor do cardápio + 2 Guaraná Antarctica ou Pepsi 1,5l',
      price: 12999, oldPrice: 13989, tag: '7% OFF',
      img: B + '202309300513_JH58_i',
      steps: ['salgadas4', 'refri2', 'notes'],
    },
    {
      id: 'dest2', name: '3 Pizza Salgadas 35cm + 1 Refrigerante',
      desc: '3 Pizzas salgadas qualquer sabor + 1 Guaraná Antarctica ou Pepsi 1,5l',
      price: 8927, oldPrice: 9599, tag: '7% OFF',
      img: B + '-1706189781018blob',
      steps: ['salgadas3', 'refri1', 'notes'],
    },
    {
      id: 'dest3', name: '2 Pizzas Salgadas + 1 Doce 35cm = 3 Pizzas',
      desc: '+1 Guaraná Antarctica ou Pepsi 1,5l incluso',
      price: 8995, oldPrice: 9569, tag: '6% OFF',
      img: B + '-1706190192755blob',
      steps: ['salgadas2', 'doce1', 'refri1', 'notes'],
    },
  ],
  combos: [
    {
      id: 'c1', name: 'Combo Duplo 2 Pizza De 35cm + 1 Refrigerante',
      desc: '2 Pizzas qualquer sabor do cardápio + Guaraná Antarctica ou Pepsi 1,5l',
      price: 6499, img: B + '202309300514_5A60_i',
      steps: ['salgadas2', 'refri1', 'notes'],
    },
    {
      id: 'c2', name: 'Combo Super 4 Pizza De 35cm + 2 Refrigerante',
      desc: '4 Pizzas qualquer sabor do cardápio + 2 Guaraná Antarctica ou Pepsi 1,5l',
      price: 12999, oldPrice: 13989, tag: '7%',
      img: B + '202309300513_JH58_i',
      steps: ['salgadas4', 'refri2', 'notes'],
    },
  ],
  minicombos: [
    {
      id: 'mc1', name: 'Combo Solo 1 Pizza Metade + 1 Guarana',
      desc: '1 Pizza meia a meia qualquer sabor + Guaraná Antarctica 350ml',
      price: 2290, soldOut: true,
      img: B + '-1706205997340blob',
    },
  ],
  trio: [
    {
      id: 't1', name: '3 Pizza Salgadas 35cm + 1 Refrigerante',
      desc: '3 Pizzas salgadas qualquer sabor + 1 Guaraná Antarctica ou Pepsi 1,5l',
      price: 8927, oldPrice: 9599, tag: '7%',
      img: B + '-1706189781018blob',
      steps: ['salgadas3', 'refri1', 'notes'],
    },
    {
      id: 't2', name: '2 Pizzas Salgadas + 1 Doce 35cm = 3 Pizzas',
      desc: '+1 Guaraná Antarctica ou Pepsi 1,5l incluso',
      price: 8995, oldPrice: 9569, tag: '6%',
      img: B + '-1706190192755blob',
      steps: ['salgadas2', 'doce1', 'refri1', 'notes'],
    },
  ],
  salgadas: [
    { id: 'sal1', name: 'Margherita',              desc: 'Molho, Muçarela, Tomate, Manjericão seco em pitadas', price: 2999, img: B + '202309300607_I5J0_i', steps: ['notes'] },
    { id: 'sal2', name: 'Calabresa',               desc: 'Pizza Calabresa 35cm',                                price: 3299, img: B + '202309300548_01YC_i', steps: ['notes'] },
    { id: 'sal3', name: 'Bacon',                   desc: 'Pizza Bacon 35cm',                                    price: 3299, img: B + '202309300602_J030_i', steps: ['notes'] },
    { id: 'sal4', name: 'Mista',                   desc: 'Pizza Mista 35cm',                                    price: 3299, img: B + '202309300603_7K33_i', steps: ['notes'] },
    { id: 'sal5', name: 'Americana',               desc: 'Pizza Americana 35cm',                                price: 3399, img: B + '202309300554_0Y52_i', steps: ['notes'] },
    { id: 'sal6', name: 'Frango Com Requeijão',    desc: 'Pizza Frango Com Requeijão 35cm',                     price: 3399, img: B + '202309300553_4U2S_i', steps: ['notes'] },
    { id: 'sal7', name: 'Via Brasil (Portuguesa)', desc: 'Pizza Via Brasil (Portuguesa) 35cm',                  price: 3499, img: B + '202309300604_N81Q_i', steps: ['notes'] },
  ],
  metade: [
    { id: 'met1', name: 'Margherita (Metade)',            desc: 'Pizza Metade 35cm', price: 1750, soldOut: true, img: B + '202309300607_I5J0_i' },
    { id: 'met2', name: 'Calabresa (Metade)',              desc: 'Pizza Metade 35cm', price: 1750, soldOut: true, img: B + '202309300548_01YC_i' },
    { id: 'met3', name: 'Bacon (Metade)',                  desc: 'Pizza Metade 35cm', price: 1750, soldOut: true, img: B + '202309300602_J030_i' },
    { id: 'met4', name: 'Mista (Metade)',                  desc: 'Pizza Metade 35cm', price: 1750, soldOut: true, img: B + '202309300603_7K33_i' },
    { id: 'met5', name: 'Americana (Metade)',              desc: 'Pizza Metade 35cm', price: 1750, soldOut: true, img: B + '202309300554_0Y52_i' },
    { id: 'met6', name: 'Frango Com Requeijão (Metade)',   desc: 'Pizza Metade 35cm', price: 1750, soldOut: true, img: B + '202309300553_4U2S_i' },
    { id: 'met7', name: 'Via Brasil/Portuguesa (Metade)',  desc: 'Pizza Metade 35cm', price: 1990, soldOut: true, img: B + '202309300604_N81Q_i' },
  ],
  dividas: [
    {
      id: 'div1', name: 'PIZZA 35CM (8 PEDAÇOS)',
      desc: 'Pizza com até 2 sabores e 8 fatias',
      price: 3000, img: B + '-1700061018894blob',
      steps: ['halves', 'notes'],
    },
  ],
  doces: [
    {
      id: 'doc1', name: 'Pizzas Doces 35cm',
      desc: 'Pizza doce 35cm', price: 2499,
      img: 'https://anotaai.s3.us-west-2.amazonaws.com/pizzas/1pizza',
      steps: ['notes'],
    },
  ],
  bebidas: [
    { id: 'beb1', name: 'Guaraná Antarctica 1,5l', desc: 'Refrigerante gelado', price: 900 },
    { id: 'beb2', name: 'Pepsi 1,5l',              desc: 'Refrigerante gelado', price: 900 },
  ],
  adicionais: [
    { id: 'adi1', name: 'Mostarda', desc: 'Adicional Mostarda', price: 100, soldOut: true },
    { id: 'adi2', name: 'Ketchup',  desc: 'Adicional Ketchup',  price: 200 },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(cents) {
  return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function imgOrEmoji(url, fallback, cssClass) {
  if (url) return `<img src="${escHtml(url)}" alt="" loading="lazy" class="${cssClass}" />`;
  return fallback || '🍕';
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

let cart = {};

function addToCart(item) {
  if (cart[item.id]) {
    cart[item.id].qty++;
  } else {
    cart[item.id] = { item, qty: 1 };
  }
  updateCartBadge();
}

let lastAddedCartKey = null;

function addConfiguredToCart(item, note, price) {
  // Each configured item gets a unique cart key so different configurations don't merge
  const key = item.id + '_' + Date.now();
  cart[key] = { item: { ...item, id: key, cartNote: note, price }, qty: 1 };
  lastAddedCartKey = key;
  updateCartBadge();
}

function removeFromCart(id) {
  if (!cart[id]) return;
  if (cart[id].qty > 1) {
    cart[id].qty--;
  } else {
    delete cart[id];
  }
  updateCartBadge();
}

function getCartTotal() {
  return Object.values(cart).reduce((s, { item, qty }) => s + item.price * qty, 0);
}

function getCartCount() {
  return Object.values(cart).reduce((s, { qty }) => s + qty, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const n = getCartCount();
  badge.textContent = n;
  badge.classList.toggle('visible', n > 0);
  badge.classList.add('pulse');
  setTimeout(() => badge.classList.remove('pulse'), 300);
}

// ─── Screen system ────────────────────────────────────────────────────────────

let currentScreen = null;

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  currentScreen = name;
  if (name) {
    const id = 'screen' + name.charAt(0).toUpperCase() + name.slice(1);
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }
}

// ─── Cart Screen ──────────────────────────────────────────────────────────────

function renderCartScreen() {
  const container = document.getElementById('cartScreenItems');
  const count = getCartCount();

  if (count === 0) {
    container.innerHTML = '<p class="cart-screen-empty">Seu carrinho está vazio 🛒</p>';
    document.getElementById('cartScreenAdvance').disabled = true;
    document.getElementById('cartScreenAdvance').textContent = 'Avançar';
    return;
  }

  container.innerHTML = '';
  Object.entries(cart).forEach(([key, { item, qty }]) => {
    const el = document.createElement('div');
    el.className = 'cart-screen-item';
    el.innerHTML = `
      <div class="cart-screen-img">${imgOrEmoji(item.img, item.emoji || '🍕', 'cart-screen-photo')}</div>
      <div class="cart-screen-info">
        <div class="cart-screen-name">${escHtml(item.name)}</div>
        ${item.cartNote ? `<div class="cart-screen-note">${escHtml(item.cartNote)}</div>` : ''}
        <div class="cart-screen-price">${fmtPrice(item.price * qty)}</div>
      </div>
      <div class="cart-screen-qty">
        <button class="cart-screen-qty-btn" data-key="${escHtml(key)}" data-action="dec">−</button>
        <span class="cart-screen-qty-num">${qty}</span>
        <button class="cart-screen-qty-btn" data-key="${escHtml(key)}" data-action="inc">+</button>
      </div>
    `;
    container.appendChild(el);
  });

  const totalRow = document.createElement('div');
  totalRow.className = 'cart-screen-total-row';
  totalRow.innerHTML = `<span>Total</span><span class="cart-screen-total">${fmtPrice(getCartTotal())}</span>`;
  container.appendChild(totalRow);

  const advBtn = document.getElementById('cartScreenAdvance');
  advBtn.disabled = false;
  advBtn.textContent = `Avançar • ${fmtPrice(getCartTotal())}`;

  container.querySelectorAll('.cart-screen-qty-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const key = btn.dataset.key;
      if (btn.dataset.action === 'dec') {
        removeFromCart(key);
      } else {
        if (cart[key]) { cart[key].qty++; updateCartBadge(); }
      }
      renderCartScreen();
    });
  });
}

// ─── Render menu ──────────────────────────────────────────────────────────────

function handleItemClick(item) {
  if (item.steps) {
    openProductModal(item);
  } else {
    addToCart(item);
    showToast('Adicionado ao carrinho ✅');
  }
}

function renderMenu() {
  // ── Destaques (horizontal cards)
  const featRow = document.getElementById('grid-destaques');
  featRow.innerHTML = '';
  MENU.destaques.forEach(item => {
    const el = document.createElement('div');
    el.className = 'feat-card';
    el.innerHTML = `
      ${item.tag ? `<span class="feat-tag">${escHtml(item.tag)}</span>` : ''}
      <div class="feat-card-img">${imgOrEmoji(item.img, item.emoji, 'feat-card-photo')}</div>
      <div class="feat-card-body">
        <div class="feat-card-name">${escHtml(item.name)}</div>
        ${item.oldPrice ? `<span class="feat-card-old">${fmtPrice(item.oldPrice)}</span>` : ''}
        <div class="feat-card-price">${fmtPrice(item.price)}</div>
      </div>
    `;
    el.addEventListener('click', () => handleItemClick(item));
    featRow.appendChild(el);
  });

  // ── All list sections
  const sections = [
    { key: 'combos',     id: 'list-combos' },
    { key: 'minicombos', id: 'list-minicombos' },
    { key: 'trio',       id: 'list-trio' },
    { key: 'salgadas',   id: 'list-salgadas' },
    { key: 'metade',     id: 'list-metade' },
    { key: 'dividas',    id: 'list-dividas' },
    { key: 'doces',      id: 'list-doces' },
    { key: 'bebidas',    id: 'list-bebidas' },
    { key: 'adicionais', id: 'list-adicionais' },
  ];
  sections.forEach(({ key, id }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    MENU[key].forEach(item => renderListItem(item, el));
  });
}

function renderListItem(item, container) {
  const el = document.createElement('div');
  el.className = 'prod-item' + (item.soldOut ? ' prod-sold-out' : '');
  el.innerHTML = `
    <div class="prod-info">
      <div class="prod-name">${escHtml(item.name)}</div>
      <div class="prod-desc">${escHtml(item.desc || '')}</div>
      <div class="prod-price-row">
        ${item.oldPrice ? `<span class="prod-old">${fmtPrice(item.oldPrice)}</span>` : ''}
        <span class="prod-price">${fmtPrice(item.price)}</span>
        ${item.tag ? `<span class="prod-discount">${escHtml(item.tag)}</span>` : ''}
      </div>
    </div>
    <div class="prod-img">${imgOrEmoji(item.img, item.emoji || '🍕', 'prod-img-photo')}</div>
    ${item.soldOut ? '<span class="sold-out-badge">Esgotado</span>' : ''}
  `;
  if (!item.soldOut) {
    el.addEventListener('click', () => handleItemClick(item));
  }
  container.appendChild(el);
}

// ─── Toast ────────────────────────────────────────────────────────────────────

let toastEl = null;
let toastTimer = null;
function showToast(msg) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    Object.assign(toastEl.style, {
      position: 'fixed', bottom: '72px', left: '50%', transform: 'translateX(-50%)',
      background: '#1a1a1a', color: '#fff', padding: '10px 18px', borderRadius: '24px',
      fontSize: '14px', fontWeight: '600', zIndex: '500', transition: 'opacity .2s',
      pointerEvents: 'none', whiteSpace: 'nowrap', maxWidth: 'calc(100vw - 40px)',
    });
    document.body.appendChild(toastEl);
  }
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.style.opacity = '1';
  toastTimer = setTimeout(() => { toastEl.style.opacity = '0'; }, 1800);
}

// ─── Cart modal (legacy — not used, kept for reference) ───────────────────────

// ─── Category nav + collapsible ───────────────────────────────────────────────

function initCatNav() {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sec = document.getElementById('sec-' + btn.dataset.cat);
      if (sec) {
        const offset = 56 + 40 + 46 + 8;
        const top = sec.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

function initCollapsible() {
  document.querySelectorAll('.section-header-coll').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const target = document.getElementById(hdr.dataset.target);
      if (!target) return;
      hdr.classList.toggle('collapsed');
      target.classList.toggle('hidden');
    });
  });
}

// ─── Scroll spy ───────────────────────────────────────────────────────────────

function initScrollSpy() {
  const sections = ['destaques','combos','minicombos','trio','salgadas','metade','dividas','doces','bebidas','adicionais'];
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id.replace('sec-', '');
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`[data-cat="${id}"]`);
        if (btn) {
          btn.classList.add('active');
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    });
  }, { rootMargin: '-150px 0px -60% 0px', threshold: 0 });

  sections.forEach(id => {
    const el = document.getElementById('sec-' + id);
    if (el) obs.observe(el);
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────

function initSearch() {
  const overlay  = document.getElementById('searchOverlay');
  const input    = document.getElementById('searchInput');
  const results  = document.getElementById('searchResults');
  const allItems = Object.values(MENU).flat();

  document.getElementById('searchBtn').addEventListener('click', () => {
    overlay.classList.add('open');
    setTimeout(() => input.focus(), 50);
  });
  document.getElementById('searchClose').addEventListener('click', () => {
    overlay.classList.remove('open');
    input.value = '';
    results.innerHTML = '';
  });

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    results.innerHTML = '';
    if (!q) return;
    const found = allItems.filter(i =>
      i.name.toLowerCase().includes(q) || (i.desc || '').toLowerCase().includes(q)
    );
    if (!found.length) {
      results.innerHTML = '<p class="search-no-results">Nenhum produto encontrado 🔍</p>';
      return;
    }
    found.forEach(item => {
      const el = document.createElement('div');
      el.className = 'search-item' + (item.soldOut ? ' prod-sold-out' : '');
      el.innerHTML = `
        <div class="search-item-emoji">${imgOrEmoji(item.img, item.emoji || '🍕', 'search-item-photo')}</div>
        <div class="prod-info">
          <div class="prod-name">${escHtml(item.name)}</div>
          <div class="prod-price">${fmtPrice(item.price)}</div>
        </div>
        ${item.soldOut ? '<span class="sold-out-badge" style="position:static;margin-left:auto">Esgotado</span>' : ''}
      `;
      if (!item.soldOut) {
        el.addEventListener('click', () => {
          overlay.classList.remove('open');
          input.value = '';
          results.innerHTML = '';
          handleItemClick(item);
        });
      }
      results.appendChild(el);
    });
  });
}

// ─── Share ────────────────────────────────────────────────────────────────────

document.getElementById('shareBtn').addEventListener('click', () => {
  if (navigator.share) {
    navigator.share({ title: 'Superp Delivery — Cardápio', url: window.location.href });
  } else {
    navigator.clipboard.writeText(window.location.href)
      .then(() => showToast('🔗 Link copiado!'));
  }
});

// ─── Bottom nav ───────────────────────────────────────────────────────────────

document.getElementById('navInicio').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('navInicio').classList.add('active');
});
document.getElementById('navPedidos').addEventListener('click', () => {
  showToast('🧾 Sem pedidos anteriores');
});
document.getElementById('navCarrinho').addEventListener('click', () => {
  renderCartScreen();
  showScreen('cart');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('navCarrinho').classList.add('active');
});

// ─── Cart Screen events ───────────────────────────────────────────────────────

document.getElementById('cartScreenBack').addEventListener('click', () => {
  showScreen(null);
});
document.getElementById('cartScreenClear').addEventListener('click', () => {
  if (Object.keys(cart).length === 0) return;
  cart = {};
  updateCartBadge();
  showScreen(null);
  showToast('Carrinho limpo 🗑️');
});
document.getElementById('cartScreenAdvance').addEventListener('click', () => {
  showScreen('checkout');
});

// ─── Checkout Screen events ───────────────────────────────────────────────────

document.getElementById('checkoutBack').addEventListener('click', () => {
  renderCartScreen();
  showScreen('cart');
});

function validateCheckout() {
  const name  = document.getElementById('checkoutName').value.trim();
  const phone = document.getElementById('checkoutPhone').value.replace(/\D/g, '');
  document.getElementById('checkoutAdvance').disabled = !(name.length >= 1 && phone.length >= 10);
}
document.getElementById('checkoutName').addEventListener('input', validateCheckout);
document.getElementById('checkoutPhone').addEventListener('input', validateCheckout);

document.getElementById('checkoutAdvance').addEventListener('click', () => {
  const name  = document.getElementById('checkoutName').value.trim();
  const phone = document.getElementById('checkoutPhone').value.trim();
  document.getElementById('confirmInfo').innerHTML =
    `<strong>Nome:</strong> ${escHtml(name)}<br><strong>WhatsApp:</strong> ${escHtml(phone)}`;
  document.getElementById('checkoutConfirm').classList.remove('hidden');
});
document.getElementById('confirmEdit').addEventListener('click', () => {
  document.getElementById('checkoutConfirm').classList.add('hidden');
});
document.getElementById('confirmOk').addEventListener('click', () => {
  document.getElementById('checkoutConfirm').classList.add('hidden');
  showScreen('finalize');
  updateFinalizeBtn();
});

// ─── Finalize Screen events ───────────────────────────────────────────────────

document.getElementById('finalizeBack').addEventListener('click', () => {
  showScreen('checkout');
});

function updateFinalizeBtn() {
  const addr = document.getElementById('finalizeAddress').value.trim();
  const btn  = document.getElementById('finalizeAdvance');
  btn.disabled = addr.length === 0;
  btn.textContent = addr.length > 0
    ? `Ir para pagamento • ${fmtPrice(getCartTotal())}`
    : 'Ir para pagamento';
}
document.getElementById('finalizeAddress').addEventListener('input', updateFinalizeBtn);

document.getElementById('finalizeAdvance').addEventListener('click', () => {
  openPixModal();
});

// ─── PIX Modal ────────────────────────────────────────────────────────────────

let countdownSecs  = 600;
let countdownTimer = null;
let pollInterval   = null;
let currentPixId   = null;
let currentAmount  = 0;

function openPixModal() {
  currentAmount = getCartTotal();
  document.getElementById('pixAmountDisplay').textContent = fmtPrice(currentAmount);
  document.getElementById('pixKey').textContent           = 'Gerando PIX...';
  document.getElementById('copyBtn').disabled             = true;
  document.getElementById('copyBtnInline').disabled       = true;
  document.getElementById('copyLabel').textContent        = 'Copiar código';

  // Restaura área do timer caso tenha sido substituída pelo estado "expirado"
  const timerWrap = document.querySelector('.pix-timer-wrap');
  if (timerWrap && !timerWrap.querySelector('#countdown')) {
    timerWrap.innerHTML = `
      <p class="pix-timer-label">Tempo restante</p>
      <div class="pix-ring-wrap">
        <svg class="pix-ring-svg" viewBox="0 0 130 130">
          <circle class="pix-ring-bg" cx="65" cy="65" r="54"/>
          <circle class="pix-ring-fg" cx="65" cy="65" r="54" id="pixRingProgress"/>
        </svg>
        <span class="pix-timer-num" id="countdown">05:00</span>
      </div>`;
  }

  showScreen('pix');
  startCountdown();
  createPix();
}

function startCountdown() {
  const TOTAL  = 300;
  const CIRC   = 2 * Math.PI * 54; // 339.29
  countdownSecs = TOTAL;
  clearInterval(countdownTimer);
  const el   = document.getElementById('countdown');
  const ring = document.getElementById('pixRingProgress');

  function tick() {
    const m = String(Math.floor(countdownSecs / 60)).padStart(2, '0');
    const s = String(countdownSecs % 60).padStart(2, '0');
    if (el) el.textContent = `${m}:${s}`;
    // atualiza o anel SVG: offset 0 = cheio, CIRC = vazio
    if (ring) ring.style.strokeDashoffset = CIRC * (1 - countdownSecs / TOTAL);
    if (countdownSecs === 0) {
      clearInterval(countdownTimer);
      clearInterval(pollInterval);
      // Substitui a área do timer pelo estado "expirado"
      const timerWrap = document.querySelector('.pix-timer-wrap');
      if (timerWrap) {
        timerWrap.innerHTML = `
          <div class="pix-expired-wrap">
            <span class="pix-expired-icon">⏰</span>
            <span class="pix-expired-label">Tempo esgotado</span>
            <button class="pix-new-key-btn" id="pixNewKeyBtn">
              🔄 Gerar nova chave PIX
            </button>
          </div>`;
        document.getElementById('pixNewKeyBtn').addEventListener('click', openPixModal);
      }
      return;
    }
    countdownSecs--;
  }

  tick(); // renderiza imediatamente
  countdownTimer = setInterval(tick, 1000);
}

async function createPix() {
  const amount = currentAmount;
  try {
    const utms = getUtms();
    const res = await fetch('/api/pix', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ amount, description: 'Pedido Pizzaria', metadata: utms }),
    });
    if (!res.ok) throw new Error('api error');
    const data = await res.json();
    currentPixId = data.id;

    document.getElementById('pixKey').textContent       = data.pix_copy_paste;
    document.getElementById('copyBtn').disabled          = false;
    document.getElementById('copyBtnInline').disabled    = false;

    sendUtmifyOrder(currentPixId, 'waiting_payment', amount);
    startPolling();
  } catch (e) {
    document.getElementById('pixKey').textContent = 'Erro ao gerar PIX. Feche e tente novamente.';
  }
}

function startPolling() {
  clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    if (!currentPixId) return;
    try {
      const res  = await fetch(`/api/pix-status?id=${currentPixId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === 'paid') showPaymentSuccess();
      if (data.status === 'expired' || data.status === 'cancelled') {
        clearInterval(pollInterval);
        document.getElementById('pixKey').textContent = 'PIX expirado. Feche e tente novamente.';
      }
    } catch (e) {}
  }, 4000);
}

function showPaymentSuccess() {
  clearInterval(pollInterval);
  clearInterval(countdownTimer);
  const approvedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
  sendUtmifyOrder(currentPixId, 'paid', currentAmount, approvedDate);

  const card = document.querySelector('#screenPix .pix-screen-body');
  card.innerHTML = `
    <div style="text-align:center;padding:52px 20px 44px">
      <div style="font-size:72px;margin-bottom:16px">✅</div>
      <h2 style="color:#27ae60;font-size:22px;font-weight:800;margin-bottom:10px">Pedido Confirmado!</h2>
      <p style="color:#888;font-size:14px;line-height:1.8">
        Pagamento recebido com sucesso!<br>
        🍕 Sua pizza já está sendo preparada.<br>
        Redirecionando em <strong id="redirectCount" style="color:#27ae60">3</strong>s...
      </p>
    </div>`;

  cart = {};
  updateCartBadge();

  let count = 3;
  const t = setInterval(() => {
    count--;
    const el = document.getElementById('redirectCount');
    if (el) el.textContent = count;
    if (count <= 0) { clearInterval(t); window.location.href = 'https://recusa-4-90.vercel.app/'; }
  }, 1000);
}

document.getElementById('pixPaidBtn').addEventListener('click', () => {
  startPolling();
  showToast('Verificando pagamento...');
});

document.getElementById('pixScreenBack').addEventListener('click', () => {
  clearInterval(countdownTimer);
  clearInterval(pollInterval);
  showScreen('finalize');
});

function doCopyPix() {
  const key = document.getElementById('pixKey').textContent;
  navigator.clipboard.writeText(key).then(() => {
    const btn   = document.getElementById('copyBtn');
    const label = document.getElementById('copyLabel');
    btn.classList.add('copied');
    label.textContent = 'Copiado! ✓';
    setTimeout(() => { btn.classList.remove('copied'); label.textContent = 'Copiar código'; }, 2000);
  });
}
document.getElementById('copyBtn').addEventListener('click', doCopyPix);
document.getElementById('copyBtnInline').addEventListener('click', doCopyPix);

// ─── Product Modal ────────────────────────────────────────────────────────────

let pmItem  = null;
let pmQtys  = {}; // { stepIdx: { optionId: qty } }
let pmHalves = new Set();
let pmNotes = '';
let pmHalvesStep = null; // reference to halves step for price calculation

function openProductModal(item) {
  pmItem       = item;
  pmQtys       = {};
  pmHalves     = new Set();
  pmNotes      = '';
  pmHalvesStep = null;

  // Header
  document.getElementById('productModalHeader').innerHTML = `
    <div class="pm-header-img">${imgOrEmoji(item.img, item.emoji || '🍕', 'pm-header-photo')}</div>
    <div class="pm-header-info">
      <div class="pm-header-name">${escHtml(item.name)}</div>
      ${item.desc ? `<div class="pm-header-desc">${escHtml(item.desc)}</div>` : ''}
      <div class="pm-header-price" id="pmPriceDisplay">${fmtPrice(item.price)}</div>
    </div>
  `;

  // Body — render steps
  const body = document.getElementById('productModalBody');
  body.innerHTML = '';
  body.scrollTop = 0;
  const steps = resolveSteps(item.steps);
  steps.forEach((step, idx) => {
    const el = buildStepEl(step, idx);
    if (el) body.appendChild(el);
  });

  // Reset footer to "selecting" state
  document.getElementById('pmFooterNormal').classList.remove('hidden');
  document.getElementById('pmFooterAdded').classList.add('hidden');

  updatePmBtn();
  document.getElementById('productModal').classList.add('open');
}

function buildStepEl(step, idx) {
  if (step.type === 'flavors' || step.type === 'beverage') return buildQtyStep(step, idx);
  if (step.type === 'pizza-halves') { pmHalvesStep = step; return buildHalvesStep(step); }
  if (step.type === 'notes')        return buildNotesEl();
  return null;
}

// ── Auto-scroll to next step ──────────────────────────────────────────────────

function scrollToNextStep(currentWrap) {
  const next = currentWrap.nextElementSibling;
  if (!next) return;
  setTimeout(() => {
    const body = document.getElementById('productModalBody');
    if (!body) return;
    const bodyRect = body.getBoundingClientRect();
    const nextRect = next.getBoundingClientRect();
    const target = body.scrollTop + (nextRect.top - bodyRect.top) - 8;
    body.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, 200);
}

// ── Qty-based step (flavors / beverage) ──────────────────────────────────────

function buildQtyStep(step, idx) {
  pmQtys[idx] = {};
  const required = step.required || 0;

  const wrap = document.createElement('div');
  wrap.className = 'pm-step';
  wrap.innerHTML = `
    <div class="pm-step-header">
      <div>
        <div class="pm-step-title">${escHtml(step.title)}</div>
        <div class="pm-step-subtitle">${escHtml(step.subtitle || '')}</div>
      </div>
      <span class="${required ? 'pm-required-badge' : 'pm-optional-badge'}">${required ? 'Obrigatório' : 'Opcional'}</span>
    </div>
  `;

  const list = document.createElement('div');

  step.options.forEach(opt => {
    const row = document.createElement('div');
    row.className = 'pm-option';
    row.innerHTML = `
      <div class="pm-option-img">${opt.img ? `<img src="${escHtml(opt.img)}" alt="" loading="lazy" />` : '🍕'}</div>
      <div class="pm-option-info">
        <div class="pm-option-name">${escHtml(opt.name)}</div>
        ${opt.desc ? `<div class="pm-option-desc">${escHtml(opt.desc)}</div>` : ''}
      </div>
      <div class="pm-option-controls">
        <button class="pm-qty-btn" data-action="dec" data-step="${idx}" data-opt="${opt.id}" disabled>−</button>
        <span class="pm-qty-num" id="pmq-${idx}-${opt.id}">0</span>
        <button class="pm-qty-btn" data-action="inc" data-step="${idx}" data-opt="${opt.id}">+</button>
      </div>
    `;
    list.appendChild(row);
  });

  list.addEventListener('click', e => {
    const btn = e.target.closest('.pm-qty-btn');
    if (!btn) return;
    const si   = parseInt(btn.dataset.step);
    const oid  = btn.dataset.opt;
    const qtys = pmQtys[si];
    const tot  = () => Object.values(qtys).reduce((s, q) => s + q, 0);

    if (btn.dataset.action === 'dec') {
      if ((qtys[oid] || 0) > 0) qtys[oid]--;
    } else {
      if (!required || tot() < required) {
        qtys[oid] = (qtys[oid] || 0) + 1;
      }
    }

    // Update display
    const numEl = document.getElementById(`pmq-${si}-${oid}`);
    if (numEl) numEl.textContent = qtys[oid] || 0;

    // Enable/disable buttons
    const t = tot();
    list.querySelectorAll('.pm-qty-btn').forEach(b => {
      const bid = b.dataset.opt;
      if (b.dataset.action === 'dec') {
        b.disabled = (qtys[bid] || 0) === 0;
      } else {
        b.disabled = required > 0 && t >= required;
      }
    });

    updatePmBtn();

    // Auto-scroll to next step when this step is complete
    if (btn.dataset.action === 'inc' && required > 0 && t === required) {
      scrollToNextStep(wrap);
    }
  });

  wrap.appendChild(list);
  return wrap;
}

// ── Pizza halves step (checkbox, 1–2 flavors) ─────────────────────────────────

function buildHalvesStep(step) {
  const wrap = document.createElement('div');
  wrap.className = 'pm-step';
  wrap.innerHTML = `
    <div class="pm-step-header">
      <div>
        <div class="pm-step-title">${escHtml(step.title)}</div>
        <div class="pm-step-subtitle">${escHtml(step.subtitle || '')}</div>
      </div>
      <span class="pm-required-badge">Obrigatório</span>
    </div>
  `;

  const list = document.createElement('div');
  step.options.forEach(opt => {
    const row = document.createElement('div');
    row.className = 'pm-option';
    row.innerHTML = `
      <div class="pm-option-img">${opt.img ? `<img src="${escHtml(opt.img)}" alt="" loading="lazy" />` : '🍕'}</div>
      <div class="pm-option-info">
        <div class="pm-option-name">${escHtml(opt.name)}</div>
        ${opt.desc  ? `<div class="pm-option-desc">${escHtml(opt.desc)}</div>` : ''}
        ${opt.price ? `<div class="pm-option-price">${fmtPrice(opt.price)}</div>` : ''}
      </div>
      <div class="pm-checkbox" data-opt="${opt.id}"></div>
    `;
    row.addEventListener('click', () => {
      if (pmHalves.has(opt.id)) {
        pmHalves.delete(opt.id);
      } else if (pmHalves.size < step.max) {
        pmHalves.add(opt.id);
      } else {
        showToast(`Máximo ${step.max} sabores`);
        return;
      }
      list.querySelectorAll('.pm-checkbox').forEach(cb => {
        cb.classList.toggle('checked', pmHalves.has(cb.dataset.opt));
      });
      // Update price display
      if (pmHalves.size > 0) {
        const maxP = Math.max(...step.options.filter(o => pmHalves.has(o.id)).map(o => o.price || 0));
        const el = document.getElementById('pmPriceDisplay');
        if (el) el.textContent = fmtPrice(maxP);
      }
      updatePmBtn();

      // Auto-scroll to next step when max flavors are selected
      if (pmHalves.size === step.max) {
        scrollToNextStep(wrap);
      }
    });
    list.appendChild(row);
  });

  wrap.appendChild(list);
  return wrap;
}

// ── Notes step ────────────────────────────────────────────────────────────────

function buildNotesEl() {
  const wrap = document.createElement('div');
  wrap.className = 'pm-step';
  wrap.innerHTML = `
    <div class="pm-step-header">
      <div>
        <div class="pm-step-title">Observações</div>
        <div class="pm-step-subtitle">Alguma instrução especial?</div>
      </div>
      <span class="pm-optional-badge">Opcional</span>
    </div>
    <div class="pm-notes-wrap">
      <textarea class="pm-notes-textarea" placeholder="Ex.: Tirar cebola, sem orégano, etc."></textarea>
    </div>
  `;
  wrap.querySelector('textarea').addEventListener('input', e => { pmNotes = e.target.value; });
  return wrap;
}

// ── Validation & submit ───────────────────────────────────────────────────────

function checkPmValid() {
  if (!pmItem) return false;
  return resolveSteps(pmItem.steps).every((step, idx) => {
    if (step.type === 'flavors' || step.type === 'beverage') {
      if (!step.required) return true;
      const tot = Object.values(pmQtys[idx] || {}).reduce((s, q) => s + q, 0);
      return tot >= step.required;
    }
    if (step.type === 'pizza-halves') return pmHalves.size >= (step.min || 1);
    return true;
  });
}

function updatePmBtn() {
  const btn = document.getElementById('productModalAddBtn');
  if (!btn) return;
  const valid = checkPmValid();
  btn.disabled = !valid;
  if (pmItem) {
    let price = pmItem.price;
    if (pmHalvesStep && pmHalves.size > 0) {
      price = Math.max(...pmHalvesStep.options.filter(o => pmHalves.has(o.id)).map(o => o.price || price));
    }
    btn.textContent = valid ? `Adicionar • ${fmtPrice(price)}` : 'Adicionar';
  }
}

function buildCartNote() {
  const parts = [];
  resolveSteps(pmItem.steps).forEach((step, idx) => {
    if (step.type === 'flavors' || step.type === 'beverage') {
      const chosen = [];
      Object.entries(pmQtys[idx] || {}).forEach(([oid, qty]) => {
        if (qty > 0) {
          const opt = step.options.find(o => o.id === oid);
          if (opt) chosen.push(qty > 1 ? `${qty}x ${opt.name}` : opt.name);
        }
      });
      if (chosen.length) parts.push(chosen.join(', '));
    } else if (step.type === 'pizza-halves') {
      const chosen = step.options.filter(o => pmHalves.has(o.id)).map(o => o.name);
      if (chosen.length) parts.push(chosen.join(' + '));
    }
  });
  if (pmNotes.trim()) parts.push(`Obs: ${pmNotes.trim()}`);
  return parts.join(' | ');
}

document.getElementById('productModalClose').addEventListener('click', () => {
  document.getElementById('productModal').classList.remove('open');
});

document.getElementById('productModalAddBtn').addEventListener('click', () => {
  if (!checkPmValid()) return;

  let price = pmItem.price;
  if (pmHalvesStep && pmHalves.size > 0) {
    price = Math.max(...pmHalvesStep.options.filter(o => pmHalves.has(o.id)).map(o => o.price || price));
  }

  const note = buildCartNote();
  addConfiguredToCart(pmItem, note, price);

  // Show post-add state
  document.getElementById('pmFooterNormal').classList.add('hidden');
  document.getElementById('pmFooterAdded').classList.remove('hidden');
  document.getElementById('pmQtyNum').textContent = '1';
});

// Post-add footer events
document.getElementById('pmQtyDec').addEventListener('click', () => {
  if (!lastAddedCartKey) return;
  const entry = cart[lastAddedCartKey];
  if (!entry) { document.getElementById('pmQtyNum').textContent = '0'; return; }
  if (entry.qty <= 1) {
    delete cart[lastAddedCartKey];
    lastAddedCartKey = null;
    document.getElementById('pmQtyNum').textContent = '0';
  } else {
    entry.qty--;
    document.getElementById('pmQtyNum').textContent = entry.qty;
  }
  updateCartBadge();
});
document.getElementById('pmQtyInc').addEventListener('click', () => {
  if (!lastAddedCartKey || !cart[lastAddedCartKey]) return;
  cart[lastAddedCartKey].qty++;
  document.getElementById('pmQtyNum').textContent = cart[lastAddedCartKey].qty;
  updateCartBadge();
});
document.getElementById('pmContinueBtn').addEventListener('click', () => {
  document.getElementById('productModal').classList.remove('open');
});
document.getElementById('pmAdvanceCartBtn').addEventListener('click', () => {
  document.getElementById('productModal').classList.remove('open');
  renderCartScreen();
  showScreen('cart');
});

// ─── Init ─────────────────────────────────────────────────────────────────────

renderMenu();
initCatNav();
initCollapsible();
initSearch();
initScrollSpy();
