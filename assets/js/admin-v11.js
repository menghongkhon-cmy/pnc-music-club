(() => {
  function initPointerGlow() {
    const glow = document.createElement('div');
    glow.className = 'v11-admin-glow';
    document.body.append(glow);
    window.addEventListener('pointermove', (event) => {
      document.documentElement.style.setProperty('--mx', `${event.clientX}px`);
      document.documentElement.style.setProperty('--my', `${event.clientY}px`);
    }, { passive: true });
  }

  function buildTerminalWidget() {
    const showcase = document.querySelector('.auth-showcase');
    if (!showcase || showcase.querySelector('.hacker-terminal')) return;
    const terminal = document.createElement('div');
    terminal.className = 'hacker-terminal';
    terminal.innerHTML = `
      <div class="hacker-terminal-head">
        <div class="hacker-terminal-dots"><i></i><i></i><i></i></div>
        <span>ACCESS MONITOR</span>
      </div>
      <div class="hacker-terminal-lines">
        <span></span><span></span><span></span><span></span>
      </div>`;
    showcase.append(terminal);
  }

  function initGlitchTitle() {
    const title = document.getElementById('authTitle');
    if (!title) return;
    title.classList.add('v11-glitch');
    title.setAttribute('data-text', title.textContent.trim());
    const observer = new MutationObserver(() => {
      title.setAttribute('data-text', title.textContent.trim());
    });
    observer.observe(title, { childList: true, subtree: true, characterData: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPointerGlow();
    buildTerminalWidget();
    initGlitchTitle();
  });
})();
