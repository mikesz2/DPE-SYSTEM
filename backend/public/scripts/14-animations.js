/* ==========================================================================
   SYSTEM DPE — transições e animações
   Filosofia: navegação entre páginas tem uma transição suave (fade + leve
   deslocamento); atualizações no lugar (depois de curtir, comprar, decidir
   um requerimento) continuam instantâneas — não faz sentido esperar uma
   animação toda vez que um contador muda.
   ========================================================================== */
let _lastRoute = null;
let _routeTransitionToken = 0;
function reduceMotion(){ return store.get('reduceMotion', false) === true; }

function go(route) {
  if (route === 'profile') state.profileMemberId = null;
  if (route === 'documents') state.documentId = null;
  navigateTo(route);
}

function navigateTo(route, pushHash = true) {
  const safeRoute = Object.prototype.hasOwnProperty.call(PAGES, route) ? route : 'dashboard';
  state.route = safeRoute;
  if (pushHash && location.hash.replace('#', '') !== safeRoute) location.hash = safeRoute;
  renderNav();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toggleSidebar(false);
}

function render() {
  if (!state.user) return;
  if (!Object.prototype.hasOwnProperty.call(PAGES, state.route)) {
    state.route = 'dashboard';
    if (location.hash.replace('#', '') !== 'dashboard') history.replaceState(null, '', '#dashboard');
    renderNav();
  }
  const fn = PAGES[state.route];
  const html = fn();
  if (state.route !== _lastRoute) {
    if (Object.prototype.hasOwnProperty.call(PAGES, state.route)) trackVisit(state.route);
    _lastRoute = state.route;
    transitionContent(html, bindPage);
  } else {
    $('#content').innerHTML = html;
    bindPage();
  }
}

function transitionContent(html, after) {
  const el = $('#content');
  const token = ++_routeTransitionToken;
  if (!el) return;
  const shell = el.closest('.app-shell');
  const transitionLayer = $('#routeTransition');
  const motionOff = reduceMotion();

  el.classList.remove('content-in','content-route-ready');
  shell?.classList.add('route-switching');
  transitionLayer?.classList.remove('leaving');
  transitionLayer?.classList.add('active');

  const finish = () => {
    if (token !== _routeTransitionToken) return;
    shell?.classList.remove('route-switching');
    transitionLayer?.classList.add('leaving');
    setTimeout(() => transitionLayer?.classList.remove('active','leaving'), 260);
    el.classList.remove('content-in','content-out');
    el.classList.add('content-route-ready');
  };

  const swap = () => {
    if (token !== _routeTransitionToken) return;
    el.innerHTML = html;
    el.scrollTop = 0;
    el.classList.remove('content-out');
    if (after) after();

    if (motionOff) {
      finish();
      return;
    }

    const nodes = [...new Set([
      ...Array.from(el.children),
      ...Array.from(el.querySelectorAll('.module-hero,.card,.stat,.panel'))
    ])].filter(node => node && node.nodeType === 1).slice(0,16);

    nodes.forEach((node,index) => {
      node.classList.add('route-stagger-item');
      node.style.setProperty('--route-delay', Math.min(index,9) * 28 + 'ms');
    });

    requestAnimationFrame(() => {
      if (token !== _routeTransitionToken) return;
      el.classList.add('content-in');
    });

    setTimeout(() => {
      if (token !== _routeTransitionToken) return;
      nodes.forEach(node => {
        node.classList.remove('route-stagger-item');
        node.style.removeProperty('--route-delay');
      });
      finish();
    }, 760);
  };

  if (motionOff) {
    swap();
  } else {
    el.classList.add('content-out');
    setTimeout(swap, 220);
  }
}

function toggleSidebar(force) {
  const sb = $('#sidebar'), bd = $('#sidebarBackdrop');
  const willOpen = force !== undefined ? force : !sb.classList.contains('open');
  sb.classList.toggle('open', willOpen);
  $('#menuBtn').setAttribute('aria-expanded', String(willOpen));
  if (bd) bd.classList.toggle('show', willOpen);
}
