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
