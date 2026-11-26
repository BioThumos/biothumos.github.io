(() => {
  const entries = [...document.querySelectorAll('[data-marker]')];
  const panels = [...document.querySelectorAll('.bm-panel')];
  const sections = [...document.querySelectorAll('.bm-section')];
  const search = document.getElementById('bm-search');
  const category = document.getElementById('bm-category');
  const repeated = document.getElementById('bm-repeat');
  const abnormal = document.getElementById('bm-abnormal');
  const all = new Set(entries.map(entry => entry.dataset.marker));
  const views = {markers: document.getElementById('bm-marker-view'), reports: document.getElementById('bm-report-view'), trends: document.getElementById('bm-trends-view')};
  const tabs = [...document.querySelectorAll('[data-bm-view]')];
  let beforeFiltering = null;

  function setView(view) {
    const active = views[view] ? view : 'markers';
    Object.entries(views).forEach(([name, node]) => {node.hidden = name !== active;});
    tabs.forEach(tab => {tab.setAttribute('aria-selected', String(tab.dataset.bmView === active));});
  }
  tabs.forEach(tab => tab.addEventListener('click', () => setView(tab.dataset.bmView)));

  function refresh() {
    const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const [group, section] = category.value.split('|');
    const filtering = Boolean(group || terms.length || repeated.checked || abnormal.checked);
    if (filtering && !beforeFiltering) {
      beforeFiltering = new Set([...panels, ...sections].filter(node => node.open));
    }
    const matches = new Set();
    for (const entry of entries) {
      const panel = entry.closest('.bm-panel');
      const part = entry.closest('.bm-section');
      entry.hidden = Boolean((group && panel?.dataset.group !== group) ||
        (section && part?.dataset.section !== section) ||
        (repeated.checked && entry.dataset.repeat !== '1') ||
        (abnormal.checked && entry.dataset.abnormal !== '1') ||
        !terms.every(term => (entry.dataset.search || '').includes(term)));
      if (!entry.hidden) matches.add(entry.dataset.marker);
    }
    for (const folder of [...sections, ...panels]) {
      const visible = folder.querySelectorAll('[data-marker]:not([hidden])').length;
      folder.hidden = visible === 0;
      const total = folder.querySelector(':scope > summary .bm-total');
      if (total) total.textContent = visible;
      if (filtering && visible) folder.open = true;
      else if (!filtering && beforeFiltering) folder.open = beforeFiltering.has(folder);
    }
    if (!filtering) beforeFiltering = null;
    document.getElementById('bm-count').textContent = filtering
      ? matches.size + ' of ' + all.size + ' biomarkers and assay catalogues' : '';
  }

  const trendEntries=[...document.querySelectorAll('[data-trend-marker]')];
  const trendSearch=document.getElementById('bm-trend-search');
  const trendCategory=document.getElementById('bm-trend-category');
  const trendAbnormal=document.getElementById('bm-trend-abnormal');
  const normalize=s=>String(s||'').toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
  function refreshTrends(){
    const terms=normalize(trendSearch.value).split(/\s+/).filter(Boolean);
    let n=0;
    for(const entry of trendEntries){
      const group=entry.closest('[data-trend-group]').dataset.trendGroup;
      const text=normalize(entry.dataset.trendSearch+' '+entry.querySelector('h3').textContent+' '+(window.PZ_HU?.[group]||''));
      entry.hidden=Boolean(trendCategory.value&&trendCategory.value!==group || trendAbnormal.checked&&entry.dataset.trendAbnormal!=='1' || !terms.every(term=>text.includes(term)));
      if(!entry.hidden)n++;
    }
    for(const folder of document.querySelectorAll('.bm-trend-group,.bm-trend-section,.bm-trend-pair'))folder.hidden=!folder.querySelector('[data-trend-marker]:not([hidden])');
    document.getElementById('bm-trend-count').textContent=terms.length||trendCategory.value||trendAbnormal.checked?`${n} of ${trendEntries.length} biomarkers`:'';
  }
  for(const el of [trendSearch,trendCategory,trendAbnormal])el.addEventListener(el===trendSearch?'input':'change',refreshTrends);

  function reveal() {
    let id;
    try {id = decodeURIComponent(location.hash.slice(1));} catch {return;}
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    if (target.closest('#bm-report-view')) {
      setView('reports');
      for (let node=target; node; node=node.parentElement) {
        if (node.tagName === 'DETAILS') node.open = true;
      }
    } else if (target.closest('#bm-trends-view')) {
      setView('trends');
      if(target.closest('.bm-trend-card')?.hidden){trendSearch.value='';trendCategory.value='';trendAbnormal.checked=false;refreshTrends();}
    } else if (target.closest('#bm-marker-view')) {
      setView('markers');
      const card=target.closest('.bm-card');
      if (card?.hidden) {
        search.value='';category.value='';repeated.checked=false;abnormal.checked=false;
        refresh();
      }
      for(let node=target;node;node=node.parentElement) {
        if (node.tagName==='DETAILS') node.open=true;
      }
    } else return;
    requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
  }
  search.addEventListener('input',refresh);
  category.addEventListener('change',refresh);
  repeated.addEventListener('change',refresh);
  abnormal.addEventListener('change',refresh);
  window.addEventListener('hashchange',reveal);
  // Use the same compact value-first tooltip as the wearable and score charts.
  // Data attributes retain the unlocalized source values; translate components
  // only when constructing the reading tooltip. Point anchors remain clickable.
  for(const point of document.querySelectorAll('[data-bm-tip-value]')){
    if(!window.PZChartTooltip)continue;
    const localize=s=>window.pzLocalize?.text(s)??s;
    let meta=[];try{meta=JSON.parse(point.dataset.bmTipMeta);}catch{}
    window.PZChartTooltip.attach(point,localize(point.dataset.bmTipValue),meta.map(localize).join(' · '));
    point.querySelector(':scope > title')?.remove();
  }
  refresh();
  refreshTrends();
  reveal();
})();
