const SUPREME_ACTION_LABELS={
  MEMBER_ROLE_CHANGED:'Cargo do System',MEMBER_STATUS_CHANGED:'Status militar',MEMBER_BANNED:'Exoneração / banimento',
  MEMBER_UNBANNED:'Acesso restaurado',MEMBER_PROMOTED:'Promoção',MEMBER_DEMOTED:'Rebaixamento',
  MEMBER_DIVISION_CHANGED:'Divisão',SHIFT_FORCE_ENDED:'Turno encerrado à força',SOCIAL_POST_DELETED:'Post removido',
  SOCIAL_POST_PINNED:'Post fixado',SOCIAL_POST_UNPINNED:'Post desafixado',MEDAL_GRANTED:'Condecoração concedida',
  MEDAL_REVOKED:'Condecoração revogada',DUTY_SCHEDULE_CREATED:'Escala criada',DUTY_SCHEDULE_UPDATED:'Escala alterada',
  DUTY_SCHEDULE_DELETED:'Escala excluída'
};

function supremeActionLabel(action){return SUPREME_ACTION_LABELS[action]||String(action||'Ação').replace(/_/g,' ');}
function supremeDate(value){const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR'):'—';}
function supremeDetailSummary(log){
  const d=log.details||{};
  if(d.reason)return d.reason;
  if(d.from!==undefined||d.to!==undefined)return String(d.from||'—')+' → '+String(d.to||'—');
  if(d.kind)return String(d.kind);
  if(d.durationHours!==undefined)return 'Duração: '+Number(d.durationHours).toFixed(2)+'h';
  return Object.entries(d).filter(([k])=>!['targetId','targetMemberId','targetNick'].includes(k)).slice(0,3).map(([k,v])=>k+': '+String(v)).join(' • ')||'Sem detalhes adicionais.';
}
function pageSupremeInvestigation(){
  if(state.user?.role!=='SUPREMO')return emptyState('🔒','Acesso exclusivo do Supremo.');
  return `<div class="dpe-module-page supreme-investigation-page">
    <section class="module-hero module-hero-compact module-hero-supreme">
      <div class="module-hero-copy"><span class="module-kicker">SUPREMACIA / AUDITORIA</span><h1>Central Suprema de <strong>investigação</strong></h1><p>Consolide ações críticas, responsáveis, alvos e sinais de segurança em uma visão restrita e auditável.</p></div>
      <div class="module-hero-emblem supreme-hero-emblem" aria-hidden="true"><span>♜</span><b>SUPREMO</b><small>INVESTIGATION DESK</small></div>
      <div class="module-hero-code">DPE // SUPREME AUDIT CENTER</div>
    </section>

    <section class="supreme-kpis" aria-label="Indicadores de auditoria">
      <article><small>CRÍTICAS 24H</small><strong id="supremeCritical24h">—</strong><span>ações sensíveis</span></article>
      <article><small>CRÍTICAS 7D</small><strong id="supremeCritical7d">—</strong><span>ações sensíveis</span></article>
      <article><small>ERROS 5XX 24H</small><strong id="supremeErrors24h">—</strong><span>segurança / backend</span></article>
      <article><small>AUTH FALHA 24H</small><strong id="supremeAuth24h">—</strong><span>sessões e logins</span></article>
      <article><small>TURNOS FORÇADOS 7D</small><strong id="supremeForced7d">—</strong><span>encerramentos manuais</span></article>
      <article><small>MODERAÇÕES 7D</small><strong id="supremeSocial7d">—</strong><span>posts removidos</span></article>
    </section>

    <section class="card supreme-investigation-card">
      <header class="supreme-panel-head"><div><span>FILTROS DE INVESTIGAÇÃO</span><h2>Auditoria consolidada</h2></div><button class="btn ghost small" id="supremeSecurityToggle">Ver segurança 24h</button></header>
      <form id="supremeFilters" class="supreme-filters">
        <label>Busca<input class="input" name="q" maxlength="100" placeholder="Nick, alvo, ação ou detalhe"></label>
        <label>Responsável<input class="input" name="actor" maxlength="100" placeholder="Nick de quem realizou"></label>
        <label>Ação<select class="input" name="action"><option value="">Todas</option>${Object.entries(SUPREME_ACTION_LABELS).map(([v,l])=>`<option value="${v}">${escapeHtml(l)}</option>`).join('')}</select></label>
        <label>De<input class="input" name="from" type="date"></label>
        <label>Até<input class="input" name="to" type="date"></label>
        <button class="btn" type="submit">Investigar</button>
        <button class="btn ghost" type="button" id="supremeClearFilters">Limpar</button>
      </form>

      <div id="supremeAuditResults" class="supreme-audit-results"><p class="muted">Carregando auditoria…</p></div>
      <div id="supremeAuditPagination" class="supreme-pagination"></div>
      <div id="supremeSecurityPanel" class="supreme-security-panel hidden"><p class="muted">Carregando eventos de segurança…</p></div>
    </section>
  </div>`;
}

let supremeAuditPage=1;
function supremeQuery(page=1){
  const form=$('#supremeFilters'),params=new URLSearchParams({page});
  if(!form)return params;
  const data=new FormData(form);
  ['q','actor','action','from','to'].forEach(k=>{const v=String(data.get(k)||'').trim();if(v)params.set(k,v);});
  return params;
}
function supremeAuditRow(log){
  return `<article class="supreme-audit-row ${log.critical?'critical':''}">
    <div class="supreme-audit-time"><strong>${escapeHtml(new Date(log.createdAt).toLocaleDateString('pt-BR'))}</strong><span>${escapeHtml(new Date(log.createdAt).toLocaleTimeString('pt-BR'))}</span></div>
    <div class="supreme-audit-action"><small>${log.critical?'AÇÃO CRÍTICA':'AUDITORIA'}</small><strong>${escapeHtml(supremeActionLabel(log.action))}</strong><p>${escapeHtml(supremeDetailSummary(log))}</p></div>
    <div class="supreme-audit-actor"><small>RESPONSÁVEL</small><strong>${escapeHtml(log.actor?.nick||'System')}</strong><span>${escapeHtml(log.actor?.role||'—')}</span></div>
    <div class="supreme-audit-target"><small>ALVO</small><strong>${escapeHtml(log.target||'—')}</strong><span>${escapeHtml(log.targetRank||log.targetStatus||'')}</span></div>
    ${log.targetId?`<button class="btn ghost small" data-supreme-member="${log.targetId}">Abrir perfil</button>`:''}
  </article>`;
}
async function loadSupremeAudit(page=1){
  const target=$('#supremeAuditResults');if(!target||state.route!=='supreme-investigation')return;
  target.innerHTML='<p class="muted">Carregando auditoria…</p>';
  try{
    const data=await apiFetch('/supreme-investigation?'+supremeQuery(page));
    supremeAuditPage=data.page;
    const s=data.summary||{};
    $('#supremeCritical24h').textContent=Number(s.critical24h||0);
    $('#supremeCritical7d').textContent=Number(s.critical7d||0);
    $('#supremeErrors24h').textContent=Number(s.security5xx24h||0);
    $('#supremeAuth24h').textContent=Number(s.failedAuth24h||0);
    $('#supremeForced7d').textContent=Number(s.forcedStops7d||0);
    $('#supremeSocial7d').textContent=Number(s.socialModeration7d||0);
    target.innerHTML=data.logs.length?data.logs.map(supremeAuditRow).join(''):'<div class="dpe-empty"><span>✓</span><strong>Nenhum evento encontrado</strong><p>Ajuste os filtros para ampliar a investigação.</p></div>';
    $$('[data-supreme-member]',target).forEach(btn=>btn.onclick=()=>{const m=state.members.find(x=>Number(x.id)===Number(btn.dataset.supremeMember));if(m)viewMemberProfile(m);else toast('Militar não está no cache atual.');});
    $('#supremeAuditPagination').innerHTML=`<button class="btn ghost small" data-supreme-page="${data.page-1}" ${data.page<=1?'disabled':''}>← Anterior</button><span>Página ${data.page} de ${data.pages} • ${data.total} registro(s)</span><button class="btn ghost small" data-supreme-page="${data.page+1}" ${data.page>=data.pages?'disabled':''}>Próxima →</button>`;
    $$('[data-supreme-page]').forEach(btn=>btn.onclick=()=>loadSupremeAudit(Number(btn.dataset.supremePage)));
  }catch(e){if(target.isConnected)target.innerHTML='<div class="notice-box">'+escapeHtml(e.message)+'</div>';}
}
async function loadSupremeSecurity(){
  const panel=$('#supremeSecurityPanel');if(!panel)return;
  panel.classList.remove('hidden');panel.innerHTML='<p class="muted">Carregando segurança…</p>';
  try{
    const data=await apiFetch('/supreme-investigation/security');
    panel.innerHTML=`<header><span>SEGURANÇA / ÚLTIMAS 24H</span><strong>${data.events.length} evento(s) relevante(s)</strong></header><div class="supreme-security-list">${data.events.length?data.events.map(e=>`<article><span class="security-status status-${Math.floor(e.statusCode/100)}">${e.statusCode}</span><div><strong>${escapeHtml(e.authResult)}</strong><small>${escapeHtml(e.method)} ${escapeHtml(e.route)} • ${escapeHtml(supremeDate(e.occurredAt))}</small></div><div><b>${escapeHtml(e.member?.habboName||'Sem conta')}</b><small>${escapeHtml(e.ip||'—')}</small></div></article>`).join(''):'<p class="muted">Nenhum sinal relevante nas últimas 24 horas.</p>'}</div>`;
  }catch(e){panel.innerHTML='<div class="notice-box">'+escapeHtml(e.message)+'</div>';}
}
function bindSupremeInvestigationPage(){
  if(state.route!=='supreme-investigation'||state.user?.role!=='SUPREMO'||!$('#supremeFilters'))return;
  $('#supremeFilters').onsubmit=e=>{e.preventDefault();loadSupremeAudit(1);};
  $('#supremeClearFilters').onclick=()=>{$('#supremeFilters').reset();loadSupremeAudit(1);};
  $('#supremeSecurityToggle').onclick=()=>{const p=$('#supremeSecurityPanel');if(!p)return;if(!p.classList.contains('hidden'))p.classList.add('hidden');else loadSupremeSecurity();};
  loadSupremeAudit(supremeAuditPage);
}