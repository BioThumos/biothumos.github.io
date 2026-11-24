'use strict';
(()=>{
  const packet=globalThis.PZ_BOWEL_CHART;if(!packet?.bounds?.length)return;
  const $=id=>document.getElementById(id),scales=['day','week','month','year'];
  const index=Object.fromEntries(scales.map(s=>[s,new Map(packet.periods[s].map(r=>[r.date,r]))]));
  const [first,last]=packet.bounds;
  const utc=s=>new Date(s+'T00:00:00Z'),iso=d=>d.toISOString().slice(0,10);
  const clamp=(s,a,b)=>s<a?a:s>b?b:s;
  function shift(s,n,scale){const d=utc(s);if(scale==='month'){d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);}
    else if(scale==='year'){d.setUTCMonth(0,1);d.setUTCFullYear(d.getUTCFullYear()+n);}
    else d.setUTCDate(d.getUTCDate()+n*(scale==='week'?7:1));return iso(d);}
  function floor(s,scale){return scale==='month'?s.slice(0,7)+'-01':scale==='year'?s.slice(0,4)+'-01-01':scale==='week'?shift(s,-((utc(s).getUTCDay()+6)%7),'day'):s;}
  const name=s=>utc(s).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'});
  const period=s=>scale==='day'?name(s):scale==='week'?name(s)+' – '+name(shift(s,6,'day')):scale==='month'?s.slice(0,7):s.slice(0,4);
  const fmt=v=>v==null?'Not quantified':new Intl.NumberFormat('en',{maximumFractionDigits:2}).format(v);
  const url=new URLSearchParams(location.search);
  let scale=scales.includes(url.get('scale'))?url.get('scale'):'month';
  let selected=/^\d{4}-\d{2}-\d{2}$/.test(url.get('date')||'')?clamp(url.get('date'),first,last):last;
  const scroll=$('bowel-scroll'),plot=$('bowel-plot'),ns='http://www.w3.org/2000/svg';
  let dates=[],step=70,left=54,selectedNode=null,queued=0;
  function svg(parent,tag,attrs={},content){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(content!==undefined)n.textContent=content;parent.append(n);return n;}
  function description(r){if(!r)return 'No diary entry';
    const label=r.status==='insufficient_coverage'?'Insufficient recorded days for a representative average':
      r.status==='not_quantified'?'No quantifiable bowel count':
      fmt(r.mean)+(scale==='day'?' recorded movement(s)':' movements per countable diary day');
    return label+
      ` · ${r.total} total movement(s) · ${r.countable_days}/${r.diary_days} countable diary days`+
      (r.implied_zero_days?` · ${r.implied_zero_days} zero(s) by omission`:'')+
      (r.untracked_days?` · ${r.untracked_days} diary day(s) without bowel tracking`:'')+
      (r.uncertain_days?` · ${r.uncertain_days} uncertain day(s)`:'');}
  function choose(day){selected=clamp(day,first,last);$('bowel-date').value=selected;
    const key=floor(selected,scale),row=index[scale].get(key),detail=$('bowel-detail');
    detail.replaceChildren();const strong=document.createElement('strong');strong.textContent=period(key)+' · ';
    detail.append(strong,document.createTextNode(description(row)));
    if(scale==='day'){const a=document.createElement('a');a.textContent=' Open this day in timetable';a.href='weeks/'+floor(selected,'week')+'.html#day-'+selected;detail.append(a);}
    if(selectedNode)selectedNode.classList.remove('bowel-selected');
    selectedNode=plot.querySelector('[data-point="'+key+'"]');if(selectedNode)selectedNode.classList.add('bowel-selected');}
  function showVisible(){const a=Math.max(0,Math.floor((scroll.scrollLeft-left)/step)-1),b=Math.min(dates.length,Math.ceil((scroll.scrollLeft+scroll.clientWidth-left)/step)+1),visible=dates.slice(a,b);
    $('bowel-range').textContent=visible.length?period(visible[0])+(visible.length>1?' – '+period(visible.at(-1)):''):'';
    $('bowel-prev').disabled=scroll.scrollLeft<=1;
    $('bowel-next').disabled=scroll.scrollLeft+scroll.clientWidth>=scroll.scrollWidth-1;
    const centerIndex=clamp(Math.floor((scroll.scrollLeft+scroll.clientWidth*.5-left)/step),0,dates.length-1);
    const centerDate=dates[centerIndex];
    if(centerDate && floor(selected,scale)!==centerDate)choose(centerDate);
  }
  function center(day){const i=Math.max(0,dates.indexOf(floor(day,scale)));
    scroll.scrollLeft=Math.max(0,left+(i+.5)*step-scroll.clientWidth*.6);showVisible();}
  function render(){dates=[];for(let d=floor(first,scale);d<=floor(last,scale);d=shift(d,1,scale))dates.push(d);
    document.querySelectorAll('[data-bowel-scale]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bowelScale===scale)));
    const viewport=Math.max(320,scroll.clientWidth||600);
    step=({day:38,week:44,month:44,year:68})[scale]; // Compact, evenly spaced; no stretching sparse periods.
    const width=Math.max(viewport,left+dates.length*step+25),height=289,top=47,bottom=height-34;
    plot.replaceChildren();const root=svg(plot,'svg',{width,height,viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':'Bowel movements on diary days over '+scale+'s'});
    const rows=dates.map(d=>index[scale].get(d)),values=rows.map(r=>r?.mean).filter(v=>v!=null),maxValue=Math.max(2,...values)*1.08;
    const x=i=>left+step*(i+.5),y=v=>bottom-v/maxValue*(bottom-top);
    for(let k=0;k<=4;k++){const value=maxValue*k/4,yy=y(value);
      svg(root,'line',{x1:left,x2:width-8,y1:yy,y2:yy,class:'bowel-grid'});
      svg(root,'text',{x:left-7,y:yy+4,'text-anchor':'end'},fmt(value));}
    const tickEvery=Math.max(1,Math.round(85/step));
    dates.forEach((day,i)=>{if(i%tickEvery===0)svg(root,'text',{x:x(i),y:height-8,'text-anchor':'middle'},scale==='year'?day.slice(0,4):scale==='month'?day.slice(0,7):name(day).replace(/ \d{4}$/,''));
      const r=rows[i];if(!r)return;
      const g=svg(root,'g',{'data-point':day,role:'button',tabindex:0,'aria-label':period(day)+': '+description(r)});
      window.PZChartTooltip?.attach(g,[r.mean==null?(r.status==='insufficient_coverage'?'Insufficient coverage':'Not quantified'):fmt(r.mean)+(scale==='day'?' movements':' / day')],period(day)+' · '+r.countable_days+'/'+r.diary_days+' countable diary days'+(r.untracked_days?' · '+r.untracked_days+' not tracked':'')+(r.uncertain_days?' · '+r.uncertain_days+' uncertain':''));
      if(r.mean===null){svg(g,'path',{d:`M ${x(i)-4} ${bottom-7} l 8 8 m -8 0 l 8 -8`,class:'bowel-uncertain'});}
      else {const h=Math.max(2,bottom-y(r.mean));svg(g,'rect',{x:x(i)-Math.min(22,step*.5)/2,y:bottom-h,width:Math.min(22,step*.5),height:h,class:r.mean===0?'bowel-zero':'bowel-bar'});
        svg(g,'text',{x:x(i),y:Math.max(19,bottom-h-10),'text-anchor':'middle',class:'bowel-value-label'},fmt(r.mean));}
      svg(g,'rect',{x:x(i)-step*.45,y:top,width:step*.9,height:bottom-top,fill:'transparent'});
      g.addEventListener('click',()=>choose(day));g.addEventListener('focus',()=>choose(day));
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(day);}});
    });choose(selected);center(selected);
  }
  scroll.addEventListener('scroll',()=>{if(queued)return;queued=requestAnimationFrame(()=>{queued=0;showVisible();});},{passive:true});
  scroll.addEventListener('wheel',e=>{if(e.shiftKey&&!e.ctrlKey&&!e.metaKey){e.preventDefault();scroll.scrollLeft+=e.deltaY;}},{passive:false});
  document.querySelectorAll('[data-bowel-scale]').forEach(b=>b.onclick=()=>{scale=b.dataset.bowelScale;render();});
  $('bowel-prev').onclick=()=>{scroll.scrollLeft-=Math.max(200,scroll.clientWidth*.82);};
  $('bowel-next').onclick=()=>{scroll.scrollLeft+=Math.max(200,scroll.clientWidth*.82);};
  $('bowel-date').min=first;$('bowel-date').max=last;
  $('bowel-jump').onsubmit=e=>{e.preventDefault();if(e.target.reportValidity()){selected=clamp($('bowel-date').value,first,last);choose(selected);center(selected);}};
  let width=0;if(typeof ResizeObserver!=='undefined')new ResizeObserver(entries=>{const w=Math.round(entries[0].contentRect.width);if(width!==w){width=w;render();}}).observe(scroll);
  render();
})();
