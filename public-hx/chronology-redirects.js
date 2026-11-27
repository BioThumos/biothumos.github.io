(()=>{
  function reveal(){
    let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{return}
    const a=document.getElementById(id);
    if(!a?.hasAttribute('data-chronology-retired'))return;
    const dest=new URL(a.href,location.href);
    const locale=new URLSearchParams(location.search).get('locale');
    if(locale)dest.searchParams.set('locale',locale);
    location.replace(dest.href);
  }
  window.addEventListener('hashchange',reveal);reveal();
})();
