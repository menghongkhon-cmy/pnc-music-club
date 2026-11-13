/* PNC Music Club V16 enhancements — visual only, no editor overrides. */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ready = () => {
    if (document.querySelector('.pnc16-scroll-line')) return;
    const line = document.createElement('div');
    line.className = 'pnc16-scroll-line';
    line.setAttribute('aria-hidden','true');
    document.body.appendChild(line);

    const top = document.createElement('button');
    top.type = 'button';
    top.className = 'pnc16-top';
    top.textContent = '↑';
    top.setAttribute('aria-label','Back to top');
    top.title = 'Back to top';
    top.addEventListener('click', () => window.scrollTo({ top:0, behavior:reduced.matches ? 'auto' : 'smooth' }));
    document.body.appendChild(top);

    let queued = false;
    const update = () => {
      queued = false;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      document.documentElement.style.setProperty('--p16-progress', String(Math.max(0, Math.min(1, window.scrollY/max))));
      top.classList.toggle('is-visible', window.scrollY > 680);
    };
    window.addEventListener('scroll', () => {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }, {passive:true});
    window.addEventListener('resize', update, {passive:true});
    update();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();
