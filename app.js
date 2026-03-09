// ─── Data ───────────────────────────────────────────────────────────────────

const CONTACTS = [
  {
    id: 1, name: 'Bruna Coutinho', initials: 'BC', color: '#4a9da8', avatar: 'imagens e videos/perfil.jpeg',
    status: 'online', unread: 0,
    messages: [
      { id: 1, out: false, type: 'video', src: 'imagens e videos/2edc9c87-9a23-437b-9753-c3cd5dd7e1ed.mp4', duration: '0:15', caption: '🎬 Quer se perder no meu mundinho secreto? 😏🌎\n🌸 +300 MÍDIAS: 𝗔𝗡𝗔𝗹, 𝗚𝟬𝗭𝗔𝗡𝗗𝗢, 𝗧𝟬𝗥𝗧𝗨𝗥𝗔\n🌸 VÍDEOS COM AMIGUINHAS E PRIMAS\n🌸 𝗹𝗡𝗖𝗘𝗦𝗧𝟬 𝗖𝗢𝗠 𝗠𝗘𝗨 𝗣𝗔𝗗𝗥𝗔𝗦𝗧𝟬 𝗘 𝗧𝗜𝟬\n\nE tem mais: todos os dias faço sorteios exclusivos pra ter alguém bem pertinho de mim nas gravações… quem sabe você não é o próximo? 💖', time: '09:10' },
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

function avatarStyle(contact) {
  return `background:${contact.color}`;
}


// ─── Render messages ─────────────────────────────────────────────────────────

function renderMessages(contact) {
  messagesArea.innerHTML = '';

  // date divider
  const div = document.createElement('div');
  div.className = 'date-divider';
  div.innerHTML = '<span>Hoje</span>';
  messagesArea.appendChild(div);

  contact.messages.forEach(m => renderBubble(m, contact));
  scrollBottom();
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

  const senderLine = (!msg.out && msg.sender)
    ? `<div style="font-size:13px;font-weight:600;color:${contact.color};margin-bottom:2px">${msg.sender}</div>`
    : '';

  if (msg.type === 'video') {
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
        ${senderLine}
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
  topbarStatus.textContent = contact.isTyping ? 'digitando...' : contact.status;
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

  // Simulate reply after 1-2s
  const delay = 1000 + Math.random() * 1000;
  setTimeout(() => {
    const lowerText = text.toLowerCase();
    let replies;
    if (lowerText.match(/oi|olá|ola|oii|opa|ei|bom dia|boa tarde|boa noite|tudo|salve/)) {
      replies = [
        'Oi amor! 😍 Que bom te ver aqui… você já entrou no meu grupo VIP? 🌸',
        'Oii! 😘 Tô te esperando lá no grupo com tudo exclusivo pra você…',
        'Oi bb! Entrou no grupinho ainda não? Tô postando coisa quente hoje 🔥',
      ];
    } else if (lowerText.match(/grupo|vip|entrar|acesso|assinar|comprar|pagar/)) {
      replies = [
        'Clica no botão aqui embaixo e entra agora, tá? São só R$ 2,90 e você tem acesso a tudo 🌸🔥',
        'No grupo tem +300 mídias exclusivas! É só R$ 2,90, bem baratinho 😏 Vem logo!',
        'Amor, entra logo no VIP! Hoje mesmo postei coisa nova que você vai amar 😈',
      ];
    } else if (lowerText.match(/video|vídeo|foto|conteudo|conteúdo|mídia|midia/)) {
      replies = [
        'No grupo tem tudo: anal, vídeos com amigas, primas… mais de 300 mídias esperando por você 😈🌸',
        'Tô postando todo dia coisa nova no VIP! Entra lá e confere 🔥',
        'São +300 mídias exclusivas esperando por você no grupinho 😏 Não perde não!',
      ];
    } else if (lowerText.match(/preço|preco|valor|quanto|caro|barato/)) {
      replies = [
        'É só R$ 2,90 amor! Super baratinho pra ter acesso a tudo 🌸',
        'Tá com 90% de desconto hoje! De R$ 29,90 por apenas R$ 2,90 😱 Aproveita!',
        'R$ 2,90 e você entra no meu mundinho secreto… vale demais 😏',
      ];
    } else if (lowerText.match(/sorteio|prêmio|premio|ganhar|sortear/)) {
      replies = [
        'Todo dia faço sorteio no grupo! Quem sabe você não é o próximo a gravar comigo? 💖',
        'Os sortudos do grupo participam das gravações comigo… entra logo! 😘',
        'Hoje tem sorteio no grupo VIP! Você ainda não entrou? 🎉',
      ];
    } else {
      replies = [
        'Amor, entra no meu grupo VIP e vem me conhecer de verdade 😏🌸',
        'Te espero lá no grupinho! São só R$ 2,90 e tem tudo exclusivo pra você 🔥',
        'Não deixa pra depois não, a oferta tá expirando! Entra logo 😘',
        'Clica no botão e vem me ver lá dentro… você não vai se arrepender 💖',
      ];
    }
    const reply = {
      id: Date.now(),
      out: false,
      text: replies[Math.floor(Math.random() * replies.length)],
      time: now(),
      sender: contact.messages.find(m => !m.out && m.sender)?.sender,
    };
    contact.messages.push(reply);
    if (activeId === contact.id) {
      renderBubble(reply, contact);
      scrollBottom();
    }
  }, delay);

  // Mark as read after brief delay
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

const pixModal   = document.getElementById('pixModal');
const ctaBtn     = document.getElementById('ctaBtn');
const modalClose = document.getElementById('modalClose');
const copyBtn    = document.getElementById('copyBtn');
const copyLabel  = document.getElementById('copyLabel');
const pixKey     = document.getElementById('pixKey');

let countdownSecs = 10 * 60;
let countdownInterval = null;
const countdownEl = document.getElementById('countdown');

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

ctaBtn.addEventListener('click', () => { pixModal.classList.add('open'); startCountdown(); });
modalClose.addEventListener('click', () => pixModal.classList.remove('open'));
pixModal.addEventListener('click', e => { if (e.target === pixModal) pixModal.classList.remove('open'); });

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(pixKey.textContent).then(() => {
    copyBtn.classList.add('copied');
    copyLabel.textContent = 'Copiado!';
    setTimeout(() => { copyBtn.classList.remove('copied'); copyLabel.textContent = 'Copiar'; }, 2000);
  });
});

// ─── Init ────────────────────────────────────────────────────────────────────

openChat(CONTACTS[0].id);
