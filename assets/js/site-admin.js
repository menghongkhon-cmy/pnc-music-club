/* PNC Music Club website editor: same-origin server, private admin session. */
(() => {
  'use strict';
  const $ = (q,r=document) => r.querySelector(q);
  const $$ = (q,r=document) => [...r.querySelectorAll(q)];
  const pages = ['home','about','news','activities','achievements','gallery','contact'];
  const labels = {home:'Home',about:'About',news:'News',activities:'Activities',achievements:'Achievements',gallery:'Gallery',contact:'Contact'};
  const urlForPage = page => page === 'home' ? '/index.html' : `/pages/${page}.html`;
  const state = { site:null, current:'home', media:'home', documents:{}, genericTarget:null };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const imageUrl = u => typeof u === 'string' && /^\/?assets\/(?:img|uploads)\/[\w.-]+\.(?:png|jpe?g|webp|svg)$/.test(u) ? '/' + u.replace(/^\//,'') : '/assets/img/logo.png';
  const notify = (message, error=false, area='cmsSiteStatus') => {
    const target = $('#' + area);
    if (target) { target.textContent = message; target.style.color = error ? '#ff96af' : '#b9f2d0'; }
  };
  async function api(path, options={}) {
    const response = await fetch(path, {credentials:'same-origin',...options,headers:{ ...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{}) }});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }
  async function loadSite() {
    if (state.site) return state.site;
    state.site = await api('/api/admin/site');
    for (const group of ['pages','banners','images','gallery','copy']) state.site[group] ||= {};
    state.site.heroMedia ||= {};
    state.site.pageMedia ||= {};
    state.site.globalMedia ||= {};
    state.site.galleryItems ||= [];
    state.site.brand ||= {};
    state.site.appearance ||= { enabled:true,style:'aurora',intensity:65,headlineMotion:'cinematic',tempo:'normal' };
    return state.site;
  }
  async function documentFor(page) {
    if (state.documents[page]) return state.documents[page];
    const response = await fetch(urlForPage(page),{cache:'no-store'});
    if (!response.ok) throw new Error(`Could not read the ${labels[page]} page.`);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html,'text/html');
    state.documents[page] = doc;
    return doc;
  }
  function ensureGroup(group,page) { state.site[group][page] ||= {}; return state.site[group][page]; }
  function assignIfText(target, key, value) {
    if (value.trim()) target[key] = value;
    else delete target[key];
  }
  function setupSelectors() {
    for (const id of ['cmsPageSelect','cmsMediaPageSelect']) {
      const select = $('#' + id);
      if (!select || select.options.length) continue;
      pages.forEach(p => {
        const option = document.createElement('option'); option.value=p; option.textContent=labels[p]; select.appendChild(option);
      });
    }
  }
  function renderPagePills() {
    for (const [id, selected, type] of [
      ['pnc20SitePageNav',state.current,'text'],
      ['pnc20MediaPageNav',state.media,'media']
    ]) {
      const container = $('#' + id);
      if (!container) continue;
      container.innerHTML = pages.map(page => `<button type="button" class="pnc20-page-pill${selected === page ? ' is-selected' : ''}" aria-pressed="${selected===page}" data-pnc20-page="${page}" data-pnc20-type="${type}">${labels[page]}</button>`).join('');
    }
  }
  async function renderPageHub() {
    const grid = $('#pnc20PageGrid');
    if (!grid) return;
    try {
      await loadSite();
      const docs = await Promise.all(pages.map(page => documentFor(page)));
      grid.innerHTML = pages.map((page,i) => {
        const doc=docs[i];
        const countText=doc.querySelectorAll('[data-cms-text]').length;
        const countPhotos=doc.querySelectorAll('[data-cms-image],[data-cms-gallery]').length + (page==='gallery' ? (state.site.galleryItems||[]).length : 0);
        const countBanners=doc.querySelectorAll('.hero-slides .hero-slide').length;
        const changes=Object.keys(state.site.copy[page]||{}).length
          +Object.keys(state.site.images[page]||{}).length
          +Object.keys(state.site.gallery[page]||{}).length
          +Object.keys(state.site.pages[page]||{}).length
          +(Array.isArray(state.site.banners[page]) ? 1 : 0);
        return `<article class="pnc20-page-card">
          <div class="pnc20-card-head"><span class="pnc20-card-icon">${String(i+1).padStart(2,'0')}</span><div><h3>${labels[page]}</h3><span>${changes ? `${changes} saved customizations` : 'Original design'}</span></div></div>
          <div class="pnc20-counts"><span><b>${countText}</b> text</span><span><b>${countPhotos}</b> photos</span><span><b>${countBanners}</b> banners</span></div>
          <div class="pnc20-card-actions">
            <button type="button" data-pnc20-action="text" data-pnc20-target="${page}">Edit text</button>
            <button type="button" data-pnc20-action="media" data-pnc20-target="${page}">Photos / banners</button>
            <a href="${urlForPage(page)}" target="_blank" rel="noopener noreferrer" aria-label="Preview ${labels[page]} page">Preview ↗</a>
          </div>
        </article>`;
      }).join('');
    } catch (error) { grid.innerHTML = `<p class="v5-muted">Could not load page overview. ${escapeHtml(error.message)}</p>`; }
  }
  function jumpToPage(page, kind) {
    if (!pages.includes(page)) return;
    if (kind === 'text') state.current=page;
    else state.media=page;
    const tab=document.querySelector(`.admin-tab[data-panel="${kind === 'text'?'sitePanel':'mediaPanel'}"]`);
    tab?.click();
    renderPagePills();
    const control=$(kind === 'text'?'#cmsPageSelect':'#cmsMediaPageSelect');
    if (control) control.value=page;
    window.scrollTo({top:Math.max(0,(tab?.getBoundingClientRect().top||0)+window.scrollY-110),behavior:'smooth'});
  }
  $('#pnc20PageGrid')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-pnc20-action][data-pnc20-target]');
    if (button) jumpToPage(button.dataset.pnc20Target,button.dataset.pnc20Action);
  });
  document.querySelectorAll('#pnc20SitePageNav,#pnc20MediaPageNav').forEach(container=>container.addEventListener('click',event=>{
    const button=event.target.closest('[data-pnc20-page]');
    if (!button) return;
    const page=button.dataset.pnc20Page;
    if (!pages.includes(page)) return;
    if (button.dataset.pnc20Type==='text') {
      state.current=page;renderPageInputs();
    } else {
      state.media=page;renderMedia().catch(error=>notify(error.message,true,'cmsMediaStatus'));
    }
    renderPagePills();
  }));
  $$('[data-panel="pageHubPanel"]').forEach(button=>button.addEventListener('click',renderPageHub));

  function renderBrand() {
    const b=state.site.brand, a=state.site.appearance;
    const fields={cmsBrandTitle:'title',cmsBrandTagline:'tagline',cmsAnnouncement:'announcement',cmsEmail:'email',cmsFacebook:'facebook',cmsTelegram:'telegram',cmsInstagram:'instagram'};
    for (const [id,key] of Object.entries(fields)) $('#' + id).value = b[key] || '';
    $('#cmsLogoPreview').src = imageUrl(b.logo || '/assets/img/logo.png');
    $('#cmsMotionEnabled').checked = a.enabled !== false;
    $('#cmsMotionStyle').value = a.style || 'aurora';
    $('#cmsHeadlineMotion').value = a.headlineMotion || 'cinematic';
    $('#cmsMotionTempo').value = a.tempo || 'normal';
    updateMotionPreview();
    $('#cmsMotionIntensity').value = Number.isFinite(a.intensity) ? a.intensity : 65;
    $('#cmsMotionIntensityText').textContent = $('#cmsMotionIntensity').value + '%';
  }
  function updateMotionPreview(replay=false) {
    const a=state.site?.appearance || {};
    const box=$('.v5-ambient-preview');
    if (!box) return;
    box.dataset.style=['aurora','stars','minimal','nebula'].includes(a.style) ? a.style : 'aurora';
    box.dataset.tempo=['gentle','normal','energetic'].includes(a.tempo) ? a.tempo : 'normal';
    box.dataset.headline=['cinematic','float','glow'].includes(a.headlineMotion) ? a.headlineMotion : 'cinematic';
    box.dataset.enabled=a.enabled===false?'off':'on';
    box.style.setProperty('--preview-intensity', String(Number.isFinite(a.intensity)?a.intensity/100:.65));
    if (replay) {box.classList.remove('v7-replay'); void box.offsetWidth; box.classList.add('v7-replay');}
  }
  function renderPageInputs() {
    const page = state.current;
    $('#cmsPageSelect').value = page;
    const data = state.site.pages[page] || {};
    $('#cmsPageTitle').value = data.title || '';
    $('#cmsPageHighlight').value = data.highlight || '';
    $('#cmsPageDescription').value = data.description || '';
    renderTextEditor().catch(err=>notify(err.message,true));
  }
  async function renderTextEditor() {
    const page=state.current;
    const container=$('#cmsTextEditor');
    container.innerHTML='<div class="v5-muted">Loading page sections...</div>';
    const doc=await documentFor(page);
    if (page!==state.current) return;
    const content=state.site.copy[page] || {};
    const nodes=$$('[data-cms-text]',doc);
    if (!nodes.length) { container.innerHTML='<p class="v5-muted">This page has no editable static sections.</p>'; return; }
    container.innerHTML=nodes.map(el=>{
      const id=el.dataset.cmsText;
      const original=el.textContent.replace(/\s+/g,' ').trim();
      const intro=original.slice(0,145)+(original.length>145?'…':'');
      const current=content[id] || '';
      return `<div class="pnc20-text-section" data-search="${escapeHtml((original+' '+current).toLowerCase())}">
        <div class="pnc20-text-section-head"><span class="pnc20-section-label">${escapeHtml(el.tagName)} · Text ${Number(id)+1}</span>${current?'<span class="pnc20-changed">Edited</span>':'<span class="pnc20-original">Original</span>'}</div>
        <p class="pnc20-original-copy">Original: ${escapeHtml(intro)}</p>
        <label><span class="pnc20-field-label">Replacement text</span><textarea rows="2" maxlength="1200" data-copy-id="${escapeHtml(id)}" placeholder="Write new text here, or leave empty to keep the original">${escapeHtml(current)}</textarea></label>
        <button class="pnc20-reset-text" type="button" data-pnc20-reset-text="${escapeHtml(id)}">↺ Use original text</button>
      </div>`;
    }).join('');
    applyTextSearch();
  }
  function applyTextSearch() {
    const input=$('#pnc20TextSearch');
    const q=(input?.value||'').trim().toLowerCase();
    let visible=0;
    $$('.pnc20-text-section',$('#cmsTextEditor')||document).forEach(row=>{
      const show=!q || (row.dataset.search||'').includes(q);
      row.hidden=!show;
      if(show) visible++;
    });
    const count=$('#pnc20TextCount');
    if (count) count.textContent=`${visible} text sections shown`;
  }
  $('#pnc20TextSearch')?.addEventListener('input',applyTextSearch);
  $('#cmsTextEditor')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-pnc20-reset-text]');
    if (!button || !state.site) return;
    const key=button.dataset.pnc20ResetText;
    delete ensureGroup('copy',state.current)[key];
    const row=button.closest('.pnc20-text-section');
    const textarea=row?.querySelector('textarea[data-copy-id]');
    if (textarea) textarea.value='';
    row?.querySelector('.pnc20-changed')?.replaceWith(Object.assign(document.createElement('span'),{className:'pnc20-original',textContent:'Original'}));
    notify('Original text selected in draft. Click Publish website changes to apply.');
  });
  async function renderEditor() {
    await loadSite(); setupSelectors(); renderBrand(); renderPageInputs(); renderPagePills();
  }
  function urlFromBackground(el,base) {
    const match=(el.getAttribute('style')||'').match(/background-image:\s*url\(['"]?([^'"\)]+)/i);
    if (!match) return null;
    try { return new URL(match[1],base).pathname; } catch (_) { return null; }
  }
  async function defaultBanners(page) {
    const doc=await documentFor(page);
    const base=new URL(urlForPage(page), location.origin);
    return $$('.hero-slides .hero-slide',doc).map(el=>urlFromBackground(el,base)).filter(Boolean);
  }
  async function currentBanners(page) {
    const saved=state.site.banners[page];
    return Array.isArray(saved) && saved.length ? [...saved] : await defaultBanners(page);
  }
  async function renderBannerList() {
    const page=state.media, target=$('#cmsBannerList');
    target.innerHTML='<p class="v5-muted">Loading banner photos...</p>';
    const banners=await currentBanners(page);
    if (state.media !== page) return;
    if (!banners.length) { target.innerHTML='<p class="v5-muted">Upload your first photo to create this page banner.</p>'; return; }
    target.innerHTML=banners.map((url,i)=>`<div class="v5-media-item"><div class="v5-media-thumb"><img alt="Banner ${i+1}" loading="lazy" src="${escapeHtml(imageUrl(url))}"></div><b>${escapeHtml(labels[page])} · Banner ${i+1}</b><div class="v5-media-actions"><button type="button" class="v5-mini-btn pnc20-replace-banner" data-banner="replace" data-index="${i}">Replace photo</button><button type="button" class="v5-mini-btn" data-banner="up" data-index="${i}" ${i===0?'disabled':''}>↑ Move</button><button type="button" class="v5-mini-btn" data-banner="down" data-index="${i}" ${i===banners.length-1?'disabled':''}>↓ Move</button><button type="button" class="v5-mini-btn warn" data-banner="remove" data-index="${i}">Remove</button></div></div>`).join('');
  }
  async function renderMediaImages() {
    const page=state.media,target=$('#cmsImageList');
    target.innerHTML='<p class="v5-muted">Loading page pictures...</p>';
    const doc=await documentFor(page);
    if (state.media!==page) return;
    const imageNodes=$$('[data-cms-image]',doc);
    const galleryNodes=$$('[data-cms-gallery]',doc);
    const base=new URL(urlForPage(page),location.origin);
    const items=[];
    for (const el of imageNodes) {
      const i=el.dataset.cmsImage;
      const def=new URL(el.getAttribute('src')||'/assets/img/music-vocals.svg',base).pathname;
      const src=state.site.images[page]?.[i]||def;
      items.push({id:i,kind:'image',title:el.getAttribute('alt')||`Page picture ${Number(i)+1}`,src});
    }
    for (const el of galleryNodes) {
      const i=el.dataset.cmsGallery;
      const def=new URL(el.dataset.art||'/assets/img/music-vocals.svg',base).pathname;
      const src=state.site.gallery[page]?.[i]||def;
      items.push({id:i,kind:'gallery',title:el.dataset.caption||`Gallery photo ${Number(i)+1}`,src});
    }
    if (!items.length) { target.innerHTML='<p class="v5-muted">No card photos detected on this page. You can still manage banner photos above.</p>'; const count=$('#pnc20ImageCount');if(count)count.textContent='0 pictures';return; }
    target.innerHTML=items.map(item=>`<div class="v5-media-item" data-pnc20-photo-name="${escapeHtml(item.title.toLowerCase())}"><div class="v5-media-thumb"><img loading="lazy" src="${escapeHtml(imageUrl(item.src))}" alt="${escapeHtml(item.title)}"></div><b title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</b><div class="v5-media-actions"><button class="v5-mini-btn" data-media-action="replace" data-kind="${item.kind}" data-index="${item.id}" type="button">Upload replacement</button><button class="v5-mini-btn warn" data-media-action="reset" data-kind="${item.kind}" data-index="${item.id}" type="button">Reset</button></div></div>`).join('');
    applyMediaSearch();
  }
  function applyMediaSearch() {
    const q=($('#pnc20MediaSearch')?.value||'').trim().toLowerCase();
    let count=0;
    $$('.v5-media-item',$('#cmsImageList')||document).forEach(item=>{
      const show=!q || (item.dataset.pnc20PhotoName||'').includes(q);
      item.hidden=!show;
      if(show) count++;
    });
    const result=$('#pnc20ImageCount');if(result)result.textContent=`${count} pictures shown`;
  }
  $('#pnc20MediaSearch')?.addEventListener('input',applyMediaSearch);
  async function renderMedia() {
    await loadSite(); setupSelectors(); $('#cmsMediaPageSelect').value=state.media;
    await Promise.all([renderBannerList(),renderMediaImages()]);
    showBackgroundPreview();
    renderPagePills();
  }
  async function imageData(file) {
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Select a PNG, JPG, or WebP photo.');
    if (file.size > 24_000_000) throw new Error('Photo is larger than 24 MB. Choose a smaller one.');
    const url = URL.createObjectURL(file);
    let bitmap;
    try {
      if ('createImageBitmap' in window) bitmap = await createImageBitmap(file);
      else {
        bitmap = new Image();
        await new Promise((resolve,reject) => {bitmap.onload=resolve;bitmap.onerror=reject;bitmap.src=url;});
      }
      const width=bitmap.width, height=bitmap.height;
      if (!width || !height) throw new Error('Could not decode the image.');
      const scale=Math.min(1,1800/Math.max(width,height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(width*scale));
      canvas.height=Math.max(1,Math.round(height*scale));
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
      // toBlob is asynchronous; toDataURL freezes the browser on large photos.
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image optimization failed.')),'image/webp',.82));
      if (blob.size>5_000_000) throw new Error('Optimized image is still too large. Try a smaller image.');
      return await new Promise((resolve,reject)=>{
        const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);
      });
    } finally {
      if (bitmap?.close) bitmap.close();
      URL.revokeObjectURL(url);
    }
  }

  async function upload(file) {
    if (!file) return null;
    const dataUrl=await imageData(file);
    const result=await api('/api/admin/upload',{method:'POST',body:JSON.stringify({dataUrl})});
    return result.url;
  }
  async function save(area='cmsSiteStatus') {
    await loadSite();
    notify('Publishing updates…',false,area);
    try {
      // Save only the editor's own groups. Never overwrite background settings,
      // team profiles, or unsaved edits in the other admin panel.
      const live=await api('/api/admin/site');
      const groups=area==='cmsMediaStatus' ? ['banners','images','gallery'] : ['brand','appearance','pages','copy'];
      if (area==='cmsMediaStatus') groups.push('galleryItems');
      for (const group of groups) live[group]=structuredClone(state.site[group]);
      await api('/api/admin/site',{method:'PUT',body:JSON.stringify(live)});
      notify('✓ Published. Open Preview to check your changes.',false,area);
      renderPageHub().catch(()=>{});
    } catch(error) { notify(error.message,true,area); }
  }

  // V13 one-click restore: the database may still hold an old personal wallpaper
  // from V11 even after installing a new ZIP.  Only media overrides are cleared.
  $('#cmsRestoreClubBanner')?.addEventListener('click', async () => {
    const msg = 'Restore the five PNC Music Club team photos across Home, About, News, Activities, Achievements, Gallery and Contact?\n\nThis clears saved background and banner overrides, but leaves uploaded files, admin accounts, messages, members, and website text untouched.';
    if (!window.confirm(msg)) return;
    const button = $('#cmsRestoreClubBanner');
    button.disabled = true;
    notify('Restoring music club team photos...',false,'cmsRestoreClubStatus');
    try {
      await loadSite();
      // Construct the next draft without changing the current live settings
      // until the server confirms the write succeeded.
      const next = structuredClone(state.site);
      next.globalMedia = {};
      next.pageMedia = {};
      next.heroMedia = {};
      next.banners = {};
      await api('/api/admin/site', {method:'PUT',body:JSON.stringify(next)});
      state.site = next;
      showBackgroundPreview();
      await renderBannerList();
      notify('✓ Music Club team photos published. Open the Home banner preview or refresh all seven pages (Ctrl + F5).',false,'cmsRestoreClubStatus');
      notify('PNC photos restored and published.',false,'cmsBgStatus');
    } catch(err) {
      notify('Could not restore the club photos: '+err.message,true,'cmsRestoreClubStatus');
    } finally {
      button.disabled = false;
    }
  });

  // V15: Background Studio edits wallpaper ONLY; banner slides are separate.
  // Historic "hero" background keys are ignored by the public renderer; the
  // separate Banner Slideshow editor remains responsible for all hero photos.
  const backgroundConfig = () => {
    if (!state.site) return null;
    const shared = $('#cmsBgTarget')?.value !== 'selected';
    const scope = 'pageMedia';
    const group = shared ? state.site.globalMedia : state.site.pageMedia;
    const key = shared ? 'page' : state.media;
    return { group, key, scope, shared };
  };
  const legacyHomeMedia = config =>
    config?.shared ? state.site?.[config.scope]?.home : null;
  const currentBackground = config =>
    config?.group?.[config.key] || legacyHomeMedia(config) || null;
  function showBackgroundPreview() {
    const box = $('#cmsBgPreview');
    if (!box || !state.site) return;
    const config = backgroundConfig();
    const directMedia = config?.group?.[config.key];
    const media = directMedia || legacyHomeMedia(config);
    const help = $('#cmsBgHelp');
    const reuse = $('#cmsBgUseHome');
    if (reuse) reuse.hidden = !config?.shared || !state.site?.[config.scope]?.home;
    if (help) {
      help.innerHTML = config.shared
        ? '<b>All 7 pages:</b> Publish one shared wallpaper for the full site. Your Home and inner-page banner slides stay unchanged.'
        : '<b>One page:</b> Publish wallpaper for the selected page. A site-wide wallpaper takes priority until you remove it; banner slides never change.';
    }
    box.replaceChildren();
    if (!media) {
      const empty = document.createElement('div');
      empty.className='pnc-bg-empty';
      empty.innerHTML='<span>♫</span><b>Default design is active</b><small>Upload an image, GIF or video to change it.</small>';
      box.appendChild(empty);
      $('#cmsBgCurrent').textContent=config.shared ? 'All 7 pages · default design' : 'Selected page · default design';
      $('#cmsBgOverlay').value = '55';
      $('#cmsBgOverlayValue').textContent = '55%';
      $('#cmsBgPosition').value='center';
      return;
    }
    const mediaElement = document.createElement(media.type === 'video' ? 'video' : 'img');
    mediaElement.src=media.src;
    mediaElement.className='pnc-bg-preview-element';
    if (media.type==='video') {mediaElement.controls=true;mediaElement.muted=true;mediaElement.loop=true;mediaElement.playsInline=true;mediaElement.preload='metadata';}
    else mediaElement.alt='New background preview';
    mediaElement.style.objectPosition=({center:'center center',top:'center top',bottom:'center bottom'})[media.position] || 'center';
    box.appendChild(mediaElement);
    const overlay=document.createElement('div');overlay.className='pnc-bg-preview-overlay';overlay.style.backgroundColor=`rgba(6,8,27,${Number(media.overlay)/100})`;
    box.appendChild(overlay);
    const title=document.createElement('div');title.className='pnc-bg-preview-title';title.textContent='PNC MUSIC CLUB  ♪';box.appendChild(title);
    $('#cmsBgCurrent').textContent=(directMedia ? 'Saved' : 'Inherited from Home')+' · '+media.type.toUpperCase()+' · '+Math.round(media.overlay)+'% overlay';
    $('#cmsBgPosition').value=media.position;
    $('#cmsBgOverlay').value=String(media.overlay);
    $('#cmsBgOverlayValue').textContent=media.overlay+'%';
  }
  const backgroundType = file => {
    const types = {'image/png':['image',8_000_000],'image/jpeg':['image',8_000_000],'image/webp':['image',8_000_000],'image/gif':['gif',15_000_000],'video/mp4':['video',40_000_000],'video/webm':['video',40_000_000]};
    const result=types[file?.type];
    if (!result) throw new Error('Please choose PNG, JPG, WebP, animated GIF, MP4 or WebM.');
    if (!file.size || file.size>result[1]) throw new Error(`Maximum size for this format is ${result[1]/1_000_000} MB.`);
    return result[0];
  };
  async function uploadBackground(file) {
    const response = await fetch('/api/admin/upload-background', {method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type},body:file});
    const result=await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(result.error || `Upload failed (${response.status}).`);
    return result.url;
  }
  async function publishBackgroundOnly() {
    // Save JUST the wallpaper configuration, never banners, text or profiles.
    // Fetch the latest live copy to preserve independently managed site content.
    await loadSite();
    const button = $('#cmsBgPublish');
    if (button) button.disabled = true;
    notify('Publishing page background only…',false,'cmsBgStatus');
    try {
      const live = await api('/api/admin/site');
      live.globalMedia ||= {};
      live.pageMedia ||= {};
      const draft = state.site;
      const shared = draft.globalMedia?.page;
      if (shared) live.globalMedia.page = structuredClone(shared);
      else delete live.globalMedia.page;
      // Preserve per-page wallpaper draft changes, including explicit resets.
      live.pageMedia = structuredClone(draft.pageMedia || {});
      await api('/api/admin/site',{method:'PUT',body:JSON.stringify(live)});
      // Keep banner and other unsaved editor changes in the local draft.
      notify('Page background published. Your banner photos and slideshow were NOT changed.',false,'cmsBgStatus');
    } catch (error) { notify(error.message,true,'cmsBgStatus'); }
    finally { if (button) button.disabled = false; }
  }
  $('#cmsBgPublish')?.addEventListener('click', publishBackgroundOnly);
  $('#cmsPickBg')?.addEventListener('click',()=>$('#cmsBgUpload')?.click());
  // Background Studio now has a single mode: page wallpaper; no banner switch.
  $('#cmsBgTarget')?.addEventListener('change',showBackgroundPreview);
  $('#cmsBgPosition')?.addEventListener('change',event=>{
    const config=backgroundConfig();if (!config) return;
    const current=currentBackground(config);if (!current) return;
    config.group[config.key] = {...current,position:event.target.value};
    showBackgroundPreview();
    notify('Position updated in draft. Publish background to apply.',false,'cmsBgStatus');
  });
  $('#cmsBgOverlay')?.addEventListener('input',event=>{
    $('#cmsBgOverlayValue').textContent=event.target.value+'%';
    const config=backgroundConfig();if (!config) return;
    const current=currentBackground(config);if (!current) return;
    config.group[config.key] = {...current,overlay:Number(event.target.value)};
    const saved=config.group[config.key];
    const veil=$('.pnc-bg-preview-overlay');if (veil) veil.style.backgroundColor=`rgba(6,8,27,${saved.overlay/100})`;
    $('#cmsBgCurrent').textContent=saved.type.toUpperCase()+' · '+saved.overlay+'% overlay';
  });
  $('#cmsBgUpload')?.addEventListener('change',async event=>{
    const file=event.target.files?.[0];if (!file) return;
    try {
      await loadSite();
      const type=backgroundType(file);
      const config=backgroundConfig();
      notify('Uploading '+file.name+'…',false,'cmsBgStatus');
      $('#cmsPickBg').disabled=true;
      const src=await uploadBackground(file);
      config.group[config.key]={type,src,overlay:Number($('#cmsBgOverlay').value)||55,position:$('#cmsBgPosition').value};
      showBackgroundPreview();
      notify((config.shared ? 'All 7 pages' : labels[state.media]) + ' ready. Click Publish background to make it live.',false,'cmsBgStatus');
    } catch (err) {notify(err.message,true,'cmsBgStatus');}
    finally {event.target.value='';$('#cmsPickBg').disabled=false;}
  });
  $('#cmsBgUseHome')?.addEventListener('click', async () => {
    await loadSite();
    const config=backgroundConfig();
    const home=state.site[config.scope]?.home;
    if (!config.shared || !home) {
      notify('There is no Home page background to copy.',true,'cmsBgStatus');
      return;
    }
    config.group[config.key]={...home};
    showBackgroundPreview();
    notify('Home wallpaper copied to the shared background. Banner slideshow stays unchanged. Publish to apply.',false,'cmsBgStatus');
  });
  $('#cmsResetBg')?.addEventListener('click', async () => {
    await loadSite(); const config=backgroundConfig();
    if (!config) return;
    if (config.shared && state.site[config.scope]?.home) {
      if (!window.confirm('Remove the shared page background from all 7 pages? Your banner photos and uploaded files will stay unchanged.')) return;
      delete state.site[config.scope].home;
    }
    delete config.group[config.key];
    showBackgroundPreview();
    notify('Wallpaper cleared in draft. Banner slides are unchanged. Publish to apply.',false,'cmsBgStatus');
  });

  // All editor controls are registered once and update a local draft.
  for (const [id,key] of Object.entries({cmsBrandTitle:'title',cmsBrandTagline:'tagline',cmsAnnouncement:'announcement',cmsEmail:'email',cmsFacebook:'facebook',cmsTelegram:'telegram',cmsInstagram:'instagram'})) {
    $('#' + id)?.addEventListener('input',event=>{if(state.site) state.site.brand[key]=event.target.value.trim();});
  }
  for (const [id,key] of Object.entries({cmsPageTitle:'title',cmsPageHighlight:'highlight',cmsPageDescription:'description'})) {
    $('#' + id)?.addEventListener('input',event=>{if(!state.site)return;const data=ensureGroup('pages',state.current);assignIfText(data,key,event.target.value);});
  }
  $('#cmsPageSelect')?.addEventListener('change',event=>{state.current=event.target.value;renderPageInputs();renderPagePills();});
  $('#cmsMotionEnabled')?.addEventListener('change',event=>{if(state.site){state.site.appearance.enabled=event.target.checked;updateMotionPreview(true);}});
  $('#cmsMotionStyle')?.addEventListener('change',event=>{if(state.site){state.site.appearance.style=event.target.value;updateMotionPreview(true);}});
  $('#cmsHeadlineMotion')?.addEventListener('change',event=>{if(state.site){state.site.appearance.headlineMotion=event.target.value;updateMotionPreview(true);}});
  $('#cmsMotionTempo')?.addEventListener('change',event=>{if(state.site){state.site.appearance.tempo=event.target.value;updateMotionPreview(true);}});
  $('#cmsReplayMotion')?.addEventListener('click',()=>updateMotionPreview(true));
  $('#cmsMotionIntensity')?.addEventListener('input',event=>{
    $('#cmsMotionIntensityText').textContent=event.target.value+'%';
    if(state.site){state.site.appearance.intensity=Number(event.target.value);updateMotionPreview();}
  });
  $('#cmsTextEditor')?.addEventListener('input',event=>{
    if(!state.site || !event.target.matches('[data-copy-id]'))return;
    const group=ensureGroup('copy',state.current);
    assignIfText(group,event.target.dataset.copyId,event.target.value);
    const row=event.target.closest('.pnc20-text-section');
    if(row) row.dataset.search=((row.querySelector('.pnc20-original-copy')?.textContent||'')+' '+event.target.value).toLowerCase();
  });
  $('#cmsPickLogo')?.addEventListener('click',()=>$('#cmsLogoFile').click());
  $('#cmsLogoFile')?.addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try {notify('Uploading logo...');const url=await upload(file);state.site.brand.logo=url;$('#cmsLogoPreview').src=url;notify('Logo uploaded. Click Save website to publish it.');}
    catch(err){notify(err.message,true);}finally{event.target.value='';}
  });
  $('#cmsSaveWebsite')?.addEventListener('click',()=>save());
  $('#cmsSaveWebsiteBottom')?.addEventListener('click',()=>save());
  $('#cmsSaveMedia')?.addEventListener('click',()=>save('cmsMediaStatus'));
  $('#cmsSaveMediaBottom')?.addEventListener('click',()=>save('cmsMediaStatus'));
  $('#cmsMediaPageSelect')?.addEventListener('change',event=>{state.media=event.target.value;renderMedia().catch(err=>notify(err.message,true,'cmsMediaStatus'));renderPagePills();});
  $('#cmsAddBanner')?.addEventListener('click',()=>$('#cmsBannerUpload').click());
  $('#cmsResetBanners')?.addEventListener('click',()=>{
    if(!state.site)return;
    delete state.site.banners[state.media];renderBannerList();notify('Default photos restored in draft. Publish to apply. ',false,'cmsMediaStatus');
  });
  $('#cmsBannerUpload')?.addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    const page=state.media;
    try {
      notify('Uploading banner...',false,'cmsMediaStatus');
      const current=await currentBanners(page);
      if(current.length>=9) throw new Error('Each page supports up to 9 banner photos.');
      const url=await upload(file);
      state.site.banners[page]=[...current,url];
      if(state.media===page) await renderBannerList();
      notify('Banner added. Publish to show it on the website.',false,'cmsMediaStatus');
    } catch(err){notify(err.message,true,'cmsMediaStatus');}
    finally{event.target.value='';}
  });
  let bannerReplaceTarget=null;
  $('#pnc20BannerReplaceUpload')?.addEventListener('change',async event=>{
    const file=event.target.files?.[0];
    const selected=bannerReplaceTarget;
    bannerReplaceTarget=null;
    if(!file || !selected) return;
    try{
      notify('Uploading replacement banner…',false,'cmsMediaStatus');
      const url=await upload(file);
      const banners=await currentBanners(selected.page);
      if(selected.index >= banners.length) throw new Error('Banner position no longer exists.');
      banners[selected.index]=url;
      state.site.banners[selected.page]=banners;
      if(state.media===selected.page) await renderBannerList();
      notify('Banner replaced in draft. Click Publish photo changes.',false,'cmsMediaStatus');
    }catch(error){notify(error.message,true,'cmsMediaStatus');}
    finally{event.target.value='';}
  });
  $('#pnc20CopyBanners')?.addEventListener('click',async()=>{
    await loadSite();
    const origin=state.media;
    if(!window.confirm(`Use ${labels[origin]}'s current slideshow photos on all seven pages? This will overwrite saved banner lists on the other pages, but will NOT change background wallpaper or text.`)) return;
    try{
      const banners=await currentBanners(origin);
      if(!banners.length) throw new Error('This page has no banner photos.');
      for(const page of pages) state.site.banners[page]=[...banners];
      await renderBannerList();
      notify('Banner slideshow copied to all seven page drafts. Click Publish photo changes.',false,'cmsMediaStatus');
    }catch(error){notify(error.message,true,'cmsMediaStatus');}
  });
  $('#cmsBannerList')?.addEventListener('click',async event=>{
    const button=event.target.closest('button[data-banner]');if(!button||!state.site)return;
    const page=state.media,arr=await currentBanners(page),i=Number(button.dataset.index);
    if(!Number.isInteger(i)||i<0||i>=arr.length)return;
    if(button.dataset.banner==='replace') {
      bannerReplaceTarget={page,index:i};
      $('#pnc20BannerReplaceUpload')?.click();
      return;
    }
    if(button.dataset.banner==='remove') {if(arr.length===1){notify('Keep at least one banner photo.',true,'cmsMediaStatus');return;}arr.splice(i,1);}
    else {const to=i+(button.dataset.banner==='up'?-1:1);if(to<0||to>=arr.length)return;[arr[i],arr[to]]=[arr[to],arr[i]];}
    state.site.banners[page]=arr;await renderBannerList();
    notify('Banner order updated. Publish to apply.',false,'cmsMediaStatus');
  });
  $('#cmsImageList')?.addEventListener('click',event=>{
    const button=event.target.closest('button[data-media-action]');if(!button||!state.site)return;
    const group=button.dataset.kind==='gallery'?'gallery':'images',page=state.media,key=button.dataset.index;
    if(button.dataset.mediaAction==='reset'){
      delete ensureGroup(group,page)[key];renderMediaImages();notify('Original picture restored in draft. Publish to apply.',false,'cmsMediaStatus');
    } else {
      state.genericTarget={page,group,key};$('#cmsGenericUpload').click();
    }
  });
  $('#cmsGenericUpload')?.addEventListener('change',async event=>{
    const file=event.target.files?.[0],target=state.genericTarget;
    if(!file||!target)return;
    try {
      notify('Uploading image...',false,'cmsMediaStatus');
      const url=await upload(file);
      ensureGroup(target.group,target.page)[target.key]=url;
      await renderMediaImages();
      notify('Image updated in draft. Publish to apply.',false,'cmsMediaStatus');
    }catch(err){notify(err.message,true,'cmsMediaStatus');}
    finally{event.target.value='';state.genericTarget=null;}
  });
  // V21 Gallery Studio. New entries are stored separately from the original nine.
  function galleryRows() { return Array.isArray(state.site?.galleryItems) ? state.site.galleryItems : []; }
  function renderExtraGallery() {
    const root=$('#pnc21GalleryList'); if (!root || !state.site) return;
    const photos=galleryRows();
    root.innerHTML=photos.length ? photos.map((photo,index)=>`<div class="pnc21-gallery-row" data-pnc21-id="${escapeHtml(photo.id)}">
      <img class="pnc21-gallery-thumb" src="${escapeHtml(imageUrl(photo.src))}" loading="lazy" alt="${escapeHtml(photo.title)}">
      <div class="pnc21-gallery-fields">
        <label>Photo caption<input type="text" maxlength="100" data-pnc21-field="title" value="${escapeHtml(photo.title)}"></label>
        <label>Category<select data-pnc21-field="category">
          ${['community','instruments','rhythm'].map(cat=>`<option value="${cat}" ${cat===photo.category?'selected':''}>${labels[cat]||cat[0].toUpperCase()+cat.slice(1)}</option>`).join('')}
        </select></label>
      </div>
      <div class="pnc21-gallery-row-actions">
        <button type="button" data-pnc21-action="up" ${index===0?'disabled':''} aria-label="Move photo up">↑</button>
        <button type="button" data-pnc21-action="down" ${index===photos.length-1?'disabled':''} aria-label="Move photo down">↓</button>
        <button type="button" data-pnc21-action="replace">Replace</button>
        <button type="button" class="pnc21-remove" data-pnc21-action="delete">Remove</button>
      </div>
    </div>`).join('') : '<div class="pnc21-gallery-empty"><strong>No extra Gallery photos yet</strong><p>Click “Add gallery photos” to upload multiple memories at once. Your nine existing photos remain visible.</p></div>';
    $('#pnc21GalleryStatus').textContent=`${photos.length} / 120 extra gallery photos · Changes are drafts until published.`;
  }
  const galleryNote=(text,isError=false)=>notify(text,isError,'pnc21GalleryStatus');
  $('#pnc21AddGallery')?.addEventListener('click',()=>$('#pnc21GalleryFiles')?.click());
  let galleryUploadBusy=false;
  async function acceptGalleryFiles(files, replaceId=null) {
    if(galleryUploadBusy || !files.length)return;
    await loadSite();
    const button=$('#pnc21AddGallery');
    galleryUploadBusy=true;
    if(button)button.disabled=true;
    let success=0;
    try {
      if(!replaceId && galleryRows().length+files.length>120)throw new Error('Gallery limit is 120 extra photos. Remove some before adding more.');
      for(const file of files) {
        galleryNote(`Optimizing and uploading ${success+1} of ${files.length}: ${file.name}`);
        const src=await upload(file);
        if(replaceId) {
          const entry=galleryRows().find(item=>item.id===replaceId);
          if(!entry)throw new Error('Photo was removed while uploading.');
          entry.src=src;
        } else {
          state.site.galleryItems.push({id:'photo_'+cryptoRandomId(),src,title:file.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').trim().slice(0,100)||'Music club memory',category:'community'});
        }
        success++;
        // Yield to the browser between images, keeping the admin controls responsive.
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      renderExtraGallery();galleryNote(`${success} image(s) uploaded. Click Publish gallery to make them visible.`);
    } catch(error) {
      renderExtraGallery(); galleryNote(`${success} uploaded. ${error.message}`,true);
    } finally {galleryUploadBusy=false;if(button)button.disabled=false;}
  }
  function cryptoRandomId() {
    const parts=new Uint8Array(10);window.crypto.getRandomValues(parts);
    return Array.from(parts,byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  $('#pnc21GalleryFiles')?.addEventListener('change',event=>{
    const files=[...(event.target.files||[])];event.target.value='';
    acceptGalleryFiles(files);
  });
  let replaceExtraId=null;
  const extraReplace=document.createElement('input');
  extraReplace.type='file';extraReplace.accept='image/png,image/jpeg,image/webp';extraReplace.hidden=true;
  $('#pnc21GalleryManager')?.appendChild(extraReplace);
  extraReplace.addEventListener('change',event=>{
    const files=[...(event.target.files||[])];event.target.value='';
    const id=replaceExtraId;replaceExtraId=null;
    if(id && files[0])acceptGalleryFiles([files[0]],id);
  });
  $('#pnc21GalleryList')?.addEventListener('input',event=>{
    const input=event.target.closest('[data-pnc21-field]');if(!input||!state.site)return;
    const row=input.closest('[data-pnc21-id]');const item=galleryRows().find(photo=>photo.id===row?.dataset.pnc21Id);
    if(item && input.dataset.pnc21Field==='title')item.title=input.value;
  });
  $('#pnc21GalleryList')?.addEventListener('change',event=>{
    const select=event.target.closest('select[data-pnc21-field="category"]');if(!select||!state.site)return;
    const item=galleryRows().find(photo=>photo.id===select.closest('[data-pnc21-id]')?.dataset.pnc21Id);
    if(item)item.category=select.value;
  });
  $('#pnc21GalleryList')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-pnc21-action]');if(!button||!state.site)return;
    const id=button.closest('[data-pnc21-id]')?.dataset.pnc21Id;
    const items=galleryRows(),index=items.findIndex(photo=>photo.id===id);
    if(index<0)return;
    const action=button.dataset.pnc21Action;
    if(action==='replace'){replaceExtraId=id;extraReplace.click();return;}
    if(action==='delete'){
      if(!window.confirm('Remove this added Gallery photo from the website? The original nine photos will not change.'))return;
      items.splice(index,1);
    } else {
      const next=index+(action==='up'?-1:1);
      if(next<0||next>=items.length)return;
      [items[index],items[next]]=[items[next],items[index]];
    }
    renderExtraGallery();galleryNote('Gallery draft changed. Click Publish gallery to save.');
  });
  $('#pnc21SaveGallery')?.addEventListener('click',async()=>{
    const button=$('#pnc21SaveGallery');if(galleryUploadBusy)return;
    button.disabled=true;
    try{
      await loadSite();
      for(const item of galleryRows()) if(!item.title.trim())throw new Error('Every Gallery photo needs a caption.');
      galleryNote('Publishing gallery…');
      const live=await api('/api/admin/site');
      live.galleryItems=structuredClone(galleryRows());
      await api('/api/admin/site',{method:'PUT',body:JSON.stringify(live)});
      galleryNote(`✓ Gallery published! ${galleryRows().length} extra photos are now live. Refresh Gallery to view.`);
    }catch(error){galleryNote(error.message,true);}finally{button.disabled=false;}
  });
  $$('[data-panel="mediaPanel"]').forEach(button=>button.addEventListener('click',async()=>{
    try{await loadSite();renderExtraGallery();}catch(error){galleryNote(error.message,true);}
  }));

  // Lazy initialization after authentication; the existing secure login and inbox remain unchanged.
  $$('[data-panel="sitePanel"]').forEach(button=>button.addEventListener('click',()=>renderEditor().catch(err=>notify(err.message,true))));
  $$('[data-panel="mediaPanel"]').forEach(button=>button.addEventListener('click',()=>renderMedia().catch(err=>notify(err.message,true,'cmsMediaStatus'))));
})();
