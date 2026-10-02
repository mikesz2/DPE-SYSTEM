/* ==========================================================================
   SYSTEM DPE — Ativação de conta (verificação real por missão do Habbo)
   Fluxo: nick → gera código → cola na missão → confirma → define senha.
   Precisa do backend rodando (mesma origem, /api) — é por isso que essa
   tela não funciona no protótipo front-only, só no pacote com servidor.
   ========================================================================== */

function activationStep1Html(prefill = '') {
  return `
    <div class="modal-head"><b>🪪 Ativar conta</b><button class="icon-btn" data-close>✕</button></div>
    <div class="modal-body">
      <p style="font-size:12.5px;color:var(--muted);line-height:1.6">
        Pra ativar sua conta no System DPE, primeiro confirmamos que você é
        dono(a) da conta no Habbo. Digite seu nick exato.
      </p>
      <div class="field" style="margin-top:14px">
        <label>Nick no Habbo</label>
        <input class="input" id="actHabboName" placeholder="Seu nick exato" value="${escapeHtml(prefill)}" autocomplete="off">
      </div>
      <div id="actMsg" class="form-msg" style="margin-top:8px"></div>
      <button class="btn full" id="actStep1Btn" style="margin-top:14px">Gerar código de verificação</button>
    </div>`;
}

function activationStep2Html(habboName, code) {
  return `
    <div class="modal-head"><b>🪪 Ativar conta</b><button class="icon-btn" data-close>✕</button></div>
    <div class="modal-body">
      <p style="font-size:12.5px;color:var(--muted);line-height:1.6">
        Copie o código abaixo e cole exatamente na <b style="color:var(--text)">missão</b>
        da sua conta <b style="color:var(--text)">${escapeHtml(habboName)}</b> no Habbo. Depois de salvar a missão lá, volte aqui e confirme.
      </p>
      <div class="notice-box" style="margin:14px 0;justify-content:center;font-size:18px;font-weight:700;letter-spacing:.08em;color:var(--blue-3)">
        ${escapeHtml(code)}
      </div>
      <div id="actMsg" class="form-msg"></div>
      <div style="display:flex;gap:10px;margin-top:6px">
        <button class="btn full" id="actStep2Btn">Já colei na missão — verificar</button>
      </div>
      <button class="btn ghost small full" id="actBackBtn" style="margin-top:10px">← Usar outro nick</button>
    </div>`;
}

function activationStep3Html(habboName) {
  return `
    <div class="modal-head"><b>🪪 Ativar conta</b><button class="icon-btn" data-close>✕</button></div>
    <div class="modal-body">
      <p style="font-size:12.5px;color:var(--muted);line-height:1.6">
        Conta <b style="color:var(--ok)">${escapeHtml(habboName)} verificada</b>! Agora defina a senha que você vai usar pra entrar no System DPE.
      </p>
      <div class="field" style="margin-top:14px">
        <label>Senha (mínimo 8 caracteres)</label>
        <input class="input" id="actPassword" type="password" autocomplete="new-password">
      </div>
      <div class="field" style="margin-top:10px">
        <label>Confirmar senha</label>
        <input class="input" id="actPassword2" type="password" autocomplete="new-password">
      </div>
      <div id="actMsg" class="form-msg" style="margin-top:8px"></div>
      <button class="btn full" id="actStep3Btn" style="margin-top:14px">Concluir cadastro</button>
    </div>`;
}

function openActivationModal() {
  openModal(activationStep1Html($('#loginUser') ? $('#loginUser').value.trim() : ''));
  bindActivationStep1();
}

function bindActivationStep1() {
  bindGlobalActions($('#modalCard'));
  const btn = $('#actStep1Btn');
  const msg = $('#actMsg');
  btn.onclick = async () => {
    const habboName = $('#actHabboName').value.trim();
    if (!habboName) { msg.textContent = 'Digite seu nick do Habbo.'; return; }
    btn.disabled = true; btn.textContent = 'Gerando código...';
    msg.style.color = 'var(--muted)'; msg.textContent = '';
    try {
      const data = await apiFetch('/auth/habbo/start', { method: 'POST', body: JSON.stringify({ habboName }) });
      $('#modalCard').innerHTML = activationStep2Html(habboName, data.code);
      bindActivationStep2(habboName);
    } catch (err) {
      msg.style.color = 'var(--danger)'; msg.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Gerar código de verificação';
    }
  };
}

function bindActivationStep2(habboName) {
  bindGlobalActions($('#modalCard'));
  const btn = $('#actStep2Btn');
  const msg = $('#actMsg');
  $('#actBackBtn').onclick = () => { $('#modalCard').innerHTML = activationStep1Html(habboName); bindActivationStep1(); };
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = 'Verificando...';
    msg.style.color = 'var(--muted)'; msg.textContent = '';
    try {
      const data = await apiFetch('/auth/habbo/check', { method: 'POST', body: JSON.stringify({ habboName }) });
      if (!data.verified) {
        msg.style.color = 'var(--warn)'; msg.textContent = data.message || 'Código ainda não encontrado na missão.';
        btn.disabled = false; btn.textContent = 'Já colei na missão — verificar';
        return;
      }
      $('#modalCard').innerHTML = activationStep3Html(habboName);
      bindActivationStep3(habboName);
    } catch (err) {
      msg.style.color = 'var(--danger)'; msg.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Já colei na missão — verificar';
    }
  };
}

function bindActivationStep3(habboName) {
  bindGlobalActions($('#modalCard'));
  const btn = $('#actStep3Btn');
  const msg = $('#actMsg');
  btn.onclick = async () => {
    const p1 = $('#actPassword').value, p2 = $('#actPassword2').value;
    if (p1.length < 8) { msg.style.color = 'var(--danger)'; msg.textContent = 'A senha precisa ter pelo menos 8 caracteres.'; return; }
    if (p1 !== p2) { msg.style.color = 'var(--danger)'; msg.textContent = 'As senhas não coincidem.'; return; }
    btn.disabled = true; btn.textContent = 'Concluindo cadastro...';
    msg.textContent = '';
    try {
      const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ habboName, password: p1 }) });
      closeModal();
      toast(`Bem-vindo(a), ${data.member.habboName}!`);
      enterSystemWithSession(data.token, data.member);
    } catch (err) {
      msg.style.color = 'var(--danger)'; msg.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Concluir cadastro';
    }
  };
}
