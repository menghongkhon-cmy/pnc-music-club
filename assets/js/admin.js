(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { messages: [], selectedId: null, team: { generations: [] }, generationId: '' };
  const authCard = $('#authCard');
  const workspace = $('#workspace');
  let toastTimer;
  let messageRefreshTimer;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  }
  function showToast(message, isError = false) {
    let element = $('.toast');
    if (!element) { element = document.createElement('div'); element.className = 'toast'; element.setAttribute('role','status'); document.body.append(element); }
    element.textContent = message;
    element.style.borderColor = isError ? '#ff8da8' : '';
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 3200);
  }
  async function api(url, options = {}) {
    const response = await fetch(url, { credentials:'same-origin', ...options, headers:{ ...(options.body ? {'Content-Type':'application/json'} : {}), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }
  function buildHackerRain() {
    const rain = $('#hackerRain');
    if (!rain) return;
    const characters = '01♫♩♬PNCMUSICCLUB<>/{}[]#*+\\';
    const columns = Math.max(10, Math.min(26, Math.floor(window.innerWidth / 54)));
    rain.replaceChildren();
    for (let i = 0; i < columns; i += 1) {
      const column = document.createElement('span');
      const length = 28 + Math.floor(Math.random() * 26);
      let text = '';
      for (let j = 0; j < length; j += 1) text += characters[Math.floor(Math.random() * characters.length)] + (j < length - 1 ? '\n' : '');
      column.textContent = text;
      column.style.animationDuration = (8 + Math.random() * 9).toFixed(2) + 's';
      column.style.animationDelay = (-Math.random() * 10).toFixed(2) + 's';
      column.style.opacity = (0.35 + Math.random() * 0.5).toFixed(2);
      rain.append(column);
    }
  }
  function initHackerBackdrop() {
    buildHackerRain();
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(buildHackerRain, 180);
    });
    setInterval(() => {
      if (!document.hidden) buildHackerRain();
    }, 12000);
  }

  function showAuth(mode, message = '') {
    authCard.hidden = false;
    workspace.hidden = true;
    const setup = mode === 'setup';
    $('#loginForm').hidden = setup;
    $('#setupForm').hidden = !setup;
    $('#authTitle').textContent = setup ? 'Set up your club admin.' : 'Welcome back.';
    $('#authDescription').textContent = setup ? 'Create the private account leaders will use to manage the club.' : 'Sign in to manage club messages and team profiles.';
    $('#authAlert').textContent = message;
  }
  function showWorkspace() {
    authCard.hidden = true;
    workspace.hidden = false;
    $('#workspaceAlert').textContent = '';
    loadMessages();
    loadTeam();
    clearInterval(messageRefreshTimer);
    messageRefreshTimer = setInterval(() => { if (!workspace.hidden) loadMessages(); }, 30000);
  }
  async function initialize() {
    try {
      const stateData = await api('/api/admin/state');
      if (stateData.authenticated) showWorkspace();
      else showAuth(stateData.setupRequired ? 'setup' : 'login');
    } catch (_) {
      showAuth('login', 'The website server is not connected. Start the app with npm start, then open this page again.');
    }
  }

  $('#loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    $('#authAlert').textContent = '';
    const button = $('button[type="submit"]', event.currentTarget);
    button.disabled = true;
    try {
      await api('/api/admin/login', { method:'POST', body:JSON.stringify({ email:$('#loginEmail').value, password:$('#loginPassword').value }) });
      $('#loginPassword').value = '';
      showWorkspace();
    } catch (error) { $('#authAlert').textContent = error.message; }
    finally { button.disabled = false; }
  });
  $('#setupForm').addEventListener('submit', async event => {
    event.preventDefault();
    $('#authAlert').textContent = '';
    const button = $('button[type="submit"]', event.currentTarget);
    button.disabled = true;
    try {
      await api('/api/admin/setup', { method:'POST', body:JSON.stringify({ code:$('#setupCode').value.trim(), email:$('#setupEmail').value, password:$('#setupPassword').value }) });
      $('#setupPassword').value = '';
      showWorkspace();
    } catch (error) { $('#authAlert').textContent = error.message; }
    finally { button.disabled = false; }
  });
  $('#logoutButton').addEventListener('click', async () => {
    try { await api('/api/admin/logout', { method:'POST', body:'{}' }); } catch (_) {}
    showAuth('login', 'You have signed out.');
  });

  $$('.admin-tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.admin-tab').forEach(item => item.classList.toggle('is-active', item === tab));
    $$('.admin-panel').forEach(panel => panel.hidden = panel.id !== tab.dataset.panel);
  }));

  function relativeDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }).format(date);
  }
  function renderStats() {
    const fresh = state.messages.filter(item => item.status === 'new').length;
    const active = state.team.generations?.find(item => item.id === 'current')?.people?.length || 0;
    $('#unreadBadge').textContent = String(fresh);
    $('#adminStats').innerHTML = `<div class="stat-tile new"><span>New messages</span><strong>${fresh}</strong></div><div class="stat-tile"><span>Total messages</span><strong>${state.messages.length}</strong></div><div class="stat-tile"><span>Current team profiles</span><strong>${active}</strong></div>`;
  }
  function renderMessageList() {
    const holder = $('#messageList');
    holder.replaceChildren();
    if (!state.messages.length) {
      holder.innerHTML = '<div class="empty-inbox"><span>♫</span><b>No messages here</b><p>Website messages will appear in this list.</p></div>';
      $('#messageDetail').innerHTML = '<div class="empty-inbox"><span>✉</span><b>Your inbox is clear</b><p>Try another message filter or check back later.</p></div>';
      state.selectedId = null;
      return;
    }
    state.messages.forEach(message => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'message-row' + (message.id === state.selectedId ? ' selected' : '');
      const top = document.createElement('span'); top.className = 'message-row-top';
      const name = document.createElement('strong'); name.textContent = message.name;
      const time = document.createElement('time'); time.textContent = relativeDate(message.created_at);
      top.append(name,time);
      const preview = document.createElement('p'); preview.textContent = message.body;
      const foot = document.createElement('span'); foot.className = 'message-row-foot';
      const status = document.createElement('span'); status.className = 'status-pill ' + message.status; status.textContent = message.status;
      const source = document.createElement('span'); source.textContent = message.source === 'chat' ? 'Website chat' : 'Contact form';
      foot.append(status,source);
      button.append(top,preview,foot);
      button.addEventListener('click', () => selectMessage(message));
      holder.append(button);
    });
    const selected = state.messages.find(item => item.id === state.selectedId);
    if (selected) renderMessageDetail(selected);
  }
  function renderMessageDetail(message) {
    const safeEmail = escapeHtml(message.email);
    const subject = escapeHtml(message.subject || 'Website message');
    const title = escapeHtml(message.name);
    const statusOptions = ['new','read','replied','archived'].map(status => `<option value="${status}" ${message.status === status ? 'selected' : ''}>${status[0].toUpperCase()+status.slice(1)}</option>`).join('');
    $('#messageDetail').innerHTML = `<div class="message-detail-head"><div><h3>${title}</h3><div class="message-detail-meta"><a href="mailto:${safeEmail}">${safeEmail}</a><span>${escapeHtml(relativeDate(message.created_at))}</span><span>${escapeHtml(message.reference)}</span></div></div><span class="status-pill ${escapeHtml(message.status)}">${escapeHtml(message.status)}</span></div><p class="message-body"><b>${subject}</b><br/><br/>${escapeHtml(message.body)}</p><label>Message status<select id="detailStatus">${statusOptions}</select></label><label>Private note for club leaders<textarea id="detailNote" maxlength="1800" placeholder="Add a note for the team...">${escapeHtml(message.internal_note || '')}</textarea></label><label>Reply draft<textarea id="replyDraft" maxlength="1800" placeholder="Write a reply, then open it in your email app..."></textarea></label><div class="message-detail-actions"><button class="admin-primary compact" id="saveMessage" type="button">Save status & note</button><button class="admin-secondary" id="replyMessage" type="button">Reply by email ↗</button><button class="admin-danger" id="archiveMessage" type="button">Archive</button><button class="admin-danger" id="deleteMessage" type="button">Delete</button></div>`;
    $('#saveMessage').addEventListener('click', () => updateMessage(message, $('#detailStatus').value, $('#detailNote').value));
    $('#archiveMessage').addEventListener('click', () => updateMessage(message, 'archived', $('#detailNote').value));
    $('#replyMessage').addEventListener('click', async () => {
      const reply = $('#replyDraft').value.trim();
      if (!reply) { showToast('Write a short reply first.', true); return; }
      const mailto = `mailto:${message.email}?subject=${encodeURIComponent('Re: ' + (message.subject || 'PNC Music Club'))}&body=${encodeURIComponent(reply)}`;
      window.location.href = mailto;
      showToast('Email draft opened. Mark the message replied after you send it.');
    });
    $('#deleteMessage').addEventListener('click', async () => {
      if (!window.confirm('Delete this message permanently?')) return;
      try { await api(`/api/admin/messages/${message.id}`, { method:'DELETE' }); state.selectedId = null; await loadMessages(); showToast('Message deleted.'); }
      catch (error) { showToast(error.message, true); }
    });
  }
  async function selectMessage(message) {
    state.selectedId = message.id;
    if (message.status === 'new') {
      try { await api(`/api/admin/messages/${message.id}`, { method:'PATCH', body:JSON.stringify({ status:'read', internal_note:message.internal_note || '' }) }); message.status = 'read'; }
      catch (_) {}
    }
    renderStats(); renderMessageList();
  }
  async function updateMessage(message, status, internalNote, quiet = false) {
    try {
      await api(`/api/admin/messages/${message.id}`, { method:'PATCH', body:JSON.stringify({ status, internal_note:internalNote }) });
      message.status = status; message.internal_note = internalNote;
      renderStats(); renderMessageList();
      if (!quiet) showToast('Message updated.');
    } catch (error) { showToast(error.message, true); }
  }
  async function loadMessages() {
    try {
      const data = await api('/api/admin/messages?status=all');
      state.messages = data.messages || [];
      if (!state.messages.some(item => item.id === state.selectedId)) state.selectedId = state.messages[0]?.id || null;
      renderStats();
      filterMessages();
    } catch (error) { $('#workspaceAlert').textContent = error.message; }
  }
  function filterMessages() {
    const filter = $('#messageFilter').value;
    const all = state.messages;
    state.messages = filter === 'all' ? all : all.filter(item => item.status === filter);
    if (!state.messages.some(item => item.id === state.selectedId)) state.selectedId = state.messages[0]?.id || null;
    renderMessageList();
    state.messages = all;
  }
  $('#messageFilter').addEventListener('change', filterMessages);
  $('#refreshMessages').addEventListener('click', loadMessages);

  async function loadTeam() {
    try {
      state.team = await api('/api/admin/team');
      if (!Array.isArray(state.team.generations)) state.team.generations = [];
      state.generationId = state.team.generations[0]?.id || '';
      renderStats();
      renderTeam();
    } catch (error) { $('#teamEditor').innerHTML = `<div class="empty-inbox"><span>♫</span><b>Could not load team</b><p>${escapeHtml(error.message)}</p></div>`; }
  }
  function currentGeneration() { return state.team.generations.find(item => item.id === state.generationId); }
  function renderGenerationSelect() {
    const select = $('#generationSelect');
    select.replaceChildren();
    state.team.generations.forEach(generation => {
      const option = document.createElement('option'); option.value = generation.id; option.textContent = generation.label; option.selected = generation.id === state.generationId; select.append(option);
    });
    $('#deleteGeneration').disabled = !currentGeneration() || currentGeneration().id === 'current';
  }
  function renderTeam() {
    renderGenerationSelect();
    const generation = currentGeneration();
    const editor = $('#teamEditor');
    if (!generation) { editor.innerHTML = '<div class="empty-inbox"><span>♫</span><b>No generations yet</b><p>Create a generation to add team profiles.</p></div>'; return; }
    const meta = `<div class="team-gen-meta"><label>Generation name<input data-gen-field="label" maxlength="80" value="${escapeHtml(generation.label)}"/></label><label>Small label<input data-gen-field="subLabel" maxlength="60" value="${escapeHtml(generation.subLabel || '')}"/></label><label>Introduction<textarea data-gen-field="description" maxlength="500">${escapeHtml(generation.description || '')}</textarea></label></div>`;
    const people = (generation.people || []).map(person => {
      const photo = person.photo || '/assets/img/music-vocals.svg';
      return `<div class="person-edit-row" data-person-id="${escapeHtml(person.id)}"><div class="person-photo-edit"><img src="${escapeHtml(photo)}" alt="Portrait preview"/><input aria-label="Upload portrait" type="file" accept="image/png,image/jpeg,image/webp" data-photo-upload/><button class="admin-secondary" type="button" data-clear-photo>Remove photo</button></div><label>Name<input data-field="name" maxlength="100" value="${escapeHtml(person.name || '')}" placeholder="Member name"/></label><label>Role<select data-field="role"><option ${person.role === 'Club Leader' ? 'selected' : ''}>Club Leader</option><option ${person.role === 'Club Member' ? 'selected' : ''}>Club Member</option><option ${person.role === 'Guest Musician' ? 'selected' : ''}>Guest Musician</option><option ${!['Club Leader','Club Member','Guest Musician'].includes(person.role) ? 'selected' : ''}>${escapeHtml(person.role || 'Club Member')}</option></select></label><label>Instrument / focus<input data-field="focus" maxlength="160" value="${escapeHtml(person.focus || '')}" placeholder="Guitar, piano, vocals..."/></label><label class="bio-field">Short introduction<textarea data-field="bio" maxlength="800" placeholder="A few words about this person">${escapeHtml(person.bio || '')}</textarea></label><div class="links-field"><label>Facebook URL<input data-field="facebook" maxlength="400" value="${escapeHtml(person.facebook || '')}" placeholder="https://facebook.com/..."/></label><label>Telegram URL<input data-field="telegram" maxlength="400" value="${escapeHtml(person.telegram || '')}" placeholder="https://t.me/..."/></label></div><button class="person-remove" type="button" data-remove-person>Remove this person</button></div>`;
    }).join('');
    editor.innerHTML = meta + (people || '<div class="empty-inbox"><span>♫</span><b>This generation has no profiles yet</b><p>Add the leader or members to begin.</p></div>');
    $$('[data-gen-field]', editor).forEach(input => input.addEventListener('input', () => { generation[input.dataset.genField] = input.value; }));
    $$('.person-edit-row', editor).forEach(row => {
      const person = generation.people.find(item => item.id === row.dataset.personId);
      $$('[data-field]', row).forEach(input => input.addEventListener('input', () => { person[input.dataset.field] = input.value; }));
      $('[data-remove-person]', row).addEventListener('click', () => {
        if (!window.confirm(`Remove ${person.name || 'this person'} from ${generation.label}?`)) return;
        generation.people = generation.people.filter(item => item.id !== person.id);
        renderTeam();
      });
      $('[data-clear-photo]', row).addEventListener('click', () => { person.photo = ''; renderTeam(); });
      $('[data-photo-upload]', row).addEventListener('change', async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8_000_000) { showToast('Choose a JPG, PNG or WebP photo smaller than 8 MB.', true); return; }
        try { person.photo = await resizePhoto(file); renderTeam(); showToast('Portrait ready. Save team changes to publish it.'); }
        catch (_) { showToast('This photo could not be opened.', true); }
      });
    });
  }
  function resizePhoto(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        const max = 560, scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/jpeg', .78));
      };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('invalid image')); };
      image.src = url;
    });
  }
  $('#generationSelect').addEventListener('change', event => { state.generationId = event.target.value; renderTeam(); });
  $('#addGeneration').addEventListener('click', () => {
    const label = window.prompt('Name the new club generation:');
    if (!label?.trim()) return;
    const id = 'generation-' + Date.now().toString(36);
    state.team.generations.push({ id, label:label.trim().slice(0,80), subLabel:'CLUB ARCHIVE', description:'Meet this PNC Music Club generation.', people:[] });
    state.generationId = id; renderTeam();
  });
  $('#addPerson').addEventListener('click', () => {
    const generation = currentGeneration();
    if (!generation) return;
    generation.people ||= [];
    if (generation.id === 'current' && generation.people.length >= 6) {
      showToast('Current generation is limited to 1 leader + 5 members. Edit or replace an existing member.', true);
      return;
    }
    generation.people.push({ id:'person-'+Date.now().toString(36), name:'', role:generation.people.some(person => /leader/i.test(person.role || '')) ? 'Club Member' : 'Club Leader', focus:'', bio:'', photo:'', facebook:'', telegram:'' });
    renderTeam();
  });
  $('#deleteGeneration').addEventListener('click', () => {
    const generation = currentGeneration();
    if (!generation || generation.id === 'current') return;
    if (!window.confirm(`Delete the ${generation.label} archive and its profiles?`)) return;
    state.team.generations = state.team.generations.filter(item => item.id !== generation.id);
    state.generationId = state.team.generations[0]?.id || '';
    renderTeam();
  });
  $('#saveTeam').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try { await api('/api/admin/team', { method:'PUT', body:JSON.stringify(state.team) }); renderStats(); showToast('Team profiles saved and published.'); }
    catch (error) { showToast(error.message, true); }
    finally { button.disabled = false; }
  });

  initHackerBackdrop();
  initialize();
})();
