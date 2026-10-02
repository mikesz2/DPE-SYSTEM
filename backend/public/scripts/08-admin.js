/* ==========================================================================
   SYSTEM DPE — Tarefas, Turnos, Ferramentas e Documentos
   ========================================================================== */
function pageTasks() {
  const completed = state.tasks.filter(task => Number(task.done) >= Number(task.total)).length;
  const open = state.tasks.length - completed;
  return `<div class="dpe-module-page tasks-module-page">
    <section class="module-hero module-hero-tasks module-hero-compact">
      <div class="module-hero-copy">
        <span class="module-kicker">OPERAÇÕES / TAREFAS</span>
        <h1>Central de <strong>metas</strong></h1>
        <p>Acompanhe atividades internas, progresso de grupos e metas operacionais da corporação.</p>
        <div class="module-hero-stats"><span><b>${state.tasks.length}</b><small>tarefas</small></span><span><b>${open}</b><small>em andamento</small></span><span><b>${completed}</b><small>concluídas</small></span></div>
        ${can('MODERADOR') ? '<button class="btn module-hero-action" id="newTaskBtn">+ Nova tarefa</button>' : ''}
      </div>
      <div class="module-hero-emblem tasks-hero-emblem" aria-hidden="true"><span>✓</span><b>METAS</b><small>DPE / OPERAÇÕES</small></div>
      <div class="module-hero-code">DPE // CONTROLE DE ATIVIDADES</div>
    </section>

    <div class="module-section-head"><div><span>ACOMPANHAMENTO</span><h2>Atividades da corporação</h2></div><small>${open} em andamento</small></div>

    <div class="task-grid-v2">
      ${state.tasks.length ? state.tasks.map((task,index) => {
        const total = Math.max(1, Number(task.total) || 1);
        const done = Math.min(total, Math.max(0, Number(task.done) || 0));
        const percent = Math.round((done / total) * 100);
        const finished = done >= total;
        return `<article class="task-card-v2 ${finished ? 'is-complete' : ''}">
          <span class="task-index">${String(index + 1).padStart(2,'0')}</span>
          <header><span>${escapeHtml(task.group)}</span><b>${finished ? 'CONCLUÍDA' : 'EM ANDAMENTO'}</b></header>
          <h3>${escapeHtml(task.desc)}</h3>
          <div class="task-progress-copy"><span>Progresso</span><strong>${done}/${total}</strong></div>
          <div class="task-progress-track"><span style="width:${percent}%"></span></div>
          <footer><span>${percent}% concluído</span>${can('MODERADOR') && !finished ? `<button class="btn soft small" data-taskdone="${task.id}">Marcar +1</button>` : '<b>✓ Finalizada</b>'}</footer>
        </article>`;
      }).join('') : '<div class="dpe-empty"><span>✓</span><strong>Nenhuma tarefa cadastrada</strong><p>As próximas metas internas aparecerão aqui.</p></div>'}
    </div>
  </div>`;
}

function newTaskModal() {
  return `
  <div class="modal-head"><b>Nova tarefa</b><button class="icon-btn" data-close>✕</button></div>
  <div class="modal-body">
    <form id="taskForm">
      <div class="field"><label>Grupo responsável</label><input class="input" name="groupLabel" placeholder="Ex.: Instrutores" required></div>
      <div class="field" style="margin-top:10px"><label>Descrição</label><input class="input" name="description" required></div>
      <div class="field" style="margin-top:10px"><label>Meta (quantidade)</label><input class="input" name="total" type="number" min="1" value="1"></div>
      <button class="btn full" style="margin-top:14px">Criar tarefa</button>
    </form>
  </div>`;
}

function pageShifts() {
  const supremeShiftControl = state.user?.role === 'SUPREMO';
  return `<div class="dpe-module-page shifts-module-page">
    <section class="module-hero module-hero-shifts module-hero-compact">
      <div class="module-hero-copy">
        <span class="module-kicker">OPERAÇÕES / TURNOS</span>
        <h1>Central de <strong>serviço</strong></h1>
        <p>Acompanhe em tempo real quem está em Base, O.C., O.B. ou Ausência e controle seu turno manualmente.</p>
      </div>
      <div class="module-hero-emblem shift-hero-symbol" aria-hidden="true"><span>◷</span><b>AO VIVO</b><small>DPE / OPERAÇÕES</small></div>
      <div class="module-hero-code">DPE // MONITOR DE TURNO</div>
    </section>

    <section class="shift-command-panel">
      <div class="shift-command-status">
        <span class="shift-live-dot"></span>
        <div><small>EFETIVO EM SERVIÇO</small><strong id="shiftTotal" role="status">Carregando…</strong></div>
      </div>
      <div class="shift-command-controls">
        <label><span>POSTO INICIAL</span><select class="input" id="shiftStation" aria-label="Posto do turno">
          <option>Base</option>
          <option>Oficial de Comando</option>
          <option>Oficial de Base</option>
        </select></label>
        <button class="btn soft small" id="shiftRetry" type="button">Atualizar</button>
        <button class="btn small" id="shiftStartBtn" type="button" disabled>Ligar turno</button>
        <button class="btn danger small" id="shiftStopBtn" type="button" disabled>Desligar turno</button>
      </div>
    </section>

    ${supremeShiftControl ? `<div class="shift-supreme-notice">
      <span>CONTROLE SUPREMO</span>
      <p>Se um militar ficar com turno ativo por falha do bot, queda ou saída do quarto, use <b>Encerrar turno</b> na linha dele. A ação é auditada e contabiliza o tempo acumulado até o encerramento.</p>
    </div>` : ''}

    <section class="card shift-roster shift-roster-v2">
      <header>
        <div><span class="shift-table-kicker">MONITORAMENTO EM TEMPO REAL</span><h2>Em serviço agora</h2><p>Tempo acumulado em Base e tempo da função atual, com atualização automática.</p></div>
        <span class="shift-auto-refresh" id="shiftConnectionStatus" role="status"><i></i> CONECTANDO • AUTO 2s</span>
      </header>
      <div class="shift-table-scroll">
        <table>
          <thead><tr><th>Policial</th><th>Posto</th><th>Início</th><th>Tempo em Base</th><th>Tempo no setor</th><th>Situação</th>${supremeShiftControl ? '<th>Ações</th>' : ''}</tr></thead>
          <tbody id="shiftRows"><tr><td colspan="${supremeShiftControl ? 7 : 6}" class="shift-empty">Carregando turnos…</td></tr></tbody>
        </table>
      </div>
    </section>
  </div>`;
}

function bindShiftsPage() {
  let disposed = false;
  let busy = false;
  let fetching = false;
  let loaded = false;
  let offset = 0;
  let active = null;
  let revision = 0;
  let consecutiveFailures = 0;
  let lastSuccessAt = 0;
  let hasSnapshot = false;
  const supremeShiftControl = state.user?.role === 'SUPREMO';
  const columnCount = supremeShiftControl ? 7 : 6;

  const el = id => $('#' + id);
  const alive = () => !disposed && state.user && state.route === 'shifts' && !!el('shiftRows');

  const setControls = () => {
    const startBtn = el('shiftStartBtn');
    const stopBtn = el('shiftStopBtn');
    const station = el('shiftStation');
    if (startBtn) startBtn.disabled = !loaded || busy || !!active;
    if (stopBtn) stopBtn.disabled = !loaded || busy || !active;
    if (station) station.disabled = busy || !!active;
  };

  const tick = () => {
    if (!alive()) return;
    const now = Date.now() + offset;

    ($$('.shift-base-duration') || []).forEach(node => {
      if (!node || !node.dataset) return;
      let seconds = Number(node.dataset.baseSeconds || 0);
      const station = node.dataset.station || 'Base';
      const stationStartedAt = Number(node.dataset.stationStart || 0);
      if (station === 'Base' && stationStartedAt > 0) {
        seconds += Math.max(0, now - stationStartedAt) / 1000;
      }
      node.textContent = fmtClock(Math.max(0, seconds * 1000));
    });

    ($$('.shift-sector-duration') || []).forEach(node => {
      if (!node || !node.dataset) return;
      const station = node.dataset.station || 'Base';
      if (station === 'Base') {
        node.textContent = '—';
        return;
      }

      const startedAt = station === 'Ausência'
        ? Number(node.dataset.absenceStart || 0)
        : Number(node.dataset.stationStart || 0);

      const label = station === 'Oficial de Comando'
        ? 'O.C.'
        : station === 'Oficial de Base'
          ? 'O.B.'
          : 'Ausência';

      const elapsed = startedAt > 0 ? Math.max(0, now - startedAt) : 0;
      node.textContent = label + ' · ' + fmtClock(elapsed);
    });
  };

  const refresh = async () => {
    const currentRevision = ++revision;
    const data = await apiFetch('/shifts/active?_=' + Date.now(), {
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });

    if (!data || !Array.isArray(data.shifts)) {
      throw new Error('A API de turnos retornou dados inválidos.');
    }
    if (!alive() || busy || currentRevision !== revision) return;

    const serverTime = new Date(data.serverTime || Date.now()).getTime();
    offset = Number.isFinite(serverTime) ? serverTime - Date.now() : 0;

    active = data.shifts.find(s => Number(s.memberId) === Number(state.user.id)) || null;
    state.shiftStart = active ? new Date(active.startedAt).getTime() : null;
    loaded = true;
    hasSnapshot = true;
    consecutiveFailures = 0;
    lastSuccessAt = Date.now();
    const connection = el('shiftConnectionStatus');
    if (connection) connection.innerHTML = '<i></i> ONLINE • AUTO 2s';

    const station = el('shiftStation');
    if (active && station && active.station !== 'Ausência') {
      station.value = active.station || 'Base';
    } else if (active && station && active.previousStation) {
      station.value = active.previousStation;
    }

    const total = el('shiftTotal');
    if (total) total.textContent = data.shifts.length + ' em serviço';

    const rows = el('shiftRows');
    if (rows) {
      rows.innerHTML = data.shifts.length
        ? data.shifts.map(s => {
            const memberName = s.member && s.member.habboName ? s.member.habboName : 'Desconhecido';
            const started = new Date(s.startedAt);
            const startedMs = started.getTime();
            const stationStartedMs = s.stationStartedAt ? new Date(s.stationStartedAt).getTime() : 0;
            const absenceStartMs = s.absenceStartedAt ? new Date(s.absenceStartedAt).getTime() : 0;
            const currentStation = s.station || 'Base';
            const startText = Number.isFinite(startedMs)
              ? started.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo' })
              : '—';
            const absent = currentStation === 'Ausência' || absenceStartMs > 0;
            return `<tr>
              <td><span class="shift-person"><span class="shift-initial">${escapeHtml(memberName.slice(0,2).toUpperCase())}</span><b>${escapeHtml(memberName)}</b>${Number(s.memberId) === Number(state.user.id) ? '<small>Você</small>' : ''}</span></td>
              <td><span class="shift-post">${escapeHtml(currentStation)}</span></td>
              <td>${escapeHtml(startText)}</td>
              <td class="shift-base-duration" data-base-seconds="${Number(s.baseSeconds || 0)}" data-station="${escapeHtml(currentStation)}" data-station-start="${Number.isFinite(stationStartedMs) ? stationStartedMs : 0}">—</td>
              <td class="shift-sector-duration" data-station="${escapeHtml(currentStation)}" data-station-start="${Number.isFinite(stationStartedMs) ? stationStartedMs : 0}" data-absence-start="${Number.isFinite(absenceStartMs) ? absenceStartMs : 0}">—</td>
              <td><span class="shift-live">${absent ? '● Ausente' : '● Em andamento'}</span></td>
              ${supremeShiftControl ? `<td><button class="btn danger small shift-force-stop" type="button" data-shift-id="${Number(s.id)}" data-shift-nick="${escapeHtml(memberName)}">Encerrar turno</button></td>` : ''}
            </tr>`;
          }).join('')
        : `<tr><td colspan="${columnCount}" class="shift-empty">Nenhum turno em andamento. Use “Ligar turno” para iniciar manualmente.</td></tr>`;
    }

    setControls();
    tick();
  };

  const reportError = err => {
    if (!alive()) return;
    const message = err && err.message ? err.message : 'Não foi possível carregar os turnos.';
    const total = el('shiftTotal');
    const rows = el('shiftRows');
    const connection = el('shiftConnectionStatus');
    consecutiveFailures += 1;
    loaded = false;
    setControls();

    const ageSeconds = lastSuccessAt ? Math.max(0, Math.floor((Date.now() - lastSuccessAt) / 1000)) : null;
    if (connection) {
      connection.innerHTML = '<i></i> ' + (hasSnapshot ? 'RECONECTANDO' : 'SEM CONEXÃO') + ' • tentativa ' + consecutiveFailures;
    }

    if (hasSnapshot) {
      if (total) total.textContent = 'Conexão instável • último estado há ' + ageSeconds + 's';
      return;
    }

    if (total) total.textContent = message;
    if (rows) {
      rows.innerHTML = '<tr><td colspan="' + columnCount + '" class="shift-empty">' + escapeHtml(message) + ' Clique em Atualizar para tentar novamente.</td></tr>';
    }
  };

  const reload = async () => {
    if (!alive() || fetching || busy) return;
    fetching = true;
    try {
      await refresh();
    } catch (err) {
      reportError(err);
    } finally {
      fetching = false;
    }
  };

  const changeManualShift = async action => {
    if (!alive() || busy) return;
    if (action === 'start' && active) {
      toast('Seu turno já está ligado.');
      return;
    }
    if (action === 'stop' && !active) {
      toast('Você não possui turno ativo.');
      return;
    }

    busy = true;
    revision++;
    setControls();

    try {
      const station = el('shiftStation');
      await apiFetch(action === 'start' ? '/shifts/start' : '/shifts/stop', {
        method: 'POST',
        body: JSON.stringify(action === 'start' ? { station: station ? station.value : 'Base' } : {}),
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      });
      if (alive()) toast(action === 'start' ? 'Turno ligado manualmente.' : 'Turno desligado manualmente.');
    } catch (err) {
      if (alive()) toast(err && err.message ? err.message : 'Não foi possível alterar o turno.');
    } finally {
      busy = false;
      if (alive()) {
        try {
          await refresh();
        } catch (err) {
          reportError(err);
        }
      }
    }
  };

  const forceStopShift = async (shiftId, nickname) => {
    if (!supremeShiftControl || !alive() || busy) return;
    const id = Number(shiftId);
    if (!Number.isInteger(id) || id <= 0) return;

    const confirmed = window.confirm(
      'Encerrar manualmente o turno de ' + nickname + '?\n\n' +
      'Use esta ação somente quando o turno ficou ativo indevidamente. O encerramento será registrado na auditoria.'
    );
    if (!confirmed) return;

    busy = true;
    revision++;
    setControls();
    document.querySelectorAll('.shift-force-stop').forEach(button => { button.disabled = true; });

    try {
      await apiFetch('/shifts/' + id + '/force-stop', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Correção manual de turno ativo indevidamente.' }),
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      });
      if (alive()) toast('Turno de ' + nickname + ' encerrado pelo Supremo.');
    } catch (err) {
      if (alive()) toast(err && err.message ? err.message : 'Não foi possível encerrar o turno.');
    } finally {
      busy = false;
      if (alive()) {
        try { await refresh(); } catch (err) { reportError(err); }
      }
    }
  };

  const retry = el('shiftRetry');
  const startBtn = el('shiftStartBtn');
  const stopBtn = el('shiftStopBtn');
  const rows = el('shiftRows');

  if (rows && supremeShiftControl) {
    rows.onclick = event => {
      const button = event.target.closest('.shift-force-stop');
      if (!button || !rows.contains(button)) return;
      forceStopShift(button.dataset.shiftId, button.dataset.shiftNick || 'militar');
    };
  }

  if (retry) retry.onclick = reload;
  if (startBtn) startBtn.onclick = () => changeManualShift('start');
  if (stopBtn) stopBtn.onclick = () => changeManualShift('stop');

  setControls();
  reload();

  // Atualização automática: o System consulta o backend continuamente.
  // Assim mudanças feitas pelo DPE Command (ligar turno, O.C., O.B., ausência)
  // aparecem sem precisar clicar em "Atualizar".
  const poll = setInterval(() => {
    if (document.visibilityState === 'visible') reload();
  }, 2000);
  const clock = setInterval(tick, 1000);

  const refreshWhenVisible = () => {
    if (document.visibilityState === 'visible' && alive()) reload();
  };
  const refreshOnFocus = () => {
    if (alive()) reload();
  };

  document.addEventListener('visibilitychange', refreshWhenVisible);
  window.addEventListener('focus', refreshOnFocus);

  window._disposeShifts = () => {
    disposed = true;
    revision++;
    clearInterval(poll);
    clearInterval(clock);
    document.removeEventListener('visibilitychange', refreshWhenVisible);
    window.removeEventListener('focus', refreshOnFocus);
  };
}

function pageTools() {
  const tools = [
    ['🧮','Calculadora de Elite Coins','Simule conversões de Elite Coins por atividade.'],
    ['🖨️','Gerador de Carteirinha','Gere a carteirinha de identificação militar em PDF.'],
    ['📊','Relatório de Efetivo','Exporte um relatório completo do efetivo atual.'],
    ['🔔','Central de Avisos','Envie avisos em massa para divisões específicas.'],
  ];
  return `<div class="dpe-module-page tools-module-page">
    <section class="module-hero module-hero-tools module-hero-compact">
      <div class="module-hero-copy"><span class="module-kicker">RECURSOS / FERRAMENTAS</span><h1>Central de <strong>utilitários</strong></h1><p>Ferramentas internas para apoiar a gestão, documentação e operação da Polícia DPE.</p></div>
      <div class="module-hero-emblem tools-hero-emblem" aria-hidden="true"><span>⚙</span><b>DPE LAB</b></div>
      <div class="module-hero-code">DPE // RECURSOS INTERNOS</div>
    </section>
    <div class="tools-notice-v2"><span>EM DESENVOLVIMENTO</span><p>Essas ferramentas ainda não foram construídas. A Central de Avisos já pode ser feita pelo <b>DPE Mail</b>.</p></div>
    <div class="tool-grid tool-grid-v2">
      ${tools.map(([ico,name,desc],index) => `<article class="tool-card tool-card-v2"><span class="tool-number">${String(index+1).padStart(2,'0')}</span><div class="ico">${ico}</div><small>UTILITÁRIO DPE</small><h4>${escapeHtml(name)}</h4><p>${escapeHtml(desc)}</p><button class="btn soft small" disabled>EM BREVE</button></article>`).join('')}
    </div>
  </div>`;
}


function pageDocuments() {
  const selected = state.documents.find(item => item.id === state.documentId);
  if (selected) return documentReaderHtml(selected);
  return `<div class="dpe-module-page documents-module-page">
    <section class="module-hero module-hero-documents">
      <div class="module-hero-copy">
        <span class="module-kicker">BIBLIOTECA / DOCUMENTOS</span>
        <h1>Base de <strong>conhecimento</strong></h1>
        <p>Estatutos, regulamentos, manuais e normas oficiais reunidos em uma biblioteca institucional da Polícia DPE.</p>
        <div class="module-hero-stats">
          <span><b>${state.documents.length}</b><small>${state.documents.length === 1 ? 'documento' : 'documentos'}</small></span>
          <span><b>DPE</b><small>fonte oficial</small></span>
        </div>
      </div>
      <div class="module-hero-emblem documents-hero-emblem" aria-hidden="true"><span>▤</span><img src="/assets/login/brasao-dpe-v2.png" alt=""><b>ARQUIVO</b></div>
      <div class="module-hero-code">DPE // BIBLIOTECA INSTITUCIONAL</div>
    </section>

    <div class="module-section-head documents-section-head">
      <div><span>ACERVO OFICIAL</span><h2>Documentos publicados</h2></div>
      <small>${state.documents.length} ${state.documents.length === 1 ? 'publicação disponível' : 'publicações disponíveis'}</small>
    </div>

    <div class="documents-grid documents-grid-v2">${state.documents.length ? state.documents.map((document,index) => `<button type="button" class="document-card document-card-v2" data-document="${document.id}">
      <span class="document-index">${String(index + 1).padStart(2,'0')}</span>
      <span class="document-card-icon">${escapeHtml(document.icon || '📜')}</span>
      <div><small>${escapeHtml(document.category)}</small><h2>${escapeHtml(document.title)}</h2><p>${escapeHtml(document.summary || 'Documento institucional da Polícia DPE.')}</p><footer><span>Por ${escapeHtml(document.author)}</span><b>Ler documento →</b></footer></div>
    </button>`).join('') : '<div class="dpe-empty"><span>📚</span><strong>Nenhum documento publicado</strong><p>Os documentos criados no Dashboard aparecerão aqui.</p></div>'}</div>
  </div>`;
}

function documentContentHtml(content) {
  const inline = value => escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<u>$1</u>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  let listType = null;
  const parts = [];
  const closeList = () => { if (listType) { parts.push(`</${listType}>`); listType = null; } };
  String(content || '').split(/\r?\n/).forEach(line => {
    const text = line.trim();
    if (!text) { closeList(); parts.push('<div class="document-space"></div>'); return; }
    const image = text.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/i);
    if (image) { closeList(); parts.push(`<figure><img src="${escapeHtml(image[2])}" alt="${escapeHtml(image[1])}" loading="lazy"><figcaption>${escapeHtml(image[1])}</figcaption></figure>`); return; }
    if (text === '---') { closeList(); parts.push('<hr>'); return; }
    if (/^#{1,2}\s+/.test(text)) { closeList(); parts.push(`<h2>${inline(text.replace(/^#{1,2}\s+/, ''))}</h2>`); return; }
    if (/^###\s+/.test(text)) { closeList(); parts.push(`<h3>${inline(text.replace(/^###\s+/, ''))}</h3>`); return; }
    if (/^CAP[IÍ]TULO\b/i.test(text)) { closeList(); parts.push(`<h2>${inline(text)}</h2>`); return; }
    if (/^(SE[CÇ][AÃ]O|T[IÍ]TULO)\b/i.test(text)) { closeList(); parts.push(`<h3>${inline(text)}</h3>`); return; }
    const article = text.match(/^(Art\.\s*\d+[º°]?\s*[-–—]?)(.*)$/i);
    if (article) { closeList(); parts.push(`<p class="document-article"><strong>${escapeHtml(article[1])}</strong>${inline(article[2])}</p>`); return; }
    const unordered = text.match(/^[-•]\s+(.+)/), ordered = text.match(/^\d+[.)]\s+(.+)/);
    if (unordered || ordered) {
      const type = unordered ? 'ul' : 'ol';
      if (listType !== type) { closeList(); listType = type; parts.push(`<${type}>`); }
      parts.push(`<li>${inline((unordered || ordered)[1])}</li>`); return;
    }
    if (/^>\s?/.test(text)) { closeList(); parts.push(`<blockquote>${inline(text.replace(/^>\s?/, ''))}</blockquote>`); return; }
    closeList(); parts.push(`<p>${inline(text)}</p>`);
  });
  closeList();
  return parts.join('');
}

function documentReaderHtml(document) {
  return `<div class="document-reader-shell document-reader-v2">
    <div class="document-reader-actions"><button class="btn ghost small" data-route="documents">← Voltar à biblioteca</button><span>Atualizado em ${escapeHtml(fmtDateBR(document.updatedAt || document.createdAt))}</span></div>
    <article class="document-reader">
      <header>
        <div class="document-reader-brand"><img src="/assets/login/brasao-dpe-v2.png" alt="" decoding="async"><span>DPE</span></div>
        <div class="document-reader-title"><span>${escapeHtml(document.icon || '📜')}</span><div><small>${escapeHtml(document.category)}</small><h1>${escapeHtml(document.title)}</h1></div></div>
        <div class="document-reader-code">DOCUMENTO OFICIAL // SYSTEM DPE</div>
      </header>
      ${document.summary ? `<div class="document-summary">${escapeHtml(document.summary)}</div>` : ''}
      <div class="document-body">${documentContentHtml(document.content)}</div>
      <footer><span>Documento publicado por <b>${escapeHtml(document.author)}</b> em ${escapeHtml(document.date)}</span><strong>POLÍCIA DPE</strong></footer>
    </article>
  </div>`;
}

function bindDocumentsPage() {
  $$('[data-document]').forEach(button => button.onclick = () => {
    state.documentId = Number(button.dataset.document);
    renderNav();
    render();
  });
}
