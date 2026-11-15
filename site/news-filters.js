const running = new WeakMap();
export function applyNewsFilter(items, key, animate = true) {
  const before = new Map();
  for (const item of items) {
    if (!item.hidden) before.set(item, item.getBoundingClientRect());
    running.get(item)?.cancel();
    running.delete(item);
  }
  let count = 0;
  for (const item of items) {
    item.hidden = key !== 'all' && item.dataset.category !== key;
    if (!item.hidden) count++;
  }
  // Read all final positions before starting animations to avoid layout thrashing.
  const visible = items.filter(item => !item.hidden);
  const after = new Map(visible.map(item => [item, item.getBoundingClientRect()]));
  visible.forEach((item, index) => {
    if (!animate || !item.animate) return;
    item.classList.add('motion-in');
    const previous = before.get(item), next = after.get(item);
    const frames = previous ? [{ transform: `translateY(${previous.top - next.top}px)`, opacity: 1 }, { transform: 'translateY(0)', opacity: 1 }] : [{ transform: 'translateY(12px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }];
    const animation = item.animate(frames, { duration: previous ? 340 : 280, delay: previous ? 0 : Math.min(index, 3) * 35, easing: 'cubic-bezier(.23,1,.58,1)', fill: 'backwards' });
    running.set(item, animation);
    animation.finished.catch(() => {}).finally(() => { if (running.get(item) === animation) running.delete(item); });
  });
  return count;
}
if (typeof document !== 'undefined') {
  const buttons = [...document.querySelectorAll('[data-filter]')];
  if (buttons.length) {
    const items = [...document.querySelectorAll('.news-item')];
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const filter = (key, animate = true) => {
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === key)));
      const count = applyNewsFilter(items, key, animate && !motion.matches);
      document.querySelector('.news-count').textContent = `${count}件の記事`;
    };
    buttons.forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.filter;
      filter(key);
      history.replaceState(null, '', location.pathname + location.search + (key === 'all' ? '' : '#' + key));
    }));
    const syncHash = () => filter(buttons.some(button => button.dataset.filter === location.hash.slice(1)) ? location.hash.slice(1) : 'all', false);
    addEventListener('hashchange', syncHash);
    motion.addEventListener('change', () => { if (motion.matches) items.forEach(item => running.get(item)?.cancel()); });
    syncHash();
  }
}
