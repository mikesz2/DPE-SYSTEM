/* Rede DPE — feed da comunidade. Estado temporário isolado por sessão. */
function socialUi() {
  if (!state.socialUi || state.socialUi.owner !== state.user?.id) {
    if (state.socialUi?.previewUrl) URL.revokeObjectURL(state.socialUi.previewUrl);
    state.socialUi = { owner: state.user?.id, query: '', draft: '', imageUrl: '', file: null, previewUrl: null, replies: {}, expanded: {}, request: 0, highlights: null, error: '', permalinkHandled: null };
  }
  return state.socialUi;
}
function socialIcon(name) {
  const paths = {
    chat:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2v-9.5A8.5 8.5 0 0 1 10.5 4H13a8 8 0 0 1 8 7.5Z"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    pen:'<path d="m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5"/>',
    link:'<path d="m10 13 4-4 M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0 M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(0 -1)"/>',
    smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1 3 4 3 4-3 4-3 M8 8v1 M16 8v1"/>',
    refresh:'<path d="M20 8a8 8 0 1 0 0 8 M20 3v5h-5"/>',
    copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 5V3H3v13h2"/>',
    repost:'<path d="M4 7h12l-3-3 M16 7l-3 3 M20 17H8l3 3 M8 17l3-3"/>',
    bookmark:'<path d="M6 3h12v18l-6-4-6 4Z"/>',
    pin:'<path d="M9 3h6l-1 6 3 3H7l3-3Z M12 12v9"/>',
    close:'<path d="m6 6 12 12 M6 18 18 6"/>',
    trash:'<path d="M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7"/>',
    arrow:'<path d="M5 12h14 m-6-6 6 6-6 6"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.chat}</svg>`;
}
function socialAuthorAvatar(author, className = '') {
  return `<span class="social-avatar-frame ${className}"><img class="social-avatar-img ${!author?.avatarUrl ? 'social-avatar-fallback' : ''}" src="${escapeHtml(author?.avatarUrl || '/assets/login/brasao-dpe-v2.png')}" alt="" loading="lazy" decoding="async"></span>`;
}
function socialTextHtml(value) {
  return String(value || '').split(/(#[\p{L}\p{N}_]+|@[a-zA-Z0-9._:=\-]+)/u).map(part => {
    if (part.startsWith('#')) return `<button type="button" class="social-inline-tag" data-social-search="${escapeHtml(part)}">${escapeHtml(part)}</button>`;
    if (part.startsWith('@')) {
      const member = state.members.find(m => m.nick.toLowerCase() === part.slice(1).toLowerCase());
      if (member) return `<button type="button" class="social-inline-tag" data-social-member="${member.id}">${escapeHtml(part)}</button>`;
    }
    return escapeHtml(part);
  }).join('');
}
function socialCommentHtml(comment) {
  return `<div class="social-comment"><button type="button" class="social-author-avatar" data-social-member="${comment.author.id}" aria-label="Perfil de ${escapeHtml(comment.author.nick)}">${socialAuthorAvatar(comment.author, 'small')}</button><div><button type="button" class="social-author-link" data-social-member="${comment.author.id}">${escapeHtml(comment.author.nick)}</button><small> · ${escapeHtml(timeAgo(comment.createdAt))}</small><p>${socialTextHtml(comment.text)}</p></div></div>`;
}
function socialRepliesHtml(post) {
  const reply = socialUi().replies[post.id];
  if (!reply?.open) return '';
  return `<div class="social-comments" id="socialReplies-${post.id}">
    <div class="social-thread-label">Respostas <span>${Number(post.commentsCount || 0)}</span></div>
    <div class="social-reply-list">${reply.loaded ? (reply.items.map(socialCommentHtml).join('') || '<p class="social-inline-empty">Comece esta conversa.</p>') : '<p class="social-inline-empty" role="status">Carregando respostas…</p>'}</div>
    ${reply.error ? `<button class="social-thread-more" data-social-replies-more="${post.id}">Tentar carregar as respostas novamente</button>` : reply.nextCursor ? `<button class="social-thread-more" data-social-replies-more="${post.id}">Ver mais respostas</button>` : ''}
    <form class="social-comment-form" data-social-comment-form="${post.id}">${socialAuthorAvatar(state.user, 'small')}<input class="input" name="text" maxlength="500" autocomplete="off" aria-label="Sua resposta a ${escapeHtml(post.author.nick)}" placeholder="Publique sua resposta" value="${escapeHtml(reply.draft || '')}" required><button class="btn small" type="submit">Responder</button></form>
  </div>`;
}
function socialPostHtml(post) {
  const mine = Number(post.author?.id) === Number(state.user?.id);
  const canDelete = mine || can('MODERADOR');
  const ui = socialUi();
  const long = (post.text || '').length > 380 || (post.text || '').split('\n').length > 6;
  return `<article class="dpe-social-post ${post.pinned ? 'is-pinned' : ''}" data-social-post="${post.id}">
    <button type="button" class="social-author-avatar social-post-avatar" data-social-member="${post.author.id}" aria-label="Perfil de ${escapeHtml(post.author.nick)}">${socialAuthorAvatar(post.author)}</button>
    <div class="social-post-body"><header>
      <div class="social-post-author"><div><button type="button" class="social-author-link" data-social-member="${post.author.id}">${escapeHtml(post.author.nick)}</button><span class="social-rank-badge">${escapeHtml(post.author.division || 'DPE')}</span><time datetime="${escapeHtml(post.createdAt)}" title="${escapeHtml(new Date(post.createdAt).toLocaleString('pt-BR'))}">· ${escapeHtml(timeAgo(post.createdAt))}</time></div><small>${escapeHtml(post.author.rank)}</small></div>
      ${post.pinned ? '<span class="social-pinned-badge">' + socialIcon('pin') + ' FIXADA PELO COMANDO</span>' : ''}
      ${(canDelete || can('ADMINISTRADOR')) ? `<details class="social-post-menu"><summary aria-label="Opções da publicação">•••</summary>
        ${can('ADMINISTRADOR') ? `<button type="button" data-social-pin="${post.id}">${socialIcon('pin')} ${post.pinned ? 'Desafixar publicação' : 'Fixar pelo Comando'}</button>` : ''}
        ${canDelete ? `<button type="button" data-social-delete="${post.id}" ${mine ? '' : 'data-social-moderate="1"'}>${socialIcon('trash')} ${mine ? 'Excluir publicação' : 'Remover por moderação'}</button>` : ''}
      </details>` : ''}
    </header>
    ${post.text ? `<p class="social-post-text ${long && !ui.expanded[post.id] ? 'is-collapsed' : ''}" id="socialText-${post.id}">${socialTextHtml(post.text)}</p>${long ? `<button class="social-expand" data-social-expand="${post.id}" aria-expanded="${!!ui.expanded[post.id]}" aria-controls="socialText-${post.id}">${ui.expanded[post.id] ? 'Mostrar menos' : 'Mostrar mais'}</button>` : ''}` : ''}
    ${post.imageUrl ? `<figure class="dpe-social-media"><button type="button" data-social-image="${post.id}" aria-label="Ampliar imagem de ${escapeHtml(post.author.nick)}"><img class="social-media-img" src="${escapeHtml(post.imageUrl)}" alt="Imagem publicada por ${escapeHtml(post.author.nick)}" loading="lazy" decoding="async"></button></figure>` : ''}
    <div class="social-post-actions">
      <button type="button" class="social-action" data-social-comment-toggle="${post.id}" aria-label="Respostas: ${Number(post.commentsCount || 0)}" aria-expanded="${!!ui.replies[post.id]?.open}">${socialIcon('chat')}<b>${Number(post.commentsCount || 0)}</b><span>Responder</span></button>
      <button type="button" class="social-action social-like ${post.likedByMe ? 'active' : ''}" data-social-like="${post.id}" aria-pressed="${!!post.likedByMe}" aria-label="${post.likedByMe ? 'Descurtir' : 'Curtir'} publicação">${socialIcon('heart')}<b>${Number(post.likes || 0)}</b><span>Curtir</span></button>
      <button type="button" class="social-action social-repost ${post.repostedByMe ? 'active' : ''}" data-social-repost="${post.id}" aria-pressed="${!!post.repostedByMe}" aria-label="${post.repostedByMe ? 'Desfazer repost' : 'Repostar'} publicação">${socialIcon('repost')}<b>${Number(post.repostsCount || 0)}</b><span>Repostar</span></button>
      <button type="button" class="social-action social-bookmark ${post.bookmarkedByMe ? 'active' : ''}" data-social-bookmark="${post.id}" aria-pressed="${!!post.bookmarkedByMe}" aria-label="${post.bookmarkedByMe ? 'Remover dos salvos' : 'Salvar'} publicação">${socialIcon('bookmark')}<b>${Number(post.bookmarksCount || 0)}</b><span>Salvar</span></button>
      <button type="button" class="social-action social-copy" data-social-copy="${post.id}" aria-label="Copiar link da publicação">${socialIcon('copy')}<span>Copiar link</span></button>
    </div>${socialRepliesHtml(post)}</div>
  </article>`;
}
function socialFeedHtml() {
  const ui = socialUi();
  if (ui.error) return `<div class="social-feed-empty" role="alert">${socialIcon('refresh')}<h3>A rede não carregou</h3><p>${escapeHtml(ui.error)}</p><button class="btn" data-social-retry>Tentar novamente</button></div>`;
  if (!state.socialLoaded) return `<div class="social-feed-loading" role="status" aria-label="Carregando publicações"><span></span><div><b></b><b></b><b></b></div></div><div class="social-feed-loading"><span></span><div><b></b><b></b></div></div>`;
  if (!state.socialPosts.length) return `<div class="social-feed-empty">${socialIcon(ui.query ? 'search' : state.socialScope === 'saved' ? 'bookmark' : state.socialScope === 'pinned' ? 'pin' : 'chat')}<h3>${ui.query ? 'Nenhuma publicação encontrada' : state.socialScope === 'mine' ? 'Sua história começa aqui' : state.socialScope === 'saved' ? 'Nenhuma publicação salva' : state.socialScope === 'pinned' ? 'Nenhuma publicação fixada' : 'A conversa começa com você'}</h3><p>${ui.query ? 'Tente outro assunto, hashtag ou nick.' : state.socialScope === 'following' ? 'Siga militares em “Quem seguir” para acompanhar suas publicações.' : state.socialScope === 'saved' ? 'Use o botão Salvar para guardar publicações importantes.' : state.socialScope === 'pinned' ? 'Publicações institucionais fixadas pelo Comando aparecerão aqui.' : 'Compartilhe um momento, uma conquista ou uma ideia com a corporação.'}</p><button class="btn" ${ui.query || ['saved','pinned'].includes(state.socialScope) ? 'data-social-clear-search' : 'data-social-compose'}>${ui.query ? 'Limpar busca' : ['saved','pinned'].includes(state.socialScope) ? 'Voltar para a timeline' : 'Escrever publicação'}</button></div>`;
  return state.socialPosts.map(socialPostHtml).join('') + (state.socialNextCursor ? '<button type="button" class="social-load-more" id="socialLoadMore">Carregar mais publicações ↓</button>' : '<div class="social-feed-end">Você chegou ao fim das publicações <span>✦</span></div>');
}
function socialSuggestionsHtml() {
  if (!state.socialSuggestionsLoaded) return '<div class="social-suggestion-loading"></div><div class="social-suggestion-loading"></div>';
  if (!state.socialSuggestions.length) return '<p class="social-suggestions-empty">Nenhuma nova sugestão por enquanto.</p>';
  return state.socialSuggestions.map(member => `<article class="social-suggestion"><button type="button" class="social-suggestion-profile" data-social-member="${member.id}">${socialAuthorAvatar(member)}<span><b>${escapeHtml(member.nick)}</b><small>${escapeHtml(member.rank)}</small><em>${Number(member.followers || 0)} seguidores</em></span></button><button type="button" class="social-follow" data-social-follow="${member.id}" aria-label="Seguir ${escapeHtml(member.nick)}">Seguir</button></article>`).join('');
}
function socialHighlightsHtml() {
  const data = socialUi().highlights;
  if (!data) return '<p class="social-suggestions-empty">Carregando assuntos da rede…</p>';
  if (data.error) return '<p class="social-suggestions-empty">Os destaques estão indisponíveis no momento.</p>';
  return `<section class="social-aside-card"><header><span>O QUE A DPE ESTÁ CONVERSANDO</span><h2>Em pauta <b>#</b></h2></header>${data.trends.length ? data.trends.map((item,i) => `<button class="social-trend" data-social-search="${escapeHtml(item.tag)}"><small>${i+1} · Na comunidade</small><strong>${escapeHtml(item.tag)}</strong><span>${item.count} ${item.count === 1 ? 'publicação' : 'publicações'}</span></button>`).join('') : '<p class="social-suggestions-empty">Use hashtags nas suas publicações para começar um assunto.</p>'}<p class="social-aside-note">Hashtags das últimas 200 publicações, em 30 dias.</p></section>
    <section class="social-aside-card"><header><span>RECONHECIDOS PELA COMUNIDADE</span><h2>Destaques da rede ${socialIcon('heart')}</h2></header>${data.leaders.length ? data.leaders.map((member,i) => `<button class="social-leader" data-social-member="${member.id}"><span>${String(i+1).padStart(2,'0')}</span>${socialAuthorAvatar(member, 'small')}<span><b>${escapeHtml(member.nick)}</b><small>${member.likes} curtidas em publicações dos últimos 30 dias</small></span></button>`).join('') : '<p class="social-suggestions-empty">As publicações curtidas pela comunidade aparecerão aqui.</p>'}</section>`;
}
function pageSocial() {
  const ui = socialUi();
  const online = state.members.filter(m => m.online && !['EXPULSO','DESLIGADO'].includes(m.status));
  return `<div class="social-module-page rede-v2">
    <header class="rede-banner"><div class="rede-brand"><span class="rede-brand-icon">${socialIcon('chat')}</span><div><span>A VOZ DA NOSSA CORPORAÇÃO</span><h1>Rede<span>DPE</span><i>✦</i></h1><p>Histórias, conquistas e conexões.</p></div></div><div class="rede-banner-art" aria-hidden="true"><span>“</span><img src="/assets/login/brasao-dpe-v2.png" alt=""><b>DISCIPLINA. HONRA. UNIÃO.</b></div><div class="rede-online"><i></i>${online.length} online no System</div></header>
    <div class="dpe-social-layout">
      <div class="dpe-social-main">
        <div class="social-timeline-heading"><div><span>COMUNIDADE</span><h2>Sua linha do tempo</h2></div><button type="button" class="social-icon-button" id="socialRefresh" title="Atualizar publicações" aria-label="Atualizar publicações">${socialIcon('refresh')}</button></div>
        <nav class="social-feed-tabs" aria-label="Filtro da Rede DPE">${[['for-you','Para você'],['following','Seguindo'],['saved','Salvos'],['pinned','Fixados'],['mine','Minhas publicações']].map(([scope,label])=>`<button type="button" data-social-scope="${scope}" aria-pressed="${state.socialScope === scope}" class="${state.socialScope === scope ? 'active' : ''}">${label}</button>`).join('')}</nav>
        <section class="dpe-social-composer" aria-label="Nova publicação">
          <button type="button" class="social-author-avatar" data-social-member="${state.user.id}" aria-label="Meu perfil">${socialAuthorAvatar(state.user)}</button>
          <form id="socialComposer"><label for="socialText" class="social-composer-label">O que está acontecendo, ${escapeHtml(state.user.nick)}?</label><textarea id="socialText" name="text" maxlength="1200" rows="2" placeholder="Compartilhe com a DPE…">${escapeHtml(ui.draft)}</textarea><div class="social-composer-audience">${socialIcon('chat')} Visível para a corporação</div>
            <div class="social-image-preview hidden" id="socialImagePreview"><img alt="Prévia da imagem"><button type="button" id="socialRemoveImage" aria-label="Remover imagem">${socialIcon('close')}</button></div>
            <div class="social-image-field hidden" id="socialImageField"><label for="socialImageUrl">Link da imagem</label><input class="input" id="socialImageUrl" name="imageUrl" type="url" maxlength="1200" placeholder="https://…" value="${escapeHtml(ui.imageUrl)}"></div>
            <div class="social-emoji-picker hidden" id="socialEmojiPicker" aria-label="Escolher emoji">${['💚','👏','🎉','🫡','🏅','🔥','😂','✨'].map(emoji=>`<button type="button" data-social-emoji="${emoji}" aria-label="Inserir ${emoji}">${emoji}</button>`).join('')}</div>
            <footer><div class="social-composer-tools"><button type="button" class="social-icon-button" id="socialUpload" title="Adicionar imagem" aria-label="Adicionar imagem">${socialIcon('image')}</button><input id="socialImageFile" type="file" accept="image/jpeg,image/png,image/webp" hidden><button type="button" class="social-icon-button" id="socialLinkToggle" title="Imagem por link" aria-label="Adicionar imagem por link" aria-expanded="false">${socialIcon('link')}</button><button type="button" class="social-icon-button" id="socialEmojiToggle" title="Adicionar emoji" aria-label="Adicionar emoji" aria-expanded="false">${socialIcon('smile')}</button></div><span id="socialCharCount" aria-live="off">${ui.draft.length} / 1200</span><button class="btn" id="socialPublishBtn" type="submit">Publicar</button></footer><p class="social-composer-status" id="socialComposerStatus" role="status"></p>
          </form>
        </section>
        <div class="social-search-summary ${ui.query ? '' : 'hidden'}" id="socialSearchSummary"></div>
        <section class="dpe-social-feed" id="socialFeed" aria-label="Publicações">${socialFeedHtml()}</section>
      </div>
      <aside class="dpe-social-aside" aria-label="Explore a comunidade">
        <form class="social-search" id="socialSearchForm" role="search"><label for="socialSearch" class="social-search-label">Buscar na Rede DPE</label>${socialIcon('search')}<input id="socialSearch" maxlength="80" placeholder="Buscar na Rede DPE" value="${escapeHtml(ui.query)}"><button type="submit" aria-label="Buscar">${socialIcon('arrow')}</button></form>
        <div id="socialHighlights">${socialHighlightsHtml()}</div>
        <section class="social-aside-card"><header><span>AMPLIE SUAS CONEXÕES</span><h2>Quem seguir</h2></header><div id="socialSuggestions">${socialSuggestionsHtml()}</div></section>
        <section class="social-aside-card social-me-card"><button class="social-suggestion-profile" data-social-member="${state.user.id}">${socialAuthorAvatar(state.user)}<span><b>${escapeHtml(state.user.nick)}</b><small>${escapeHtml(state.user.rank)}</small></span>${socialIcon('arrow')}</button></section>
        <footer class="social-network-footer"><span>REDE DPE · COMUNIDADE INTERNA</span><p>O uniforme nos identifica.<br>A atitude nos conecta.</p></footer>
      </aside>
    </div><button type="button" class="social-compose-fab" data-social-compose aria-label="Escrever publicação">${socialIcon('pen')}</button>
  </div>`;
}
function bindSocialMediaErrors(root = document) {
  $$('.social-avatar-img', root).forEach(img => img.onerror = () => { img.onerror = null; img.classList.add('social-avatar-fallback'); img.src = '/assets/login/brasao-dpe-v2.png'; });
  $$('.social-media-img', root).forEach(img => img.onerror = () => { const media = img.closest('.dpe-social-media'); if (media) media.innerHTML = '<div class="social-media-error">Não foi possível carregar esta imagem.</div>'; });
}
function socialUpdatePost(post) {
  const node = document.querySelector(`[data-social-post="${post.id}"]`);
  if (node) node.outerHTML = socialPostHtml(post);
  bindSocialInteractions();
}
function socialRefreshFeedDom() {
  const feed = $('#socialFeed');
  if (state.route !== 'social' || !feed) return;
  feed.innerHTML = socialFeedHtml();
  bindSocialInteractions();
}
async function socialLoadReplies(post) {
  const ui = socialUi();
  const reply = ui.replies[post.id];
  if (!reply || reply.loading) return;
  reply.loading = true; reply.error = false;
  try {
    const data = await apiFetch(`/posts/${post.id}/comments${reply.nextCursor ? '?cursor=' + reply.nextCursor : ''}`);
    reply.items = [...(reply.items || []), ...data.comments].filter((item,index,items)=>items.findIndex(c=>c.id===item.id)===index);
    reply.nextCursor = data.nextCursor; reply.loaded = true;
  } catch (error) { reply.error = true; toast(error.message); }
  finally { reply.loading = false; if (socialUi() === ui && state.route === 'social') socialUpdatePost(post); }
}
function bindSocialInteractions() {
  const root = $('.rede-v2');
  if (!root) return;
  bindSocialMediaErrors(root);
  $$('[data-social-member]', root).forEach(button => button.onclick = () => {
    const id = Number(button.dataset.socialMember);
    const member = state.members.find(m => Number(m.id) === id) || (Number(state.user.id) === id ? state.user : null);
    if (member) viewMemberProfile(member); else toast('Este militar não está disponível no efetivo atual.');
  });
  $$('[data-social-compose]', root).forEach(button => button.onclick = () => { $('#socialComposer').scrollIntoView({behavior:'smooth',block:'center'}); $('#socialText').focus({preventScroll:true}); });
  $$('[data-social-search]', root).forEach(button => button.onclick = () => socialSearch(button.dataset.socialSearch));
  $('[data-social-clear-search]', root).forEach(button => button.onclick = () => {
    if (['saved','pinned'].includes(state.socialScope) && !socialUi().query) {
      state.socialScope = 'for-you';
      loadSocialFeed(true).catch(() => {});
      return;
    }
    socialSearch('');
  });
  $$('[data-social-retry]', root).forEach(button => button.onclick = () => loadSocialFeed(true).catch(()=>{}));
  $$('[data-social-expand]', root).forEach(button => button.onclick = () => {
    const id = Number(button.dataset.socialExpand); const ui = socialUi(); ui.expanded[id] = !ui.expanded[id];
    const text = $('#socialText-' + id); text.classList.toggle('is-collapsed', !ui.expanded[id]);
    button.textContent = ui.expanded[id] ? 'Mostrar menos' : 'Mostrar mais'; button.setAttribute('aria-expanded', String(ui.expanded[id]));
  });
  $$('[data-social-like]', root).forEach(button => button.onclick = async () => {
    if (button.disabled) return; button.disabled = true;
    try {
      const result = await apiFetch('/posts/' + button.dataset.socialLike + '/like', {method:'POST'});
      const post = state.socialPosts.find(p=>String(p.id)===button.dataset.socialLike);
      if (post) { post.likes=result.likes; post.likedByMe=result.liked; }
      if (button.isConnected) { button.classList.toggle('active', result.liked); button.setAttribute('aria-pressed',String(result.liked)); button.setAttribute('aria-label',result.liked?'Descurtir publicação':'Curtir publicação'); $('b',button).textContent=result.likes; }
    } catch(error) { toast(error.message); } finally { button.disabled=false; }
  });
  $('[data-social-repost]', root).forEach(button => button.onclick = async () => {
    if (button.disabled) return;
    button.disabled = true;
    try {
      const result = await apiFetch('/posts/' + button.dataset.socialRepost + '/repost', { method:'POST' });
      const post = state.socialPosts.find(item => String(item.id) === button.dataset.socialRepost);
      if (post) {
        post.repostedByMe = result.reposted;
        post.repostsCount = result.reposts;
      }
      if (button.isConnected) {
        button.classList.toggle('active', result.reposted);
        button.setAttribute('aria-pressed', String(result.reposted));
        button.setAttribute('aria-label', result.reposted ? 'Desfazer repost da publicação' : 'Repostar publicação');
        const count = $('b', button);
        if (count) count.textContent = result.reposts;
      }
      toast(result.reposted ? 'Publicação repostada.' : 'Repost removido.');
    } catch (error) {
      toast(error.message);
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  });

  $('[data-social-bookmark]', root).forEach(button => button.onclick = async () => {
    if (button.disabled) return;
    button.disabled = true;
    try {
      const result = await apiFetch('/posts/' + button.dataset.socialBookmark + '/bookmark', { method:'POST' });
      const post = state.socialPosts.find(item => String(item.id) === button.dataset.socialBookmark);
      if (post) {
        post.bookmarkedByMe = result.bookmarked;
        post.bookmarksCount = result.bookmarks;
      }
      if (state.socialScope === 'saved' && !result.bookmarked) {
        state.socialPosts = state.socialPosts.filter(item => String(item.id) !== button.dataset.socialBookmark);
        socialRefreshFeedDom();
        toast('Removido dos salvos.');
        return;
      }
      if (button.isConnected) {
        button.classList.toggle('active', result.bookmarked);
        button.setAttribute('aria-pressed', String(result.bookmarked));
        button.setAttribute('aria-label', result.bookmarked ? 'Remover dos salvos' : 'Salvar publicação');
        const count = $('b', button);
        if (count) count.textContent = result.bookmarks;
      }
      toast(result.bookmarked ? 'Publicação salva.' : 'Removido dos salvos.');
    } catch (error) {
      toast(error.message);
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  });

  $('[data-social-pin]', root).forEach(button => button.onclick = async () => {
    if (button.disabled) return;
    button.disabled = true;
    try {
      const data = await apiFetch('/posts/' + button.dataset.socialPin + '/pin', { method:'POST' });
      const index = state.socialPosts.findIndex(item => Number(item.id) === Number(data.post.id));
      if (index >= 0) state.socialPosts[index] = data.post;
      socialRefreshFeedDom();
      toast(data.post.pinned ? 'Publicação fixada pelo Comando.' : 'Publicação desafixada.');
    } catch (error) {
      toast(error.message);
      if (button.isConnected) button.disabled = false;
    }
  });

  $('[data-social-comment-toggle]', root).forEach(button => button.onclick = () => {
    const id = Number(button.dataset.socialCommentToggle); const post = state.socialPosts.find(p=>p.id===id); if (!post) return;
    const ui = socialUi(); const reply = ui.replies[id] ||= {open:false,items:[],loaded:false,draft:''}; reply.open = !reply.open;
    socialUpdatePost(post); if (reply.open && !reply.loaded) socialLoadReplies(post);
    if (reply.open) document.querySelector(`[data-social-comment-form="${id}"] input`)?.focus({preventScroll:true});
  });
  $$('[data-social-replies-more]', root).forEach(button => button.onclick = () => {button.disabled=true; const post=state.socialPosts.find(p=>String(p.id)===button.dataset.socialRepliesMore); if(post) socialLoadReplies(post);});
  $$('[data-social-comment-form]', root).forEach(form => {
    const id = Number(form.dataset.socialCommentForm); const input=$('input',form);
    input.oninput=()=>{socialUi().replies[id].draft=input.value;};
    form.onsubmit=async event=>{
      event.preventDefault(); const text=input.value.trim(); const submit=$('button[type="submit"]',form); if(!text||submit.disabled)return;
      submit.disabled=true;
      try {const data=await apiFetch(`/posts/${id}/comments`,{method:'POST',body:JSON.stringify({text})}); const post=state.socialPosts.find(p=>p.id===id); if(!post)return;
        post.commentsCount=data.commentsCount;const reply=socialUi().replies[id];reply.items=[data.comment,...reply.items];reply.draft='';socialUpdatePost(post);
      } catch(error){toast(error.message);} finally{submit.disabled=false;}
    };
  });
  $('[data-social-delete]', root).forEach(button => button.onclick = async () => {
    const moderated = button.dataset.socialModerate === '1';
    let reason = '';
    if (moderated) {
      const answer = window.prompt('Informe o motivo da remoção desta publicação (será enviado ao autor):');
      if (answer === null) return;
      reason = String(answer).trim();
      if (reason.length < 3) return toast('Informe um motivo com pelo menos 3 caracteres.');
    } else if (!window.confirm('Excluir esta publicação da Rede DPE?')) {
      return;
    }

    button.disabled = true;
    try {
      await apiFetch('/posts/' + button.dataset.socialDelete, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      });
      state.socialPosts = state.socialPosts.filter(post => String(post.id) !== button.dataset.socialDelete);
      button.closest('.dpe-social-post')?.remove();
      if (!state.socialPosts.length) socialRefreshFeedDom();
      toast(moderated ? 'Publicação removida e autor notificado.' : 'Publicação excluída.');
    } catch (error) {
      toast(error.message);
      button.disabled = false;
    }
  });
  $('[data-social-copy]', root).forEach(button => button.onclick = async () => {
    const post = state.socialPosts.find(item => String(item.id) === button.dataset.socialCopy);
    if (!post) return;
    const url = new URL(location.href);
    url.searchParams.set('post', String(post.id));
    url.hash = 'social';
    try {
      await navigator.clipboard.writeText(url.href);
      toast('Link da publicação copiado.');
    } catch {
      toast('Não foi possível copiar o link.');
    }
  });
  $$('[data-social-image]', root).forEach(button => button.onclick = () => {
    const post=state.socialPosts.find(p=>String(p.id)===button.dataset.socialImage);if(!post)return;
    const dialog=document.createElement('dialog');dialog.className='social-lightbox';dialog.setAttribute('aria-label','Imagem de '+post.author.nick);
    dialog.innerHTML=`<button type="button" aria-label="Fechar imagem">${socialIcon('close')}</button><img src="${escapeHtml(post.imageUrl)}" alt="Imagem publicada por ${escapeHtml(post.author.nick)}">`;
    document.body.append(dialog);dialog.showModal();$('button',dialog).onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close();};dialog.onclose=()=>{dialog.remove();button.focus({preventScroll:true});};
  });
  const more=$('#socialLoadMore');if(more)more.onclick=async()=>{more.disabled=true;more.textContent='Carregando…';try{await loadSocialFeed(false);}catch(error){toast(error.message);more.disabled=false;more.textContent='Tentar novamente';}};
  $$('[data-social-follow]', root).forEach(button=>button.onclick=async()=>{
    if(button.disabled)return;button.disabled=true;const id=Number(button.dataset.socialFollow);
    try{const result=await apiFetch(`/members/${id}/follow`,{method:'POST'});if(result.following){state.socialSuggestions=state.socialSuggestions.filter(m=>Number(m.id)!==id);$('#socialSuggestions').innerHTML=socialSuggestionsHtml();bindSocialInteractions();toast('Agora você segue esse militar.');}}catch(error){toast(error.message);}finally{button.disabled=false;}
  });
}
async function loadSocialFeed(reset = true) {
  const feed=$('#socialFeed');if(!feed||state.route!=='social')return;
  const ui=socialUi();const request=++ui.request;const scope=state.socialScope;const search=ui.query;
  if(reset){state.socialPosts=[];state.socialNextCursor=null;state.socialLoaded=false;ui.error='';socialRefreshFeedDom();}
  const query=new URLSearchParams({scope});if(search)query.set('q',search);if(!reset&&state.socialNextCursor)query.set('cursor',state.socialNextCursor);
  try{
    const data=await apiFetch('/posts?'+query);
    if(socialUi()!==ui||request!==ui.request||state.route!=='social'||feed!==$('#socialFeed'))return;
    state.socialPosts=(reset?data.posts:[...state.socialPosts,...data.posts]).filter((p,i,list)=>list.findIndex(x=>x.id===p.id)===i);state.socialNextCursor=data.nextCursor||null;state.socialLoaded=true;socialRefreshFeedDom();
  }catch(error){if(socialUi()===ui&&request===ui.request&&feed===$('#socialFeed')){state.socialLoaded=true;if(reset){ui.error=error.message;socialRefreshFeedDom();}}throw error;}
}
function socialSearchSummary() {
  const summary=$('#socialSearchSummary');if(!summary)return;const q=socialUi().query;
  summary.classList.toggle('hidden',!q);summary.innerHTML=q?`<span>Resultados para <strong>${escapeHtml(q)}</strong></span><button data-social-clear-search aria-label="Limpar busca">${socialIcon('close')}</button>`:'';
  bindSocialInteractions();
}
async function socialSearch(value) {
  socialUi().query=String(value).trim().slice(0,80);if($('#socialSearch'))$('#socialSearch').value=socialUi().query;socialSearchSummary();
  try{await loadSocialFeed(true);}catch{};
}
async function loadSocialSuggestions() {
  const ui=socialUi();
  try{const data=await apiFetch('/posts/suggestions');if(socialUi()!==ui)return;state.socialSuggestions=Array.isArray(data.suggestions)?data.suggestions:[];}
  finally{if(socialUi()===ui)state.socialSuggestionsLoaded=true;}
  if($('#socialSuggestions')){$('#socialSuggestions').innerHTML=socialSuggestionsHtml();bindSocialInteractions();}
}
async function loadSocialHighlights() {
  const ui=socialUi();try{ui.highlights=await apiFetch('/posts/highlights');}catch{ui.highlights={error:true};}
  if(socialUi()===ui&&$('#socialHighlights')){$('#socialHighlights').innerHTML=socialHighlightsHtml();bindSocialInteractions();}
}

async function uploadSocialImage(file) {
  if (!file) return null;
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Use uma imagem JPG, PNG ou WEBP.');
  if (file.size > 4 * 1024 * 1024) throw new Error('A imagem pode ter no máximo 4 MB.');

  const token = store.get('token', null);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch('/api/posts/media', {
      method: 'POST',
      body: file,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': file.type,
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    });
    const raw = await response.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch {}
    if (!response.ok) throw new Error(data?.error || data?.message || 'Não foi possível enviar a imagem.');
    return data?.imageUrl || null;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('O upload da imagem demorou demais.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function socialPermalinkId() {
  const value = Number(new URL(location.href).searchParams.get('post'));
  return Number.isInteger(value) && value > 0 ? value : null;
}

async function loadSocialPermalink(postId) {
  const ui = socialUi();
  if (!postId || ui.permalinkHandled === postId || state.route !== 'social') return;
  ui.permalinkHandled = postId;

  try {
    const data = await apiFetch('/posts/' + postId);
    if (!data?.post || state.route !== 'social' || socialUi() !== ui) return;

    const exists = state.socialPosts.some(post => Number(post.id) === Number(postId));
    if (!exists) state.socialPosts = [data.post, ...state.socialPosts];
    state.socialLoaded = true;
    socialRefreshFeedDom();

    requestAnimationFrame(() => {
      const node = document.querySelector('[data-social-post="' + postId + '"]');
      if (!node) return;
      node.classList.add('is-linked');
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => node.classList.remove('is-linked'), 2400);
    });
  } catch (error) {
    toast(error.message || 'Publicação não encontrada.');
  }
}

function bindSocialPage() {
  if(state.route!=='social')return;
  const ui=socialUi(),form=$('#socialComposer'),text=$('#socialText'),image=$('#socialImageUrl'),fileInput=$('#socialImageFile'),preview=$('#socialImagePreview'),publish=$('#socialPublishBtn');
  function updateComposer(){
    ui.draft=text.value;ui.imageUrl=image.value.trim();$('#socialCharCount').textContent=`${text.value.length} / 1200`;
    publish.disabled=!!ui.publishing||(!ui.draft.trim()&&!ui.imageUrl&&!ui.file);
    text.style.height='auto';text.style.height=Math.min(240,Math.max(65,text.scrollHeight))+'px';
  }
  function updatePreview(){
    const url=ui.previewUrl||ui.imageUrl;const img=$('img',preview);
    const valid=!!ui.previewUrl||/^https?:\/\//i.test(url);preview.classList.toggle('hidden',!valid);
    if(valid){img.src=url;img.onerror=()=>{preview.classList.add('hidden');$('#socialComposerStatus').textContent='Não foi possível visualizar a imagem. Confira o link ou remova o anexo.';};}
    else img.removeAttribute('src');
  }
  function clearImage(){if(ui.previewUrl)URL.revokeObjectURL(ui.previewUrl);ui.previewUrl=null;ui.file=null;ui.imageUrl='';image.value='';fileInput.value='';$('#socialComposerStatus').textContent='';updatePreview();updateComposer();}
  text.oninput=updateComposer;
  text.onkeydown=event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();if(!publish.disabled)form.requestSubmit();}};
  image.oninput=()=>{if(ui.previewUrl)URL.revokeObjectURL(ui.previewUrl);ui.previewUrl=null;ui.file=null;fileInput.value='';$('#socialComposerStatus').textContent='';updateComposer();updatePreview();};
  $('#socialUpload').onclick=()=>fileInput.click();
  $('#socialRemoveImage').onclick=clearImage;
  fileInput.onchange=()=>{
    const file=fileInput.files?.[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>4*1024*1024){fileInput.value='';return toast('Use uma imagem JPG, PNG ou WEBP de até 4 MB.');}
    clearImage();ui.file=file;ui.previewUrl=URL.createObjectURL(file);updateComposer();updatePreview();
  };
  [['#socialLinkToggle','#socialImageField'],['#socialEmojiToggle','#socialEmojiPicker']].forEach(([buttonId,panelId])=>{
    $(buttonId).onclick=()=>{const open=$(panelId).classList.toggle('hidden')===false;$(buttonId).setAttribute('aria-expanded',String(open));if(open)$(panelId).querySelector('input,button')?.focus();};
  });
  $$('[data-social-emoji]').forEach(button=>button.onclick=()=>{const start=text.selectionStart,end=text.selectionEnd;if(text.value.length-end+start+button.dataset.socialEmoji.length>1200)return;text.setRangeText(button.dataset.socialEmoji,start,end,'end');updateComposer();$('#socialEmojiPicker').classList.add('hidden');$('#socialEmojiToggle').setAttribute('aria-expanded','false');text.focus();});
  if(ui.imageUrl){$('#socialImageField').classList.remove('hidden');$('#socialLinkToggle').setAttribute('aria-expanded','true');}
  form.onsubmit=async event=>{
    event.preventDefault();if(ui.publishing)return;updateComposer();if(publish.disabled)return;
    ui.publishing=true;publish.disabled=true;publish.textContent='Publicando…';$('#socialComposerStatus').textContent=ui.file?'Enviando imagem…':'';
    // Preserve the submitted snapshot; edits during a request are disabled.
    const controls=[...form.elements];controls.forEach(el=>el.disabled=true);
    const body={text:ui.draft.trim(),imageUrl:ui.imageUrl};
    try{
      if(ui.file)body.imageUrl=await uploadSocialImage(ui.file);
      await apiFetch('/posts',{method:'POST',body:JSON.stringify(body)});
      if(socialUi()!==ui)return;
      ui.draft='';text.value='';clearImage();toast('Publicado na Rede DPE.');
      if(state.route==='social'){await loadSocialFeed(true);loadSocialHighlights();}
    }catch(error){toast(error.message);}finally{ui.publishing=false;controls.forEach(el=>el.disabled=false);publish.textContent='Publicar';updateComposer();}
  };
  $$('[data-social-scope]').forEach(button=>button.onclick=async()=>{
    const scope=button.dataset.socialScope;if(scope===state.socialScope)return;state.socialScope=scope;
    $$('[data-social-scope]').forEach(item=>{item.classList.toggle('active',item.dataset.socialScope===scope);item.setAttribute('aria-pressed',String(item.dataset.socialScope===scope));});
    try{await loadSocialFeed(true);}catch{};
  });
  $('#socialSearchForm').onsubmit=event=>{event.preventDefault();socialSearch($('#socialSearch').value);};
  $('#socialRefresh').onclick=async()=>{const button=$('#socialRefresh');button.disabled=true;try{await loadSocialFeed(true);loadSocialHighlights();}catch{}finally{button.disabled=false;}};
  updateComposer();updatePreview();socialSearchSummary();bindSocialInteractions();
  const permalinkId = socialPermalinkId();
  if (!state.socialLoaded) {
    loadSocialFeed(true).then(() => loadSocialPermalink(permalinkId)).catch(() => {});
  } else {
    loadSocialPermalink(permalinkId);
  }
  if(!state.socialSuggestionsLoaded)loadSocialSuggestions().catch(()=>{if($('#socialSuggestions'))$('#socialSuggestions').innerHTML='<p class="social-suggestions-empty">Não foi possível carregar as sugestões.</p>';});
  if(!ui.highlights)loadSocialHighlights();
}

function mailReaderHtml(message) {
  if (!message) return '<div class="mail-reader-empty"><span>✉</span><p>Selecione uma mensagem.</p></div>';
  return `<span class="mail-reader-kicker">COMUNICADO OFICIAL</span>
    <div class="mail-reader-from">DE: ${escapeHtml(message.from)}</div>
    <h2>${escapeHtml(message.subject)}</h2>
    <p>${escapeHtml(message.body)}</p>
    <footer>POLÍCIA DPE • DPE MAIL</footer>`;
}

function pageMail() {
  const compose = can('ADMINISTRADOR') ? '<button class="btn module-hero-action" id="composeMail">+ Escrever comunicado</button>' : '';
  if (!state.mail.length) return `<div class="dpe-module-page mail-module-page">
    <section class="module-hero module-hero-mail module-hero-compact">
      <div class="module-hero-copy"><span class="module-kicker">COMUNICAÇÃO / DPE MAIL</span><h1>Caixa postal <strong>institucional</strong></h1><p>Comunicados oficiais e mensagens administrativas da Polícia DPE em um canal centralizado.</p>${compose}</div>
      <div class="module-hero-emblem mail-hero-emblem" aria-hidden="true"><span>✉</span><b>DPE MAIL</b></div>
      <div class="module-hero-code">DPE // COMUNICAÇÃO INTERNA</div>
    </section>
    <div class="mail-empty-v2"><span>✉</span><h2>Nenhuma mensagem ainda</h2><p>Novos comunicados oficiais aparecerão aqui.</p></div>
  </div>`;

  const active = state.mail[0];
  const unread = state.mail.filter(message => !message.read).length;
  return `<div class="dpe-module-page mail-module-page">
    <section class="module-hero module-hero-mail module-hero-compact">
      <div class="module-hero-copy"><span class="module-kicker">COMUNICAÇÃO / DPE MAIL</span><h1>Caixa postal <strong>institucional</strong></h1><p>Comunicados oficiais e mensagens administrativas da Polícia DPE em um canal centralizado.</p><div class="module-hero-stats"><span><b>${state.mail.length}</b><small>mensagens</small></span><span><b>${unread}</b><small>não lidas</small></span></div>${compose}</div>
      <div class="module-hero-emblem mail-hero-emblem" aria-hidden="true"><span>✉</span><b>DPE MAIL</b><small>CANAL OFICIAL</small></div>
      <div class="module-hero-code">DPE // COMUNICAÇÃO INTERNA</div>
    </section>

    <section class="mail-layout mail-layout-v2">
      <aside class="mail-list mail-list-v2">
        <header><span>CAIXA DE ENTRADA</span><strong>${state.mail.length}</strong></header>
        ${state.mail.map((m,i)=>`<button type="button" class="mail-item ${i===0?'active':''}" data-mail="${i}">
          <span class="mail-sender-mark">${escapeHtml(String(m.from || 'D').slice(0,2).toUpperCase())}</span>
          <span class="mail-item-copy"><span><b>${escapeHtml(m.from)}</b>${!m.read?' <em>NOVO</em>':''}</span><p>${escapeHtml(m.subject)}</p><small>${escapeHtml(m.time)}</small></span>
        </button>`).join('')}
      </aside>
      <article class="mail-reader mail-reader-v2" id="mailReader">
        <span class="mail-reader-kicker">COMUNICADO OFICIAL</span>
        <div class="mail-reader-from">DE: ${escapeHtml(active.from)}</div>
        <h2>${escapeHtml(active.subject)}</h2>
        <p>${escapeHtml(active.body)}</p>
        <footer>POLÍCIA DPE • DPE MAIL</footer>
      </article>
    </section>
  </div>`;
}

function pageChats() {
  const others = state.members.filter(member => member.id !== state.user.id);
  const online = others.filter(member => member.online).length;
  return `<div class="dpe-module-page chats-module-page">
    <section class="module-hero module-hero-chats module-hero-compact">
      <div class="module-hero-copy"><span class="module-kicker">COMUNICAÇÃO / CONVERSAS</span><h1>Canal <strong>direto</strong></h1><p>Converse diretamente com outros militares da corporação em um espaço privado dentro do System.</p><div class="module-hero-stats"><span><b>${others.length}</b><small>contatos</small></span><span><b>${online}</b><small>online agora</small></span></div></div>
      <div class="module-hero-emblem chats-hero-emblem" aria-hidden="true"><span>•••</span><b>CHAT</b><small>DPE / DIRETO</small></div>
      <div class="module-hero-code">DPE // COMUNICAÇÃO ENTRE MEMBROS</div>
    </section>

    <section class="chat-layout chat-layout-v2">
      <aside class="chat-list chat-list-v2" id="chatMemberList">
        <header><div><span>CONTATOS</span><h2>Militares</h2></div><strong>${online} online</strong></header>
        <div class="chat-contact-scroll">
          ${others.length ? others.map(member => `<button type="button" class="chat-item" data-startchat="${member.id}">
            <span class="chat-avatar-wrap"><img src="${escapeHtml(member.avatarUrl || '/assets/login/brasao-dpe-v2.png')}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/login/brasao-dpe-v2.png'"><i class="${member.online?'online':''}"></i></span>
            <span class="chat-contact-copy"><b>${escapeHtml(member.nick)}</b><small>${escapeHtml(member.rank)} • ${escapeHtml(member.division || 'DPE')}</small></span>
            <span class="chat-contact-arrow">›</span>
          </button>`).join('') : '<div class="chat-no-contacts">Nenhum outro militar disponível.</div>'}
        </div>
      </aside>
      <main class="chat-reader chat-reader-v2" id="chatReader">
        <div class="chat-welcome"><span>💬</span><h2>Selecione um militar</h2><p>Escolha um contato ao lado para abrir uma conversa direta.</p></div>
      </main>
    </section>
  </div>`;
}


function bindChatsPage() {
  const list = $('#chatMemberList');
  if (!list) { clearInterval(window._chatPoll); return; }

  $$('[data-startchat]', list).forEach(el => el.onclick = async () => {
    $$('.chat-item', list).forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    try {
      const data = await apiFetch(`/conversations/with/${el.dataset.startchat}`, { method: 'POST' });
      openConversation(data.conversation.id);
    } catch (err) { toast(err.message); }
  });

  // Se veio de "Enviar mensagem" no perfil de alguém, já abre a conversa
  if (state.openConversationId) {
    const id = state.openConversationId;
    state.openConversationId = null;
    openConversation(id);
  }
}

async function openConversation(conversationId) {
  const reader = $('#chatReader');
  if (!reader) return;
  reader.innerHTML = `<header class="chat-conversation-head"><div><span>CONVERSA DIRETA</span><h2>Mensagens</h2></div><small>Atualização automática</small></header>
    <div class="message-bubbles message-bubbles-v2" id="msgBubbles"><div class="chat-loading">Carregando mensagens...</div></div>
    <div class="chat-compose chat-compose-v2"><input class="input" id="chatInput" maxlength="1200" autocomplete="off" placeholder="Digite uma mensagem..."><button class="btn small" id="chatSendBtn">Enviar</button></div>`;

  const load = async () => {
    try {
      const data = await apiFetch(`/conversations/${conversationId}/messages`);
      const box = $('#msgBubbles');
      if (!box) return;
      box.innerHTML = data.messages.length
        ? data.messages.map(message => `<div class="bubble ${message.from===state.user.nick?'me':''}">${message.from!==state.user.nick?`<b>${escapeHtml(message.from)}</b>`:''}<span>${escapeHtml(message.text)}</span></div>`).join('')
        : '<div class="chat-empty-conversation"><span>✦</span><p>Nenhuma mensagem ainda. Envie a primeira.</p></div>';
      box.scrollTop = box.scrollHeight;
    } catch (error) {
      const box = $('#msgBubbles');
      if (box) box.innerHTML = `<div class="chat-empty-conversation"><span>!</span><p>${escapeHtml(error.message || 'Não foi possível carregar a conversa.')}</p></div>`;
    }
  };

  const send = async () => {
    const input = $('#chatInput');
    const button = $('#chatSendBtn');
    const value = input?.value.trim();
    if (!input || !button || !value) return;
    button.disabled = true;
    input.disabled = true;
    try {
      await apiFetch(`/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ text: value }) });
      input.value = '';
      await load();
      input.focus();
    } catch (error) {
      toast(error.message);
    } finally {
      if (button.isConnected) button.disabled = false;
      if (input.isConnected) input.disabled = false;
    }
  };

  $('#chatSendBtn').onclick = send;
  $('#chatInput').onkeydown = event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } };

  await load();
  clearInterval(window._chatPoll);
  window._chatPoll = setInterval(load, 4000);
}


/* -------------------------------- Loja -------------------------------------- */
function pageStore() {
  const owned = state.shopItems.filter(item => item.owned).length;
  return `<div class="dpe-module-page store-module-page">
    <section class="module-hero module-hero-store">
      <div class="module-hero-copy">
        <span class="module-kicker">RECURSOS / LOJA DPE</span>
        <h1>Loja de <strong>Elite Coins</strong></h1>
        <p>Personalize seu perfil com capas, emblemas e itens exclusivos da corporação.</p>
        <div class="store-balance"><span>SEU SALDO</span><strong>${eliteCoinAmount(state.user.coins)}</strong><small>ELITE COINS</small></div>
      </div>
      <div class="module-hero-emblem store-hero-emblem" aria-hidden="true"><img src="/assets/store/icone-loja-sacolas-v1.png" alt=""><b>LOJA DPE</b><small>ITENS EXCLUSIVOS</small></div>
      <div class="module-hero-code">DPE // RECOMPENSAS DA CORPORAÇÃO</div>
    </section>

    <div class="module-section-head store-section-head"><div><span>CATÁLOGO</span><h2>Itens disponíveis</h2></div><small>${owned} ${owned===1?'item adquirido':'itens adquiridos'}</small></div>
    <div class="shop-grid shop-grid-v2">
      ${state.shopItems.length ? state.shopItems.map((it,index) => `<article class="shop-item shop-item-v2 ${it.kind === 'PROFILE_COVER' ? 'shop-cover-item' : ''}">
        <span class="shop-item-index">${String(index + 1).padStart(2,'0')}</span>
        <div class="shop-visual">
          ${it.imageUrl && it.kind === 'PROFILE_COVER'
            ? `<img class="shop-cover-preview" src="${escapeHtml(it.imageUrl)}" alt="Prévia de ${escapeHtml(it.name)}" decoding="async">`
            : it.imageUrl
              ? `<div class="shop-emblem-frame"><img class="shop-emblem-preview" src="${escapeHtml(it.imageUrl)}" alt="${escapeHtml(it.name)}" decoding="async"></div>`
              : `<div class="ico">${it.ico}</div>`}
        </div>
        <div class="shop-item-copy"><small>${escapeHtml(it.kind === 'PROFILE_COVER' ? 'CAPA DE PERFIL' : it.kind === 'EMBLEM' ? 'EMBLEMA' : 'ITEM DPE')}</small><h3>${escapeHtml(it.name)}</h3>${it.description ? `<p>${escapeHtml(it.description)}</p>` : ''}</div>
        <div class="shop-item-bottom"><div class="price"><small>VALOR</small><strong>${eliteCoinAmount(it.price)}</strong></div>
          ${it.kind === 'PROFILE_COVER' && it.owned
            ? `<button class="btn small equip-cover" data-equip-cover="${it.id}" ${it.equipped ? 'disabled' : ''}>${it.equipped ? 'Usando no perfil' : 'Usar no perfil'}</button>`
            : it.kind === 'EMBLEM' && it.owned
              ? `<button class="btn small toggle-emblem" data-emblem-id="${it.id}" data-emblem-action="${it.equipped ? 'unequip' : 'equip'}">${it.equipped ? 'Remover do perfil' : 'Usar no perfil'}</button>`
              : `<button class="btn small buy" data-id="${it.id}">Comprar</button>`}
        </div>
      </article>`).join('') : '<div class="dpe-empty"><span>🛍️</span><strong>Nenhum item disponível</strong><p>Novos itens aparecerão no catálogo quando forem publicados.</p></div>'}
    </div>
  </div>`;
}


