/* ==========================================================================
   DPE 4.0 — NEXUS
   Copiloto, timeline, replay, radar, Mission Builder, Career Engine,
   War Room, Identidade Digital e Command Palette.
   ========================================================================== */

let nexusTab='copilot';
let nexusPendingQuestion='';
let nexusCareerMemberId=null;
let nexusReplayTimer=null;
let nexusWarRoomTimer=null;

function nexusHero(){
  return `<section class="module-hero nexus-hero">
    <div class="module-hero-copy">
      <span class="module-kicker">DPE 4.0 / COMMAND INTELLIGENCE</span>
      <h1>DPE <strong>NEXUS</strong></h1>
      <p>Copiloto operacional, memória institucional, replay, radar e execução de missões no mesmo núcleo.</p>
    </div>
    <div class="module-hero-emblem"><span>◈</span><b>NEXUS</b><small>COMMAND INTELLIGENCE</small></div>
    <div class="module-hero-code">DPE // NEXUS CORE</div>
  </section>`;
}
function nexusTabs(){
  const tabs=[
    ['copilot','✦','Copiloto'],
    ['timeline','≋','Timeline'],
    ['replay','◷','Replay'],
    ['radar','⌁','Radar'],
    ['missions','⬡','Missões'],
    ['career','↗','Carreira'],
    ['identity','▣','Identidade'],
  ].filter(([id])=>(id!=='replay'||can('MODERADOR'))&&(id!=='radar'||can('ADMINISTRADOR')));
  if(!tabs.some(([id])=>id===nexusTab))nexusTab='copilot';
  return `<nav class="nexus-tabs">${tabs.map(([id,ico,label])=>`<button class="${nexusTab===id?'active':''}" data-nexus-tab="${id}"><span>${ico}</span>${label}</button>`).join('')}</nav>`;
}
function pageNexus(){
  return `<div class="dpe-module-page nexus-page">
    ${nexusHero()}
    ${nexusTabs()}
    <section class="card nexus-workspace"><div id="nexusRoot"><div class="profile-feed-loading"><span></span><p>Inicializando NEXUS…</p></div></div></section>
  </div>`;
}
function bindNexusPage(){
  if(state.route!=='nexus')return;
  $$('[data-nexus-tab]').forEach(b=>b.onclick=()=>{nexusTab=b.dataset.nexusTab;renderNexusTab();});
  renderNexusTab();
}
function renderNexusTab(){
  $$('[data-nexus-tab]').forEach(b=>b.classList.toggle('active',b.dataset.nexusTab===nexusTab));
  const root=$('#nexusRoot');if(!root)return;
  if(nexusTab==='copilot')return renderNexusCopilot(root);
  if(nexusTab==='timeline')return renderNexusTimeline(root);
  if(nexusTab==='replay')return renderNexusReplay(root);
  if(nexusTab==='radar')return renderNexusRadar(root);
  if(nexusTab==='missions')return renderNexusMissions(root);
  if(nexusTab==='career')return renderNexusCareer(root);
  if(nexusTab==='identity')return renderNexusIdentity(root);
}

function nexusActionButtons(actions=[]){
  return actions.length?`<div class="nexus-answer-actions">${actions.map((a,i)=>`<button class="btn ghost small" data-nexus-answer-action="${i}">${escapeHtml(a.label)}</button>`).join('')}</div>`:'';
}
function bindNexusAnswerActions(root,actions){
  $$('[data-nexus-answer-action]',root).forEach(b=>b.onclick=()=>{
    const a=actions[Number(b.dataset.nexusAnswerAction)];if(!a)return;
    if(a.type==='profile'&&a.memberId){const m=state.members.find(x=>Number(x.id)===Number(a.memberId));if(m)return viewMemberProfile(m);}
    if(a.route==='nexus'){nexusTab=a.tab||'copilot';if(a.memberId)nexusCareerMemberId=a.memberId;return navigateTo('nexus');}
    if(a.route)navigateTo(a.route);
  });
}
function renderNexusCopilot(root){
  root.innerHTML=`<div class="nexus-section-head"><div><span>NEXUS AI</span><h2>Copiloto operacional</h2><p>Consulta os dados reais do System, explica a evidência usada e nunca executa ação sensível sem confirmação humana.</p></div><i class="nexus-live-dot">ONLINE</i></div>
    <div class="nexus-copilot-layout">
      <section class="nexus-chat">
        <div id="nexusConversation" class="nexus-conversation">
          <article class="nexus-message ai"><span>◈</span><div><strong>NEXUS</strong><p>Estou conectado aos dados do System. Pergunte sobre base, O.C., histórico, carreira, escala ou sinais operacionais.</p></div></article>
        </div>
        <form id="nexusAskForm" class="nexus-ask-form"><textarea class="input" id="nexusQuestion" rows="2" maxlength="500" placeholder="Ex.: resuma a base hoje"></textarea><button class="btn" type="submit">Perguntar</button></form>
      </section>
      <aside class="nexus-prompts"><span>CONSULTAS RÁPIDAS</span>
        ${['Resumo da base hoje','Quem está em O.C.?','Quem está apto para O.C.?','Quem está perto de promoção?','Monte a escala de amanhã',...(can('ADMINISTRADOR')?['Mostre anomalias']:[])].map(q=>`<button data-nexus-prompt="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('')}
      </aside>
    </div>`;
  const form=$('#nexusAskForm'),input=$('#nexusQuestion');
  const ask=async q=>{
    q=String(q||'').trim();if(!q)return;
    const conv=$('#nexusConversation');
    conv.insertAdjacentHTML('beforeend',`<article class="nexus-message user"><span>→</span><div><strong>VOCÊ</strong><p>${escapeHtml(q)}</p></div></article><article class="nexus-message ai loading" id="nexusThinking"><span>◈</span><div><strong>NEXUS</strong><p>Analisando dados do System…</p></div></article>`);
    conv.scrollTop=conv.scrollHeight;input.value='';
    try{
      const data=await apiFetch('/nexus/ask',{method:'POST',body:JSON.stringify({question:q})});
      $('#nexusThinking')?.remove();
      const id='nexus-answer-'+Date.now();
      conv.insertAdjacentHTML('beforeend',`<article class="nexus-message ai" id="${id}"><span>◈</span><div><strong>NEXUS • ${escapeHtml(data.intent||'ANÁLISE')}</strong><p>${escapeHtml(data.answer||'')}</p>${data.evidence?.length?`<div class="nexus-evidence">${data.evidence.map(e=>`<span><b>${escapeHtml(e.label)}</b><em>${escapeHtml(String(e.value))}</em></span>`).join('')}</div>`:''}${data.note?`<small>${escapeHtml(data.note)}</small>`:''}${nexusActionButtons(data.actions)}</div></article>`);
      bindNexusAnswerActions($('#'+id),data.actions||[]);
    }catch(e){$('#nexusThinking')?.remove();conv.insertAdjacentHTML('beforeend',`<article class="nexus-message ai error"><span>!</span><div><strong>NEXUS</strong><p>${escapeHtml(e.message)}</p></div></article>`);}
    conv.scrollTop=conv.scrollHeight;
  };
  form.onsubmit=e=>{e.preventDefault();ask(input.value);};
  $$('[data-nexus-prompt]',root).forEach(b=>b.onclick=()=>ask(b.dataset.nexusPrompt));
  if(nexusPendingQuestion){const q=nexusPendingQuestion;nexusPendingQuestion='';setTimeout(()=>ask(q),80);}
}

function nexusTimelineIcon(type){return ({TURNO:'◷',OPERACAO:'⌁',CARREIRA:'↗',AULA:'🎓',COMUNICADO:'📢',MISSAO:'⬡',AUDIT:'≡'})[type]||'•';}
function renderNexusTimeline(root){
  const now=new Date(),start=new Date(now.getTime()-24*3600000);
  root.innerHTML=`<div class="nexus-section-head"><div><span>MEMÓRIA INSTITUCIONAL</span><h2>Timeline viva</h2><p>Reconstrua a sequência operacional sem navegar por módulos separados.</p></div></div>
    <div class="nexus-timeline-controls"><label>De<input class="input" id="nexusTimelineFrom" type="datetime-local"></label><label>Até<input class="input" id="nexusTimelineTo" type="datetime-local"></label><label>Militar<select class="input" id="nexusTimelineMember"><option value="">Todos</option>${state.members.map(m=>`<option value="${m.id}">${escapeHtml(m.nick)}</option>`).join('')}</select></label><button class="btn" id="nexusTimelineLoad">Atualizar</button></div>
    <div id="nexusTimelineRows" class="nexus-timeline"><div class="profile-feed-loading"><span></span><p>Carregando timeline…</p></div></div>`;
  const local=v=>new Date(v.getTime()-v.getTimezoneOffset()*60000).toISOString().slice(0,16);
  $('#nexusTimelineFrom').value=local(start);$('#nexusTimelineTo').value=local(now);
  const load=async()=>{
    const rows=$('#nexusTimelineRows');rows.innerHTML='<div class="profile-feed-loading"><span></span><p>Reconstruindo eventos…</p></div>';
    try{
      const qs=new URLSearchParams({from:new Date($('#nexusTimelineFrom').value).toISOString(),to:new Date($('#nexusTimelineTo').value).toISOString(),limit:'400'});
      if($('#nexusTimelineMember').value)qs.set('memberId',$('#nexusTimelineMember').value);
      const data=await apiFetch('/nexus/timeline?'+qs);
      rows.innerHTML=data.events.length?data.events.map(e=>`<article class="nexus-timeline-event"><time>${new Date(e.time).toLocaleString('pt-BR')}</time><span class="nexus-event-icon">${nexusTimelineIcon(e.type)}</span><div><small>${escapeHtml(e.type)} • ${escapeHtml(e.subtype||'')}</small><strong>${escapeHtml(e.title)}</strong><p>${escapeHtml(e.subtitle||'')}</p></div>${e.memberId?`<button class="btn ghost small" data-nexus-event-member="${e.memberId}">Perfil</button>`:''}</article>`).join(''):'<div class="dpe-empty"><span>≋</span><strong>Sem eventos</strong><p>Nenhum registro no período selecionado.</p></div>';
      $$('[data-nexus-event-member]',rows).forEach(b=>b.onclick=()=>{const m=state.members.find(x=>x.id==b.dataset.nexusEventMember);if(m)viewMemberProfile(m);});
    }catch(e){rows.innerHTML=`<div class="notice-box">${escapeHtml(e.message)}</div>`;}
  };
  $('#nexusTimelineLoad').onclick=load;load();
}

function renderNexusReplay(root){
  if(!can('MODERADOR'))return root.innerHTML='<div class="notice-box">Replay Operacional é restrito à Moderação.</div>';
  const now=new Date(),localDate=now.toISOString().slice(0,10),minutes=now.getHours()*60+now.getMinutes();
  root.innerHTML=`<div class="nexus-section-head"><div><span>REPLAY OPERACIONAL</span><h2>Voltar no tempo</h2><p>Escolha um dia e arraste o relógio para reconstruir quem estava em turno, funções, operações, afastamentos e compromissos.</p></div><strong id="nexusReplayClock">--:--</strong></div>
    <div class="nexus-replay-controls"><input class="input" id="nexusReplayDate" type="date" value="${localDate}"><input id="nexusReplayRange" type="range" min="0" max="1439" value="${minutes}"><button class="btn ghost small" id="nexusReplayNow">Agora</button></div>
    <div id="nexusReplayRoot"><div class="profile-feed-loading"><span></span><p>Preparando replay…</p></div></div>`;
  const range=$('#nexusReplayRange'),date=$('#nexusReplayDate');
  const updateClock=()=>{$('#nexusReplayClock').textContent=String(Math.floor(Number(range.value)/60)).padStart(2,'0')+':'+String(Number(range.value)%60).padStart(2,'0');};
  const load=()=>{clearTimeout(nexusReplayTimer);updateClock();nexusReplayTimer=setTimeout(async()=>{
    const target=$('#nexusReplayRoot');if(!target)return;
    const [y,m,d]=date.value.split('-').map(Number),mins=Number(range.value),at=new Date(y,m-1,d,Math.floor(mins/60),mins%60,0);
    target.innerHTML='<div class="profile-feed-loading"><span></span><p>Reconstruindo '+at.toLocaleString('pt-BR')+'…</p></div>';
    try{
      const data=await apiFetch('/nexus/replay?at='+encodeURIComponent(at.toISOString()));
      const s=data.summary||{},stations=s.stations||{};
      target.innerHTML=`<div class="nexus-replay-kpis">${[['EM TURNO',s.shifts],['BASE',stations.base],['O.C.',stations.oc],['O.B.',stations.ob],['AUSÊNCIA',stations.absence],['OPERAÇÕES',s.operations],['FUNÇÕES',s.functions],['MISSÕES',s.missions]].map(([l,v])=>`<article><small>${l}</small><strong>${Number(v||0)}</strong></article>`).join('')}</div>
        ${!data.coverage.exactStationHistory?`<div class="notice-box">Alguns turnos antigos são aproximações porque o histórico detalhado de mudança de setor passou a ser gravado a partir do DPE NEXUS. ${data.coverage.approximateShifts} turno(s) afetado(s).</div>`:''}
        <div class="nexus-replay-layout"><section class="card"><header><span>EFETIVO</span><h3>Turnos naquele instante</h3></header><div class="nexus-replay-list">${data.shifts.length?data.shifts.map(x=>`<article><div><strong>${escapeHtml(x.member.nick)}</strong><small>${escapeHtml(x.member.rank)} • ${escapeHtml(x.member.division)}</small></div><span>${escapeHtml(x.station)}${x.approximate?' ~':''}</span></article>`).join(''):'<p class="muted">Sem turnos.</p>'}</div></section>
        <section class="card"><header><span>OPERAÇÕES & MISSÕES</span><h3>Atividade ativa</h3></header><div class="nexus-replay-list">${[...data.operations.map(x=>({title:x.name,text:x.location||'Operação especial'})),...data.missions.map(x=>({title:x.name,text:x.progress+'% concluída'}))].map(x=>`<article><div><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.text)}</small></div></article>`).join('')||'<p class="muted">Nada ativo.</p>'}</div></section></div>
        <div class="nexus-replay-layout"><section class="card"><header><span>FUNÇÕES</span><h3>Designações temporárias</h3></header><div class="nexus-replay-list">${data.functions.map(x=>`<article><div><strong>${escapeHtml(x.member.nick)}</strong><small>${escapeHtml(x.title)}</small></div></article>`).join('')||'<p class="muted">Nenhuma.</p>'}</div></section>
        <section class="card"><header><span>AGENDA</span><h3>Eventos e escalas</h3></header><div class="nexus-replay-list">${[...data.events.map(x=>({title:x.title,text:x.type})),...data.schedules.map(x=>({title:x.member.nick,text:'Escala'})),...data.leaves.map(x=>({title:x.member.nick,text:'Afastamento'}))].map(x=>`<article><div><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.text)}</small></div></article>`).join('')||'<p class="muted">Nenhum registro.</p>'}</div></section></div>`;
    }catch(e){target.innerHTML=`<div class="notice-box">${escapeHtml(e.message)}</div>`;}
  },180);};
  range.oninput=load;date.onchange=load;$('#nexusReplayNow').onclick=()=>{const n=new Date();date.value=n.toISOString().slice(0,10);range.value=n.getHours()*60+n.getMinutes();load();};load();
}

function renderNexusRadar(root){
  if(!can('ADMINISTRADOR'))return root.innerHTML='<div class="notice-box">Radar de Anomalias é restrito ao Administrativo.</div>';
  root.innerHTML='<div class="nexus-section-head"><div><span>RADAR DE ANOMALIAS</span><h2>Sinais fora do padrão</h2><p>Detecção automática para revisão humana. Nenhum sinal é tratado como culpa, punição ou prova.</p></div><button class="btn ghost small" id="nexusRadarRefresh">Reanalisar</button></div><div id="nexusRadarRows"><div class="profile-feed-loading"><span></span><p>Cruzando dados…</p></div></div>';
  const load=async()=>{const rows=$('#nexusRadarRows');try{const data=await apiFetch('/nexus/anomalies');rows.innerHTML=`<div class="nexus-radar-disclaimer">${escapeHtml(data.disclaimer)}</div>`+(data.signals.length?data.signals.map(s=>`<article class="nexus-radar-card severity-${String(s.severity).toLowerCase()}"><span>${escapeHtml(s.severity)}</span><div><strong>${escapeHtml(s.title)}</strong><p>${escapeHtml(s.text)}</p></div>${s.memberId?`<button class="btn ghost small" data-radar-member="${s.memberId}">Perfil</button>`:''}</article>`).join(''):'<div class="dpe-empty"><span>✓</span><strong>Nenhum sinal relevante</strong><p>Não foram detectados padrões configurados como atípicos.</p></div>');$$('[data-radar-member]',rows).forEach(b=>b.onclick=()=>{const m=state.members.find(x=>x.id==b.dataset.radarMember);if(m)viewMemberProfile(m);});}catch(e){rows.innerHTML=`<div class="notice-box">${escapeHtml(e.message)}</div>`;}};$('#nexusRadarRefresh').onclick=load;load();
}

/* ------------------------------ Mission Builder ---------------------------- */
let nexusMissionSelected=null;
let nexusMissionCache=[];

function missionStatusLabel(status){return ({RASCUNHO:'Rascunho',ATIVA:'Ativa',ENCERRADA:'Encerrada'})[status]||status;}
async function renderNexusMissions(root){
  root.innerHTML='<div class="nexus-section-head"><div><span>MISSION BUILDER</span><h2>Operações como fluxo executável</h2><p>Monte briefing, equipes, checkpoints e encerramento. A missão acompanha o progresso e gera After Action Report automaticamente.</p></div></div><div id="nexusMissionBody"><div class="profile-feed-loading"><span></span><p>Carregando missões…</p></div></div>';
  try{
    const data=await apiFetch('/missions');nexusMissionCache=data.missions||[];
    if(nexusMissionSelected&&!nexusMissionCache.some(m=>m.id===nexusMissionSelected))nexusMissionSelected=null;
    if(nexusMissionSelected)return renderMissionDetail($('#nexusMissionBody'),nexusMissionCache.find(m=>m.id===nexusMissionSelected));
    renderMissionBoard($('#nexusMissionBody'));
  }catch(e){$('#nexusMissionBody').innerHTML='<div class="notice-box">'+escapeHtml(e.message)+'</div>';}
}
function renderMissionBoard(target){
  target.innerHTML=(can('MODERADOR')?'<section class="nexus-mission-create"><form id="nexusMissionCreate" class="nexus-inline-form"><label>Nome<input class="input" id="missionName" maxlength="140" required></label><label>Objetivo<input class="input" id="missionObjective" maxlength="1200" required></label><button class="btn" type="submit">Criar missão</button></form></section>':'')+
  '<div class="nexus-mission-grid">'+(nexusMissionCache.length?nexusMissionCache.map(m=>'<button class="nexus-mission-card status-'+String(m.status).toLowerCase()+'" data-mission-open="'+m.id+'"><header><span>'+escapeHtml(missionStatusLabel(m.status))+'</span><b>'+m.progress+'%</b></header><h3>'+escapeHtml(m.name)+'</h3><p>'+escapeHtml(m.objective)+'</p><div><i style="width:'+Math.max(0,Math.min(100,m.progress))+'%"></i></div><footer><span>'+m.steps.length+' etapa(s)</span><span>'+(m.operation?escapeHtml(m.operation.name):'Sem operação vinculada')+'</span></footer></button>').join(''):'<div class="dpe-empty"><span>⬡</span><strong>Nenhuma missão</strong><p>Crie o primeiro fluxo operacional.</p></div>')+'</div>';
  const form=$('#nexusMissionCreate');if(form)form.onsubmit=async e=>{e.preventDefault();try{const d=await apiFetch('/missions',{method:'POST',body:JSON.stringify({name:$('#missionName').value.trim(),objective:$('#missionObjective').value.trim()})});nexusMissionSelected=d.mission.id;toast('Missão criada.');renderNexusMissions($('#nexusRoot'));}catch(err){toast(err.message);}};
  $$('[data-mission-open]',target).forEach(b=>b.onclick=()=>{nexusMissionSelected=Number(b.dataset.missionOpen);renderMissionDetail(target,nexusMissionCache.find(m=>m.id===nexusMissionSelected));});
}
function missionStepCard(step,mission){
  const mine=step.assignees.some(a=>Number(a.id)===Number(state.user.id)),canUpdate=can('MODERADOR')||mine;
  return '<article class="mission-step status-'+String(step.status).toLowerCase()+'" draggable="'+(can('MODERADOR')?'true':'false')+'" data-mission-step="'+step.id+'"><div class="mission-drag">⋮⋮</div><div class="mission-step-copy"><small>'+escapeHtml(step.kind)+' • '+escapeHtml(step.status)+'</small><strong>'+escapeHtml(step.title)+'</strong><p>'+escapeHtml(step.description||'')+'</p><div class="mission-assignees">'+(step.assignees.length?step.assignees.map(a=>'<span>'+escapeHtml(a.nick)+'</span>').join(''):'<span>Sem responsável</span>')+'</div></div><div class="mission-step-actions">'+(canUpdate&&step.status!=='CONCLUIDO'&&mission.status!=='ENCERRADA'?'<button class="btn small" data-mission-complete="'+step.id+'">Concluir</button>':'')+(can('MODERADOR')&&mission.status!=='ENCERRADA'?'<button class="btn ghost small" data-mission-assign="'+step.id+'">Equipe</button><button class="btn ghost small" data-mission-delete="'+step.id+'">Excluir</button>':'')+'</div></article>';
}
function renderMissionDetail(target,mission){
  if(!mission)return renderMissionBoard(target);
  target.innerHTML='<button class="btn ghost small mission-back" id="missionBack">← Todas as missões</button><section class="mission-detail-head"><div><span>'+escapeHtml(missionStatusLabel(mission.status))+'</span><h2>'+escapeHtml(mission.name)+'</h2><p>'+escapeHtml(mission.objective)+'</p></div><div class="mission-progress-ring"><strong>'+mission.progress+'%</strong><span>concluída</span></div></section><div class="mission-toolbar">'+(can('ADMINISTRADOR')&&mission.status==='RASCUNHO'?'<button class="btn" id="missionActivate">Ativar missão</button>':'')+(can('ADMINISTRADOR')&&mission.status!=='ENCERRADA'?'<button class="btn danger" id="missionClose">Encerrar + gerar AAR</button>':'')+(mission.aarText?'<button class="btn ghost" id="missionAar">Ver AAR</button>':'')+'</div>'+(can('MODERADOR')&&mission.status!=='ENCERRADA'?'<form id="missionStepForm" class="mission-step-form"><input class="input" id="missionStepTitle" placeholder="Nova etapa / checkpoint" maxlength="160" required><select class="input" id="missionStepKind"><option>BRIEFING</option><option>CHECKPOINT</option><option>EQUIPE</option><option>OBJETIVO</option><option>ENCERRAMENTO</option></select><button class="btn">Adicionar etapa</button></form>':'')+'<div class="mission-flow" id="missionFlow">'+(mission.steps.length?mission.steps.map(s=>missionStepCard(s,mission)).join(''):'<div class="dpe-empty"><span>＋</span><strong>Fluxo vazio</strong><p>Adicione etapas para estruturar a missão.</p></div>')+'</div>';
  $('#missionBack').onclick=()=>{nexusMissionSelected=null;renderMissionBoard(target);};
  const activate=$('#missionActivate');if(activate)activate.onclick=async()=>{try{await apiFetch('/missions/'+mission.id+'/activate',{method:'POST'});toast('Missão ativada.');await refreshMissionDetail(target,mission.id);}catch(e){toast(e.message);}};
  const close=$('#missionClose');if(close)close.onclick=async()=>{if(!confirm('Encerrar a missão e gerar o After Action Report?'))return;try{const d=await apiFetch('/missions/'+mission.id+'/close',{method:'POST'});toast('Missão encerrada e AAR gerado.');openMissionAar(d.aar);await refreshMissionDetail(target,mission.id);}catch(e){toast(e.message);}};
  const aar=$('#missionAar');if(aar)aar.onclick=()=>openMissionAar(mission.aarText);
  const form=$('#missionStepForm');if(form)form.onsubmit=async e=>{e.preventDefault();try{await apiFetch('/missions/'+mission.id+'/steps',{method:'POST',body:JSON.stringify({title:$('#missionStepTitle').value.trim(),kind:$('#missionStepKind').value})});await refreshMissionDetail(target,mission.id);}catch(err){toast(err.message);}};
  $$('[data-mission-complete]',target).forEach(b=>b.onclick=async()=>{try{await apiFetch('/missions/steps/'+b.dataset.missionComplete,{method:'PATCH',body:JSON.stringify({status:'CONCLUIDO'})});toast('Checkpoint concluído.');await refreshMissionDetail(target,mission.id);}catch(e){toast(e.message);}});
  $$('[data-mission-delete]',target).forEach(b=>b.onclick=async()=>{if(!confirm('Excluir esta etapa?'))return;try{await apiFetch('/missions/steps/'+b.dataset.missionDelete,{method:'DELETE'});await refreshMissionDetail(target,mission.id);}catch(e){toast(e.message);}});
  $$('[data-mission-assign]',target).forEach(b=>b.onclick=()=>openMissionAssignees(Number(b.dataset.missionAssign),mission,target));
  bindMissionDrag(target,mission);
}
async function refreshMissionDetail(target,id){const d=await apiFetch('/missions/'+id);const i=nexusMissionCache.findIndex(m=>m.id===id);if(i>=0)nexusMissionCache[i]=d.mission;else nexusMissionCache.push(d.mission);renderMissionDetail(target,d.mission);}
function openMissionAar(text){openModal('<div class="modal-head"><b>After Action Report</b><button class="icon-btn" data-close>✕</button></div><div class="modal-body"><pre class="mission-aar">'+escapeHtml(text||'AAR ainda não gerado.')+'</pre></div>');bindGlobalActions($('#modalCard'));}
function openMissionAssignees(stepId,mission,target){
  const step=mission.steps.find(s=>s.id===stepId);const selected=new Set(step.assignees.map(a=>Number(a.id)));
  openModal('<div class="modal-head"><b>Responsáveis • '+escapeHtml(step.title)+'</b><button class="icon-btn" data-close>✕</button></div><div class="modal-body"><div class="mission-member-picker">'+state.members.filter(m=>!['EXPULSO','DESLIGADO'].includes(m.status)).map(m=>'<label><input type="checkbox" value="'+m.id+'" '+(selected.has(Number(m.id))?'checked':'')+'><span><b>'+escapeHtml(m.nick)+'</b><small>'+escapeHtml(m.rank)+'</small></span></label>').join('')+'</div><button class="btn full" id="saveMissionAssignees">Salvar equipe</button></div>');bindGlobalActions($('#modalCard'));
  $('#saveMissionAssignees').onclick=async()=>{const ids=[...$('#modalCard').querySelectorAll('input[type=checkbox]:checked')].map(x=>Number(x.value));try{await apiFetch('/missions/steps/'+stepId+'/assignees',{method:'PUT',body:JSON.stringify({memberIds:ids})});closeModal();toast('Equipe atualizada.');await refreshMissionDetail(target,mission.id);}catch(e){toast(e.message);}};
}
function bindMissionDrag(target,mission){
  if(!can('MODERADOR')||mission.status==='ENCERRADA')return;
  const flow=$('#missionFlow');let dragged=null;
  $$('[data-mission-step]',flow).forEach(card=>{
    card.ondragstart=()=>{dragged=card;card.classList.add('dragging');};
    card.ondragend=()=>{card.classList.remove('dragging');dragged=null;};
    card.ondragover=e=>{e.preventDefault();if(!dragged||dragged===card)return;const rect=card.getBoundingClientRect();flow.insertBefore(dragged,e.clientY<rect.top+rect.height/2?card:card.nextSibling);};
  });
  flow.ondrop=async e=>{e.preventDefault();const ids=$$('[data-mission-step]',flow).map(x=>Number(x.dataset.missionStep));try{await apiFetch('/missions/'+mission.id+'/reorder',{method:'POST',body:JSON.stringify({stepIds:ids})});toast('Fluxo reordenado.');await refreshMissionDetail(target,mission.id);}catch(err){toast(err.message);}};
}

/* ------------------------------- Career Engine ----------------------------- */
async function renderNexusCareer(root){
  const memberId=Number(nexusCareerMemberId||state.user.id);
  root.innerHTML='<div class="nexus-section-head"><div><span>CAREER ENGINE</span><h2>Jornada militar dinâmica</h2><p>Mostra requisitos objetivos cumpridos e pendentes. A decisão de promoção continua humana e segue as regras da corporação.</p></div></div><div class="career-toolbar"><label>Militar<select class="input" id="careerMemberSelect">'+state.members.filter(m=>!['EXPULSO','DESLIGADO'].includes(m.status)).map(m=>'<option value="'+m.id+'" '+(Number(m.id)===memberId?'selected':'')+'>'+escapeHtml(m.nick)+' — '+escapeHtml(m.rank)+'</option>').join('')+'</select></label>'+(can('ADMINISTRADOR')?'<button class="btn ghost small" id="careerManageRules">Configurar requisitos</button>':'')+'</div><div id="careerSnapshot"><div class="profile-feed-loading"><span></span><p>Calculando jornada…</p></div></div>';
  const load=async id=>{nexusCareerMemberId=Number(id);const target=$('#careerSnapshot');try{const data=await apiFetch('/nexus/career/'+id);renderCareerSnapshot(target,data);}catch(e){target.innerHTML='<div class="notice-box">'+escapeHtml(e.message)+'</div>';}};
  $('#careerMemberSelect').onchange=e=>load(e.target.value);
  const manage=$('#careerManageRules');if(manage)manage.onclick=()=>openCareerRules();
  load(memberId);
}
function renderCareerSnapshot(target,data){
  const r=data.requirements||[];
  target.innerHTML='<section class="career-current"><div><small>PATENTE ATUAL</small><h3>'+escapeHtml(data.currentRank.name)+'</h3><span>'+escapeHtml(data.member.nick)+' • '+escapeHtml(data.member.division)+'</span></div><div class="career-score"><strong>'+(data.progress===null?'—':data.progress+'%')+'</strong><span>'+(data.nextRank?'para '+escapeHtml(data.nextRank.name):'topo da carreira')+'</span></div></section><div class="career-path">'+data.ranks.map(rank=>'<article class="'+String(rank.state).toLowerCase()+'"><i></i><span>'+escapeHtml(rank.name)+'</span></article>').join('')+'</div>'+(data.nextRank?'<section class="career-requirements"><header><span>PRÓXIMA PATENTE</span><h3>'+escapeHtml(data.nextRank.name)+'</h3></header>'+(r.length?r.map(x=>'<article class="'+(x.met?'met':'pending')+'"><span>'+(x.met?'✓':'○')+'</span><div><strong>'+escapeHtml(x.label)+'</strong><small>'+escapeHtml(x.type)+(x.trainingCourse?' • '+escapeHtml(x.trainingCourse.title):'')+'</small></div><b>'+(x.type==='TRAINING'?(x.met?'Concluído':'Pendente'):(x.current+' / '+x.target))+'</b></article>').join(''):'<div class="dpe-empty compact"><p>Nenhum requisito objetivo foi configurado para esta patente.</p></div>')+'</section>':'<div class="dpe-empty"><span>★</span><strong>Topo da carreira configurada</strong><p>Não há patente superior cadastrada.</p></div>');
}
async function openCareerRules(){
  try{
    const [rulesData,trainingData]=await Promise.all([apiFetch('/nexus/career-rules'),apiFetch('/trainings')]);
    const rules=rulesData.rules||[],courses=trainingData.courses||[];
    openModal('<div class="modal-head"><b>Requisitos de carreira</b><button class="icon-btn" data-close>✕</button></div><div class="modal-body career-rule-modal"><form id="careerRuleForm" class="phase33-form"><label>Patente destino<select class="input" name="rankId">'+state.ranks.map(r=>'<option value="'+r.id+'">'+escapeHtml(r.name)+'</option>').join('')+'</select></label><label>Tipo<select class="input" name="type"><option>HOURS</option><option>SHIFTS</option><option>LESSONS</option><option>DAYS_IN_RANK</option><option>TRAINING</option><option>DISCIPLINE_MAX</option><option>OPERATIONS</option></select></label><label>Meta<input class="input" name="targetValue" type="number" min="0" step="0.1" value="1"></label><label>Treinamento<select class="input" name="trainingCourseId"><option value="">—</option>'+courses.map(x=>'<option value="'+x.id+'">'+escapeHtml(x.title)+'</option>').join('')+'</select></label><label class="wide">Descrição objetiva<input class="input" name="label" maxlength="160" placeholder="Ex.: Completar 10 horas em base" required></label><button class="btn">Adicionar requisito</button></form><div class="career-rule-list">'+(rules.length?rules.map(x=>'<article><div><strong>'+escapeHtml(x.rank.name)+' • '+escapeHtml(x.label)+'</strong><small>'+escapeHtml(x.type)+' • meta '+x.targetValue+(x.trainingCourse?' • '+escapeHtml(x.trainingCourse.title):'')+'</small></div><button class="btn ghost small" data-career-rule-toggle="'+x.id+'" data-active="'+(x.active?'1':'0')+'">'+(x.active?'Desativar':'Ativar')+'</button><button class="btn danger small" data-career-rule-delete="'+x.id+'">Excluir</button></article>').join(''):'<p class="muted">Nenhuma regra criada.</p>')+'</div></div>');bindGlobalActions($('#modalCard'));
    $('#careerRuleForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{await apiFetch('/nexus/career-rules',{method:'POST',body:JSON.stringify({rankId:Number(fd.get('rankId')),type:fd.get('type'),targetValue:Number(fd.get('targetValue')),trainingCourseId:fd.get('trainingCourseId')?Number(fd.get('trainingCourseId')):null,label:fd.get('label')})});closeModal();toast('Requisito criado.');openCareerRules();}catch(err){toast(err.message);}};
    $$('[data-career-rule-toggle]',$('#modalCard')).forEach(b=>b.onclick=async()=>{try{await apiFetch('/nexus/career-rules/'+b.dataset.careerRuleToggle,{method:'PATCH',body:JSON.stringify({active:b.dataset.active!=='1'})});closeModal();openCareerRules();}catch(e){toast(e.message);}});
    $$('[data-career-rule-delete]',$('#modalCard')).forEach(b=>b.onclick=async()=>{if(!confirm('Excluir este requisito?'))return;try{await apiFetch('/nexus/career-rules/'+b.dataset.careerRuleDelete,{method:'DELETE'});closeModal();openCareerRules();}catch(e){toast(e.message);}});
  }catch(e){toast(e.message);}
}

/* ------------------------------ Identity Engine ---------------------------- */
let nexusIdentityQrUrl=null;

async function renderNexusIdentity(root){
  const selected=Number(nexusCareerMemberId||state.user.id);
  const canBrowse=can('MODERADOR');
  root.innerHTML='<div class="nexus-section-head"><div><span>IDENTITY ENGINE</span><h2>Carteira Digital DPE</h2><p>Identidade verificável por QR. O QR sempre consulta os dados atuais do System; mudança de patente, divisão ou status aparece imediatamente.</p></div></div>'+
    (canBrowse?'<div class="identity-toolbar"><label>Militar<select class="input" id="identityMember">'+state.members.map(m=>'<option value="'+m.id+'" '+(Number(m.id)===selected?'selected':'')+'>'+escapeHtml(m.nick)+' — '+escapeHtml(m.rank)+'</option>').join('')+'</select></label></div>':'')+
    '<div id="identityCardRoot"><div class="profile-feed-loading"><span></span><p>Emitindo identidade verificável…</p></div></div>';
  const load=async id=>{
    nexusCareerMemberId=Number(id);
    const target=$('#identityCardRoot');if(!target)return;
    target.innerHTML='<div class="profile-feed-loading"><span></span><p>Carregando identidade…</p></div>';
    try{
      const data=await apiFetch('/identity/member/'+id);
      if(nexusIdentityQrUrl){URL.revokeObjectURL(nexusIdentityQrUrl);nexusIdentityQrUrl=null;}
      const token=store.get('token')||sessionStorage.getItem('dcc_token');
      const qrResponse=await fetch('/api/identity/member/'+id+'/qr.svg',{headers:{Authorization:'Bearer '+token}});
      if(!qrResponse.ok)throw new Error('Não foi possível gerar o QR da identidade.');
      nexusIdentityQrUrl=URL.createObjectURL(await qrResponse.blob());
      const m=data.member,verifyUrl=location.origin+data.credential.verifyPath;
      target.innerHTML='<section class="digital-id-card"><div class="digital-id-main"><div class="digital-id-brand"><img src="/assets/login/brasao-dpe-v2.png" alt=""><span><b>POLÍCIA DPE</b><small>IDENTIDADE DIGITAL</small></span></div><div class="digital-id-person"><div class="digital-id-avatar"><img src="'+escapeHtml(m.avatarUrl||'/assets/login/brasao-dpe-v2.png')+'" alt=""></div><div><small>IDENTIFICAÇÃO</small><h3>'+escapeHtml(m.nick)+'</h3><p>'+escapeHtml(m.rank)+' • '+escapeHtml(m.division||'Sem divisão')+'</p><span class="status-'+String(m.status).toLowerCase()+'">'+escapeHtml(m.status)+'</span></div></div><footer><span>Emitida em '+new Date(data.credential.issuedAt).toLocaleString('pt-BR')+'</span><b>DPE // VERIFIED ID</b></footer></div><aside class="digital-id-qr"><img src="'+nexusIdentityQrUrl+'" alt="QR de verificação"><strong>VERIFICAR AO VIVO</strong><small>O QR não carrega dados estáticos.</small></aside></section>'+
        '<div class="digital-id-actions"><button class="btn" id="identityCopyLink">Copiar link de verificação</button><button class="btn ghost" id="identityReissue">Reemitir QR</button><button class="btn danger ghost" id="identityRevoke">Revogar</button></div>';
      $('#identityCopyLink').onclick=async()=>{try{await navigator.clipboard.writeText(verifyUrl);toast('Link de verificação copiado.');}catch{openModal('<div class="modal-head"><b>Link de verificação</b><button class="icon-btn" data-close>✕</button></div><div class="modal-body"><input class="input" value="'+escapeHtml(verifyUrl)+'" readonly></div>');bindGlobalActions($('#modalCard'));}};
      $('#identityReissue').onclick=async()=>{if(!confirm('Reemitir a identidade? O QR anterior deixará de ser válido.'))return;try{await apiFetch('/identity/member/'+id+'/issue',{method:'POST'});toast('Nova credencial emitida.');load(id);}catch(e){toast(e.message);}};
      $('#identityRevoke').onclick=async()=>{if(!confirm('Revogar esta identidade digital?'))return;try{await apiFetch('/identity/member/'+id+'/revoke',{method:'POST'});toast('Credencial revogada.');load(id);}catch(e){toast(e.message);}};
    }catch(e){target.innerHTML='<div class="notice-box">'+escapeHtml(e.message)+'</div>';}
  };
  const selector=$('#identityMember');if(selector)selector.onchange=e=>load(e.target.value);
  load(selected);
}

/* -------------------------------- War Room -------------------------------- */
function pageWarRoom(){
  return '<div class="war-room-stage" id="warRoomStage"><header class="war-room-top"><div class="war-room-brand"><img src="/assets/login/brasao-dpe-v2.png" alt=""><span><b>DPE WAR ROOM</b><small>OPERATIONAL DISPLAY</small></span></div><div class="war-room-clock"><strong id="warRoomClock">--:--:--</strong><span id="warRoomDate">--</span></div><div class="war-room-actions"><button id="warRoomFullscreen">Tela cheia</button><button id="warRoomExit">Sair</button></div></header><main id="warRoomRoot"><div class="profile-feed-loading"><span></span><p>Sincronizando operação…</p></div></main><footer class="war-room-footer"><span>LIVE DATA • SYSTEM DPE</span><span id="warRoomUpdated">Aguardando atualização</span></footer></div>';
}
function disposeWarRoom(){
  clearInterval(nexusWarRoomTimer);nexusWarRoomTimer=null;
  clearInterval(window._nexusWarClock);window._nexusWarClock=null;
  document.body.classList.remove('war-room-mode');
}
function bindWarRoomPage(){
  if(state.route!=='war-room'){disposeWarRoom();return;}
  document.body.classList.add('war-room-mode');
  const tick=()=>{const n=new Date();const c=$('#warRoomClock'),d=$('#warRoomDate');if(c)c.textContent=n.toLocaleTimeString('pt-BR');if(d)d.textContent=n.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});};
  tick();window._nexusWarClock=setInterval(tick,1000);
  const full=$('#warRoomFullscreen');if(full)full.onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch(e){toast('Tela cheia indisponível: '+e.message);}};
  const exit=$('#warRoomExit');if(exit)exit.onclick=()=>{history.replaceState(null,'','/#command-center');navigateTo('command-center',false);};
  const load=async()=>{
    const root=$('#warRoomRoot');if(!root||state.route!=='war-room')return;
    try{
      const data=await apiFetch('/nexus/war-room'),s=data.summary||{},stations=s.stations||{};
      root.innerHTML='<section class="war-room-kpis">'+[['EFETIVO',s.activeShifts],['BASE',stations.base],['O.C.',stations.oc],['O.B.',stations.ob],['AUSÊNCIA',stations.absence],['OPERAÇÕES',s.operations]].map(([l,v])=>'<article><small>'+l+'</small><strong>'+Number(v||0)+'</strong></article>').join('')+'</section>'+
        '<div class="war-room-grid"><section class="war-room-panel war-room-roster"><header><span>EFETIVO EM SERVIÇO</span><b>'+data.shifts.length+'</b></header><div>'+((data.shifts||[]).length?data.shifts.map(x=>'<article><div><strong>'+escapeHtml(x.member.nick)+'</strong><small>'+escapeHtml(x.member.rank)+' • '+escapeHtml(x.member.division)+'</small></div><span>'+escapeHtml(x.station)+'</span><time>'+Math.floor(x.durationMinutes/60)+'h '+(x.durationMinutes%60)+'m</time></article>').join(''):'<p class="muted">Sem turnos ativos.</p>')+'</div></section>'+
        '<section class="war-room-panel"><header><span>OPERAÇÕES ATIVAS</span><b>'+data.operations.length+'</b></header><div class="war-room-ops">'+((data.operations||[]).length?data.operations.map(o=>'<article><strong>'+escapeHtml(o.name)+'</strong><p>'+escapeHtml(o.location||o.objective||'')+'</p><span>'+o.participants.length+' participante(s)</span></article>').join(''):'<p class="muted">Nenhuma operação ativa.</p>')+'</div></section>'+
        '<section class="war-room-panel"><header><span>PRÓXIMAS ATIVIDADES</span><b>'+data.events.length+'</b></header><div class="war-room-events">'+((data.events||[]).length?data.events.map(e=>'<article><time>'+new Date(e.startsAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'</time><div><strong>'+escapeHtml(e.title)+'</strong><small>'+escapeHtml(e.type)+(e.division?' • '+escapeHtml(e.division):'')+'</small></div></article>').join(''):'<p class="muted">Nenhum evento nas próximas 12h.</p>')+'</div></section>'+
        '<section class="war-room-panel"><header><span>ALERTAS & COMUNICADOS</span><b>'+((data.signals||[]).length+(data.urgent||[]).length)+'</b></header><div class="war-room-alerts">'+(data.signals||[]).map(a=>'<article class="severity-'+String(a.severity).toLowerCase()+'"><b>'+escapeHtml(a.title)+'</b><p>'+escapeHtml(a.text)+'</p></article>').join('')+(data.urgent||[]).map(a=>'<article class="urgent"><b>'+escapeHtml(a.title)+'</b><p>'+a.pending+' ciência(s) pendente(s) de '+a.total+'.</p></article>').join('')+(!(data.signals||[]).length&&!(data.urgent||[]).length?'<p class="muted">Sem alertas relevantes.</p>':'')+'</div></section></div>';
      $('#warRoomUpdated').textContent='Atualizado '+new Date(data.generatedAt).toLocaleTimeString('pt-BR');
    }catch(e){root.innerHTML='<div class="notice-box">'+escapeHtml(e.message)+'</div>';}
  };
  load();nexusWarRoomTimer=setInterval(load,8000);
}

/* ---------------------------- Command Palette ------------------------------ */
function openNexusCommand(command){
  if(!command)return;
  if(command.type==='PROFILE'&&command.memberId){const m=state.members.find(x=>Number(x.id)===Number(command.memberId));if(m)return viewMemberProfile(m);}
  if(command.type==='NEXUS'){nexusTab='copilot';nexusPendingQuestion=command.question||'';return navigateTo('nexus');}
  if(command.type==='ROUTE'){
    if(command.route==='nexus'){nexusTab=command.tab||'copilot';if(command.memberId)nexusCareerMemberId=command.memberId;}
    window._nexusCommandPrefill=command.prefill||null;
    return navigateTo(command.route||'dashboard');
  }
}
function bindNexusPages(){
  if(state.route==='nexus')bindNexusPage();
  if(state.route==='war-room')bindWarRoomPage();else disposeWarRoom();
}
