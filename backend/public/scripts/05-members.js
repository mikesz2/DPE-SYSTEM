/* System DPE — efetivo organizado por patente. */
const MILITARY_RANK_LABELS = [
  'Recruta', 'Soldado', 'Cabo', 'Sargento', 'Subtenente', 'Aspirante', 'Tenente',
  'Capitão', 'Major', 'Tenente-Coronel', 'Coronel', 'General', 'Marechal',
  'Comandante', 'Comandante-Geral', 'Supremo',
];
const EXECUTIVE_RANK_LABELS = [
  'Trainee', 'Auxiliar', 'Assistente', 'Analista', 'Supervisor', 'Coordenador',
  'Chefe', 'Secretário', 'Gerente', 'Diretor', 'Ministro', 'CEO', 'Chanceler',
  'Fundador Supremo',
];
const EXECUTIVE_RANKS = new Set(EXECUTIVE_RANK_LABELS.map(rank => rank.toLocaleLowerCase('pt-BR')));

function memberCareer(rank) {
  return EXECUTIVE_RANKS.has(String(rank).trim().toLocaleLowerCase('pt-BR')) ? 'EXECUTIVO' : 'MILITAR';
}

function memberRankNames(career = '') {
  const registered = [...state.ranks].sort((a, b) => b.level - a.level).map(rank => rank.name);
  if (!career) return registered;
  const configured = career === 'EXECUTIVO' ? EXECUTIVE_RANK_LABELS : MILITARY_RANK_LABELS;
  const extras = registered.filter(rank => memberCareer(rank) === career && !configured.includes(rank));
  return [...configured].reverse().concat(extras);
}

function memberPortrait(m) {
  return `<span class="member-portrait"><img src="${escapeHtml(m.avatarUrl || '/assets/login/brasao-dpe-v2.png')}" alt="Avatar de ${escapeHtml(m.nick)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/login/brasao-dpe-v2.png';this.classList.add('portrait-fallback')"></span>`;
}
function pageMembers() {
  const effective = state.members.filter(member => !['EXPULSO', 'DESLIGADO'].includes(member.status));
  const online = effective.filter(member => member.online).length;
  const divisions = new Set(effective.map(member => member.division).filter(value => value && value !== '-')).size;
  return `<div class="dpe-module-page members-module-page">
    <section class="members-intro members-photo-hero" aria-labelledby="members-title">
      <img class="members-photo-hero__image" src="/assets/members/members-team-fauxels-v1.jpg" alt="" aria-hidden="true" fetchpriority="high" decoding="async">
      <div class="members-photo-hero__content">
        <span class="members-photo-hero__kicker">Nosso efetivo</span>
        <h1 id="members-title">Membros</h1>
        <p>Consulte a situação operacional, a patente e a divisão de cada policial.</p>
        <div class="module-hero-stats">
          <span><b>${effective.length}</b><small>no efetivo</small></span>
          <span><b>${online}</b><small>online agora</small></span>
          <span><b>${divisions}</b><small>divisões ativas</small></span>
        </div>
        <span class="members-photo-hero__signature">Departamento Policial de Elite</span>
      </div>
      <a class="members-photo-hero__credit" href="https://www.pexels.com/photo/men-and-women-smiling-3184289/" target="_blank" rel="noopener noreferrer" aria-label="Fotografia de fauxels no Pexels (abre em nova aba)">Foto: fauxels · Pexels ↗</a>
    </section>

    <section class="module-toolbar member-directory-toolbar">
      <div>
        <span class="module-toolbar-kicker">FILTROS DO EFETIVO</span>
        <h2>Localize um policial</h2>
      </div>
      <div class="member-filters member-directory-filters">
        <label>Quadro<select class="input" id="careerFilter"><option value="">Militares e Executivos</option><option value="MILITAR">Militares</option><option value="EXECUTIVO">Executivos</option></select></label>
        <label>Patente<select class="input" id="rankFilter"><option value="">Todas as patentes</option>${memberRankNames().map(rank=>`<option value="${escapeHtml(rank)}">${escapeHtml(rank)}</option>`).join('')}</select></label>
        <label>Situação<select class="input" id="statusFilter"><option value="">Todas as situações</option><option value="ATIVO">Ativo</option><option value="LICENCA">Licença</option><option value="AVAL">Aval</option></select></label>
      </div>
    </section>

    <div id="memberGrid" class="member-directory">${memberCards(effective)}</div>
  </div>`;
}

function pageExonerated() {
  const members = state.members.filter(member => member.status === 'EXPULSO');
  return `<div class="dpe-module-page exonerated-module-page">
    <section class="module-hero module-hero-danger" aria-label="Registro de exonerados">
      <div class="module-hero-copy">
        <span class="module-kicker">CORPORAÇÃO / REGISTROS</span>
        <h1>Quadro de <strong>Exonerados</strong></h1>
        <p>Histórico institucional de militares desligados por banimento ou exoneração registrada no System.</p>
        <div class="module-hero-stats">
          <span><b>${members.length}</b><small>registros</small></span>
          <span><b>100%</b><small>auditável</small></span>
        </div>
      </div>
      <div class="module-hero-emblem module-danger-mark" aria-hidden="true"><span>×</span><b>ARQUIVO</b><small>DPE / EXONERAÇÕES</small></div>
      <div class="module-hero-code">DPE // ARQUIVO DISCIPLINAR</div>
    </section>

    <div class="module-section-head">
      <div><span>REGISTROS DISCIPLINARES</span><h2>Militares exonerados</h2></div>
      <small>${members.length} ${members.length === 1 ? 'registro encontrado' : 'registros encontrados'}</small>
    </div>

    <div class="exonerated-grid">${members.length ? members.map(member => `<button type="button" class="exonerated-card" data-member="${member.id}">
      ${memberPortrait(member)}
      <div><span class="exonerated-label">EXONERADO</span><h2>${escapeHtml(member.nick)}</h2><p><b>Patente atual:</b> ${escapeHtml(member.rank)}</p><p><b>Data:</b> ${member.bannedAt ? new Date(member.bannedAt).toLocaleDateString('pt-BR') : 'Não informada'}</p><p class="exonerated-reason">${escapeHtml(member.bannedReason || 'Motivo não informado')}</p><small>Ver perfil completo →</small></div>
    </button>`).join('') : '<div class="dpe-empty"><span>✓</span><strong>Nenhum policial exonerado</strong><p>Os banimentos realizados pelo System aparecerão nesta página.</p></div>'}</div>
  </div>`;
}

function memberCards(list) {
  if (!list.length) return '<div class="dpe-empty"><strong>Nenhum policial encontrado</strong><p>Selecione outra situação para consultar o efetivo.</p></div>';
  const groups = new Map();
  list.forEach(m => { if (!groups.has(m.rank)) groups.set(m.rank,[]); groups.get(m.rank).push(m); });
  const level = name => state.ranks.find(r=>r.name===name)?.level ?? -1;
  return [...groups].sort(([a],[b])=>level(b)-level(a) || a.localeCompare(b,'pt-BR')).map(([rank,members])=>`<section class="member-rank-section"><header class="member-rank-heading"><h2>${escapeHtml(rank)}</h2><span>${members.length} ${members.length===1?'policial':'policiais'}</span></header><div class="member-roster">${members.sort((a,b)=>a.nick.localeCompare(b.nick,'pt-BR')).map(m=>`<button type="button" class="police-card" data-member="${m.id}" aria-label="Ver perfil de ${escapeHtml(m.nick)}"><span class="member-presence ${m.online?'is-online':''}"><i></i>${m.online?'Online':'Offline'}</span>${memberPortrait(m)}<strong>${escapeHtml(m.nick)}</strong><span class="police-rank">${escapeHtml(m.rank)}</span><span class="police-division">${escapeHtml(m.division && m.division!=='-' ? m.division : 'Polícia DPE')}</span><span class="police-card-foot"><span class="badge ${m.status==='ATIVO'?'green':m.status==='LICENCA'?'warn':'danger'}">${escapeHtml(({ATIVO:'Ativo',LICENCA:'Licença',AVAL:'Aval',AFASTADO:'Afastado',EXPULSO:'Expulso',DESLIGADO:'Desligado'})[m.status] || m.status)}</span><span>Ver perfil ↗</span></span></button>`).join('')}</div></section>`).join('');
}

function memberProfileModal(m) {
  const isSelf = state.user && state.user.id === m.id;
  return `
  <div class="modal-head"><b>Perfil militar</b><button class="icon-btn" data-close>✕</button></div>
  <div class="modal-body">
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      ${memberPortrait(m)}
      <div>
        <h2 style="margin:0">${escapeHtml(m.nick)}</h2>
        <p class="muted" style="margin:2px 0">${m.rank} · ${m.division}</p>
        <div style="display:flex;gap:6px;margin-top:4px">
          <span class="badge ${m.online?'green':''}">${m.online?'● Online':'Offline'}</span>
        </div>
      </div>
    </div>
    <div class="grid three" style="margin-top:18px">
      <div class="stat"><small>Divisão</small><strong style="font-size:14px">${m.division}</strong></div>
      <div class="stat"><small>Horas em base</small><strong>${m.hours}h</strong></div>
      <div class="stat"><small>Condecorações</small><strong>${m.medals}</strong></div>
    </div>
    <div class="table-wrap" style="margin-top:16px">
      <table class="table">
        <tr><th>Seguidores</th><td>${m.followers}</td></tr>
        <tr><th>Ingressou em</th><td>${m.since}</td></tr>
        <tr><th>Tempo no posto</th><td>${timeInPosition(m.rankStartedAt)}</td></tr>
      </table>
    </div>
    ${!isSelf ? `
    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="btn small" id="followBtn" data-target="${m.id}">Seguir</button>
      <button class="btn ghost small" id="msgFromProfile" data-target="${m.id}" data-name="${escapeHtml(m.nick)}">Enviar mensagem</button>
    </div>` : ''}
    ${can('MODERADOR') ? memberManagePanel(m) : ''}
  </div>`;
}

function memberManagePanel(m) {
  const canChangeRole = can('ADMINISTRADOR');
  const grantable = ROLE_ORDER.filter(r => state.user.role === 'SUPREMO' || ROLE_ORDER.indexOf(r) < ROLE_ORDER.indexOf(state.user.role));
  return `
  <div class="section-title"><h2>⚙️ Gerenciar</h2></div>
  <form id="manageForm" data-target="${m.id}">
    <div class="form-grid">
      <div class="field"><label>Patente</label><select class="input" name="rankId">${state.ranks.map(r=>`<option value="${r.id}" ${r.name===m.rank?'selected':''}>${r.name}</option>`).join('')}</select></div>
      <div class="field"><label>Divisão</label><select class="input" name="divisionId"><option value="">-</option>${state.divisions.map(d=>`<option value="${d.id}" ${d.sig===m.division?'selected':''}>${d.sig}</option>`).join('')}</select></div>
      <div class="field"><label>Status</label><select class="input" name="status">${['ATIVO','LICENCA','AVAL','AFASTADO','DESLIGADO'].map(s=>`<option value="${s}" ${s===m.status?'selected':''}>${s}</option>`).join('')}</select></div>
      ${canChangeRole ? `<div class="field"><label>Cargo</label><select class="input" name="role">${grantable.map(r=>`<option value="${r}" ${r===m.role?'selected':''}>${ROLE_META[r].label}</option>`).join('')}</select></div>` : ''}
    </div>
    <button class="btn full" style="margin-top:14px">Salvar alterações</button>
  </form>`;
}

/* ------------------------------- Divisões -------------------------------- */
function pageGroups() {
  const totalMembers = state.divisions.reduce((sum, division) => sum + Number(division.memberCount || 0), 0);
  return `<div class="dpe-module-page divisions-module-page">
    <section class="module-hero module-hero-divisions">
      <div class="module-hero-copy">
        <span class="module-kicker">CORPORAÇÃO / ESTRUTURA</span>
        <h1>Divisões da <strong>DPE</strong></h1>
        <p>Conheça as áreas que sustentam a operação, formação, administração e desenvolvimento da corporação.</p>
        <div class="module-hero-stats">
          <span><b>${state.divisions.length}</b><small>divisões</small></span>
          <span><b>${totalMembers}</b><small>vínculos ativos</small></span>
        </div>
      </div>
      <div class="module-hero-emblem divisions-hero-emblem" aria-hidden="true"><img src="/assets/login/brasao-dpe-v2.png" alt=""><b>ESTRUTURA</b><small>POLÍCIA DPE</small></div>
      <div class="module-hero-code">DPE // ORGANIZAÇÃO INSTITUCIONAL</div>
    </section>

    <div class="module-section-head"><div><span>ORGANOGRAMA OPERACIONAL</span><h2>Áreas da corporação</h2></div><small>${state.divisions.length} setores cadastrados</small></div>
    <div class="division-grid-v2">
      ${state.divisions.length ? state.divisions.map((d,index) => `<article class="division-card-v2">
        <span class="division-card-number">${String(index + 1).padStart(2,'0')}</span>
        <div class="division-card-icon">${d.icon}</div>
        <div class="division-card-copy"><small>${escapeHtml(d.sig)}</small><h3>${escapeHtml(d.name)}</h3><p>${escapeHtml(d.desc || 'Divisão institucional da Polícia DPE.')}</p></div>
        <footer><span><i></i>${Number(d.memberCount || 0)} ${Number(d.memberCount || 0) === 1 ? 'membro' : 'membros'}</span><b>${escapeHtml(d.sig)}</b></footer>
      </article>`).join('') : '<div class="dpe-empty"><span>◇</span><strong>Nenhuma divisão cadastrada</strong><p>As divisões da corporação aparecerão aqui.</p></div>'}
    </div>
  </div>`;
}
