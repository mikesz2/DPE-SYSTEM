/* ==========================================================================
   SYSTEM DPE — camada de dados
   Tudo aqui vem da API de verdade agora (não é mais localStorage/seed).
   As funções map* traduzem o formato do backend pro formato que as páginas
   já esperavam — assim a maior parte do código de renderização não precisou
   mudar, só a origem dos dados.
   ========================================================================== */

// Cargos do System, da menor pra maior autoridade — espelha
// src/middleware/permissions.js no backend (a validação de verdade é lá;
// isso aqui só decide o que MOSTRAR na tela).
const ROLE_ORDER = ['MEMBRO', 'MODERADOR', 'ADMINISTRADOR', 'DONO', 'SUPREMO'];
const ROLE_META = {
  SUPREMO:       { label: 'Supremo',       icon: '👑', badge: 'gold' },
  DONO:          { label: 'Dono',          icon: '👑', badge: 'gold' },
  ADMINISTRADOR: { label: 'Adm',           icon: '🛡️', badge: 'blue' },
  MODERADOR:     { label: 'Moderador',     icon: '🔨', badge: 'green' },
  MEMBRO:        { label: 'Membro',        icon: '👤', badge: '' },
};
function roleAtLeast(role, min) {
  const roleLevel = ROLE_ORDER.indexOf(role), minimumLevel = ROLE_ORDER.indexOf(min);
  return roleLevel >= 0 && minimumLevel >= 0 && roleLevel >= minimumLevel;
}
function can(min) { return state.user && roleAtLeast(state.user.role, min); }
function roleBadge(role) {
  const m = ROLE_META[role] || ROLE_META.MEMBRO;
  return `<span class="badge ${m.badge}">${m.icon} ${m.label}</span>`;
}

// Paleta rotativa só pra dar variedade visual às contas (o Habbo não nos dá
// emoji de avatar — o avatar "de verdade" é a imagem, usada à parte).
const AVATAR_POOL = ['👮','🕵️','🧑‍✈️','👩‍✈️','🧑','🧑‍🚀','👩','🧔','👱','🥷','🧑‍🎓','👩‍💼'];
function avatarEmoji(id) { return AVATAR_POOL[id % AVATAR_POOL.length]; }

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return `há ${Math.floor(s / 86400)} d`;
}

/* -------------------------------- Mapeadores ------------------------------- */
function mapMember(m) {
  return {
    id: m.id, nick: m.habboName, rank: m.rank ? m.rank.name : '—', role: m.role, lessonGuide: !!m.lessonGuide,
    division: m.division ? m.division.sig : '-', status: m.status, online: !!m.online,
    avatar: avatarEmoji(m.id), hours: Math.round((m.hours || 0) * 10) / 10,
    medals: m.medalCount ?? 0, since: fmtDateBR(m.joinedAt), followers: m.followerCount ?? 0,
    joinedAt: m.joinedAt,
    avatarUrl: m.avatarUrl,
    lastSeenAt: m.lastSeenAt,
    rankStartedAt: m.rankStartedAt || m.joinedAt,
    bannedAt: m.bannedAt,
    bannedUntil: m.bannedUntil,
    bannedReason: m.bannedReason,
    bannedBy: m.bannedBy,
    profileCoverUrl: m.profileCoverUrl,
    emblems: Array.isArray(m.emblems) ? m.emblems : [],
  };
}
function mapMedalsGrouped(grouped) {
  const out = {};
  for (const kind in grouped) {
    out[kind] = grouped[kind].map(m => ({
      id: m.id, name: m.name, avatar: avatarEmoji(m.id * 7), kind: m.kind,
      type: m.duration === 'PERMANENTE' ? 'Permanente' : 'Temporária',
      granter: m.granter, ends: m.endsAt ? fmtDateBR(m.endsAt) : 'Sem término', order: m.order,
    }));
  }
  return out;
}
function mapRequirement(r) {
  return {
    id: r.id, type: r.type, typeId: r.typeId, author: r.author, target: r.target, text: r.text,
    status: r.status === 'PENDENTE' ? 'Pendente' : r.status === 'APROVADO' ? 'Aprovado' : 'Recusado',
    date: new Date(r.createdAt).toLocaleString('pt-BR'),
    decidedBy: r.decidedBy, decidedAt: r.decidedAt ? new Date(r.decidedAt).toLocaleString('pt-BR') : null,
  };
}
function mapTask(t) { return { id: t.id, group: t.groupLabel, desc: t.description, done: t.done, total: t.total }; }
function mapMail(m) { return { id: m.id, from: m.from, subject: m.subject, body: m.body, time: timeAgo(m.time), read: m.read }; }
function mapNotification(n) { return { id: n.id, ico: n.icon, title: n.title, text: n.text, time: timeAgo(n.createdAt), read: !!n.readAt }; }
function mapBanner(b) { return { title: b.title, sub: b.subtitle, grad: b.gradient }; }
function mapNews(n) { return { id: n.id, title: n.title, date: fmtDateBR(n.createdAt), read: `${n.readMinutes} min`, author: n.author, views: n.views, likes: n.likes, excerpt: n.excerpt }; }
function mapDocument(document) { return { ...document, date: fmtDateBR(document.createdAt) }; }
function mapDivision(d) { return { id: d.id, sig: d.sig, name: d.name, icon: d.icon, desc: d.desc, memberCount: d._count ? d._count.members : 0 }; }
function mapShopItem(s) { return { id: s.id, ico: s.icon, name: s.name, description: s.description, kind: s.kind, imageUrl: s.imageUrl, price: s.price, owned: !!s.owned, equipped: !!s.equipped }; }
function mapReqType(t) {
  if (t.id === 'gratificacao') return { id: t.id, ico: eliteCoinIcon(), name: t.name, desc: 'Conceder Elite Coins por desempenho ou mérito.' };
  return { id: t.id, ico: t.icon, name: t.name, desc: t.desc };
}

/* -------------------------------- Carregamento ----------------------------- */
// Busca tudo em paralelo assim que a sessão é confirmada. Um sistema deste
// porte (uma corporação, não uma rede social gigante) não precisa de
// paginação/streaming por página — carregar tudo de uma vez é mais simples
// e mais rápido de usar do que ficar com spinner em cada troca de aba.
function resetCoreData() {
  state.members = [];
  state.medals = {};
  state.requirements = [];
  state.requirementTypes = [];
  state.tasks = [];
  state.shopItems = [];
  state.mail = [];
  state.notifications = [];
  state.notificationsUnread = 0;
  state.banners = [];
  state.news = [];
  state.documents = [];
  state.divisions = [];
  state.ranks = [];
  state.promotions = [];
  state.socialPosts = [];
  state.socialSuggestions = [];
  state.socialLoaded = false;
  state.socialSuggestionsLoaded = false;
  if (state.socialUi?.previewUrl) URL.revokeObjectURL(state.socialUi.previewUrl);
  state.socialUi = null;
  state.socialScope = 'for-you';
  state.socialNextCursor = null;
  state.shiftStart = null;
}

async function loadCoreData() {
  // Nunca reutilize dados de uma sessão anterior se alguma API falhar.
  resetCoreData();

  const loaders = [
    ['Membros', async () => {
      const data = await apiFetch('/members');
      state.members = (Array.isArray(data?.members) ? data.members : []).map(mapMember);
    }],
    ['Condecorações', async () => {
      const data = await apiFetch('/medals');
      state.medals = mapMedalsGrouped(data?.grouped || {});
    }],
    ['Tipos de requerimento', async () => {
      const data = await apiFetch('/requirements/types');
      state.requirementTypes = (Array.isArray(data?.types) ? data.types : []).map(mapReqType);
    }],
    ['Requerimentos', async () => {
      const data = await apiFetch('/requirements');
      state.requirements = (Array.isArray(data?.requirements) ? data.requirements : []).map(mapRequirement);
    }],
    ['Tarefas', async () => {
      const data = await apiFetch('/tasks');
      state.tasks = (Array.isArray(data?.tasks) ? data.tasks : []).map(mapTask);
    }],
    ['Loja', async () => {
      const data = await apiFetch('/shop');
      state.shopItems = (Array.isArray(data?.items) ? data.items : []).map(mapShopItem);
    }],
    ['DPE Mail', async () => {
      const data = await apiFetch('/mail');
      state.mail = (Array.isArray(data?.mail) ? data.mail : []).map(mapMail);
    }],
    ['Notificações', async () => {
      const data = await apiFetch('/notifications');
      state.notifications = (Array.isArray(data?.notifications) ? data.notifications : []).map(mapNotification);
      state.notificationsUnread = Number.isFinite(Number(data?.unread)) ? Number(data.unread) : state.notifications.filter(notification => !notification.read).length;
    }],
    ['Avisos', async () => {
      const data = await apiFetch('/content/banners');
      state.banners = (Array.isArray(data?.banners) ? data.banners : []).map(mapBanner);
    }],
    ['Notícias', async () => {
      const data = await apiFetch('/content/news');
      state.news = (Array.isArray(data?.news) ? data.news : []).map(mapNews);
    }],
    ['Divisões', async () => {
      const data = await apiFetch('/org/divisions');
      state.divisions = (Array.isArray(data?.divisions) ? data.divisions : []).map(mapDivision);
    }],
    ['Patentes', async () => {
      const data = await apiFetch('/org/ranks');
      state.ranks = Array.isArray(data?.ranks) ? data.ranks : [];
    }],
    ['Turnos', async () => {
      const data = await apiFetch('/shifts/me/active');
      state.shiftStart = data?.active?.startedAt ? new Date(data.active.startedAt).getTime() : null;
    }],
    ['Documentos', async () => {
      const data = await apiFetch('/content/documents');
      state.documents = (Array.isArray(data?.documents) ? data.documents : []).map(mapDocument);
    }],
  ];

  const results = await Promise.allSettled(loaders.map(([, load]) => load()));
  const failures = results.flatMap((result, index) => result.status === 'rejected'
    ? [{ module: loaders[index][0], message: result.reason?.message || 'Falha ao carregar.' }]
    : []);

  // "Promoções recentes" no dashboard = requerimentos de Promoção aprovados, mais novos primeiro.
  state.promotions = state.requirements
    .filter(r => r.typeId === 'promocao' && r.status === 'Aprovado')
    .slice(0, 6)
    .map(r => ({ who: r.target, avatar: avatarEmoji(r.id), when: r.decidedAt || r.date, text: r.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g,' ').trim() }));

  return failures;
}

async function reload(...parts) {
  const jobs = {
    members: async () => { state.members = (await apiFetch('/members')).members.map(mapMember); },
    medals: async () => { state.medals = mapMedalsGrouped((await apiFetch('/medals')).grouped); },
    requirements: async () => { state.requirements = (await apiFetch('/requirements')).requirements.map(mapRequirement); },
    tasks: async () => { state.tasks = (await apiFetch('/tasks')).tasks.map(mapTask); },
    shop: async () => { /* loja não recarrega a lista, só o saldo do usuário */ },
    mail: async () => { state.mail = (await apiFetch('/mail')).mail.map(mapMail); },
    notifications: async () => {
      const data = await apiFetch('/notifications');
      state.notifications = (Array.isArray(data?.notifications) ? data.notifications : []).map(mapNotification);
      state.notificationsUnread = Number.isFinite(Number(data?.unread)) ? Number(data.unread) : state.notifications.filter(notification => !notification.read).length;
    },
    documents: async () => { state.documents = (await apiFetch('/content/documents')).documents.map(mapDocument); },
    me: async () => { const d = await apiFetch('/auth/me'); state.user = mapMemberToUser(d.member); },
  };
  await Promise.all(parts.map(p => jobs[p] ? jobs[p]() : Promise.resolve()));
}

