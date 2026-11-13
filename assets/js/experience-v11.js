(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function getAssetPath(file) {
    return location.pathname.includes('/pages/') ? `../assets/${file}` : `assets/${file}`;
  }

  function buildLoader() {
    if (document.querySelector('.pnc-v11-loader')) return;
    const loader = document.createElement('div');
    loader.className = 'pnc-v11-loader';
    loader.innerHTML = `
      <div class="pnc-v11-loader-box">
        <div class="pnc-v11-loader-logo"><img src="${getAssetPath('img/logo.png')}" alt="PNC Music Club logo"></div>
        <p>PNC MUSIC CLUB</p>
        <small>Loading the experience…</small>
        <div class="pnc-v11-loader-bar"></div>
      </div>`;
    document.body.append(loader);
    const hide = () => setTimeout(() => loader.classList.add('is-hidden'), 240);
    if (document.readyState === 'complete') hide();
    // Dismiss after the first paint instead of waiting for every slide photo.
    requestAnimationFrame(() => requestAnimationFrame(hide));
  }

  function buildAmbient() {
    if (document.querySelector('.pnc-v11-ambient')) return;
    const wrap = document.createElement('div');
    wrap.className = 'pnc-v11-ambient';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = `
      <div class="ambient-grid"></div>
      <div class="ambient-noise"></div>
      <div class="ambient-orb orb-a"></div>
      <div class="ambient-orb orb-b"></div>
      <div class="ambient-orb orb-c"></div>
      <div class="ambient-wave wave-a"></div>
      <div class="ambient-wave wave-b"></div>
      <span class="ambient-note">♫</span>
      <span class="ambient-note">♬</span>
      <span class="ambient-note">♪</span>
      <span class="ambient-note">♫</span>
      <span class="ambient-note">♩</span>`;
    document.body.prepend(wrap);
  }

  function revealOnScroll() {
    const items = $$('.stat-card, .feature-card, .news-card, .achievement-card, .event-card, .timeline-item, .gallery-card, .contact-card, .team-card, .member-card, .generation-card, .big-cta-inner, .footer-main > *');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index % 6, 5) * 60}ms`;
      io.observe(item);
    });
  }

  function heroParallax() {
    const hero = $('.hero, .inner-hero');
    const focus = $('.hero-main, .inner-hero-copy');
    if (!hero || !focus || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
      focus.style.transform = `translate3d(${x * 0.7}px, ${y * 0.5}px, 0)`;
    });
    hero.addEventListener('pointerleave', () => { focus.style.transform = ''; });
  }

  function magneticButtons() {
    $$('.btn, .club-chat-toggle').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const rect = button.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
        button.style.transform = `translate(${x}px, ${y}px)`;
      });
      button.addEventListener('pointerleave', () => { button.style.transform = ''; });
    });
  }

  function smoothPageTransitions() {
    document.body.classList.add('pnc-v9-enter');
    const internalLinks = $$('a[href]')
      .filter((a) => {
        const href = a.getAttribute('href');
        return href && !href.startsWith('#') && !a.target && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:');
      });
    internalLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const href = link.getAttribute('href');
        if (!href) return;
        event.preventDefault();
        document.body.classList.add('pnc-v9-leaving');
        setTimeout(() => { window.location.href = href; }, 180);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    // The original site already provides ambient notes and glow. Avoid
    // creating an additional full-screen animated layer on top of it.
    buildLoader();
    revealOnScroll();
    // V9 already handles page transitions. Avoid duplicate navigation delays,
    // and do not repaint buttons/hero on every pointermove.

  });
})();
