// One coordinator owns member photo navigation and the page-cover fallback.
(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const supported = 'onpagereveal' in window && CSS.supports('view-transition-name', 'member-portrait');
  const isList = url => /\/people\.html$/.test(url.pathname);
  const isProfile = url => /\/member\.html$/.test(url.pathname);
  const participant = (from, to) => {
    if (!from || !to || from.origin !== to.origin) return null;
    if (isProfile(to) && isList(from)) return to.searchParams.get('id');
    if (isProfile(from) && isList(to)) return from.searchParams.get('id');
    return null;
  };
  const visual = id => [...document.querySelectorAll('[data-member-id]')].find(el => el.dataset.memberId === id);
  const previousURL = () => {
    const previous = window.navigation?.activation?.from?.url || document.referrer;
    try { return previous ? new URL(previous) : null; } catch { return null; }
  };
  window.memberPhotoNavigation = (from, to) => supported && !motion.matches && Boolean(participant(from, to));
  // Called by script.js before it starts the ordinary 750ms black page cover.
  window.memberPhotoEntry = () => supported && !motion.matches && Boolean(participant(previousURL(), new URL(location.href)));
  if (!supported) return;
  let active = null;
  const clear = entry => {
    if (!entry || active !== entry) return;
    entry.element.style.removeProperty('view-transition-name');
    entry.element.classList.remove('member-transition-photo');
    document.documentElement.classList.remove('member-navigation');
    active = null;
  };
  const select = (id, transition, phase) => {
    clear(active);
    // Stop the cover permanently, rather than hiding it until this shorter
    // transition finishes (which previously made the black cover reappear).
    document.body.classList.remove('is-entering', 'is-leaving');
    document.querySelector('#main')?.removeAttribute('aria-busy');
    const element = visual(id);
    const bounds = element?.getBoundingClientRect();
    const image = element?.querySelector('img');
    if (!element || !bounds.width || !bounds.height || bounds.bottom <= 0 || bounds.top >= window.innerHeight || (image && (!image.complete || !image.naturalWidth))) {
      transition.skipTransition(); return;
    }
    const entry = { element, phase }; active = entry;
    document.documentElement.classList.add('member-navigation');
    element.classList.add('member-transition-photo');
    element.style.viewTransitionName = 'member-portrait';
    element.closest('.member-card')?.classList.add('motion-in');
    transition.finished.catch(() => {}).finally(() => clear(entry));
  };
  addEventListener('pageswap', event => {
    if (!event.viewTransition) return;
    if (motion.matches) { event.viewTransition.skipTransition(); return; }
    const next = event.activation?.entry?.url;
    const id = next && participant(new URL(location.href), new URL(next));
    if (id) select(id, event.viewTransition, 'outgoing'); else event.viewTransition.skipTransition();
  });
  addEventListener('pagereveal', event => {
    if (!event.viewTransition) return;
    if (motion.matches) { event.viewTransition.skipTransition(); return; }
    const id = participant(previousURL(), new URL(location.href));
    if (id) select(id, event.viewTransition, 'incoming'); else event.viewTransition.skipTransition();
  });
  // Frozen outgoing documents may return from the back/forward cache before
  // their old finished promise settles. Never let that cleanup clear a new one.
  addEventListener('pageshow', () => { if (active?.phase === 'outgoing') clear(active); });
  motion.addEventListener('change', () => { if (motion.matches) clear(active); });
})();
