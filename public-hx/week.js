// The local assets use ordinary script loads so downloads work from file://.
(() => {
  'use strict';
  const iso = date => date.toISOString().slice(0, 10);
  const utc = value => new Date(value + 'T00:00:00Z');
  const offset = (date, days) => new Date(date.valueOf() + days * 86400000);
  const monday = day => offset(day, -((day.getUTCDay() + 6) % 7));
  const label = values => values.filter(v => v !== null && v !== undefined && v !== '').join(' · ');
  const loads = new Map();
  function script(path) {
    if (loads.has(path)) return loads.get(path);
    const result = new Promise((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = path;
      tag.onload = () => resolve();
      tag.onerror = () => { loads.delete(path); reject(new Error('Missing generated data file: ' + path)); };
      document.head.appendChild(tag);
    });
    loads.set(path, result);
    return result;
  }
  function wireSources(panel) {
    const body = panel.querySelector('[data-source-body]');
    const closeButton = panel.querySelector('button');
    let active = null;
    function place() {
      if (!active) return;
      const anchor = active.getBoundingClientRect(), box = panel.getBoundingClientRect();
      const gap = 6, pad = 8;
      let x = anchor.right + gap, y = anchor.top;
      if (x + box.width > innerWidth - pad) x = anchor.left - box.width - gap;
      if (x < pad) {
        x = Math.max(pad, Math.min(anchor.left, innerWidth - box.width - pad));
        y = anchor.bottom + gap;
        if (y + box.height > innerHeight - pad && anchor.top > innerHeight - anchor.bottom) {
          y = anchor.top - box.height - gap;
        }
      }
      panel.style.left = Math.round(x) + 'px';
      panel.style.top = Math.round(Math.max(pad, Math.min(y, innerHeight - box.height - pad))) + 'px';
    }
    function dismiss(restore = false) {
      const previous = active;
      if (previous) previous.setAttribute('aria-expanded','false');
      active = null; panel.hidden = true;
      if (restore && previous) {
        previous.focus({preventScroll:true});
      }
    }
    function show(trigger, selectedChip) {
      if (active === trigger) return;
      dismiss();
      active = trigger; active.setAttribute('aria-expanded','true');
      body.replaceChildren();
      const event = trigger.closest('.wc-event');
      const compact = event?.closest('.wk-wrap')?.dataset.wcMode === 'clinical';
      const memberIds = compact ? (event?.dataset.wcMembers || '').split(' ').filter(Boolean) : [];
      const title = selectedChip?.dataset.identity && !compact ? selectedChip.textContent :
        compact && event ? event.dataset.wcCompactTitle : trigger.dataset.wkTitle;
      panel.querySelector('#wk-source-heading').textContent = title || trigger.textContent.trim() || 'Clinical record';
      const triggers = [trigger,...memberIds.map(id=>document.getElementById(id)?.querySelector('.wc-clock-button')).filter(Boolean)];
      const seen = new Set();
      for (const item of triggers) {
        const section = document.createElement('div');
        section.className='wc-popup-report';
        const clock = item.querySelector('time');
        if (clock) {
          const heading = document.createElement('strong');
          heading.textContent = clock.textContent;
          section.appendChild(heading);
        }
        const tags = item.querySelector('.wc-full-tags');
        if (tags) {
          const copy=tags.cloneNode(true);copy.classList.remove('wc-full-tags');copy.hidden=false;
          for(const chip of copy.querySelectorAll('.wc-chip'))chip.hidden=false;
          section.appendChild(copy);
        }
        if (item.dataset.timingNote) {
          const note = document.createElement('p');
          note.className = 'wc-timing-note';
          note.textContent = item.dataset.timingNote;
          section.appendChild(note);
        }
        for (const id of item.dataset.wkSource.split(' ')) {
          const tpl = document.getElementById(id);
          if (tpl && !seen.has(id)) { section.appendChild(tpl.content.cloneNode(true)); seen.add(id); }
        }
        body.appendChild(section);
      }
      // Keep the chart itself unchanged; expose the event's stable link in the popup.
      const record = trigger.closest('[id^="entry-"]') ||
        (trigger.previousElementSibling?.id.startsWith('entry-') ? trigger.previousElementSibling : null);
      if (record && window.pzPermalink) {
        const link = window.pzPermalink.link(record.id);
        link.classList.add('wk-event-permalink');
        const text = document.createElement('span');text.textContent = 'Link to this record';
        link.appendChild(text);link.title = 'Link to this record';link.setAttribute('aria-label','Link to this record');
        body.prepend(link);
      }
      window.pzLocalize?.translate(panel);
      panel.hidden = false; panel.scrollTop = 0; place();
    }
    document.addEventListener('click', e => {
      const trigger = e.target.closest('.wk-source-trigger') ||
        e.target.closest('.wc-duration')?.parentElement.querySelector('.wc-clock-button');
      if (trigger) {
        if (trigger === active) { dismiss(); return; }
        show(trigger, e.target.closest('.wc-chip'));
        closeButton.focus({preventScroll:true});
      } else if (e.target === closeButton) dismiss(true);
      else if (!panel.contains(e.target)) dismiss();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && active) {
        const restore = panel.contains(document.activeElement);
        dismiss(restore);
      }
    });
    // A fixed-position source panel stays inside the visible page when its day column scrolls.
    window.addEventListener('scroll', e => {
      if (!active || panel.contains(e.target instanceof Node ? e.target : null)) return;
      place();
    }, true);
    window.addEventListener('resize', place);
  }

  const sourcePanel = document.getElementById('wk-source-panel');
  if (sourcePanel) wireSources(sourcePanel);

  const jump = document.querySelector('[data-wk-jump]');
  if (jump) jump.addEventListener('submit', e => {
    e.preventDefault();
    const day = jump.elements.day.value;
    if (!jump.reportValidity()) return;
    const target = iso(monday(utc(day))) + '.html#day-' + day;
    location.href = globalThis.pzTheme?.pageURL(target) ?? target;
  });
  // Pool overlapping labels and distribute the displacement across the group.
  // Marker dots and duration bands always remain at their recorded coordinates.
  function placeLabels(items, lower, upper) {
    let used = 0;
    const blocks = [];
    for (const item of items) {
      item.offset = used;
      blocks.push({count:1, sum:item.at-used});
      used += item.height;
      while (blocks.length >= 2) {
        const left = blocks[blocks.length-2], right = blocks[blocks.length-1];
        if (left.sum / left.count <= right.sum / right.count) break;
        left.count += right.count;
        left.sum += right.sum;
        blocks.pop();
      }
    }
    let index = 0;
    for (const block of blocks) {
      const origin = Math.max(lower, Math.min(upper-used, block.sum/block.count));
      for (let n=0; n<block.count; n++) {
        const item = items[index++];
        const y = item.offset+origin;
        const offset = Math.round(y-item.top);
        const moved = Math.abs(y-item.at)>4;
        item.el.style.setProperty('--label-offset', offset+'px');
        item.el.toggleAttribute('data-wc-moved', moved);
        if (moved) {
          item.el.style.setProperty('--leader-y', Math.min(offset,item.at-item.top)+'px');
          item.el.style.setProperty('--leader-height', Math.abs(y-item.at)+'px');
        }
      }
    }
  }

  function wireDayDisclosures(scroller) {
    const disclosureGroups = new Map();
    for (const panel of scroller.querySelectorAll('.wk-day details[data-week-disclosure]')) {
      const key = panel.dataset.weekDisclosure;
      if (!disclosureGroups.has(key)) disclosureGroups.set(key, []);
      disclosureGroups.get(key).push(panel);
    }
    for (const panels of disclosureGroups.values()) {
      // Native details elements change the same attribute for keyboard, mouse and script.
      const observer = new MutationObserver(changes => {
        const open = changes[changes.length - 1].target.open;
        for (const panel of panels) {
          if (panel.open !== open) panel.open = open;
        }
        observer.takeRecords();
      });
      for (const panel of panels) observer.observe(panel, {attributeFilter: ['open']});
    }
  }

  function wireTimetable(scroller) {
    const days = Array.from(scroller.querySelectorAll('.wk-day'));
    const tracks = days.map(day => day.querySelector('.wc-track'));
    const axis = scroller.querySelector('.wc-axis');
    const view = document.querySelector('[data-wk-view]');
    wireDayDisclosures(scroller);
    document.addEventListener('keydown', event => {
      const rel = {ArrowLeft:'prev', ArrowRight:'next'}[event.key];
      if (!rel || event.defaultPrevented || event.repeat || event.isComposing ||
          event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target.isContentEditable ||
          event.target.closest('input, select, textarea, [role="slider"], [role="tablist"], [role="menu"]') ||
          document.querySelector('dialog[open], [aria-modal="true"]:not([hidden]), #wk-source-panel:not([hidden])')) return;
      const link = document.querySelector('.wk-arrows a[rel="'+rel+'"]');
      if (link) { event.preventDefault(); link.click(); }
    });
    // Only overlapping durations share band width; nearby point labels use
    // their own placement and need not narrow an otherwise solitary span.
    function layoutBands(track, sleepRail=false) {
      const intervals=Array.from(track.querySelectorAll('.wc-event[data-end-minute]:not([hidden])'))
        .filter(item=>!sleepRail || !item.querySelector('.wc-duration.wc-sleep'))
        .sort((a,b)=>Number(a.dataset.minute)-Number(b.dataset.minute));
      let ends=[], cluster=[];
      function finish() {
        for (const [item,lane] of cluster) {
          item.style.setProperty('--band-lane',lane);
          item.style.setProperty('--band-count',ends.length);
        }
        ends=[];cluster=[];
      }
      for (const item of intervals) {
        const start=Number(item.dataset.minute);
        if (ends.length && Math.max(...ends)<=start) finish();
        let lane=ends.findIndex(end=>end<=start);
        if (lane<0) lane=ends.length;
        ends[lane]=Number(item.dataset.endMinute);
        cluster.push([item,lane]);
      }
      finish();
      // Extreme crowding uses compact labels; the existing title and detail
      // popup retain the complete text. Normal labels wrap within their lane.
      for(const item of track.querySelectorAll('.wc-event:not([hidden])')) {
        const band=item.querySelector('.wc-duration');
        const narrow=!!band && !(sleepRail&&band.classList.contains('wc-sleep')) && band.getBoundingClientRect().width<46;
        item.toggleAttribute('data-wc-narrow',narrow);
        const button=item.querySelector('.wc-clock-button');
        // Preserve a readable complete tooltip even if the lane clips the chip.
        if(narrow){const text=button.getAttribute('aria-label');if(button.title!==text)button.title=text;}
        else button.removeAttribute('title');
      }
    }
    const modeControl=document.querySelector('[data-wc-mode]');
    const filterPanel=document.querySelector('[data-wc-filters]');
    const options=document.querySelector('[data-wc-options]');
    const routine=document.querySelector('[data-wc-routine]');
    const allEvents=Array.from(scroller.querySelectorAll('.wc-event'));
    const untimed=Array.from(scroller.querySelectorAll('.wc-untimed article:has(.wc-chip)'));
    const filterable=[...allEvents,...untimed];
    const families=new Set();
    const savedKey='pz-week-view-v1';
    let saved={};try{saved=JSON.parse(localStorage.getItem(savedKey)||'{}')}catch{}
    for(const item of filterable){
      const chips=item.querySelectorAll('.wc-full-tags .wc-chip, .wc-plain-button .wc-chip');
      for(const c of chips)if(c.dataset.wcFamily)families.add(c.dataset.wcFamily);
    }
    const boxes=new Map();
    if(options)for(const name of [...families].sort()){
      const label=document.createElement('label'), input=document.createElement('input');
      input.type='checkbox';input.checked=!Array.isArray(saved.excluded)||!saved.excluded.includes(name);
      label.append(input,document.createTextNode(' '+name));options.append(label);boxes.set(name,input);
    }
    if(routine)routine.checked=saved.routine!==false;
    if(modeControl)modeControl.value=['clinical','detailed','custom'].includes(saved.mode)?saved.mode:'clinical';
    function applyMode(persist=true) {
      const mode=modeControl?.value||'clinical';scroller.dataset.wcMode=mode;
      if(filterPanel)filterPanel.hidden=mode!=='custom';
      for(const event of filterable){
        const full=event.querySelector('.wc-full-tags'),compact=event.querySelector('.wc-compact-tags');
        if(full)full.hidden=mode==='clinical';if(compact)compact.hidden=mode!=='clinical';
        const chips=event.querySelectorAll('.wc-full-tags .wc-chip, .wc-plain-button .wc-chip');
        let visible=0;
        for(const c of chips){c.hidden=mode==='custom'&&boxes.get(c.dataset.wcFamily)?.checked===false;if(!c.hidden)visible++;}
        event.hidden=(mode==='clinical'&&!!event.dataset.wcParent)||
          (mode==='custom'&&((chips.length>0&&!visible)||(routine&&!routine.checked&&event.dataset.wcRoutine==='true')));
      }
      schedule();
      if(persist)try{localStorage.setItem(savedKey,JSON.stringify({mode,excluded:[...boxes].filter(([,b])=>!b.checked).map(([name])=>name),routine:routine?.checked!==false}));}catch{}
    }
    if(modeControl){modeControl.closest('.wc-display-controls').hidden=false;modeControl.addEventListener('change',()=>applyMode());}
    if(filterPanel)filterPanel.addEventListener('change',()=>applyMode());
    let frame = 0;
    function measureLabels() {
      frame = 0;
      const headerHeight=days[0]?.querySelector('.wk-day-head')?.getBoundingClientRect().height;
      if(headerHeight)scroller.style.setProperty('--wc-head',Math.ceil(headerHeight)+'px');
      const daily = tracks.map(track => {
        if (!track.clientWidth || !track.clientHeight) return [];
        track.dataset.wcReady = '';
        track.removeAttribute('data-wc-sleep-rail');
        layoutBands(track);
        return Array.from(track.querySelectorAll(':scope > .wc-event:not([hidden])')).map(el => {
          const labelHeight=el.querySelector('.wc-clock-button').getBoundingClientRect().height;
          const edit=el.querySelector(':scope > .pz-edit-actions');
          if (edit) el.style.setProperty('--label-height',labelHeight+'px');
          return {el, minute:Number(el.dataset.minute),
            height:labelHeight+(edit ? edit.getBoundingClientRect().height+2 : 0)+3};
        }).sort((a,b) => a.minute-b.minute);
      });
      // Treat sleep windows as packing boundaries. A wake/activity chip must
      // not be pushed into a preceding sleep window merely to avoid collision.
      const regions = tracks.map((track,index) => {
        const bands = Array.from(track.querySelectorAll('.wc-event[data-end-minute]:not([hidden]):has(.wc-duration.wc-sleep)'))
          .map(el => [Number(el.dataset.minute),Number(el.dataset.endMinute)])
          .filter(([a,b])=>Number.isFinite(a)&&b>a).sort((a,b)=>a[0]-b[0]);
        const merged=[];
        for (const [a,b] of bands) {
          if (merged.length && a<=merged.at(-1)[1]) merged.at(-1)[1]=Math.max(b,merged.at(-1)[1]);
          else merged.push([a,b]);
        }
        const edges=[0,...merged.flat(),1440].filter(x=>x>=0&&x<=1440);
        const segments=[...new Set(edges)].sort((a,b)=>a-b);
        return segments.slice(0,-1).map((a,j)=>{
          const b=segments[j+1], items=daily[index].filter(item=>item.minute>=a&&(item.minute<b||b===1440&&item.minute===b));
          return {a,b,items,needed:items.reduce((sum,item)=>sum+item.height,0)};
        });
      });
      // Extremely short waking gaps can contain several multi-line labels.
      // Do not create a many-screen-high hour to fit those cases: separate
      // the sleep bands into a narrow rail, and expose the actual clock on
      // each chip in that day's crowded layout instead.
      const density = r => (r.needed+2)*60/(r.b-r.a);
      const fallback=regions.map((rs,i)=>rs.some(r=>density(r)>180));
      for (const [i,track] of tracks.entries()) {
        track.toggleAttribute('data-wc-sleep-rail',fallback[i]);
        if(fallback[i]) {
          layoutBands(track,true);
          for (const item of daily[i]) {
            const h=item.el.querySelector('.wc-clock-button').getBoundingClientRect().height;
            const edit=item.el.querySelector(':scope > .pz-edit-actions');
            if(edit)item.el.style.setProperty('--label-height',h+'px');
            item.height=h+(edit?edit.getBoundingClientRect().height+2:0)+3;
          }
        }
      }
      const needed = Math.max(0,...regions.map((rs,i)=>fallback[i] ?
        (daily[i].reduce((n,item)=>n+item.height,0)+2)/24 : Math.max(0,...rs.map(density))));
      scroller.style.setProperty('--wc-label-hour',Math.ceil(needed)+'px');
      for (const [index,items] of daily.entries()) {
        const height=tracks[index].clientHeight;
        for (const item of items) {
          item.at=item.minute*height/1440;
          item.top=Number(item.el.style.getPropertyValue('--top'))*height/1440;
        }
        if(fallback[index]) placeLabels(items,0,height);
        else for(const r of regions[index])placeLabels(r.items,r.a*height/1440,r.b*height/1440);
      }
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measureLabels);
    }
    // An element that scrolls sideways also establishes a sticky containing block.
    // Follow the page viewport while keeping the real, focusable headers in their columns.
    const phone = matchMedia('(max-width: 39.99rem)');
    function pinHeaders() {
      // iOS Safari: no pinned/translated header on narrow day-by-day pages.
      // Allow the date/sleep panel to scroll normally with its column.
      if (phone.matches) {
        scroller.style.removeProperty('--pinned-y');
        return;
      }
      const bounds=scroller.getBoundingClientRect();
      const header=days[0]?.querySelector('.wk-day-head');
      if (!header) return;
      const y=Math.max(0,Math.min(-bounds.top-scroller.clientTop,bounds.height-header.offsetHeight));
      scroller.style.setProperty('--pinned-y',Math.round(y)+'px');
    }
    window.addEventListener('scroll',pinHeaders,{passive:true});
    window.addEventListener('resize',pinHeaders);
    pinHeaders();
    function scrollToDay(day) {
      scroller.scrollLeft += day.getBoundingClientRect().left -
        scroller.getBoundingClientRect().left - axis.offsetWidth - scroller.clientLeft;
    }
    function leftDay() {
      const left = scroller.getBoundingClientRect().left+axis.offsetWidth+scroller.clientLeft;
      return days.reduce((a,b) => Math.abs(a.getBoundingClientRect().left-left) <=
        Math.abs(b.getBoundingClientRect().left-left) ? a : b);
    }
    function updateView() {
      if (!view) return;
      view.value = scroller.hasAttribute('data-single-day') || phone.matches ?
        leftDay().id.slice(4) : 'week';
    }
    function revealEntry() {
      let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
      const entry = document.getElementById(id);
      const day = entry?.closest('.wk-day');
      if (!day) return;
      // Deep links must reveal original events even if Clinical/Custom hides them.
      if(entry.closest('.wc-event[hidden], .wc-untimed article[hidden]') && modeControl){modeControl.value='detailed';applyMode(false);}
      scrollToDay(day);
      if (entry !== day) entry.scrollIntoView({block:'center',inline:'nearest'});
      updateView();
    }
    if (view) {
      view.parentElement.hidden = false;
      view.addEventListener('change', () => {
        const week = view.value === 'week';
        const day = week ? null : document.getElementById('day-'+view.value);
        scroller.toggleAttribute('data-single-day', !week);
        if (day) scrollToDay(day);
        else scroller.scrollLeft = 0;
        schedule();
        updateView();
      });
      // At phone widths the week is browsed one full day at a time.
      function adaptView() {
        view.options[0].hidden = phone.matches;
        updateView();
      }
      adaptView();
      phone.addEventListener('change', adaptView);
      scroller.addEventListener('scroll', updateView, {passive:true});
    }
    const tooltip = document.createElement('div');
    tooltip.id='wc-sleep-tooltip';
    tooltip.setAttribute('role','tooltip');
    tooltip.hidden=true;
    document.body.appendChild(tooltip);
    let preview = null;
    function hidePreview() {
      if (preview) preview.removeAttribute('aria-describedby');
      preview=null;
      tooltip.hidden=true;
    }
    function placePreview() {
      if (!preview) return;
      const rect=preview.getBoundingClientRect(), box=tooltip.getBoundingClientRect();
      tooltip.style.left=Math.max(8,Math.min(rect.left,innerWidth-box.width-8))+'px';
      const below=rect.bottom+5;
      tooltip.style.top=Math.max(8,below+box.height<innerHeight-8 ? below : rect.top-box.height-5)+'px';
    }
    function showPreview(button) {
      if (button.scrollHeight<=button.clientHeight+1) return;
      hidePreview();
      preview=button;
      tooltip.textContent=button.textContent;
      tooltip.hidden=false;
      button.setAttribute('aria-describedby',tooltip.id);
      placePreview();
    }
    for (const button of scroller.querySelectorAll('.wc-sleep-preview')) {
      button.addEventListener('pointerenter', e => { if (e.pointerType==='mouse') showPreview(button); });
      button.addEventListener('pointerleave', hidePreview);
      button.addEventListener('focus', () => showPreview(button));
      button.addEventListener('blur', hidePreview);
      button.addEventListener('click', hidePreview);
      button.addEventListener('keydown', e => { if (e.key==='Escape') hidePreview(); });
    }
    window.addEventListener('scroll', placePreview, true);
    window.addEventListener('resize', placePreview);
    applyMode(false);
    measureLabels();
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(schedule);
      for (const track of tracks) observer.observe(track);
      for(const day of days)observer.observe(day.querySelector('.wk-day-head'));
    } else window.addEventListener('resize', schedule);
    const changes = new MutationObserver(schedule);
    for (const track of tracks) changes.observe(track,{childList:true,subtree:true,characterData:true});
    document.fonts?.ready.then(schedule);
    revealEntry();
    addEventListener('hashchange', revealEntry);
  }

  const scroller = document.querySelector('.wk-wrap');
  if (scroller) wireTimetable(scroller);
  const form = document.querySelector('[data-course-window]');
  if (!form) return;
  const info = JSON.parse(document.getElementById('course-export').textContent);
  const status = form.querySelector('[role=status]');
  const button = form.querySelector('button');
  function markdownRow(r, reporting) {
    return '- ' + label([r.type, reporting ? r.reportedAt : r.clock, r.clockBasis,
      r.text, r.context, r.eventAsRecorded && 'Event date: ' + r.eventAsRecorded,
      r.through && 'Recorded through: ' + r.through, r.reportedAt && 'Report: ' + r.reportedAt,
      ...(r.concepts || []).map(pair => pair[1] + ' [' + pair[0] + ']'), '[' + r.id + ']']);
  }
  const dateBounds = expression => {
    const value = String(expression || '');
    if (/^\d{4}-\d\d-\d\d([T ].*)?$/.test(value)) return [value.slice(0,10), value.slice(0,10)];
    if (/^\d{4}-\d\d$/.test(value)) {
      const end = utc(value + '-01'); end.setUTCMonth(end.getUTCMonth() + 1);
      return [value + '-01', iso(offset(end,-1))];
    }
    if (/^\d{4}$/.test(value)) return [value + '-01-01', value + '-12-31'];
    return [null,null];
  };
  function relevant(r, from, until) {
    const [lo, hi] = dateBounds(r.eventAsRecorded);
    const [, end] = dateBounds(r.through);
    const [rl, rh] = dateBounds(r.reportedAt);
    return (lo && lo <= until && (end || hi) >= from) || (rl && rl <= until && rh >= from);
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const start = form.elements.start.value, end = form.elements.end.value;
    if (!form.reportValidity()) return;
    if (end < start) { status.textContent = 'Choose an end date on or after the start.'; return; }
    button.disabled = true; status.textContent = 'Preparing records…';
    try {
      await Promise.all([script(info.file + '.js'),script('inventory.js')]);
      const weekly = [];
      for (let cursor = monday(utc(start)); iso(cursor) <= end; cursor = offset(cursor, 7)) weekly.push(iso(cursor));
      const lines = [globalThis.pzCourseExport, '', '## Selected calendar window', '', start + ' through ' + end + ' inclusive.',
        'Dated clinical records and dated reports are grouped separately. Linked dossier evidence above can fall outside the requested window. Record rows may describe the same event.', ''];
      const bounded = new Map();
      for (const w of weekly) {
        await script('../weeks/' + w + '.js');
        const payload = globalThis.pzWeekData[w];
        for (const [day, groups] of Object.entries(payload.days)) {
          if (day < start || day > end) continue;
          lines.push('', '### ' + day, '');
          if (!groups.clinical?.length && !groups.reported?.length) lines.push('No dated records available.');
          for (const [group, ids] of Object.entries(groups)) {
            if (!ids.length) continue;
            lines.push('', group === 'reported' ? '#### Reporting date' : '#### Observation / diary date','');
            for (const id of ids) lines.push(markdownRow(payload.rows[id],group==='reported'));
          }
        }
        for (const k of payload.bounds) if (relevant(payload.rows[k],start,end)) bounded.set(k,payload.rows[k]);
      }
      if (bounded.size) {
        lines.push('', '## Date ranges / overlapping records', '');
        for (const k of [...bounded.keys()].sort()) lines.push(markdownRow(bounded.get(k),false));
      }
      const known = [], uncertain = [];
      for (const [cid,name,lo,hi,startLabel,endLabel,meaning,kind,snapshotOffBy,coverage] of globalThis.pzCourseInventory) {
        if (cid === info.id) continue;
        const text = '- ' + label([name,startLabel,endLabel,meaning,kind,cid]);
        if (coverage) {
          const overlaps = coverage.filter(([a,b]) => a <= end && b >= start);
          if (overlaps.some(([, , level]) => level === 'recorded')) known.push(text);
          else if (overlaps.length) uncertain.push(text);
          continue;
        }
        if (snapshotOffBy && start >= snapshotOffBy) continue;
        if (lo && hi && lo <= end && hi >= start) known.push(text);
        else if ((lo && !hi && lo <= end) || (!lo && hi && hi >= start)) uncertain.push(text);
      }
      lines.push('', '## Other recorded course spans overlapping this window','',...(known.length ? known : ['No bounded course identified.']),
        '', '## Possible overlaps with uncertain boundaries','',...(uncertain.length ? uncertain : ['No one-sided overlapping bounds identified.']));
      const url = URL.createObjectURL(new Blob([lines.join('\n')+'\n'], {type:'text/markdown;charset=utf-8'}));
      const link=document.createElement('a'); link.href=url;
      link.download=info.file+'_'+start+'_'+end+'.md';document.body.appendChild(link);link.click();link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      status.textContent = 'Detailed Markdown prepared.';
    } catch (error) {
      status.textContent = error.message;
    } finally { button.disabled=false; }
  });
})();
