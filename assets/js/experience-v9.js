/* Page navigation + progressive 3D card enhancement. Pure JavaScript, no framework. */
(() => {
  'use strict';
  // The visible browser-tab name stays consistent as the visitor moves among pages.
  // Existing per-page source titles and SEO metadata remain in HTML for search engines.
  document.title = 'PNC Music Club';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.body.classList.add('pnc-v9-enter');
  const scenes = [...document.querySelectorAll('.club-3d-scene')];
  for (const scene of scenes) {
    if (reduceMotion.matches || !window.matchMedia('(hover:hover) and (pointer:fine)').matches) continue;
    let scheduled = false;
    let pointer = null;
    const render = () => {
      scheduled = false;
      if (!pointer) return;
      const rect = scene.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, ((pointer.x - rect.left) / rect.width - .5) * 2));
      const ny = Math.max(-1, Math.min(1, ((pointer.y - rect.top) / rect.height - .5) * 2));
      scene.style.setProperty('--card-rotate-x', `${(-ny * 8).toFixed(2)}deg`);
      scene.style.setProperty('--card-rotate-y', `${(nx * 10).toFixed(2)}deg`);
    };
    scene.addEventListener('pointermove', e => {
      pointer = {x:e.clientX,y:e.clientY};
      if (!scheduled) {scheduled = true;requestAnimationFrame(render);}
    }, {passive:true});
    scene.addEventListener('pointerleave', () => {
      pointer=null;
      scene.style.setProperty('--card-rotate-x','0deg');
      scene.style.setProperty('--card-rotate-y','0deg');
    });
  }

  // Keep separate HTML pages and the existing server/admin architecture intact.
  // Animate only normal local page navigations, not hashes, forms, admin links or new tabs.
  if (!reduceMotion.matches) document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const a = event.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download')) return;
    let next;
    try { next = new URL(a.href, location.href); } catch (_) {return;}
    if (next.origin !== location.origin || next.hash || next.pathname === location.pathname) return;
    if (!(/\/(?:index\.html|pages\/(?:about|activities|news|achievements|gallery|contact)\.html)$/.test(next.pathname) || next.pathname === '/')) return;
    event.preventDefault();
    document.body.classList.add('pnc-v9-leaving');
    window.setTimeout(() => { location.assign(next.href); }, 230);
  });
  window.addEventListener('pageshow', () => document.body.classList.remove('pnc-v9-leaving'));
})();
