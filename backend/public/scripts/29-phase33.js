let management360Tab='swaps';
let management360Cache={};

function phase33Hero(kicker,title,strong,description,icon,code){
  return '<section class="module-hero module-hero-compact phase33-hero"><div class="module-hero-copy"><span class="module-kicker">'+escapeHtml(kicker)+'</span><h1>'+escapeHtml(title)+' <strong>'+escapeHtml(strong)+'</strong></h1><p>'+escapeHtml(description)+'</p></div><div class="module-hero-emblem"><span>'+icon+'</span><b>'+escapeHtml(strong.toUpperCase())+'</b><small>PHASE 3.3</small></div><div class="module-hero-code">'+escapeHtml(code)+'</div></section>';
}
function managementTabs(){
  const tabs=[
    ['swaps','🔁','Plantões'],
    ['training','🎓','Treinamentos'],
    ['discipline','⚖️','Disciplina'],
    ['recruitment','🧭','Recrutamento'],
    ['calendar','◫','Agenda'],
    ['approvals','✓','Aprovações'],
  ].filter(([id])=>!['recruitment','approvals'].includes(id)||can('MODERADOR'));
  return '<div class="phase33-tabs">'+tabs.map(([id,icon,label])=>'<button class="'+(management360Tab===id?'active':'')+'" data-management-tab="'+id+'"><span>'+icon+'</span>'+label+'</button>').join('')+'</div>';
}
function pageManagement360(){
  return '<div class="dpe-module-page management360-page">'+
    phase33Hero('GESTÃO INTEGRADA','Central','360','Plantões, certificações, disciplina, recrutamento, agenda e decisões em uma única central.','◎','DPE // MANAGEMENT 360')+
    managementTabs()+
    '<section class="card phase33-workspace"><div id="management360Root"><div class="profile-feed-loading"><span></span><p>Carregando módulo…</p></div></div></section>'+
  '</div>';
}
function setManagementTab(tab){
  management360Tab=tab;
  document.querySelectorAll('[data-management-tab]').forEach(b=>b.classList.toggle('active',b.dataset.managementTab===tab));
  loadManagement360();
}
async function loadManagement360(){
  const root=$('#management360Root');if(!root||state.route!=='management-360')return;
  root.innerHTML='<div class="profile-feed-loading"><span></span><p>Carregando '+escapeHtml(management360Tab)+'…</p></div>';
  try{
    if(management360Tab==='swaps')return loadShiftSwapPanel(root);
    if(management360Tab==='training')return loadTrainingPanel(root);
    if(management360Tab==='discipline')return loadDisciplinePanel(root);
    if(management360Tab==='recruitment')return loadRecruitmentPanel(root);
    if(management360Tab==='calendar')return loadCalendarPanel(root);
    if(management360Tab==='approvals')return loadApprovalsPanel(root);
  }catch(e){root.innerHTML='<div class="notice-box">'+escapeHtml(e.message)+'</div>';}
}
function bindManagement360Page(){
  if(state.route!=='management-360')return;
  $$('[data-management-tab]').forEach(b=>b.onclick=()=>setManagementTab(b.dataset.managementTab));
  loadManagement360();
}

function pageIntelligence(){
  if(!can('ADMINISTRADOR'))return emptyState('🔒','Inteligência Operacional é restrita ao Administrativo.');
  return '<div class="dpe-module-page intelligence-page">'+phase33Hero('COMANDO / INTELIGÊNCIA','Inteligência','Operacional','Tendências e sinais calculados a partir dos dados reais da corporação.','◈','DPE // OPERATIONAL INTELLIGENCE')+'<div id="intelligenceRoot"><div class="profile-feed-loading"><span></span><p>Analisando corporação…</p></div></div></div>';
}
function pageExecutive(){
  if(state.user?.role!=='SUPREMO')return emptyState('🔒','Painel Executivo exclusivo do Supremo.');
  return '<div class="dpe-module-page executive-page">'+phase33Hero('SUPREMO / VISÃO EXECUTIVA','Painel','Executivo','Visão consolidada de efetivo, disciplina, formação, recrutamento e atividade institucional.','◆','DPE // EXECUTIVE OVERVIEW')+'<div id="executiveRoot"><div class="profile-feed-loading"><span></span><p>Consolidando indicadores…</p></div></div></div>';
}
function pageFieldAudit(){
  if(!can('ADMINISTRADOR'))return emptyState('🔒','Log por Campo é restrito ao Administrativo.');
  return '<div class="dpe-module-page field-audit-page">'+phase33Hero('AUDITORIA / ALTERAÇÕES','Log por','Campo','Veja exatamente o que mudou, valor anterior, novo valor, autor e origem da alteração.','≡','DPE // FIELD CHANGE LOG')+'<section class="card field-audit-card"><header><div><span>HISTÓRICO ESTRUTURADO</span><h2>Alterações de cadastro</h2></div><button class="btn ghost small" id="fieldAuditRefresh">Atualizar</button></header><div class="field-audit-filters"><input class="input" id="fieldAuditMember" placeholder="Nick do militar"><input class="input" id="fieldAuditField" placeholder="Campo: Patente, Divisão..."></div><div id="fieldAuditRows"><p class="muted">Carregando…</p></div></section></div>';
}

async function loadShiftSwapPanel(root){
  const now=new Date(),to=new Date(Date.now()+60*86400000);
  const [swapsData,schedulesData]=await Promise.all([
    apiFetch('/shift-swaps'),
    apiFetch('/schedules?from='+encodeURIComponent(now.toISOString())+'&to='+encodeURIComponent(to.toISOString())),
  ]);
  const swaps=swapsData.swaps||[],schedules=(schedulesData.schedules||[]).filter(s=>Number(s.member?.id)===Number(state.user.id)&&new Date(s.endsAt)>now);
  root.innerHTML='<div class="phase33-section-head"><div><span>TROCAS E PLANTÕES</span><h2>Troca de escala</h2><p>Ofereça seu plantão para outro militar. A troca só é aplicada depois da aceitação e aprovação.</p></div></div>'+
  '<div class="phase33-grid two"><section class="phase33-panel"><h3>Nova solicitação</h3><form id="swapForm" class="phase33-form"><label>Minha escala<select class="input" id="swapSchedule" required><option value="">Selecione</option>'+schedules.map(s=>'<option value="'+s.id+'">'+new Date(s.startsAt).toLocaleString('pt-BR')+' → '+new Date(s.endsAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'</option>').join('')+'</select></label><label>Substituto<select class="input" id="swapOfferedTo" required><option value="">Selecione</option>'+state.members.filter(m=>m.id!==state.user.id&&m.status==='ATIVO').sort((a,b)=>a.nick.localeCompare(b.nick,'pt-BR')).map(m=>'<option value="'+m.id+'">'+escapeHtml(m.nick)+' — '+escapeHtml(m.rank)+'</option>').join('')+'</select></label><label class="wide">Motivo<textarea class="input" id="swapReason" rows="3" maxlength="500" required></textarea></label><button class="btn">Solicitar troca</button></form></section>'+
  '<section class="phase33-panel"><h3>Fluxo</h3><div class="phase33-flow"><span>1. Militar solicita</span><span>2. Substituto aceita</span><span>3. Moderação aprova</span><span>4. Escala é transferida</span></div></section></div>'+
  '<div class="phase33-list" id="swapRows">'+(swaps.length?swaps.map(s=>'<article class="phase33-row"><div><small>'+escapeHtml(s.status)+'</small><strong>'+escapeHtml(s.requester.nick)+' → '+escapeHtml(s.offeredTo?.nick||'—')+'</strong><span>'+(s.schedule?new Date(s.schedule.startsAt).toLocaleString('pt-BR'):'Escala indisponível')+'</span></div><p>'+escapeHtml(s.reason)+'</p><div class="phase33-row-actions">'+(s.status==='PENDENTE'&&Number(s.offeredTo?.id)===Number(state.user.id)?'<button class="btn small" data-swap-accept="'+s.id+'">Aceitar</button><button class="btn ghost small" data-swap-reject="'+s.id+'">Recusar</button>':'')+(s.status==='ACEITO'&&can('MODERADOR')?'<button class="btn small" data-swap-approve="'+s.id+'">Aprovar troca</button>':'')+'</div></article>').join(''):'<div class="dpe-empty compact"><p>Nenhuma troca registrada.</p></div>')+'</div>';
  const form=$('#swapForm');if(form)form.onsubmit=async e=>{e.preventDefault();try{await apiFetch('/shift-swaps',{method:'POST',body:JSON.stringify({scheduleId:Number($('#swapSchedule').value),offeredToId:Number($('#swapOfferedTo').value),reason:$('#swapReason').value.trim()})});toast('Troca enviada ao substituto.');loadShiftSwapPanel(root);}catch(err){toast(err.message);}};
  $$('[data-swap-accept]',root).forEach(b=>b.onclick=()=>respondSwap(b.dataset.swapAccept,true,root));
  $$('[data-swap-reject]',root).forEach(b=>b.onclick=()=>respondSwap(b.dataset.swapReject,false,root));
  $$('[data-swap-approve]',root).forEach(b=>b.onclick=async()=>{try{await apiFetch('/shift-swaps/'+b.dataset.swapApprove+'/approve',{method:'POST'});toast('Troca aprovada e escala transferida.');loadShiftSwapPanel(root);}catch(e){toast(e.message);}});
}
async function respondSwap(id,accept,root){try{await apiFetch('/shift-swaps/'+id+'/respond',{method:'POST',body:JSON.stringify({accept})});toast(accept?'Troca aceita.':'Troca recusada.');loadShiftSwapPanel(root);}catch(e){toast(e.message);}}


async function loadTrainingPanel(root){
  const data=await apiFetch('/trainings'),courses=data.courses||[];
  root.innerHTML='<div class="phase33-section-head"><div><span>FORMAÇÃO E CERTIFICAÇÃO</span><h2>Treinamentos</h2><p>Cursos com pré-requisitos, instrutor, resultado, validade e certificado automático no perfil.</p></div></div>'+
  (can('ADMINISTRADOR')?'<section class="phase33-panel"><h3>Novo treinamento</h3><form id="trainingCourseForm" class="phase33-form four"><label>Título<input class="input" id="trainingTitle" maxlength="140" required></label><label>Validade (dias)<input class="input" id="trainingValidity" type="number" min="1" max="3650"></label><label>Pré-requisito<select class="input" id="trainingPrerequisite"><option value="">Nenhum</option>'+courses.filter(c=>c.active).map(c=>'<option value="'+c.id+'">'+escapeHtml(c.title)+'</option>').join('')+'</select></label><label class="wide">Pré-requisitos adicionais<input class="input" id="trainingPrerequisiteText" maxlength="500"></label><label class="wide">Descrição<textarea class="input" id="trainingDescription" rows="3" maxlength="1500" required></textarea></label><button class="btn">Criar treinamento</button></form></section>':'')+
  '<div class="training-course-grid">'+(courses.length?courses.map(course=>trainingCourseCard(course)).join(''):'<div class="dpe-empty"><p>Nenhum treinamento cadastrado.</p></div>')+'</div>';
  const form=$('#trainingCourseForm');if(form)form.onsubmit=async e=>{e.preventDefault();try{await apiFetch('/trainings',{method:'POST',body:JSON.stringify({title:$('#trainingTitle').value.trim(),description:$('#trainingDescription').value.trim(),validityDays:$('#trainingValidity').value?Number($('#trainingValidity').value):null,prerequisiteId:$('#trainingPrerequisite').value?Number($('#trainingPrerequisite').value):null,prerequisiteText:$('#trainingPrerequisiteText').value.trim()})});toast('Treinamento criado.');loadTrainingPanel(root);}catch(err){toast(err.message);}};
  $$('[data-training-enroll]',root).forEach(b=>b.onclick=()=>enrollTraining(Number(b.dataset.trainingEnroll),root));
  $$('[data-training-complete]',root).forEach(b=>b.onclick=()=>completeTraining(Number(b.dataset.trainingComplete),root));
  $$('[data-training-toggle]',root).forEach(b=>b.onclick=async()=>{try{await apiFetch('/trainings/'+b.dataset.trainingToggle,{method:'PATCH',body:JSON.stringify({active:b.dataset.active!=='1'})});loadTrainingPanel(root);}catch(e){toast(e.message);}});
}
function trainingCourseCard(course){
  const my=(course.enrollments||[]).find(e=>Number(e.member.id)===Number(state.user.id));
  const enrollments=course.enrollments||[];
  return '<article class="training-course-card '+(course.active?'':'inactive')+'"><header><div><small>'+(course.active?'ATIVO':'INATIVO')+'</small><h3>'+escapeHtml(course.title)+'</h3></div>'+(course.validityDays?'<span>'+course.validityDays+' dias</span>':'<span>Sem validade</span>')+'</header><p>'+escapeHtml(course.description)+'</p>'+(course.prerequisite?'<div class="training-prereq">Pré-requisito: <b>'+escapeHtml(course.prerequisite.title)+'</b></div>':'')+(course.prerequisiteText?'<div class="training-prereq">'+escapeHtml(course.prerequisiteText)+'</div>':'')+'<div class="training-enrollment-summary">'+(my?'<span>Meu status: <b>'+escapeHtml(my.status)+'</b></span>':'<span>Você ainda não está matriculado</span>')+(can('MODERADOR')?'<span>'+enrollments.length+' matrícula(s)</span>':'')+'</div>'+(can('MODERADOR')&&enrollments.length?'<div class="training-enrollment-list">'+enrollments.map(e=>'<article><div><strong>'+escapeHtml(e.member.nick)+'</strong><small>'+escapeHtml(e.status)+(e.score!==null?' • '+e.score+' pts':'')+'</small></div>'+(['MATRICULADO','EM_CURSO'].includes(e.status)?'<button class="btn ghost small" data-training-complete="'+e.id+'">Concluir</button>':'')+'</article>').join('')+'</div>':'')+'<footer>'+(can('MODERADOR')&&course.active?'<button class="btn small" data-training-enroll="'+course.id+'">Matricular militar</button>':'')+(can('ADMINISTRADOR')?'<button class="btn ghost small" data-training-toggle="'+course.id+'" data-active="'+(course.active?'1':'0')+'">'+(course.active?'Desativar':'Reativar')+'</button>':'')+'</footer></article>';
}
async function enrollTraining(courseId,root){
  const nick=prompt('Nick do militar a matricular:');if(!nick)return;
  const member=state.members.find(m=>m.nick.toLowerCase()===nick.trim().toLowerCase());if(!member)return toast('Militar não encontrado.');
  try{await apiFetch('/trainings/'+courseId+'/enroll',{method:'POST',body:JSON.stringify({memberId:member.id})});toast('Matrícula realizada.');loadTrainingPanel(root);}catch(e){toast(e.message);}
}
async function completeTraining(enrollmentId,root){
  const result=prompt('Resultado: digite APROVADO ou REPROVADO','APROVADO');if(!result)return;
  const approved=result.trim().toUpperCase()==='APROVADO';
  const scoreRaw=prompt('Nota de 0 a 100 (opcional):','');
  const notes=prompt('Observações do instrutor (opcional):','')||'';
  try{await apiFetch('/trainings/enrollments/'+enrollmentId+'/complete',{method:'POST',body:JSON.stringify({approved,score:scoreRaw===''?null:Number(scoreRaw),notes})});toast(approved?'Certificação emitida.':'Resultado registrado.');loadTrainingPanel(root);}catch(e){toast(e.message);}
}


async function loadDisciplinePanel(root){
  const data=await apiFetch('/discipline'),actions=data.actions||[];
  root.innerHTML='<div class="phase33-section-head"><div><span>DISCIPLINA E CONDUTA</span><h2>Advertências e punições</h2><p>Registros com tipo, pontos, provas, validade e histórico automático no perfil militar.</p></div></div>'+
  (can('MODERADOR')?'<section class="phase33-panel"><h3>Nova medida disciplinar</h3><form id="disciplineForm" class="phase33-form four"><label>Militar<select class="input" id="disciplineMember" required><option value="">Selecione</option>'+state.members.filter(m=>!['EXPULSO','DESLIGADO'].includes(m.status)).map(m=>'<option value="'+m.id+'">'+escapeHtml(m.nick)+' — '+escapeHtml(m.rank)+'</option>').join('')+'</select></label><label>Tipo<select class="input" id="disciplineType"><option>VERBAL</option><option>ESCRITA</option><option>SUSPENSAO</option><option>PONTOS</option><option>OUTRA</option></select></label><label>Pontos<input class="input" id="disciplinePoints" type="number" min="0" max="100" value="0"></label><label>Término<input class="input" id="disciplineEnd" type="datetime-local"></label><label class="wide">Motivo<textarea class="input" id="disciplineReason" rows="3" maxlength="1500" required></textarea></label><label class="wide">Provas / links<input class="input" id="disciplineEvidence" maxlength="2000"></label><button class="btn">Registrar medida</button></form></section>':'')+
  '<div class="phase33-list">'+(actions.length?actions.map(a=>'<article class="discipline-row '+(a.active?'active':'closed')+'"><div><small>'+escapeHtml(a.type)+(a.points?' • '+a.points+' ponto(s)':'')+'</small><strong>'+escapeHtml(a.member.nick)+'</strong><span>'+escapeHtml(a.member.rank)+' • por '+escapeHtml(a.createdBy)+'</span></div><p>'+escapeHtml(a.reason)+'</p><div><span>Total ativo: <b>'+a.totalActivePoints+'</b> pts</span>'+(a.endsAt?'<span>Até '+new Date(a.endsAt).toLocaleString('pt-BR')+'</span>':'')+'</div>'+(can('ADMINISTRADOR')&&a.active?'<button class="btn ghost small" data-discipline-close="'+a.id+'">Encerrar</button>':'')+'</article>').join(''):'<div class="dpe-empty"><p>Nenhuma medida disciplinar registrada.</p></div>')+'</div>';
  const form=$('#disciplineForm');if(form)form.onsubmit=async e=>{e.preventDefault();try{await apiFetch('/discipline',{method:'POST',body:JSON.stringify({memberId:Number($('#disciplineMember').value),type:$('#disciplineType').value,points:Number($('#disciplinePoints').value||0),endsAt:$('#disciplineEnd').value?new Date($('#disciplineEnd').value).toISOString():null,reason:$('#disciplineReason').value.trim(),evidence:$('#disciplineEvidence').value.trim()})});toast('Medida disciplinar registrada.');loadDisciplinePanel(root);}catch(err){toast(err.message);}};
  $$('[data-discipline-close]',root).forEach(b=>b.onclick=async()=>{try{await apiFetch('/discipline/'+b.dataset.disciplineClose+'/close',{method:'POST'});toast('Medida encerrada.');loadDisciplinePanel(root);}catch(e){toast(e.message);}});
}


async function loadRecruitmentPanel(root){
  if(!can('MODERADOR'))return root.innerHTML='<div class="notice-box">Recrutamento é restrito à moderação.</div>';
  const data=await apiFetch('/recruitment'),candidates=data.candidates||[];
  const stages=['RECRUTAMENTO','ENTREVISTA','AULA','EM_ANALISE','APROVADO','REPROVADO','EFETIVADO'];
  root.innerHTML='<div class="phase33-section-head"><div><span>FUNIL DE ENTRADA</span><h2>Recrutamento</h2><p>Acompanhe o candidato da abordagem inicial até a efetivação.</p></div></div>'+
  '<section class="phase33-panel"><h3>Novo candidato</h3><form id="recruitmentForm" class="phase33-form"><label>Nick Habbo<input class="input" id="recruitmentNick" maxlength="80" required></label><label>Entrevistador<select class="input" id="recruitmentInterviewer"><option value="'+state.user.id+'">Eu — '+escapeHtml(state.user.nick)+'</option>'+state.members.filter(m=>can('MODERADOR')&&['MODERADOR','ADMINISTRADOR','DONO','SUPREMO'].includes(m.role)&&m.id!==state.user.id).map(m=>'<option value="'+m.id+'">'+escapeHtml(m.nick)+'</option>').join('')+'</select></label><label class="wide">Observações<textarea class="input" id="recruitmentNotes" rows="3" maxlength="1500"></textarea></label><button class="btn">Adicionar candidato</button></form></section>'+
  '<div class="recruitment-board">'+stages.map(stage=>'<section><header><span>'+escapeHtml(stage.replace('_',' '))+'</span><b>'+candidates.filter(c=>c.status===stage).length+'</b></header><div>'+candidates.filter(c=>c.status===stage).map(candidate=>'<article class="recruitment-card"><strong>'+escapeHtml(candidate.habboName)+'</strong><small>'+(candidate.interviewer?'Responsável: '+escapeHtml(candidate.interviewer.nick):'Sem responsável')+'</small><p>'+escapeHtml(candidate.notes||'Sem observações.')+'</p><div><button class="btn ghost small" data-recruit-stage="'+candidate.id+'">Mover etapa</button>'+(stage==='APROVADO'?'<button class="btn small" data-recruit-link="'+candidate.id+'" data-recruit-nick="'+escapeHtml(candidate.habboName)+'">Efetivar</button>':'')+'</div></article>').join('')+'</div></section>').join('')+'</div>';
  $('#recruitmentForm').onsubmit=async e=>{e.preventDefault();try{await apiFetch('/recruitment',{method:'POST',body:JSON.stringify({habboName:$('#recruitmentNick').value.trim(),notes:$('#recruitmentNotes').value.trim(),interviewerId:Number($('#recruitmentInterviewer').value)})});toast('Candidato adicionado.');loadRecruitmentPanel(root);}catch(err){toast(err.message);}};
  $$('[data-recruit-stage]',root).forEach(b=>b.onclick=async()=>{const current=candidates.find(x=>x.id==b.dataset.recruitStage);const next=prompt('Nova etapa:\n'+stages.join(' / '),current.status);if(!next)return;const notes=prompt('Atualizar observações (opcional):',current.notes||'');try{await apiFetch('/recruitment/'+current.id,{method:'PATCH',body:JSON.stringify({status:next.trim().toUpperCase(),notes:notes===null?current.notes:notes})});toast('Etapa atualizada.');loadRecruitmentPanel(root);}catch(e){toast(e.message);}});
  $$('[data-recruit-link]',root).forEach(b=>b.onclick=async()=>{const nick=prompt('Nick do militar já cadastrado no System:',b.dataset.recruitNick);if(!nick)return;const member=state.members.find(m=>m.nick.toLowerCase()===nick.trim().toLowerCase());if(!member)return toast('Cadastre o militar no System antes de efetivar.');try{await apiFetch('/recruitment/'+b.dataset.recruitLink,{method:'PATCH',body:JSON.stringify({linkedMemberId:member.id})});toast('Candidato efetivado e vinculado.');loadRecruitmentPanel(root);}catch(e){toast(e.message);}});
}


async function loadCalendarPanel(root){
  const now=new Date(),from=new Date(now.getFullYear(),now.getMonth(),1),to=new Date(now.getFullYear(),now.getMonth()+2,1);
  const data=await apiFetch('/calendar?from='+encodeURIComponent(from.toISOString())+'&to='+encodeURIComponent(to.toISOString()));
  const items=data.items||[];
  const grouped=new Map();
  items.forEach(item=>{const key=new Date(item.startsAt).toISOString().slice(0,10);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(item);});
  root.innerHTML='<div class="phase33-section-head"><div><span>AGENDA INSTITUCIONAL</span><h2>Calendário integrado</h2><p>Escalas, aulas, operações, afastamentos e eventos oficiais no mesmo calendário.</p></div></div>'+
  (can('MODERADOR')?'<section class="phase33-panel"><h3>Novo evento institucional</h3><form id="institutionalEventForm" class="phase33-form four"><label>Título<input class="input" id="eventTitle" maxlength="160" required></label><label>Tipo<select class="input" id="eventType"><option>REUNIAO</option><option>EVENTO</option><option>TREINAMENTO</option><option>OPERACAO</option><option>OUTRO</option></select></label><label>Início<input class="input" id="eventStart" type="datetime-local" required></label><label>Fim<input class="input" id="eventEnd" type="datetime-local"></label><label>Escopo<select class="input" id="eventScope"><option value="ALL">Toda DPE</option><option value="DIVISION">Divisão</option></select></label><label>Divisão<select class="input" id="eventDivision"><option value="">Selecione</option>'+state.divisions.map(d=>'<option value="'+d.id+'">'+escapeHtml(d.sig)+' — '+escapeHtml(d.name)+'</option>').join('')+'</select></label><label class="wide">Descrição<input class="input" id="eventDescription" maxlength="1200"></label><button class="btn">Criar evento</button></form></section>':'')+
  '<div class="calendar-agenda">'+([...grouped.entries()].length?[...grouped.entries()].map(([day,list])=>'<section class="calendar-day"><header><strong>'+new Date(day+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})+'</strong><span>'+list.length+' item(ns)</span></header>'+list.map(item=>'<article class="calendar-item type-'+String(item.type).toLowerCase()+'"><time>'+new Date(item.startsAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'</time><div><small>'+escapeHtml(item.type)+' • '+escapeHtml(item.source)+'</small><strong>'+escapeHtml(item.title)+'</strong><p>'+escapeHtml(item.description||'')+'</p></div></article>').join('')+'</section>').join(''):'<div class="dpe-empty"><p>Nenhum compromisso no período.</p></div>')+'</div>';
  const form=$('#institutionalEventForm');if(form){const start=new Date(Date.now()+3600000);$('#eventStart').value=new Date(start.getTime()-start.getTimezoneOffset()*60000).toISOString().slice(0,16);form.onsubmit=async e=>{e.preventDefault();try{await apiFetch('/calendar',{method:'POST',body:JSON.stringify({title:$('#eventTitle').value.trim(),type:$('#eventType').value,startsAt:new Date($('#eventStart').value).toISOString(),endsAt:$('#eventEnd').value?new Date($('#eventEnd').value).toISOString():null,scope:$('#eventScope').value,divisionId:$('#eventScope').value==='DIVISION'?Number($('#eventDivision').value):null,description:$('#eventDescription').value.trim()})});toast('Evento adicionado à agenda.');loadCalendarPanel(root);}catch(err){toast(err.message);}};}
}

async function loadApprovalsPanel(root){
  if(!can('MODERADOR'))return root.innerHTML='<div class="notice-box">Central de Aprovações é restrita à moderação.</div>';
  const data=await apiFetch('/management/approvals'),items=data.items||[],counts=data.counts||{};
  root.innerHTML='<div class="phase33-section-head"><div><span>DECISÕES PENDENTES</span><h2>Central de Aprovações</h2><p>Tudo que precisa de análise em uma fila única e priorizada por antiguidade.</p></div><strong class="phase33-total">'+Number(counts.total||0)+'</strong></div>'+
  '<div class="approval-kpis">'+['requirements','leaves','swaps','occurrences','recruitment'].map(key=>'<article><small>'+escapeHtml(key.toUpperCase())+'</small><strong>'+Number(counts[key]||0)+'</strong></article>').join('')+'</div>'+
  '<div class="phase33-list">'+(items.length?items.map(item=>'<article class="approval-row"><div><small>'+escapeHtml(item.type)+'</small><strong>'+escapeHtml(item.title)+'</strong><span>'+escapeHtml(item.subtitle||'')+'</span></div><time>'+new Date(item.createdAt).toLocaleString('pt-BR')+'</time><button class="btn ghost small" data-approval-route="'+escapeHtml(item.route)+'" data-approval-tab="'+escapeHtml(item.tab||'')+'">Analisar</button></article>').join(''):'<div class="dpe-empty"><span>✓</span><strong>Fila zerada</strong><p>Nenhuma decisão pendente.</p></div>')+'</div>';
  $$('[data-approval-route]',root).forEach(b=>b.onclick=()=>{if(b.dataset.approvalRoute==='management-360'&&b.dataset.approvalTab){management360Tab=b.dataset.approvalTab;setManagementTab(management360Tab);}else navigateTo(b.dataset.approvalRoute);});
}

async function loadIntelligence(){
  const root=$('#intelligenceRoot');if(!root)return;
  try{
    const data=await apiFetch('/management/intelligence'),k=data.kpis||{};
    root.innerHTML='<section class="intelligence-kpis">'+[
      ['Efetivo ativo',k.activeMembers,'militares'],
      ['Horas / 30d',k.hours30+'h',(k.hoursDelta>=0?'+':'')+k.hoursDelta+'% vs. período anterior'],
      ['Aulas / 30d',k.lessons30,(k.lessonsDelta>=0?'+':'')+k.lessonsDelta+'%'],
      ['Ocorrências abertas',k.openOccurrences,'em análise ou abertas'],
      ['Afastados agora',k.awayNow,'militares'],
      ['Certificações',k.expiringTraining,'vencem em 30 dias'],
      ['Metas ativas',k.activeGoals,'objetivos'],
      ['Metas vencidas',k.expiredGoals,'precisam de revisão'],
    ].map(([a,b,d])=>'<article><small>'+escapeHtml(a)+'</small><strong>'+escapeHtml(String(b))+'</strong><span>'+escapeHtml(d)+'</span></article>').join('')+'</section>'+
    '<div class="intelligence-layout"><section class="card intelligence-signals"><header><div><span>SINAIS</span><h2>Pontos de atenção</h2></div></header><div>'+(data.signals?.length?data.signals.map(s=>'<article class="signal-'+s.level.toLowerCase()+'"><span>'+escapeHtml(s.level)+'</span><div><strong>'+escapeHtml(s.title)+'</strong><p>'+escapeHtml(s.text)+'</p></div></article>').join(''):'<div class="dpe-empty compact"><p>Nenhum sinal operacional relevante no momento.</p></div>')+'</div></section>'+
    '<section class="card intelligence-divisions"><header><div><span>DIVISÕES</span><h2>Cobertura dos últimos 30 dias</h2></div></header><div>'+data.divisions.map(d=>'<article><div><strong>'+escapeHtml(d.sig)+'</strong><small>'+escapeHtml(d.name)+'</small></div><span>'+d.active+'/'+d.members+' ativos</span><span>'+d.hours30+'h</span><span>'+d.away+' afast.</span></article>').join('')+'</div></section></div>';
  }catch(e){root.innerHTML='<div class="notice-box">'+escapeHtml(e.message)+'</div>';}
}
async function loadExecutive(){
  const root=$('#executiveRoot');if(!root)return;
  try{
    const data=await apiFetch('/management/executive'),h=data.headline||{};
    root.innerHTML='<section class="executive-headline">'+[
      ['Efetivo',h.totalMembers,h.active+' ativos'],
      ['Promoções 30d',h.promotions30,(h.promotionDelta>=0?'+':'')+h.promotionDelta+'%'],
      ['Ocorrências',h.openOccurrences,'abertas'],
      ['Disciplina',h.disciplineActive,h.disciplinePoints+' pontos ativos'],
      ['Certificados',h.trainingApproved,'concluídos em 30d'],
      ['Vencimentos',h.trainingExpiring,'certificações em 30d'],
      ['Operações',h.operations30,'criadas em 30d'],
      ['Ciências urgentes',h.urgentPending,'pendentes'],
    ].map(([l,v,s])=>'<article><small>'+escapeHtml(l)+'</small><strong>'+escapeHtml(String(v))+'</strong><span>'+escapeHtml(s)+'</span></article>').join('')+'</section>'+
    '<div class="executive-grid"><section class="card"><header><span>STATUS DO EFETIVO</span><h2>Distribuição</h2></header><div class="executive-bars">'+Object.entries(data.statusCounts||{}).map(([k,v])=>'<div><span>'+escapeHtml(k)+'</span><b>'+v+'</b></div>').join('')+'</div></section><section class="card"><header><span>RECRUTAMENTO</span><h2>Funil atual</h2></header><div class="executive-bars">'+Object.entries(data.recruitment||{}).map(([k,v])=>'<div><span>'+escapeHtml(k)+'</span><b>'+v+'</b></div>').join('')+'</div></section><section class="card executive-divisions"><header><span>DIVISÕES</span><h2>Distribuição do efetivo</h2></header><div>'+data.divisions.map(d=>'<article><strong>'+escapeHtml(d.sig)+'</strong><span>'+escapeHtml(d.name)+'</span><b>'+d.members+'</b></article>').join('')+'</div></section></div>';
  }catch(e){root.innerHTML='<div class="notice-box">'+escapeHtml(e.message)+'</div>';}
}
async function loadFieldAudit(){
  const root=$('#fieldAuditRows');if(!root)return;
  try{
    const nick=$('#fieldAuditMember')?.value.trim()||'',field=$('#fieldAuditField')?.value.trim()||'';
    const member=nick?state.members.find(m=>m.nick.toLowerCase()===nick.toLowerCase()):null;
    const qs=new URLSearchParams();if(member)qs.set('memberId',member.id);if(field)qs.set('field',field);
    const data=await apiFetch('/management/field-changes?'+qs),changes=data.changes||[];
    root.innerHTML=changes.length?changes.map(x=>'<article class="field-change-row"><time>'+new Date(x.createdAt).toLocaleString('pt-BR')+'</time><div><strong>'+escapeHtml(x.target.nick)+'</strong><small>'+escapeHtml(x.field)+' • '+escapeHtml(x.source)+'</small></div><span class="field-before">'+escapeHtml(x.fromValue??'—')+'</span><em>→</em><span class="field-after">'+escapeHtml(x.toValue??'—')+'</span><div><small>por</small><b>'+escapeHtml(x.actor.nick)+'</b></div></article>').join(''):'<div class="dpe-empty"><p>Nenhuma alteração encontrada.</p></div>';
  }catch(e){root.innerHTML='<div class="notice-box">'+escapeHtml(e.message)+'</div>';}
}
function bindPhase33Pages(){
  bindManagement360Page();
  if(state.route==='intelligence')loadIntelligence();
  if(state.route==='executive')loadExecutive();
  if(state.route==='field-audit'){
    let timer;$('#fieldAuditRefresh').onclick=loadFieldAudit;$('#fieldAuditMember').oninput=$('#fieldAuditField').oninput=()=>{clearTimeout(timer);timer=setTimeout(loadFieldAudit,250);};loadFieldAudit();
  }
}
