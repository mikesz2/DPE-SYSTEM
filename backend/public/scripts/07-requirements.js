/* ==========================================================================
   SYSTEM DPE — Requerimentos
   Fluxo: lista → grade de tipos → formulário específico do tipo (breadcrumb).
   Cada requerimento decidido vira uma "carta" com assinatura, igual ao
   padrão observado na referência (mais formal que um CRUD genérico).
   ========================================================================== */
function pageRequirements() {
  const pending = state.requirements.filter(item => item.status === 'Pendente').length;
  return `<div class="dpe-module-page legacy-requirements-page">
    <section class="module-hero module-hero-legacy-req module-hero-compact">
      <div class="module-hero-copy"><span class="module-kicker">GESTÃO / REQUERIMENTOS</span><h1>Arquivo de <strong>requerimentos</strong></h1><p>Consulte solicitações administrativas históricas, filtre registros e acompanhe decisões.</p><div class="module-hero-stats"><span><b>${state.requirements.length}</b><small>registros</small></span><span><b>${pending}</b><small>pendentes</small></span></div><button class="btn module-hero-action" id="newReqBtn">+ Novo requerimento</button></div>
      <div class="module-hero-emblem legacy-req-symbol" aria-hidden="true"><span>▤</span><b>ARQUIVO</b></div>
      <div class="module-hero-code">DPE // REQUERIMENTOS ADMINISTRATIVOS</div>
    </section>
    <section class="legacy-req-panel">
      <header><div><span>CONSULTA DE REGISTROS</span><h2>Requerimentos publicados</h2></div></header>
      <div class="req-toolbar req-toolbar-v2">
        <select class="input" id="reqTypeFilter"><option value="">Todos os tipos</option>${state.requirementTypes.map(t=>`<option>${escapeHtml(t.name)}</option>`).join('')}</select>
        <select class="input" id="reqStatusFilter"><option value="">Todos os status</option><option>Pendente</option><option>Aprovado</option><option>Recusado</option></select>
        <input class="input" id="reqSearch" placeholder="Buscar por militar...">
      </div>
      <div id="reqLetters" class="req-letters-v2">${requirementLetters(state.requirements)}</div>
    </section>
  </div>`;
}

function requirementLetters(list) {
  if (!list.length) return emptyState('🗂️', 'Nenhum requerimento encontrado.');
  return list.slice().reverse().map(r => `
    <div class="req-letter">
      <div class="rl-head">${r.type.toUpperCase()} · #${r.id}</div>
      <div class="rl-body">
        <div class="rl-author">
          <span class="avatar">📛</span>
          <div><b>${r.author}</b><small>${r.date}</small></div>
        </div>
        <div class="rl-text">${r.author} escreveu:<br><br>${r.text}</div>
        <div class="rl-check">✅ Li e concordo com as normas vigentes da corporação.</div>
        <div class="rl-foot">
          <div>
            <div class="muted" style="font-size:11px;margin-bottom:4px">Status</div>
            <span class="badge ${r.status==='Aprovado'?'green':r.status==='Recusado'?'danger':'warn'}">${r.status.toUpperCase()}</span>
          </div>
          ${r.decidedBy ? `
          <div class="rl-sign">${r.decidedBy}<small>Usuário responsável · ${r.decidedAt}</small></div>` :
          `<div style="display:flex;gap:8px">
            <button class="btn small" data-decide="${r.id}" data-approve="1">Aprovar</button>
            <button class="btn ghost small" data-decide="${r.id}" data-approve="0">Recusar</button>
          </div>`}
        </div>
      </div>
    </div>`).join('');
}

function pageRequirementTypeGrid() {
  return `<div class="dpe-module-page requirement-create-page">
    <section class="module-hero module-hero-legacy-req module-hero-compact">
      <div class="module-hero-copy"><span class="module-kicker">REQUERIMENTOS / NOVO</span><h1>Novo <strong>requerimento</strong></h1><p>Escolha o tipo de registro administrativo que deseja publicar.</p></div>
      <div class="module-hero-emblem legacy-req-symbol" aria-hidden="true"><span>+</span><b>NOVO</b></div>
      <div class="module-hero-code">DPE // CRIAÇÃO DE REQUERIMENTO</div>
    </section>
    <div class="req-type-grid req-type-grid-v2">
      ${state.requirementTypes.map((t,index) => `<button class="req-type-card req-type-card-v2" data-reqtype="${t.id}">
        <span class="req-type-index">${String(index+1).padStart(2,'0')}</span><div class="ico">${t.ico}</div><small>REQUERIMENTO DPE</small><b>${escapeHtml(t.name)}</b><p>${escapeHtml(t.desc)}</p><span class="req-type-link">Selecionar →</span>
      </button>`).join('')}
    </div>
  </div>`;
}

function pageRequirementForm(typeId) {
  const t = state.requirementTypes.find(x => x.id === typeId) || state.requirementTypes[0];
  const isMulti = t.id === 'instrucao';
  return `<div class="dpe-module-page requirement-create-page">
    <section class="module-hero module-hero-legacy-req module-hero-compact">
      <div class="module-hero-copy"><span class="module-kicker">REQUERIMENTOS / FORMULÁRIO</span><h1>${escapeHtml(t.name)}</h1><p>${escapeHtml(t.desc)}</p></div>
      <div class="module-hero-emblem legacy-req-symbol" aria-hidden="true"><span>✎</span><b>FORM</b></div>
    </section>
    <section class="request-form-card legacy-req-form-card">
      <header><span>FORMULÁRIO OFICIAL</span><h2>Preenchimento do requerimento</h2></header>
      <form id="reqForm" class="request-form">
        <div class="legacy-req-notice">Ao preencher e enviar este requerimento, você atesta que as informações seguem as normas vigentes da corporação.</div>
        <div class="field"><label>Seu Nickname (${t.id==='instrucao'?'Instrutor':'Autor'})</label><input class="input" name="author" value="${escapeHtml(state.user.nick)}" readonly></div>
        ${isMulti ? `
        <div class="field"><label>Recruta(s) Aprovado(s)</label><div class="tag-input" id="tagInput"><input id="tagField" placeholder="Digite o nick e pressione espaço, Enter, ; ou /"></div><div class="hint-row">Pressione <kbd>Enter</kbd> <kbd>;</kbd> ou <kbd>/</kbd> para adicionar recrutas.</div></div>` : `
        <div class="field"><label>Militar alvo</label><input class="input" name="target" placeholder="Nickname do militar" required></div>
        <div class="field"><label>Motivo / observações</label><textarea class="input" name="reason" rows="5" placeholder="Descreva o motivo deste requerimento" required></textarea></div>`}
        <button class="btn request-primary-action">ENVIAR REQUERIMENTO →</button>
      </form>
    </section>
  </div>`;
}

function bindRequirementForm(typeId) {
  const t = state.requirementTypes.find(x => x.id === typeId) || state.requirementTypes[0];
  const tags = [];
  const field = $('#tagField');
  if (field) {
    const renderTags = () => {
      $$('.tag-chip', $('#tagInput')).forEach(el => el.remove());
      tags.forEach((tg, i) => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = `${tg} <button type="button" data-i="${i}">✕</button>`;
        field.before(chip);
      });
      $$('.tag-chip button', $('#tagInput')).forEach(b => b.onclick = () => { tags.splice(+b.dataset.i, 1); renderTags(); });
    };
    field.addEventListener('keydown', e => {
      if (['Enter',';','/'].includes(e.key) || e.key === ' ') {
        if (field.value.trim()) { tags.push(field.value.trim()); field.value = ''; renderTags(); }
        e.preventDefault();
      }
    });
  }

  const form = $('#reqForm');
  if (!form) return;
  form.onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const target = t.id === 'instrucao' ? (tags.join(', ') || '—') : fd.get('target');
    const reason = t.id === 'instrucao'
      ? `Nick e TAG do Instrutor: <b>${fd.get('author')}</b><br>Recruta(s) aprovado(s): <b>${target}</b>`
      : escapeHtml(fd.get('reason'));
    const btn = form.querySelector('button');
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
      await apiFetch('/requirements', { method: 'POST', body: JSON.stringify({ typeId: t.id, targetText: target, reasonHtml: reason }) });
      await reload('requirements');
      toast('Requerimento publicado');
      go('requirements');
    } catch (err) {
      toast(err.message);
      btn.disabled = false; btn.textContent = 'ENVIAR REQUERIMENTO →';
    }
  };
}

async function decideRequirement(id, approve) {
  try {
    await apiFetch(`/requirements/${id}/decide`, { method: 'POST', body: JSON.stringify({ approve }) });
    await reload('requirements');
    toast(`Requerimento ${approve ? 'aprovado' : 'recusado'}`);
    render();
  } catch (err) {
    toast(err.message);
  }
}
