'use strict';
(() => {
  const packet=globalThis.PZ_WEARABLE;
  if(!packet?.bounds?.length)return;
  const $=id=>document.getElementById(id);
  const metrics=['sleep','heart','hrv','temperature'];
  const scales=['day','week','month','year'];
  const fields={sleep:['sleep_core_h','sleep_deep_h','sleep_rem_h','sleep_other_h'],heart:['heart_rate','resting_heart_rate'],hrv:['hrv_sdnn'],temperature:['sleeping_wrist_temperature']};
  const names={sleep:'Sleep duration (hours)',heart:'Heart rate (beats/min)',hrv:'HRV (SDNN, ms)',temperature:'Sleeping wrist skin (°C)'};
  const legends={sleep:[['Core / light','sleep_core_h','wear-stage-core'],['Deep','sleep_deep_h','wear-stage-deep'],['REM','sleep_rem_h','wear-stage-rem'],['Other asleep','sleep_other_h','wear-stage-other']],
    heart:[['Sampled heart rate','heart_rate','wear-heart'],['Resting heart rate','resting_heart_rate','wear-rest']],
    hrv:[['SDNN','hrv_sdnn','wear-single']],temperature:[['Wrist skin temperature','sleeping_wrist_temperature','wear-single']]};
  const periodMaps=Object.fromEntries(scales.map(s=>[s,new Map(packet.periods[s].map(r=>[r.date,r]))]));
  const [minDate,maxDate]=packet.bounds;
  const NS='http://www.w3.org/2000/svg';
  const iso=d=>d.toISOString().slice(0,10);
  const utc=s=>new Date(s+'T00:00:00Z');
  const clamp=(v,low,hi)=>v<low?low:v>hi?hi:v;
  const fmt=(v,d=1)=>v==null?'Not measured':new Intl.NumberFormat('en',{maximumFractionDigits:d}).format(v);
  const hours=v=>{const n=Math.round((v||0)*60),h=Math.floor(n/60),m=n%60;return (h?h+' h':'')+(m?(h?' ':'')+m+' min':'')||'0 min';};
  const labelDate=s=>utc(s).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'});
  function shift(s,n,scale){
    const d=utc(s);
    if(scale==='month'){d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);}
    else if(scale==='year'){d.setUTCMonth(0,1);d.setUTCFullYear(d.getUTCFullYear()+n);}
    else d.setUTCDate(d.getUTCDate()+n*(scale==='week'?7:1));
    return iso(d);
  }
  function floor(s,scale){
    if(scale==='month')return s.slice(0,7)+'-01';
    if(scale==='year')return s.slice(0,4)+'-01-01';
    if(scale==='week')return shift(s,-((utc(s).getUTCDay()+6)%7),'day');
    return s;
  }
  const periodLabel=(s,scale)=>scale==='month'?s.slice(0,7):scale==='year'?s.slice(0,4):scale==='week'?labelDate(s)+' – '+labelDate(shift(s,6,'day')):labelDate(s);
  const doc=(tag,content)=>{const e=document.createElement(tag);if(content!==undefined)e.textContent=content;return e;};
  const svg=(parent,tag,attr={},content)=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attr))e.setAttribute(k,String(v));if(content!==undefined)e.textContent=content;parent.append(e);return e;};
  const urlParams=new URLSearchParams(location.search);
  let scale=scales.includes(urlParams.get('scale'))?urlParams.get('scale'):'month';
  const dateParam=urlParams.get('date');
  let selected=/^\d{4}-\d{2}-\d{2}$/.test(dateParam||'')?clamp(dateParam,minDate,maxDate):maxDate;
  const dateWasRequested=!!dateParam;
  let syncing=false, aligned=[];
  let selecting=false;
  function description(metric,row){
    if(!row || !fields[metric].some(f=>row[f]!=null))return 'No Watch measurements for this period';
    if(metric==='sleep')return `Total ${fmt(row.watch_sleep_hours,2)} h · Core ${fmt(row.sleep_core_h,2)} · Deep ${fmt(row.sleep_deep_h,2)} · REM ${fmt(row.sleep_rem_h,2)} · Other ${fmt(row.sleep_other_h,2)} · ${row.sleep_n} measured night(s)`;

    if(metric==='heart')return `Sampled ${fmt(row.heart_rate)} bpm (${row.heart_rate_n} day(s)) · Resting ${fmt(row.resting_heart_rate)} bpm (${row.resting_heart_rate_n} day(s))`;
    if(metric==='hrv')return `${fmt(row.hrv_sdnn,1)} ms SDNN · ${row.hrv_sdnn_n} measured day(s)`;
    return `${fmt(row.sleeping_wrist_temperature,2)} °C · ${row.sleeping_wrist_temperature_n} measured night(s)`;
  }
  function updateDetails(metric,key){
    const row=periodMaps[scale].get(key),target=$('wear-detail-'+metric);
    if(!target)return;
    target.replaceChildren(doc('strong',periodLabel(key,scale)),doc('span',description(metric,row)));
    if(metric==='sleep' && scale==='day' && packet.sleep_timing_corrections?.[key]){
      target.append(doc('span','Diary-corroborated Watch timing correction: '+packet.sleep_timing_corrections[key]));
    }
    if(scale==='day'){
      const d=utc(key);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
      const a=doc('a','Diary day');a.href='weeks/'+iso(d)+'.html#day-'+key;target.append(a);
    }
    const plot=$('wear-chart-plot-'+metric);
    plot.querySelectorAll('[data-point]').forEach(e=>e.classList.toggle('wear-selected',e.dataset.point===key));
  }
  function choosePeriod(day,metric){
    selected=clamp(day,minDate,maxDate);
    $('wear-date').value=selected;
    updateDetails(metric,floor(day,scale));
    if(scale==='day' && packet.heart_days?.includes(day) && !selecting){
      // Explicitly selecting a daily reading also opens that day's intraday trace.
      selecting=true;$('wear-intraday-date').value=day;loadIntraday(day);selecting=false;
    }
  }
  function datesForScale(){
    const all=[],last=floor(maxDate,scale);
    for(let d=floor(minDate,scale);d<=last;d=shift(d,1,scale))all.push(d);
    return all;
  }
  function buildChart(metric,dates){
    const outer=$('wear-scroll-'+metric),plot=$('wear-chart-plot-'+metric);
    plot.replaceChildren();
    const step=scale==='day'?38:scale==='week'?46:scale==='month'?48:74;
    const left=58,pad=22,height=292,top=52,bottom=height-33;
    const viewport=Math.max(340,outer.clientWidth||650);
    const width=Math.max(viewport,left+dates.length*step+pad);
    const x=i=>left+step*(i+.5);
    const root=svg(plot,'svg',{width,height,viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':names[metric]+'; horizontal scrolling across '+scale+'ly periods'});
    const rows=dates.map(d=>periodMaps[scale].get(d));
    const values=rows.flatMap(r=>!r?[]:(metric==='sleep'?[r.watch_sleep_hours].filter(v=>v!=null):fields[metric].map(f=>r[f]).filter(v=>v!=null))); 
    if(!values.length){svg(root,'text',{x:width/2,y:height/2,'text-anchor':'middle'},'No measurements in this range');return {step,left};}
    let low=metric==='sleep'?0:Math.min(...values),high=Math.max(...values);
    if(high===low){low-=Math.max(.1,Math.abs(low)*.025);high+=Math.max(.1,Math.abs(high)*.025);}
    if(metric==='sleep')high+=Math.max(.45,high*.13);
    else {const spread=high-low,pad=Math.max(spread*.12,metric==='temperature'?.12:metric==='hrv'?2:3);low-=pad;high+=pad;}
    const y=v=>bottom-(v-low)/(high-low)*(bottom-top);
    for(let t=0;t<5;t++){
      const v=low+(high-low)*t/4, yy=y(v);
      svg(root,'line',{class:'wear-grid',x1:left,x2:width-10,y1:yy,y2:yy});
      svg(root,'text',{x:left-7,y:yy+4,'text-anchor':'end'},fmt(v,metric==='temperature'?2:1));
    }
    const ticks=Math.max(1,Math.round(76/step));
    dates.forEach((day,i)=>{
      if(i%ticks)return;
      const text=scale==='year'?day.slice(0,4):scale==='month'?day.slice(0,7):utc(day).toLocaleDateString('en-GB',{timeZone:'UTC',month:'short',day:'numeric'});
      svg(root,'text',{x:x(i),y:height-7,'text-anchor':'middle'},text);
    });
    if(metric==='sleep'){
      rows.forEach((r,i)=>{
        if(r?.watch_sleep_hours==null)return;
        const g=svg(root,'g',{'data-point':dates[i],tabindex:0,role:'button','aria-label':periodLabel(dates[i],scale)+': '+description(metric,r)});
        window.PZChartTooltip?.attach(g,
          ['Total '+hours(r.watch_sleep_hours),'Deep '+hours(r.sleep_deep_h),'REM '+hours(r.sleep_rem_h),'Core '+hours(r.sleep_core_h),...(r.sleep_other_h?['Other '+hours(r.sleep_other_h)]:[])],
          periodLabel(dates[i],scale)+' · '+r.sleep_n+' measured night(s)');
        let base=0;
        for(const [_,field,cls] of legends.sleep){
          const v=r[field]||0;if(v<=0)continue;
          svg(g,'rect',{x:x(i)-Math.min(23,step*.5)/2,y:y(base+v),width:Math.min(23,step*.5),height:Math.max(0,y(base)-y(base+v)),class:cls});base+=v;
        }
        svg(g,'text',{x:x(i),y:Math.max(17,y(r.watch_sleep_hours)-9),'text-anchor':'middle',class:'wear-value-label'},hours(r.watch_sleep_hours).replaceAll(' ','') );
        svg(g,'rect',{class:'wear-click-area',x:x(i)-step*.44,y:top,width:step*.88,height:bottom-top});
        g.addEventListener('click',()=>choosePeriod(dates[i],metric));
        g.addEventListener('focus',()=>updateDetails(metric,dates[i]));
        g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choosePeriod(dates[i],metric);}});
      });
    }else{
      for(const [_,field,cls] of legends[metric]){
        let last=null;
        rows.forEach((r,i)=>{
          const value=r?.[field];if(value==null){last=null;return;}
          const xx=x(i), yy=y(value);
          if(last)svg(root,'line',{x1:last[0],y1:last[1],x2:xx,y2:yy,class:'wear-line '+cls});
          last=[xx,yy];
        });
      }
      rows.forEach((r,i)=>{
        if(!r || !fields[metric].some(f=>r[f]!=null))return;
        const g=svg(root,'g',{'data-point':dates[i],tabindex:0,role:'button','aria-label':periodLabel(dates[i],scale)+': '+description(metric,r)});
        const values=metric==='heart'?[...legends.heart.filter(([_,f])=>r[f]!=null).map(([n,f])=>n+': '+fmt(r[f],0)+' bpm')]:[metric==='hrv'?fmt(r.hrv_sdnn,1)+' ms SDNN':fmt(r.sleeping_wrist_temperature,2)+' °C'];
        window.PZChartTooltip?.attach(g,values,periodLabel(dates[i],scale)+' · '+description(metric,r));
        for(const [_,field,cls] of legends[metric])if(r[field]!=null)svg(g,'circle',{cx:x(i),cy:y(r[field]),r:3.1,class:cls});
        const active=fields[metric].map(f=>r[f]).filter(v=>v!=null);
        let short=metric==='heart'?((r.heart_rate!=null?fmt(r.heart_rate,0):'—')+' / '+(r.resting_heart_rate!=null?fmt(r.resting_heart_rate,0):'—')):metric==='hrv'?fmt(r.hrv_sdnn,1):fmt(r.sleeping_wrist_temperature,2);
        if(metric!=='heart' || step>=56 || i%2===0) svg(g,'text',{x:x(i),y:Math.max(17,y(Math.max(...active))-10),'text-anchor':'middle',class:'wear-value-label'},short);
        svg(g,'rect',{class:'wear-click-area',x:x(i)-step*.45,y:top,width:step*.9,height:bottom-top});
        g.addEventListener('click',()=>choosePeriod(dates[i],metric));
        g.addEventListener('focus',()=>updateDetails(metric,dates[i]));
        g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choosePeriod(dates[i],metric);}});
      });
    }
    return {step,left};
  }
  function scrollToDate(day){
    const list=datesForScale(),key=floor(day,scale),i=Math.max(0,list.indexOf(key));
    for(const view of aligned){
      const step=scale==='day'?38:scale==='week'?46:scale==='month'?48:74;
      const target=(i+.5)*step+58-view.clientWidth*.6;
      view.scrollLeft=Math.max(0,target);
    }
  }
  function renderAll(preserveScroll=false){
    const dates=datesForScale();
    const prev=aligned[0]?.scrollLeft||0;
    document.querySelectorAll('[data-wear-scale]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wearScale===scale)));
    aligned=[];
    for(const metric of metrics){
      const view=$('wear-scroll-'+metric);buildChart(metric,dates);aligned.push(view);
      const legend=$('wear-chart-legend-'+metric);legend.replaceChildren();
      for(const [name,field,cls] of legends[metric]){
        const span=doc('span'),swatch=doc('i');swatch.className=cls;span.append(swatch,doc('span',name));legend.append(span);
      }
      if(metric==='sleep')legend.append(doc('span','Total sleep is the sum of stages'));
      updateDetails(metric,floor(selected,scale));
    }
    $('wear-range').textContent=periodLabel(dates[0],scale)+' to '+periodLabel(dates.at(-1),scale);
    if(preserveScroll){for(const view of aligned)view.scrollLeft=prev;}
    else scrollToDate(selected);
  }
  // Native horizontally scrollable containers support a touchpad's horizontal
  // gestures and a phone's one-finger swipe. Scrolling one aligns all four.
  for(const metric of metrics){
    const node=$('wear-scroll-'+metric);
    node.addEventListener('scroll',()=>{
      if(syncing)return;syncing=true;
      for(const other of aligned)if(other!==node)other.scrollLeft=node.scrollLeft;
      syncing=false;
    },{passive:true});
    node.addEventListener('wheel',e=>{
      // Shift+vertical wheel also pans, but ordinary vertical scrolling stays
      // with the page so the charts don't trap a reader on a trackpad.
      if(e.shiftKey && !e.ctrlKey && !e.metaKey){e.preventDefault();node.scrollLeft+=e.deltaY;}
    },{passive:false});
  }
  document.querySelectorAll('[data-wear-scale]').forEach(b=>b.addEventListener('click',()=>{scale=b.dataset.wearScale;renderAll();}));
  $('wear-date').value=selected;$('wear-date').min=minDate;$('wear-date').max=maxDate;
  $('wear-jump').addEventListener('submit',e=>{e.preventDefault();if(!e.target.reportValidity())return;selected=clamp($('wear-date').value,minDate,maxDate);scrollToDate(selected);for(const m of metrics)updateDetails(m,floor(selected,scale));});
  $('wear-prev').onclick=()=>{for(const node of aligned)node.scrollLeft-=Math.max(200,node.clientWidth*.85);};
  $('wear-next').onclick=()=>{for(const node of aligned)node.scrollLeft+=Math.max(200,node.clientWidth*.85);};
  let lastW=0;
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(entries=>{
    const w=Math.round(entries[0].contentRect.width);
    if(w!==lastW){lastW=w;renderAll(true);}
  }).observe($('wear-scroll-sleep'));

  // The intraday chart is loaded only for the selected month. This avoids
  // loading 239k measurements when a clinician visits the overview.
  const heartDays=packet.heart_days||[];
  const cache=globalThis.PZ_WEARABLE_HEART_MONTHS??={};
  const dateInput=$('wear-intraday-date');
  dateInput.min=heartDays[0]||minDate;dateInput.max=heartDays.at(-1)||maxDate;
  function nearestDay(day){
    if(!heartDays.length)return '';
    if(heartDays.includes(day))return day;
    const after=heartDays.find(d=>d>=day);
    return after||heartDays.at(-1);
  }
  const timetable=$('wear-intraday-timetable');
  function updateTimetableLink(day){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return;
    const monday=floor(day,'week');
    timetable.href='weeks/'+monday+'.html#day-'+day;
    timetable.setAttribute('aria-label','Open '+day+' in the weekly timetable');
  }
  dateInput.addEventListener('input',()=>updateTimetableLink(dateInput.value));
  let intradayToken=0;
  function loadIntraday(day){
    day=nearestDay(day);if(!day)return;
    dateInput.value=day;updateTimetableLink(day);
    const month=day.slice(0,7),token=++intradayToken;
    if(cache[month]){drawIntraday(day,cache[month][day]||[]);return;}
    const script=doc('script');script.src='wearable-heart-months/'+month+'.js';
    script.onload=()=>{if(token===intradayToken)drawIntraday(day,cache[month]?.[day]||[]);script.remove();};
    script.onerror=()=>{$('wear-intraday-detail').textContent='Could not load the measured readings for '+day;script.remove();};
    document.body.append(script);
  }
  function drawIntraday(day,points){
    const root=$('wear-intraday-plot');root.replaceChildren();
    const width=Math.max(850,root.parentElement?.clientWidth||700),height=285,left=52,right=width-14,top=23,bottom=height-34;
    const graphic=svg(root,'svg',{width,height,viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':'Sampled Apple Watch heart rate by local clock hour on '+day});
    const status=$('wear-intraday-detail');
    if(!points.length){status.textContent='No Apple Watch heart-rate samples on '+day;return;}
    const vals=points.map(r=>r[1]);
    let low=Math.max(0,Math.floor((Math.min(...vals)-8)/10)*10),high=Math.ceil((Math.max(...vals)+8)/10)*10;
    if(high<=low)high=low+20;
    const x=m=>left+m/1440*(right-left),y=v=>bottom-(v-low)/(high-low)*(bottom-top);
    for(let i=0;i<5;i++){
      const v=low+(high-low)*i/4,yy=y(v);
      svg(graphic,'line',{class:'wear-grid',x1:left,x2:right,y1:yy,y2:yy});
      svg(graphic,'text',{x:left-9,y:yy+4,'text-anchor':'end'},fmt(v,0));
    }
    for(let h=0;h<=24;h+=3){
      const xx=x(h*60);svg(graphic,'text',{x:xx,y:height-8,'text-anchor':'middle'},String(h).padStart(2,'0')+':00');
    }
    // These are explicit Watch notifications from the source XML, not
    // retrospectively thresholded HR samples. Their threshold is unknown.
    const alerts=(packet.heart_alerts||[]).filter(a=>a.date===day);
    for(const alert of alerts){
      const m=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
      const aa=m(alert.start),bb=m(alert.end);
      const band=svg(graphic,'rect',{x:x(aa),y:top,width:Math.max(2,x(bb)-x(aa)),height:bottom-top,class:'wear-alert-interval'});
      window.PZChartTooltip?.attach(band,['Watch high-heart-rate alert'],day+' '+alert.start+'–'+alert.end+' · BPM threshold not in export');
    }
    for(const [minute,rate] of points){
      const dot=svg(graphic,'circle',{cx:x(minute),cy:y(rate),r:2.45,class:'wear-heart wear-sample-point',tabindex:0});
      const hh=Math.floor(minute/60),mm=Math.floor(minute%60),ss=Math.round((minute%1)*60);
      const when=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');
      window.PZChartTooltip?.attach(dot,[fmt(rate,1)+' bpm'],day+' '+when+' · individual Watch sample');
      dot.addEventListener('click',()=>{status.textContent=day+' '+when+' · '+fmt(rate,1)+' bpm (single Watch sample)';});
    }
    status.textContent=day+' · '+points.length+' Watch heart-rate samples'+
      (alerts.length?' · '+alerts.length+' recorded high-HR alert(s) (orange bands, threshold unknown)':'')+
      '; points are individual readings, not continuous monitoring.';
  }
  $('wear-intraday-form').onsubmit=e=>{e.preventDefault();if(e.target.reportValidity())loadIntraday(dateInput.value);};
  $('wear-intraday-prev').onclick=()=>{const i=heartDays.indexOf(dateInput.value);loadIntraday(heartDays[Math.max(0,i-1)]||heartDays[0]);};
  $('wear-intraday-next').onclick=()=>{const i=heartDays.indexOf(dateInput.value);loadIntraday(heartDays[Math.min(heartDays.length-1,i+1)]||heartDays.at(-1));};
  renderAll();
  loadIntraday(nearestDay(dateWasRequested?selected:(heartDays.at(-1)||maxDate)));
})();
