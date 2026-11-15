(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mobile = window.matchMedia('(max-width: 760px)');
  const main = $('#main');
  if (!main || !('IntersectionObserver' in window)) return;
  let enabled = false, cleanups = [], frame = null;
  const startedAt = performance.now();
  const on = (target, event, handler, options) => {
    target.addEventListener(event, handler, options);
    cleanups.push(() => target.removeEventListener(event, handler, options));
  };
  function prepareDirectory() {
    const directory = $('.directory');
    if (!directory || directory.classList.contains('motion-directory')) return;
    const tiles = $$('.directory-tile', directory);
    if (!tiles.length) return;
    for (let index = 0; index < tiles.length; index += 3) {
      const row = document.createElement('div');
      row.className = tiles.slice(index,index+3).length===2?'directory-row directory-row-two':'directory-row';
      const ambient=document.createElement('div');ambient.className='directory-ambient';ambient.setAttribute('aria-hidden','true');
      const labels=document.createElement('div');labels.className='directory-preview-labels';labels.setAttribute('aria-hidden','true');
      tiles.slice(index,index+3).forEach(tile=>{
        const cell=document.createElement('div');cell.className='directory-preview-cell';
        const label=$('.tile-label',tile);if(label)cell.appendChild(label.cloneNode(true));labels.appendChild(cell);
      });
      // Keep the anchors last: the mobile final-card rule uses :last-child.
      row.appendChild(ambient);row.appendChild(labels);
      tiles.slice(index, index + 3).forEach(tile => row.appendChild(tile));
      directory.appendChild(row);
    }
    directory.classList.add('motion-directory');
  }
  function markTargets() {
    $$('.topic-card,.project-card,.member-card', main).forEach(card => {
      card.dataset.motion = 'card';
      const image = $('.topic-image,.cms-project-image,.project-photo,.project-art,.member-visual', card);
      if (image) image.classList.add('motion-card-image');
      const copy = $('.project-body,.member-card-copy,h3', card);
      if (copy) copy.classList.add('motion-card-copy');
    });
    $$('.wide-photo,.photo-gallery figure,.pagehead-photo,.join-intro-photo,.project-story-photo', main).forEach(photo => { photo.dataset.motion = 'photo'; });
    $$('.section-en,.students-heading h2,.lab-pagehead h1,.pagehead-content h1,.join-title-row h1', main).forEach(heading => { heading.dataset.motion = 'heading'; });
    $$('.reveal,.fields article,.journal-row,.profile-table>div,.faq details', main).forEach(item => {
      if (!item.dataset.motion && !item.parentElement.closest('[data-motion]')) item.dataset.motion = 'block';
    });
  }
  function disable() {
    enabled = false;
    cleanups.forEach(cleanup => cleanup()); cleanups = [];
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    document.body.classList.remove('motion-active');
    $$('[data-motion]', main).forEach(target => { target.classList.add('motion-in'); target.style.setProperty('--motion-delay', '0ms'); });
    $$('.preview-active,.preview-current').forEach(target => target.classList.remove('preview-active', 'preview-current'));
    $$('.motion-parallax', main).forEach(image => { image.classList.remove('motion-parallax'); image.style.removeProperty('--photo-drift'); });
  }
  function enable() {
    if (enabled || preference.matches) return;
    enabled = true;
    try {
      prepareDirectory(); markTargets();
      const waiting = new Set();
      const activeAnimations=new Set();
      const stopAnimations=()=>{activeAnimations.forEach(animation=>animation.cancel());activeAnimations.clear();};
      on(document,'visibilitychange',()=>{if(document.hidden)stopAnimations();});
      on(window,'pageshow',event=>{if(event.persisted)stopAnimations();});
      cleanups.push(stopAnimations);
      const animate = (element,keyframes,delay=0,duration=850) => {
        if(!element?.animate||!enabled||preference.matches||document.hidden||document.documentElement?.classList.contains('member-navigation'))return;
        if(element.closest?.('.member-transition-photo'))return;
        try{
          const animation=element.animate(keyframes,{duration,delay,easing:'cubic-bezier(.23,1,.58,1)',fill:'backwards'});
          activeAnimations.add(animation);
          const release=()=>{clearTimeout(watchdog);activeAnimations.delete(animation);animation.cancel();};
          const watchdog=setTimeout(release,delay+duration+200);
          animation.finished?.then(release,release);
          cleanups.push(()=>{clearTimeout(watchdog);animation.cancel();activeAnimations.delete(animation);});
        }catch{ /* Static content is visible without an animation. */ }
      };
      const reveal = target => {
        const siblings = [...target.parentElement.children].filter(child=>!child.classList.contains('directory-ambient')&&!child.classList.contains('directory-preview-labels'));
        const columns = getComputedStyle(target.parentElement).gridTemplateColumns.split(' ').filter(Boolean);
        const count = columns[0] === 'none' ? 1 : Math.max(1, columns.length);
        const position = Math.max(0, siblings.indexOf(target));
        const step = target.classList.contains('journal-row') ? position % 4 : position % count;
        const warmup = Math.max(0, 650 - (performance.now() - startedAt));
        target.style.setProperty('--motion-delay', `${enabled ? warmup + Math.min(step, 3) * (mobile.matches ? 65 : 95) : 0}ms`);
        const first=!target.classList.contains('motion-in');
        target.classList.add('motion-in'); waiting.delete(target);
        if (!first || target.classList.contains('motion-forced')) return;
        const delay=Math.min(step,3)*(mobile.matches?65:110);
        if (target.dataset.motion==='card') {
          animate($('.motion-card-image',target),[{opacity:.35,transform:mobile.matches?'scale(.9)':'scale(.7)',borderRadius:'22px'},{opacity:1,transform:'scale(1)',borderRadius:'0px'}],delay,850);
          animate($('.motion-card-copy',target),[{opacity:0,transform:'translateY(25px)'},{opacity:1,transform:'none'}],delay+260,650);
        } else if(target.dataset.motion==='photo') {
          const image=$('img',target);
          if(image&&image.complete&&image.naturalWidth>0)animate(image,[{clipPath:'inset(0 12% 0 12%)',transform:'scale(1.14)',opacity:.55},{clipPath:'inset(0)',transform:'scale(1)',opacity:1}],delay,1000);
        } else animate(target,[{opacity:0,transform:'translateY(32px)'},{opacity:1,transform:'none'}],delay,750);
      };
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const target = entry.target;
          observer.unobserve(target);
          const image = $('img', target);
          if (!image || image.complete || !enabled) { reveal(target); return; }
          image.loading='eager';
          let finished = false;
          const finish = () => {
            if (finished) return; finished = true;
            clearTimeout(timer); image.removeEventListener('load', finish); image.removeEventListener('error', finish);
            reveal(target);
          };
          const timer = setTimeout(finish, 1000);
          image.addEventListener('load', finish, { once: true });
          image.addEventListener('error', finish, { once: true });
          cleanups.push(() => { clearTimeout(timer); image.removeEventListener('load', finish); image.removeEventListener('error', finish); });
        });
      }, { threshold: .08, rootMargin: '0px 0px -5% 0px' });
      cleanups.push(() => observer.disconnect());
      $$('[data-motion]', main).forEach(target => {
        if (!target.classList.contains('motion-in')) { waiting.add(target); observer.observe(target); }
      });
      on(document, 'focusin', event => {
        const target = event.target.closest('[data-motion]');
        if (target && waiting.has(target)) {
          target.classList.add('motion-forced'); reveal(target); observer.unobserve(target);
        }
      });
      $$('.directory-row').forEach(row=>{
        const ambient=$('.directory-ambient',row),labels=$('.directory-preview-labels',row),tiles=$$('.directory-tile',row);
        let generation=0,cancelLoad=null;
        const clear=()=>{generation++;cancelLoad?.();cancelLoad=null;row.classList.remove('preview-active');tiles.forEach(tile=>tile.classList.remove('preview-current'));[...labels.children].forEach(cell=>cell.classList.remove('preview-current'));};
        const preview=async tile=>{
          if(!enabled||mobile.matches||preference.matches)return;
          const image=$('img',tile);if(!image)return;
          cancelLoad?.();cancelLoad=null;
          const expected=++generation;image.loading='eager';
          const src=image.currentSrc||image.src;
          try{
            if(!image.complete){
              const loaded=await new Promise(resolve=>{
                let done=false;
                const finish=value=>{if(done)return;done=true;clearTimeout(timeout);image.removeEventListener('load',success);image.removeEventListener('error',failure);if(cancelLoad===cancel)cancelLoad=null;resolve(value);};
                const success=()=>finish(image.naturalWidth>0),failure=()=>finish(false),cancel=()=>finish(false);
                const timeout=setTimeout(failure,4000);cancelLoad=cancel;
                image.addEventListener('load',success,{once:true});image.addEventListener('error',failure,{once:true});
              });
              if(expected!==generation)return;
              if(!loaded){clear();return;}
            }
            if(!image.naturalWidth){clear();return;}
            if(image.decode)await image.decode();
            if(expected!==generation||!enabled||mobile.matches||preference.matches||(image.currentSrc||image.src)!==src)return;
            ambient.style.backgroundImage=`url(${JSON.stringify(src)})`;
            ambient.style.backgroundPosition=getComputedStyle(image).objectPosition||'center';
            tiles.forEach((item,index)=>{item.classList.toggle('preview-current',item===tile);labels.children[index].classList.toggle('preview-current',item===tile);});
            row.classList.add('preview-active');
          }catch{if(expected===generation)clear();}
        };
        tiles.forEach(tile=>{on(tile,'pointerenter',()=>{if(finePointer.matches)preview(tile);});on(tile,'focusin',()=>preview(tile));});
        on(row,'pointerleave',clear);on(row,'focusout',event=>{if(!row.contains(event.relatedTarget))clear();});
        on(window,'resize',()=>{if(mobile.matches)clear();},{passive:true});on(window,'pagehide',clear);
        cleanups.push(clear);
      });
      // Desktop-only drift is applied separately from existing zoom/hover transforms.
      const active = new Set();
      const images = $$('.pagehead-photo img,.venturing-visual img', main);
      const drift = () => {
        frame = null;
        if (!enabled || !finePointer.matches || mobile.matches || document.hidden) return;
        active.forEach(image => {
          const bounds = image.parentElement.getBoundingClientRect();
          const range = Math.max(1, (window.innerHeight + bounds.height) / 2);
          const progress = Math.max(-1, Math.min(1, (bounds.top + bounds.height / 2 - window.innerHeight / 2) / range));
          image.style.setProperty('--photo-drift', `${(progress * -14).toFixed(2)}px`);
        });
      };
      const queueDrift = () => { if (frame === null && active.size) frame = requestAnimationFrame(drift); };
      const photos = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const image = entry.target;
          if (entry.isIntersecting) active.add(image); else active.delete(image);
        });
        queueDrift();
      }, { rootMargin: '40px' });
      images.forEach(image => { image.classList.add('motion-parallax'); photos.observe(image); });
      cleanups.push(() => photos.disconnect());
      on(window, 'scroll', queueDrift, { passive: true });
      on(window, 'resize', queueDrift, { passive: true });
      document.body.classList.add('motion-active');
    } catch {
      disable();
    }
  }
  preference.addEventListener('change', () => { if (preference.matches) disable(); else enable(); });
  enable();
})();
