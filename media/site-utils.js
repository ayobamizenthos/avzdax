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
    // Don't show a back arrow on the homepage
    const pathname = (window.location.pathname || '').split('/').pop();
    if(!pathname || pathname === '' || pathname === 'index.html' || pathname === 'industries.html') return;

    // If an arrow already exists, do nothing
    if(document.querySelector('.site-back-arrow')) return;

    const btn = el(document, 'button');
    btn.className = 'site-back-arrow';
    btn.setAttribute('aria-label', 'Go back');
    btn.tabIndex = 0;
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M9 18L3 12 9 6"/></svg>';

    // Minimal, no-background styling placed on the page (not in header)
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.color = 'white';
    btn.style.position = 'fixed';
    const nav = document.getElementById('main-nav');
    const topOffset = nav ? (nav.getBoundingClientRect().height + 12) : 24;
    btn.style.top = topOffset + 'px';
    // move arrow slightly inward from the edge for a cleaner look
    btn.style.left = '36px';
    btn.style.zIndex = '999';
    btn.style.padding = '4px';
    btn.style.cursor = 'pointer';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.outline = 'none';
    btn.style.opacity = '0.95';

    // hover affordance
    btn.style.transition = 'transform 160ms ease, opacity 160ms ease';
    btn.addEventListener('mouseover', ()=>{ btn.style.transform = 'translateX(-4px) scale(1.05)'; btn.style.opacity = '1'; });
    btn.addEventListener('mouseout', ()=>{ btn.style.transform = 'none'; btn.style.opacity = '0.95'; });
    btn.onclick = () => { if(history.length>1) history.back(); else window.location.href = 'index.html'; };

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
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // Expose for debugging
  window.__AVZ_siteUtils = { buildIndex };
  
  // ---------- Mobile video playback helper ----------
  function tryPlayAutoplayVideos(){
    try{
      const videos = document.querySelectorAll('video[autoplay]');
      videos.forEach(v=>{
        try{ v.muted = true; v.playsInline = true; }catch(e){}
        const p = v.play();
        if(p && p.catch){ p.catch(()=>{/* playback blocked until user interaction */}); }
      });
    }catch(e){}
  }

  // Try immediately and also after first touch (some browsers require user gesture)
  tryPlayAutoplayVideos();
  window.addEventListener('touchstart', function onceTouch(){ tryPlayAutoplayVideos(); window.removeEventListener('touchstart', onceTouch); }, {passive:true});

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
})();
