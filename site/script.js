// Start ordinary document navigation at the top, without overriding anchors or history traversal.
(() => {
  const entry = performance.getEntriesByType?.('navigation')[0];
  if (entry?.type === 'back_forward') return;
  const reset = () => {
    if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };
  reset();
  window.addEventListener('pageshow', event => {
    if (event.persisted) return;
    reset();
    requestAnimationFrame(reset);
  });
})();

(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ease = 'cubic-bezier(.4,0,.22,1)';
  const header = $('#header');
  const menuButton = $('.menu-toggle');
  const drawer = $('#navigation');
  const backdrop = $('.drawer-backdrop');
  const closeButton = $('.drawer-close');
  const dropdownShell = $('.dropdown-shell');
  const navBackdrop = $('.nav-backdrop');
  let drawerOpen = false, activePanel = null, focusBeforeMenu = null;
  let syncCarousel = () => {};

  function closeDropdown() {
    $$('.nav-panel').forEach(panel => { panel.classList.remove('is-open'); panel.inert = true; });
    dropdownShell.classList.remove('is-open');
    navBackdrop.classList.remove('is-open');
    activePanel = null;
  }
  function openDropdown(id) {
    if (window.innerWidth < 1032 || drawerOpen || activePanel === id) return;
    closeDropdown();
    const panel = document.getElementById(id);
    if (!panel) return;
    activePanel = id;
    panel.inert = false;
    dropdownShell.classList.add('is-open');
    navBackdrop.classList.add('is-open');
    requestAnimationFrame(() => { if (activePanel === id) panel.classList.add('is-open'); });
  }
  $$('[data-dropdown]').forEach(a => {
    a.addEventListener('mouseenter', () => openDropdown(a.dataset.dropdown));
    a.addEventListener('focus', () => openDropdown(a.dataset.dropdown));
  });
  header.addEventListener('mouseleave', closeDropdown);
  header.addEventListener('focusout', e => { if (!header.contains(e.relatedTarget)) closeDropdown(); });
  navBackdrop.addEventListener('click', closeDropdown);
  function setDrawer(open) {
    if (open === drawerOpen) return;
    closeDropdown();
    if (open) focusBeforeMenu = document.activeElement;
    drawerOpen = open;
    document.body.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    drawer.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-open', open);
    drawer.inert = !open;
    [header, $('#main'), $('footer')].forEach(el => { el.inert = open; });
    if (open) {
      closeButton.focus({ preventScroll: true });
    } else if (focusBeforeMenu) focusBeforeMenu.focus({ preventScroll: true });
    syncCarousel();
  }
  menuButton.addEventListener('click', () => setDrawer(true));
  closeButton.addEventListener('click', () => setDrawer(false));
  backdrop.addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { setDrawer(false); closeDropdown(); }
    if (e.key === 'Tab' && drawerOpen) {
      const focusables = $$('button,a[href]', drawer);
      const first = focusables[0], last = focusables.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  let lastScroll = window.scrollY, scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      const y = Math.max(0, window.scrollY);
      header.classList.toggle('has-shadow', y > 50);
      if (!drawerOpen && !activePanel && Math.abs(y - lastScroll) > 4) {
        header.classList.toggle('is-hidden', y > 180 && y > lastScroll);
      }
      lastScroll = y; scrollQueued = false;
    });
  }, { passive: true });
  window.addEventListener('resize', () => { if (window.innerWidth < 1032) closeDropdown(); });

  const hero = $('.hero');
  if (hero) {
    const slides = $$('.hero-slide', hero), dots = $$('.slide-dot', hero);
    const pause = $('#carousel-pause');
    const transitionBase=document.createElement('div');transitionBase.className='hero-transition-base';transitionBase.setAttribute('aria-hidden','true');hero.appendChild(transitionBase);
    let current = 0, busy = false, paused = motion.matches, timer = null, progressAnimation = null;
    let runningAnimations = [];
    const interval = 4500;
    const canPlay = () => !paused && !busy && !drawerOpen && !document.hidden;
    function updatePause() {
      pause.classList.toggle('is-paused', paused);
      pause.setAttribute('aria-label', paused ? 'スライドの自動再生を開始' : 'スライドの自動再生を一時停止');
    }
    function stopClock() {
      clearTimeout(timer);
      timer = null;
      if (progressAnimation) { progressAnimation.cancel(); progressAnimation = null; }
    }
    function setIndicators() {
      dots.forEach((dot, i) => {
        dot.classList.toggle('selected', i === current);
        if (i === current) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
        $('.dot-progress', dot).style.transform = i < current ? 'scaleX(1)' : 'scaleX(0)';
      });
    }
    function startClock() {
      stopClock();
      if (!canPlay()) return;
      const bar = $('.dot-progress', dots[current]);
      if (bar.animate) progressAnimation = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: interval, easing: 'linear', fill: 'forwards' });
      timer = setTimeout(() => go(current + 1, 1), interval);
    }
    function normalize() {
      slides.forEach((slide, i) => {
        slide.classList.remove('is-entering', 'is-leaving');
        slide.classList.toggle('is-current', i === current);
        slide.inert = i !== current;
        if (i === current) slide.removeAttribute('aria-hidden');
        else slide.setAttribute('aria-hidden', 'true');
      });
      setIndicators();
      const following=$('.slide-photo img',slides[(current+1)%slides.length]);
      if(following)following.loading='eager';
    }
    function animate(el, frames, duration, delay = 0) {
      const animation = el.animate(frames, { duration, delay, easing: ease, fill: 'both' });
      runningAnimations.push(animation);
      // Handle cancellation even if a later animate() call throws before jobs is built.
      animation.finished.catch(() => {});
      return animation.finished;
    }
    function imageReady(image) {
      if (!image) return Promise.resolve(false);
      image.loading='eager';
      if (image.complete) return Promise.resolve(image.naturalWidth>0);
      return new Promise(resolve=>{
        let settled=false;
        const finish=()=>{if(settled)return;settled=true;clearTimeout(timeout);image.removeEventListener('load',finish);image.removeEventListener('error',fail);resolve(image.complete&&image.naturalWidth>0);};
        const fail=()=>{if(settled)return;settled=true;clearTimeout(timeout);image.removeEventListener('load',finish);image.removeEventListener('error',fail);resolve(false);};
        const timeout=setTimeout(fail,6000);
        image.addEventListener('load',finish,{once:true});image.addEventListener('error',fail,{once:true});
        if(image.complete)finish();
      });
    }
    async function go(index, direction = 0) {
      const next = (index + slides.length) % slides.length;
      if (busy || next === current) return;
      stopClock();
      const oldIndex = current;
      busy=true;
      const ready=await imageReady($('.slide-photo img',slides[next]));
      if(!ready){busy=false;startClock();return;}
      current = next;
      setIndicators();
      if (motion.matches || !slides[0].animate) { busy=false;normalize();startClock();return; }
      busy = true;
      const oldSlide = slides[oldIndex], nextSlide = slides[next];
      const sign = direction || (next > oldIndex ? 1 : -1);
      oldSlide.classList.remove('is-current'); oldSlide.classList.add('is-leaving');
      nextSlide.classList.add('is-entering');
      oldSlide.inert = true; oldSlide.setAttribute('aria-hidden', 'true');
      nextSlide.inert = true; nextSlide.removeAttribute('aria-hidden');
      const mobile = window.innerWidth < 768;
      const shrinkTime = mobile ? 520 : 650;
      const travelTime = mobile ? 950 : 1100;
      const imageDelay = mobile ? 450 : 500;
      const textDelay = mobile ? 320 : 350;
      const expandDelay = mobile ? 1350 : 1450;
      const expandTime = mobile ? 450 : 550;
      const minimumScale=mobile ? .56 : .6;
      const cornerRadius=mobile ? '48px' : '64px';
      const backdropImage=$('.slide-photo img',oldSlide);
      transitionBase.style.backgroundImage=`url(${JSON.stringify(backdropImage.currentSrc||backdropImage.src)})`;
      transitionBase.style.backgroundPosition=getComputedStyle(backdropImage).objectPosition||'center';
      hero.classList.add('is-transitioning');
      const move = (a, b) => [{ transform: `translateX(${a}%)` }, { transform: `translateX(${b}%)` }];
      const scale = (a, b) => [{ transform: `scale(${a})` }, { transform: `scale(${b})` }];
      let animationWatchdog;
      try {
      const jobs = [
        animate($('.slide-mask', oldSlide), [{ transform: 'scale(1)', borderRadius: '0px', clipPath: 'inset(0 round 0px)' }, { transform: `scale(${minimumScale})`, borderRadius: cornerRadius, clipPath: `inset(0 round ${cornerRadius})` }], shrinkTime),
        animate($('.slide-photo', oldSlide), scale(1, 1.25), shrinkTime),
        animate($('.slide-image-plane', oldSlide), move(0, -100 * sign), travelTime, imageDelay),
        animate($('.slide-text-plane', oldSlide), move(0, -100 * sign), travelTime, textDelay),
        animate($('.slide-image-plane', nextSlide), move(100 * sign, 0), travelTime, imageDelay + 100),
        animate($('.slide-text-plane', nextSlide), move(100 * sign, 0), travelTime, textDelay + 100),
        animate($('.slide-mask', nextSlide), [{ transform: `scale(${minimumScale})`, borderRadius: cornerRadius, clipPath: `inset(0 round ${cornerRadius})` }, { transform: 'scale(1)', borderRadius: '0px', clipPath: 'inset(0 round 0px)' }], expandTime, expandDelay + 100),
        animate($('.slide-photo', nextSlide), scale(1.25, 1), expandTime, expandDelay + 100)
      ];
      await Promise.race([Promise.allSettled(jobs),new Promise(resolve=>{animationWatchdog=setTimeout(resolve,expandDelay+100+expandTime+300);})]);
      } catch {
        current=oldIndex;
      } finally {
        // A failed or interrupted effect must leave a real, loaded photo on screen.
        clearTimeout(animationWatchdog);
        normalize();runningAnimations.forEach(a=>a.cancel());runningAnimations=[];
        hero.classList.remove('is-transitioning');transitionBase.style.backgroundImage='';
        busy=false;startClock();
      }
    }
    pause.addEventListener('click', () => { paused = !paused; updatePause(); startClock(); });
    dots.forEach((dot, i) => dot.addEventListener('click', () => go(i)));
    hero.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); paused = true; updatePause();
        go(current + (e.key === 'ArrowRight' ? 1 : -1), e.key === 'ArrowRight' ? 1 : -1);
      }
    });
    hero.addEventListener('focusin', e => {
      if (e.target.closest('.hero-slide')) { paused = true; updatePause(); startClock(); }
    });
    let touch = null;
    hero.addEventListener('touchstart', e => { touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
    hero.addEventListener('touchend', e => {
      if (!touch) return;
      const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
      if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        paused = true; updatePause(); go(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      }
      touch = null;
    }, { passive: true });
    syncCarousel = startClock;
    document.addEventListener('visibilitychange', () => {
      if(document.hidden)runningAnimations.forEach(animation=>animation.cancel());
      startClock();
    });
    window.addEventListener('pagehide', () => {
      stopClock();runningAnimations.forEach(animation=>animation.cancel());
    });
    motion.addEventListener('change', e => {
      if (e.matches) { paused = true; updatePause(); runningAnimations.forEach(a => a.finish()); }
      startClock();
    });
    normalize(); updatePause(); startClock();
  }

  $$('.faq details').forEach(details => {
    const summary = $('summary', details), content = $('div', details);
    let animating = false;
    summary.addEventListener('click', async e => {
      if (motion.matches || !content.animate) return;
      e.preventDefault();
      if (animating) return;
      animating = true;
      const wasOpen = details.open;
      if (!wasOpen) details.open = true;
      const height = content.scrollHeight;
      const animation = content.animate([{ height: wasOpen ? `${height}px` : '0px', opacity: wasOpen ? 1 : 0 }, { height: wasOpen ? '0px' : `${height}px`, opacity: wasOpen ? 0 : 1 }], { duration: 350, easing: 'cubic-bezier(.23,1,.58,1)', fill: 'both' });
      await animation.finished.catch(() => {});
      details.open = !wasOpen;
      animation.cancel(); animating = false;
    });
  });

  // Real document navigation with a brief cover transition; modified clicks remain native.
  let leaving = false;
  const prefetched = new Set();
  function internalPage(a) {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return null;
    const url = new URL(a.href, location.href);
    return url.origin === location.origin && url.pathname.endsWith('.html') && url.pathname !== location.pathname ? url : null;
  }
  document.addEventListener('pointerover', e => {
    const url = internalPage(e.target.closest('a[href]'));
    if (!url || prefetched.has(url.href)) return;
    prefetched.add(url.href);
    const prefetch = document.createElement('link'); prefetch.rel = 'prefetch'; prefetch.href = url.href; document.head.appendChild(prefetch);
  }, { passive: true });
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const url = internalPage(e.target.closest('a[href]'));
    if (!url || motion.matches || window.memberPhotoNavigation?.(new URL(location.href), url)) return;
    e.preventDefault();
    if (leaving) return;
    leaving = true;
    document.body.classList.remove('is-entering');
    document.body.classList.add('is-leaving');
    $('#main').setAttribute('aria-busy', 'true');
    setTimeout(() => location.assign(url.href), 430);
  });
  if (!motion.matches && !window.memberPhotoEntry?.()) {
    document.body.classList.add('is-entering');
    setTimeout(() => document.body.classList.remove('is-entering'), 750);
  }
  window.addEventListener('pageshow', () => {
    leaving = false;
    document.body.classList.remove('is-leaving');
    $('#main').removeAttribute('aria-busy');
    if (drawerOpen) setDrawer(false);
    syncCarousel();
  });
})();

// Photo galleries use a keyboard-accessible native dialog and keep source credits nearby.
(() => {
  const triggers=[...document.querySelectorAll('.gallery-open')];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(!triggers.length)return;
  const dialog=document.createElement('dialog');
  dialog.className='photo-lightbox';
  dialog.setAttribute('aria-label','ゼミ活動の写真');
  dialog.innerHTML='<div class="photo-lightbox-bar"><span class="photo-counter"></span><button class="photo-lightbox-close" aria-label="写真を閉じる">×</button></div><img class="photo-lightbox-image" alt=""><div class="photo-lightbox-footer"><div class="photo-lightbox-info"><p></p></div></div>';
  document.body.appendChild(dialog);
  let group=[],index=0;
  function show(next){
    if(!group.length)return;
    index=(next+group.length)%group.length;
    const trigger=group[index],image=dialog.querySelector('.photo-lightbox-image');
    image.src=trigger.dataset.photoSrc;image.alt=trigger.dataset.caption;
    dialog.querySelector('.photo-lightbox-info p').textContent=trigger.dataset.caption;
    dialog.querySelector('.photo-counter').textContent=`${String(index+1).padStart(2,'0')} / ${String(group.length).padStart(2,'0')}`;
    if(!reduced.matches&&image.animate){
      const expected=image.src;
      const reveal=()=>{if(dialog.open&&image.src===expected)image.animate([{opacity:.2},{opacity:1}],{duration:320,easing:'cubic-bezier(.23,1,.58,1)'});};
      if(image.complete)reveal();else image.addEventListener('load',reveal,{once:true});
    }
  }
  triggers.forEach(trigger=>trigger.addEventListener('click',()=>{
    group=[...trigger.closest('.photo-gallery').querySelectorAll('.gallery-open')];
    show(group.indexOf(trigger));dialog.showModal();
    if(!reduced.matches&&dialog.animate)dialog.animate([{opacity:0,transform:'translateY(16px) scale(.96)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:380,easing:'cubic-bezier(.16,1,.3,1)'});
  }));
  let closing=false;
  async function closePhoto(){
    if(closing||!dialog.open)return;
    closing=true;
    if(!reduced.matches&&dialog.animate){const animation=dialog.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.98)'}],{duration:180,easing:'ease-out',fill:'forwards'});await animation.finished.catch(()=>{});dialog.close();animation.cancel();}
    else dialog.close();
    closing=false;
  }
  dialog.querySelector('.photo-lightbox-close').addEventListener('click',closePhoto);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closePhoto();});
  reduced.addEventListener('change',event=>{if(event.matches&&dialog.getAnimations)dialog.getAnimations({subtree:true}).forEach(animation=>animation.finish());});
  const photo=dialog.querySelector('.photo-lightbox-image');
  let swipeStart=null;
  photo.addEventListener('pointerdown',event=>{
    if(event.isPrimary===false||!['touch','pen'].includes(event.pointerType))return;
    swipeStart={x:event.clientX,y:event.clientY,id:event.pointerId};
  });
  photo.addEventListener('pointercancel',()=>{swipeStart=null;});
  photo.addEventListener('pointerup',event=>{
    if(!swipeStart||swipeStart.id!==event.pointerId)return;
    const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;swipeStart=null;
    if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.3)show(index+(dx<0?1:-1));
  });
  dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();show(index+1);}else if(event.key==='ArrowLeft'){event.preventDefault();show(index-1);}});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)closePhoto();}});
})();
