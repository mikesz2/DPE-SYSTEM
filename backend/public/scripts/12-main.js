/* ==========================================================================
   SYSTEM DPE — roteador e inicialização
   ========================================================================== */
let state = {
  route: location.hash.replace('#', '') || 'dashboard',
  theme: store.get('theme', 'dpe-light'),
  carouselIndex: 0,
  profileMemberId: null,
  documentId: null,
  accessDashboardTab: 'logs',
  user: null,
  members: [], medals: {}, requirements: [], requirementTypes: [], tasks: [], shopItems: [],
  mail: [], notifications: [], notificationsUnread: 0, banners: [], news: [], documents: [], divisions: [], ranks: [], promotions: [],
  socialPosts: [], socialSuggestions: [], socialLoaded: false, socialSuggestionsLoaded: false,
  socialScope: 'for-you', socialNextCursor: null,
  shiftStart: null,
};

const PAGES = {
  requests: pageRequests,
  'requests-lesson': pageRequestsLesson,
  'requests-promotion': pageRequestsPromotion,
  'requests-dismissal': pageRequestsDismissal,
  'access-dashboard': pageAccessDashboard,
  'security-events': pageSecurityEvents,
  'system-health': pageSystemHealth,
  'supreme-investigation': pageSupremeInvestigation,
  reports: pageReports,
  nexus: pageNexus,
  'war-room': pageWarRoom,
  intelligence: pageIntelligence,
  executive: pageExecutive,
  'field-audit': pageFieldAudit,
  'management-360': pageManagement360,
  operations: pageOperations,
  'temporary-functions': pageTemporaryFunctions,
  dashboard: pageDashboard,
  'command-center': pageCommandCenter,
  members: pageMembers, exonerated: pageExonerated, groups: pageGroups,
  medals: pageMedals, rankings: pageRankings,
  store: pageStore, tools: pageTools, documents: pageDocuments,
  requirements: pageRequirements, tasks: pageTasks, shifts: pageShifts, schedules: pageSchedules,
  occurrences: pageOccurrences, leaves: pageLeaves, goals: pageGoals,
  profile: pageProfile, social: pageSocial, announcements: pageAnnouncements, mail: pageMail, chats: pageChats, settings: pageSettings,
  'requirements-new': pageRequirementTypeGrid,
  'requirements-form': () => pageRequirementForm(state.reqTypeId),
};

/* go() e render() ficam em 14-animations.js — cuidam da transição de página */

function bindPage() {
  bindRequestsPage();
  bindVisitDashboard();
  bindSecurityEventsPage();
  bindSystemHealthPage();
  bindCommandCenterPage();
  bindSupremeInvestigationPage();
  bindDocumentsPage();
  bindSocialPage();
  bindGlobalActions($('#content'));

  // Dashboard
  initCarousel();

  // Membros
  $$('[data-member]').forEach(el => el.onclick = () => {
    const m = state.members.find(x => x.id == el.dataset.member);
    if (m) viewMemberProfile(m);
  });
  const sf = $('#statusFilter'), rf = $('#rankFilter'), cf = $('#careerFilter');
  if (sf) {
    const updateRankOptions = () => {
      const selected = rf.value;
      const ranks = memberRankNames(cf?.value || '');
      rf.innerHTML = `<option value="">Todas as patentes</option>${ranks.map(rank => `<option value="${escapeHtml(rank)}">${escapeHtml(rank)}</option>`).join('')}`;
      if (ranks.includes(selected)) rf.value = selected;
    };
    const filterFn = () => {
      const list = state.members.filter(m => !['EXPULSO', 'DESLIGADO'].includes(m.status) &&
        (!cf?.value || memberCareer(m.rank) === cf.value) &&
        (!rf?.value || m.rank === rf.value) &&
        (!sf.value || m.status === sf.value));
      $('#memberGrid').innerHTML = memberCards(list);
      $$('[data-member]', $('#memberGrid')).forEach(el => el.onclick = () => {
        const m = state.members.find(x => x.id == el.dataset.member);
        if (m) viewMemberProfile(m);
      });
    };
    sf.onchange = filterFn;
    if (rf) rf.onchange = filterFn;
    if (cf) cf.onchange = () => { updateRankOptions(); filterFn(); };
  }
  const manageForm = $('#manageForm');
  if (manageForm) manageForm.onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(manageForm);
    const id = manageForm.dataset.target;
    const body = { rankId: fd.get('rankId'), divisionId: fd.get('divisionId') || null, status: fd.get('status') };
    if (fd.has('role')) body.role = fd.get('role');
    try {
      await apiFetch(`/members/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      closeModal();
      await reload('members');
      toast('Militar atualizado');
      render();
    } catch (err) { toast(err.message); }
  };
  const followBtn = $('#followBtn');
  if (followBtn) followBtn.onclick = async () => {
    try {
      const data = await apiFetch(`/members/${followBtn.dataset.target}/follow`, { method: 'POST' });
      followBtn.textContent = data.following ? 'Deixar de seguir' : 'Seguir';
      toast(data.following ? 'Agora você segue esse militar' : 'Deixou de seguir');
      reload('members');
    } catch (err) { toast(err.message); }
  };
  const msgBtn = $('#msgFromProfile');
  if (msgBtn) msgBtn.onclick = async () => {
    try {
      const data = await apiFetch(`/conversations/with/${msgBtn.dataset.target}`, { method: 'POST' });
      closeModal();
      state.openConversationId = data.conversation.id;
      go('chats');
    } catch (err) { toast(err.message); }
  };

  // Condecorações
  const newMedalBtn = $('#newMedalBtn');
  if (newMedalBtn) newMedalBtn.onclick = () => {
    openModal(newMedalModal());
    $('#medalForm').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await apiFetch('/medals', { method: 'POST', body: JSON.stringify({ memberId: fd.get('memberId'), kind: fd.get('kind'), duration: fd.get('duration') }) });
        await reload('members'); state.medals = mapMedalsGrouped((await apiFetch('/medals')).grouped);
        closeModal(); toast('Condecoração concedida'); render();
      } catch (err) { toast(err.message); }
    };
  };

  // Requerimentos
  const newReqBtn = $('#newReqBtn');
  if (newReqBtn) newReqBtn.onclick = () => go('requirements-new');
  $$('[data-reqtype]').forEach(el => el.onclick = () => { state.reqTypeId = el.dataset.reqtype; go('requirements-form'); });
  if (state.route === 'requirements-form') bindRequirementForm(state.reqTypeId);
  $$('[data-decide]').forEach(el => el.onclick = () => decideRequirement(+el.dataset.decide, el.dataset.approve === '1'));
  const rtf = $('#reqTypeFilter'), rsf = $('#reqStatusFilter'), rs = $('#reqSearch');
  if (rtf) {
    const filterReqs = () => {
      const list = state.requirements.filter(r =>
        (!rtf.value || r.type === rtf.value) &&
        (!rsf.value || r.status === rsf.value) &&
        (!rs.value || r.author.toLowerCase().includes(rs.value.toLowerCase()) || r.target.toLowerCase().includes(rs.value.toLowerCase())));
      $('#reqLetters').innerHTML = requirementLetters(list);
      $$('[data-decide]', $('#reqLetters')).forEach(el => el.onclick = () => decideRequirement(+el.dataset.decide, el.dataset.approve === '1'));
    };
    rtf.onchange = rsf.onchange = filterReqs; rs.oninput = filterReqs;
  }

  // Perfil
  bindProfileTabs();
  const logoutBtn = $('#logoutBtn');
  if (logoutBtn) logoutBtn.onclick = () => { openModal(logoutConfirmModal()); $('#confirmLogout').onclick = logout; };

  // Configurações
  bindThemeSwatches();

  // Turnos: descarte ao navegar e reconexão da lista ao vivo.
  if (window._disposeShifts) window._disposeShifts();
  if (window._disposeCommandCenter) window._disposeCommandCenter();
  if (state.route === 'shifts') bindShiftsPage();
  bindSchedulesPage();
  bindOccurrencesPage();
  bindLeavesPage();
  bindGoalsPage();
  bindDivisionsAnnouncements();
  bindReportsPage();
  bindOperationsPage();
  bindTemporaryFunctionsPage();
  bindPhase33Pages();
  bindNexusPages();

  // Tarefas
  const newTaskBtn = $('#newTaskBtn');
  if (newTaskBtn) newTaskBtn.onclick = () => {
    openModal(newTaskModal());
    $('#taskForm').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await apiFetch('/tasks', { method: 'POST', body: JSON.stringify({ groupLabel: fd.get('groupLabel'), description: fd.get('description'), total: Number(fd.get('total')) || 1 }) });
        await reload('tasks'); closeModal(); render();
      } catch (err) { toast(err.message); }
    };
  };
  $$('[data-taskdone]').forEach(el => el.onclick = async () => {
    const id = el.dataset.taskdone, task = state.tasks.find(t => t.id == id);
    if (!task || task.done >= task.total) return;
    try { await apiFetch(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ done: task.done + 1 }) }); await reload('tasks'); render(); }
    catch (err) { toast(err.message); }
  });

  // Loja
  $$('.buy').forEach(b => b.onclick = async () => {
    const id = b.dataset.id;
    b.disabled = true;
    try {
      const data = await apiFetch(`/shop/${id}/buy`, { method: 'POST' });
      state.user.coins = data.coins;
      const item = state.shopItems.find(entry => entry.id == id);
      if (item && (item.kind === 'PROFILE_COVER' || item.kind === 'EMBLEM')) item.owned = true;
      if (item?.kind === 'EMBLEM') {
        const emblem = { id: item.id, name: item.name, imageUrl: item.imageUrl };
        state.user.emblems = [...(state.user.emblems || []).filter(entry => entry.id !== item.id), emblem];
        const self = state.members.find(member => member.id === state.user.id);
        if (self) self.emblems = [...(self.emblems || []).filter(entry => entry.id !== item.id), emblem];
      }
      toast('Compra concluída');
      render();
    } catch (err) { toast(err.message); } finally { if (b.isConnected) b.disabled = false; }
  });
  $$('[data-equip-cover]').forEach(button => button.onclick = async () => {
    button.disabled = true;
    try {
      const data = await apiFetch(`/shop/${button.dataset.equipCover}/equip`, { method: 'POST' });
      updateEquippedCover(data.profileCoverUrl, Number(button.dataset.equipCover));
      toast('Capa aplicada ao perfil');
      render();
    } catch (err) { toast(err.message); if (button.isConnected) button.disabled = false; }
  });
  $$('.toggle-emblem').forEach(button => button.onclick = async () => {
    button.disabled = true;
    try {
      const id = Number(button.dataset.emblemId);
      const action = button.dataset.emblemAction;
      const data = await apiFetch(`/shop/${id}/emblem/${action}`, { method: 'POST' });
      const item = state.shopItems.find(entry => entry.id === id);
      if (item) item.equipped = data.equipped;
      const self = state.members.find(member => member.id === state.user.id);
      if (data.equipped && item) {
        const emblem = { id: item.id, name: item.name, imageUrl: item.imageUrl };
        state.user.emblems = [...(state.user.emblems || []).filter(entry => entry.id !== id), emblem];
        if (self) self.emblems = [...(self.emblems || []).filter(entry => entry.id !== id), emblem];
      } else {
        state.user.emblems = (state.user.emblems || []).filter(entry => entry.id !== id);
        if (self) self.emblems = (self.emblems || []).filter(entry => entry.id !== id);
      }
      toast(data.equipped ? 'Emblema aplicado ao perfil' : 'Emblema removido do perfil');
      render();
    } catch (err) { toast(err.message); if (button.isConnected) button.disabled = false; }
  });
  $$('[data-remove-emblem]').forEach(button => button.onclick = async () => {
    button.disabled = true;
    try {
      const id = Number(button.dataset.removeEmblem);
      await apiFetch(`/shop/${id}/emblem/unequip`, { method: 'POST' });
      state.user.emblems = (state.user.emblems || []).filter(entry => entry.id !== id);
      const self = state.members.find(member => member.id === state.user.id);
      if (self) self.emblems = (self.emblems || []).filter(entry => entry.id !== id);
      const item = state.shopItems.find(entry => entry.id === id);
      if (item) item.equipped = false;
      toast('Emblema removido do perfil');
      render();
    } catch (err) { toast(err.message); if (button.isConnected) button.disabled = false; }
  });

  // Mail
  $$('.mail-item').forEach(el => el.onclick = async () => {
    const message = state.mail[+el.dataset.mail];
    const reader = $('#mailReader');
    if (!message || !reader) return;
    reader.innerHTML = mailReaderHtml(message);
    $$('.mail-item').forEach(item => item.classList.remove('active'));
    el.classList.add('active');
    const badge = el.querySelector('em');
    if (!message.read) {
      try {
        await apiFetch(`/mail/${message.id}/read`, { method: 'POST' });
        message.read = true;
        if (badge) badge.remove();
        updateTopActionBadges();
      } catch { /* a leitura visual continua disponível mesmo se a marcação falhar */ }
    }
  });
  const composeBtn = $('#composeMail');
  if (composeBtn) composeBtn.onclick = () => openMailComposer();

  // Conversas
  bindChatsPage();
}

function updateTopActionBadges() {
  const mailUnread = state.mail.filter(message => !message.read).length;
  const notificationUnread = Number.isFinite(Number(state.notificationsUnread))
    ? Number(state.notificationsUnread)
    : state.notifications.filter(notification => !notification.read).length;
  const mailBadge = $('#topMailBadge');
  const notificationBadge = $('#topNotifBadge');

  if (mailBadge) {
    mailBadge.textContent = mailUnread > 99 ? '99+' : String(mailUnread);
    mailBadge.classList.toggle('hidden', mailUnread === 0);
  }
  if (notificationBadge) {
    notificationBadge.textContent = notificationUnread > 99 ? '99+' : String(notificationUnread);
    notificationBadge.classList.toggle('hidden', notificationUnread === 0);
  }
}

function notificationsDrawerHtml() {
  const unread = Number.isFinite(Number(state.notificationsUnread))
    ? Number(state.notificationsUnread)
    : state.notifications.filter(notification => !notification.read).length;
  return `<div class="notification-drawer">
    <header><div><span>CENTRAL DPE</span><h2>Notificações</h2></div><button class="icon-btn" data-drawer-close aria-label="Fechar">✕</button></header>
    <div class="notification-drawer-toolbar"><span>${unread ? unread + ' não lida(s)' : 'Tudo em dia'}</span>${unread ? '<button class="btn ghost small" id="readAllNotifications">Marcar todas como lidas</button>' : ''}</div>
    <div class="notification-drawer-list">
      ${state.notifications.length ? state.notifications.map(notification => `<article class="notification-drawer-item ${notification.read ? '' : 'unread'}">
        <span class="notification-drawer-icon">${escapeHtml(notification.ico || '🔔')}</span>
        <div><strong>${escapeHtml(notification.title)}</strong><p>${escapeHtml(notification.text)}</p><small>${escapeHtml(notification.time)}</small>${notification.read ? '' : `<button class="btn ghost small notification-read-one" type="button" data-notification-read="${Number(notification.id)}">Marcar como lida</button>`}</div>
      </article>`).join('') : '<div class="notification-drawer-empty"><span>✓</span><strong>Nenhuma notificação</strong><p>Novidades da sua conta aparecerão aqui.</p></div>'}
    </div>
  </div>`;
}

function openNotificationsDrawer() {
  openDrawer(notificationsDrawerHtml());
  const drawer = $('#drawer');
  const close = $('[data-drawer-close]', drawer);
  if (close) close.onclick = closeDrawer;

  (drawer ? drawer.querySelectorAll('.notification-read-one') : []).forEach(button => {
    button.onclick = async () => {
      const id = Number(button.dataset.notificationRead);
      if (!Number.isInteger(id) || id <= 0) return;
      button.disabled = true;
      try {
        await apiFetch('/notifications/' + id + '/read', { method: 'POST' });
        const notification = state.notifications.find(item => Number(item.id) === id);
        if (notification && !notification.read) {
          notification.read = true;
          state.notificationsUnread = Math.max(0, Number(state.notificationsUnread || 0) - 1);
        }
        updateTopActionBadges();
        openNotificationsDrawer();
      } catch (error) {
        toast(error.message);
        if (button.isConnected) button.disabled = false;
      }
    };
  });

  const readAll = $('#readAllNotifications');
  if (readAll) readAll.onclick = async () => {
    readAll.disabled = true;
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      state.notifications.forEach(notification => { notification.read = true; });
      state.notificationsUnread = 0;
      updateTopActionBadges();
      openNotificationsDrawer();
    } catch (error) {
      toast(error.message);
      if (readAll.isConnected) readAll.disabled = false;
    }
  };
}

async function refreshNotificationsSilently() {
  if (!state.user) return;
  try {
    const data = await apiFetch('/notifications');
    state.notifications = (Array.isArray(data?.notifications) ? data.notifications : []).map(mapNotification);
    state.notificationsUnread = Number.isFinite(Number(data?.unread))
      ? Number(data.unread)
      : state.notifications.filter(notification => !notification.read).length;
    updateTopActionBadges();
  } catch {
    // Falha transitória não interrompe o uso do System; tenta novamente no próximo ciclo/foco.
  }
}

function openMailComposer() {
  if (!can('ADMINISTRADOR')) { toast('Só Administradores ou mais podem enviar comunicados.'); return; }
  openModal(`
    <div class="modal-head"><b>Novo comunicado</b><button class="icon-btn" data-close>✕</button></div>
    <div class="modal-body">
      <div class="field"><label>De</label><input class="input" id="mailFrom" value="${state.user.nick}"></div>
      <div class="field" style="margin-top:10px"><label>Assunto</label><input class="input" id="mailSubject"></div>
      <div class="field" style="margin-top:10px"><label>Mensagem</label><textarea class="input" id="mailBody" rows="5"></textarea></div>
      <p class="muted" style="font-size:11px;margin-top:8px">Enviado pra todos os membros da corporação.</p>
      <button class="btn full" id="sendMail" style="margin-top:12px">Enviar</button>
    </div>`);
  $('#sendMail').onclick = async () => {
    const fromLabel = $('#mailFrom').value.trim(), subject = $('#mailSubject').value.trim(), body = $('#mailBody').value.trim();
    if (!subject || !body) return toast('Preencha assunto e mensagem.');
    try {
      await apiFetch('/mail', { method: 'POST', body: JSON.stringify({ fromLabel, subject, body }) });
      toast('Comunicado enviado'); closeModal();
    } catch (err) { toast(err.message); }
  };
}

/* -------------------------------- Busca global ---------------------------- */
let globalSearchTimer = null;
let globalSearchRequest = 0;

function globalSearchIcon(type) {
  return ({ member:'👮', post:'◆', document:'📚', lesson:'🎓', requirement:'📝', occurrence:'⚖️', leave:'◷', announcement:'📢', division:'🛡️' })[type] || '⌕';
}

async function openGlobalSearchResult(hit) {
  const box = $('#searchResults');
  if (box) box.classList.add('hidden');
  const input = $('#globalSearch');
  if (input) input.value = '';

  if (hit.type === 'member') {
    let member = state.members.find(item => Number(item.id) === Number(hit.id));
    if (!member) {
      try {
        const data = await apiFetch('/members/' + hit.id);
        member = mapMember(data.member || data);
        state.members = [...state.members.filter(item => Number(item.id) !== Number(member.id)), member];
      } catch (error) { return toast(error.message); }
    }
    return viewMemberProfile(member);
  }
  if (hit.type === 'document') {
    state.documentId = Number(hit.id);
    return navigateTo('documents');
  }
  if (hit.type === 'division') {
    divisionCenterSelected = Number(hit.id);
    return navigateTo('groups');
  }
  if (hit.type === 'post') {
    const url = new URL(location.href);
    url.searchParams.set('post', String(hit.id));
    history.replaceState(null, '', url.pathname + url.search + '#social');
    state.route = 'social';
    return render();
  }
  return navigateTo(hit.route || 'dashboard');
}

function globalSearch(q) {
  const input = String(q || '').trim();
  const box = $('#searchResults');
  clearTimeout(globalSearchTimer);
  if (!box) return;
  if (input.length < 2) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }

  const request = ++globalSearchRequest;
  box.innerHTML = '<div class="search-hit muted">NEXUS interpretando comando e buscando no System…</div>';
  box.classList.remove('hidden');

  globalSearchTimer = setTimeout(async () => {
    try {
      const [searchResult,commandResult] = await Promise.allSettled([
        apiFetch('/search?q=' + encodeURIComponent(input)),
        apiFetch('/nexus/commands?q=' + encodeURIComponent(input)),
      ]);
      if (request !== globalSearchRequest || !box.isConnected) return;

      const data = searchResult.status === 'fulfilled' ? searchResult.value : { results:[] };
      const commands = commandResult.status === 'fulfilled' && Array.isArray(commandResult.value?.suggestions)
        ? commandResult.value.suggestions : [];
      const hits = Array.isArray(data?.results) ? data.results : [];

      const commandHtml = commands.length
        ? '<div class="command-palette-label"><span>◈</span>NEXUS • AÇÕES E INTENÇÕES</div>' +
          commands.map((cmd,index) => '<button class="search-hit nexus-command-hit" type="button" data-nexus-command="'+index+'"><span class="global-search-hit-icon">⌘</span><span><strong>'+escapeHtml(cmd.title)+'</strong><small>'+escapeHtml(cmd.subtitle || '')+'</small></span><em>'+escapeHtml(cmd.type === 'NEXUS' ? 'Perguntar' : 'Comando')+'</em></button>').join('')
        : '';
      const searchHtml = hits.length
        ? '<div class="command-palette-label"><span>⌕</span>RESULTADOS DO SYSTEM</div>' +
          hits.map((hit,index) => '<button class="search-hit global-search-hit" type="button" data-global-hit="'+index+'"><span class="global-search-hit-icon">'+globalSearchIcon(hit.type)+'</span><span><strong>'+escapeHtml(hit.title)+'</strong><small>'+escapeHtml(hit.subtitle || '')+'</small></span><em>'+escapeHtml(({member:'Militar',post:'Rede DPE',document:'Documento',lesson:'Aula',requirement:'Requisição',occurrence:'Ocorrência',leave:'Afastamento',announcement:'Comunicado',division:'Divisão'})[hit.type] || 'System')+'</em></button>').join('')
        : '';

      box.innerHTML = commandHtml + searchHtml || '<div class="search-hit muted">Nenhum comando ou resultado encontrado.</div>';
      $$('[data-nexus-command]', box).forEach(button => button.onclick = () => {
        box.classList.add('hidden');
        const field = $('#globalSearch'); if(field) field.value='';
        if (typeof openNexusCommand === 'function') openNexusCommand(commands[Number(button.dataset.nexusCommand)]);
      });
      $$('[data-global-hit]', box).forEach(button => button.onclick = () => openGlobalSearchResult(hits[Number(button.dataset.globalHit)]));
    } catch (error) {
      if (request === globalSearchRequest && box.isConnected) box.innerHTML = '<div class="search-hit muted">' + escapeHtml(error.message) + '</div>';
    }
  }, 160);
}

/* -------------------------------- Logout ----------------------------------- */
function logoutConfirmModal() {
  return `
    <div class="modal-head"><b>Sair da conta</b><button class="icon-btn" data-close>✕</button></div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--muted);line-height:1.6">Tem certeza que deseja encerrar sua sessão no System DPE?</p>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn danger" id="confirmLogout">Sair da conta</button>
        <button class="btn ghost" data-close>Cancelar</button>
      </div>
    </div>`;
}

function logout() {
  if (window._disposeShifts) window._disposeShifts();
  if (typeof disposeSystemHealthPage === 'function') disposeSystemHealthPage();
  unbindSystemLifecycleListeners();
  clearInterval(window._notificationPoll);
  clearInterval(window._carTimer);
  clearInterval(window._shiftTimer);
  clearInterval(window._chatPoll);

  state.user = null;
  resetCoreData();
  state.route = 'dashboard';
  state.profileMemberId = null;
  state.documentId = null;
  state.openConversationId = null;
  state.accessDashboardTab = 'logs';
  _lastRoute = null;

  store.set('authed', false);
  store.set('token', null);
  trackVisit('login');
  closeModal();
  closeDrawer();
  location.hash = '';
  $('#systemView').classList.add('hidden');
  $('#loginView').classList.remove('hidden');
  $('#loginUser').value = '';
  $('#loginPass').value = '';
  $('#loginMsg').textContent = '';
  toast('Sessão encerrada');
}

function handleSystemKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && state.user) {
    event.preventDefault();
    const input = $('#globalSearch');
    if (input) { input.focus(); input.select(); }
    return;
  }
  if (event.key === 'Escape') {
    closeModal();
    closeDrawer();
    toggleSidebar(false);
  }
}

function handleSystemHashChange() {
  const route = location.hash.replace('#','') || 'dashboard';
  if (route !== state.route) navigateTo(route, false);
}

function handleSystemFocus() {
  refreshNotificationsSilently();
}

function bindSystemLifecycleListeners() {
  // startSystem pode rodar novamente após logout/login sem refresh.
  document.removeEventListener('keydown', handleSystemKeydown);
  window.removeEventListener('hashchange', handleSystemHashChange);
  window.removeEventListener('focus', handleSystemFocus);
  document.addEventListener('keydown', handleSystemKeydown);
  window.addEventListener('hashchange', handleSystemHashChange);
  window.addEventListener('focus', handleSystemFocus);
}

function unbindSystemLifecycleListeners() {
  document.removeEventListener('keydown', handleSystemKeydown);
  window.removeEventListener('hashchange', handleSystemHashChange);
  window.removeEventListener('focus', handleSystemFocus);
}

/* -------------------------------- Boot ------------------------------------ */
function mapMemberToUser(member) {
  return {
    id: member.id, nick: member.habboName,
    rank: member.rank ? member.rank.name : 'Recruta',
    role: member.role, status: member.status,
    division: member.division ? member.division.sig : '-',
    coins: member.coins, hours: Math.round((member.hours || 0) * 10) / 10,
    followers: member.followerCount ?? 0, medals: member.medalCount ?? 0,
    avatar: '👮',
    avatarUrl: member.avatarUrl,
    lastSeenAt: member.lastSeenAt,
    rankStartedAt: member.rankStartedAt || member.joinedAt,
    bannedAt: member.bannedAt,
    bannedUntil: member.bannedUntil,
    bannedReason: member.bannedReason,
    bannedBy: member.bannedBy,
    profileCoverUrl: member.profileCoverUrl,
    since: fmtDateBR(member.joinedAt) || new Date().toLocaleDateString('pt-BR'),
  };
}

async function enterSystemWithSession(token, member, persistent = $('#remember').checked) {
  store.set('token', token, persistent);
  store.set('authed', true);
  state.user = mapMemberToUser(member);
  $('#loginView').classList.add('hidden');
  $('#systemView').classList.remove('hidden');
  $('#bootOverlay').classList.remove('hidden');

  let failures = [];
  let fatalError = null;
  try {
    failures = await loadCoreData();
    const self = state.members.find(m => Number(m.id) === Number(state.user.id))
      || state.members.find(m => String(m.nick).toLocaleLowerCase('pt-BR') === String(state.user.nick).toLocaleLowerCase('pt-BR'));
    if (self) {
      state.user.medals = self.medals;
      state.user.avatarUrl = self.avatarUrl || state.user.avatarUrl;
      state.user.rank = self.rank || state.user.rank;
      state.user.division = self.division || state.user.division;
      state.user.status = self.status || state.user.status;
      state.user.role = self.role || state.user.role;
    }
  } catch (err) {
    fatalError = err;
    resetCoreData();
  }

  $('#bootOverlay').classList.add('hidden');
  startSystem();

  if (fatalError) {
    toast('O System abriu em modo reduzido: ' + fatalError.message);
  } else if (failures.length) {
    const visible = failures.slice(0, 3).map(item => item.module);
    const extra = failures.length > visible.length ? ` +${failures.length - visible.length}` : '';
    toast('System carregado com áreas indisponíveis: ' + visible.join(', ') + extra + '.');
  }
}

async function init() {
  applyTheme(state.theme);

  const token = store.get('token', null);
  if (token) {
    try {
      const data = await apiFetch('/auth/me');
      await enterSystemWithSession(token, data.member, !sessionStorage.getItem('dcc_token'));
    } catch {
      store.set('token', null);
      store.set('authed', false);
    }
  }

  if (!state.user) {
    trackVisit('login');
    // Chamada sem token, cookies ou corpo: registra apenas que o login abriu.
    fetch('/api/security-events/login-view', { method: 'POST', credentials: 'omit', keepalive: true }).catch(() => {});
  }
  $('#loginForm').onsubmit = async e => {
    e.preventDefault();
    const habboName = $('#loginUser').value.trim(), password = $('#loginPass').value;
    const submitBtn = $('#loginForm button[type=submit]');
    submitBtn.disabled = true;
    $('#loginMsg').style.color = '#64785b'; $('#loginMsg').textContent = 'Entrando...';
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ habboName, password }) });
      $('#loginMsg').textContent = '';
      await enterSystemWithSession(data.token, data.member);
    } catch (err) {
      $('#loginMsg').style.color = '#9d2525';
      $('#loginMsg').textContent = err.message;
    } finally {
      submitBtn.disabled = false;
    }
  };
  $('#activateBtn').onclick = () => openActivationModal();
}

function mountSideAvatar() {
  const host = $('#sideAvatar');
  if (!host || !state.user) return;
  const self = state.members.find(m => Number(m.id) === Number(state.user.id))
    || state.members.find(m => String(m.nick).toLocaleLowerCase('pt-BR') === String(state.user.nick).toLocaleLowerCase('pt-BR'));
  const apiUrl = self?.avatarUrl || state.user.avatarUrl || '';
  const directHabboUrl = 'https://www.habbo.com.br/habbo-imaging/avatarimage?user='
    + encodeURIComponent(state.user.nick)
    + '&direction=2&head_direction=3&action=std&size=l';
  const avatar = document.createElement('img');
  avatar.alt = 'Avatar de ' + state.user.nick;
  avatar.decoding = 'async';
  avatar.referrerPolicy = 'no-referrer';
  let fallbackStage = 0;
  avatar.src = apiUrl || directHabboUrl;
  avatar.onload = () => {
    avatar.classList.remove('side-avatar-fallback');
    host.classList.add('has-avatar');
  };
  avatar.onerror = () => {
    if (fallbackStage === 0 && avatar.src !== directHabboUrl) {
      fallbackStage = 1;
      avatar.src = directHabboUrl;
      return;
    }
    avatar.onerror = null;
    avatar.classList.add('side-avatar-fallback');
    avatar.src = '/assets/login/brasao-dpe-v2.png';
    host.classList.add('has-avatar');
  };
  host.replaceChildren(avatar);
}

function startSystem() {
  if (location.pathname === '/war-room' && state.route !== 'war-room' && !location.hash) state.route = 'war-room';
  renderNav();
  render();
  $('#sideName').textContent = state.user.nick;
  $('#sideRank').textContent = state.user.rank;
  $('#sideRole').textContent = state.user.role === 'DONO' ? '' : (ROLE_META[state.user.role] || ROLE_META.MEMBRO).label;
  $('#sideRole').classList.toggle('hidden', state.user.role === 'DONO');
  mountSideAvatar();
  $('#sideProfileBtn').onclick = () => go('profile');
  $('#topMailBtn').onclick = () => go('mail');
  const notificationButton = $('#topNotifBtn');
  if (notificationButton) notificationButton.onclick = async () => {
    await refreshNotificationsSilently();
    openNotificationsDrawer();
  };
  clearInterval(window._notificationPoll);
  window._notificationPoll = setInterval(() => {
    if (document.visibilityState === 'visible') refreshNotificationsSilently();
  }, 15000);
  updateTopActionBadges();
  $('#menuBtn').onclick = () => toggleSidebar();
  $('#sidebarBackdrop').onclick = () => toggleSidebar(false);
  $('#globalSearch').oninput = e => globalSearch(e.target.value);
  $('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
  bindSystemLifecycleListeners();
}

init();

