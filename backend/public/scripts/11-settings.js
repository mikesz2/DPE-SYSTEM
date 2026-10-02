/* ==========================================================================
   SYSTEM DPE — Configurações, seletor de temas, notificações
   ========================================================================== */
function pageSettings() {
  return `<div class="dpe-module-page settings-module-page">
    <section class="module-hero module-hero-settings module-hero-compact">
      <div class="module-hero-copy"><span class="module-kicker">CONTA / CONFIGURAÇÕES</span><h1>Preferências do <strong>System</strong></h1><p>Personalize a interface, revise sua segurança e consulte as permissões efetivas do seu cargo.</p></div>
      <div class="module-hero-emblem settings-hero-emblem" aria-hidden="true"><span>⚙</span><b>AJUSTES</b></div>
      <div class="module-hero-code">DPE // PREFERÊNCIAS DA CONTA</div>
    </section>

    <div class="settings-grid-v2">
      <section class="settings-card-v2">
        <header><span>APARÊNCIA</span><h2>Tema visual</h2></header>
        <div class="settings-card-body"><div class="theme-grid">
          ${THEMES.map(t => `<button class="theme-swatch ${state.theme===t.id?'active':''}" data-theme="${t.id}" style="--tp-bg:${t.bg};--tp-bg2:${t.bg2};--tp-line:${t.line};--tp-accent:${t.ac}">
            <div class="preview"><div class="a"></div><div class="b"><div class="bar accent"></div><div class="bar" style="width:80%"></div><div class="bar" style="width:55%"></div></div></div>
            <b>${escapeHtml(t.name)}</b>
          </button>`).join('')}
        </div></div>
      </section>

      <section class="settings-card-v2 settings-account-card">
        <header><span>SEGURANÇA</span><h2>Conta</h2></header>
        <div class="settings-card-body">
          <div class="field"><label>Usuário</label><input class="input" value="${escapeHtml(state.user.nick)}" readonly></div>
          <button class="btn soft small full" id="changePassBtn">Alterar senha</button>
        </div>
      </section>
    </div>

    <section class="settings-card-v2 settings-wide-card">
      <header><span>PREFERÊNCIAS</span><h2>Notificações</h2></header>
      <div class="settings-card-body">
        <div id="notificationPreferences">
          <div class="permission"><span>Carreira, promoções e condecorações</span><div class="switch on" data-notif-pref="career"></div></div>
          <div class="permission"><span>Mensagens e DPE Mail</span><div class="switch on" data-notif-pref="messages"></div></div>
          <div class="permission"><span>Tarefas e metas</span><div class="switch on" data-notif-pref="tasks"></div></div>
          <div class="permission"><span>Aulas e formação</span><div class="switch on" data-notif-pref="lessons"></div></div>
          <div class="permission"><span>Turnos, escala e afastamentos</span><div class="switch on" data-notif-pref="schedules"></div></div>
          <div class="permission"><span>Rede DPE e interações sociais</span><div class="switch on" data-notif-pref="social"></div></div>
          <div class="permission"><span>Comunicados oficiais</span><div class="switch on" data-notif-pref="announcements"></div></div>
          <div class="permission"><span>Ocorrências e ações administrativas</span><div class="switch on" data-notif-pref="administrative"></div></div>
        </div>
        <p class="muted settings-note">Preferências sincronizadas com sua conta. Alertas de segurança, senha, sessão e acesso continuam obrigatórios.</p>
      </div>
    </section>

    <section class="settings-card-v2 settings-wide-card">
      <header><span>ACESSO EFETIVO</span><h2>Permissões do cargo ${roleBadge(state.user.role)}</h2></header>
      <div class="settings-card-body permission-grid">
        ${[
          ['Gerenciar membros','MODERADOR'],['Publicar requerimentos','MEMBRO'],['Decidir requerimentos','MODERADOR'],
          ['Cadastrar militares','ADMINISTRADOR'],['Conceder condecorações','ADMINISTRADOR'],['Enviar DPE Mail institucional','ADMINISTRADOR'],
          ['Gerenciar loja e tarefas','MODERADOR'],['Administrar patentes/divisões','ADMINISTRADOR'],['Acessar logs de auditoria','ADMINISTRADOR'],['Conceder cargo de Dono','DONO'],
        ].map(([label,min])=>`<div class="permission"><span>${label}</span><div class="switch ${can(min)?'on':''}" style="pointer-events:none"></div></div>`).join('')}
      </div>
    </section>
  </div>`;
}

function bindThemeSwatches() {
  $$('[data-theme]').forEach(b => b.onclick = () => {
    applyTheme(b.dataset.theme);
    $$('[data-theme]').forEach(x => x.classList.toggle('active', x.dataset.theme === b.dataset.theme));
    toast('Tema aplicado');
  });
  loadNotificationPreferences();
  $('[data-toggle]').forEach(sw => sw.onclick = () => sw.classList.toggle('on'));
  const changePassBtn = $('#changePassBtn');
  if (changePassBtn) changePassBtn.onclick = () => {
    openModal(`
      <div class="modal-head"><b>Alterar senha</b><button class="icon-btn" data-close>✕</button></div>
      <div class="modal-body">
        <div class="field"><label>Senha atual</label><input class="input" id="curPass" type="password"></div>
        <div class="field" style="margin-top:10px"><label>Nova senha (mín. 8 caracteres)</label><input class="input" id="newPass" type="password"></div>
        <div id="passMsg" class="form-msg" style="margin-top:6px"></div>
        <button class="btn full" id="savePassBtn" style="margin-top:12px">Salvar nova senha</button>
      </div>`);
    $('#savePassBtn').onclick = async () => {
      try {
        const data = await apiFetch('/auth/password', { method: 'PATCH', body: JSON.stringify({ currentPassword: $('#curPass').value, newPassword: $('#newPass').value }) });
        if (!data?.token) throw new Error('O servidor não devolveu a nova sessão.');
        store.set('token', data.token, !sessionStorage.getItem('dcc_token'));
        closeModal(); toast('Senha alterada. Outras sessões foram encerradas.');
      } catch (err) { $('#passMsg').style.color = 'var(--danger)'; $('#passMsg').textContent = err.message; }
    };
  };
}

async function showNotifications() {
  openDrawer(`
    <div class="drawer-head"><span>🔔 Notificações</span><button class="icon-btn" id="closeDrawer">✕</button></div>
    ${state.notifications.length ? `
      <div style="padding:10px 18px"><button class="btn ghost small" id="markAllRead">Marcar todas como lidas</button></div>
      ${state.notifications.map(n => `
      <div class="drawer-item" style="${n.read?'opacity:.6':''}"><div class="ico">${n.ico}</div><div><b>${n.title}</b><p>${n.text}</p><small class="muted">${n.time}</small></div></div>`).join('')}`
      : `<div style="padding:30px 18px">${emptyState('🔔','Nenhuma notificação por enquanto.')}</div>`}`);
  $('#closeDrawer').onclick = closeDrawer;
  const markBtn = $('#markAllRead');
  if (markBtn) markBtn.onclick = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      state.notifications.forEach(n => n.read = true);
      $('#notifBadge').classList.add('hidden');
      showNotifications();
    } catch (err) { toast(err.message); }
  };
}

async function loadNotificationPreferences(){
  const root=$('#notificationPreferences');if(!root)return;
  try{
    const data=await apiFetch('/notifications/preferences');
    $$('[data-notif-pref]',root).forEach(sw=>{
      const key=sw.dataset.notifPref;
      sw.classList.toggle('on',data.preferences?.[key]!==false);
      sw.onclick=async()=>{
        const next=!sw.classList.contains('on');
        sw.classList.toggle('on',next);
        try{
          await apiFetch('/notifications/preferences',{method:'PUT',body:JSON.stringify({[key]:next})});
          toast('Preferência salva.');
          await refreshNotificationsSilently();
        }catch(e){sw.classList.toggle('on',!next);toast(e.message);}
      };
    });
  }catch(e){toast('Não foi possível carregar preferências: '+e.message);}
}