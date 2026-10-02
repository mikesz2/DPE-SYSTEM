/* System DPE — perfil social e histórico profissional. */
const PROFILE_POST_META = {
  AULA: { label: 'Postagem de Aula', icon: '/assets/profile/verificacao-verde-v2.png' },
  CERTIFICADO: { label: 'Aprovado', marker: '✓' },
  PROMOCAO: { label: 'Promovido', icon: '/assets/profile/promocao-seta-v3.png' },
  DEMISSAO: { label: 'Demitido', marker: '×' },
  REBAIXAMENTO: { label: 'Rebaixamento', marker: '↓' },
  DIVISAO: { label: 'Divisão atualizada', marker: '◆' },
  CARGO: { label: 'Cargo atualizado', marker: '♜' },
  STATUS: { label: 'Status atualizado', marker: '●' },
  MEDALHA: { label: 'Condecoração recebida', marker: '★' },
  MEDALHA_REMOVIDA: { label: 'Condecoração removida', marker: '☆' },
  PUNICAO: { label: 'Exoneração / punição', marker: '!' },
  REINTEGRACAO: { label: 'Acesso restaurado', marker: '✓' },
  OCORRENCIA: { label: 'Ocorrência registrada', marker: '⚖' },
  OCORRENCIA_DECIDIDA: { label: 'Ocorrência finalizada', marker: '§' },
  AFASTAMENTO_SOLICITADO: { label: 'Afastamento solicitado', marker: '◷' },
  AFASTAMENTO: { label: 'Afastamento aprovado', marker: '◷' },
  AFASTAMENTO_RECUSADO: { label: 'Afastamento recusado', marker: '×' },
  RETORNO: { label: 'Retorno ao serviço', marker: '↩' },
  ENTRADA: { label: 'Entrou na DPE', icon: '/assets/profile/entrada-dpe-v1.png' },
};

function profileStatusLabel(status) {
  return ({ ATIVO: 'Ativo', LICENCA: 'Em licença', AVAL: 'Em aval', AFASTADO: 'Afastado', EXPULSO: 'Banido', DESLIGADO: 'Desligado' })[status] || status || 'Ativo';
}

function profileUser() {
  const memberId = state.profileMemberId || state.user.id;
  return state.members.find(member => member.id === memberId) || state.user;
}

function banTimeLabel(member) {
  if (!member.bannedUntil) return 'Indeterminado';
  const start = new Date(member.bannedAt);
  const end = new Date(member.bannedUntil);
  const days = Math.max(1, Math.round((end - start) / 86400000));
  return `${days} ${days === 1 ? 'dia' : 'dias'} · até ${end.toLocaleString('pt-BR')}`;
}

function viewMemberProfile(member) {
  state.profileMemberId = member.id;
  closeModal();
  navigateTo('profile');
}

function updateEquippedCover(profileCoverUrl, itemId = null) {
  state.user.profileCoverUrl = profileCoverUrl;
  const self = state.members.find(member => member.id === state.user.id);
  if (self) self.profileCoverUrl = profileCoverUrl;
  state.shopItems.forEach(item => { if (item.kind === 'PROFILE_COVER') item.equipped = item.id === itemId; });
}

function pageProfile() {
  const u = profileUser();
  const ownProfile = u.id === state.user.id;
  const status = profileStatusLabel(u.status);
  const activity = u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString('pt-BR') : 'Nenhuma atividade registrada';
  const avatar = u.avatarUrl || '/assets/login/brasao-dpe-v2.png';
  const banned = u.status === 'EXPULSO';
  const canBan = can('MODERADOR') && !ownProfile && !banned && (state.user.role === 'DONO' || ROLE_ORDER.indexOf(u.role) < ROLE_ORDER.indexOf(state.user.role));
  const canUnban = can('ADMINISTRADOR') && !ownProfile && banned;
  const profileCover = u.profileCoverUrl ? escapeHtml(u.profileCoverUrl) : '';

  const militaryFile = `
    <section class="profile-tab-panel" data-profile-panel="file" hidden>
      <div class="profile-section-heading">
        <div><span class="profile-kicker">FICHA MILITAR</span><h2>Registro institucional</h2></div>
        <span class="profile-record-code">DPE • ${String(u.id).padStart(4,'0')}</span>
      </div>
      <div class="profile-file-grid">
        <article class="profile-file-card profile-file-primary">
          <div class="profile-card-title"><span>Dados do militar</span><small>IDENTIFICAÇÃO</small></div>
          <dl class="profile-info-list profile-info-list-wide">
            <div><dt>Status</dt><dd><i class="profile-status-dot ${u.status === 'ATIVO' ? 'active' : ''}"></i>${escapeHtml(status)}</dd></div>
            <div><dt>Patente</dt><dd>${escapeHtml(u.rank)}</dd></div>
            <div><dt>Tempo no posto</dt><dd>${escapeHtml(timeInPosition(u.rankStartedAt))}</dd></div>
            <div><dt>Divisão</dt><dd>${escapeHtml(u.division || 'Não informada')}</dd></div>
            <div><dt>Data de alistamento</dt><dd>${escapeHtml(u.since)}</dd></div>
            <div><dt>Última atividade</dt><dd>${escapeHtml(activity)}</dd></div>
          </dl>
        </article>
        <article class="profile-file-card profile-file-stamp">
          <img src="/assets/login/brasao-dpe-v2.png" alt="Brasão DPE" decoding="async">
          <small>DEPARTAMENTO DE POLÍCIA DE ELITE</small>
          <strong>${escapeHtml(u.rank)}</strong>
          <span>${escapeHtml(u.division || 'SEM DIVISÃO')}</span>
          <b>${escapeHtml(status.toUpperCase())}</b>
        </article>
      </div>
    </section>`;

  const achievements = `
    <section class="profile-tab-panel" data-profile-panel="achievements" hidden>
      <div class="profile-section-heading">
        <div><span class="profile-kicker">CONQUISTAS</span><h2>Marcas da trajetória</h2></div>
        <span class="profile-record-code">${u.emblems?.length || 0} EMBLEMAS</span>
      </div>
      <div class="profile-achievements-summary">
        <article><strong>${u.medals ?? 0}</strong><span>Condecorações</span><small>Reconhecimentos oficiais</small></article>
        <article><strong>${u.hours ?? 0}h</strong><span>Tempo em base</span><small>Presença registrada</small></article>
        <article><strong>${u.followers ?? 0}</strong><span>Seguidores</span><small>Rede dentro da corporação</small></article>
      </div>
      <article class="profile-achievements-card">
        <div class="profile-card-title"><span>Emblemas</span><small>COLEÇÃO PESSOAL</small></div>
        <div class="profile-emblems-grid profile-emblems-showcase">${u.emblems?.length
          ? u.emblems.map(emblem => `<figure title="${escapeHtml(emblem.name)}"><img src="${escapeHtml(emblem.imageUrl)}" alt="${escapeHtml(emblem.name)}" decoding="async"><figcaption>${escapeHtml(emblem.name)}</figcaption>${ownProfile ? `<button type="button" class="profile-emblem-remove" data-remove-emblem="${emblem.id}">Remover</button>` : ''}</figure>`).join('')
          : '<p>Nenhum emblema adquirido.</p>'}</div>
      </article>
    </section>`;

  const statistics = `
    <section class="profile-tab-panel" data-profile-panel="stats" hidden>
      <div class="profile-section-heading">
        <div><span class="profile-kicker">DESEMPENHO</span><h2>Estatísticas individuais</h2></div>
        <span class="profile-record-code">DADOS REAIS DO SYSTEM</span>
      </div>
      <div id="profileStatsContent" class="profile-stats-content">
        <div class="profile-feed-loading"><span></span><p>Calculando desempenho...</p></div>
      </div>
    </section>`;

  const socialNetwork = `
    <section class="profile-tab-panel" data-profile-panel="network" hidden>
      <div class="profile-section-heading">
        <div><span class="profile-kicker">REDE DPE</span><h2>Presença na comunidade</h2></div>
        <span class="profile-record-code">@${escapeHtml(u.nick)}</span>
      </div>
      <nav class="profile-network-tabs" aria-label="Atividade social de ${escapeHtml(u.nick)}">
        <button class="active" type="button" data-profile-network="posts">Publicações</button>
        <button type="button" data-profile-network="media">Mídia</button>
        <button type="button" data-profile-network="likes">Curtidas</button>
        <button type="button" data-profile-network="connections">Conexões</button>
      </nav>
      <div id="profileNetworkContent" class="profile-network-content">
        <div class="profile-feed-loading"><span></span><p>Carregando Rede DPE...</p></div>
      </div>
    </section>`;

  return `<div class="social-profile dpe-profile-v2">
    <section class="social-profile-header">
      <div class="social-cover ${profileCover ? 'custom-cover' : ''}"${profileCover ? ` style="--profile-cover:url('${profileCover}')"` : ''}>
        <div class="profile-cover-insignia"><span>DPE</span><small>DISCIPLINA • HONRA • UNIÃO</small></div>
        <div class="profile-cover-crest-wrap" aria-hidden="true">
          <span class="profile-cover-crest-orbit"></span>
          <img src="/assets/login/brasao-dpe-v2.png" alt="">
          <div><strong>POLÍCIA DPE</strong><small>DEPARTAMENTO DE POLÍCIA DE ELITE</small></div>
        </div>
        <div class="profile-cover-code">DPE // PERFIL OPERACIONAL</div>
      </div>
      <div class="social-identity">
        <div class="social-avatar"><img src="${escapeHtml(avatar)}" alt="Avatar de ${escapeHtml(u.nick)}" decoding="async" onerror="this.onerror=null;this.src='/assets/login/brasao-dpe-v2.png'"></div>
        <div class="social-name"><span class="profile-kicker">PERFIL MILITAR</span><h1>${escapeHtml(u.nick)}</h1><p><strong>${escapeHtml(u.rank)}</strong><span>•</span><em>${escapeHtml(u.division || 'Sem divisão')}</em><span class="profile-status-chip"><i></i>${escapeHtml(status)}</span></p></div>
        ${ownProfile ? '' : `<div class="social-profile-actions">${banned ? '' : `<button class="btn" id="profileFollow" data-target="${u.id}" disabled>Carregando...</button>`}${canBan ? `<button class="btn danger" id="profileBan" data-target="${u.id}" data-name="${escapeHtml(u.nick)}">Banir da polícia</button>` : ''}${canUnban ? `<button class="btn" id="profileUnban" data-target="${u.id}" data-name="${escapeHtml(u.nick)}">Desbanir da polícia</button>` : ''}</div>`}
      </div>
      <div class="social-stats"><span><b id="profileFollowerCount">${u.followers ?? 0}</b> seguidores</span><span><b>${u.hours ?? 0}h</b> em base</span><span><b>${u.medals ?? 0}</b> condecorações</span></div>
      <nav class="profile-tabs" aria-label="Seções do perfil">
        <button type="button" class="active" data-profile-tab="trajectory">Trajetória</button>
        <button type="button" data-profile-tab="file">Ficha militar</button>
        <button type="button" data-profile-tab="achievements">Conquistas</button>
        <button type="button" data-profile-tab="stats">Estatísticas</button>
        <button type="button" data-profile-tab="network">Rede DPE</button>
      </nav>
    </section>

    ${banned ? `<section class="profile-ban-event" aria-label="Registro de banimento de ${escapeHtml(u.nick)}">
      <span class="profile-ban-marker" aria-hidden="true"><img src="/assets/profile/banimento.png" alt=""></span>
      <article>
        <header><h2>EXONERADO</h2><div class="profile-ban-meta"><time>${u.bannedAt ? new Date(u.bannedAt).toLocaleString('pt-BR') : 'Data não informada'}</time><span>Aplicado por ${escapeHtml(u.bannedBy || 'Administrador')}</span></div></header>
        <div class="profile-ban-body"><h3>Motivo do banimento</h3><p>${escapeHtml(u.bannedReason || 'Motivo não informado.')}</p></div>
        <footer><span>Tempo do banimento</span><strong>${escapeHtml(banTimeLabel(u))}</strong></footer>
      </article>
    </section>` : ''}

    ${state.user?.role === 'SUPREMO' ? `<section class="card profile-supreme-card">
      <div class="card-head"><h3>👑 Administração Suprema</h3><span class="badge gold">SUPREMO</span></div>
      <div class="pad"><p class="muted">Altere diretamente patente, divisão, status e cargo de acesso deste membro.</p>${memberManagePanel(u)}</div>
    </section>` : ''}

    <section class="profile-tab-panel active" data-profile-panel="trajectory">
      <div class="profile-section-heading">
        <div><span class="profile-kicker">HISTÓRICO PROFISSIONAL</span><h2>Trajetória na DPE</h2></div>
        <div class="profile-history-filter">
          <label for="profileHistoryFilter">Filtrar histórico</label>
          <select id="profileHistoryFilter" class="input" data-profile-history-filter>
            <option value="TODOS">Tudo</option>
            <option value="AULA">Aulas</option>
            <option value="PROMOCAO">Promoções</option>
            <option value="CERTIFICADO">Certificados</option>
            <option value="DEMISSAO">Demissões</option>
            <option value="REBAIXAMENTO">Rebaixamentos</option>
            <option value="DIVISAO">Divisões</option>
            <option value="CARGO">Cargos</option>
            <option value="MEDALHA">Condecorações</option>
            <option value="PUNICAO">Punições</option>
            <option value="STATUS">Status</option>
          </select>
        </div>
      </div>
      <div class="profile-trajectory-layout">
        <aside class="profile-trajectory-rail">
          <div class="profile-rail-card"><small>SITUAÇÃO ATUAL</small><strong>${escapeHtml(status)}</strong><span>${escapeHtml(u.rank)}</span></div>
          <div class="profile-rail-card"><small>NA CORPORAÇÃO DESDE</small><strong>${escapeHtml(u.since)}</strong><span>${escapeHtml(timeInPosition(u.rankStartedAt))} no posto</span></div>
        </aside>
        <main class="profile-feed-column profile-feed-v2">
          <div id="profileFeed" class="profile-feed"><div class="profile-feed-loading"><span></span><p>Carregando histórico...</p></div></div>
        </main>
      </div>
    </section>

    ${militaryFile}
    ${achievements}
    ${statistics}
    ${socialNetwork}
  </div>`;
}

function profilePostCard(post) {
  const meta = PROFILE_POST_META[post.type] || { label: post.title || 'Registro', marker: '•' };
  const date = new Date(post.createdAt);
  const actor = post.actor || post.author || null;
  const actorName = actor?.habboName || 'System DPE';
  const actorAvatar = actor?.avatarUrl || '/assets/login/brasao-dpe-v2.png';
  const sourceId = post.sourceId || (post.source === 'PROFILE' ? String(post.id || '').replace('profile-', '') : null);
  const canManage = state.user?.role === 'SUPREMO' && post.source === 'PROFILE' && sourceId;

  if (post.type === 'ENTRADA') {
    return `<article class="profile-post profile-post-entrada">
      <span class="profile-timeline-marker" aria-hidden="true">${meta.icon ? `<img src="${meta.icon}" alt="">` : meta.marker}</span>
      <header class="profile-entry-header"><h3>${escapeHtml(post.title || meta.label)}</h3><time datetime="${escapeHtml(post.createdAt)}">${date.toLocaleDateString('pt-BR')}</time></header>
    </article>`;
  }

  const supremeActions = canManage
    ? `<div class="profile-history-actions">
        <button class="btn soft small" type="button" data-history-edit="${sourceId}">Editar histórico</button>
        <button class="btn danger small" type="button" data-history-delete="${sourceId}">Apagar registro</button>
      </div>`
    : '';

  return `<article class="profile-post profile-post-${String(post.type || 'registro').toLowerCase()}" data-history-post="${escapeHtml(String(sourceId || post.id || ''))}">
    <span class="profile-timeline-marker" aria-hidden="true">${meta.icon ? `<img src="${meta.icon}" alt="">` : escapeHtml(meta.marker || '•')}</span>
    <header>
      <h3>${escapeHtml(post.title || meta.label)}</h3>
      <div class="profile-post-meta">
        <time datetime="${escapeHtml(post.createdAt)}"><img src="/assets/profile/relogio-v1.png" alt="">${post.lessonDate ? escapeHtml(String(post.lessonDate).split('-').reverse().join('/')) : date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}</time>
        <span><img src="/assets/profile/informacao-v1.png" alt="">${escapeHtml(meta.label)}</span>
      </div>
    </header>
    <div class="profile-post-body">
      ${post.approvedRank ? `<h4>Cargo aprovado: ${escapeHtml(post.approvedRank)}</h4>` : ''}
      <p>${escapeHtml(post.description || 'Registro administrativo da trajetória militar.')}</p>
      <div class="profile-history-actor">
        <img src="${escapeHtml(actorAvatar)}" alt="Avatar de ${escapeHtml(actorName)}" loading="lazy" decoding="async">
        <span><small>REGISTRADO POR</small><strong>${escapeHtml(actorName)}</strong>${actor?.rank ? `<em>${escapeHtml(actor.rank)}</em>` : ''}</span>
      </div>
    </div>
    ${supremeActions}
  </article>`;
}
function demoPromotionPosts(user) {
  const author = { habboName: 'Comando DPE', avatarUrl: '/assets/login/brasao-dpe-v2.png', rank: { name: 'Comando' } }, subject = { habboName: user.nick, rank: { name: user.rank } };
  return [
    { id: 'demo-1', demo: true, demoKey: 'demo-1', type: 'PROMOCAO', title: 'Promoção por mérito e desempenho', description: 'O policial demonstrou disciplina, presença e excelência no cumprimento de suas funções.', createdAt: new Date(Date.now() - 86400000).toISOString(), author, subject },
    { id: 'demo-2', demo: true, demoKey: 'demo-2', type: 'PROMOCAO', title: 'Reconhecimento de evolução profissional', description: 'Progressão concedida após avaliação positiva de conduta, conhecimento e participação na corporação.', createdAt: new Date(Date.now() - 8 * 86400000).toISOString(), author, subject },
    { id: 'demo-3', demo: true, demoKey: 'demo-3', type: 'PROMOCAO', title: 'Destaque no quadro da DPE', description: 'Reconhecimento institucional pelo comprometimento contínuo e contribuição com a equipe.', createdAt: new Date(Date.now() - 21 * 86400000).toISOString(), author, subject },
  ];
}

function profileJoinPost(user) {
  return { id: `joined-${user.id}`, type: 'ENTRADA', createdAt: user.joinedAt || new Date().toISOString() };
}

let profilePostsCache = [];
let profilePostFilter = 'TODOS';
let profileStatsRequest = 0;

function profileStatsClock(seconds) {
  const value = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return hours + 'h ' + String(minutes).padStart(2, '0') + 'm';
}

function profileStatsBar(value, max) {
  const percentage = max > 0 ? Math.max(3, Math.min(100, Math.round((value / max) * 100))) : 0;
  return '<i style="width:' + percentage + '%"></i>';
}

async function loadProfileStats() {
  const target = $('#profileStatsContent');
  const user = profileUser();
  if (!target || !user?.id) return;
  const request = ++profileStatsRequest;
  target.innerHTML = '<div class="profile-feed-loading"><span></span><p>Calculando desempenho...</p></div>';
  try {
    const data = await apiFetch('/members/' + user.id + '/stats');
    if (request !== profileStatsRequest || !target.isConnected) return;
    const service = data.service || {};
    const sectors = service.sectors || {};
    const lessons = data.lessons || {};
    const community = data.community || {};
    const monthly = Array.isArray(data.monthly) ? data.monthly : [];
    const maxMonth = Math.max(1, ...monthly.map(item => Number(item.shiftSeconds || 0)));
    target.innerHTML = `
      <section class="profile-stats-grid">
        <article><small>TEMPO TOTAL</small><strong>${escapeHtml(profileStatsClock(service.totalSeconds))}</strong><span>${Number(service.completedShifts || 0)} turnos concluídos</span></article>
        <article><small>MÉDIA POR TURNO</small><strong>${escapeHtml(profileStatsClock(service.averageShiftSeconds))}</strong><span>${service.active ? 'Em turno agora' : 'Sem turno ativo'}</span></article>
        <article><small>AULAS MINISTRADAS</small><strong>${Number(lessons.taught || 0)}</strong><span>${Number(lessons.approved || 0)} aprovados</span></article>
        <article><small>APROVAÇÃO</small><strong>${lessons.approvalRate === null ? '—' : escapeHtml(String(lessons.approvalRate)) + '%'}</strong><span>${Number(lessons.failed || 0)} reprovados</span></article>
      </section>

      <div class="profile-stats-layout">
        <section class="profile-stats-card">
          <header><span>TEMPO POR SETOR</span><h3>Atuação operacional</h3></header>
          <div class="profile-sector-stats">
            <div><span><b>Base</b><em>${escapeHtml(profileStatsClock(sectors.base))}</em></span><div>${profileStatsBar(sectors.base, Math.max(1, service.totalSeconds))}</div></div>
            <div><span><b>O.C.</b><em>${escapeHtml(profileStatsClock(sectors.oc))}</em></span><div>${profileStatsBar(sectors.oc, Math.max(1, service.totalSeconds))}</div></div>
            <div><span><b>O.B.</b><em>${escapeHtml(profileStatsClock(sectors.ob))}</em></span><div>${profileStatsBar(sectors.ob, Math.max(1, service.totalSeconds))}</div></div>
            <div><span><b>Ausência</b><em>${escapeHtml(profileStatsClock(sectors.absence))}</em></span><div>${profileStatsBar(sectors.absence, Math.max(1, service.totalSeconds))}</div></div>
          </div>
        </section>

        <section class="profile-stats-card">
          <header><span>COMUNIDADE</span><h3>Presença no System</h3></header>
          <div class="profile-community-stats">
            <article><strong>${Number(community.medals || 0)}</strong><span>Condecorações</span></article>
            <article><strong>${Number(community.followers || 0)}</strong><span>Seguidores</span></article>
            <article><strong>${Number(community.posts || 0)}</strong><span>Publicações</span></article>
            <article><strong>${Number(community.likesReceived || 0)}</strong><span>Curtidas recebidas</span></article>
          </div>
        </section>
      </div>

      <section class="profile-stats-card profile-monthly-card">
        <header><span>ÚLTIMOS 6 MESES</span><h3>Evolução de presença</h3></header>
        <div class="profile-monthly-chart">
          ${monthly.map(item => `<div class="profile-month-column" title="${escapeHtml(profileStatsClock(item.shiftSeconds))} • ${Number(item.lessons || 0)} aula(s)">
            <strong>${escapeHtml(profileStatsClock(item.shiftSeconds))}</strong>
            <div><i style="height:${Math.max(4, Math.round((Number(item.shiftSeconds || 0) / maxMonth) * 100))}%"></i></div>
            <span>${escapeHtml(item.label)}</span>
            <small>${Number(item.lessons || 0)} aula(s)</small>
          </div>`).join('')}
        </div>
      </section>`;
  } catch (error) {
    if (request === profileStatsRequest && target.isConnected) {
      target.innerHTML = `<div class="profile-feed-empty"><span>!</span><h3>Estatísticas indisponíveis</h3><p>${escapeHtml(error.message)}</p></div>`;
    }
  }
}

let profileNetworkMode = 'posts';
let profileNetworkRequest = 0;

function profileNetworkPostCard(post) {
  const text = String(post.text || '');
  return `<article class="profile-network-post">
    <header><div><strong>${escapeHtml(post.author?.nick || profileUser().nick)}</strong><span>${escapeHtml(timeAgo(post.createdAt))}</span></div>${post.pinned ? '<b>FIXADA</b>' : ''}</header>
    ${text ? `<p>${socialTextHtml(text)}</p>` : ''}
    ${post.imageUrl ? `<img src="${escapeHtml(post.imageUrl)}" alt="Mídia da publicação" loading="lazy" decoding="async">` : ''}
    <footer><span>♥ ${Number(post.likes || 0)}</span><span>↻ ${Number(post.repostsCount || 0)}</span><span>💬 ${Number(post.commentsCount || 0)}</span></footer>
  </article>`;
}

function profileNetworkMemberCard(member, label) {
  return `<button type="button" class="profile-network-member" data-profile-network-member="${Number(member.id)}">
    <img src="${escapeHtml(member.avatarUrl || '/assets/login/brasao-dpe-v2.png')}" alt="" loading="lazy" decoding="async">
    <span><strong>${escapeHtml(member.habboName || member.nick || 'Militar')}</strong><small>${escapeHtml(member.rank || label || 'DPE')}</small></span>
  </button>`;
}

async function loadProfileNetwork(mode = profileNetworkMode) {
  const target = $('#profileNetworkContent');
  const user = profileUser();
  if (!target || !user?.id) return;
  profileNetworkMode = mode;
  const request = ++profileNetworkRequest;
  target.innerHTML = '<div class="profile-feed-loading"><span></span><p>Carregando Rede DPE...</p></div>';

  try {
    if (mode === 'connections') {
      const [followers, following] = await Promise.all([
        apiFetch('/members/' + user.id + '/followers'),
        apiFetch('/members/' + user.id + '/following'),
      ]);
      if (request !== profileNetworkRequest || !target.isConnected) return;
      const followerList = Array.isArray(followers?.members) ? followers.members : [];
      const followingList = Array.isArray(following?.members) ? following.members : [];
      target.innerHTML = `<div class="profile-connections-grid">
        <section><header><span>SEGUIDORES</span><strong>${followerList.length}</strong></header><div>${followerList.length ? followerList.map(member => profileNetworkMemberCard(member, 'Seguidor')).join('') : '<p class="muted">Nenhum seguidor.</p>'}</div></section>
        <section><header><span>SEGUINDO</span><strong>${followingList.length}</strong></header><div>${followingList.length ? followingList.map(member => profileNetworkMemberCard(member, 'Seguindo')).join('') : '<p class="muted">Não segue ninguém ainda.</p>'}</div></section>
      </div>`;
    } else {
      const scope = mode === 'likes' ? 'liked' : 'author';
      const key = mode === 'likes' ? 'memberId' : 'authorId';
      const data = await apiFetch('/posts?scope=' + scope + '&' + key + '=' + user.id);
      if (request !== profileNetworkRequest || !target.isConnected) return;
      let posts = Array.isArray(data?.posts) ? data.posts : [];
      if (mode === 'media') posts = posts.filter(post => post.imageUrl);
      target.innerHTML = posts.length
        ? '<div class="profile-network-posts">' + posts.map(profileNetworkPostCard).join('') + '</div>'
        : '<div class="profile-feed-empty"><span>✦</span><h3>Nada por aqui ainda</h3><p>Esta área será preenchida conforme a atividade na Rede DPE.</p></div>';
    }

    $('[data-profile-network-member]', target).forEach(button => button.onclick = () => {
      const member = state.members.find(item => Number(item.id) === Number(button.dataset.profileNetworkMember));
      if (member) viewMemberProfile(member);
    });
  } catch (error) {
    if (request === profileNetworkRequest && target.isConnected) {
      target.innerHTML = `<div class="profile-feed-empty"><span>!</span><h3>Rede DPE indisponível</h3><p>${escapeHtml(error.message)}</p></div>`;
    }
  }
}

function renderProfilePosts() {
  const feed = $('#profileFeed');
  if (!feed) return;
  const visible = profilePostFilter === 'TODOS'
    ? profilePostsCache
    : profilePostsCache.filter(post => post.type === profilePostFilter);
  if (!visible.length) {
    const label = profilePostFilter === 'AULA' ? 'aulas' : 'registros';
    feed.innerHTML = `<div class="profile-feed-empty"><span>✦</span><h3>Nenhum ${label} neste filtro</h3><p>Quando houver uma nova atividade, ela aparecerá aqui automaticamente.</p></div>`;
    return;
  }
  feed.innerHTML = visible.map(profilePostCard).join('');
  bindSupremeHistoryActions(visible);
}

async function loadProfilePosts() {
  const feed = $('#profileFeed');
  const user = profileUser();
  if (!feed || !user?.id) return;
  try {
    const data = await apiFetch('/profile-posts/timeline/' + user.id);
    if (!feed.isConnected || profileUser().id !== user.id) return;
    profilePostsCache = (Array.isArray(data?.events) ? data.events : [])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    profilePostFilter = 'TODOS';
    const filter = $('[data-profile-history-filter]');
    if (filter) filter.value = profilePostFilter;
    renderProfilePosts();
  } catch (error) {
    if (feed.isConnected) feed.innerHTML = `<div class="profile-feed-empty"><span>!</span><h3>Não foi possível carregar o histórico</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
}


function openSupremeHistoryEditor(post) {
  const lessonDate = post.lessonDate || '';
  openModal(`<div class="modal-head"><b>Editar histórico #${post.id}</b><button class="icon-btn" data-close>✕</button></div>
    <form class="modal-body" id="supremeHistoryForm">
      <div class="field"><label>Tipo</label><select class="input" name="type">
        <option value="AULA" ${post.type==='AULA'?'selected':''}>Aula</option>
        <option value="CERTIFICADO" ${post.type==='CERTIFICADO'?'selected':''}>Certificado</option>
        <option value="PROMOCAO" ${post.type==='PROMOCAO'?'selected':''}>Promoção</option>
        <option value="DEMISSAO" ${post.type==='DEMISSAO'?'selected':''}>Demissão</option>
      </select></div>
      <div class="field"><label>Título</label><input class="input" name="title" minlength="3" maxlength="100" value="${escapeHtml(post.title)}" required></div>
      <div class="field"><label>Descrição</label><textarea class="input" name="description" minlength="3" maxlength="1200" rows="6" required>${escapeHtml(post.description)}</textarea></div>
      <div class="field"><label>Data da aula/histórico</label><input class="input" name="lessonDate" type="date" value="${escapeHtml(lessonDate)}"></div>
      <div class="field"><label>Cargo aprovado</label><input class="input" name="approvedRank" maxlength="80" value="${escapeHtml(post.approvedRank || '')}" placeholder="Ex.: Soldado"></div>
      <button class="btn full" type="submit">Salvar alterações</button>
    </form>`);
  bindGlobalActions($('#modalCard'));
  const form=$('#supremeHistoryForm');
  form.onsubmit=async event=>{
    event.preventDefault();
    const submit=form.querySelector('[type=submit]');
    submit.disabled=true;
    const fd=new FormData(form);
    const body={
      type:fd.get('type'),
      title:fd.get('title'),
      description:fd.get('description'),
      lessonDate:fd.get('lessonDate') || null,
      approvedRank:fd.get('approvedRank')?.trim() || null,
    };
    try{
      await apiFetch('/profile-posts/'+post.id,{method:'PATCH',body:JSON.stringify(body)});
      closeModal();
      toast('Histórico atualizado pelo Supremo.');
      await loadProfilePosts();
    }catch(error){toast(error.message);submit.disabled=false;}
  };
}

function bindSupremeHistoryActions(posts) {
  if(state.user?.role!=='SUPREMO') return;
  const byId=new Map(posts.filter(p=>p.source === 'PROFILE' && p.sourceId).map(p=>[String(p.sourceId),p]));
  document.querySelectorAll('[data-history-edit]').forEach(button=>button.onclick=()=>{
    const post=byId.get(String(button.dataset.historyEdit));
    if(post) openSupremeHistoryEditor({ ...post, id: post.sourceId });
  });
  document.querySelectorAll('[data-demo-history-delete]').forEach(button=>button.onclick=()=>{
    const demoKey=String(button.dataset.demoHistoryDelete || '');
    const post=posts.find(p=>p.demo && String(p.demoKey || p.id)===demoKey);
    const user=profileUser();
    if(!post || !user?.id) return;
    openModal(`<div class="modal-head"><b>Apagar promoção</b><button class="icon-btn" data-close>✕</button></div>
      <div class="modal-body">
        <p>Tem certeza que deseja apagar esta promoção demonstrativa do histórico de <b>${escapeHtml(user.nick)}</b>?</p>
        <button class="btn danger full" id="confirmDemoHistoryDelete" type="button" style="margin-top:14px">Apagar promoção</button>
      </div>`);
    bindGlobalActions($('#modalCard'));
    const confirm=$('#confirmDemoHistoryDelete');
    confirm.onclick=async()=>{
      confirm.disabled=true;
      try{
        await apiFetch('/profile-posts/demo-hidden/'+user.id+'/'+encodeURIComponent(demoKey),{method:'POST',body:'{}'});
        closeModal();
        toast('Promoção removida do histórico.');
        await loadProfilePosts();
      }catch(error){toast(error.message);confirm.disabled=false;}
    };
  });

  document.querySelectorAll('[data-history-delete]').forEach(button=>button.onclick=()=>{
    const post=byId.get(String(button.dataset.historyDelete));
    if(!post) return;
    openModal(`<div class="modal-head"><b>Apagar registro</b><button class="icon-btn" data-close>✕</button></div>
      <div class="modal-body">
        <p>Tem certeza que deseja apagar <b>${escapeHtml(post.title)}</b> deste histórico militar?</p>
        <p class="muted" style="margin-top:8px">A ação será registrada na auditoria do System.</p>
        <button class="btn danger full" id="confirmHistoryDelete" type="button" style="margin-top:14px">Apagar definitivamente</button>
      </div>`);
    bindGlobalActions($('#modalCard'));
    const confirm=$('#confirmHistoryDelete');
    confirm.onclick=async()=>{
      confirm.disabled=true;
      try{
        await apiFetch('/profile-posts/'+post.id,{method:'DELETE'});
        closeModal();
        toast('Registro removido do histórico.');
        await loadProfilePosts();
      }catch(error){toast(error.message);confirm.disabled=false;}
    };
  });
}

async function prepareFollowButton() {
  const button = $('#profileFollow');
  if (!button) return;
  try {
    const data = await apiFetch(`/members/${button.dataset.target}`);
    if (!button.isConnected) return;
    button.dataset.following = data.following ? '1' : '0';
    button.textContent = data.following ? 'Deixar de seguir' : 'Seguir';
    button.disabled = false;
  } catch (error) {
    if (button.isConnected) button.textContent = 'Indisponível';
  }
}

function bindProfileTabs() {
  if (!$('.social-profile')) return;

  document.querySelectorAll('[data-profile-tab]').forEach(button => button.onclick = () => {
    const target = button.dataset.profileTab;
    document.querySelectorAll('[data-profile-tab]').forEach(item => item.classList.toggle('active', item === button));
    document.querySelectorAll('[data-profile-panel]').forEach(panel => {
      const active = panel.dataset.profilePanel === target;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    if (target === 'network') loadProfileNetwork(profileNetworkMode);
    if (target === 'stats') loadProfileStats();
  });

  $('[data-profile-network]').forEach(button => button.onclick = () => {
    profileNetworkMode = button.dataset.profileNetwork || 'posts';
    $('[data-profile-network]').forEach(item => item.classList.toggle('active', item === button));
    loadProfileNetwork(profileNetworkMode);
  });

  const historyFilter = $('[data-profile-history-filter]');
  if (historyFilter) historyFilter.onchange = () => {
    profilePostFilter = historyFilter.value || 'TODOS';
    renderProfilePosts();
  };

  loadProfilePosts();
  prepareFollowButton();
  const button = $('#profileFollow');
  if (button) button.onclick = async () => {
    button.disabled = true;
    try {
      const data = await apiFetch(`/members/${button.dataset.target}/follow`, { method: 'POST' });
      button.dataset.following = data.following ? '1' : '0';
      button.textContent = data.following ? 'Deixar de seguir' : 'Seguir';
      const count = $('#profileFollowerCount');
      const current = Number(count.textContent) || 0;
      count.textContent = Math.max(0, current + (data.following ? 1 : -1));
      const member = state.members.find(item => item.id == button.dataset.target);
      if (member) member.followers = Number(count.textContent);
      toast(data.following ? 'Agora você segue esse militar' : 'Você deixou de seguir esse militar');
    } catch (error) { toast(error.message); }
    finally { if (button.isConnected) button.disabled = false; }
  };
  const banButton = $('#profileBan');
  if (banButton) banButton.onclick = () => {
    openModal(`<div class="modal-head"><b>Banir ${escapeHtml(banButton.dataset.name)}</b><button class="icon-btn" data-close>✕</button></div>
      <form class="modal-body" id="profileBanForm" data-target="${banButton.dataset.target}">
        <div class="ban-warning"><strong>Esta ação exonera o policial.</strong><p>A patente será alterada para Recruta, a divisão será removida e os acessos administrativos serão cancelados.</p></div>
        <div class="field"><label>Tempo do banimento</label><select class="input" name="duration" required><option value="1">1 dia</option><option value="7">7 dias</option><option value="30" selected>30 dias</option><option value="90">90 dias</option><option value="365">1 ano</option><option value="INDETERMINADO">Indeterminado</option></select></div>
        <div class="field"><label>Motivo do banimento</label><textarea class="input" name="reason" minlength="5" maxlength="500" rows="5" required placeholder="Descreva o motivo que ficará visível no perfil"></textarea></div>
        <button class="btn danger full" type="submit">Confirmar banimento</button>
      </form>`);
    bindGlobalActions($('#modalCard'));
    const form = $('#profileBanForm');
    form.onsubmit = async event => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        const formData = new FormData(form);
        await apiFetch(`/members/${form.dataset.target}/ban`, { method: 'POST', body: JSON.stringify({ reason: formData.get('reason'), duration: formData.get('duration') }) });
        await reload('members');
        closeModal();
        toast('Policial exonerado e patente alterada para Recruta');
        render();
      } catch (error) { toast(error.message); submit.disabled = false; }
    };
  };
  const unbanButton = $('#profileUnban');
  if (unbanButton) unbanButton.onclick = () => {
    openModal(`<div class="modal-head"><b>Desbanir ${escapeHtml(unbanButton.dataset.name)}</b><button class="icon-btn" data-close>✕</button></div>
      <div class="modal-body">
        <p>O acesso deste militar será restaurado. A patente continuará como Recruta e o cargo como Membro.</p>
        <button class="btn full" id="confirmProfileUnban" type="button">Confirmar desbanimento</button>
      </div>`);
    bindGlobalActions($('#modalCard'));
    const confirm = $('#confirmProfileUnban');
    confirm.onclick = async () => {
      confirm.disabled = true;
      try {
        await apiFetch(`/members/${unbanButton.dataset.target}/unban`, { method: 'POST' });
        await reload('members');
        closeModal();
        toast('Militar desbanido com sucesso');
        render();
      } catch (error) { toast(error.message); confirm.disabled = false; }
    };
  };
}

