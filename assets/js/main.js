/* PNC Music Club — Shared client-side enhancements for a regular static site. */
(() => {
  'use strict';
  document.documentElement.classList.add('js-enabled');
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const cfg = window.PNC_MUSIC_CLUB || {};

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  // Accessible mobile navigation
  const menuBtn = $('.menu-btn');
  const nav = $('#mainNav');
  if (menuBtn && nav) {
    const setMenu = (isOpen) => {
      nav.classList.toggle('open', isOpen);
      menuBtn.setAttribute('aria-expanded', String(isOpen));
      menuBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    $$('.nav-link', nav).forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });
    document.addEventListener('click', (event) => { if (!event.target.closest('.header-inner')) setMenu(false); });
  }

  // Light/dark appearance: only local browser storage; never sends data to a server.
  const themeButton = $('.theme-toggle');
  const themeStorageKey = 'pnc-music-club-theme';
  let savedTheme = 'dark';
  try { savedTheme = localStorage.getItem(themeStorageKey) || 'dark'; } catch (_) {}
  const applyTheme = (theme) => {
    document.body.dataset.theme = theme;
    if (themeButton) {
      themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
      themeButton.innerHTML = theme === 'dark'
        ? '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
        : '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.5 14.6A9 9 0 0 1 9.4 3.5 9 9 0 1 0 20.5 14.6Z"/></svg>';
    }
  };
  applyTheme(savedTheme === 'light' ? 'light' : 'dark');
  themeButton?.addEventListener('click', () => {
    const theme = document.body.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(theme);
    try { localStorage.setItem(themeStorageKey, theme); } catch (_) {}
  });

  // Scroll reveals, with graceful fallback for browsers without IntersectionObserver.
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.09, rootMargin: '0px 0px 35px 0px' });
    $$('.reveal').forEach(node => observer.observe(node));
  } else {
    $$('.reveal').forEach(node => node.classList.add('visible'));
  }

  // Wait until the admin-defined banner photos have been applied before starting the slider.
  Promise.resolve(window.PNC_SITE_READY).then(() => {
  // Hero banners: 5-second right-to-left slider with controls.
  const heroSlides = $$('.hero-slide');
  const segments = $$('.progress-seg');
  if (heroSlides.length && !$('.pnc-hero-custom-media')) {
    let current = 0;
    let timer;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const show = (index) => {
      const previous = current;
      current = (index + heroSlides.length) % heroSlides.length;
      if (previous !== current) document.dispatchEvent(new CustomEvent('pnc:hero-slidechange', { detail: { slide: current } }));
      heroSlides.forEach((slide, i) => {
        slide.classList.remove('is-active', 'is-exit-left');
        if (i === current) slide.classList.add('is-active');
      });
      if (!reduceMotion && heroSlides[previous] && previous !== current) {
        heroSlides[previous].classList.add('is-exit-left');
      }
      segments.forEach((segment, i) => {
        segment.classList.toggle('active', i === current);
        segment.setAttribute('aria-pressed', String(i === current));
        const bar = $('i', segment);
        if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
      });
      const number = $('.hero-side-number');
      if (number) number.innerHTML = `${String(current + 1).padStart(2, '0')}<span>/${String(heroSlides.length).padStart(2, '0')}</span>`;
    };
    const restart = () => {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(() => show(current + 1), 5000);
    };
    $('.slide-prev')?.addEventListener('click', () => { show(current - 1); restart(); });
    $('.slide-next')?.addEventListener('click', () => { show(current + 1); restart(); });
    segments.forEach((s, index) => s.addEventListener('click', () => { show(index); restart(); }));
    document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(timer) : restart());
    show(0); restart();
  }

  });

  const toast = $('#siteToast');
  let toastTimer;
  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
  }

  // Official social links are editable in site-data.js. Never navigate to a made-up URL.
  $$('[data-social]').forEach(link => {
    const url = cfg[link.dataset.social];
    if (typeof url === 'string' && /^https:\/\//i.test(url)) {
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else {
      link.setAttribute('title', 'Official link will be added soon');
      link.addEventListener('click', e => {
        const current = cfg[link.dataset.social];
        if (typeof current === 'string' && /^https:\/\//i.test(current)) {
          link.href = current; link.target = '_blank'; link.rel = 'noopener noreferrer';
        } else { e.preventDefault(); notify('Official social link coming soon.'); }
      });
    }
  });

  // Search/filter controls are browser-only and do not contact a server.
  const storySearch = $('#storySearch');
  if (storySearch) {
    const stories = $$('.news-card');
    const update = () => {
      const query = storySearch.value.toLowerCase().trim();
      let count = 0;
      stories.forEach(card => {
        const visible = (card.dataset.search || '').includes(query);
        card.hidden = !visible;
        card.style.display = visible ? '' : 'none';
        if (visible) count++;
      });
      $('#storyEmpty').hidden = count > 0;
    };
    storySearch.addEventListener('input', update);
  }

  const activitySearch = $('#activitySearch');
  const activityButtons = $$('[data-filter-btn]');
  if (activityButtons.length) {
    const cards = $$('.explore-card');
    let category = 'all';
    const update = () => {
      const query = (activitySearch?.value || '').toLowerCase().trim();
      let count = 0;
      cards.forEach(card => {
        const match = (category === 'all' || card.dataset.filter === category) && (card.dataset.search || '').includes(query);
        card.hidden = !match;
        card.style.display = match ? '' : 'none';
        if (match) count++;
      });
      $('#activityEmpty').hidden = count > 0;
    };
    activityButtons.forEach(btn => btn.addEventListener('click', () => {
      category = btn.dataset.filterBtn;
      activityButtons.forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
      update();
    }));
    activitySearch?.addEventListener('input', update);
  }

  // Gallery filters and accessible lightbox.
  const galleryTiles = $$('.gallery-tile');
  const galleryButtons = $$('[data-gallery-filter]');
  const lightbox = $('#lightbox');
  if (galleryTiles.length && lightbox) {
    let activeIndex = 0;
    let previouslyFocused = null;
    const visibleTiles = () => galleryTiles.filter(t => t.style.display !== 'none');
    function openLightbox(tile) {
      previouslyFocused = document.activeElement;
      const visible = visibleTiles();
      activeIndex = Math.max(0, visible.indexOf(tile));
      renderLightbox();
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      $('.lightbox-close')?.focus();
    }
    function renderLightbox() {
      const visible = visibleTiles();
      if (!visible.length) return;
      const tile = visible[activeIndex];
      $('#lightboxImg').src = tile.dataset.art;
      $('#lightboxImg').alt = tile.dataset.caption;
      $('#lightboxCaption').textContent = tile.dataset.caption + (tile.dataset.kind === 'photo' ? ' · PNC Music Club photo' : ' · Music illustration');
    }
    function changeLightbox(by) {
      const visible = visibleTiles();
      if (!visible.length) return;
      activeIndex = (activeIndex + by + visible.length) % visible.length;
      renderLightbox();
    }
    function closeLightbox() {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      previouslyFocused?.focus();
    }
    galleryTiles.forEach(tile => tile.addEventListener('click', () => openLightbox(tile)));
    $('.lightbox-close')?.addEventListener('click', closeLightbox);
    $('.lightbox-prev')?.addEventListener('click', () => changeLightbox(-1));
    $('.lightbox-next')?.addEventListener('click', () => changeLightbox(1));
    lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') changeLightbox(1);
      if (e.key === 'ArrowLeft') changeLightbox(-1);
      if (e.key === 'Tab') {
        const focusable = $$('button', lightbox);
        const current = focusable.indexOf(document.activeElement);
        if (e.shiftKey && current === 0) { e.preventDefault(); focusable[focusable.length - 1].focus(); }
        else if (!e.shiftKey && current === focusable.length - 1) { e.preventDefault(); focusable[0].focus(); }
      }
    });
    galleryButtons.forEach(btn => btn.addEventListener('click', () => {
      const category = btn.dataset.galleryFilter;
      galleryButtons.forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
      galleryTiles.forEach(tile => { tile.style.display = category === 'all' || tile.dataset.galleryCategory === category ? '' : 'none'; });
    }));
  }

  // Website messages are saved to the private club inbox by the same-origin server.
  const clubEmail = typeof cfg.email === 'string' ? cfg.email.trim() : ''; // Display fallback; submit uses current admin settings.
  const emailLabel = $('#clubEmailText');
  if (clubEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clubEmail)) {
    if (emailLabel) emailLabel.textContent = clubEmail;
  }
  const socialLabel = $('#clubSocialText');
  if (socialLabel) {
    const connected = ['facebook','telegram','instagram'].filter(key => /^https:\/\//i.test(cfg[key] || ''));
    if (connected.length) socialLabel.textContent = `Find us on ${connected.map(s => s[0].toUpperCase() + s.slice(1)).join(', ')}`;
  }
  const message = $('#senderMessage');
  message?.addEventListener('input', () => { $('#charCount').textContent = String(message.value.length); });
  $('#contactForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const note = $('#contactNotice');
    note.classList.remove('error');
    if (!form.reportValidity()) return;
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    note.textContent = 'Sending your message to the club inbox…';
    try {
      const response = await fetch('/api/messages', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ name:$('#senderName').value.trim(), email:$('#senderEmail').value.trim(), subject:$('#contactSubject').value, body:message.value.trim(), source:'contact' })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Your message could not be sent. Please try again.');
      note.textContent = `Your message reached the club inbox. Reference: ${result.reference}. A leader can reply to your email.`;
      form.reset();
      if ($('#charCount')) $('#charCount').textContent = '0';
    } catch (error) {
      note.classList.add('error');
      note.textContent = error instanceof TypeError ? 'The club inbox is offline. Open this site through its Node.js server to send messages.' : error.message;
    } finally { if (submit) submit.disabled = false; }
  });

  // Floating chat sends visitor messages into the private club inbox.
  const chatRoot = $('#clubChat');
  if (chatRoot) {
    const chatToggle = $('#clubChatToggle');
    const chatPanel = $('#clubChatPanel');
    const chatForm = $('#clubChatForm');
    const chatInput = $('#clubChatInput');
    const chatMessages = $('#clubChatMessages');
    let seeded = false;

    const chatContactFields = document.createElement('div');
    chatContactFields.className = 'chat-contact-fields';
    chatContactFields.innerHTML = '<label>Name<input id="chatSenderName" maxlength="80" autocomplete="name" placeholder="Your name" required></label><label>Email<input id="chatSenderEmail" maxlength="180" type="email" autocomplete="email" placeholder="Your email for a reply" required></label>';
    chatForm?.before(chatContactFields);
    const chatName = $('#chatSenderName', chatRoot);
    const chatEmail = $('#chatSenderEmail', chatRoot);
    const chatNote = $('.club-chat-note', chatRoot);
    if (chatNote) chatNote.textContent = 'Send a private note to the club leaders. Your message is saved in their inbox so they can follow up by email.';

    const addBubble = (text, who='bot') => {
      if (!chatMessages) return;
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${who}`;
      bubble.textContent = text;
      chatMessages.appendChild(bubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const botReply = (message) => {
      const q = message.toLowerCase();
      if (q.includes('join')) {
        addBubble('You can join by contacting a club guide or using the contact page. New members who love singing, instruments, or simply music are welcome.');
      } else if (q.includes('activit')) {
        addBubble('Our activities can include practice sessions, singing together, instrument learning, music sharing, and club performances.');
      } else if (q.includes('practice') || q.includes('time') || q.includes('when')) {
        addBubble('Practice time can be announced by the club team. Please check with the club guide or add the official social links in site-data.js for live updates.');
      } else if (q.includes('feedback') || q.includes('suggest') || q.includes('idea')) {
        addBubble('Write your feedback in the message box below. Add your name and email so a club leader can reply.');
      } else if (q.includes('hello') || q.includes('hi')) {
        addBubble('Hello! Welcome to PNC Music Club. Ask me about joining, activities, practice time, or send feedback anytime.');
      } else {
        addBubble('I can send your note to the club leaders. Add your name and email, then press Send.');
      }
    };

    const sendToClub = async text => {
      const name = chatName?.value.trim() || '';
      const email = chatEmail?.value.trim() || '';
      if (name.length < 2) { addBubble('Please add your name above before sending.'); chatName?.focus(); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { addBubble('Please add a valid email above so the club can reply.'); chatEmail?.focus(); return false; }
      try {
        const response = await fetch('/api/messages', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,email,subject:'Website chat message',body:text,source:'chat'}) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Message could not be sent.');
        addBubble(`Your note is in the club inbox. Reference: ${result.reference}. A leader can reply to ${email}.`);
        return true;
      } catch (error) {
        addBubble(error instanceof TypeError ? 'The club inbox is offline. Open this website through its Node.js server before sending a message.' : error.message);
        return false;
      }
    };

    const seedChat = () => {
      if (seeded) return;
      seeded = true;
      addBubble(`Hi! I'm ${cfg.botName || 'Melody Bot'}. Welcome to ${cfg.clubName || 'PNC Music Club'} — ask me a question or leave feedback.`);
    };

    const setOpen = (open) => {
      chatPanel.hidden = !open;
      chatToggle.setAttribute('aria-expanded', String(open));
      if (open) {
        seedChat();
        chatInput?.focus();
      }
    };

    chatToggle?.addEventListener('click', () => setOpen(chatPanel.hidden));
    chatForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;
      addBubble(message, 'user');
      chatInput.disabled = true;
      const sent = await sendToClub(message);
      if (sent) chatInput.value = '';
      chatInput.disabled = false;
      chatInput.focus();
    });
    $$('.quick-chip', chatRoot).forEach(btn => btn.addEventListener('click', () => {
      const msg = btn.dataset.chatQuestion || btn.textContent.trim();
      setOpen(true);
      addBubble(msg, 'user');
      botReply(msg);
    }));
  }


  // ABOUT: generation explorer + local portrait editor for a static website.
  // Export team-data.js after editing to publish the same profiles for all visitors.
  const teamRoot = $('#generationBoard');
  if (teamRoot) {
    const rawTeam = window.PNC_MUSIC_TEAM || { generations: [] };
    const storageKey = 'pnc-music-team-local-v4';
    const teamModal = $('#teamModal');
    let localVersions;
    try { localVersions = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch (_) { localVersions = null; }
    let teamState = localVersions && Array.isArray(localVersions.generations) ? localVersions : JSON.parse(JSON.stringify(rawTeam));
    if (!Array.isArray(teamState.generations)) teamState.generations = [];
    let generationId = teamState.generations[0]?.id || '';
    let selectedPersonId = null;
    let pendingPhoto = undefined;
    const tabs = $('#generationTabs');
    const leaderGrid = $('#leaderGrid');
    const memberGrid = $('#memberGrid');
    const saveState = () => {
      try { localStorage.setItem(storageKey, JSON.stringify(teamState)); return true; }
      catch (_) { return false; }
    };
    const gen = () => teamState.generations.find(item => item.id === generationId);
    const people = () => Array.isArray(gen()?.people) ? gen().people : [];
    const normalizeUrl = (url) => {
      if (typeof url !== 'string') return '';
      if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url)) return url;
      if (/^(?:\.\.\/)?assets\/img\/[\w./-]+\.(?:png|jpg|jpeg|webp)$/i.test(url)) return url;
      if (/^https:\/\/[^\s]+$/i.test(url)) return url;
      return '';
    };
    const avatarNode = (person, large = false) => {
      const frame = document.createElement('span');
      frame.className = large ? 'person-avatar person-avatar-large' : 'person-avatar';
      if (normalizeUrl(person.photo)) {
        const picture = document.createElement('img');
        picture.src = person.photo;
        picture.alt = `Portrait of ${person.name || 'club member'}`;
        picture.loading = 'lazy';
        picture.onerror = () => { frame.replaceChildren('♫'); };
        frame.appendChild(picture);
      } else {
        const musicNote = document.createElement('span');
        musicNote.className = 'avatar-music-note';
        musicNote.textContent = '♫';
        frame.append(musicNote);
      }
      return frame;
    };
    const openProfile = person => {
      selectedPersonId = person.id;
      pendingPhoto = undefined;
      $('#teamEditForm').hidden = true;
      $('#teamModalContent').hidden = false;
      $('#teamModalAvatar').replaceChildren(...avatarNode(person, true).childNodes);
      $('#teamModalRole').textContent = person.role || 'Club member';
      $('#teamModalName').textContent = person.name || 'Name to add';
      $('#teamModalBio').textContent = person.bio || 'Add this person’s biography.';
      const links = $('#teamModalLinks');
      links.replaceChildren();
      [['facebook','Facebook'],['telegram','Telegram']].forEach(([key,label]) => {
        if (typeof person[key] === 'string' && /^https:\/\/[^\s]+$/i.test(person[key])) {
          const a = document.createElement('a');
          a.href = person[key]; a.target = '_blank'; a.rel = 'noopener noreferrer';
          a.textContent = label; links.appendChild(a);
        }
      });
      const messageLink = document.createElement('a');
      messageLink.className = 'team-message-link';
      messageLink.href = document.body.dataset.page === 'about' ? 'contact.html' : 'pages/contact.html';
      messageLink.textContent = 'Ask the club about this person';
      links.appendChild(messageLink);
      if (typeof teamModal?.showModal === 'function') teamModal.showModal();
    };
    const renderGroup = (holder, list, isLeader) => {
      holder.replaceChildren();
      list.forEach((person, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'person-card modern-person-card ' + (isLeader ? 'leader' : 'member');
        card.setAttribute('aria-label', `Open ${person.name || 'member'} profile`);
        card.appendChild(avatarNode(person));
        const info = document.createElement('span'); info.className = 'person-content';
        const eyebrow = document.createElement('span'); eyebrow.className = 'person-label';
        eyebrow.textContent = isLeader ? '♛ CLUB LEADER' : `♫ MEMBER ${String(index+1).padStart(2,'0')}`;
        const name = document.createElement('strong'); name.className = 'person-name'; name.textContent = person.name || 'Name to add';
        const focus = document.createElement('span'); focus.className = 'person-focus'; focus.textContent = person.focus || (isLeader ? 'Club coordination' : 'Music lover');
        const view = document.createElement('span'); view.className = 'person-view'; view.textContent = isLeader ? 'View leader profile' : 'View member profile';
        const uploadHint = document.createElement('span'); uploadHint.className = 'upload-hint';
        uploadHint.textContent = normalizeUrl(person.photo) ? 'CLUB PROFILE' : (isLeader ? 'LEADER PROFILE' : 'MUSIC MEMBER');
        info.append(eyebrow,name,focus,view);
        card.append(info,uploadHint);
        card.addEventListener('click', () => openProfile(person));
        holder.append(card);
      });
    };
    const render = () => {
      const generation = gen();
      if (!generation) return;
      tabs.replaceChildren();
      teamState.generations.forEach(generationItem => {
        const tab = document.createElement('button'); tab.type = 'button';
        tab.className = 'generation-tab' + (generationItem.id === generationId ? ' is-current' : '');
        tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(generationItem.id === generationId));
        tab.textContent = generationItem.label;
        tab.addEventListener('click', () => { generationId = generationItem.id; render(); });
        tabs.append(tab);
      });
      const group = people();
      const leaders = group.filter(p => /leader/i.test(p.role || '') && !/co-leader/i.test(p.role || ''));
      const members = group.filter(p => !leaders.includes(p));
      $('#generationStatus').textContent = generation.subLabel || 'MUSIC CLUB';
      $('#generationTitle').textContent = generation.label;
      $('#generationDescription').textContent = generation.description || 'Meet this generation of PNC Music Club.';
      $('#generationStat strong').textContent = String(group.length).padStart(2,'0');
      $('#generationStat small').textContent = group.length === 1 ? 'PERSON' : 'PEOPLE';
      $('#teamLeaderHeading').hidden = !leaders.length;
      $('#teamMemberHeading').hidden = !members.length;
      if (members.length) $('#teamMemberHeading h3').textContent = members.length === 5 && generationId === 'current' ? 'Our five members' : `Our ${members.length} members`;
      renderGroup(leaderGrid,leaders,true);
      renderGroup(memberGrid,members,false);
      $('#generationEmpty').hidden = group.length > 0;
      $('#addArchivePerson').hidden = true;
    };
    render();
    fetch('/api/team').then(response => response.ok ? response.json() : null).then(remoteTeam => {
      if (!remoteTeam || !Array.isArray(remoteTeam.generations)) return;
      teamState = remoteTeam;
      if (!teamState.generations.some(item => item.id === generationId)) generationId = teamState.generations[0]?.id || '';
      render();
    }).catch(() => {});
    $('.team-modal-close')?.addEventListener('click', () => teamModal?.close());
    teamModal?.addEventListener('click', e => { if (e.target === teamModal) teamModal.close(); });
    $('#editProfileBtn')?.addEventListener('click', () => {
      const person = people().find(p => p.id === selectedPersonId);
      if (!person) return;
      pendingPhoto = undefined;
      $('#teamEditForm').hidden = false;
      $('#teamModalContent').hidden = true;
      $('#editPersonName').value = person.name || '';
      $('#editPersonFocus').value = person.focus || '';
      $('#editPersonBio').value = person.bio || '';
      $('#editPersonPhoto').value = '';
      $('#photoTip').textContent = 'Choose a real portrait with permission. Your edits are private until you export the data file.';
      $('#editPersonName').focus();
    });
    $('#cancelTeamEdit')?.addEventListener('click', () => {
      const person = people().find(p => p.id === selectedPersonId);
      if (person) openProfile(person);
    });
    $('#removeTeamPhoto')?.addEventListener('click', () => {
      pendingPhoto = '';
      $('#editPersonPhoto').value = '';
      $('#photoTip').textContent = 'The portrait will be removed after you save.';
    });
    $('#editPersonPhoto')?.addEventListener('change', async e => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 8_000_000) {
        $('#photoTip').textContent = 'Please select a JPG, PNG or WebP image under 8 MB.'; return;
      }
      try {
        const photo = await new Promise((resolve,reject) => {
          const picture = new Image();
          const url = URL.createObjectURL(f);
          picture.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 420;
            const factor = Math.max(size / picture.width, size / picture.height);
            const w = picture.width * factor, h = picture.height * factor;
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(picture, (size-w)/2, (size-h)/2, w, h);
            const value = canvas.toDataURL('image/jpeg',.76);
            URL.revokeObjectURL(url); resolve(value);
          };
          picture.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image decode failed')); };
          picture.src = url;
        });
        pendingPhoto = photo;
        $('#photoTip').textContent = `Ready: ${f.name}. Press Save preview to use this photo.`;
      } catch (_) { $('#photoTip').textContent = 'This picture could not be opened. Try another file.'; }
    });
    $('#teamEditForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const person = people().find(p => p.id === selectedPersonId);
      if (!person) return;
      person.name = $('#editPersonName').value.trim() || 'Name to add';
      person.focus = $('#editPersonFocus').value.trim();
      person.bio = $('#editPersonBio').value.trim();
      if (pendingPhoto !== undefined) person.photo = pendingPhoto;
      const saved = saveState();
      render(); openProfile(person);
      if (!saved) notify('Preview updated, but browser storage is full. Export your team data to save it.');
    });
    $('#addGenerationBtn')?.addEventListener('click', () => {
      const label = window.prompt('Name the new generation (for example: Generation 2025):');
      if (!label?.trim()) return;
      const rawId = 'gen-'+Date.now().toString(36);
      teamState.generations.push({id:rawId,label:label.trim().slice(0,45),subLabel:'CLUB ARCHIVE',description:'Add this generation’s official members and portraits.',people:[]});
      generationId = rawId; saveState(); render();
    });
    $('#addArchivePerson')?.addEventListener('click', () => {
      if (generationId === 'current') return;
      const generation = gen();
      if (!generation || !Array.isArray(generation.people)) return;
      const isLeader = !generation.people.some(p => /leader/i.test(p.role||''));
      const person = {id:'person-'+Date.now().toString(36),name:'Name to add',role:isLeader?'Club Leader':'Club Member',focus:'Music & teamwork',bio:'Add an introduction here.',photo:'',facebook:'',telegram:''};
      generation.people.push(person); saveState(); render(); openProfile(person);
    });
    $('#exportTeamBtn')?.addEventListener('click', () => {
      const data = '/* PNC Music Club: exported generations and portraits. */\nwindow.PNC_MUSIC_TEAM = '+JSON.stringify(teamState,null,2)+';\n';
      const file = new Blob([data],{type:'application/javascript;charset=utf-8'});
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href=url;link.download='team-data.js';document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      notify('Downloaded team-data.js. Replace assets/js/team-data.js in your published website to update the profiles for everyone.');
    });
  }

})();
