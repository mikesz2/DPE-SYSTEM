/* ==========================================================================
   SYSTEM DPE — núcleo (helpers de DOM, persistência local, UI genérica)
   Protótipo front-end: dados ficam em localStorage até o backend existir.
   Chaves locais preservam o prefixo legado "dcc_" por compatibilidade com sessões já existentes.
   ========================================================================== */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const store = {
  get(key, fallback) {
    try { const v = JSON.parse((key === 'token' && sessionStorage.getItem('dcc_token')) || localStorage.getItem('dcc_' + key)); return v ?? fallback; }
    catch { return fallback; }
  },
  set(key, value, persistent = true) {
    if (key === 'token') {
      localStorage.removeItem('dcc_token');
      sessionStorage.removeItem('dcc_token');
      if (value) (persistent ? localStorage : sessionStorage).setItem('dcc_token', JSON.stringify(value));
    } else localStorage.setItem('dcc_' + key, JSON.stringify(value));
  },
};

function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { if (!el.classList.contains('show')) el.classList.add('hidden'); }, 280);
  }, 2600);
}

function openModal(html) {
  const modal = $('#modal');
  $('#modalCard').innerHTML = html;
  modal.classList.remove('hidden');
  requestAnimationFrame(() => modal.classList.add('show'));
  bindGlobalActions($('#modalCard'));
}
function closeModal() {
  const modal = $('#modal');
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => { if (!modal.classList.contains('show')) modal.classList.add('hidden'); }, 260);
}

function openDrawer(html) {
  const drawer = $('#drawer');
  drawer.innerHTML = html;
  drawer.classList.remove('hidden');
  requestAnimationFrame(() => drawer.classList.add('show'));
  bindGlobalActions(drawer);
}
function closeDrawer() {
  const drawer = $('#drawer');
  if (!drawer) return;
  drawer.classList.remove('show');
  setTimeout(() => { if (!drawer.classList.contains('show')) drawer.classList.add('hidden'); }, 330);
}

// Ações genéricas reaproveitadas em qualquer HTML injetado (modal, drawer, página)
function bindGlobalActions(root = document) {
  $$('[data-close]', root).forEach(b => b.onclick = closeModal);
  $$('[data-route]', root).forEach(b => b.onclick = () => go(b.dataset.route));
  $$('[data-demo]', root).forEach(b => b.onclick = () => toast(b.dataset.demo));
}

function fmtClock(ms) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const x = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${x}`;
}
function daysBetween(dateStr) {
  const then = new Date(dateStr.split('/').reverse().join('-'));
  return Math.max(0, Math.floor((Date.now() - then) / 86400000));
}
function timeInPosition(iso) {
  const start = new Date(iso);
  if (!iso || Number.isNaN(start.getTime())) return 'Não informado';
  const days = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
  if (days < 1) return 'Menos de 1 dia';
  if (days < 30) return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  if (days < 365) {
    const months = Math.floor(days / 30), rest = days % 30;
    return `${months} ${months === 1 ? 'mês' : 'meses'}${rest ? ` e ${rest} ${rest === 1 ? 'dia' : 'dias'}` : ''}`;
  }
  const years = Math.floor(days / 365), months = Math.floor((days % 365) / 30);
  return `${years} ${years === 1 ? 'ano' : 'anos'}${months ? ` e ${months} ${months === 1 ? 'mês' : 'meses'}` : ''}`;
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function eliteCoinIcon() {
  return '<img class="elite-coin-icon" src="/assets/currency/elite-coin-v2.png" alt="">';
}

function eliteCoinAmount(value) {
  return `<span class="elite-coin-amount">${eliteCoinIcon()}<span class="elite-coin-copy"><b>${Number(value) || 0}</b><span>Elite Coins</span></span></span>`;
}

/* -------- Componentes de texto/layout reaproveitados entre páginas ------- */
function pageHead(title, subtitle, actions = '') {
  return `<div class="page-head"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div><div style="display:flex;gap:10px">${actions}</div></div>`;
}
function card(title, bodyHtml, headActions = '') {
  return `<div class="card">${title ? `<div class="card-head"><h3>${title}</h3>${headActions}</div>` : ''}${bodyHtml}</div>`;
}
function breadcrumb(parts) {
  // parts: [{label, route?}] — o último item é sempre a página atual (sem link)
  return `<div class="breadcrumb">${parts.map((p, i) => {
    const last = i === parts.length - 1;
    const sep = i > 0 ? '<span class="sep">›</span>' : '';
    return sep + (last ? `<b>${p.label}</b>` : `<button class="crumb-btn" data-route="${p.route}">${p.label}</button>`);
  }).join('')}</div>`;
}
function emptyState(icon, text) {
  return `<div class="empty"><div class="ico">${icon}</div><p>${text}</p></div>`;
}

/* -------- Cliente da API (mesma origem — front e backend no mesmo processo) ---- */
const API_BASE = '/api';
async function apiFetch(path, opts = {}) {
  const token = store.get('token', null);
  const {
    timeoutMs = 15000,
    signal: externalSignal,
    headers: extraHeaders,
    ...fetchOptions
  } = opts;

  const controller = new AbortController();
  let timeoutId = null;
  let timedOut = false;
  const forwardAbort = () => controller.abort(externalSignal?.reason);

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort', forwardAbort, { once: true });
  }
  if (Number(timeoutMs) > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, Number(timeoutMs));
  }

  let res;
  let raw;
  try {
    res = await fetch(API_BASE + path, {
      cache: 'no-store',
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(extraHeaders || {}),
      },
    });
    raw = await res.text();
  } catch (error) {
    if (timedOut) {
      throw new Error('O servidor demorou demais para responder. Tente novamente.');
    }
    if (externalSignal?.aborted || error?.name === 'AbortError') {
      throw new Error('A conexão com o servidor foi interrompida.');
    }
    throw new Error('Não foi possível conectar ao servidor. Confira se o System DPE (backend) está rodando.');
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (externalSignal) externalSignal.removeEventListener('abort', forwardAbort);
  }

  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      const preview = raw.replace(/\s+/g, ' ').slice(0, 100);
      throw new Error(`Resposta inválida do servidor (HTTP ${res.status}): ${preview}`);
    }
  }
  if (!res.ok) throw new Error((data && (data.error || data.message)) || `Erro ${res.status} ao falar com o servidor.`);
  if (res.status !== 204 && data === null) {
    throw new Error(`Servidor respondeu vazio (HTTP ${res.status}).`);
  }
  return data;
}

function fmtDateBR(iso) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
}
