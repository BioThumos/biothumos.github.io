(() => {'use strict';
const data=JSON.parse(document.getElementById('pz-sleep-phase-data').textContent);
const viewport=document.getElementById('sleep-phase-scroll');const range=document.getElementById('sleep-phase-date');
const W=27,TOP=31,H=472,END=TOP+H,NS='http://www.w3.org/2000/svg';
const colors={core:'#a6b7d8',deep:'#5279b9',rem:'#65af9a',unspecified:'#8b9296',awake:'#3d594f',diary:'#c3a5d9'};
const labels={core:'Core/light',deep:'Deep',rem:'REM',unspecified:'Other asleep',awake:'Watch awake',diary:'Diary sleep interval (stage unknown)'};
const spacer=document.createElement('div');spacer.className='sleep-phase-spacer';spacer.style.width=Math.max(1,data.days.length*W)+'px';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','sleep-phase-svg');svg.setAttribute('height',536);
spacer.append(svg);viewport.replaceChildren(spacer);
svg.setAttribute('aria-label','Watch and diary-reported sleep phases by local calendar day');
function element(tag,attrs){let e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;}
function labelTime(v){const m=Math.round(v),h=Math.floor(m/60)%24;return String(h).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
const firstDay=data.days.length?data.days[0][0]:'',BUFFER=14;
let renderedStart=-1,renderedEnd=-1,queued=false;
function renderVisible(force=false){
 const count=data.days.length;if(!count)return;
 const visibleStart=Math.max(0,Math.floor(viewport.scrollLeft/W));
 const visibleEnd=Math.min(count,Math.ceil((viewport.scrollLeft+Math.max(W,viewport.clientWidth))/W));
 // Keep an extra buffer during swipes. Re-render only near a buffered edge.
 if(!force&&renderedStart>=0&&visibleStart>=renderedStart&&visibleEnd<=renderedEnd&&
    (renderedStart===0||visibleStart-renderedStart>=3)&&(renderedEnd===count||renderedEnd-visibleEnd>=3))return;
 const start=Math.max(0,visibleStart-BUFFER),end=Math.min(count,visibleEnd+BUFFER),width=(end-start)*W;
 if(start===renderedStart&&end===renderedEnd)return;
 renderedStart=start;renderedEnd=end;
 svg.style.left=start*W+'px';svg.setAttribute('width',width);svg.setAttribute('viewBox',`0 0 ${width} 536`);
 svg.dataset.start=String(start);svg.dataset.end=String(end);
 const fragment=document.createDocumentFragment();
 for(let hr=0;hr<=24;hr+=3){const y=TOP+hr*H/24;fragment.append(element('line',{x1:0,x2:width,y1:y,y2:y,class:'phase-grid'}));}
 for(let i=start;i<end;i++){
 const [day,parts]=data.days[i];const x=(i-start)*W;
 if(day.endsWith('-01')||i===0){fragment.append(element('line',{x1:x,x2:x,y1:0,y2:END,class:'phase-dayline'}));const t=element('text',{x:x+3,y:13});t.textContent=day.slice(0,7);fragment.append(t);}
 else if((i%7)===0){fragment.append(element('line',{x1:x,x2:x,y1:TOP,y2:END,class:'phase-dayline'}));}
 for(const [a,b,stage,source,uncertain] of parts){
   const rect=element('rect',{x:x+3,y:TOP+a*H/1440,width:W-6,height:Math.max(.9,(b-a)*H/1440),fill:colors[stage]||colors.diary,class:'phase-segment',tabindex:0,role:'img'});
   const details=`${day} · ${labelTime(a)}–${labelTime(b)} · ${source==='watch'?'Watch-measured stage':'Diary clocked sleep/wake'}${uncertain?' · onset approximate':''}`;
   rect.setAttribute('aria-label',`${labels[stage]||'Sleep'} · ${details}`);
   if(window.PZChartTooltip?.attach)window.PZChartTooltip.attach(rect,[`${labels[stage]||stage} · ${labelTime(a)}–${labelTime(b)}`],details);
   else {let t=element('title',{});t.textContent=details;rect.append(t);}
   fragment.append(rect);
 }
 if(parts.length){const dot=element('rect',{x:x+3,y:END+5,width:W-6,height:3,fill:parts.some(p=>p[3]==='watch')?'#7cbfa9':'#c3a5d9'});fragment.append(dot);}
}
 svg.replaceChildren(fragment);
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;renderVisible()});}}
function scrollDay(s){const first=firstDay?new Date(firstDay+'T12:00:00Z'):null;
 if(!first||!s)return;const now=new Date(s+'T12:00:00Z');if(isNaN(now))return;
 const idx=Math.max(0,Math.min(data.days.length-1,Math.round((now-first)/86400000)));
 viewport.scrollLeft=Math.max(0,idx*W-viewport.clientWidth*.42);range.value=data.days[idx][0];renderVisible(true);
}
function currentlyCentered(){return Math.max(0,Math.min(data.days.length-1,Math.floor((viewport.scrollLeft+viewport.clientWidth*.45)/W)));}
document.getElementById('phase-go').addEventListener('click',()=>scrollDay(range.value));
range.addEventListener('change',()=>scrollDay(range.value));
document.getElementById('phase-prev').addEventListener('click',()=>{let n=Math.max(0,currentlyCentered()-30);scrollDay(data.days[n]?.[0])});
document.getElementById('phase-next').addEventListener('click',()=>{let n=Math.min(data.days.length-1,currentlyCentered()+30);scrollDay(data.days[n]?.[0])});
document.getElementById('phase-latest').addEventListener('click',()=>scrollDay(data.days.at(-1)?.[0]));
viewport.addEventListener('scroll',()=>{let i=currentlyCentered();if(data.days[i])range.value=data.days[i][0];schedule()},{passive:true});
if(typeof ResizeObserver==='function')new ResizeObserver(schedule).observe(viewport);else window.addEventListener('resize',schedule);
scrollDay(data.days.at(-1)?.[0]);
})();
