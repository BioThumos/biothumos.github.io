/* Read-only, accessible chart tooltips with the measured value before metadata. */
'use strict';
(() => {
  let tip;
  function ensure() {
    if (tip) return tip;
    tip=document.createElement('div');
    tip.className='pz-chart-tooltip';
    tip.setAttribute('role','tooltip');
    tip.hidden=true;
    tip.setAttribute('aria-live','off');
    document.body.append(tip);
    return tip;
  }
  function hide() { if(tip) tip.hidden=true; }
  function position(ev,target) {
    if(!tip || tip.hidden)return;
    const b=target.getBoundingClientRect();
    const x=ev?.clientX ?? (b.left+b.width/2), y=ev?.clientY ?? b.top;
    const width=tip.offsetWidth, height=tip.offsetHeight;
    tip.style.left=Math.max(8,Math.min(window.innerWidth-width-8,x+14))+'px';
    tip.style.top=Math.max(8,Math.min(window.innerHeight-height-8,y-height-13))+'px';
  }
  function attach(target, importantValues, metadata) {
    const values=Array.isArray(importantValues)?importantValues:[importantValues];
    const render=ev=>{
      const t=ensure();t.replaceChildren();
      const lead=document.createElement('div');lead.className='pz-chart-tooltip-values';
      for(const value of values){
        if(value==null || value==='')continue;
        const span=document.createElement('strong');span.textContent=String(value);lead.append(span);
      }
      t.append(lead);
      if(metadata){const secondary=document.createElement('div');secondary.className='pz-chart-tooltip-meta';secondary.textContent=String(metadata);t.append(secondary);}
      t.hidden=false;position(ev,target);
    };
    target.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')render(e);});
    target.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')position(e,target);});
    target.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')hide();});
    target.addEventListener('focus',()=>render(null));
    target.addEventListener('blur',hide);
    target.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')render(e);});
  }
  window.addEventListener('scroll',hide,{capture:true,passive:true});
  window.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
  window.PZChartTooltip={attach,hide};
})();
