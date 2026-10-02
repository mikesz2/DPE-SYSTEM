/* ==========================================================================
   SYSTEM DPE — menu lateral
   Acesso direto aos módulos principais da corporação.
   ========================================================================== */
const MENU = [
  { group:'CORPORAÇÃO', items:[
    ['dashboard','🏠','Início'],
    ['members','👮','Membros'],
    ['social','◆','Rede DPE'],
    ['announcements','📢','Comunicados'],
    ['exonerated','⛔','Exonerados'],
    ['groups','👥','Divisões'],
    ['medals','🎖️','Condecorações'],
    ['rankings','🏆','Rankings'],
  ]},
  { group:'OPERAÇÕES', items:[
    ['command-center','🛰️','Central de Comando'],
    ['nexus','◈','DPE NEXUS'],
    ['war-room','▰','War Room'],
    ['management-360','◎','Central 360'],
    ['operations','⌁','Operações Especiais'],
    ['temporary-functions','🎖️','Funções Temporárias'],
    ['shifts','⏱️','Turnos'],
    ['schedules','📅','Escala'],
    ['occurrences','⚖️','Ocorrências'],
    ['requests','📝','Requisições'],
    ['tasks','✅','Tarefas'],
    ['goals','🎯','Metas'],
    ['documents','📚','Documentos'],
  ]},
  { group:'RECURSOS', items:[
    ['store','🛒','Loja'],
    ['tools','🧰','Ferramentas'],
  ]},
  { group:'MINHA CONTA', items:[
    ['profile','👤','Perfil'],
    ['mail','✉️','Mail DPE'],
    ['chats','💬','Conversas'],
    ['leaves','◷','Afastamentos'],
    ['settings','⚙️','Configurações'],
  ]},
  { group:'ADMINISTRAÇÃO', items:[
    ['access-dashboard','🔐','Acessos'],
    ['security-events','🛡️','Segurança'],
    ['system-health','❤️','Saúde do System'],
    ['reports','📊','Relatórios'],
    ['intelligence','◈','Inteligência'],
    ['field-audit','≡','Log por Campo'],
    ['executive','◆','Painel Executivo'],
    ['supreme-investigation','♜','Central Suprema'],
  ]},
];

const NAV_GROUP_LABELS = {
  'CORPORAÇÃO':'A corporação',
  'OPERAÇÕES':'Gestão e operações',
  'RECURSOS':'Recursos',
  'MINHA CONTA':'Minha conta',
  'ADMINISTRAÇÃO':'Administração',
};

const THEMES = [
  { id:'dpe-light', name:'DPE Claro', accent:'', light:true, bg:'#f2f4ee', bg2:'#ffffff', line:'#dde3d6', ac:'#557340' },
  { id:'dpe-dark', name:'DPE Noturno', accent:'', light:false, bg:'#101b15', bg2:'#17251c', line:'#304334', ac:'#93b67a' },
];

function applyTheme(id) {
  const t = THEMES.find(x => x.id === id) || THEMES[0];
  document.body.classList.toggle('light', !!t.light);
  if (t.accent) document.body.setAttribute('data-accent', t.accent);
  else document.body.removeAttribute('data-accent');
  state.theme = t.id;
  store.set('theme', t.id);
}

const navExpanded = new Set(['GERAL']);
let documentsNavExpanded = false;
let requestsNavExpanded = ['requests-lesson', 'requests-promotion', 'requests-dismissal'].includes(location.hash.replace('#', ''));
function navIcon(route, useCustomIcon = false) {
  const customIcons = {
    dashboard: '/assets/navigation/inicio-casa-v1.png',
    members: '/assets/navigation/membros-v2.png',
    exonerated: '/assets/navigation/exonerados-cruz-v1.png',
    documents: '/assets/navigation/documentos-pasta-v1.png',
    groups: '/assets/navigation/divisoes-v1.png',
    medals: '/assets/navigation/rankings-distintivo-v1.png',
    rankings: '/assets/navigation/condecoracoes-trofeu-v1.png',
    store: '/assets/navigation/loja-carrinho-v1.png',
    shifts: '/assets/navigation/turnos-na-hora-v1.png',
  };
  if (useCustomIcon && customIcons[route]) {
    return `<img class="nav-custom-icon" src="${customIcons[route]}" alt="" aria-hidden="true">`;
  }
  const paths = {
    dashboard:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
    members:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4',
    exonerated:'M6 6l12 12M18 6 6 18M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
    profile:'M20 21v-2a7 7 0 0 0-14 0v2M13 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    groups:'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7Z',
    mail:'M3 5h18v14H3ZM3 5l9 8 9-8',
    chats:'M3 4h18v13H8l-5 4Z',
    social:'M4 5h16v12H8l-4 4V5ZM8 9h8M8 13h5',
    announcements:'M4 6h12l4-3v18l-4-3H4ZM4 10H2v4h2M8 18v3',
    feed:'M3 4h18v16H3ZM7 8h4v4H7ZM14 8h3M14 12h3M7 16h10',
    store:'M3 3h2l3 12h10l3-8H6M9 21h1M17 21h1',
    'command-center':'M4 5h16v14H4ZM8 9h8M8 13h5M18 8v8',
    nexus:'M12 2 15 9l7 3-7 3-3 7-3-7-7-3 7-3Z M12 8v8 M8 12h8',
    'war-room':'M3 4h18v13H3ZM8 21h8M12 17v4M7 8h4v5H7M14 8h3M14 12h3',
    shifts:'M12 8v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
    schedules:'M5 4h14v17H5ZM8 2v4M16 2v4M5 9h14M8 13h3M13 13h3M8 17h3',
    occurrences:'M12 3v18M4 7h16M6 7l-3 6h6ZM18 7l-3 6h6Z',
    leaves:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3 2',
    medals:'M8 3h8l2 7-6 4-6-4ZM12 14l-3 7 3-2 3 2-3-7',
    rankings:'M8 3h8v7a4 4 0 0 1-8 0ZM8 5H3v4a4 4 0 0 0 5 4M16 5h5v4a4 4 0 0 1-5 4M12 14v7M8 21h8',
    cafe:'M3 5h14v9a6 6 0 0 1-12 0V5M17 6h4v5h-4M3 21h16',
    settings:'M4 7h16M4 17h16M9 4v6M15 14v6',
    tools:'M4 7h16M4 17h16M9 4v6M15 14v6',
    classes:'M4 5h16v14H4ZM8 9h8M8 13h6',
    tasks:'M4 6h16M4 12h10M4 18h16M18 10l2 2 4-4',
    goals:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 10v2h2',
    'supreme-investigation':'M12 3 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6Z M9 11h6 M12 8v6',
    reports:'M4 20V10M10 20V4M16 20v-7M3 20h18',
    operations:'M4 12h16M12 4v16M7 7l10 10M17 7 7 17',
    'temporary-functions':'M8 3h8l2 6-6 4-6-4ZM12 13v8M8 21h8',
    'management-360':'M4 12a8 8 0 1 0 16 0 8 8 0 1 0-16 0M8 12h8M12 8v8',
    intelligence:'M4 18V9M10 18V5M16 18v-7M3 18h18M5 4l4 4 4-3 5 4',
    'field-audit':'M5 5h14M5 12h14M5 19h14M8 3v4M12 10v4M16 17v4',
    executive:'M12 3l8 4v5c0 5-3 8-8 10-5-2-8-5-8-10V7Z',
  };
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (paths[route] || 'M6 3h12v18H6ZM9 8h6M9 12h6M9 16h4') + '"/></svg>';
}
function renderNav() {
  $('#nav').innerHTML = MENU.map(group => {
    const g = { ...group, items: group.items.filter(([route]) =>
      (route !== 'access-dashboard' || can('MODERADOR')) &&
      (route !== 'security-events' || can('ADMINISTRADOR')) &&
      (route !== 'system-health' || can('ADMINISTRADOR')) &&
      (route !== 'reports' || can('ADMINISTRADOR')) &&
      (route !== 'intelligence' || can('ADMINISTRADOR')) &&
      (route !== 'field-audit' || can('ADMINISTRADOR')) &&
      (route !== 'executive' || state.user?.role === 'SUPREMO') &&
      (route !== 'supreme-investigation' || state.user?.role === 'SUPREMO') &&
      (route !== 'occurrences' || can('MODERADOR'))
    ) };
    if (!g.items.length) return '';

    const items = g.items.map(([route, ico, label]) => {
      const active = state.route === route || state.route.startsWith(route + '-');
      const expanded = route === 'documents' ? documentsNavExpanded : route === 'requests' ? requestsNavExpanded : null;
      const subnav = route === 'documents' && documentsNavExpanded && state.documents.length
        ? `<div class="nav-document-list" aria-label="Documentos disponíveis">${state.documents.map(document => `<button type="button" class="${state.documentId === document.id ? 'active' : ''}" data-nav-document="${document.id}" title="${escapeHtml(document.title)}"><span class="nav-document-icon" aria-hidden="true"><img src="/assets/navigation/documento-google-v1.png" alt=""></span><span class="nav-document-title">${escapeHtml(document.title)}</span></button>`).join('')}</div>`
        : route === 'requests' && requestsNavExpanded
          ? `<div class="nav-document-list" aria-label="Tipos de requisição">
              <button type="button" class="${state.route === 'requests-lesson' ? 'active' : ''}" data-nav-request="requests-lesson"><span class="nav-document-icon" aria-hidden="true">🎓</span><span class="nav-document-title">Postagem de Aula</span></button>
              <button type="button" class="${state.route === 'requests-promotion' ? 'active' : ''}" data-nav-request="requests-promotion"><span class="nav-document-icon" aria-hidden="true">⬆️</span><span class="nav-document-title">Postagem de Promoção</span></button>
              <button type="button" class="${state.route === 'requests-dismissal' ? 'active' : ''}" data-nav-request="requests-dismissal"><span class="nav-document-icon" aria-hidden="true">🚪</span><span class="nav-document-title">Demitir</span></button>
            </div>`
          : '';
      return `<button class="nav-item ${active ? 'active' : ''}" data-route="${route}" ${expanded !== null ? `aria-expanded="${expanded}"` : active ? 'aria-current="page"' : ''}><span class="ico">${navIcon(route, true)}</span><span>${label}</span>${expanded !== null ? '<span class="nav-chevron">⌄</span>' : ''}</button>${subnav}`;
    }).join('');

    const label = NAV_GROUP_LABELS[g.group] || g.group;
    return `<section class="nav-group dpe-nav-section" data-group="${g.group}">
      <div class="nav-label dpe-nav-section-label"><span>${label}</span></div>
      ${items}
    </section>`;
  }).join('');

  $$('#nav [data-route]').forEach(button => button.onclick = () => {
    const route = button.dataset.route;
    if (route === 'documents') {
      if (state.route !== 'documents') {
        documentsNavExpanded = true;
        go('documents');
      } else {
        documentsNavExpanded = !documentsNavExpanded;
        renderNav();
      }
      return;
    }
    if (route === 'requests') {
      if (!(state.route === 'requests' || state.route.startsWith('requests-'))) {
        requestsNavExpanded = true;
        go('requests');
      } else {
        requestsNavExpanded = !requestsNavExpanded;
        renderNav();
      }
      return;
    }
    go(route);
  });

  document.querySelectorAll('#nav [data-nav-document]').forEach(button => button.onclick = () => {
    documentsNavExpanded = true;
    state.documentId = Number(button.dataset.navDocument);
    navigateTo('documents');
  });
  document.querySelectorAll('#nav [data-nav-request]').forEach(button => button.onclick = () => {
    requestsNavExpanded = true;
    navigateTo(button.dataset.navRequest);
  });
}

