"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const human = (v) => String(v || "").replaceAll("_", " ");
  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  const dirFind = $("c-find");
  if (dirFind) {
    const sections = Array.from(document.querySelectorAll(".c-group"), section => ({
      section,
      count:section.querySelector(".c-group-count"),
      entries:Array.from(section.querySelectorAll(".c-member"), member => ({
        member,entry:member.querySelector("details[data-terms]"),groups:JSON.parse(member.dataset.groups),
        episodes:JSON.parse(member.dataset.episodes || "[]"),
        reports: $("catalog-pattern") ? Array.from(member.querySelectorAll("li[data-response-patterns]")) : []
      }))
    }));
    const total = sections.reduce((n,s) => n + s.entries.length, 0);
    const groupFilter = $("c-group-filter");
    const type = $("catalog-tx-type"), priority = $("c-priority");
    const pattern = $("catalog-pattern");
    const patternHelp = $("catalog-pattern-help");
    const frequency = $("c-frequency"), hasTrigger = $("c-has-trigger"), episode = $("c-episode");
    const hideResolved = $("c-hide-resolved");
    const sortSymptoms = $("c-sort"), sortedGroup = $("c-sorted-group");
    const sortedMembers = $("c-sorted-members"), sortedCount = $("c-sorted-count");
    const flatMembers = sections.flatMap(s => s.entries);
    function arrangeSorted(count) {
      if (!sortSymptoms || !sortedGroup || !sortedMembers) return;
      const mode = sortSymptoms.value;
      if (!mode) {
        // Restore original directory order, including keyboard/screen-reader traversal.
        for (const group of sections) for (const e of group.entries) group.section.appendChild(e.member);
        sortedGroup.hidden = true;
        for (const group of sections) {
          const n = group.entries.filter(e => !e.member.hidden).length;
          group.section.hidden = n === 0;
          group.count.textContent = n;
        }
        return;
      }
      const ranked = flatMembers.slice().sort((a,b) => {
        const aRate = Number(a.entry.dataset.rate ?? -1), bRate = Number(b.entry.dataset.rate ?? -1);
        // Unrated/resolved histories have no interpretable active-period weekly rate.
        // Keep them after rate-bearing entries under either ordering.
        if (aRate < 0 && bRate >= 0) return 1;
        if (bRate < 0 && aRate >= 0) return -1;
        const d = mode === "most" ? bRate-aRate : aRate-bRate;
        return d || a.entry.dataset.terms.localeCompare(b.entry.dataset.terms);
      });
      for (const e of ranked) sortedMembers.appendChild(e.member);
      for (const group of sections) group.section.hidden = true;
      sortedGroup.hidden = count === 0;
      if (sortedCount) sortedCount.textContent = count;
    }
    function filter() {
      let count = 0;
      const q = dirFind.value.toLocaleLowerCase().trim();
      if (patternHelp && patternHelp.dataset.pattern !== pattern.value) {
        patternHelp.dataset.pattern = pattern.value;
        const selected = pattern.selectedOptions[0];
        patternHelp.replaceChildren();
        if (pattern.value) {
          patternHelp.append(node("strong", selected.textContent), node("span", selected.dataset.explanation));
        }
      }
      for (const s of sections) {
        let visible = 0;
        for (const {member,entry,groups,episodes,reports} of s.entries) {
          const state = entry.dataset.status;
          const selectedPattern = pattern?.value || "";
          let hasPattern = selectedPattern === "" || (selectedPattern === "__all__" && member.dataset.poor === "true");
          for (const report of reports) {
            report.hidden = Boolean(selectedPattern && selectedPattern !== "__all__" &&
              !report.dataset.responsePatterns.split(" ").includes(selectedPattern));
            if (!report.hidden) hasPattern = true;
          }
          const excluded = !entry.dataset.terms.toLocaleLowerCase().includes(q) ||
              (groupFilter.value && !groups.includes(groupFilter.value)) ||
              (episode?.value && !episodes.includes(episode.value)) ||
              (type?.value && member.dataset.txType !== type.value) ||
              !hasPattern ||
              (frequency?.value && frequency.value !== entry.dataset.frequency) ||
              (hasTrigger?.checked && entry.dataset.hasTrigger !== "1") ||
              (hideResolved?.checked && ["resolved","mostly_resolved"].includes(entry.dataset.resolution)) ||
              (priority?.value && (entry.dataset.priority || "1") !== priority.value);
          member.hidden = Boolean(excluded);
          if (!member.hidden) visible++;
        }
        s.section.hidden = visible === 0;
        s.count.textContent = visible;
        count += visible;
      }
      arrangeSorted(count);
      $("c-summary").textContent = count + " of " + total + " entries";
    }
    function openAnchor() {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      let target = $(id);
      if(target?.classList.contains('identity-forward')){
        const dest=target.getAttribute('href');
        if (!dest.startsWith('#')) { location.replace(target.href); return; }
        history.replaceState(history.state,'',dest);
        target=$(decodeURIComponent(dest.slice(1)));
      }
      if (target?.matches("a.food-forward")) {
        location.replace(target.href);
        return;
      }
      const scrollTarget = target;
      if (target?.classList.contains("symptom-quote")) target = target.closest(".c-entry");
      if (!target || !target.classList.contains("c-entry")) return;
      if (target.closest(".c-member").hidden) {
        dirFind.value = ""; groupFilter.value = "";
        if (type) type.value = "";
        if (pattern) pattern.value = "";
        if (priority) priority.value = "";
        if (hideResolved) hideResolved.checked = false;
        if (frequency) frequency.value = "";
        if (episode) episode.value = "";
        if (hasTrigger) hasTrigger.checked = false;
        filter();
      }
      target.open = true;
      // A shared patient account may sit inside an "Additional accounts" disclosure.
      for (let parent = scrollTarget.parentElement; parent && parent !== target; parent = parent.parentElement) {
        if (parent.tagName === "DETAILS") parent.open = true;
      }
      scrollTarget.scrollIntoView({block:"start"});
    }
    dirFind.addEventListener("input", filter);
    groupFilter.addEventListener("change", filter);
    hideResolved?.addEventListener("change", filter);
    for (const control of [type, priority, pattern, frequency, hasTrigger, episode, sortSymptoms]) control?.addEventListener("change", filter);
    addEventListener("hashchange", openAnchor);
    filter(); openAnchor();
    return;
  }
  if (!$("s-form")) {
    function revealDietEntry() {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      let target = $(id);
      if(target?.classList.contains('identity-forward')){
        const dest=target.getAttribute('href');
        if (!dest.startsWith('#')) { location.replace(target.href); return; }
        history.replaceState(history.state,'',dest);
        target=$(decodeURIComponent(dest.slice(1)));
      }
      if (target?.matches("#foods details.c-entry")) target.open = true;
    }
    revealDietEntry();
    addEventListener("hashchange", revealDietEntry);
    return;
  }
  const data = JSON.parse($("c-data").textContent);
  const foodIds = new Set(data.food_ids);
  const onlyFood = new Set(data.only_food);
  function exposureLink(id, role) {
    const dietary = onlyFood.has(id) || (role && !["therapeutic_use","mixed"].includes(role));
    return [dietary ? "Diet history" : "Intervention",
            dietary ? "diet.html#"+encodeURIComponent(id) : (data.treatmentUrls?.[id] || "interventions.html#"+encodeURIComponent(id))];
  }
  function inScope(id, role) {
    const scope = $("s-exposures").value;
    if (scope !== "all" && role && role !== "mixed") {
      return scope === "food" ? role !== "therapeutic_use" : role === "therapeutic_use";
    }
    return scope === "all" || (scope === "food" ? foodIds.has(id) : !onlyFood.has(id));
  }
  function exposures() {
    const pick = $("s-intervention");
    const category = $("s-category").value;
    const allowed = id => inScope(id) && (!category || data.categories[id] === category);
    for (const opt of pick.options) {
      opt.hidden = opt.disabled = Boolean(opt.value && !allowed(opt.value));
    }
    if (pick.value && !allowed(pick.value)) pick.value = "";
    courses();
  }
  const byEvent = new Map(data.events.map(e => [e.id,e]));
  const pageSize = 30;
  let results = [], pageIndex = 0, filterLabel = "", usedMode = "";
  const name = (id) => data.names[id] || id || "";
  const dateLabel = (a) => [a.day, a.end && a.end !== a.day ? a.end : null].filter(Boolean).join(" to ") || "Date unknown";
  function courseLabel(id) {
    if (!id) return "";
    const c = data.courses[id];
    return c ? name(c[0]) + " · " + (c[5] || c[1] || "Start unknown") + " → " + (c[6] || c[2] || "End unknown") : id;
  }
  const courseUrl = (id) => data.courses[id][4];
  function weekUrl(day) {
    if (!/^\d{4}-\d\d-\d\d$/.test(day || "")) return null;
    const d = new Date(day + "T12:00:00Z");
    if (Number.isNaN(d.valueOf())) return null;
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay()+6)%7));
    return "weeks/" + d.toISOString().slice(0,10) + ".html#day-" + day;
  }
  function mode() {
    const timed = $("s-mode").value === "time";
    $("s-claim-fields").hidden = timed;
    $("s-time-fields").hidden = !timed;
    $("s-lo").disabled = !timed; $("s-hi").disabled = !timed;
  }
  function courses() {
    const selected = $("s-intervention").value, pick = $("s-course"), old = pick.value;
    pick.replaceChildren(new Option("Any course",""));
    const list = Object.entries(data.courses).filter(([,c]) => inScope(c[0]) && (!$('s-category').value || data.categories[c[0]]===$('s-category').value) && (!selected || c[0] === selected));
    list.sort((a,b) => courseLabel(a[0]).localeCompare(courseLabel(b[0])) || a[0].localeCompare(b[0]));
    for (const [id] of list) pick.add(new Option(courseLabel(id) + " · " + human(data.courses[id][3]),id));
    pick.value = list.some(([id]) => id === old) ? old : "";
  }
  const matchTag = (tags,tag) => tags.some(t => t === tag || t.startsWith(tag + "/"));
  const hasTarget = (cid,t) => !t || matchTag((data.intents[cid] || []).map(i => i.tag),t);
  function textMatch(term,values) {
    return !term || values.some(v => v && String(v).toLocaleLowerCase().includes(term));
  }
  function explicit(f) {
    const hits = [];
    for (const c of data.claims) {
      if (!inScope(c.iid,c.foodRole) || (f.category && data.categories[c.iid] !== f.category)) continue;
      if ((f.drug && c.iid !== f.drug) || (f.course && c.cid !== f.course) || !hasTarget(c.cid,f.target)) continue;
      if ((f.kind && c.kind !== f.kind) || (f.scope && c.scope !== f.scope)) continue;
      const links = c.links.filter(l => {
        const e = byEvent.get(l.id);
        return e && (!f.sym || e.symptoms.includes(f.sym)) && (!f.dir || l.direction === f.dir);
      });
      if ((f.sym || f.dir) && !links.length) continue;
      if (f.topic && !matchTag(c.tags,f.topic) && !links.some(l => matchTag(byEvent.get(l.id).tags,f.topic))) continue;
      if (!textMatch(f.text,[c.words,c.who,c.basis,...c.extra.map(pair => pair[1]),...links.map(l => byEvent.get(l.id).words)])) continue;
      hits.push({c,links});
    }
    return hits;
  }
  function temporal(f) {
    const hits = [];
    let skippedDates=0, skippedClocks=0;
    const events = data.events.filter(e => (!f.sym || e.symptoms.includes(f.sym)) &&
      (!f.cls || e.kind === f.cls) && (!f.topic || matchTag(e.tags,f.topic)) &&
      textMatch(f.text,[e.words,e.basis]));
    for (const a of data.actions) {
      if (!inScope(a.iid,a.foodRole) || (f.category && data.categories[a.iid] !== f.category)) continue;
      if ((f.drug && a.iid !== f.drug) || (f.course && a.cid !== f.course) || !hasTarget(a.cid,f.target)) continue;
      if (f.act ? a.kind !== f.act : (!["reported_use","reported_change"].includes(a.className) || a.kind==="switch_reported")) continue;
      if (a.quality==="upper_bound_only" || a.quality==="unplaced" || !a.bounds) { skippedDates++; continue; }
      if (f.unit === "hours" && a.utc === null) { skippedClocks++; continue; }
      for (const e of events) {
        let lo,hi;
        if (f.unit === "hours") {
          if (e.utc === null) continue;
          lo = hi = (e.utc-a.utc)/3600;
        } else {
          if (!e.bounds) continue;
          lo = e.bounds[0]-a.bounds[1]; hi=e.bounds[1]-a.bounds[0];
        }
        if (lo < f.upper && hi >= f.lower) {
          const certain=lo>=f.lower && hi<f.upper && (f.unit==="hours" || (a.quality==="bounded" && e.quality==="bounded"));
          hits.push({a,e,lo,hi,certain,unit:f.unit});
        }
      }
    }
    return {hits,skippedDates,skippedClocks};
  }
  function readFilters() {
    const v=(k) => $("s-"+k).value;
    return {drug:v("intervention"),category:v("category"),course:v("course"),target:v("target"),sym:v("symptom"),topic:v("topic"),
      dir:v("direction"),kind:v("relation"),scope:v("scope"),cls:v("count"),act:v("action"),unit:v("unit"),
      lower:Number(v("lo")),upper:Number(v("hi")),text:v("text").trim().toLocaleLowerCase()};
  }
  function line(label,value) { return value ? label + " · " + value : ""; }
  function describe(row) {
    let title, body = [], evidence = [], links = [], course;
    if (row.c) {
      const c=row.c;
      course = c.cid;
      title = name(c.iid) + " · " + human(c.kind);
      body = [c.words,line("Scope",human(c.scope)),line("Attribution / qualification",c.who),line("Link basis",c.basis),
        ...c.extra.filter(([label,value])=>value!==c.who || label==="Native causality qualification").map(([label,value])=>line(label,value))];
      evidence.push(line("Record",c.source),line("Claim ID",c.id),line("Action ID",c.anchor),line("Source topics",c.tags.join(", ")));
      if (c.extra.some(([label,value])=>label==="Native causality qualification" && value===c.who)) {
        body=body.filter(text=>text!==line("Attribution / qualification",c.who));
      }
      for (const l of row.links) {
        const e=byEvent.get(l.id);
        body.push(line("Linked outcome",name(e.symptom) + " · " + human(l.direction) + " · " + (e.day || "Date unknown")),
          line("Outcome evidence",e.words),line("Outcome link",l.basis));
        evidence.push(line("Outcome record",e.id + " · " + e.source));
        links.push(["Symptom definition","symptoms.html#"+encodeURIComponent(e.symptom)]);
        if (e.calendarEntry) links.push(["Diary entry · "+e.day,e.calendarEntry]);
      else if (e.kind!=="date_unresolved" && weekUrl(e.day)) links.push(["Week of "+e.day,weekUrl(e.day)]);
      }
      links.push(exposureLink(c.iid,c.foodRole));
    } else {
      const {a,e,lo,hi,certain,unit}=row;
      course = a.cid;
      title = name(a.iid) + " · " + name(e.symptom);
      const lag = lo === hi ? String(lo) : lo + " to " + hi;
      body = [line("Action",human(a.kind)+" · "+dateLabel(a)+" · "+human(a.className)),
        line("Dose",a.dose),line("Action note",a.words),
        line("Course assignment",!a.cid ? "Unassigned in this snapshot" : ""),
        line("Symptom",name(e.symptom)+" · "+(e.clock || e.day || "Date unknown")+" · "+human(e.kind)),
        line("Timing",(certain ? "Within" : "Possibly within")+" the selected window on recorded "+(unit==="days"?"calendar dates":"clocks")+" · "+lag+" "+unit),
        line("Observation",e.words),line("Qualification",e.basis),line("Reported",e.reported)];
      evidence.push(line("Action record",a.source),...(a.sourceAccounts || []),line("Date basis",a.precision),
        line("Symptom date basis",e.dayBasis),line("Evidence",e.native+" · "+e.source),line("Occurrence ID",e.id),line("Source topics",e.tags.join(", ")));
      links.push(exposureLink(a.iid,a.foodRole),["Symptom definition","symptoms.html#"+encodeURIComponent(e.symptom)]);
      if (e.calendarEntry) links.push(["Diary entry · "+e.day,e.calendarEntry]);
      else if (e.kind!=="date_unresolved" && weekUrl(e.day)) links.push(["Week of "+e.day,weekUrl(e.day)]);
    }
    if (course) {
      body.push(line("Course",courseLabel(course)),line("Exposure qualification",data.course_caveats[course]));
      evidence.push(line("Course ID",course));
      for (const intent of data.intents[course]||[]) {
        body.push(line("Intended target",intent.tag+" · "+intent.words));
        evidence.push(line("Target record",intent.source));
      }
      links.unshift(["Course details",courseUrl(course)]);
    }
    return {title,body:body.filter(Boolean),evidence:evidence.filter(Boolean),links};
  }
  function render() {
    const root=$("s-results"); root.replaceChildren();
    const total=Math.ceil(results.length/pageSize);
    $("s-pager").hidden=total<2; $("s-prev").disabled=pageIndex===0; $("s-next").disabled=pageIndex>=total-1;
    $("s-page").textContent="Page "+(pageIndex+1)+" of "+total;
    $("s-export").hidden=!results.length;
    for (const item of results.slice(pageIndex*pageSize,(pageIndex+1)*pageSize)) {
      const {title,body,evidence,links}=describe(item), card=node("article",undefined,"c-card");
      card.append(node("h3",title));
      for (const b of body) card.append(node("p",b,"c-note"));
      const source=node("details",undefined,"record-source");
      source.dataset.recordSource="";
      const sourceBody=node("div",undefined,"record-source-body");
      for (const text of evidence) sourceBody.append(node("div",text));
      source.append(node("summary","Source"),sourceBody);
      card.append(source);
      const nav=node("div",undefined,"c-links");
      const seen=new Set();
      for (const [title,url] of links) {
        if (seen.has(url)) continue; seen.add(url);
        const link=node("a",title); link.href=url; nav.append(link);
      }
      card.append(nav); root.append(card);
    }
  }
  function run() {
    const f=readFilters(); usedMode=$("s-mode").value;
    pageIndex=0; results=[];
    if (usedMode === "time") {
      if (!Number.isFinite(f.lower)||!Number.isFinite(f.upper)||f.upper<=f.lower||
            (f.unit==="days"&&(!Number.isInteger(f.lower)||!Number.isInteger(f.upper)))) {
        $("s-summary").textContent="Enter an increasing lag range. Calendar-day bounds must be whole numbers."; render(); return;
      }
      if (!f.drug&&!f.category&&!f.course&&!f.target&&!f.sym&&!f.topic&&!f.text) {
        $("s-summary").textContent="Choose a course, intervention, target, symptom, source topic or evidence text to search."; render(); return;
      }
      const found=temporal(f); results=found.hits;
      const distinct=new Set(results.map(r=>r.e.id)).size;
      $("s-summary").textContent=results.length+" action–observation pairs · "+distinct+" distinct symptom occurrences. "+
        (f.unit==="hours" ? "Elapsed-time results require an offset-qualified clock for each event. Calendar-day search includes additional records." :
          "The time search includes symptoms without a reported treatment link.")+
          (found.skippedDates ? " Excluded "+found.skippedDates+" otherwise eligible actions with unbounded or missing dates." : "")+
          (found.skippedClocks ? " Excluded "+found.skippedClocks+" otherwise eligible actions without a verified clock." : "");
    } else {
      results=explicit(f); $("s-summary").textContent=results.length+" recorded claim links.";
    }
    const controls=[...$("s-form").querySelectorAll("label")].filter(l=>!l.closest("[hidden]"));
    filterLabel=controls.map(l=>{
      const el=l.querySelector("input,select");
      const v=el.tagName==="SELECT"?el.options[el.selectedIndex]?.text:el.value;
      return el.value ? l.firstChild.textContent.trim()+" = "+v : "";
    }).filter(Boolean).join("; ");
    render();
  }
  function invalidate() {
    results=[]; pageIndex=0; render();
    $("s-summary").textContent="Choose filters, then select Find records.";
  }
  $("s-form").addEventListener("submit", e=>{e.preventDefault();run();});
  $("s-form").addEventListener("input", invalidate);
  $("s-mode").addEventListener("change",mode); $("s-intervention").addEventListener("change",courses);
  $("s-exposures").addEventListener("change",exposures);
  $("s-category").addEventListener("change",exposures);
  $("s-form").addEventListener("reset",()=>setTimeout(()=>{mode();exposures();invalidate();},0));
  $("s-prev").addEventListener("click",()=>{pageIndex--;render();});
  $("s-next").addEventListener("click",()=>{pageIndex++;render();});
  $("s-export").addEventListener("click",()=>{
    const blobParts=["# Patient history · "+(usedMode==="time"?"Time proximity":"Recorded claims")+"\n\nRevision · "+data.revision+
      "\n\n"+filterLabel+"\n\n"+$("s-summary").textContent+"\n\n"];
    for (const item of results) {
      const {title,body,evidence}=describe(item);
      blobParts.push("## "+title+"\n\n"+body.join("\n\n")+"\n\nSource\n\n"+evidence.join("\n\n")+"\n\n");
    }
    const url=URL.createObjectURL(new Blob(blobParts,{type:"text/markdown;charset=utf-8"}));
    const a=node("a"); a.href=url; a.download="patient-history-"+usedMode+"-selection.md"; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const params=new URLSearchParams(window.location.search);
  const requested=params.get("intervention");
  const legacySymptomPage = data.retiredSymptomPages?.[params.get("symptom")];
  if (legacySymptomPage) { location.replace(legacySymptomPage); return; }
  if (data.splitInterventions?.includes(requested)) {
    location.replace("interventions.html#"+encodeURIComponent(requested));
    return;
  }
  if (onlyFood.has(data.redirects?.[requested] || requested)) $("s-exposures").value="food";
  for (const key of ["intervention","symptom"]) if (params.has(key)) $("s-"+key).value=data.redirects?.[params.get(key)] || params.get(key);
  mode(); exposures(); run();
})();
