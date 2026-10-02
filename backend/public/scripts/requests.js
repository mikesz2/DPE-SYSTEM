/* Requisições — submódulos independentes. */
function pageRequests() {
 return `<div class="dpe-module-page requests-module-page">
  <section class="module-hero module-hero-requests">
    <div class="module-hero-copy">
      <span class="module-kicker">GESTÃO / REQUISIÇÕES</span>
      <h1>Central de <strong>registros</strong></h1>
      <p>Poste aulas, formalize promoções e registre desligamentos em um único fluxo administrativo.</p>
      <div class="module-hero-stats">
        <span><b>03</b><small>operações</small></span>
        <span><b>DPE</b><small>auditoria ativa</small></span>
      </div>
    </div>
    <div class="module-hero-emblem request-hero-symbol" aria-hidden="true"><span>≡</span><b>REQ</b><small>SYSTEM DPE</small></div>
    <div class="module-hero-code">DPE // CENTRAL ADMINISTRATIVA</div>
  </section>
  <div class="request-action-grid">
    <button type="button" data-route="requests-lesson" class="request-action-card request-action-lesson"><span class="request-action-icon">✓</span><small>FORMAÇÃO</small><h2>Postagem de Aula</h2><p>Registre aprovados e reprovados e atualize automaticamente o histórico dos militares.</p><b>Acessar módulo →</b></button>
    <button type="button" data-route="requests-promotion" class="request-action-card request-action-promotion"><span class="request-action-icon">↑</span><small>CARREIRA</small><h2>Postagem de Promoção</h2><p>Formalize progressões com patente atual, próxima patente, data e justificativa.</p><b>Acessar módulo →</b></button>
    <button type="button" data-route="requests-dismissal" class="request-action-card request-action-dismissal"><span class="request-action-icon">×</span><small>DISCIPLINA</small><h2>Demitir militar</h2><p>Registre o desligamento com motivo e data atual, mantendo o histórico auditável.</p><b>Acessar módulo →</b></button>
  </div>
 </div>`;
}

function pageRequestsPromotion() {
 const today = new Intl.DateTimeFormat('en-CA',{
  timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'
 }).format(new Date());
 const supreme = state.user?.role === 'SUPREMO';
 if (!can('MODERADOR')) {
  return `<div class="dpe-module-page request-operation-page"><section class="module-hero module-hero-requests module-hero-compact"><div class="module-hero-copy"><span class="module-kicker">REQUISIÇÕES / PROMOÇÃO</span><h1>Postagem de <strong>Promoção</strong></h1><p>Você não possui permissão para promover militares.</p></div></section></div>`;
 }
 return `<div class="dpe-module-page request-operation-page">
   <section class="module-hero module-hero-requests module-hero-compact">
     <div class="module-hero-copy"><span class="module-kicker">REQUISIÇÕES / CARREIRA</span><h1>Postagem de <strong>Promoção</strong></h1><p>Formalize a evolução de carreira com validação automática da patente atual e da próxima patente.</p></div>
     <div class="module-hero-emblem request-operation-symbol" aria-hidden="true"><span>↑</span><b>PROMOÇÃO</b></div>
     <div class="module-hero-code">DPE // PROGRESSÃO DE CARREIRA</div>
   </section>

   <div class="request-operation-layout">
    <section class="request-form-card">
      <header><span>FORMULÁRIO OFICIAL</span><h2>Dados da promoção</h2></header>
      <form id="promotionForm" class="request-form">
       <div class="field">
         <label for="promotionDate">Data da promoção</label>
         <input class="input" id="promotionDate" name="promotionDate" type="date" value="${today}" max="${today}" ${supreme ? '' : 'disabled'} required>
         <small class="muted">${supreme ? 'SUPREMO pode selecionar uma data retroativa.' : 'A data é automática e só pode ser alterada por SUPREMO.'}</small>
       </div>

       <div class="field request-search-field">
         <label for="promotionNick">Nick do militar</label>
         <input class="input" id="promotionNick" autocomplete="off" placeholder="Comece a digitar o nick..." maxlength="32" required>
         <input type="hidden" id="promotionMemberId">
         <div id="promotionNickResults" class="search-results hidden"></div>
         <small id="promotionSelectedLabel" class="muted">Nenhum militar selecionado.</small>
       </div>

       <div class="form-grid request-rank-grid">
         <div class="field"><label>Patente atual</label><input class="input" id="promotionCurrentRank" value="—" readonly></div>
         <div class="field"><label>Próxima patente</label>
           ${supreme
             ? `<select class="input" id="promotionNextRankSelect" disabled><option value="">Selecione um militar primeiro</option></select>`
             : `<input class="input" id="promotionNextRank" value="—" readonly>`}
         </div>
       </div>

       <div class="field">
         <label for="promotionDescription">Descrição da promoção</label>
         <textarea class="input" id="promotionDescription" rows="7" maxlength="1200" placeholder="Escreva pelo menos 3 linhas sobre a promoção do militar.&#10;Exemplo: desempenho demonstrado...&#10;conduta e participação...&#10;motivo da progressão..." required></textarea>
         <small id="promotionLineCount" class="muted">0 de 3 linhas obrigatórias.</small>
       </div>

       <p id="promotionMessage" class="request-status-message" role="status" aria-live="polite"></p>
       <button class="btn request-primary-action" id="promotionSubmit" type="submit" disabled>Promover militar</button>
      </form>
    </section>
    <aside class="request-context-card">
      <span class="request-context-kicker">PROTOCOLO DPE</span><h3>Promoção segura</h3>
      <p>O System identifica a patente atual do militar e calcula a progressão permitida. A ação é registrada no histórico do perfil.</p>
      <div><small>DATA</small><strong>${supreme ? 'Editável pelo Supremo' : 'Automática'}</strong></div>
      <div><small>HISTÓRICO</small><strong>Atualizado após aprovação</strong></div>
      <div><small>AUDITORIA</small><strong>Registro permanente</strong></div>
    </aside>
   </div>
 </div>`;
}

function pageRequestsDismissal() {
 const today = new Intl.DateTimeFormat('en-CA',{
  timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'
 }).format(new Date());
 if (!can('MODERADOR')) {
  return `<div class="dpe-module-page request-operation-page"><section class="module-hero module-hero-danger module-hero-compact"><div class="module-hero-copy"><span class="module-kicker">REQUISIÇÕES / DEMISSÃO</span><h1>Desligamento <strong>militar</strong></h1><p>Você não possui permissão para demitir militares.</p></div></section></div>`;
 }
 return `<div class="dpe-module-page request-operation-page">
   <section class="module-hero module-hero-danger module-hero-compact">
     <div class="module-hero-copy"><span class="module-kicker">REQUISIÇÕES / DISCIPLINA</span><h1>Desligamento <strong>militar</strong></h1><p>Registre a demissão com motivo formal e mantenha a trajetória do militar auditável.</p></div>
     <div class="module-hero-emblem request-operation-symbol request-danger-symbol" aria-hidden="true"><span>×</span><b>DEMISSÃO</b></div>
     <div class="module-hero-code">DPE // REGISTRO DISCIPLINAR</div>
   </section>

   <div class="request-operation-layout">
    <section class="request-form-card request-form-danger">
      <header><span>FORMULÁRIO OFICIAL</span><h2>Dados do desligamento</h2></header>
      <form id="dismissalForm" class="request-form">
       <div class="field"><label for="dismissalDate">Data</label><input class="input" id="dismissalDate" type="date" value="${today}" disabled><small class="muted">A data da demissão é sempre a data atual.</small></div>
       <div class="field request-search-field">
         <label for="dismissalNick">Nick do militar</label>
         <input class="input" id="dismissalNick" autocomplete="off" placeholder="Comece a digitar o nick..." maxlength="32" required>
         <input type="hidden" id="dismissalMemberId">
         <div id="dismissalNickResults" class="search-results hidden"></div>
         <small id="dismissalSelectedLabel" class="muted">Nenhum militar selecionado.</small>
       </div>
       <div class="field"><label for="dismissalReason">Motivo</label><textarea class="input" id="dismissalReason" rows="7" minlength="5" maxlength="500" placeholder="Informe o motivo da demissão..." required></textarea></div>
       <p id="dismissalMessage" class="request-status-message" role="status" aria-live="polite"></p>
       <button class="btn danger request-primary-action" id="dismissalSubmit" type="submit" disabled>Demitir militar</button>
      </form>
    </section>
    <aside class="request-context-card request-context-danger">
      <span class="request-context-kicker">ATENÇÃO</span><h3>Ação administrativa</h3>
      <p>O desligamento altera a situação do militar e passa a integrar o arquivo disciplinar da DPE.</p>
      <div><small>DATA</small><strong>Data atual</strong></div>
      <div><small>MOTIVO</small><strong>Obrigatório</strong></div>
      <div><small>PERFIL</small><strong>Histórico preservado</strong></div>
    </aside>
   </div>
 </div>`;
}

function pageRequestsLesson() {
 return `<div class="dpe-module-page request-operation-page lesson-operation-page">
   <section class="module-hero module-hero-lesson module-hero-compact">
     <div class="module-hero-copy"><span class="module-kicker">REQUISIÇÕES / FORMAÇÃO</span><h1>Postagem de <strong>Aula</strong></h1><p>Registre a formação de Soldados e mantenha o histórico acadêmico atualizado automaticamente.</p></div>
     <div class="module-hero-emblem request-operation-symbol lesson-symbol" aria-hidden="true"><span>✓</span><b>AULA</b></div>
     <div class="module-hero-code">DPE // FORMAÇÃO DE SOLDADOS</div>
   </section>

   <div class="lesson-command-strip">
     <div><span>STATUS DE ACESSO</span><p id="lessonPermission" class="muted" role="status">Carregando permissões...</p></div>
     <button class="btn" id="openLesson" disabled>Nova postagem de aula</button>
   </div>

   <div id="lessonComposer" hidden></div>

   <section class="lesson-overview-panel">
     <div class="module-section-head"><div><span>CENTRAL DE AULAS</span><h2>Operação de formação</h2></div><small id="lessonOverviewUpdated">SINCRONIZANDO</small></div>
     <div class="lesson-overview-kpis">
       <article><small>AULAS HOJE</small><strong id="lessonKpiToday">—</strong><span>registradas</span></article>
       <article><small>GUIAS ONLINE</small><strong id="lessonKpiGuides">—</strong><span id="lessonKpiGuidesSub">de — autorizados</span></article>
       <article><small>ALUNOS NOS PONTOS</small><strong id="lessonKpiStudents">—</strong><span>DPE Command</span></article>
       <article><small>PENDÊNCIAS</small><strong id="lessonKpiPending">—</strong><span>cadastros + rascunhos</span></article>
       <article><small>APROVAÇÃO</small><strong id="lessonKpiApproval">—</strong><span>histórico recente</span></article>
     </div>
     <div class="lesson-overview-grid">
       <section class="lesson-overview-card"><header><span>GUIAS DISPONÍVEIS</span><h3>Equipe de formação</h3></header><div id="lessonGuideAvailability"><p class="muted">Carregando...</p></div></section>
       <section class="lesson-overview-card"><header><span>DESEMPENHO</span><h3>Ranking dos Guias</h3></header><div id="lessonGuideRanking"><p class="muted">Carregando...</p></div></section>
       <section class="lesson-overview-card"><header><span>DPE COMMAND</span><h3>Automação da aula</h3></header><div id="lessonCommandStatus"><p class="muted">Carregando...</p></div></section>
     </div>
   </section>

   ${can('ADMINISTRADOR') ? `<section class="lesson-guide-panel">
     <header><div><span>GESTÃO DE GUIAS</span><h2>Guias do DPE Command</h2></div><small>PERMISSÃO EXCLUSIVA</small></header>
     <p>GUIA recebe somente autorização para postagem de aula. Não recebe moderação, O.C., O.B. ou qualquer outro poder.</p>
     <div class="lesson-guide-actions">
       <select class="input" id="lessonGuideMember">
         <option value="">Selecione um militar</option>
         ${[...state.members].sort((a,b)=>a.nick.localeCompare(b.nick,'pt-BR')).map(m=>`<option value="${m.id}">${escapeHtml(m.nick)} — ${escapeHtml(m.rank)}</option>`).join('')}
       </select>
       <button class="btn" id="grantLessonGuide" type="button">Autorizar como Guia</button>
     </div>
     <div id="lessonGuideList" class="lesson-guide-list">Carregando Guias...</div>
   </section>` : ''}

   <section class="lesson-history-panel">
     <div class="module-section-head"><div><span>HISTÓRICO DE FORMAÇÃO</span><h2>Aulas postadas</h2></div><small>REGISTROS DO SYSTEM</small></div>
     <div id="lessonHistory" aria-live="polite">Carregando...</div>
   </section>
 </div>`;
}

function lessonForm() {
 const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return `<section class="request-form-card lesson-form-card">
   <header><span>POSTAGEM DE AULA</span><h2>Registro da formação</h2></header>
   <form id="lessonForm" class="request-form">
    <div class="form-grid">
      <div class="field"><label for="lessonDate">Data da aula</label><input class="input" type="date" id="lessonDate" name="lessonDate" max="${today}" value="${today}" required></div>
      <div class="field"><label for="lessonTeacher">Professor</label><input class="input" id="lessonTeacher" value="${escapeHtml(state.user.nick)}" readonly></div>
    </div>
    <div class="field"><label for="lessonApproved">Nicks dos aprovados</label><textarea class="input" id="lessonApproved" name="approved" rows="5" maxlength="3400" placeholder="Um nick por linha ou separados por vírgula"></textarea></div>
    <div class="field"><label for="lessonFailed">Nicks dos reprovados</label><textarea class="input" id="lessonFailed" name="failed" rows="4" maxlength="3400" placeholder="Deixe vazio se não houver reprovados"></textarea></div>
    <div class="field"><label for="lessonDescription">Descrição de como foi a aula</label><textarea class="input" id="lessonDescription" name="description" rows="6" minlength="3" maxlength="1200" required></textarea></div>
    <div class="lesson-form-note"><span>i</span><p>Os aprovados serão validados no System/Habbo. Quem ainda não tiver cadastro poderá entrar como registro pendente em Soldado. Patentes superiores serão preservadas.</p></div>
    <div class="lesson-validation-actions">
      <button class="btn ghost" id="lessonValidate" type="button">Validar participantes</button>
      <span>Confira nicks inexistentes antes da postagem definitiva.</span>
    </div>
    <div id="lessonValidation" class="lesson-validation hidden" aria-live="polite"></div>
    <p id="lessonMessage" class="request-status-message" role="status" aria-live="polite"></p>
    <button class="btn request-primary-action" type="submit">Postar aula e atualizar aprovados</button>
   </form>
 </section>`;
}

function bindDismissalRequestPage() {
 const form=$('#dismissalForm');
 if(!form) return;

 const nickInput=$('#dismissalNick');
 const memberIdInput=$('#dismissalMemberId');
 const results=$('#dismissalNickResults');
 const selectedLabel=$('#dismissalSelectedLabel');
 const reason=$('#dismissalReason');
 const submit=$('#dismissalSubmit');
 const message=$('#dismissalMessage');
 let selectedMember=null;

 const updateSubmit=()=>{
  submit.disabled=!(selectedMember && reason.value.trim().length>=5);
 };

 const selectMember=member=>{
  selectedMember=member;
  memberIdInput.value=member.id;
  nickInput.value=member.nick;
  selectedLabel.textContent=`Selecionado: ${member.nick} · ${member.rank}`;
  results.classList.add('hidden');
  results.innerHTML='';
  updateSubmit();
 };

 const renderResults=()=>{
  const q=nickInput.value.trim().toLocaleLowerCase('pt-BR');
  selectedMember=null;
  memberIdInput.value='';
  selectedLabel.textContent='Nenhum militar selecionado.';
  submit.disabled=true;

  if(!q){
   results.classList.add('hidden');
   results.innerHTML='';
   return;
  }

  const matches=state.members
   .filter(member=>!['EXPULSO','DESLIGADO'].includes(member.status))
   .filter(member=>member.id!==state.user.id)
   .filter(member=>member.nick.toLocaleLowerCase('pt-BR').includes(q))
   .slice(0,8);

  const exact=matches.find(member=>member.nick.toLocaleLowerCase('pt-BR')===q);
  if(exact){ selectMember(exact); return; }

  if(matches.length===1 && matches[0].nick.toLocaleLowerCase('pt-BR').startsWith(q) && q.length>=3){
   selectMember(matches[0]);
   return;
  }

  results.innerHTML=matches.length
   ? matches.map(member=>`<button type="button" class="search-hit" data-dismissal-member="${member.id}"><b>${escapeHtml(member.nick)}</b> — ${escapeHtml(member.rank)}</button>`).join('')
   : '<div class="search-hit muted">Nenhum militar encontrado.</div>';
  results.classList.toggle('hidden',!matches.length);

  results.querySelectorAll('[data-dismissal-member]').forEach(button=>button.onclick=()=>{
   const member=state.members.find(item=>String(item.id)===String(button.dataset.dismissalMember));
   if(member) selectMember(member);
  });
 };

 nickInput.oninput=renderResults;
 reason.oninput=updateSubmit;

 form.onsubmit=async event=>{
  event.preventDefault();
  if(!selectedMember) return toast('Selecione um militar válido.');
  if(reason.value.trim().length<5) return toast('Informe o motivo da demissão.');

  submit.disabled=true;
  message.textContent='Registrando demissão...';

  try{
   const body={
    memberId:selectedMember.id,
    dismissalDate:$('#dismissalDate').value,
    reason:reason.value.trim(),
   };
   const data=await apiFetch('/dismissals',{method:'POST',body:JSON.stringify(body)});
   await reload('members');
   message.textContent=`${data.member.habboName} foi desligado do System.`;
   toast('Demissão registrada com sucesso.');
   selectedMember=null;
   memberIdInput.value='';
   nickInput.value='';
   selectedLabel.textContent='Nenhum militar selecionado.';
   reason.value='';
   updateSubmit();
  }catch(error){
   message.textContent=error.message;
   updateSubmit();
  }
 };
}

function bindPromotionRequestPage() {
 const form=$('#promotionForm');
 if(!form) return;

 const nickInput=$('#promotionNick');
 const memberIdInput=$('#promotionMemberId');
 const results=$('#promotionNickResults');
 const selectedLabel=$('#promotionSelectedLabel');
 const currentRank=$('#promotionCurrentRank');
 const nextRank=$('#promotionNextRank');
 const nextRankSelect=$('#promotionNextRankSelect');
 const description=$('#promotionDescription');
 const lineCount=$('#promotionLineCount');
 const submit=$('#promotionSubmit');
 const message=$('#promotionMessage');

 let selectedMember=null;

 const orderedRanks=[...state.ranks].sort((a,b)=>a.level-b.level);
 const nextRankFor=member=>{
  const current=orderedRanks.find(rank=>rank.name===member.rank);
  if(!current) return null;
  return orderedRanks.find(rank=>rank.level>current.level) || null;
 };

 const selectedTargetRank=()=>{
  if(!selectedMember) return null;
  if(nextRankSelect){
   const id=Number(nextRankSelect.value);
   return orderedRanks.find(rank=>rank.id===id) || null;
  }
  return nextRankFor(selectedMember);
 };

 const updateSubmit=()=>{
  const lines=description.value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  lineCount.textContent=`${Math.min(lines.length,3)} de 3 linhas obrigatórias.`;
  const next=selectedTargetRank();
  submit.disabled=!(selectedMember && next && lines.length>=3);
 };

 const selectMember=member=>{
  selectedMember=member;
  memberIdInput.value=member.id;
  nickInput.value=member.nick;
  currentRank.value=member.rank || '—';
  const next=nextRankFor(member);
  if(nextRankSelect){
   const current=orderedRanks.find(rank=>rank.name===member.rank);
   const available=current ? orderedRanks.filter(rank=>rank.level>current.level) : [];
   nextRankSelect.innerHTML=available.length
    ? available.map((rank,index)=>`<option value="${rank.id}" ${index===0?'selected':''}>${escapeHtml(rank.name)}</option>`).join('')
    : '<option value="">Sem próxima patente</option>';
   nextRankSelect.disabled=!available.length;
   nextRankSelect.onchange=()=>{
    const chosen=selectedTargetRank();
    selectedLabel.textContent=chosen
     ? `Selecionado: ${member.nick} · ${member.rank} → ${chosen.name}`
     : `${member.nick} já está na maior patente cadastrada.`;
    updateSubmit();
   };
  }else{
   nextRank.value=next ? next.name : 'Sem próxima patente';
  }
  selectedLabel.textContent=next
   ? `Selecionado: ${member.nick} · ${member.rank} → ${next.name}`
   : `${member.nick} já está na maior patente cadastrada.`;
  results.classList.add('hidden');
  results.innerHTML='';
  updateSubmit();
 };

 const renderResults=()=>{
  const q=nickInput.value.trim().toLocaleLowerCase('pt-BR');
  selectedMember=null;
  memberIdInput.value='';
  currentRank.value='—';
  if(nextRank) nextRank.value='—';
  if(nextRankSelect){
   nextRankSelect.innerHTML='<option value="">Selecione um militar primeiro</option>';
   nextRankSelect.disabled=true;
  }
  selectedLabel.textContent='Nenhum militar selecionado.';
  submit.disabled=true;

  if(q.length<1){
   results.classList.add('hidden');
   results.innerHTML='';
   return;
  }

  const actingLevel=ROLE_ORDER.indexOf(state.user?.role);
  const matches=state.members
   .filter(member=>!['EXPULSO','DESLIGADO'].includes(member.status))
   .filter(member=>member.id!==state.user?.id)
   .filter(member=>state.user?.role==='SUPREMO' || ROLE_ORDER.indexOf(member.role)<actingLevel)
   .filter(member=>member.nick.toLocaleLowerCase('pt-BR').includes(q))
   .slice(0,8);

  const exact=matches.find(member=>member.nick.toLocaleLowerCase('pt-BR')===q);
  if(exact){
   selectMember(exact);
   return;
  }

  if(matches.length===1 && matches[0].nick.toLocaleLowerCase('pt-BR').startsWith(q) && q.length>=3){
   selectMember(matches[0]);
   return;
  }

  results.innerHTML=matches.length
   ? matches.map(member=>`<button type="button" class="search-hit" data-promotion-member="${member.id}"><b>${escapeHtml(member.nick)}</b> — ${escapeHtml(member.rank)}</button>`).join('')
   : '<div class="search-hit muted">Nenhum militar encontrado.</div>';
  results.classList.toggle('hidden',!matches.length);
  results.querySelectorAll('[data-promotion-member]').forEach(button=>button.onclick=()=>{
   const member=state.members.find(item=>String(item.id)===String(button.dataset.promotionMember));
   if(member) selectMember(member);
  });
 };

 nickInput.oninput=renderResults;
 description.oninput=updateSubmit;

 const nexusPrefill=window._nexusCommandPrefill;
 if(nexusPrefill?.kind==='PROMOCAO'){
  const prefilled=state.members.find(member=>Number(member.id)===Number(nexusPrefill.memberId))
   || state.members.find(member=>String(member.nick).toLocaleLowerCase('pt-BR')===String(nexusPrefill.nick||'').toLocaleLowerCase('pt-BR'));
  if(prefilled) selectMember(prefilled);
  window._nexusCommandPrefill=null;
 }

 form.onsubmit=async event=>{
  event.preventDefault();
  if(!selectedMember) return toast('Selecione um militar válido.');
  const lines=description.value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  if(lines.length<3) return toast('A descrição precisa ter pelo menos 3 linhas preenchidas.');

  const next=selectedTargetRank();
  if(!next) return toast('Selecione uma patente de destino válida.');

  submit.disabled=true;
  message.textContent='Registrando promoção...';

  try{
   const body={
    memberId:selectedMember.id,
    promotionDate:$('#promotionDate').value,
    description:description.value,
    ...(nextRankSelect ? { targetRankId: Number(nextRankSelect.value) } : {}),
   };
   const data=await apiFetch('/promotions',{method:'POST',body:JSON.stringify(body)});
   await reload('members');
   message.textContent=`${data.member.habboName} promovido de ${data.previousRank} para ${data.nextRank}.`;
   toast('Promoção publicada no histórico do militar.');

   const refreshed=state.members.find(member=>member.id===selectedMember.id);
   if(refreshed){
    selectedMember=refreshed;
    currentRank.value=refreshed.rank;
    const afterNext=nextRankFor(refreshed);
    if(nextRank){
     nextRank.value=afterNext ? afterNext.name : 'Sem próxima patente';
    }
    if(nextRankSelect){
     const current=orderedRanks.find(rank=>rank.name===refreshed.rank);
     const available=current ? orderedRanks.filter(rank=>rank.level>current.level) : [];
     nextRankSelect.innerHTML=available.length
      ? available.map((rank,index)=>`<option value="${rank.id}" ${index===0?'selected':''}>${escapeHtml(rank.name)}</option>`).join('')
      : '<option value="">Sem próxima patente</option>';
     nextRankSelect.disabled=!available.length;
    }
   }
   description.value='';
   updateSubmit();
  }catch(error){
   message.textContent=error.message;
   updateSubmit();
  }
 };
}

async function bindRequestsPage() {
 if (state.route === 'requests-dismissal') { bindDismissalRequestPage(); return; }
 if (state.route === 'requests-promotion') { bindPromotionRequestPage(); return; }
 if (state.route !== 'requests-lesson') return;
 const history=$('#lessonHistory'), button=$('#openLesson');
 if(!history || !button) return;
 bindLessonOverviewPanel();

 const loadGuides = async()=>{
  const box=$('#lessonGuideList');
  if(!box) return;
  try{
   const data=await apiFetch('/lessons/guides');
   if(!box.isConnected) return;
   const guides=Array.isArray(data?.guides)?data.guides:[];
   box.innerHTML=guides.length ? guides.map(g=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)"><span><b>${escapeHtml(g.habboName)}</b> <span class="muted">— ${escapeHtml(g.rank?.name||'Sem patente')}</span></span><button class="btn danger small" type="button" data-revoke-guide="${g.id}">Remover Guia</button></div>`).join('') : '<p class="muted">Nenhum Guia autorizado.</p>';
   box.querySelectorAll('[data-revoke-guide]').forEach(btn=>btn.onclick=async()=>{
    btn.disabled=true;
    try{await apiFetch('/lessons/guides/'+btn.dataset.revokeGuide,{method:'PATCH',body:JSON.stringify({enabled:false})});toast('Autorização de Guia removida.');await loadGuides();}
    catch(e){toast(e.message);btn.disabled=false;}
   });
  }catch(e){if(box.isConnected) box.textContent=e.message;}
 };
 const grant=$('#grantLessonGuide');
 if(grant){
  grant.onclick=async()=>{
   const select=$('#lessonGuideMember');
   if(!select?.value) return toast('Selecione um militar.');
   grant.disabled=true;
   try{await apiFetch('/lessons/guides/'+select.value,{method:'PATCH',body:JSON.stringify({enabled:true})});toast('Militar autorizado como Guia de aulas.');select.value='';await loadGuides();}
   catch(e){toast(e.message);}
   finally{if(grant.isConnected) grant.disabled=false;}
  };
  loadGuides();
 }
 const load = async()=>{
  const data=await apiFetch('/lessons');
  if(!history.isConnected) return;
  button.disabled=!data.canPublish;
  $('#lessonPermission').textContent=data.canPublish ? 'Poste uma aula para registrar os resultados no histórico dos aprovados.' : 'A postagem está disponível para Guias autorizados, instrutores da AFD e Moderadores ou superiores.';
  history.innerHTML=data.lessons.length ? data.lessons.map(l=>`<article class="card" style="padding:18px;margin-top:12px"><h3>Postagem de Aula #${l.id}</h3><p>${escapeHtml(l.lessonDate.split('-').reverse().join('/'))} · Professor: <b>${escapeHtml(l.author.habboName)}</b> · Cargo aprovado: Soldado</p><p style="white-space:pre-wrap;margin:12px 0">${escapeHtml(l.description)}</p><p><b>Aprovados (${l.approved.length}):</b> ${escapeHtml(l.approved.join(', ') || 'Nenhum')}</p><p><b>Reprovados (${l.failed.length}):</b> ${escapeHtml(l.failed.join(', ') || 'Nenhum')}</p></article>`).join('') : '<p class="muted">Nenhuma aula postada ainda.</p>';
 };
 try{await load();}catch(e){if(history.isConnected){history.textContent=e.message;$('#lessonPermission').textContent='Não foi possível carregar as aulas. Acesse Requisições novamente para tentar.';}}
 button.onclick=()=>{
  const composer=$('#lessonComposer');
  if(!composer.hidden){$('#lessonDate')?.focus();return;}
  composer.hidden=false; composer.innerHTML=lessonForm();
  const form=$('#lessonForm');
  const requestKey=typeof crypto.randomUUID==='function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(24)),v=>v.toString(16).padStart(2,'0')).join('');
  let submittedBody=null;
  let validatedSnapshot=null;
  const names=v=>String(v||'').split(/[\n,;]+/).map(n=>n.trim()).filter(Boolean);
  const lessonBody=()=>{
   const fd=new FormData(form);
   return {lessonDate:fd.get('lessonDate'),description:fd.get('description'),approved:names(fd.get('approved')),failed:names(fd.get('failed')),requestKey};
  };
  const rosterSnapshot=body=>JSON.stringify({approved:body.approved,failed:body.failed});
  const renderValidation=data=>{
   const box=$('#lessonValidation');
   if(!box) return;
   const summary=data.summary||{};
   const approved=(data.approved||[]);
   const failed=(data.failed||[]);
   const row=(label,items)=>`<div class="lesson-validation-row"><strong>${label}</strong><span>${items.length ? items.map(item=>`<em class="${item.valid?'ok':'bad'}">${escapeHtml(item.habboName||item.input)} · ${item.valid?(item.source==='SYSTEM'?'System':'Habbo'):(item.reason==='ACCESS_REVOKED'?'revogado':'não encontrado')}</em>`).join('') : '<em>nenhum</em>'}</span></div>`;
   box.innerHTML=`<header><b>${summary.valid?'✓ Turma validada':'! Revise a turma'}</b><small>${Number(summary.approvedTotal||0)} aprovado(s) · ${Number(summary.failedTotal||0)} reprovado(s)</small></header>${row('Aprovados',approved)}${row('Reprovados',failed)}`;
   box.classList.remove('hidden');
  };
  const validateRoster=async body=>{
   const box=$('#lessonValidation'), validate=$('#lessonValidate');
   if(validate) validate.disabled=true;
   if(box){box.classList.remove('hidden');box.innerHTML='<p class="muted">Validando nicks no System e no Habbo...</p>';}
   try{
    const data=await apiFetch('/lessons/validate',{method:'POST',body:JSON.stringify({approved:body.approved,failed:body.failed})});
    renderValidation(data);
    validatedSnapshot=rosterSnapshot(body);
    return data;
   }finally{
    if(validate?.isConnected) validate.disabled=false;
   }
  };
  $('#lessonValidate').onclick=async()=>{
   try{await validateRoster(lessonBody());}
   catch(err){const box=$('#lessonValidation');if(box){box.classList.remove('hidden');box.innerHTML='<p class="request-status-message">'+escapeHtml(err.message)+'</p>';}}
  };
  form.querySelectorAll('#lessonApproved,#lessonFailed').forEach(input=>input.addEventListener('input',()=>{validatedSnapshot=null;}));
  form.onsubmit=async e=>{
   e.preventDefault();
   const submit=form.querySelector('[type=submit]'), message=$('#lessonMessage');
   const body=lessonBody();
   // Retentativas após falha de rede repetem a mesma operação, sem duplicar perfis.
   if(submittedBody && submittedBody!==JSON.stringify(body)){message.textContent='Para alterar dados após uma tentativa, abra Requisições novamente e confira primeiro o histórico.';return;}
   submit.disabled=true;
   try{
    let validation=null;
    if(validatedSnapshot!==rosterSnapshot(body)) validation=await validateRoster(body);
    else validation=await apiFetch('/lessons/validate',{method:'POST',body:JSON.stringify({approved:body.approved,failed:body.failed})});
    if(!validation.summary?.valid){
     renderValidation(validation);
     message.textContent='Corrija os participantes destacados antes de postar.';
     submit.disabled=false;
     return;
    }
    submittedBody=JSON.stringify(body);
    message.textContent='Turma validada. Salvando aula e atualizando os perfis...';
    const result=await apiFetch('/lessons',{method:'POST',body:submittedBody});
    const outcome=result?.outcome||{};
    const pending=Number(outcome.pendingRegistrations||0);
    const updated=(outcome.approved||[]).filter(item=>item.profileUpdated).length;
    const total=Number(outcome.approvedCount||0);
    message.textContent=`Aula postada. ${updated}/${total} perfil(is) atualizado(s)${pending ? ` · ${pending} cadastro(s) pendente(s)` : ''}.`;
   }catch(err){
    message.textContent=err.message + (submittedBody ? ' Se a falha ocorreu após o envio, não altere os dados: tente postar novamente para confirmar sem duplicar.' : '');
    submit.disabled=false;
    return;
   }
   const finalMessage=message.textContent;
   composer.hidden=true;composer.innerHTML='';
   try{await reload('members');await load();}catch(err){history.textContent='A aula foi salva, mas não foi possível atualizar a lista. Acesse Requisições novamente.';}
   if(finalMessage) toast(finalMessage);
  };
  $('#lessonDate').focus();
 };
}
