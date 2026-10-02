function commandCenterStationLabel(station) {
  if (station === 'Oficial de Comando') return 'O.C.';
  if (station === 'Oficial de Base') return 'O.B.';
  if (station === 'Ausência') return 'AUSÊNCIA';
  return 'BASE';
}

function commandCenterClock(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo' });
}

function commandCenterDuration(startedAt) {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return '—';
  return fmtClock(Math.max(0, Date.now() - started));
}

function commandCenterAlertHtml(alert) {
  return `<article class="command-alert command-alert-${escapeHtml(alert.level || 'info')}" data-alert-code="${escapeHtml(alert.code || '')}">
    <span class="command-alert-dot"></span>
    <div>
      <small>${escapeHtml(alert.category || alert.code || 'ALERTA')}</small>
      <strong>${escapeHtml(alert.title || 'Alerta')}</strong>
      <p>${escapeHtml(alert.text || '')}</p>
      <div class="command-alert-actions">
        ${alert.action ? `<button type="button" class="btn ghost small" data-alert-route="${escapeHtml(alert.action)}">Abrir</button>` : ''}
        <button type="button" class="btn ghost small" data-alert-mute="${escapeHtml(alert.code || '')}">Silenciar 1h</button>
      </div>
    </div>
  </article>`;
}

function pageCommandCenter() {
  return `<div class="dpe-module-page command-center-page">
    <section class="module-hero module-hero-command-center">
      <div class="module-hero-copy">
        <span class="module-kicker">OPERAÇÕES / TEMPO REAL</span>
        <h1>Central de <strong>Comando</strong></h1>
        <p>Visão operacional da Polícia DPE: efetivo em serviço, postos, DPE Command, aulas, pendências e alertas críticos.</p>
        <div class="command-live-line"><i></i><span id="commandCenterHeroStatus">Conectando à operação…</span></div>
      </div>
      <div class="module-hero-emblem command-center-emblem" aria-hidden="true"><span>⌁</span><b>COMMAND</b><small>LIVE OPERATIONS</small></div>
      <div class="module-hero-code">DPE // CENTRAL OPERACIONAL 3.1</div>
    </section>

    <section class="command-kpi-grid" aria-label="Indicadores operacionais">
      <article><small>EM SERVIÇO</small><strong id="ccActiveShifts">—</strong><span>turnos ativos</span></article>
      <article><small>ONLINE</small><strong id="ccOnlineMembers">—</strong><span>no System</span></article>
      <article><small>AULAS HOJE</small><strong id="ccLessonsToday">—</strong><span>registradas</span></article>
      <article><small>PENDÊNCIAS</small><strong id="ccPending">—</strong><span>requerimentos + cadastros</span></article>
    </section>

    <div class="command-center-grid">
      <div class="command-center-main">
        <section class="card command-stations-card">
          <header><div><span>MAPA OPERACIONAL</span><h2>Efetivo por posto</h2></div><span id="ccLastUpdate" class="command-updated">Aguardando…</span></header>
          <div class="command-station-grid">
            <article><span>BASE</span><strong id="ccBase">—</strong><small>militares</small></article>
            <article><span>O.C.</span><strong id="ccOc">—</strong><small>comando</small></article>
            <article><span>O.B.</span><strong id="ccOb">—</strong><small>base</small></article>
            <article><span>AUSÊNCIA</span><strong id="ccAbsence">—</strong><small>marcados</small></article>
          </div>
          <div class="shift-table-scroll command-shift-table">
            <table>
              <thead><tr><th>Militar</th><th>Patente</th><th>Divisão</th><th>Posto</th><th>Início</th><th>Tempo</th></tr></thead>
              <tbody id="ccShiftRows"><tr><td colspan="6" class="shift-empty">Carregando operação…</td></tr></tbody>
            </table>
          </div>
        </section>

        <section class="card command-lessons-card">
          <header><div><span>FORMAÇÃO</span><h2>Últimas aulas</h2></div><button class="btn ghost small" data-route="requests-lesson">Abrir aulas</button></header>
          <div id="ccLessons" class="command-lessons-list"><div class="dpe-empty compact"><p>Carregando aulas…</p></div></div>
        </section>
      </div>

      <aside class="command-center-rail">
        <section class="card command-bot-card">
          <header><div><span>DPE COMMAND</span><h2>Status do bot</h2></div><span id="ccBotBadge" class="health-status down"><i></i>AGUARDANDO</span></header>
          <dl id="ccBotDetails">
            <div><dt>Processo</dt><dd>—</dd></div>
            <div><dt>Habbo</dt><dd>—</dd></div>
            <div><dt>Quarto</dt><dd>—</dd></div>
            <div><dt>O.C.</dt><dd>—</dd></div>
            <div><dt>O.B.</dt><dd>—</dd></div>
          </dl>
        </section>

        <section class="card command-alerts-card">
          <header><div><span>ATENÇÃO OPERACIONAL</span><h2>Alertas inteligentes</h2></div><strong id="ccAlertCount">0</strong></header>
          <div id="ccAlerts"><div class="dpe-empty compact"><p>Consultando alertas…</p></div></div>
          <footer class="command-alert-footer"><span id="ccMutedCount">0 silenciados</span><button type="button" class="text-link" id="ccRestoreMuted">Restaurar alertas</button></footer>
        </section>

        <button class="btn full" id="commandCenterRefresh" type="button">Atualizar agora</button>
      </aside>
    </div>
  </div>`;
}

function bindCommandCenterPage() {
  clearInterval(window._commandCenterPoll);
  if (state.route !== 'command-center' || !$('#ccShiftRows')) return;

  let busy = false;
  let disposed = false;

  const renderData = data => {
    if (disposed || state.route !== 'command-center') return;
    const summary = data.summary || {};
    const stations = summary.stations || {};
    const command = data.command || {};
    const shifts = Array.isArray(data.shifts) ? data.shifts : [];
    const lessons = Array.isArray(data.lessons) ? data.lessons : [];
    const alerts = Array.isArray(data.alerts) ? data.alerts : [];
    const mutedAlerts = Array.isArray(data.mutedAlerts) ? data.mutedAlerts : [];

    $('#ccActiveShifts').textContent = summary.activeShifts ?? 0;
    $('#ccOnlineMembers').textContent = summary.onlineMembers ?? 0;
    $('#ccLessonsToday').textContent = summary.lessonsToday ?? 0;
    $('#ccPending').textContent = Number(summary.pendingRequirements || 0) + Number(summary.pendingRegistrations || 0);
    $('#ccBase').textContent = stations.base ?? 0;
    $('#ccOc').textContent = stations.oc ?? 0;
    $('#ccOb').textContent = stations.ob ?? 0;
    $('#ccAbsence').textContent = stations.absence ?? 0;

    $('#ccShiftRows').innerHTML = shifts.length ? shifts.map(shift => `<tr>
      <td><b>${escapeHtml(shift.nick)}</b></td>
      <td>${escapeHtml(shift.rank)}</td>
      <td>${escapeHtml(shift.division)}</td>
      <td><span class="shift-post">${escapeHtml(commandCenterStationLabel(shift.station))}</span></td>
      <td>${escapeHtml(commandCenterClock(shift.startedAt))}</td>
      <td data-cc-shift-start="${escapeHtml(shift.startedAt)}">${escapeHtml(commandCenterDuration(shift.startedAt))}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="shift-empty">Nenhum militar em serviço agora.</td></tr>';

    $('#ccLessons').innerHTML = lessons.length ? lessons.map(lesson => `<article class="command-lesson-row">
      <span>🎓</span><div><strong>${escapeHtml(lesson.description || 'Aula registrada')}</strong><p>Guia: ${escapeHtml(lesson.author)} • ${escapeHtml(lesson.date || '')}</p></div><small>${escapeHtml(timeAgo(lesson.createdAt))}</small>
    </article>`).join('') : '<div class="dpe-empty compact"><p>Nenhuma aula registrada ainda.</p></div>';

    const botOnline = Boolean(command.online);
    const botBadge = $('#ccBotBadge');
    botBadge.className = 'health-status ' + (botOnline ? 'ok' : 'down');
    botBadge.innerHTML = '<i></i>' + (botOnline ? 'ONLINE' : command.configured ? 'OFFLINE' : 'NÃO CONFIGURADO');
    $('#ccBotDetails').innerHTML = `
      <div><dt>Processo</dt><dd>${botOnline ? 'ONLINE' : 'OFFLINE'}</dd></div>
      <div><dt>Habbo</dt><dd>${command.roomConnected ? 'CONECTADO' : 'FORA DO QUARTO'}</dd></div>
      <div><dt>Quarto</dt><dd>${escapeHtml(command.roomId ?? '—')}</dd></div>
      <div><dt>O.C.</dt><dd>${escapeHtml(command.oc || 'Nenhum')}</dd></div>
      <div><dt>O.B.</dt><dd>${escapeHtml(command.ob || 'Nenhum')}</dd></div>`;

    $('#ccAlertCount').textContent = alerts.length;
    $('#ccMutedCount').textContent = mutedAlerts.length + (mutedAlerts.length === 1 ? ' silenciado' : ' silenciados');
    $('#ccAlerts').innerHTML = alerts.length
      ? alerts.map(commandCenterAlertHtml).join('')
      : '<div class="command-all-clear"><span>✓</span><strong>Operação normal</strong><p>Nenhum alerta ativo no momento.</p></div>';

    $('[data-alert-route]', $('#ccAlerts')).forEach(button => button.onclick = () => navigateTo(button.dataset.alertRoute));
    $('[data-alert-mute]', $('#ccAlerts')).forEach(button => button.onclick = async () => {
      const code = button.dataset.alertMute;
      if (!code || button.disabled) return;
      button.disabled = true;
      try {
        await apiFetch('/command-center/alerts/' + encodeURIComponent(code) + '/mute', {
          method: 'POST',
          body: JSON.stringify({ minutes: 60 }),
        });
        toast('Alerta silenciado por 1 hora.');
        await load();
      } catch (error) {
        toast(error.message);
        if (button.isConnected) button.disabled = false;
      }
    });

    const restoreMuted = $('#ccRestoreMuted');
    if (restoreMuted) {
      restoreMuted.disabled = mutedAlerts.length === 0;
      restoreMuted.onclick = async () => {
        restoreMuted.disabled = true;
        try {
          for (const item of mutedAlerts) {
            await apiFetch('/command-center/alerts/' + encodeURIComponent(item.code) + '/mute', { method: 'DELETE' });
          }
          toast('Alertas silenciados restaurados.');
          await load();
        } catch (error) {
          toast(error.message);
        } finally {
          if (restoreMuted.isConnected) restoreMuted.disabled = false;
        }
      };
    }

    const stamp = new Date(data.generatedAt || Date.now());
    $('#ccLastUpdate').textContent = 'Atualizado ' + stamp.toLocaleTimeString('pt-BR');
    $('#commandCenterHeroStatus').textContent = botOnline
      ? 'Operação sincronizada • ' + shifts.length + ' em serviço'
      : 'System online • DPE Command requer atenção';
  };

  const load = async () => {
    if (busy || disposed || state.route !== 'command-center') return;
    busy = true;
    const button = $('#commandCenterRefresh');
    if (button) button.disabled = true;
    try {
      const data = await apiFetch('/command-center', { timeoutMs: 10000 });
      renderData(data);
    } catch (error) {
      if (!disposed && state.route === 'command-center') {
        $('#commandCenterHeroStatus').textContent = 'Falha ao sincronizar • tentando novamente';
        toast(error.message);
      }
    } finally {
      busy = false;
      if (button?.isConnected) button.disabled = false;
    }
  };

  const tick = () => {
    if (disposed || state.route !== 'command-center') return;
    $$('[data-cc-shift-start]').forEach(node => {
      node.textContent = commandCenterDuration(node.dataset.ccShiftStart);
    });
  };

  $('#commandCenterRefresh').onclick = load;
  load();
  const poll = setInterval(() => {
    if (document.visibilityState === 'visible') load();
  }, 5000);
  const clock = setInterval(tick, 1000);
  window._commandCenterPoll = poll;
  window._disposeCommandCenter = () => {
    disposed = true;
    clearInterval(poll);
    clearInterval(clock);
    window._commandCenterPoll = null;
  };
}
