// ─── Data ───────────────────────────────────────────────────────────────────

const CONTACTS = [
  {
    id: 1,
    name: 'Verificação de Segurança',
    initials: '🛡️',
    color: '#2CA5E0',
    avatar: null,
    status: 'sistema ativo',
    unread: 0,
    messages: [
      {
        id: 0, out: false, type: 'video',
        src: 'imagens e videos/grupo vip.mp4',
        duration: '0:15',
        caption: '𝗩𝗜𝗣 𝗗𝗔𝗦 𝗙𝗔𝗩𝗘𝗟𝟰𝗗𝗜𝗡𝗛.𝗦 𝗗𝗘 𝗕𝗔𝗜𝗫𝗔 𝗥𝗘𝗡𝗗𝗔 𝗠𝗔𝗜𝗦 𝗦𝗔𝗙𝗔𝗗𝗔𝗦 𝗗𝗢 𝗧𝗘𝗟𝗘𝗚𝗥𝗔𝗠 💦💥\n\n+𝟭𝟯𝟬 𝗺𝗶𝗹 𝘃𝗶𝗱𝗲𝗼𝘀 𝗲 𝗳𝗼𝘁𝗼𝘀 𝗧𝗨𝗗𝗢 𝗣𝗢𝗥 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗜𝗔𝗦:\n💨G𝗼𝘀𝘁𝗼𝘀𝗮𝘀 𝗽𝗼𝗯𝗿𝗲𝘀 𝗲 𝘁𝗮𝗿𝗮𝗱𝗮𝘀 𝗾𝘂𝗲 𝗻𝗮𝗼 𝘁𝗲𝗺 𝗹𝗶𝗺𝗶𝘁𝗲\n🏠𝗗𝗼𝗻𝗮 𝗱𝗲 𝗰𝗮𝘀𝗮 𝗾𝘂𝗲𝗿𝗲𝗻𝗱𝗼 𝗮𝘁𝗲𝗻çã𝗼 𝗔𝗾𝘂𝗲𝗹𝗮\n💀𝘀𝘂𝗮 𝗣𝗥𝟭𝗠𝟰 𝗾𝘂𝗲 𝘁𝗲 𝗱𝗲𝗶𝘅𝗮 𝗱𝗲 𝗽𝗮𝘂 𝗱𝘂𝗿𝗼 𝗕𝗿𝗮𝘀𝗶𝗹𝗲𝗶𝗿𝗮𝘀 𝗱𝗮 𝗙𝗮𝘃𝗲𝗹𝗮\n🧪 𝗡𝗼𝗶𝗮𝗱𝗶𝗻𝗵𝗮𝘀 𝗚𝗼𝘀𝘁𝗼𝘀𝗮𝘀 𝗱𝗼 𝗯𝗮𝗿𝗿𝗮𝗰𝗼 𝗳𝗮𝘇𝗲𝗻𝗱𝗼 𝘁𝘂𝗱𝗼 𝗾𝘂𝗮𝗻𝗱𝗼 𝗮 𝗺𝗮𝗲 𝘁𝗮 𝗳𝗼𝗿𝗮\n🙈𝗣#𝗻𝗵𝗲𝘁𝗮 𝗲 𝗯𝗼𝗾𝘁𝗲 𝗲𝗺 𝘃𝗶𝗲𝗹𝗮𝘀, C𝗼𝗻𝘀𝘁𝗿𝘂çã𝗼 𝗠𝗔𝗘 𝗱𝗲 𝗡𝟬𝗩𝟭𝗡𝗛𝟰 𝗱𝗮 𝗽𝗲𝗿𝗶𝗳𝗲𝗿𝗶𝗮 𝗾𝘂𝗲 𝗮𝗱𝗼𝗿𝗮 𝘀𝗲 𝗲𝘅𝗶𝗯𝗶𝗿\n🙈𝟭𝗻𝗰𝗲𝘀𝘁𝗼𝘀 𝗻𝗮 𝗙𝗮𝘃𝟯𝗹𝗮 𝗦𝗲 𝘃𝗼𝗰𝗲 𝗰𝘂𝗿𝘁𝗲 𝗳𝗮𝘃𝗲𝗹𝗮𝗱𝗶𝗻𝗵𝗮𝘀, 𝗱𝗲𝘀𝗲𝗽𝗲𝗿𝗮𝗱𝗮𝘀, 𝗮𝗺𝗮𝗱𝗼𝗿𝗮𝘀 𝗱𝗮 𝗰𝗮𝘀𝗮 𝘀𝗲𝗺 𝗿𝗲𝗯𝗼𝗰𝗼 𝗲 𝗱𝗼𝗻𝗮𝘀 𝗱𝗲 𝗰𝗮𝘀𝗮\n\nSe você gosta disso tudo ➜ 𝗝𝗮 𝘀𝗮𝗯𝗲 𝗼𝗻𝗱𝗲 𝗲𝗻𝘁𝗿𝗮𝗿 👇',
        time: '09:10'
      },
      {
        id: 1, out: false, type: 'cta',
        label: 'Entrar no grupo vip + proteção — R$ 19,90',
        time: '09:10'
      },
      {
        id: 2, out: false, type: 'alert',
        title: 'Ação necessária antes de continuar',
        body: 'Para acessar o grupo e seus conteúdos exclusivos, você precisa ativar a proteção dos seus dados agora.',
        time: '09:10'
      },
      {
        id: 3, out: false, type: 'richtext',
        html: 'Este grupo utiliza um <strong>sistema de verificação de segurança obrigatório</strong>.<br><br>Antes de liberar seu acesso completo, você precisa ativar a proteção — isso garante que sua identidade e atividade dentro do grupo fiquem <span class="msg-highlight">100% privadas</span>.<br><br><strong>Sem a ativação, seu acesso será bloqueado automaticamente.</strong>',
        time: '09:10'
      },
      {
        id: 4, out: false, type: 'benefits',
        time: '09:10'
      },
    ]
  },
];

// ─── State ───────────────────────────────────────────────────────────────────

let activeId = null;

// ─── DOM refs ────────────────────────────────────────────────────────────────

const messagesArea  = document.getElementById('messagesArea');
const topbarName    = document.getElementById('topbarName');
const topbarStatus  = document.getElementById('topbarStatus');
const topbarAvatar  = document.getElementById('topbarAvatar');
const msgInput      = document.getElementById('msgInput');
const sendBtn       = document.getElementById('sendBtn');
const scrollDownBtn = document.getElementById('scrollDownBtn');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ─── Render messages ─────────────────────────────────────────────────────────

let typingRow = null;

function showTypingIndicator() {
  hideTypingIndicator();
  typingRow = document.createElement('div');
  typingRow.className = 'msg-row in';
  typingRow.innerHTML = `
    <div class="bubble typing-indicator">
      <span></span><span></span><span></span>
    </div>`;
  messagesArea.appendChild(typingRow);
  scrollBottom();
}

function hideTypingIndicator() {
  if (typingRow) { typingRow.remove(); typingRow = null; }
}

function renderMessages(contact) {
  messagesArea.innerHTML = '';
  typingRow = null;

  const div = document.createElement('div');
  div.className = 'date-divider';
  div.innerHTML = '<span>Hoje</span>';
  messagesArea.appendChild(div);

  renderMessagesSequentially(contact, 0);
}

function renderMessagesSequentially(contact, index) {
  if (index >= contact.messages.length) return;

  hideTypingIndicator();
  renderBubble(contact.messages[index], contact);

  // Add entering animation to the last added element
  const rows = messagesArea.querySelectorAll('.msg-row');
  const lastRow = rows[rows.length - 1];
  if (lastRow) lastRow.classList.add('msg-entering');

  scrollBottom();

  if (index + 1 < contact.messages.length) {
    // Show typing indicator after 2s, then show next message at 5s
    setTimeout(() => showTypingIndicator(), 2000);
    setTimeout(() => renderMessagesSequentially(contact, index + 1), 5000);
  } else {
    // All messages loaded — scroll back to top (video) after 2s
    setTimeout(() => {
      messagesArea.scrollTo({ top: 0, behavior: 'smooth' });
    }, 2000);
  }
}

function renderBubble(msg, contact) {
  const row = document.createElement('div');
  row.className = `msg-row ${msg.out ? 'out' : 'in'}`;
  row.dataset.msgId = msg.id;

  const checkMark = msg.out
    ? `<span class="bubble-check ${msg.read ? 'double' : 'single'}">
        <svg viewBox="0 0 16 15"><path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033L6.891 8.267a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.062-.51z"/></svg>
        <svg viewBox="0 0 16 15"><path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033L6.891 8.267a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.062-.51z"/></svg>
      </span>` : '';

  if (msg.type === 'cta') {
    row.className = 'msg-row msg-cta-row';
    row.innerHTML = `
      <button class="cta-btn msg-cta-inline" onclick="document.getElementById('ctaVipBtn').click()">
        🔒 ${escHtml(msg.label)}
      </button>
    `;
  } else if (msg.type === 'alert') {
    row.innerHTML = `
      <div class="bubble bubble-alert">
        <div class="alert-icon-wrap">⚠️</div>
        <div class="alert-title">${escHtml(msg.title)}</div>
        <div class="alert-body">${escHtml(msg.body)}</div>
        <div class="bubble-footer">
          <span class="bubble-time">${msg.time}</span>
          ${checkMark}
        </div>
      </div>
    `;
  } else if (msg.type === 'richtext') {
    row.innerHTML = `
      <div class="bubble bubble-richtext">
        <div class="bubble-html">${msg.html}</div>
        <div class="bubble-footer">
          <span class="bubble-time">${msg.time}</span>
          ${checkMark}
        </div>
      </div>
    `;
  } else if (msg.type === 'benefits') {
    row.innerHTML = `
      <div class="bubble bubble-benefits">
        <div class="benefits-header">🔒 O que está protegido</div>
        <div class="benefits-list">
          <div class="benefits-item"><span class="benefits-icon">👁️</span><span>Seu número fica oculto para outros membros do grupo</span></div>
          <div class="benefits-item"><span class="benefits-icon">🔐</span><span>Suas mensagens não são rastreadas por terceiros</span></div>
          <div class="benefits-item"><span class="benefits-icon">🚫</span><span>Seu perfil não aparece em buscas externas</span></div>
          <div class="benefits-item"><span class="benefits-icon">⚡</span><span>Acesso liberado imediatamente após a ativação</span></div>
          <div class="benefits-item"><span class="benefits-icon">♾️</span><span>Válido permanentemente — pagamento único, sem renovação</span></div>
        </div>
        <div class="bubble-footer">
          <span class="bubble-time">${msg.time}</span>
          ${checkMark}
        </div>
      </div>
    `;
  } else if (msg.type === 'video') {
    const captionHtml = msg.caption
      ? `<div class="video-caption">${escHtml(msg.caption).replace(/\n/g, '<br>')}</div>`
      : '';
    row.innerHTML = `
      <div class="bubble bubble-media">
        <div class="video-wrap">
          <video src="${msg.src}" autoplay muted playsinline loop></video>
          <div class="video-overlay" style="background:none;" onclick="(function(o){var v=o.previousElementSibling;v.paused?v.play():v.pause();})(this)">
            <span class="video-duration">${msg.duration}</span>
          </div>
          <button class="unmute-btn" title="Ativar som" onclick="event.stopPropagation();(function(btn){var v=btn.closest('.video-wrap').querySelector('video');v.muted=false;btn.classList.add('unmuted');})(this)">
            <svg class="icon-muted" viewBox="0 0 24 24" width="14" height="14"><path fill="#fff" d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18l2 2L21 18.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
            <svg class="icon-unmuted" viewBox="0 0 24 24" width="14" height="14"><path fill="#fff" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            <span class="unmute-label">Toque para ativar o som</span>
          </button>
        </div>
        ${captionHtml}
        <div class="bubble-footer bubble-footer-media">
          <span class="bubble-time">${msg.time}</span>
          ${checkMark}
        </div>
      </div>
    `;
  } else {
    row.innerHTML = `
      <div class="bubble">
        ${escHtml(msg.text)}
        <div class="bubble-footer">
          <span class="bubble-time">${msg.time}</span>
          ${checkMark}
        </div>
      </div>
    `;
  }

  messagesArea.appendChild(row);
}

function scrollBottom() {
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

messagesArea.addEventListener('scroll', () => {
  const distBottom = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight;
  scrollDownBtn.classList.toggle('visible', distBottom > 80);
});

scrollDownBtn.addEventListener('click', () => {
  messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: 'smooth' });
});

// ─── Open chat ───────────────────────────────────────────────────────────────

function openChat(id) {
  const contact = CONTACTS.find(c => c.id === id);
  if (!contact) return;

  activeId = id;

  topbarName.textContent = contact.name;
  topbarStatus.textContent = contact.isTyping ? 'verificando...' : contact.status;
  if (contact.avatar) {
    topbarAvatar.innerHTML = `<img src="${contact.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    topbarAvatar.style.background = 'none';
  } else {
    topbarAvatar.textContent = contact.initials;
    topbarAvatar.style.background = contact.color;
  }

  renderMessages(contact);
  msgInput.focus();
}

// ─── Send message ─────────────────────────────────────────────────────────────

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || activeId === null) return;

  const contact = CONTACTS.find(c => c.id === activeId);
  const msg = {
    id: Date.now(),
    out: true,
    text,
    time: now(),
    read: false,
  };
  contact.messages.push(msg);
  renderBubble(msg, contact);
  scrollBottom();

  msgInput.value = '';
  msgInput.style.height = 'auto';

  const delay = 1000 + Math.random() * 1000;
  setTimeout(() => {
    const lowerText = text.toLowerCase();
    let replies;
    if (lowerText.match(/oi|olá|ola|oii|opa|ei|bom dia|boa tarde|boa noite|tudo|salve/)) {
      replies = [
        '🔒 Olá! Para garantir sua privacidade, você precisa ativar a proteção dos seus dados.',
        '⚠️ Seu acesso ainda não foi verificado. Ative a proteção para continuar com segurança.',
        '🛡️ Olá! Para acessar o grupo com segurança, clique no botão abaixo.',
      ];
    } else if (lowerText.match(/grupo|entrar|acesso|assinar|comprar|pagar/)) {
      replies = [
        '🔐 Para entrar no grupo, você precisa ativar a proteção dos seus dados. É rápido e custa apenas R$ 4,90.',
        '⚡ Ative sua proteção agora e tenha acesso imediato ao grupo.',
        '🛡️ Clique no botão abaixo para ativar a proteção e entrar no grupo.',
      ];
    } else if (lowerText.match(/proteção|protecao|segurança|seguranca|privacidade|verificação|verificacao/)) {
      replies = [
        '🔒 A proteção mantém seu número oculto e suas mensagens privadas no grupo.',
        '🛡️ Com a ativação, sua identidade fica 100% protegida dentro do grupo.',
        '🔐 Sua privacidade é nossa prioridade. Ative agora por apenas R$ 4,90.',
      ];
    } else if (lowerText.match(/preço|preco|valor|quanto|caro|barato/)) {
      replies = [
        '💰 A taxa de ativação é R$ 4,90 — pagamento único, sem renovação!',
        '✅ Apenas R$ 4,90 uma única vez para ter sua proteção permanente.',
        'É só R$ 4,90 de taxa única. Sem mensalidade, sem surpresas!',
      ];
    } else {
      replies = [
        '⚠️ Seu acesso será bloqueado automaticamente sem a ativação. Clique no botão abaixo.',
        '🔒 Ative sua proteção de dados agora para liberar o acesso ao grupo.',
        '🛡️ Para continuar com segurança, ative a proteção clicando no botão.',
        '⚡ Não perca seu acesso! Ative a proteção por R$ 4,90 agora.',
      ];
    }
    const reply = {
      id: Date.now(),
      out: false,
      text: replies[Math.floor(Math.random() * replies.length)],
      time: now(),
    };
    contact.messages.push(reply);
    if (activeId === contact.id) {
      renderBubble(reply, contact);
      scrollBottom();
    }
  }, delay);

  setTimeout(() => {
    msg.read = true;
    const row = messagesArea.querySelector(`[data-msg-id="${msg.id}"]`);
    if (row) {
      const check = row.querySelector('.bubble-check');
      if (check) check.className = 'bubble-check double';
    }
  }, 1500);
}

// ─── Events ──────────────────────────────────────────────────────────────────

sendBtn.addEventListener('click', sendMessage);

msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

msgInput.addEventListener('input', () => {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
});

// ─── Utils ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── PIX Modal ───────────────────────────────────────────────────────────────

// VENO_API_KEY movida para /api/pix.js e /api/pix-status.js (proxy serverless)
const UTMIFY_TOKEN    = 'LwK6NIhKS5SJSICvxc07UDv6zZhLVqssa7yH';
const UTMIFY_BASE     = 'https://api.utmify.com.br/api-credentials/orders';

// ─── Captura de UTMs ─────────────────────────────────────────────────────────

// Persiste UTMs no sessionStorage logo que a página carrega,
// para não perder os parâmetros caso a URL seja modificada depois.
(function persistUtms() {
  const p = new URLSearchParams(window.location.search);
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'sck'];
  keys.forEach(k => {
    const v = p.get(k);
    if (v) sessionStorage.setItem('utm_' + k, v);
  });
})();

function getUtms() {
  const p = new URLSearchParams(window.location.search);
  // Prioridade: URL atual → sessionStorage (capturado no primeiro carregamento)
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

// ─── Utmify Order ────────────────────────────────────────────────────────────

async function sendUtmifyOrder(orderId, status, approvedDate = null) {
  const utms = getUtms();
  const now  = new Date().toISOString().slice(0, 19).replace('T', ' ');
  // Usa snapshot do PIX gerado — garante que valor e produto batem
  // com o que foi processado, não com o estado atual da UI
  const prod = PRODUCTS[pixProduct];
  const payload = {
    orderId:       String(orderId),
    platform:      'other',
    paymentMethod: 'pix',
    status,
    createdAt:     now,
    approvedDate:  approvedDate || null,
    refundedAt:    null,
    customer: {
      name:     '',
      email:    '',
      phone:    '',
      document: '',
    },
    products: [
      {
        id:           prod.id,
        name:         prod.name,
        planId:       prod.id,
        planName:     prod.name,
        quantity:     1,
        priceInCents: pixAmount,
      },
    ],
    trackingParameters: utms,
    commission: {
      totalPriceInCents:     pixAmount,
      gatewayFeeInCents:     0,
      userCommissionInCents: pixAmount,
    },
  };
  try {
    await fetch(UTMIFY_BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-token': UTMIFY_TOKEN },
      body:    JSON.stringify(payload),
    });
  } catch (e) {
    console.warn('Utmify order error:', e);
  }
}

const pixModal    = document.getElementById('pixModal');
const ctaBtn      = document.getElementById('ctaBtn');
const ctaVipBtn   = document.getElementById('ctaVipBtn');
const modalClose  = document.getElementById('modalClose');
const copyBtn     = document.getElementById('copyBtn');
const copyLabel   = document.getElementById('copyLabel');
const pixKey      = document.getElementById('pixKey');
const qrImg       = document.querySelector('.qr-img');

let countdownSecs = 10 * 60;
let countdownInterval = null;
let pollInterval = null;
let currentPixId = null;
let currentAmount = 490;
let currentProduct = 'simples';

// Snapshot dos dados do PIX ativo — usados nas chamadas Utmify
// para garantir que valor e nome batem com o que foi gerado
let pixAmount = 490;
let pixProduct = 'simples';

const PRODUCTS = {
  simples: { id: 'grupo-simples-protecao', name: 'Grupo Simples + Proteção', priceInCents: 490 },
  vip:     { id: 'grupo-vip-protecao',     name: 'Grupo VIP + Proteção',     priceInCents: 1990 },
};

const countdownEl = document.getElementById('countdown');

function updateModalPrices() {
  if (currentAmount === 1990) {
    document.querySelector('.modal-title').textContent = 'Entrar no Grupo VIP';
    document.querySelector('.modal-price-old').textContent = 'R$ 39,90';
    document.querySelector('.modal-amount').textContent = 'R$ 19,90';
    document.querySelector('.modal-badge').textContent = '50% OFF';
    document.querySelector('.qr-step-value strong').textContent = 'R$ 19,90';
  } else {
    document.querySelector('.modal-title').textContent = 'Ativar Proteção de Dados';
    document.querySelector('.modal-price-old').textContent = 'R$ 19,90';
    document.querySelector('.modal-amount').textContent = 'R$ 4,90';
    document.querySelector('.modal-badge').textContent = '75% OFF';
    document.querySelector('.qr-step-value strong').textContent = 'R$ 4,90';
  }
}

function startCountdown() {
  countdownSecs = 10 * 60;
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    countdownSecs--;
    if (countdownSecs <= 0) { countdownSecs = 0; clearInterval(countdownInterval); }
    const m = String(Math.floor(countdownSecs / 60)).padStart(2, '0');
    const s = String(countdownSecs % 60).padStart(2, '0');
    countdownEl.textContent = `${m}:${s}`;
  }, 1000);
}

function setQrLoading() {
  qrImg.style.opacity = '0.3';
  pixKey.textContent = 'Gerando PIX...';
  copyBtn.disabled = true;
}

function setQrData(pixCopyPaste) {
  const encoded = encodeURIComponent(pixCopyPaste);
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encoded}&color=000000&bgcolor=ffffff`;
  qrImg.style.opacity = '1';
  pixKey.textContent = pixCopyPaste;
  copyBtn.disabled = false;
}

function setQrError() {
  qrImg.style.opacity = '1';
  pixKey.textContent = 'Erro ao gerar PIX. Tente novamente.';
  copyBtn.disabled = true;
}

function showPaymentSuccess() {
  clearInterval(pollInterval);
  clearInterval(countdownInterval);
  const approvedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
  sendUtmifyOrder(currentPixId, 'paid', approvedDate);
  const card = document.querySelector('.modal-card');
  card.innerHTML = `
    <div style="text-align:center;padding:40px 20px;">
      <div style="font-size:64px;margin-bottom:16px;">✅</div>
      <h2 style="color:#2ecc71;font-size:20px;font-weight:800;margin-bottom:8px;">Pagamento confirmado!</h2>
      <p style="color:var(--text-secondary);font-size:14px;line-height:1.6;">
        Sua proteção foi ativada!<br>
        Redirecionando em <strong id="redirectCount" style="color:#2ecc71;">3</strong>s... 🚀
      </p>
    </div>`;
  let count = 3;
  const timer = setInterval(() => {
    count--;
    const el = document.getElementById('redirectCount');
    if (el) el.textContent = count;
    if (count <= 0) {
      clearInterval(timer);
      window.location.href = pixProduct === 'vip'
        ? 'https://recusa-19-90.vercel.app/'
        : 'https://recusa-4-90.vercel.app/';
    }
  }, 1000);
}

async function createPix() {
  // Snapshot: captura valor e produto no momento do clique
  // para que todas as chamadas Utmify usem os dados corretos
  pixAmount  = currentAmount;
  pixProduct = currentProduct;
  const prod = PRODUCTS[pixProduct];

  setQrLoading();
  try {
    const utms = getUtms();
    const res = await fetch('/api/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:      pixAmount,
        description: prod.name,
        metadata:    utms,
      })
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    currentPixId = data.id;
    setQrData(data.pix_copy_paste);
    sendUtmifyOrder(currentPixId, 'waiting_payment');
    startPolling();
  } catch (e) {
    setQrError();
  }
}

function startPolling() {
  clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    if (!currentPixId) return;
    try {
      const res = await fetch(`/api/pix-status?id=${currentPixId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === 'paid') showPaymentSuccess();
      if (data.status === 'expired' || data.status === 'cancelled') {
        clearInterval(pollInterval);
        setQrError();
      }
    } catch (e) {}
  }, 4000);
}

ctaBtn.addEventListener('click', () => {
  currentAmount = 490;
  currentProduct = 'simples';
  updateModalPrices();
  pixModal.classList.add('open');
  startCountdown();
  createPix();
});

ctaVipBtn.addEventListener('click', () => {
  currentAmount = 1990;
  currentProduct = 'vip';
  updateModalPrices();
  pixModal.classList.add('open');
  startCountdown();
  createPix();
});

modalClose.addEventListener('click', () => {
  pixModal.classList.remove('open');
  clearInterval(pollInterval);
});
pixModal.addEventListener('click', e => {
  if (e.target === pixModal) {
    pixModal.classList.remove('open');
    clearInterval(pollInterval);
  }
});

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(pixKey.textContent).then(() => {
    copyBtn.classList.add('copied');
    copyLabel.textContent = 'Copiado!';
    setTimeout(() => { copyBtn.classList.remove('copied'); copyLabel.textContent = 'Copiar chave'; }, 2000);
  });
});

// ─── Init ────────────────────────────────────────────────────────────────────

openChat(CONTACTS[0].id);
