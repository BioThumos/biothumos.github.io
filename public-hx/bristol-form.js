'use strict';
(()=>{
  const packet=globalThis.PZ_BRISTOL;
  if(!packet)return;
  const $=s=>document.getElementById(s);
  const scroll=$('bristol-scroll'),plot=$('bristol-plot');
  if(!scroll||!plot)return;
  const check=$('bristol-estimates'),low=$('bristol-low'),prev=$('bristol-prev'),next=$('bristol-next');
  const info=$('bristol-info');
  const ns='http://www.w3.org/2000/svg';
  const DAY=86400000;
  const stamp=d=>new Date(d+'T00:00:00Z').getTime();
  const format=d=>new Date(d+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  const records=packet.records.filter(r=>r.chart_eligible);
  const first=packet.bounds[0],last=packet.bounds[1];
  const axis=60,dayWidth=12,height=286,top=29,bottom=248;
  if(!first){info.textContent='No Bristol-form descriptions support a charted result.';return;}
  const firstMs=stamp(first),lastMs=stamp(last);
  const elapsed=r=>Math.round((stamp(r.date)-firstMs)/DAY);
  const position=r=>axis+elapsed(r)*dayWidth+5;
  const width=Math.max(360,axis+Math.round((lastMs-firstMs)/DAY+1)*dayWidth+42);
  const y=n=>bottom-(n-1)*(bottom-top)/6;
  function el(parent,tag,props={},text){const x=document.createElementNS(ns,tag);Object.entries(props).forEach(([k,v])=>x.setAttribute(k,v));if(text!==undefined)x.textContent=text;parent.appendChild(x);return x;}
  function show(r){
    const range=r.low===r.high?'Type '+r.low:'Types '+r.low+'–'+r.high;
    const confidence=r.origin==='recorded'?'directly recorded':r.confidence+'-confidence retrospective estimate';
    const day=format(r.date);
    info.replaceChildren();
    const b=document.createElement('strong');b.textContent=day+' · '+range+' ('+confidence+')';info.append(b);
    info.append(document.createTextNode(' · '+r.rationale));
    const a=document.createElement('a');a.href='weeks/'+(()=>{const date=new Date(r.date+'T00:00:00Z');date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);return date.toISOString().slice(0,10);})()+'.html#day-'+r.date;
    a.textContent='Diary';info.append(a);
  }
  function render(){
    const old=scroll.scrollLeft;
    plot.replaceChildren();
    const svg=el(plot,'svg',{width,height,viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':'Bristol stool form types 1–7; hollow markers are estimates, vertical lines represent ranges'});
    for(let n=1;n<=7;n++){
      el(svg,'line',{x1:axis-9,x2:width-12,y1:y(n),y2:y(n),class:'bristol-grid'});
      el(svg,'text',{x:axis-16,y:y(n)+4,'text-anchor':'end',class:'bristol-axis-label'},String(n));
    }
    let month=first.slice(0,7)+'-01';
    while(month<=last){
      const x=axis+(stamp(month)-firstMs)/DAY*dayWidth+5;
      if(x>=axis-5&&x<=width-10)el(svg,'text',{x,y:height-14,'text-anchor':'middle',class:'bristol-month-label'},month.slice(0,7));
      const d=new Date(month+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);month=d.toISOString().slice(0,10);
    }
    const vis=records.filter(r=>r.origin==='recorded'||check.checked&&(low.checked||r.confidence!=='low'));
    const same=new Map();
    vis.forEach(r=>{
      const ordinal=same.get(r.date)||0;same.set(r.date,ordinal+1);
      const x=position(r)+(ordinal%3-1)*3;
      const group=el(svg,'g',{class:'bristol-point',tabindex:'0',role:'button',
        'aria-label':format(r.date)+': '+(r.low===r.high?'type '+r.low:'types '+r.low+' through '+r.high)+'; '+(r.origin==='recorded'?'directly recorded':r.confidence+' confidence inferred')});
      if(r.low!==r.high){
        el(group,'line',{x1:x,y1:y(r.low),x2:x,y2:y(r.high),class:'bristol-range'});
        el(group,'line',{x1:x-4,y1:y(r.low),x2:x+4,y2:y(r.low),class:'bristol-range'});
        el(group,'line',{x1:x-4,y1:y(r.high),x2:x+4,y2:y(r.high),class:'bristol-range'});
      }
      el(group,'circle',{cx:x,cy:y((r.low+r.high)/2),r:5,
        class:r.origin==='recorded'?'bristol-recorded-dot':r.confidence==='low'?'bristol-low-dot':'bristol-estimate-dot'});
      el(group,'rect',{x:x-6,y:y(r.high)-6,width:12,height:y(r.low)-y(r.high)+12,fill:'transparent'});
      el(group,'title',{},r.date+' · '+(r.low===r.high?'Type '+r.low:'Types '+r.low+'–'+r.high)+' · '+r.confidence);
      group.addEventListener('click',()=>show(r));
      group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show(r);}});
    });
    const total=vis.length;
    if(!total){info.textContent='No directly recorded Bristol types are available. Enable retrospective estimates to view qualified inferences.';}
    else info.textContent=total+' plotted stool-form assessments. Select a marker to see its source and uncertainty.';
    scroll.scrollLeft=old;
    nav();
  }
  function nav(){prev.disabled=scroll.scrollLeft<2;next.disabled=scroll.scrollLeft+scroll.clientWidth>=scroll.scrollWidth-2;}
  check.addEventListener('change',render);low.addEventListener('change',render);
  prev.addEventListener('click',()=>scroll.scrollBy({left:-scroll.clientWidth*.85,behavior:'smooth'}));
  next.addEventListener('click',()=>scroll.scrollBy({left:scroll.clientWidth*.85,behavior:'smooth'}));
  scroll.addEventListener('scroll',nav,{passive:true});
  render();
  // Start at the latest information, without pretending the gaps were zeros.
  scroll.scrollLeft=scroll.scrollWidth-scroll.clientWidth;nav();
})();
