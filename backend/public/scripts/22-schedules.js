let scheduleView='month';
function scheduleDateTimeLocal(value){
  const date=value?new Date(value):new Date(Date.now()+3600000);
  const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
}
function scheduleStatusClass(code){return 'schedule-status-'+String(code||'AGENDADO').toLowerCase();}
function scheduleCard(item){
  const start=new Date(item.startsAt),end=new Date(item.endsAt);
  return `<article class="schedule-row">
    <div class="schedule-person"><strong>${escapeHtml(item.member.nick)}</strong><span>${escapeHtml(item.member.rank)} • ${escapeHtml(item.member.division)}</span></div>
    <div><strong>${start.toLocaleDateString('pt-BR')}</strong><span>${start.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}–${end.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div>
    <div><span class="schedule-status ${scheduleStatusClass(item.attendance?.code)}">${escapeHtml(item.attendance?.label||'Agendado')}</span>${item.excused&&item.excuseReason?`<small>${escapeHtml(item.excuseReason)}</small>`:''}</div>
    <div><span>${escapeHtml(item.note||'Sem observação')}</span><small>Criado por ${escapeHtml(item.createdBy||'System')}</small></div>
    ${can('MODERADOR')?`<div class="schedule-actions"><button class="btn ghost small" data-schedule-excuse="${item.id}" data-schedule-excused="${item.excused?'1':'0'}">${item.excused?'Remover justificativa':'Justificar'}</button><button class="btn danger small" data-schedule-delete="${item.id}">Excluir</button></div>`:''}
  </article>`;
}
function pageSchedules(){
  return `<div class="dpe-module-page schedules-page">
    <section class="module-hero module-hero-compact module-hero-schedules">
      <div class="module-hero-copy"><span class="module-kicker">OPERAÇÕES / PRESENÇA</span><h1>Escala de <strong>serviço</strong></h1><p>Planeje cobertura, confronte presença com turnos reais e registre ausências justificadas.</p></div>
      <div class="module-hero-emblem" aria-hidden="true"><span>◫</span><b>ESCALA</b><small>PRESENÇA OPERACIONAL</small></div>
      <div class="module-hero-code">DPE // ESCALA E PRESENÇA</div>
    </section>
    ${can('MODERADOR')?`<section class="card schedule-smart-card">
      <header><div><span>ESCALA INTELIGENTE</span><h2>Sugestões de cobertura</h2></div><button class="btn ghost small" id="scheduleSuggest">Sugerir candidatos</button></header>
      <div id="scheduleSuggestions" class="schedule-suggestions"><p class="muted">Defina início e fim abaixo e peça sugestões ao System.</p></div>
    </section>
    <section class="card schedule-create-card">
      <header><div><span>NOVA ESCALA</span><h2>Agendar militar</h2></div></header>
      <form id="scheduleForm" class="schedule-form">
        <label><span>Militar</span><select class="input" id="scheduleMember" required><option value="">Selecione</option>${state.members.filter(m=>!['EXPULSO','DESLIGADO'].includes(m.status)).sort((a,b)=>a.nick.localeCompare(b.nick,'pt-BR')).map(m=>`<option value="${m.id}">${escapeHtml(m.nick)} — ${escapeHtml(m.rank)}</option>`).join('')}</select></label>
        <label><span>Início</span><input class="input" id="scheduleStart" type="datetime-local" required></label>
        <label><span>Fim</span><input class="input" id="scheduleEnd" type="datetime-local" required></label>
        <label class="schedule-note-field"><span>Observação</span><input class="input" id="scheduleNote" maxlength="240" placeholder="Ex.: Cobertura do turno da noite"></label>
        <button class="btn" type="submit">Adicionar à escala</button>
      </form>
    </section>`:''}
    <section class="card schedule-board">
      <header><div><span>ESCALA OPERACIONAL</span><h2>Presença e cobertura</h2></div><div class="schedule-view-actions"><button class="btn ghost small active" data-schedule-view="month">Mês</button><button class="btn ghost small" data-schedule-view="week">Semana</button><button class="btn ghost small" id="scheduleRefresh">Atualizar</button></div></header>
      <div class="schedule-summary" id="scheduleSummary"><span>Carregando escala…</span></div>
      <div id="scheduleRows" class="schedule-rows"><div class="dpe-empty compact"><p>Carregando…</p></div></div>
    </section>
  </div>`;
}
function scheduleRange(){
  const now=new Date(),start=new Date(now),end=new Date(now);
  if(scheduleView==='week'){
    const day=(start.getDay()+6)%7;
    start.setDate(start.getDate()-day);start.setHours(0,0,0,0);
    end.setTime(start.getTime()+7*86400000);
  }else{
    start.setDate(1);start.setHours(0,0,0,0);
    end.setMonth(start.getMonth()+1);end.setDate(1);end.setHours(0,0,0,0);
  }
  return {from:start.toISOString(),to:end.toISOString()};
}
async function loadSchedules(){
  const rows=$('#scheduleRows'); if(!rows)return;
  try{
    const range=scheduleRange();
    const data=await apiFetch('/schedules?from='+encodeURIComponent(range.from)+'&to='+encodeURIComponent(range.to));
    if(!rows.isConnected)return;
    const list=Array.isArray(data.schedules)?data.schedules:[];
    const counts={PRESENTE:0,FALTOU:0,JUSTIFICADA:0,AGENDADO:0,AGUARDANDO:0};
    list.forEach(i=>{const code=i.attendance?.code||'AGENDADO';counts[code]=(counts[code]||0)+1;});
    const coveredDays=new Set(list.map(i=>new Date(i.startsAt).toISOString().slice(0,10))).size;
    $('#scheduleSummary').innerHTML=`<span><b>${list.length}</b> escalas</span><span><b>${coveredDays}</b> dias cobertos</span><span><b>${counts.PRESENTE}</b> presenças</span><span><b>${counts.FALTOU}</b> faltas</span><span><b>${counts.JUSTIFICADA}</b> justificadas</span><span><b>${counts.AGENDADO+counts.AGUARDANDO}</b> próximas</span>`;
    rows.innerHTML=list.length?list.map(scheduleCard).join(''):'<div class="dpe-empty"><span>◫</span><strong>Nenhuma escala no período</strong><p>Os próximos serviços aparecerão aqui.</p></div>';
    $$('[data-schedule-delete]',rows).forEach(btn=>btn.onclick=async()=>{if(!confirm('Excluir esta escala?'))return;btn.disabled=true;try{await apiFetch('/schedules/'+btn.dataset.scheduleDelete,{method:'DELETE'});toast('Escala excluída.');await loadSchedules();}catch(e){toast(e.message);btn.disabled=false;}});
    $$('[data-schedule-excuse]',rows).forEach(btn=>btn.onclick=async()=>{const enabled=btn.dataset.scheduleExcused!=='1';let reason='';if(enabled){const v=prompt('Motivo da ausência justificada:');if(v===null)return;reason=String(v).trim();if(reason.length<3)return toast('Informe o motivo da justificativa.');}btn.disabled=true;try{await apiFetch('/schedules/'+btn.dataset.scheduleExcuse,{method:'PATCH',body:JSON.stringify({excused:enabled,excuseReason:enabled?reason:''})});toast(enabled?'Ausência justificada.':'Justificativa removida.');await loadSchedules();}catch(e){toast(e.message);btn.disabled=false;}});
  }catch(e){if(rows.isConnected)rows.innerHTML='<div class="dpe-empty"><span>!</span><strong>Não foi possível carregar</strong><p>'+escapeHtml(e.message)+'</p></div>';}
}
function bindSchedulesPage(){
  if(state.route!=='schedules'||!$('#scheduleRows'))return;
  const form=$('#scheduleForm');
  if(form){
    const start=$('#scheduleStart'),end=$('#scheduleEnd');
    start.value=scheduleDateTimeLocal(new Date(Date.now()+3600000));
    end.value=scheduleDateTimeLocal(new Date(Date.now()+3*3600000));
    form.onsubmit=async e=>{e.preventDefault();const submit=form.querySelector('[type=submit]');submit.disabled=true;try{await apiFetch('/schedules',{method:'POST',body:JSON.stringify({memberId:Number($('#scheduleMember').value),startsAt:new Date(start.value).toISOString(),endsAt:new Date(end.value).toISOString(),note:$('#scheduleNote').value.trim()})});toast('Militar adicionado à escala.');$('#scheduleMember').value='';$('#scheduleNote').value='';await loadSchedules();}catch(err){toast(err.message);}finally{if(submit.isConnected)submit.disabled=false;}};
  }
  $('#scheduleRefresh').onclick=loadSchedules;
  $('[data-schedule-view]').forEach(btn=>btn.onclick=()=>{scheduleView=btn.dataset.scheduleView;$('[data-schedule-view]').forEach(x=>x.classList.toggle('active',x===btn));loadSchedules();});
  const suggest=$('#scheduleSuggest');
  if(suggest) suggest.onclick=async()=>{
    const box=$('#scheduleSuggestions'),start=$('#scheduleStart'),end=$('#scheduleEnd');
    if(!start?.value||!end?.value)return toast('Informe início e fim da escala.');
    suggest.disabled=true;box.innerHTML='<p class="muted">Analisando disponibilidade, carga e conflitos…</p>';
    try{
      const data=await apiFetch('/schedules/suggestions?startsAt='+encodeURIComponent(new Date(start.value).toISOString())+'&endsAt='+encodeURIComponent(new Date(end.value).toISOString()));
      box.innerHTML=data.suggestions.length?data.suggestions.map((s,i)=>`<article class="schedule-suggestion"><span class="schedule-suggestion-rank">#${i+1}</span><div><strong>${escapeHtml(s.nick)}</strong><small>${escapeHtml(s.rank)} • ${escapeHtml(s.division)} • ${s.recentHours}h recentes</small><p>${s.reasons.map(escapeHtml).join(' • ')}</p></div><b>${s.score}</b><button class="btn ghost small" data-use-suggestion="${s.memberId}">Selecionar</button></article>`).join(''):'<div class="dpe-empty compact"><p>Nenhum candidato sem conflito nesse intervalo.</p></div>';
      $('[data-use-suggestion]',box).forEach(b=>b.onclick=()=>{$('#scheduleMember').value=b.dataset.useSuggestion;toast('Militar selecionado para a escala.');});
    }catch(e){box.innerHTML='<div class="notice-box">'+escapeHtml(e.message)+'</div>';}finally{suggest.disabled=false;}
  };
  loadSchedules();
}