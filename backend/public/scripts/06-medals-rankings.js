/* ==========================================================================
   SYSTEM DPE — Quadro de Condecorações e Rankings
   ========================================================================== */
function pageMedals() {
  const byKind = state.medals;
  const kindDesc = {
    'Medalha de Honra': 'Condecoração mais prestigiosa da DPE, concedida aos militares que se destacaram por atos de bravura, liderança exemplar ou contribuições significativas para a corporação. Concedida de forma permanente ou temporária, pelo Alto Comando.',
    'Medalha de Mérito': 'Reconhece desempenho consistentemente acima da média em funções administrativas ou operacionais.',
    'Estrela de Bravura': 'Concedida a militares que agiram com coragem excepcional em situação de risco.',
  };
  const total = Object.values(byKind).reduce((sum,list)=>sum + list.length,0);
  const hasAny = total > 0;

  return `<div class="dpe-module-page medals-module-page">
    <section class="module-hero module-hero-honor">
      <div class="module-hero-copy">
        <span class="module-kicker">CORPORAÇÃO / HONRARIAS</span>
        <h1>Salão de <strong>Honra</strong></h1>
        <p>Reconhecimento institucional aos militares que marcaram a história da Polícia DPE por mérito, bravura e excelência.</p>
        <div class="module-hero-stats">
          <span><b>${total}</b><small>condecorações</small></span>
          <span><b>${Object.keys(byKind).length}</b><small>categorias</small></span>
        </div>
        ${can('ADMINISTRADOR') ? '<button class="btn module-hero-action" id="newMedalBtn">+ Conceder condecoração</button>' : ''}
      </div>
      <div class="module-hero-emblem honor-hero-emblem" aria-hidden="true"><span>★</span><img src="/assets/login/brasao-dpe-v2.png" alt=""><b>HONRA</b></div>
      <div class="module-hero-code">DPE // SALÃO DE HONRA</div>
    </section>

    ${hasAny ? Object.entries(byKind).map(([kind, list]) => `
      <section class="honor-category">
        <header><div><span>CONDECORAÇÃO</span><h2>${escapeHtml(kind)}</h2></div><small>${list.length} ${list.length===1?'militar':'militares'}</small></header>
        <p>${escapeHtml(kindDesc[kind] || '')}</p>
        <div class="honor-grid-v2">
          ${list.map((m,index) => `<article class="honor-card-v2">
            <div class="honor-card-rank">${String(index + 1).padStart(2,'0')}</div>
            <div class="honor-avatar">${m.avatar}</div>
            <div class="honor-medal-mark">✦</div>
            <span class="honor-tag">#${m.order} • ${escapeHtml(m.type.toUpperCase())}</span>
            <h3>${escapeHtml(m.name)}</h3>
            <div class="honor-meta"><span><small>TÉRMINO</small><b>${escapeHtml(m.ends)}</b></span><span><small>CONCEDIDO POR</small><b>${escapeHtml(m.granter)}</b></span></div>
          </article>`).join('')}
        </div>
      </section>`).join('') : '<div class="dpe-empty"><span>🎖️</span><strong>Nenhuma condecoração concedida ainda.</strong><p>Os reconhecimentos oficiais aparecerão neste salão.</p></div>'}
  </div>`;
}

function newMedalModal() {
  return `
  <div class="modal-head"><b>Conceder condecoração</b><button class="icon-btn" data-close>✕</button></div>
  <div class="modal-body">
    <form id="medalForm">
      <div class="field"><label>Militar</label>
        <select class="input" name="memberId">${state.members.map(m=>`<option value="${m.id}">${m.nick}</option>`).join('')}</select>
      </div>
      <div class="field" style="margin-top:10px"><label>Tipo</label>
        <select class="input" name="kind"><option>Medalha de Honra</option><option>Medalha de Mérito</option><option>Estrela de Bravura</option></select>
      </div>
      <div class="field" style="margin-top:10px"><label>Duração</label>
        <select class="input" name="duration"><option value="PERMANENTE">Permanente</option><option value="TEMPORARIA">Temporária</option></select>
      </div>
      <button class="btn full" style="margin-top:14px">Conceder</button>
    </form>
  </div>`;
}

function pageRankings() {
  const byHours = [...state.members].sort((a,b) => b.hours - a.hours);
  const [p1,p2,p3] = byHours;
  const totalHours = byHours.reduce((sum,m)=>sum + Number(m.hours || 0),0);
  return `<div class="dpe-module-page rankings-module-page">
    <section class="module-hero module-hero-rankings">
      <div class="module-hero-copy">
        <span class="module-kicker">CORPORAÇÃO / DESEMPENHO</span>
        <h1>Ranking de <strong>destaque</strong></h1>
        <p>Presença, condecorações e influência reunidas em um painel de desempenho da corporação.</p>
        <div class="module-hero-stats">
          <span><b>${state.members.length}</b><small>militares</small></span>
          <span><b>${totalHours}h</b><small>horas registradas</small></span>
        </div>
      </div>
      <div class="module-hero-emblem ranking-hero-emblem" aria-hidden="true"><span>1</span><b>TOP DPE</b><small>MÉRITO • PRESENÇA</small></div>
      <div class="module-hero-code">DPE // PAINEL DE DESEMPENHO</div>
    </section>

    <section class="ranking-main-card">
      <header><div><span>RANKING PRINCIPAL</span><h2>Presença em base</h2></div><small>ATUALIZADO AGORA</small></header>
      <div class="ranking-podium ranking-podium-v2">
        ${p2 ? podiumSlot(p2,2) : ''}
        ${p1 ? podiumSlot(p1,1) : ''}
        ${p3 ? podiumSlot(p3,3) : ''}
      </div>
      <div class="rank-list rank-list-v2">
        ${byHours.map((m,i) => `<div class="ranking-row-v2"><span class="ranking-position">${String(i+1).padStart(2,'0')}</span><span class="ranking-avatar">${m.avatar}</span><div><b>${escapeHtml(m.nick)}</b><small>${escapeHtml(m.rank)}</small></div><strong>${m.hours}h</strong></div>`).join('')}
      </div>
    </section>

    <div class="ranking-secondary-grid">
      <section class="ranking-secondary-card"><header><span>CONDECORAÇÕES</span><h3>Mais reconhecidos</h3></header><div>${[...state.members].sort((a,b)=>b.medals-a.medals).slice(0,5).map((m,i)=>`<div class="ranking-mini-row"><span>${i+1}</span>${m.avatar}<div><b>${escapeHtml(m.nick)}</b><small>${escapeHtml(m.rank)}</small></div><strong>${m.medals} ✦</strong></div>`).join('')}</div></section>
      <section class="ranking-secondary-card"><header><span>SEGUIDORES</span><h3>Mais acompanhados</h3></header><div>${[...state.members].sort((a,b)=>b.followers-a.followers).slice(0,5).map((m,i)=>`<div class="ranking-mini-row"><span>${i+1}</span>${m.avatar}<div><b>${escapeHtml(m.nick)}</b><small>${escapeHtml(m.rank)}</small></div><strong>${m.followers}</strong></div>`).join('')}</div></section>
    </div>
  </div>`;
}

function podiumSlot(m, place) {
  return `<div class="podium-slot p${place}">
    <span class="rank-avatar">${m.avatar}</span>
    <b>${m.nick}</b><small>${m.hours}h</small>
    <div class="podium-block">${place}</div>
  </div>`;
}
