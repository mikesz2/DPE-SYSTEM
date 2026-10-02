function healthStatusBadge(ok, onlineLabel = 'ONLINE', offlineLabel = 'OFFLINE') {
  return `<span class="health-status ${ok ? 'ok' : 'down'}"><i></i>${ok ? onlineLabel : offlineLabel}</span>`;
}

function healthUptime(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return [days ? days + 'd' : '', hours ? hours + 'h' : '', minutes + 'min'].filter(Boolean).join(' ');
}

function pageSystemHealth() {
  if (!can('ADMINISTRADOR')) {
    return `<div class="dpe-module-page health-module-page"><section class="module-hero module-hero-health module-hero-compact"><div class="module-hero-copy"><span class="module-kicker">ADMINISTRAÇÃO / SAÚDE</span><h1>Acesso <strong>restrito</strong></h1><p>Esta área é exclusiva para administradores.</p></div></section></div>`;
  }

  return `<div class="dpe-module-page health-module-page">
    <section class="module-hero module-hero-health module-hero-compact">
      <div class="module-hero-copy">
        <span class="module-kicker">ADMINISTRAÇÃO / OBSERVABILIDADE</span>
        <h1>Saúde do <strong>System</strong></h1>
        <p>Acompanhe backend, banco de dados, DPE Command, turnos e recursos do servidor em um único painel.</p>
      </div>
      <div class="module-hero-emblem health-hero-emblem" aria-hidden="true"><span>♥</span><b>HEALTH</b><small>SYSTEM DPE</small></div>
      <div class="module-hero-code">DPE // STATUS OPERACIONAL</div>
    </section>

    <section class="health-toolbar">
      <div><span>MONITORAMENTO</span><strong id="healthLastUpdate">Aguardando leitura...</strong></div>
      <button class="btn ghost small" id="refreshSystemHealth" type="button">Atualizar agora</button>
    </section>

    <div id="systemHealthContent" class="health-loading">
      <span></span><p>Consultando componentes do System...</p>
    </div>
  </div>`;
}

function systemHealthCards(data) {
  const backend = data.backend || {};
  const database = data.database || {};
  const command = data.dpeCommand || {};
  const backup = data.backup || {};
  const counts = data.counts || {};
  const release = data.release || {};
  const lessons = command.lessons || {};
  const lessonReady = Boolean(
    command.online &&
    lessons.guideLocationConfigured &&
    Number(lessons.studentPointsTotal || 0) > 0 &&
    lessons.storageOk !== false
  );
  const commandSeen = command.lastSeenAt ? new Date(command.lastSeenAt).toLocaleString('pt-BR') : 'Nunca recebido';
  const backupSeen = backup.lastCreatedAt ? new Date(backup.lastCreatedAt).toLocaleString('pt-BR') : 'Nenhum snapshot';

  return `
    <div class="health-overview-grid">
      <article class="health-component-card">
        <header><div><span>BACKEND</span><h2>API do System</h2></div>${healthStatusBadge(Boolean(backend.ok))}</header>
        <dl>
          <div><dt>Uptime</dt><dd>${escapeHtml(healthUptime(backend.uptimeSeconds))}</dd></div>
          <div><dt>Node.js</dt><dd>${escapeHtml(backend.nodeVersion || '—')}</dd></div>
          <div><dt>Memória RSS</dt><dd>${Number(backend.memory?.rssMb || 0)} MB</dd></div>
          <div><dt>Heap em uso</dt><dd>${Number(backend.memory?.heapUsedMb || 0)} MB</dd></div>
        </dl>
      </article>

      <article class="health-component-card">
        <header><div><span>BANCO DE DADOS</span><h2>Persistência</h2></div>${healthStatusBadge(Boolean(database.ok))}</header>
        <dl>
          <div><dt>Latência</dt><dd>${database.latencyMs === null || database.latencyMs === undefined ? '—' : Number(database.latencyMs) + ' ms'}</dd></div>
          <div><dt>Militares ativos</dt><dd>${counts.members ?? '—'}</dd></div>
          <div><dt>Turnos ativos</dt><dd>${counts.activeShifts ?? '—'}</dd></div>
          <div><dt>Estado</dt><dd>${database.ok ? 'Consulta concluída' : escapeHtml(database.error || 'Indisponível')}</dd></div>
        </dl>
      </article>

      <article class="health-component-card health-command-card">
        <header><div><span>DPE COMMAND</span><h2>Bot operacional</h2></div>${healthStatusBadge(Boolean(command.online), 'ONLINE', command.configured ? 'OFFLINE' : 'NÃO CONFIGURADO')}</header>
        <dl>
          <div><dt>Versão</dt><dd>${escapeHtml(command.version || '—')}</dd></div>
          <div><dt>Processo</dt><dd>${command.online ? 'ONLINE' : 'OFFLINE'}</dd></div>
          <div><dt>Conexão Habbo</dt><dd>${command.roomConnected ? 'CONECTADO AO QUARTO' : 'FORA DO QUARTO'}</dd></div>
          <div><dt>Quarto atual</dt><dd>${command.roomId ?? '—'}</dd></div>
          <div><dt>Usuários no quarto</dt><dd>${command.roomUsers ?? '—'}</dd></div>
          <div><dt>Último heartbeat</dt><dd>${escapeHtml(commandSeen)}</dd></div>
        </dl>
      </article>

      <article class="health-component-card health-backup-card">
        <header><div><span>BACKUP</span><h2>Snapshots SQLite</h2></div>${healthStatusBadge(Boolean(backup.available && backup.count > 0), 'PROTEGIDO', backup.available ? 'SEM SNAPSHOT' : 'INDISPONÍVEL')}</header>
        <dl>
          <div><dt>Snapshots guardados</dt><dd>${backup.count ?? 0}</dd></div>
          <div><dt>Último backup</dt><dd>${escapeHtml(backupSeen)}</dd></div>
          <div><dt>Tamanho</dt><dd>${backup.lastSizeMb === null || backup.lastSizeMb === undefined ? '—' : backup.lastSizeMb + ' MB'}</dd></div>
          <div><dt>Retenção</dt><dd>${backup.retention ? backup.retention + ' arquivos' : '—'}</dd></div>
        </dl>
      </article>
    </div>

    <div class="health-detail-grid">
      <section class="health-detail-card">
        <header><span>OPERAÇÃO DO BOT</span><h3>Estado atual</h3></header>
        <div class="health-detail-list">
          <div><span>AutoTurno</span><b>${command.autoTurnoEnabled === null ? '—' : command.autoTurnoEnabled ? 'ATIVADO' : 'DESATIVADO'}</b></div>
          <div><span>O.C.</span><b>${escapeHtml(command.oc || 'Nenhum')}</b></div>
          <div><span>O.B.</span><b>${escapeHtml(command.ob || 'Nenhum')}</b></div>
          <div><span>Telegram</span><b>${command.telegramConfigured === null ? '—' : command.telegramConfigured ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}</b></div>
          <div><span>Token da integração</span><b>${command.tokenStrong === null || command.tokenStrong === undefined ? 'NÃO CONFIGURADO' : command.tokenStrong ? 'SEGURO' : 'ROTACIONAR'}</b></div>
          <div><span>Heartbeat</span><b>${command.ageSeconds === null ? '—' : command.ageSeconds + 's atrás'}</b></div>
        </div>
      </section>

      <section class="health-detail-card health-lessons-card">
        <header><span>AULAS AUTOMÁTICAS</span><h3>Formação pelo DPE Command</h3></header>
        <div class="health-detail-list">
          <div><span>Prontidão</span><b>${lessonReady ? 'PRONTO PARA AULA' : 'REVISAR CONFIGURAÇÃO'}</b></div>
          <div><span>Local do Guia</span><b>${lessons.guideLocationConfigured === null || lessons.guideLocationConfigured === undefined ? '—' : lessons.guideLocationConfigured ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}</b></div>
          <div><span>Quarto do Guia</span><b>${lessons.guideRoomId ?? '—'}</b></div>
          <div><span>Locais de aluno</span><b>${lessons.studentPointsTotal ?? '—'}</b></div>
          <div><span>Locais neste quarto</span><b>${lessons.studentPointsCurrentRoom ?? '—'}</b></div>
          <div><span>Guias sincronizados</span><b>${lessons.guideCount ?? '—'}</b></div>
          <div><span>Rascunhos abertos</span><b>${lessons.openDrafts ?? '—'}</b></div>
          <div><span>Armazenamento</span><b>${lessons.storageOk === null || lessons.storageOk === undefined ? '—' : lessons.storageOk ? 'OK' : 'ERRO NO ARQUIVO'}</b></div>
        </div>
      </section>

      <section class="health-detail-card health-pilot-card">
        <header><span>PILOTO / ÚLTIMAS 24H</span><h3>Pulso operacional</h3></header>
        <div class="health-detail-list">
          <div><span>Cadastros pendentes</span><b>${counts.pendingRegistrations ?? '—'}</b></div>
          <div><span>Publicações na Rede DPE</span><b>${counts.socialPosts24h ?? '—'}</b></div>
          <div><span>Notificações não lidas</span><b>${counts.unreadNotifications ?? '—'}</b></div>
          <div><span>Eventos de segurança</span><b>${counts.securityEvents24h ?? '—'}</b></div>
          <div><span>Turnos ativos agora</span><b>${counts.activeShifts ?? '—'}</b></div>
        </div>
      </section>
      <section class="health-detail-card">
        <header><span>VERSÃO EM EXECUÇÃO</span><h3>Release</h3></header>
        <div class="health-detail-list">
          <div><span>Versão</span><b>${escapeHtml(release.version || '—')}</b></div>
          <div><span>Ambiente</span><b>${escapeHtml(release.environment || '—')}</b></div>
          <div><span>Commit</span><b class="health-commit">${escapeHtml(release.commit ? String(release.commit).slice(0, 12) : 'Não informado')}</b></div>
          <div><span>Gerado em</span><b>${escapeHtml(new Date(data.generatedAt).toLocaleString('pt-BR'))}</b></div>
          <div><span>Status geral</span><b>${data.ok ? 'OPERACIONAL' : 'ATENÇÃO NECESSÁRIA'}</b></div>
        </div>
      </section>
    </div>`;
}

async function loadSystemHealth() {
  const target = $('#systemHealthContent');
  if (!target || state.route !== 'system-health') return;

  try {
    const data = await apiFetch('/system-health', { timeoutMs: 8000 });
    if (!target.isConnected || state.route !== 'system-health') return;
    target.className = 'health-content';
    target.innerHTML = systemHealthCards(data);
    const stamp = $('#healthLastUpdate');
    if (stamp) stamp.textContent = 'Atualizado ' + new Date().toLocaleTimeString('pt-BR');
  } catch (error) {
    if (!target.isConnected || state.route !== 'system-health') return;
    target.className = 'health-error';
    target.innerHTML = `<span>!</span><h2>Não foi possível consultar a saúde do System</h2><p>${escapeHtml(error.message)}</p><button class="btn small" id="healthRetry">Tentar novamente</button>`;
    const retry = $('#healthRetry');
    if (retry) retry.onclick = loadSystemHealth;
  }
}

function disposeSystemHealthPage() {
  clearInterval(window._systemHealthTimer);
  window._systemHealthTimer = null;
}

function bindSystemHealthPage() {
  disposeSystemHealthPage();

  if (state.route !== 'system-health' || !$('#systemHealthContent')) return;
  const refresh = $('#refreshSystemHealth');
  if (refresh) refresh.onclick = loadSystemHealth;
  loadSystemHealth();
  window._systemHealthTimer = setInterval(loadSystemHealth, 15000);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { healthUptime };
}
