/* Sliding highlight adapted from Uiverse.io by Novaxlo.
   Measure areas for keyboard navigation, browser zoom and mobile screens. */
(() => {
  const form = document.getElementById('loginForm');
  const areas = [...form.querySelectorAll('.dpe-form-area')];
  let hovered = null;
  function update() {
    const focused = areas.find(area => area.contains(document.activeElement));
    const active = hovered || focused;
    areas.forEach(area => area.classList.toggle('is-active', area === active));
    if (active) {
      form.dataset.activeArea = active.id;
      form.style.setProperty('--band-y', `${active.offsetTop}px`);
      form.style.setProperty('--band-height', `${active.offsetHeight}px`);
    } else {
      delete form.dataset.activeArea;
      form.style.removeProperty('--band-y');
      form.style.removeProperty('--band-height');
    }
  }
  areas.forEach(area => {
    area.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = area; update(); } });
    area.addEventListener('pointerleave', () => { hovered = null; update(); });
  });
  form.addEventListener('focusin', update);
  form.addEventListener('focusout', () => requestAnimationFrame(update));
  new ResizeObserver(update).observe(form);
  document.getElementById('togglePassword').onclick = event => {
    const input = document.getElementById('loginPass');
    const showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    event.currentTarget.setAttribute('aria-pressed', String(showing));
    event.currentTarget.setAttribute('aria-label', showing ? 'Ocultar senha' : 'Mostrar senha');
  };
  document.getElementById('forgotPassword').onclick = () => {
    openPasswordRecovery();
  };
})();

function openPasswordRecovery() {
  const previousFocus = document.activeElement;
  openModal(`<section class="dpe-recovery" role="dialog" aria-modal="true" aria-labelledby="recoveryTitle">
    <div class="modal-head"><div><small>POLÍCIA DPE · SYSTEM</small><h2 id="recoveryTitle">Recuperar acesso</h2></div><button class="icon-btn" data-close aria-label="Fechar">✕</button></div>
    <form class="modal-body" id="recoveryForm">
      <p>Confirme sua conta pela missão do Habbo para criar uma nova senha do System.</p>
      <div class="field"><label for="recoveryNick">Nick no Habbo</label><input class="input" id="recoveryNick" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="100" required value="${escapeHtml($('#loginUser').value.trim())}"></div>
      <div id="recoveryChallenge" hidden>
        <p>Cole este código na <b>missão do Habbo</b> e salve. Ele vale por 15 minutos.</p>
        <div class="recovery-code-row"><code id="recoveryCode"></code><button type="button" class="btn" id="recoveryCopy">Copiar</button></div>
        <div class="field"><label for="recoveryPassword">Nova senha do System</label><input class="input" id="recoveryPassword" type="password" autocomplete="new-password" minlength="8" maxlength="72" disabled><small>Pelo menos 8 caracteres.</small></div>
        <div class="field"><label for="recoveryConfirm">Confirmar nova senha</label><input class="input" id="recoveryConfirm" type="password" autocomplete="new-password" minlength="8" maxlength="72" disabled></div>
      </div>
      <p class="form-msg" id="recoveryMsg" role="status" aria-live="polite"></p>
      <button class="btn full" type="submit" id="recoverySubmit">Gerar código de recuperação</button>
      <button class="btn ghost full" type="button" id="recoveryRestart" hidden>Gerar outro código / trocar nick</button>
      <p class="recovery-note">Use uma senha própria para o System. Você pode remover o código da missão após recuperar o acesso.</p>
    </form></section>`);
  const form = $('#recoveryForm'), nick = $('#recoveryNick'), msg = $('#recoveryMsg');
  const submit = $('#recoverySubmit'), password = $('#recoveryPassword'), confirm = $('#recoveryConfirm');
  let challenge = null;
  $('#recoveryRestart').onclick = openPasswordRecovery;
  $('#recoveryCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(challenge.code); msg.textContent = 'Código copiado! Cole na missão do Habbo.'; }
    catch { msg.textContent = 'Selecione o código acima e copie manualmente.'; }
  };
  form.onsubmit = async event => {
    event.preventDefault();
    if (challenge && password.value !== confirm.value) { msg.textContent = 'As senhas não coincidem.'; confirm.focus(); return; }
    submit.disabled = true;
    $('#recoveryRestart').disabled = true;
    submit.textContent = challenge ? 'Verificando missão...' : 'Gerando código...';
    msg.textContent = '';
    try {
      if (!challenge) {
        const data = await apiFetch('/auth/password-reset/start', { method: 'POST', body: JSON.stringify({ habboName: nick.value.trim() }) });
        if (!form.isConnected) return;
        challenge = data;
        nick.value = data.habboName;
        nick.readOnly = true;
        $('#recoveryCode').textContent = data.code;
        $('#recoveryChallenge').hidden = false;
        $('#recoveryRestart').hidden = false;
        password.disabled = confirm.disabled = false;
        password.required = confirm.required = true;
        password.focus();
      } else {
        const data = await apiFetch('/auth/password-reset/complete', { method: 'POST', body: JSON.stringify({ habboName: nick.value, resetToken: challenge.resetToken, newPassword: password.value }) });
        password.value = confirm.value = '';
        if (!form.isConnected) return;
        closeModal();
        $('#loginUser').value = data.habboName;
        $('#loginPass').value = '';
        $('#loginMsg').style.color = '#557340';
        $('#loginMsg').textContent = data.message;
        $('#loginPass').focus();
        return;
      }
    } catch (err) { msg.textContent = err.message; }
    finally {
      submit.disabled = false;
      const restart = form.querySelector('#recoveryRestart');
      if (restart) restart.disabled = false;
      submit.textContent = challenge ? 'Confirmar missão e redefinir senha' : 'Gerar código de recuperação';
    }
  };
  // Keep keyboard navigation within this recovery dialog.
  const recovery = form.parentElement;
  recovery.querySelector('[data-close]').onclick = () => { closeModal(); previousFocus?.focus(); };
  recovery.onkeydown = event => {
    if (event.key === 'Escape') { closeModal(); previousFocus?.focus(); }
    if (event.key !== 'Tab') return;
    const items = [...recovery.querySelectorAll('button,input')].filter(el => !el.disabled && el.getClientRects().length);
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  nick.focus();
}
