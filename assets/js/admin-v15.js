/* Decorative pointer tilt on the login artwork; authentication remains in admin.js. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const setup = () => {
    const showcase = document.getElementById('v15Showcase');
    const artwork = document.getElementById('v15Art');
    if (!showcase || !artwork) return;
    showcase.addEventListener('pointermove', (event) => {
      if (reducedMotion.matches) return;
      const box = showcase.getBoundingClientRect();
      const x = ((event.clientX - box.left)/box.width - .5)*12;
      const y = ((event.clientY - box.top)/box.height - .5)*-9;
      artwork.style.setProperty('--v15-tilt-x', x.toFixed(2) + 'deg');
      artwork.style.setProperty('--v15-tilt-y', y.toFixed(2) + 'deg');
    });
    showcase.addEventListener('pointerleave', () => {
      artwork.style.setProperty('--v15-tilt-x', '0deg');
      artwork.style.setProperty('--v15-tilt-y', '0deg');
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
