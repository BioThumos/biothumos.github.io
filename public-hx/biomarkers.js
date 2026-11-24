(() => {
  const entries = [...document.querySelectorAll('[data-marker]')];
  const panels = [...document.querySelectorAll('.bm-panel')];
  const sections = [...document.querySelectorAll('.bm-section')];
  const search = document.getElementById('bm-search');
  const category = document.getElementById('bm-category');
  const repeated = document.getElementById('bm-repeat');
  const abnormal = document.getElementById('bm-abnormal');
  const all = new Set(entries.map(entry => entry.dataset.marker));
  const views = {markers: document.getElementById('bm-marker-view'), reports: document.getElementById('bm-report-view')};
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
  refresh();
  reveal();
})();
