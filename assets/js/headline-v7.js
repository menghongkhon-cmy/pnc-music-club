/* The banner's editorial headline is animated after CMS data loads. No external library needed. */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const createLines = heading => {
    if (!heading || heading.dataset.lineReady === 'yes') return;
    const segments = [];
    let line = [];
    for (const node of Array.from(heading.childNodes)) {
      if (node.nodeType === 1 && node.tagName === 'BR') {
        if (line.length) segments.push(line);
        line=[];
      } else line.push(node);
    }
    if(line.length) segments.push(line);
    if(!segments.length) return;
    heading.replaceChildren();
    segments.forEach((nodes,index) => {
      const wrapper=document.createElement('span');
      wrapper.className='headline-line';
      wrapper.style.setProperty('--line-delay',`${.1 + index*.16}s`);
      nodes.forEach(node=>wrapper.appendChild(node));
      heading.appendChild(wrapper);
    });
    heading.dataset.lineReady='yes';
    heading.classList.add('headline-animated');
  };
  const replay = () => {
    if (reduced.matches) return;
    const heading = document.querySelector('.hero h1, .inner-hero h1');
    if(!heading || heading.dataset.lineReady !== 'yes') return;
    heading.classList.remove('headline-animated');
    void heading.offsetWidth;
    heading.classList.add('headline-animated');
  };
  Promise.resolve(window.PNC_SITE_READY).then(() => {
    const heading=document.querySelector('.hero h1, .inner-hero h1');
    createLines(heading);
  }).catch(() => createLines(document.querySelector('.hero h1, .inner-hero h1')));
  // Keep text readable throughout photo transitions; only reveal it when the page first loads.
})();
