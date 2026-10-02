let securityPage = 1;
const SECURITY_TIME_ZONE = 'America/Sao_Paulo';
const SECURITY_TIME_ZONE_LABEL = 'BRT / UTC−3';

function securityDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data inválida';
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SECURITY_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(date).replace(',', '');
  return `${formatted} · ${SECURITY_TIME_ZONE_LABEL}`;
}

// Converte os componentes digitados como horário de São Paulo para UTC sem
// depender do fuso configurado no aparelho do administrador.
function saoPauloInputToUtc(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return '';
  const desired = Date.UTC(...match.slice(1).map(Number).map((part, index) => index === 1 ? part - 1 : part));
  let instant = desired;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SECURITY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    instant += desired - represented;
  }
  return new Date(instant).toISOString();
}

function securityAuthLabel(value) {
  return ({
    AUTHENTICATED: 'Sessão autenticada', ANONYMOUS: 'Anônimo', LOGIN_SUCCESS: 'Login aprovado',
    LOGIN_VIEW: 'Login aberto', LOGIN_FAILED: 'Login recusado', MISSING_CREDENTIALS: 'Sem credencial',
    INVALID_SESSION: 'Sessão inválida', SESSION_REVOKED: 'Sessão revogada', ACCESS_REVOKED: 'Acesso revogado',
  })[value] || value;
}

function pageSecurityEvents() {
  if (!can('ADMINISTRADOR')) return `<div class="dpe-module-page security-module-page"><section class="module-hero module-hero-security module-hero-compact"><div class="module-hero-copy"><span class="module-kicker">ADMINISTRAÇÃO / SEGURANÇA</span><h1>Acesso <strong>restrito</strong></h1><p>Esta área é exclusiva para administradores.</p></div></section></div>`;
  return `<div class="dpe-module-page security-module-page">
    <section class="module-hero module-hero-security module-hero-compact">
      <div class="module-hero-copy"><span class="module-kicker">ADMINISTRAÇÃO / SEGURANÇA</span><h1>Central de <strong>segurança</strong></h1><p>Investigue acessos, tentativas de autenticação e origem das requisições sem expor credenciais.</p></div>
      <div class="module-hero-emblem security-hero-emblem" aria-hidden="true"><span>⌾</span><b>SECURITY</b><small>LOGS DPE</small></div>
      <div class="module-hero-code">DPE // SECURITY OPERATIONS</div>
    </section>
    <section class="security-log-card security-log-card-v2">
      <header class="security-panel-head"><div><span>FILTROS DE INVESTIGAÇÃO</span><h2>Eventos de segurança</h2></div><small>${SECURITY_TIME_ZONE_LABEL}</small></header>
      <form id="securityFilters" class="security-filters security-filters-v2">
        <label>IP<input name="ip" maxlength="64" placeholder="Ex.: 192.0.2.10"></label>
        <label>Conta<input name="account" maxlength="100" placeholder="Nick do Habbo"></label>
        <label>Categoria<select name="category"><option value="">Todas</option><option value="ANONYMOUS">Visitantes anônimos</option><option value="BOT">Bots</option><option value="AUTHENTICATED">Usuários autenticados</option></select></label>
        <label>De (${SECURITY_TIME_ZONE_LABEL})<input name="from" type="datetime-local"></label>
        <label>Até (${SECURITY_TIME_ZONE_LABEL})<input name="to" type="datetime-local"></label>
        <button class="btn" type="submit">Filtrar</button>
        <button class="btn ghost" type="button" id="clearSecurityFilters">Limpar</button>
      </form>
      <div class="security-notice">Horários exibidos em ${SECURITY_TIME_ZONE_LABEL} (America/Sao_Paulo). O banco permanece em UTC. Bots aparecem identificados e não são considerados acessos humanos.</div>
      <div id="securityDiagnostic" class="security-diagnostic">Carregando diagnóstico administrativo…</div>
      <div id="securityResults" class="security-results"><p class="muted">Carregando eventos…</p></div>
    </section>
  </div>`;
}

function securityQuery(page = 1) {
  const form = $('#securityFilters');
  const params = new URLSearchParams({ page });
  if (!form) return params;
  const data = new FormData(form);
  ['ip', 'account', 'category'].forEach(key => { if (data.get(key)) params.set(key, data.get(key)); });
  ['from', 'to'].forEach(key => { if (data.get(key)) params.set(key, saoPauloInputToUtc(data.get(key))); });
  return params;
}

async function loadSecurityEvents(page = 1) {
  const target = $('#securityResults');
  if (!target) return;
  target.innerHTML = '<p class="muted">Carregando eventos…</p>';
  try {
    const data = await apiFetch(`/security-events?${securityQuery(page)}`);
    securityPage = data.page;
    target.innerHTML = `<div class="security-summary"><b>${data.total}</b> eventos encontrados · <b>${data.events.length}</b> exibidos nesta página <span>Retenção: ${data.retentionDays} dias ou ${data.maxEvents.toLocaleString('pt-BR')} eventos</span></div>
      <div class="security-table-wrap"><table class="security-table"><thead><tr><th>Data e hora (${SECURITY_TIME_ZONE_LABEL})</th><th>Origem</th><th>Requisição</th><th>Status</th><th>Autenticação</th><th>Conta</th><th>User-Agent</th></tr></thead>
      <tbody>${data.events.length ? data.events.map(event => `<tr>
        <td>${escapeHtml(securityDateTime(event.occurredAt))}</td>
        <td><code>${escapeHtml(event.ip)}</code><small>Origem: ${escapeHtml(event.ipSource || 'LEGACY')}</small>${event.proxyIp ? `<small>Proxy Discloud: ${escapeHtml(event.proxyIp)}</small>` : ''}${event.edgeProxyIp ? `<small>Edge Cloudflare: ${escapeHtml(event.edgeProxyIp)}</small>` : ''}${event.isBot ? `<span class="security-bot">BOT · ${escapeHtml(event.botName || 'Detectado')}</span>` : '<span class="security-human">Navegador</span>'}</td>
        <td><b>${escapeHtml(event.method)}</b><small>${escapeHtml(event.route)}</small></td>
        <td><span class="security-status status-${Math.floor(event.statusCode / 100)}">${event.statusCode}</span></td>
        <td>${escapeHtml(securityAuthLabel(event.authResult))}</td>
        <td>${event.member ? `<b>${escapeHtml(event.member.habboName)}</b><small>ID ${event.member.id}</small>` : '—'}</td>
        <td class="security-ua" title="${escapeHtml(event.userAgent)}">${escapeHtml(event.userAgent)}</td>
      </tr>`).join('') : '<tr><td colspan="7" class="security-empty">Nenhum evento encontrado.</td></tr>'}</tbody></table></div>
      <div class="security-pagination"><button class="btn ghost small" data-security-page="${data.page - 1}" ${data.page <= 1 ? 'disabled' : ''}>← Anterior</button><span>Página ${data.page} de ${data.pages}</span><button class="btn ghost small" data-security-page="${data.page + 1}" ${data.page >= data.pages ? 'disabled' : ''}>Próxima →</button></div>`;
    $$('[data-security-page]', target).forEach(button => button.onclick = () => loadSecurityEvents(Number(button.dataset.securityPage)));
  } catch (err) { target.innerHTML = `<div class="notice-box">${escapeHtml(err.message)}</div>`; }
}

function bindSecurityEventsPage() {
  if (state.route !== 'security-events' || !$('#securityFilters')) return;
  $('#securityFilters').onsubmit = event => { event.preventDefault(); loadSecurityEvents(1); };
  $('#clearSecurityFilters').onclick = () => { $('#securityFilters').reset(); loadSecurityEvents(1); };
  Promise.all([apiFetch('/security-events/diagnostics'), apiFetch('/security-events/proxy-diagnostics')]).then(([counts, data]) => {
    const el = $('#securityDiagnostic'); if (!el) return;
    const r = data.resolved;
    const runtime = counts.runtime, db = counts.database;
    el.innerHTML = `<div><b>Diagnóstico ${escapeHtml(counts.release)}</b><span>Processo iniciado ${escapeHtml(securityDateTime(runtime.startedAt))}</span></div>
      <div class="security-diagnostic-grid"><span>Recebidas pelo endpoint<b>${runtime.loginViewReceived}</b></span><span>Aceitas<b>${runtime.loginViewAccepted}</b></span><span>Limitadas (429)<b>${runtime.loginViewRateLimited}</b></span><span>Gravadas em 24h<b>${db.loginViews}</b></span><span>Anônimas em 24h<b>${db.anonymous}</b></span><span>Bots em 24h<b>${db.bots}</b></span><span>Autenticadas em 24h<b>${db.authenticated}</b></span></div>
      ${db.latestLoginView ? `<div><b>Última abertura de login:</b> ${escapeHtml(securityDateTime(db.latestLoginView.occurredAt))} · HTTP ${db.latestLoginView.statusCode}</div>` : ''}
      <div><b>Cadeia desta sessão:</b> visitante <code>${escapeHtml(r.clientIp || 'não disponível')}</code> → Cloudflare <code>${escapeHtml(r.edgeProxyIp || 'não validada')}</code> → Discloud <code>${escapeHtml(r.proxyIp || 'direto')}</code> <span>${r.cloudflareTrusted ? '✓ Cloudflare validada' : '⚠ origem Cloudflare não validada'}</span></div>`;
  }).catch(() => {});
  loadSecurityEvents(securityPage);
}

if (typeof module !== 'undefined' && module.exports) module.exports = { securityDateTime, saoPauloInputToUtc };
