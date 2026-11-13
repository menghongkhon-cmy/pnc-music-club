(() => {
  // CSS-powered animations can be paused in other browser tabs without
  // disturbing the banner timer, gallery UI or accessibility interactions.
  const onVisibility = () => document.documentElement.classList.toggle('pnc21-idle', document.hidden);
  document.addEventListener('visibilitychange',onVisibility,{passive:true});
  onVisibility();
})();
