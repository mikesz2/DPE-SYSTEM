/* System DPE — central da corporação. Dados dos módulos existentes. */
function dashboardPersona(user) {
  const role = user?.role || 'MEMBRO';
  if (role === 'SUPREMO') return {
    label:'PAINEL SUPREMO', tone:'supreme',
    description:'Comando, auditoria e decisões críticas da corporação em primeiro plano.',
    actions:[
      ['command-center','command-center','Central de Comando','Acompanhe a operação ao vivo'],
      ['supreme-investigation','security','Auditoria Suprema','Investigue ações críticas e segurança'],
      ['system-health','tools','Saúde do System','Verifique estabilidade e backups'],
      ['requests','requests','Requisições','Analise pendências administrativas'],
    ],
  };
  if (role === 'DONO' || role === 'ADMINISTRADOR') return {
    label:'PAINEL ADMINISTRATIVO', tone:'admin',
    description:'Operação, gestão de pessoas e integridade do System em destaque.',
    actions:[
      ['command-center','command-center','Central de Comando','Visão operacional em tempo real'],
      ['requests','requests','Requisições','Pendências administrativas'],
      ['security-events','tools','Segurança','Eventos e acessos do System'],
      ['schedules','shifts','Escala','Cobertura e presença da equipe'],
    ],
  };
  if (role === 'MODERADOR') return {
    label:'PAINEL DE MODERAÇÃO', tone:'moderator',
    description:'Efetivo, requisições e cobertura operacional para o trabalho de moderação.',
    actions:[
      ['members','members','Efetivo','Consulte e acompanhe militares'],
      ['requests','requests','Requisições','Analise solicitações pendentes'],
      ['schedules','shifts','Escala','Planeje cobertura e presença'],
      ['social','social','Rede DPE','Acompanhe a comunidade'],
    ],
  };
  if (user?.lessonGuide) return {
    label:'PAINEL DO GUIA', tone:'guide',
    description:'Formação e acompanhamento de alunos ganham prioridade no seu início.',
    actions:[
      ['requests-lesson','classes','Central de Aulas','Acompanhe alunos e registre aulas'],
      ['documents','documents','Documentos','Consulte materiais de formação'],
      ['shifts','shifts','Meu turno','Acompanhe seu serviço'],
      ['social','social','Rede DPE','Interaja com a corporação'],
    ],
  };
  return {
    label:'MEU PAINEL', tone:'member',
    description:'Sua rotina, carreira e vida dentro da Polícia DPE em um só lugar.',
    actions:[
      ['shifts','shifts','Meu turno','Acompanhe sua presença em serviço'],
      ['profile','members','Minha carreira','Veja histórico e estatísticas'],
      ['documents','documents','Documentos','Consulte materiais oficiais'],
      ['social','social','Rede DPE','Acompanhe a comunidade'],
    ],
  };
}

function pageDashboard() {
  const u = state.user;
  const online = state.members.filter(m => m.online);
  const pending = state.requirements.filter(r => r.status === 'Pendente').length;
  const unread = state.mail.filter(m => !m.read).length;
  const hour = new Date().getHours();
  const persona = dashboardPersona(u);
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  return `
    <div class="dashboard-page-head"><div><span>SYSTEM DPE / ${escapeHtml(persona.label)}</span><strong>Central da corporação</strong></div><time>${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}</time></div>
    <div class="dash-grid">
      <div class="dash-main">
        <section class="dpe-command-hero" aria-label="Central operacional DPE">
          <div class="dpe-command-copy">
            <span class="dpe-command-kicker">${escapeHtml(persona.label)} • SYSTEM DPE</span>
            <h2>${greeting}, <strong>${escapeHtml(u.nick)}</strong>.</h2>
            <p>${escapeHtml(persona.description)}</p>
            <div class="dpe-command-actions">
              <button class="btn" data-route="${persona.actions[0][0]}">${escapeHtml(persona.actions[0][2])} <span>→</span></button>
              <button class="btn ghost" data-route="${persona.actions[1][0]}">${escapeHtml(persona.actions[1][2])}</button>
            </div>
            <div class="dpe-command-meta">
              <span><i></i>${online.length} online agora</span>
              <span>${pending} requisições pendentes</span>
              <span>${state.shiftStart ? 'Turno em andamento' : 'Sem turno aberto'}</span>
            </div>
          </div>
          <div class="dpe-command-crest" aria-hidden="true">
            <span class="dpe-command-ring ring-a"></span>
            <span class="dpe-command-ring ring-b"></span>
            <img src="/assets/login/brasao-dpe-v2.png" alt="">
            <strong>DPE</strong>
            <small>DISCIPLINA • HONRA • UNIÃO</small>
          </div>
          <div class="dpe-command-code">DPE / ${new Date().getFullYear()} / ${String(u.id || 0).padStart(4,'0')}</div>
        </section>
        <section class="overview-stats" aria-label="Resumo da corporação">${[['members',state.members.length,'Membros','Efetivo da corporação'],['requests',pending,'Requisições','Central administrativa'],['mail',unread,'Mensagens','Não lidas no seu Mail']].map(([r,n,l,s]) => `<button data-route="${r}" class="overview-stat"><span class="stat-icon">${navIcon(r)}</span><div><strong>${n}</strong><span>${l}</span><small>${s}</small></div><span class="stat-arrow">↗</span></button>`).join('')}</section>
        <div class="section-title"><h2>Seu dia no System</h2><span class="section-caption">ACESSO RÁPIDO</span></div>
        <div class="dpe-quick-links">${persona.actions.map(([r,i,t,d]) => `<button data-route="${r}"><span class="quick-icon">${navIcon(i)}</span><strong>${escapeHtml(t)}</strong><small>${escapeHtml(d)}</small><span class="quick-arrow">↗</span></button>`).join('')}</div>
        <section class="featured-news dpe-featured-news" aria-label="Notícia em destaque">
          <img src="/assets/news/destaque-variaveis-fx-v1.png" alt="Variáveis FX do Habbo" decoding="async">
          <div class="featured-news-overlay"><span class="featured-news-tag">DESTAQUE</span><h2>Novidades do System DPE</h2><p>Acompanhe as principais novidades, eventos e atualizações da corporação.</p></div>
        </section>
        <div class="section-title"><h2>Notícias da corporação</h2><span class="section-caption">BOLETIM DPE</span></div>
        <div class="news-grid">${state.news.length ? state.news.map((n,i) => `<article class="news-card"><div class="dpe-news-art"><span>BOLETIM DPE</span><img src="/assets/login/brasao-dpe-v2.png" alt="" loading="lazy" decoding="async"><b>${String(i+1).padStart(2,'0')}</b></div><div class="news-body"><div class="news-meta">${escapeHtml(n.date)} · ${escapeHtml(n.read)}</div><h3>${escapeHtml(n.title)}</h3><p class="news-excerpt">${escapeHtml(n.excerpt)}</p><div class="news-foot"><span>Por ${escapeHtml(n.author || 'Comando DPE')}</span></div></div></article>`).join('') : '<div class="dpe-empty"><span>✧</span><strong>Novidades a caminho</strong><p>As notícias da corporação aparecerão aqui assim que forem publicadas.</p></div>'}</div>
        <div class="section-title"><h2>Últimas promoções</h2><span class="section-caption">MÉRITO E EVOLUÇÃO</span></div><div class="promo-scroll">${state.promotions.length ? state.promotions.map(p => `<div class="promo-card"><div class="pav">${p.avatar}</div><b>${escapeHtml(p.who)}</b><p>${escapeHtml(p.when)}<br>${escapeHtml(p.text.slice(0,100))}</p></div>`).join('') : '<div class="dpe-empty compact"><p>As próximas promoções aprovadas serão celebradas aqui.</p></div>'}</div>
      </div>
      <aside class="dash-rail">
        <section class="dpe-duty"><div class="rail-eyebrow">MINHA ATIVIDADE</div><div class="duty-heading"><span class="duty-symbol">${navIcon('shifts')}</span><h2>${state.shiftStart ? 'Turno em andamento' : 'Pronto para servir?'}</h2></div><p>${state.shiftStart ? 'Seu turno está aberto. Acompanhe suas horas e encerre ao concluir.' : 'Acompanhe sua presença e registre cada etapa da sua jornada.'}</p><button class="btn full" data-route="shifts">${state.shiftStart ? 'Acompanhar turno' : 'Abrir meus turnos'} →</button></section>
        <section class="card dpe-bulletins"><div class="card-head"><h3>Quadro de avisos</h3><span class="rail-mark">↗</span></div><div class="pad">${state.banners.length ? state.banners.map(b => `<div class="bulletin"><small>COMUNICADO DPE</small><h4>${escapeHtml(b.title)}</h4><p>${escapeHtml(b.sub)}</p></div>`).join('') : '<p class="muted">Nenhum comunicado no momento.</p>'}</div></section>
        <section class="card"><div class="card-head"><h3>Na corporação agora</h3><span class="online-count"><i></i>${online.length}</span></div><div class="pad">${online.length ? online.slice(0,6).map(m => `<button class="online-row" data-member="${m.id}"><span class="face online">${m.avatar}</span><span><b>${escapeHtml(m.nick)}</b><small>${escapeHtml(m.rank)}</small></span></button>`).join('') : '<p class="muted">Nenhum outro policial online no momento.</p>'}<button class="btn ghost small full" data-route="members">Ver efetivo completo →</button></div></section>
        <div class="rail-signature"><img src="/assets/login/brasao-dpe-v2.png" alt="" loading="lazy" decoding="async"><strong>POLÍCIA DPE</strong><span>Disciplina. Honra. União.</span></div>
      </aside>
    </div><footer class="interior-footer"><span>SYSTEM DPE · CORPORAÇÃO HABBO</span><span>Desenvolvido por <b>Mux</b> e <b>MikeG0D</b></span></footer>`;
}

function idCardWidget(u) {
  const days = daysBetween(u.since);
  return `
  <div class="id-card">
    <div class="id-head"><b>🛡️ POLÍCIA DPE</b><img class="id-badge" src="/assets/login/brasao-dpe-v2.png" alt="Brasão DPE" decoding="async"></div>
    <div class="id-body">
      <div class="id-photo">${u.avatar}</div>
      <div class="id-fields">
        <div><b>${escapeHtml(u.nick)}</b></div>
        <div>PATENTE<br><b>${escapeHtml(u.rank)}</b></div>
        <div>DIAS NA CORPORAÇÃO<br><b>${days}</b></div>
      </div>
    </div>
    <div class="id-strip"><span class="dots">★★★★★★★★★★</span><span class="eyebrow">DPE · IDENTIDADE</span></div>
  </div>`;
}

function initCarousel() {
  clearInterval(window._carTimer);
  const track = $('#carouselTrack');
  if (!track) return;
  const dots = $$('#carDots span');
  const total = state.banners.length;
  const show = i => { state.carouselIndex = (i + total) % total; track.style.transform = `translateX(-${state.carouselIndex * 100}%)`; dots.forEach((d,x)=>d.classList.toggle('active', x===state.carouselIndex)); };
  $('#carPrev').onclick = () => show(state.carouselIndex - 1);
  $('#carNext').onclick = () => show(state.carouselIndex + 1);
  clearInterval(window._carTimer);
  window._carTimer = setInterval(() => show(state.carouselIndex + 1), 5000);
}
