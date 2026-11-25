const WEEK_BOUNDS = ["2021-05-31", "2026-11-23"];
'use strict';
(() => {
  const button = document.getElementById('sections-toggle');
  const menu = document.getElementById('site-sections');
  if (!button || !menu) return;
  const small = matchMedia('(max-width: 800px)');
  function show(open) {
    button.setAttribute('aria-expanded', String(open));
    menu.hidden = small.matches && !open;
  }
  function resize() {
    button.hidden = !small.matches;
    show(!small.matches);
  }
  button.addEventListener('click', () => show(button.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && small.matches) { show(false); button.focus(); }
  });
  small.addEventListener('change', resize);
  resize();
})();
document.querySelectorAll('[data-week-jump]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const field=form.querySelector('input[type=date]'), s=field.value;
    if (!field.reportValidity()) return;
    const d=new Date(s+'T12:00:00Z');
    d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
    const mon=d.toISOString().slice(0,10);
    if(mon<WEEK_BOUNDS[0] || mon>WEEK_BOUNDS[1]){
      form.querySelector('output').textContent='Choose a date within the published history.';return;
    }
    location.href=window.pzTheme.pageURL('weeks/'+mon+'.html#day-'+s);
  });
});
const filter=document.getElementById('type-filter');
if (filter) {
  const type = document.getElementById('chronology-tx-type');
  const poor = document.getElementById('chronology-tx-poor');
  const courseResults = document.getElementById('course-response-note');
  const tokens = value => (value || '').split(' ').filter(Boolean);
  function updateChronology() {
    let total = 0;
    const poorCourses = Boolean(poor?.checked && filter.value === 'Intervention');
    if (courseResults) courseResults.hidden = !poorCourses;
    const matches = list => type?.value ? list.includes(type.value) : list.length > 0;
    document.querySelectorAll('.year-group').forEach(group => {
      let shown = 0;
      group.querySelectorAll('.entry').forEach(entry => {
        if (poorCourses) {
          const types = entry.dataset.type === 'Intervention'
            ? entry.dataset.coursePoorTypes : entry.dataset.unassignedPoorTypes;
          entry.hidden = !matches(tokens(types));
        } else {
          const classes = tokens(entry.dataset.txTypes);
          entry.hidden = Boolean((filter.value && entry.dataset.type !== filter.value) ||
            (type?.value && !classes.includes(type.value)) ||
            (poor?.checked && !matches(tokens(entry.dataset.poorTypes))));
        }
        if (!entry.hidden) shown++;
      });
      total += shown;
      group.hidden = !shown;
      const link = document.querySelector('.year-nav a[href="#' + group.id + '"]');
      if (link) { link.parentElement.hidden = !shown; link.querySelector('small').textContent = shown; }
    });
    document.getElementById('shown-count').textContent = total.toLocaleString() + ' entries';
  }
  for (const control of [filter, type, poor]) control?.addEventListener('change', updateChronology);
  updateChronology();
  function revealBookmark() {
    let key;
    try { key = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = key && document.getElementById(key);
    if (!target) return;
    const entry = target.closest('.entry');
    if (entry?.hidden) {
      filter.value = '';
      if (type) type.value = '';
      if (poor) poor.checked = false;
      updateChronology();
    }
    for (let node=target.parentElement; node; node=node.parentElement) {
      if (node.tagName === 'DETAILS') node.open = true;
    }
    if (entry) target.scrollIntoView({block:'center'});
  }
  window.addEventListener('hashchange', revealBookmark);
  if (location.hash) revealBookmark();
}

// Source panels float beside their trigger. Native details also work without JavaScript.
(() => {
  let current = null, pinned = false, timer = 0, restoring = false;
  const host = el => el instanceof Element ? el.closest('details[data-record-source]') : null;
  function body() { return current?.querySelector(':scope > :not(summary)'); }
  function close(restore = false) {
    clearTimeout(timer);
    if (!current) return;
    const old = current, panel = body();
    if (panel?.matches('[popover]')) { if (panel.matches(':popover-open')) panel.hidePopover(); panel.removeAttribute('popover'); }
    current = null; pinned = false; old.open = false;
    if (restore) { restoring = true; old.firstElementChild.focus({preventScroll:true}); restoring = false; }
  }
  function position() {
    if (!current) return;
    const anchor = current.firstElementChild.getBoundingClientRect(), panel = body();
    const box = panel.getBoundingClientRect(), pad = 8, gap = 5;
    let x = anchor.right + gap, y = anchor.top;
    if (x + box.width > innerWidth - pad) x = anchor.left - gap - box.width;
    if (x < pad) {
      x = Math.min(anchor.left, innerWidth - box.width - pad);
      y = anchor.bottom + gap;
      if (y + box.height > innerHeight - pad) y = anchor.top - box.height - gap;
    }
    panel.style.left = Math.max(pad,x)+'px';
    panel.style.top = Math.max(pad,Math.min(y,innerHeight-box.height-pad))+'px';
  }
  function show(el) {
    clearTimeout(timer);
    if (el === current) return;
    close(); current = el; el.open = true;
    const panel = body();
    if (typeof panel.showPopover === 'function') { panel.setAttribute('popover','manual'); panel.showPopover(); }
    position();
  }
  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch' || pinned) return;
    const el = host(e.target);
    if (el) show(el);
  });
  document.addEventListener('pointerout', e => {
    if (!pinned && current && host(e.target) === current && host(e.relatedTarget) !== current)
      timer = setTimeout(close,220);
  });
  document.addEventListener('focusin', e => { if (!restoring && host(e.target)) show(host(e.target)); else if (!pinned) close(); });
  document.addEventListener('focusout', e => { if (!pinned && current && !current.contains(e.relatedTarget)) close(); });
  document.addEventListener('click', e => {
    const el = host(e.target);
    if (!el) { close(); return; }
    if (e.target.closest('summary') !== el.firstElementChild) return;
    e.preventDefault();
    if (current === el && pinned) close(); else { show(el); pinned = true; }
  });
  document.addEventListener('keydown', e => { if (e.key==='Escape' && current) close(true); });
  addEventListener('resize', position);
  document.addEventListener('scroll',position,true);
})();

// Keep the reported outcome visible alongside a collapsed treatment and first when opened.
for (const panel of document.querySelectorAll('.record-directory .c-member > .response-panel')) {
  const entry = panel.previousElementSibling;
  const heading = entry.querySelector('.record-heading');
  const positionPanel = () => (entry.open ? heading : entry).after(panel);
  entry.addEventListener('toggle', positionPanel);
  positionPanel();
}


// Add a clear button to each search field and keep existing filter logic intact.
(() => {
  const makeClearable = input => {
    if (!(input instanceof HTMLInputElement) || input.type !== 'search' || input.parentElement?.classList.contains('search-field-wrap')) return;
    const wrap = document.createElement('span');
    wrap.className = 'search-field-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-clear';
    button.setAttribute('aria-label', 'Clear search');
    button.textContent = '×';
    const sync = () => { button.hidden = !input.value; };
    button.addEventListener('click', () => {
      input.value = '';
      input.dispatchEvent(new Event('input', {bubbles:true}));
      input.dispatchEvent(new Event('change', {bubbles:true}));
      input.focus();
      sync();
    });
    input.addEventListener('input', sync);
    input.addEventListener('change', sync);
    sync();
    wrap.appendChild(button);
  };
  document.querySelectorAll('input[type=search]').forEach(makeClearable);
})();

// Stable record/section permalinks. Keep labels, record identities and URLs independent
// of locale, sort order and display filters. Never add controls to raw evidence.
(() => {
  const selector='details.bm-report-card[id],details.bm-card[id],details.bm-panel[id],details.bm-section[id],details.c-entry[id],details.ba-group[id],article.entry[id],section[id]:not(.wk-day),article.bm-rna-report[id],article.qual-card[id],.track[id]';
  const excluded='[data-record-source],.record-source,.record-source-body,.wk-evidence,template,#wk-source-panel';
  const hash=id=>'#'+encodeURIComponent(id);
  const target=()=>{try{return document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch{return null;}};
  function link(id) {
    const a=document.createElement('a');a.className='section-permalink';a.href=hash(id);
    a.setAttribute('aria-label','Link to this section');a.title='Link to this section';
    a.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M10 13a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-2 2M14 11a4 4 0 0 0-6 0l-4 4a4 4 0 0 0 6 6l2-2"/></svg>';
    window.pzLocalize?.translate(a);
    return a;
  }
  function syncLocaleLinks(){
    for(const a of document.querySelectorAll('.pz-locale-flag')){
      const u=new URL(a.href);u.hash=location.hash;a.href=u.href;
    }
  }
  function mark(id){
    if(!id || target()?.id===id)return;
    // Updating a disclosure's URL must not cause a second toggle or scroll jump.
    try{history.pushState(history.state,'',hash(id));syncLocaleLinks();}
    catch{location.hash=hash(id);}
  }
  function decorate(container,heading){
    if(!heading || container.closest(excluded)||heading.querySelector(':scope > .section-permalink, :scope > .record-heading-text > .section-permalink'))return;
    const host=heading.querySelector(':scope > .record-heading-text')||heading;
    // Keep the link adjacent to the name and ahead of secondary metadata.
    if(container.matches('.bm-report-card') && heading.matches('summary')){
      heading.querySelector('strong')?.after(link(container.id));return;
    }
    host.appendChild(link(container.id));
  }
  function install(root=document){
    const nodes=[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
    for(const node of nodes){
      const heading=node.matches('details')?node.querySelector(':scope > summary'):
        node.querySelector(':scope > h2,:scope > h3,:scope > header > h2,:scope > header > h3,:scope > .side > strong');
      decorate(node,heading);
    }
    for(const node of root.querySelectorAll('main h1[id], main h2[id], main h3[id]')){
      if(node.closest(excluded)||node.closest('.wk-day')||node.parentElement.id && node.parentElement.matches(selector)||node.closest('.c-sorted-group'))continue;
      if(!node.querySelector('.section-permalink'))decorate(node,node);
    }
  }
  function reveal(){
    const t=target();if(!t)return;
    syncLocaleLinks();
    // Other page-specific handlers clear filters, select the appropriate tab,
    // and navigate the weekly horizontal timetable. Do not override them.
    if(t.closest('.wk-day,#bm-marker-view,#bm-report-view,.record-directory,.year-group'))return;
    for(let n=t;n;n=n.parentElement){if(n.tagName==='DETAILS'&&!n.closest(excluded))n.open=true;}
    if(t.matches(selector)||t.matches('h1,h2,h3'))requestAnimationFrame(()=>t.scrollIntoView({block:'start',inline:'nearest'}));
  }
  window.pzPermalink={link,install,mark};
  document.addEventListener('DOMContentLoaded',()=>{
    install();reveal();
    // Native summary clicks (including keyboard activation) set a shareable URL
    // only when opening a clinical record, not on programmatic expansion.
    document.addEventListener('click',e=>{
      const a=e.target.closest('a.section-permalink');
      if(a){
        if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
        if(target()?.id===decodeURIComponent(a.hash.slice(1))){
          // Same-hash clicks should still reveal a subsequently collapsed card.
          e.preventDefault();window.dispatchEvent(new Event('hashchange'));
        }
        return;
      }
      if(e.target.closest('a,button,input,select,label'))return;
      const summary=e.target.closest('summary');const detail=summary?.parentElement;
      if(detail?.matches(selector)&&!detail.open&&!detail.closest(excluded)){
        // Let the default disclosure activation happen first.
        requestAnimationFrame(()=>{if(detail.open)mark(detail.id);});
      }
    });
    addEventListener('hashchange',reveal);addEventListener('popstate',syncLocaleLinks);
  });
})();
