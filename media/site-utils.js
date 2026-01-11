(function(){
  // Site-wide configuration
  const SITE_PAGES = [
    'index.html','about.html','careers.html','contact.html','news.html',
    'primus.html','trion.html','teletraan.html','sentinel.html','obex.html',
    'nest.html','industries.html'
  ];

  const SOCIAL_LINKS = {
    linkedin: 'https://www.linkedin.com/search/results/all/?fetchDeterministicClustersOnly=true&heroEntityKey=urn%3Ali%3Aorganization%3A82995106&keywords=avzdax&origin=RICH_QUERY_TYPEAHEAD_HISTORY&position=0&searchId=8620e0a0-2482-4f40-9d64-8456d2ba75f8&sid=JE3&spellCorrectionEnabled=true',
    x: 'https://x.com/avzdax'
  };

  // Simple DOM helpers
  function el(ns, tag, attrs){ const e = document.createElement(tag); if(attrs) Object.keys(attrs).forEach(k=>e.setAttribute(k, attrs[k])); return e; }

  // ---------- Social links injection ----------
  function wireSocialLinks(){
    const buttons = document.querySelectorAll('.social-glass-btn');
    if(!buttons || buttons.length===0) return;
    // Map: first -> linkedin, second -> x, third -> remove/hide
    if(buttons[0]){ buttons[0].href = SOCIAL_LINKS.linkedin; buttons[0].target = '_blank'; buttons[0].rel='noopener'; buttons[0].textContent = 'LinkedIn'; }
    if(buttons[1]){ buttons[1].href = SOCIAL_LINKS.x; buttons[1].target = '_blank'; buttons[1].rel='noopener'; buttons[1].textContent = 'X'; }
    if(buttons[2]){ buttons[2].remove(); }
  }

  // ---------- Back button injection (consistent placement) ----------
  function ensureBackButton(){
    // Don't show a back arrow on the homepage (root or index.html)
    const pathname = (window.location.pathname || '').split('/').pop();
    if(!pathname || pathname === '' || pathname === 'index.html') return;

    // If an arrow already exists, do nothing
    if(document.querySelector('.site-back-arrow')) return;

    const btn = el(document, 'button');
    btn.className = 'site-back-arrow';
    btn.setAttribute('aria-label', 'Go back');
    btn.tabIndex = 0;
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M9 18L3 12 9 6"/></svg>';

    // Polished circular touch target with subtle backdrop to work on any hero
    btn.style.position = 'fixed';
    btn.style.zIndex = '99999';
    btn.style.width = '48px';
    btn.style.height = '48px';
    btn.style.borderRadius = '999px';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.cursor = 'pointer';
    btn.style.border = '1px solid rgba(255,255,255,0.08)';
    btn.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))';
    btn.style.backdropFilter = 'blur(6px)';
    btn.style.color = '#fff';
    btn.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6)';
    btn.style.opacity = '0.98';
    btn.style.transition = 'transform 160ms ease, opacity 160ms ease, background 160ms ease';

    const nav = document.getElementById('main-nav');
    const topOffset = nav ? (nav.getBoundingClientRect().height + 12) : 20;
    // best position: slightly inset from left and below nav for visibility
    btn.style.top = (topOffset) + 'px';
    btn.style.left = '14px';

    // increase left offset on very small screens
    function adjustForViewport(){ if(window.innerWidth <= 420){ btn.style.left = '10px'; btn.style.top = (topOffset) + 'px'; } }
    adjustForViewport(); window.addEventListener('resize', adjustForViewport, {passive:true});

    btn.addEventListener('mouseover', ()=>{ btn.style.transform = 'translateX(-3px) scale(1.03)'; btn.style.opacity = '1'; });
    btn.addEventListener('mouseout', ()=>{ btn.style.transform = 'none'; btn.style.opacity = '0.98'; });

    btn.onclick = () => { if(history.length>1) history.back(); else window.location.href = 'index.html'; };

    // analytics attribute for tracking
    btn.setAttribute('data-analytics','back-button');

    document.body.appendChild(btn);
  }

  // ---------- Site search implementation ----------
  // Caches fetched page text
  const pageIndex = [];
  let indexed = false;

  async function buildIndex(){
    if(indexed) return pageIndex;
    const promises = SITE_PAGES.map(async (page) => {
      try{
        const resp = await fetch(page, {cache: 'no-store'});
        const text = await resp.text();
        // extract title
        const titleMatch = text.match(/<title>([^<]*)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : page;
        // strip tags for searchable content
        const stripped = text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
        return {url: page, title, content: stripped.replace(/\s+/g,' ')};
      }catch(e){ return {url: page, title: page, content: ''}; }
    });

    const results = await Promise.all(promises);
    pageIndex.push(...results);
    indexed = true;
    return pageIndex;
  }

  function highlight(text, q){
    if(!q) return text;
    const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return text.replace(new RegExp('('+safeQ+')','ig'), '<mark style="background:rgba(255,255,0,0.15);color:inherit;padding:0 2px;border-radius:2px">$1</mark>');
  }

  function renderSearchResults(container, results, q){
    container.innerHTML = '';
    if(!results || results.length===0){ container.innerHTML = '<div class="text-white/40 italic">No results</div>'; return; }
    const ul = el(document,'div'); ul.className = 'grid gap-4';
    results.forEach(r=>{
      const a = el(document,'a',{href:r.url}); a.className='block p-4 bg-white/5 border border-white/10 rounded'; a.target='_self';
      const h = el(document,'div'); h.className='font-black uppercase text-sm mb-1'; h.innerHTML = highlight(r.title, q);
      const p = el(document,'div'); p.className='text-sm text-silver-400';
      p.innerHTML = highlight((r.snippet||r.content.slice(0,220)) + '...', q);
      a.appendChild(h); a.appendChild(p);
      ul.appendChild(a);
    });
    container.appendChild(ul);
  }

  function performSearch(q, resultsContainer){
    if(!q || q.trim().length < 1){ resultsContainer.innerHTML = '<div class="text-white/40 italic">Type to search the site...</div>'; return; }
    const tokens = q.trim().toLowerCase().split(/\s+/);
    const matches = [];
    for(const p of pageIndex){
      const text = (p.title + ' ' + p.content).toLowerCase();
      let score = 0;
      for(const t of tokens){ if(text.includes(t)) score += 1; }
      if(score>0){
        // build snippet
        let idx = text.indexOf(tokens[0]);
        let snippet = '';
        if(idx>-1){
          const start = Math.max(0, idx - 60);
          snippet = p.content.slice(start, start+220);
        } else {
          snippet = p.content.slice(0,220);
        }
        matches.push({url: p.url, title: p.title, content: p.content, snippet});
      }
    }
    // sort by score approximation (simple length-based then title match)
    matches.sort((a,b)=> (b.title.toLowerCase().includes(q.toLowerCase())?10:0) - (a.title.toLowerCase().includes(q.toLowerCase())?10:0));
    renderSearchResults(resultsContainer, matches.slice(0,10), q);
  }

  // Wire up overlay input when present
  function wireSearchOverlay(){
    const overlay = document.getElementById('search-overlay');
    if(!overlay) return;
    const input = overlay.querySelector('input[type=text]');
    if(!input) return;
    // add results container
    let resultsContainer = overlay.querySelector('.site-search-results');
    if(!resultsContainer){
      resultsContainer = el(document,'div');
      resultsContainer.className = 'site-search-results w-full max-w-5xl';
      overlay.appendChild(resultsContainer);
    }

    let debounceTimer = null;
    input.addEventListener('input', (e)=>{
      clearTimeout(debounceTimer);
      const q = e.target.value;
      debounceTimer = setTimeout(async ()=>{
        await buildIndex();
        performSearch(q, resultsContainer);
      }, 220);
    });

    // keyboard: Enter opens first result
    input.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter'){
        const first = resultsContainer.querySelector('a');
        if(first) window.location.href = first.href;
      }
      if(e.key === 'Escape'){
        overlay.classList.remove('is-open');
      }
    });

    // Accessibility: focus input when overlay opens
    const observer = new MutationObserver(m=>{
      if(overlay.classList.contains('is-open')){ setTimeout(()=>{ input.focus(); },120); }
    });
    observer.observe(overlay, {attributes:true, attributeFilter:['class']});
  }

  // Initialize on DOM ready
  function init(){
    try{ wireSocialLinks(); }catch(e){}
    try{ ensureBackButton(); }catch(e){}
    try{ wireSearchOverlay(); }catch(e){}
    try{ injectMobileMenu(); }catch(e){}
    try{ injectMobileToggle(); }catch(e){}
    try{ wireMobileMenuToggles(); }catch(e){}
    try{ enablePrimusMobileHero(); }catch(e){}
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // Expose for debugging
  window.__AVZ_siteUtils = { buildIndex };
  
  // ---------- Robust video playback helper (retry on gesture) ----------
  function tryPlayAutoplayVideos(){
    try{
      const videos = Array.from(document.querySelectorAll('video'));
      videos.forEach(v=>{
        try{ v.muted = true; v.playsInline = true; v.setAttribute('playsinline',''); v.setAttribute('muted',''); }catch(e){}
        // attempt to play; if rejected, we'll attach a one-time gesture listener to retry
        const p = v.play && v.play();
        if(p && p.catch){
          p.catch(()=>{
            const retry = ()=>{ try{ v.play().catch(()=>{}); }catch(e){}; document.removeEventListener('click', retry); document.removeEventListener('touchstart', retry); };
            document.addEventListener('click', retry, {passive:true, once:true});
            document.addEventListener('touchstart', retry, {passive:true, once:true});
          });
        }
      });
    }catch(e){ console.warn('video autoplay helper error', e); }
  }

  // Try immediately and also after first gesture; keep a safety retry on focus
  tryPlayAutoplayVideos();
  window.addEventListener('touchstart', function onceTouch(){ tryPlayAutoplayVideos(); window.removeEventListener('touchstart', onceTouch); }, {passive:true});
  window.addEventListener('click', function onceClick(){ tryPlayAutoplayVideos(); window.removeEventListener('click', onceClick); }, {passive:true});

  // Index page: ensure hero video attempts seamless play and provide a lightweight tap-to-play overlay if blocked
  function enableIndexHeroAutoplay(){
    try{
      const path = (window.location.pathname||'').split('/').pop();
      if(path && path.indexOf('index')===-1 && path !== '') return; // only index/root
      const heroSection = document.querySelector('section.relative.h-screen');
      if(!heroSection) return;
      const heroVideo = heroSection.querySelector('video.hero-video');
      if(!heroVideo) return;

      // If video is already playing or can play, nothing to do
      if(!heroVideo.paused) return;

      // Try to play; if blocked, show a small centered play CTA overlay that triggers play
      const attempt = heroVideo.play();
      if(attempt && attempt.catch){
        attempt.catch(()=>{
          if(document.querySelector('.index-play-overlay')) return;
          const overlay = el(document,'div'); overlay.className='index-play-overlay';
          overlay.style.position = 'absolute'; overlay.style.inset = '0'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center'; overlay.style.zIndex='9999';
          overlay.style.pointerEvents = 'auto';
          overlay.innerHTML = '<button aria-label="Play video" style="background:rgba(0,0,0,0.6);color:#fff;border:0;padding:12px 18px;border-radius:8px;font-weight:700">Play</button>';
          heroSection.appendChild(overlay);
          overlay.addEventListener('click', function(){ heroVideo.muted = true; heroVideo.play().catch(()=>{}); overlay.remove(); });
          document.addEventListener('touchstart', function once(){ heroVideo.play().catch(()=>{}); if(document.querySelector('.index-play-overlay')) document.querySelector('.index-play-overlay').remove(); document.removeEventListener('touchstart', once); }, {passive:true});
        });
      }
    }catch(e){ console.warn('index hero autoplay helper', e); }
  }

  // Run index hero helper on load
  try{ enableIndexHeroAutoplay(); }catch(e){}

  // Mobile-only: hide specific hero overlay label if present (keeps desktop intact)
  function hideHeroLabelOnMobile(){
    try{
      if(window.innerWidth > 900) return;
      const sections = document.querySelectorAll('section.relative.h-screen');
      sections.forEach(sec => {
        const spans = Array.from(sec.querySelectorAll('span'));
        const target = spans.find(s => s.textContent && s.textContent.trim().toLowerCase() === 'autonomous intelligence');
        if(target) target.style.display = 'none';
      });
    }catch(e){}
  }
  hideHeroLabelOnMobile();
  window.addEventListener('resize', hideHeroLabelOnMobile, {passive:true});
  
  // ---------- Mobile menu injection & wiring ----------
  function injectMobileMenu(){
    if(typeof document === 'undefined') return;
    if(document.querySelector('.mobile-overlay-menu')) return; // already injected
    // build container
    const menu = el(document,'div');
    menu.className = 'mobile-overlay-menu';
    menu.setAttribute('role','dialog');
    menu.setAttribute('aria-modal','true');
    menu.setAttribute('aria-hidden','true');
    menu.style.display = 'none';

    const closeBtn = el(document,'button'); closeBtn.className='menu-close'; closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label','Close menu');
    closeBtn.addEventListener('click', closeMobileMenu);
    menu.appendChild(closeBtn);

    const nav = el(document,'nav');
    // create links from SITE_PAGES (human-friendly text) with analytics attributes
    SITE_PAGES.forEach((p, idx)=>{
      // Do not include the homepage index.html in the injected mobile menu
      if(p === 'index.html') return;
      const name = p.replace('.html','').replace(/-/g,' ').replace(/\b(\w)/g, s=>s.toUpperCase());
      const a = el(document,'a',{href:p}); a.textContent = name; a.className='mobile-menu-link';
      a.setAttribute('data-analytics', `mobile-menu-link:${name.toLowerCase().replace(/\s+/g,'-')}`);
      a.setAttribute('tabindex','0');
      nav.appendChild(a);
    });

    // add schedule demo CTA
    const ctaWrap = el(document,'div'); ctaWrap.className='mobile-overlay-cta';
    const cta = el(document,'a',{href:'contact.html'}); cta.textContent = 'Schedule Demonstration'; cta.className='';
    cta.setAttribute('data-analytics','mobile-menu-cta:schedule-demo');
    cta.setAttribute('tabindex','0');
    ctaWrap.appendChild(cta);
    menu.appendChild(nav);
    menu.appendChild(ctaWrap);

    document.body.appendChild(menu);
  }

  // Inject a visible mobile menu toggle into `nav#main-nav` if none exists
  function injectMobileToggle(){
    try{
      const nav = document.getElementById('main-nav');
      if(!nav) return;
      // Only inject the toggle on mobile viewports to avoid affecting desktop header
      if(window.innerWidth > 900) return;
      // if an existing toggle is present, skip
      if(nav.querySelector('.mobile-menu-toggle') || nav.querySelector('.mobile-menu-toggle-modern')) return;
      const btn = el(document,'button');
      btn.className = 'mobile-menu-toggle-modern';
      btn.setAttribute('aria-label','Open menu');
      btn.setAttribute('type','button');
      btn.style.background = 'transparent';
      btn.style.border = 'none';
      btn.style.cursor = 'pointer';
      btn.style.color = 'white';
      btn.style.display = 'inline-flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.padding = '8px';
      btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
      btn.addEventListener('click', function(e){ e.preventDefault(); openMobileMenu(); this.setAttribute('aria-expanded','true'); });
      // place at end of the nav container so it appears on the right
      nav.appendChild(btn);
    }catch(e){/* noop */}
  }

  function openMobileMenu(){
    const menu = document.querySelector('.mobile-overlay-menu');
    if(!menu) return;
    menu.style.display = 'flex';
    // small delay to allow transitions if present
    setTimeout(()=>{ document.body.classList.add('mobile-menu-open'); menu.classList.add('is-open'); menu.setAttribute('aria-hidden','false'); }, 40);
    // trap focus for accessibility
    try{ const first = menu.querySelector('a,button'); if(first) first.focus(); }catch(e){}
  }

  function closeMobileMenu(){
    const menu = document.querySelector('.mobile-overlay-menu');
    if(!menu) return;
    menu.classList.remove('is-open');
    document.body.classList.remove('mobile-menu-open');
    menu.setAttribute('aria-hidden','true');
    // small delay for a graceful hide
    setTimeout(()=>{ menu.style.display = 'none'; }, 220);
  }

  function wireMobileMenuToggles(){
    // wire existing toggle buttons if present
    const toggles = Array.from(document.querySelectorAll('.mobile-menu-toggle, .mobile-menu-toggle-modern'));
    if(toggles.length===0) return;
    toggles.forEach(t=>{
      // accessibility attributes
      t.setAttribute('aria-haspopup','dialog');
      t.setAttribute('aria-controls','mobile-overlay-menu');
      t.setAttribute('aria-expanded','false');
      t.addEventListener('click', function(e){ e.preventDefault(); openMobileMenu(); t.setAttribute('aria-expanded','true'); });
      t.addEventListener('keydown', function(ev){ if(ev.key==='Enter' || ev.key===' ') { ev.preventDefault(); openMobileMenu(); t.setAttribute('aria-expanded','true'); } });
    });
    // also allow clicking anywhere on the header menu icon area
    // close when overlay background clicked
    document.addEventListener('click', function(e){
      const menu = document.querySelector('.mobile-overlay-menu');
      if(!menu || !menu.classList.contains('is-open')) return;
      if(e.target === menu) closeMobileMenu();
    });

    // keyboard: close on Escape and manage focus
    document.addEventListener('keydown', function(ev){
      const menu = document.querySelector('.mobile-overlay-menu');
      if(!menu || !menu.classList.contains('is-open')) return;
      if(ev.key === 'Escape'){
        closeMobileMenu();
        // return focus to first toggle
        const firstToggle = document.querySelector('.mobile-menu-toggle, .mobile-menu-toggle-modern'); if(firstToggle) firstToggle.focus();
      }
    });
  }

  // ---------- PRIMUS mobile full-screen hero (mobile-only) ----------
  function enablePrimusMobileHero(){
    try{
      const path = (window.location.pathname||'').split('/').pop();
      if(!path || path.indexOf('primus')===-1) return;
      if(window.innerWidth > 900) return;
      // find hero video (prefer .primus-video then .primus-vision-video)
      const heroVideo = document.querySelector('.primus-video') || document.querySelector('.primus-vision-video') || document.querySelector('video');
      if(!heroVideo) return;

      // create blocker overlay
      if(document.querySelector('.primus-hero-blocker')) return;
      const blocker = el(document,'div'); blocker.className = 'primus-hero-blocker';
      const clone = heroVideo.cloneNode(true);
      clone.className = 'primus-hero-fullvideo';
      // ensure muted & playsinline for autoplay on mobile
      clone.muted = true; clone.playsInline = true; clone.setAttribute('playsinline',''); clone.setAttribute('muted','');
      blocker.appendChild(clone);
      const skip = el(document,'button'); skip.className = 'skip-btn'; skip.textContent = 'Skip'; skip.addEventListener('click', removePrimusHero);
      blocker.appendChild(skip);
      document.body.appendChild(blocker);
      document.body.classList.add('primus-mobile-hero-active');

      // try to play; if blocked wait for user gesture; remove overlay on ended or playing
      const attempt = clone.play();
      if(attempt && attempt.catch){ attempt.catch(()=>{
        // waiting for user gesture; show simple tap to play instruction overlay via skip button text
        skip.textContent = 'Tap to Start';
        blocker.addEventListener('click', function once(){ clone.play().catch(()=>{}); blocker.removeEventListener('click', once); });
      }); }

      clone.addEventListener('playing', removePrimusHero);
      clone.addEventListener('ended', removePrimusHero);

      function removePrimusHero(){
        const b = document.querySelector('.primus-hero-blocker');
        if(b) b.remove();
        document.body.classList.remove('primus-mobile-hero-active');
      }
    }catch(e){}
  }
})();
