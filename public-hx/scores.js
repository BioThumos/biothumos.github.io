'use strict';
(() => {
  const data=globalThis.PZ_SCORES;
  const $=id=>document.getElementById(id);
  if(!data?.day?.length)return;
  const scales=['day','week','month','year'];
  const maps=Object.fromEntries(scales.map(s=>[s,new Map(data[s].map(r=>[r[0],r]))]));
  const fmt=new Intl.NumberFormat('en',{maximumFractionDigits:2});
  const utc=s=>new Date(s+'T00:00:00Z');
  const iso=d=>d.toISOString().slice(0,10);
  const clamp=(v,low,high)=>v<low?low:v>high?high:v;
  const formatDate=s=>utc(s).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'});
  const [first,last]=[data.day[0][0],data.day.at(-1)[0]];
  function shift(s,n,scale){const d=utc(s);
    if(scale==='month'){d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);}
    else if(scale==='year'){d.setUTCMonth(0,1);d.setUTCFullYear(d.getUTCFullYear()+n);}
    else d.setUTCDate(d.getUTCDate()+n*(scale==='week'?7:1));
    return iso(d);
  }
  function floor(s,scale){if(scale==='month')return s.slice(0,7)+'-01';if(scale==='year')return s.slice(0,4)+'-01-01';
    if(scale==='week')return shift(s,-((utc(s).getUTCDay()+6)%7),'day');return s;}
  const label=(s,scale)=>scale==='month'?s.slice(0,7):scale==='year'?s.slice(0,4):scale==='week'?formatDate(s)+' – '+formatDate(shift(s,6,'day')):formatDate(s);
  const params=new URLSearchParams(location.search);
  const requested=params.get('date')||'';
  const dateOK=/^\d{4}-\d{2}-\d{2}$/.test(requested) && Number.isFinite(utc(requested).valueOf()) && iso(utc(requested))===requested;
  let selected=dateOK?clamp(requested,first,last):data.day.at(-1)[0];
  let scale=scales.includes(params.get('scale'))?params.get('scale'):(dateOK?'day':'month');
  const scroll=$('score-scroll'),plot=$('score-plot');
  const ns='http://www.w3.org/2000/svg';
  const node=(tag,content)=>{const n=document.createElement(tag);if(content!==undefined)n.textContent=content;return n;};
  function svg(parent,tag,attrs={},content){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(content!==undefined)n.textContent=content;parent.append(n);return n;}
  function description(row){if(!row)return 'No rating recorded';
    if(row[1]===null)return scale==='day'?'Conflicting scores '+row[6].map(x=>fmt.format(x)).join(' / '):'No unambiguous score';
    return fmt.format(row[1])+' / 10'+(scale==='day'?'':' average');}
  function weekHref(s){return 'weeks/'+floor(s,'week')+'.html#day-'+s;}
  let days=[],step=70,left=44,selectedShape=null,raf=0;
  function show(day){selected=clamp(day,first,last);$('score-date').value=selected;
    const key=floor(selected,scale),row=maps[scale].get(key),detail=$('score-detail');
    detail.replaceChildren(node('strong',label(key,scale)),node('span',description(row)));
    if(scale==='day'){const a=node('a','Open this day in timetable');a.href=weekHref(selected);detail.append(a);}
    else {detail.append(node('span',(row?.[2]||0)+' scored days · '+(row?.[3]||0)+' conflicting'));
      if(row){const b=node('button','View '+({year:'months',month:'weeks',week:'days'}[scale]));b.onclick=()=>{selected=clamp(row[4],first,last);scale=scales[scales.indexOf(scale)-1];render();};detail.append(b);}}
    if(selectedShape)selectedShape.classList.remove('score-active');
    selectedShape=plot.querySelector('[data-point="'+key+'"]');
    if(selectedShape)selectedShape.classList.add('score-active');
  }
  function populateVisible(){const a=Math.max(0,Math.floor((scroll.scrollLeft-left)/step)-1),b=Math.min(days.length,Math.ceil((scroll.scrollLeft+scroll.clientWidth-left)/step)+1);
    const visible=days.slice(a,b);
    $('score-range').textContent=visible.length?label(visible[0],scale)+(visible.length>1?' — '+label(visible.at(-1),scale):''):'';
    $('score-prev').disabled=scroll.scrollLeft<=1;
    $('score-next').disabled=scroll.scrollLeft+scroll.clientWidth>=scroll.scrollWidth-1;
    const centerIndex=clamp(Math.floor((scroll.scrollLeft+scroll.clientWidth*.5-left)/step),0,days.length-1);
    const centerDate=days[centerIndex];
    if(centerDate && floor(selected,scale)!==centerDate)show(centerDate);
    const table=node('table'),head=table.createTHead().insertRow();
    for(const title of ['Period','Rating','Scored days','Conflicts']){const th=node('th',title);th.scope='col';head.append(th);}
    const body=table.createTBody();
    for(const day of visible){const row=maps[scale].get(day),tr=body.insertRow();const firstCell=tr.insertCell();
      if(scale==='day'){const a=node('a',day);a.href=weekHref(day);firstCell.append(a);}else firstCell.textContent=label(day,scale);
      for(const value of [description(row),row?.[2]||0,row?.[3]||0])tr.insertCell().textContent=value;}
    $('score-values').querySelector('div').replaceChildren(table);
  }
  function scrollToDay(day){const i=Math.max(0,days.indexOf(floor(day,scale)));
    scroll.scrollLeft=Math.max(0,left+(i+.5)*step-scroll.clientWidth*.6);
    populateVisible();}
  function render(){days=[];const end=floor(last,scale);for(let d=floor(first,scale);d<=end;d=shift(d,1,scale))days.push(d);
    document.querySelectorAll('[data-scale]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scale===scale)));
    step=scale==='day'?38:scale==='week'?44:scale==='month'?48:scale==='year'?72:48;
    const viewport=Math.max(310,scroll.clientWidth||650); // Fixed compact slots; do not distribute sparse points across the screen.
    const width=Math.max(viewport,left+days.length*step+22),height=300,top=48,bottom=height-31;
    plot.replaceChildren();const root=svg(plot,'svg',{width,height,viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':'Overall patient score by '+scale+'; scroll horizontally to browse dates'});
    const x=i=>left+step*(i+.5),y=v=>bottom-(bottom-top)*(v-1)/9;
    for(const v of [1,3,5,7,10]){svg(root,'line',{x1:left,x2:width-10,y1:y(v),y2:y(v),class:'score-grid'});svg(root,'text',{x:left-9,y:y(v)+4,'text-anchor':'end'},v);}
    const tickEvery=Math.max(1,Math.round(90/step));let previous=null;
    days.forEach((day,i)=>{if(i%tickEvery===0)svg(root,'text',{x:x(i),y:height-8,'text-anchor':'middle'},scale==='year'?day.slice(0,4):scale==='month'?day.slice(0,7):formatDate(day).replace(/ \d{4}$/,''));
      const row=maps[scale].get(day);if(!row||row[1]===null){previous=null;return;}
      if(previous)svg(root,'line',{x1:previous[0],x2:x(i),y1:previous[1],y2:y(row[1]),class:'score-line'});
      previous=[x(i),y(row[1])];});
    days.forEach((day,i)=>{const row=maps[scale].get(day);if(!row||(row[1]===null && !(row[6]||[]).length))return;
      const desc=label(day,scale)+' · '+description(row),g=svg(root,'g',{'data-point':day,role:'button',tabindex:0,'aria-label':desc});
      window.PZChartTooltip?.attach(g,[row[1]===null?'Conflicting: '+row[6].map(v=>fmt.format(v)).join(' / '):fmt.format(row[1])+' / 10'],label(day,scale)+' · '+(scale==='day'?'Daily score':'Average of '+row[2]+' scored days')+(row[3]?' · '+row[3]+' conflicts':''));
      if(row[1]===null){svg(g,'line',{x1:x(i),x2:x(i),y1:y(Math.min(...row[6])),y2:y(Math.max(...row[6])),class:'score-conflict'});
        for(const value of row[6])svg(g,'circle',{cx:x(i),cy:y(value),r:3,class:'score-unresolved'});
        svg(g,'text',{x:x(i),y:y(Math.max(...row[6]))-9,'text-anchor':'middle',class:'score-value-label'},row[6].map(v=>fmt.format(v)).join('/'));
      }else{svg(g,'circle',{cx:x(i),cy:y(row[1]),r:4,class:'score-mark'});
        svg(g,'text',{x:x(i),y:y(row[1])-10,'text-anchor':'middle',class:'score-value-label'},fmt.format(row[1]));}
      svg(g,'rect',{x:x(i)-Math.min(step*.43,13),y:top,width:Math.min(step*.86,26),height:bottom-top,fill:'transparent'});
      g.addEventListener('click',()=>show(day));g.addEventListener('focus',()=>show(day));
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show(day);}});
    });
    show(selected);scrollToDay(selected);
  }
  scroll.addEventListener('scroll',()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;populateVisible();});},{passive:true});
  scroll.addEventListener('wheel',e=>{if(e.shiftKey&&!e.ctrlKey&&!e.metaKey){e.preventDefault();scroll.scrollLeft+=e.deltaY;}},{passive:false});
  document.querySelectorAll('[data-scale]').forEach(b=>b.onclick=()=>{scale=b.dataset.scale;render();});
  $('score-prev').onclick=()=>{scroll.scrollLeft-=Math.max(180,scroll.clientWidth*.83);};
  $('score-next').onclick=()=>{scroll.scrollLeft+=Math.max(180,scroll.clientWidth*.83);};
  $('score-date').min=first;$('score-date').max=last;
  $('score-jump').onsubmit=e=>{e.preventDefault();if(e.target.reportValidity()){selected=clamp($('score-date').value,first,last);show(selected);scrollToDay(selected);}};
  let lastWidth=0;
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(entries=>{const w=Math.round(entries[0].contentRect.width);if(lastWidth!==w){lastWidth=w;render();}}).observe(scroll);
  render();
})();
