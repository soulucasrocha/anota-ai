// ─── Data ───────────────────────────────────────────────────────────────────

const CONTACTS = [
  {
    id: 1, name: 'Ana Lima', initials: 'AL', color: '#4a9da8',
    status: 'online', unread: 0,
    messages: [
      { id: 1, out: false, type: 'video', src: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '0:15', caption: 'Olha que fofo esse coelho! 🐰', time: '09:10' },
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
      ? `<div class="video-caption">${escHtml(msg.caption)}</div>`
      : '';
    row.innerHTML = `
      <div class="bubble bubble-media">
        <div class="video-wrap">
          <video src="${msg.src}" preload="metadata" playsinline></video>
          <div class="video-overlay" onclick="this.previousElementSibling.paused ? (this.previousElementSibling.play(), this.style.opacity=0) : (this.previousElementSibling.pause(), this.style.opacity=1)">
            <div class="play-btn">
              <svg viewBox="0 0 24 24" width="36" height="36"><path fill="#fff" d="M8 5v14l11-7z"/></svg>
            </div>
            <span class="video-duration">${msg.duration}</span>
          </div>
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
  topbarAvatar.textContent = contact.initials;
  topbarAvatar.style.background = contact.color;

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
    const replies = [
      'Entendido! 👍',
      'Certo, pode deixar.',
      'Ok!',
      'Boa ideia!',
      'Que ótimo! 🎉',
      'Concordo com você.',
      'Vou verificar isso.',
      'Perfeito!',
    ];
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

ctaBtn.addEventListener('click', () => pixModal.classList.add('open'));
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
