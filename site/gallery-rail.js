(() => {
  'use strict';
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.gallery-rail').forEach(rail => {
    const cards = [...rail.children].filter(item => item.tagName === 'FIGURE');
    if (cards.length < 2) return;
    const maximum = () => Math.max(0, rail.scrollWidth - rail.clientWidth);
    function scrollTo(left) {
      rail.scrollTo({left: Math.max(0, Math.min(maximum(), left)), behavior: preference.matches ? 'auto' : 'smooth'});
    }
    function move(direction) {
      const current = rail.scrollLeft;
      const origin = cards[0].offsetLeft;
      const offsets = cards.map(card => card.offsetLeft - origin);
      const target = direction > 0
        ? offsets.find(left => left > current + 4) ?? maximum()
        : offsets.reverse().find(left => left < current - 4) ?? 0;
      scrollTo(target);
    }
    rail.addEventListener('keydown', event => {
      if (event.target !== rail) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault(); scrollTo(event.key === 'Home' ? 0 : maximum());
      }
    });
    preference.addEventListener('change', () => {
      if (preference.matches) rail.scrollTo({left: rail.scrollLeft, behavior: 'auto'});
    });
  });
})();
