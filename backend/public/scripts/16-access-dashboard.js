function trackVisit(page) {
  return apiFetch('/visits', { method: 'POST', body: JSON.stringify({ page }) })
    .catch(() => {}); // Uma falha no registro não interrompe a navegação.
}

function pageAccessDashboard() {
  if (!can('MODERADOR')) return emptyState('🔒', 'Acesso exclusivo para Moderador ou superior.');
  const managedRoles = ['DONO', 'ADMINISTRADOR', 'MODERADOR'];
  const activeTab = ['logs', 'roles', 'documents'].includes(state.accessDashboardTab) ? state.accessDashboardTab : 'logs';
  return `<div class="dpe-module-page access-module-page">
    <section class="module-hero module-hero-access module-hero-compact">
      <div class="module-hero-copy"><span class="module-kicker">ADMINISTRAÇÃO / ACESSOS</span><h1>Controle do <strong>System</strong></h1><p>Gerencie acessos administrativos, consulte logs de navegação e publique documentos oficiais.</p><div class="module-hero-stats"><span><b>${state.members.filter(member => managedRoles.includes(member.role)).length}</b><small>acessos especiais</small></span><span><b>${state.documents.length}</b><small>documentos</small></span></div></div>
      <div class="module-hero-emblem access-hero-emblem" aria-hidden="true"><span>⌘</span><b>ADMIN</b><small>SYSTEM DPE</small></div>
      <div class="module-hero-code">DPE // CONTROLE ADMINISTRATIVO</div>
    </section>
    <nav class="access-dashboard-tabs" aria-label="Seções do Dashboard">
      <button class="${activeTab === 'logs' ? 'active' : ''}" type="button" data-dashboard-tab="logs">Logs de acesso</button>
      <button class="${activeTab === 'roles' ? 'active' : ''}" type="button" data-dashboard-tab="roles">Cargos do System</button>
      <button class="${activeTab === 'documents' ? 'active' : ''}" type="button" data-dashboard-tab="documents">Documentos</button>
    </nav>
    <section class="card access-dashboard-panel ${activeTab === 'logs' ? '' : 'hidden'}" data-dashboard-panel="logs"><div class="pad">
      <form id="visitFilters" style="display:flex;gap:10px;flex-wrap:wrap">
        <label for="visitSearch">Buscar por IP, nick ou página</label>
        <input id="visitSearch" class="input" maxlength="100" placeholder="Digite para filtrar" style="flex:1;min-width:180px">
        <button class="btn" type="submit">Filtrar / Atualizar</button>
      </form>
      <p id="visitStatus" role="status" aria-live="polite" style="margin:16px 0">Carregando logs...</p>
      <div style="overflow-x:auto"><table style="width:100%;text-align:left;white-space:nowrap">
        <thead><tr><th scope="col">Data e hora</th><th scope="col">IP</th><th scope="col">Nick</th><th scope="col">Página acessada</th></tr></thead>
        <tbody id="visitRows"></tbody>
      </table></div>
      <div style="display:flex;gap:12px;align-items:center;margin-top:16px">
        <button class="btn ghost" id="visitPrevious" disabled>Anterior</button>
        <span id="visitPage"></span><button class="btn ghost" id="visitNext" disabled>Próxima</button>
      </div>
    </div></section>
    <section class="access-dashboard-panel ${activeTab === 'roles' ? '' : 'hidden'}" data-dashboard-panel="roles">
      <div class="system-role-intro"><div><span>PERMISSÕES ADMINISTRATIVAS</span><h2>Cargos do System</h2><p>Veja quem possui acesso especial às funções internas do sistema.</p></div><strong>${state.members.filter(member => managedRoles.includes(member.role)).length}</strong></div>
      <div class="system-role-grid">${managedRoles.map(role => {
        const meta = ROLE_META[role];
        const members = state.members.filter(member => member.role === role);
        return `<article class="system-role-card role-${role.toLowerCase()}">
          <header><div><div><h3>${escapeHtml(meta.label)}</h3><small>${members.length} ${members.length === 1 ? 'usuário' : 'usuários'}</small></div></div></header>
          <div class="system-role-members">${members.length ? members.map(member => `<button type="button" data-system-member="${member.id}"><img src="${escapeHtml(member.avatarUrl || '/assets/login/brasao-dpe-v2.png')}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/login/brasao-dpe-v2.png'"><span><b>${escapeHtml(member.nick)}</b><small>${escapeHtml(member.rank)}</small></span><i>${member.online ? 'Online' : 'Offline'}</i></button>`).join('') : '<p>Nenhum usuário definido neste cargo.</p>'}</div>
        </article>`;
      }).join('')}</div>
    </section>
    <section class="access-dashboard-panel ${activeTab === 'documents' ? '' : 'hidden'}" data-dashboard-panel="documents">
      <div class="document-publisher-grid">
        <form class="card document-publisher" id="documentPublishForm"><div class="pad">
          <input type="hidden" name="documentId" value="">
          <div class="profile-card-title"><span id="documentEditorTitle">Novo documento</span><small>EDITOR INSTITUCIONAL</small></div>
          <div class="form-grid" style="margin-top:16px">
            <div class="field"><label>Título</label><input class="input" name="title" maxlength="120" required placeholder="Ex.: Estatuto Oficial da DPE"></div>
            <div class="field"><label>Categoria</label><input class="input" name="category" maxlength="60" required value="Documento oficial" placeholder="Ex.: Regulamento"></div>
            <div class="field"><label>Ícone</label><input class="input" name="icon" maxlength="8" value="📜" placeholder="📜"></div>
            <div class="field"><label>Resumo</label><input class="input" name="summary" maxlength="300" placeholder="Breve descrição exibida na biblioteca"></div>
          </div>
          <div class="field document-editor-field" style="margin-top:14px"><label>Conteúdo</label>
            <div class="document-editor-toolbar" role="toolbar" aria-label="Formatação do documento">
              <button type="button" data-editor-action="heading" title="Título">H2</button><button type="button" data-editor-action="subheading" title="Subtítulo">H3</button>
              <span></span><button type="button" data-editor-action="bold" title="Negrito"><b>B</b></button><button type="button" data-editor-action="italic" title="Itálico"><i>I</i></button><button type="button" data-editor-action="underline" title="Sublinhado"><u>U</u></button>
              <span></span><button type="button" data-editor-action="unordered" title="Lista">• Lista</button><button type="button" data-editor-action="ordered" title="Lista numerada">1. Lista</button><button type="button" data-editor-action="quote" title="Citação">❝</button>
              <span></span><button type="button" data-editor-action="link" title="Inserir link">Link</button><button type="button" data-editor-action="image" title="Inserir imagem">Imagem</button><button type="button" data-editor-action="divider" title="Linha divisória">―</button>
            </div>
            <div class="document-editor-panels"><textarea class="input document-content-input" name="content" minlength="20" maxlength="50000" required placeholder="Comece a escrever seu documento..."></textarea><div class="document-live-preview"><small>PRÉVIA</small><div id="documentPreviewBody"><p>O conteúdo formatado aparecerá aqui.</p></div></div></div>
            <small>Selecione um texto e use a barra de ferramentas. Imagens são inseridas por endereço HTTPS.</small>
          </div>
          <div class="document-editor-actions"><button class="btn ghost hidden" id="documentEditCancel" type="button">Cancelar edição</button><button class="btn" id="documentSubmitButton" type="submit">Publicar documento</button></div>
          <p class="form-msg" id="documentPublishStatus" role="status" aria-live="polite"></p>
        </div></form>
        <aside class="card"><div class="card-head"><h3>Documentos publicados</h3><span>${state.documents.length}</span></div><div class="dashboard-document-list">${state.documents.length ? state.documents.map(document => `<div class="dashboard-document-row"><button type="button" data-dashboard-document="${document.id}"><span>${escapeHtml(document.icon || '📜')}</span><div><b>${escapeHtml(document.title)}</b><small>${escapeHtml(document.category)} · ${escapeHtml(document.date)}</small></div></button><button type="button" class="document-edit-button" data-edit-document="${document.id}">Editar</button></div>`).join('') : '<p>Nenhum documento publicado ainda.</p>'}</div></aside>
      </div>
    </section></div>`;
}

function bindDocumentEditor(form) {
  const editor = form.elements.content;
  const preview = $('#documentPreviewBody');
  const title = $('#documentEditorTitle');
  const submit = $('#documentSubmitButton');
  const cancel = $('#documentEditCancel');
  const refreshPreview = () => { preview.innerHTML = editor.value.trim() ? documentContentHtml(editor.value) : '<p>O conteúdo formatado aparecerá aqui.</p>'; };
  const replaceSelection = (before, after = '', placeholder = 'texto') => {
    const start = editor.selectionStart, end = editor.selectionEnd;
    const selected = editor.value.slice(start, end) || placeholder;
    editor.setRangeText(before + selected + after, start, end, 'select');
    editor.focus(); refreshPreview();
  };
  const prefixLines = prefix => {
    const start = editor.selectionStart, end = editor.selectionEnd;
    const selected = editor.value.slice(start, end) || 'item da lista';
    editor.setRangeText(selected.split(/\r?\n/).map((line, index) => typeof prefix === 'function' ? prefix(line, index) : prefix + line).join('\n'), start, end, 'select');
    editor.focus(); refreshPreview();
  };
  const actions = {
    heading: () => prefixLines('## '), subheading: () => prefixLines('### '),
    bold: () => replaceSelection('**', '**'), italic: () => replaceSelection('*', '*'), underline: () => replaceSelection('__', '__'),
    unordered: () => prefixLines('- '), ordered: () => prefixLines((line, index) => `${index + 1}. ${line}`), quote: () => prefixLines('> '),
    divider: () => replaceSelection('\n---\n', '', ''),
    link: () => {
      const url = window.prompt('Cole o endereço HTTPS do link:');
      if (url && /^https?:\/\//i.test(url)) replaceSelection('[', `](${url})`, 'texto do link');
      else if (url) toast('Informe um endereço iniciado por http:// ou https://');
    },
    image: () => {
      const url = window.prompt('Cole o endereço HTTPS da imagem:');
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) return toast('Informe um endereço iniciado por http:// ou https://');
      const description = window.prompt('Descrição da imagem:') || 'Imagem do documento';
      const insertion = `\n![${description.replace(/[\[\]]/g, '')}](${url})\n`;
      editor.setRangeText(insertion, editor.selectionStart, editor.selectionEnd, 'end');
      editor.focus(); refreshPreview();
    },
  };
  $$('[data-editor-action]', form).forEach(button => button.onclick = () => actions[button.dataset.editorAction]?.());
  editor.oninput = refreshPreview;
  $$('[data-edit-document]').forEach(button => button.onclick = () => {
    const document = state.documents.find(item => item.id === Number(button.dataset.editDocument));
    if (!document) return;
    for (const field of ['title', 'category', 'icon', 'summary', 'content']) form.elements[field].value = document[field] || '';
    form.elements.documentId.value = document.id;
    title.textContent = 'Editar documento';
    submit.textContent = 'Salvar alterações';
    cancel.classList.remove('hidden');
    refreshPreview();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  cancel.onclick = () => {
    form.reset();
    form.elements.documentId.value = '';
    form.elements.category.value = 'Documento oficial';
    form.elements.icon.value = '📜';
    title.textContent = 'Novo documento';
    submit.textContent = 'Publicar documento';
    cancel.classList.add('hidden');
    $('#documentPublishStatus').textContent = '';
    refreshPreview();
  };
  refreshPreview();
}

function bindVisitDashboard() {
  const form = $('#visitFilters');
  if (!form || !can('MODERADOR')) return;
  $$('[data-dashboard-tab]').forEach(button => button.onclick = () => {
    state.accessDashboardTab = button.dataset.dashboardTab;
    $$('[data-dashboard-tab]').forEach(tab => tab.classList.toggle('active', tab === button));
    $$('[data-dashboard-panel]').forEach(panel => panel.classList.toggle('hidden', panel.dataset.dashboardPanel !== button.dataset.dashboardTab));
  });
  $$('[data-system-member]').forEach(button => button.onclick = () => {
    const member = state.members.find(item => item.id === Number(button.dataset.systemMember));
    if (member) viewMemberProfile(member);
  });
  $$('[data-dashboard-document]').forEach(button => button.onclick = () => {
    state.documentId = Number(button.dataset.dashboardDocument);
    navigateTo('documents');
  });
  const documentForm = $('#documentPublishForm');
  if (documentForm) documentForm.onsubmit = async event => {
    event.preventDefault();
    const statusBox = $('#documentPublishStatus');
    const submit = documentForm.querySelector('button[type="submit"]');
    const form = new FormData(documentForm), documentId = form.get('documentId');
    submit.disabled = true;
    statusBox.textContent = 'Publicando documento...';
    try {
      const payload = Object.fromEntries(form.entries());
      delete payload.documentId;
      await apiFetch(documentId ? `/content/documents/${documentId}` : '/content/documents', { method: documentId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      await reload('documents');
      toast(documentId ? 'Documento atualizado' : 'Documento publicado');
      render();
    } catch (error) {
      statusBox.textContent = error.message;
      submit.disabled = false;
    }
  };
  if (documentForm) bindDocumentEditor(documentForm);
  const rows = $('#visitRows'), status = $('#visitStatus'), previous = $('#visitPrevious'), next = $('#visitNext');
  let page = 1, search = '', request = 0;
  async function load() {
    const current = ++request;
    previous.disabled = next.disabled = true;
    rows.innerHTML = '';
    status.textContent = 'Carregando logs...';
    try {
      const data = await apiFetch(`/visits?page=${page}&search=${encodeURIComponent(search)}`);
      if (!form.isConnected || current !== request) return;
      const labels = Object.fromEntries(MENU.flatMap(group => group.items.map(([route, , label]) => [route, label])));
      labels.login = 'Login';
      labels['requirements-new'] = 'Novo requerimento';
      labels['requirements-form'] = 'Formulário de requerimento';
      rows.innerHTML = data.logs.map(log => `<tr>${[
        new Date(log.createdAt).toLocaleString('pt-BR'), log.ip, log.nick,
        `${labels[log.page] || log.page} (#${log.page})`,
      ].map(value => `<td style="padding:12px 8px">${escapeHtml(value)}</td>`).join('')}</tr>`).join('');
      status.textContent = data.total ? `${data.total} acesso(s) encontrado(s). Horários no seu fuso local.` : 'Nenhum acesso encontrado.';
      $('#visitPage').textContent = `Página ${data.page} de ${data.pages}`;
      previous.disabled = page <= 1;
      next.disabled = page >= data.pages;
    } catch (error) {
      if (!form.isConnected || current !== request) return;
      status.textContent = error.message;
      $('#visitPage').textContent = '';
    }
  }
  form.onsubmit = event => { event.preventDefault(); page = 1; search = $('#visitSearch').value.trim(); load(); };
  previous.onclick = () => { page--; load(); };
  next.onclick = () => { page++; load(); };
  load();
}
