/* Apply editor changes to all seven public pages. Works without edits on a plain static host. */
(() => {
  'use strict';
  const $ = (q,r=document) => r.querySelector(q);
  const $$ = (q,r=document) => [...r.querySelectorAll(q)];
  const page = document.body.dataset.page || 'home';
  const siteCfg = window.PNC_MUSIC_CLUB || (window.PNC_MUSIC_CLUB = {});

  // Pure CSS decoration — no external images or animation libraries required.
  const ambient = document.createElement('div');
  ambient.className = 'ambient-atmosphere';
  ambient.setAttribute('aria-hidden', 'true');
  ambient.innerHTML = '<div class="ambient-orb orb-one"></div><div class="ambient-orb orb-two"></div><div class="ambient-orb orb-three"></div><div class="ambient-vinyl vinyl-one"><span>♫</span></div><div class="ambient-vinyl vinyl-two"><span>♪</span></div><div class="ambient-notes"><b>♪</b><b>♫</b><b>♬</b><b>♩</b><b>♫</b></div><div class="ambient-grid"></div>';
  document.body.prepend(ambient);
  document.body.dataset.motion = 'aurora';

  const isImage = url => typeof url === 'string' && /^\/?assets\/(img|uploads)\/[\w.-]+\.(png|jpe?g|webp|svg)$/.test(url) && !url.includes('..');
  const assetPath = url => '/' + String(url).replace(/^\//, '');
  const insertTextWithAccent = (element, title, highlight) => {
    if (!element || !title && !highlight) return;
    element.replaceChildren();
    String(title || '').split('|').map(line => line.trim()).filter(Boolean).forEach((line, index) => {
      if (index > 0) element.appendChild(document.createElement('br'));
      element.appendChild(document.createTextNode(line));
    });
    if (highlight) {
      if (element.childNodes.length) element.appendChild(document.createElement('br'));
      const em = document.createElement('em'); em.textContent = highlight.trim(); element.appendChild(em);
    }
  };
  const isBackgroundMedia = url => typeof url === 'string' && /^\/assets\/(?:img|uploads)\/[a-zA-Z0-9._-]+\.(?:png|jpe?g|webp|gif|mp4|webm)$/.test(url) && !url.includes('..');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function makeMedia(media, className) {
    const isVideo = media.type === 'video';
    const element = document.createElement(isVideo ? 'video' : 'img');
    element.className = className;
    if (isVideo) {
      element.src = media.src;
      element.muted = true;
      element.defaultMuted = true;
      element.autoplay = !reducedMotion.matches;
      element.loop = true;
      element.playsInline = true;
      element.preload = 'metadata';
      element.setAttribute('aria-hidden', 'true');
      if (!reducedMotion.matches) element.play().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.hidden || reducedMotion.matches) element.pause();
        else element.play().catch(() => {});
      });
    } else {
      element.src = media.src;
      element.alt = '';
      element.decoding = 'async';
    }
    element.style.objectPosition = ({top:'center top',bottom:'center bottom',center:'center center'})[media.position || 'center'];
    return element;
  }
  function applyBackgroundMedia(site) {
    // V15: The Background Studio affects *only* the full-page wallpaper.
    // Existing hero-media keys from earlier versions are intentionally ignored
    // so that a background change NEVER hides/replaces the team banner slideshow.
    const hasMedia = item => item && isBackgroundMedia(item.src);
    const sharedPage = hasMedia(site.globalMedia?.page) ? site.globalMedia.page : null;
    const legacyHome = hasMedia(site.pageMedia?.home) ? site.pageMedia.home : null;
    const pageMedia = sharedPage || (hasMedia(site.pageMedia?.[page]) ? site.pageMedia[page] : null) || legacyHome;
    if (!pageMedia) return;
    document.body.classList.add('pnc-has-page-background');
    if (sharedPage || legacyHome) document.body.classList.add('pnc-shared-background');
    const stage = document.createElement('div');
    stage.className = 'pnc-page-media-stage';
    stage.setAttribute('aria-hidden','true');
    stage.appendChild(makeMedia(pageMedia,'pnc-page-media-element'));
    const veil = document.createElement('div');
    veil.className = 'pnc-page-media-veil';
    const overlay = Number.isFinite(Number(pageMedia.overlay)) ? Number(pageMedia.overlay) : 55;
    veil.style.backgroundColor = `rgba(6,9,23,${Math.max(.15,Math.min(.85,overlay/100))})`;
    stage.appendChild(veil);
    document.body.prepend(stage);
  }
  function applySite(site) {
    if (!site || typeof site !== 'object') return;
    const brand = site.brand || {};
    // Brand and official links.
    for (const title of $$('.brand-copy strong')) {
      if (!brand.title) continue;
      const parts = brand.title.trim().split(/\s+/);
      title.replaceChildren(document.createTextNode((parts.shift() || '') + ' '));
      const accent = document.createElement('span'); accent.textContent = parts.join(' '); title.appendChild(accent);
    }
    if (brand.tagline) $$('.brand-copy small').forEach(el => { el.textContent = brand.tagline; });
    if (brand.announcement) { const element = $('.topline-inner > span:first-child'); if (element) {
      const dot = element.querySelector('.live-dot'); element.replaceChildren(); if (dot) element.append(dot); element.append(document.createTextNode(' ' + brand.announcement));
    } }
    if (isImage(brand.logo)) {
      $$('.brand img, .club-chat-head img, .club-3d-icon img, link[rel="icon"]').forEach(el => {
        if (el.tagName === 'LINK') el.href = assetPath(brand.logo);
        else el.src = assetPath(brand.logo);
      });
    }
    for (const key of ['email','facebook','telegram','instagram']) {
      if (typeof brand[key] === 'string') siteCfg[key] = brand[key];
    }
    $$('[data-social]').forEach(link => {
      const value = siteCfg[link.dataset.social];
      if (typeof value === 'string' && /^https:\/\//.test(value)) {
        link.href = value; link.target = '_blank'; link.rel = 'noopener noreferrer';
      }
    });
    const officialEmail = $('#clubEmailText');
    if (officialEmail && siteCfg.email) officialEmail.textContent = siteCfg.email;
    const officialSocial = $('#clubSocialText');
    if (officialSocial) {
      const connected = ['facebook','telegram','instagram'].filter(key => /^https:\/\//i.test(siteCfg[key] || ''));
      if (connected.length) officialSocial.textContent = 'Find us on ' + connected.map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(', ');
    }

    const pageData = site.pages?.[page] || {};
    const hero = $('.hero, .inner-hero');
    if (hero) {
      insertTextWithAccent($('.hero-main h1, .inner-hero-copy h1'), pageData.title || '', pageData.highlight || '');
      if (pageData.description) { const intro = $('.hero-main > p, .inner-hero-copy > p'); if (intro) intro.textContent = pageData.description; }
    }

    // Normal pictures, section copy and gallery images each get a stable edit key.
    const textEdits = site.copy?.[page] || {};
    $$('[data-cms-text]').forEach(element => {
      const text = textEdits[element.dataset.cmsText];
      if (typeof text === 'string' && text.trim()) element.textContent = text;
    });
    const photoEdits = site.images?.[page] || {};
    $$('[data-cms-image]').forEach(element => {
      const replacement = photoEdits[element.dataset.cmsImage];
      if (isImage(replacement)) element.src = assetPath(replacement);
    });
    const galleryEdits = site.gallery?.[page] || {};
    $$('[data-cms-gallery]').forEach(tile => {
      const replacement = galleryEdits[tile.dataset.cmsGallery];
      if (!isImage(replacement)) return;
      const url = assetPath(replacement);
      tile.dataset.art = url;
      const img = tile.querySelector('img');
      if (img) img.src = url;
      const bg = tile.querySelector('.gallery-img');
      if (bg) bg.style.backgroundImage = `url("${url}")`;
    });

    // Add admin-uploaded Gallery photos after the original nine. This happens
    // before main.js initializes filters and the keyboard-accessible lightbox.
    if (page === 'gallery' && Array.isArray(site.galleryItems)) {
      const grid = $('.gallery-grid');
      if (grid) {
        for (const photo of site.galleryItems.slice(0,120)) {
          if (!photo || !isImage(photo.src) || !['community','instruments','rhythm'].includes(photo.category)) continue;
          const title = String(photo.title || '').trim().slice(0,100);
          if (!title) continue;
          const src = assetPath(photo.src);
          const tile = document.createElement('button');
          tile.type = 'button';
          tile.className = 'gallery-tile gallery-tile-extra reveal';
          tile.dataset.galleryCategory = photo.category;
          tile.dataset.kind = 'photo';
          tile.dataset.art = src;
          tile.dataset.caption = title;
          tile.setAttribute('aria-label', 'View '+title);
          const visual = document.createElement('span');
          visual.className = 'gallery-img';
          const img = document.createElement('img');
          img.src = src; img.alt = title; img.loading = 'lazy'; img.decoding = 'async';
          visual.appendChild(img);
          const info = document.createElement('span'); info.className = 'gallery-info';
          const category = document.createElement('span'); category.className = 'tiny-label';
          category.textContent = photo.category.toUpperCase();
          const label = document.createElement('strong'); label.textContent = title;
          info.append(category,label);
          const plus = document.createElement('span'); plus.className = 'gallery-plus'; plus.textContent = '+';
          tile.append(visual,info,plus);
          grid.appendChild(tile);
        }
      }
    }

    // Rebuild the banner slides and their progress controls before main.js initializes.
    const banners = site.banners?.[page];
    if (Array.isArray(banners) && banners.length && banners.every(isImage)) {
      const slides = $('.hero-slides');
      const progress = $('.slide-progress');
      if (slides) {
        slides.replaceChildren();
        banners.forEach((url, i) => {
          const slide = document.createElement('div');
          slide.className = 'hero-slide' + (i === 0 ? ' is-active' : '');
          slide.style.backgroundImage = `url("${assetPath(url)}")`;
          slides.appendChild(slide);
        });
      }
      if (progress) {
        progress.replaceChildren();
        banners.forEach((_,i) => {
          const b = document.createElement('button');
          b.className = 'progress-seg' + (i === 0 ? ' active' : '');
          b.type = 'button'; b.dataset.slide = String(i); b.setAttribute('aria-label', `Show banner ${i+1}`);
          b.appendChild(document.createElement('i')); progress.appendChild(b);
        });
      }
    }
    applyBackgroundMedia(site);
    const appearance = site.appearance || {};
    document.body.dataset.motion = appearance.enabled === false ? 'off' : (['aurora','stars','minimal','nebula'].includes(appearance.style) ? appearance.style : 'aurora');
    document.body.dataset.headlineMotion = ['cinematic','float','glow'].includes(appearance.headlineMotion) ? appearance.headlineMotion : 'cinematic';
    document.body.dataset.ambientTempo = ['gentle','normal','energetic'].includes(appearance.tempo) ? appearance.tempo : 'normal';
    if (Number.isFinite(appearance.intensity)) document.body.style.setProperty('--ambient-opacity', Math.max(0, Math.min(100, appearance.intensity)) / 100);
  }

  window.PNC_SITE_READY = fetch('/api/site', { cache:'no-store' }).then(async response => {
    if (!response.ok) return null;
    const data = await response.json();
    applySite(data);
    return data;
  }).catch(() => null);
})();
