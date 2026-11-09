(()=>{
 if(!['indikov.ru','www.indikov.ru'].includes(location.hostname)||location.pathname.startsWith('/dragon-online/'))return;
 const id=110070883;
 if(window.indikovMetrikaStarted)return;
 window.indikovMetrikaStarted=true;
 window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments)};
 window.ym.l=Date.now();
 const tag=document.createElement('script');tag.async=true;tag.src='https://mc.yandex.ru/metrika/tag.js';document.head.append(tag);
 // No form values, codes, prepared messages, query strings or private reader visits.
 window.ym(id,'init',{defer:true,webvisor:false,clickmap:false,trackLinks:false,accurateTrackBounce:true});
 let ref='';try{const u=new URL(document.referrer);ref=u.origin+u.pathname}catch{}
 window.ym(id,'hit',location.origin+location.pathname,{referer:ref,title:document.title});
 const allowed=new Set(['contact_telegram','contact_vk','mila_contact','book_download','product_code_submit','product_access_ready','dragon_purchase','material_download','cta_nav_tg','cta_nav_vk','cta_hero_tg','cta_hero_vk','cta_final_tg','cta_final_vk','cta_sticky','practice_play','practice_end','support_open','support_checkout']);
 const goal=name=>{if(allowed.has(name))window.ym(id,'reachGoal',name)};
 document.addEventListener('click',event=>{
  const a=event.target.closest('a[href]');if(!a)return;
  let u;try{u=new URL(a.href,location.href)}catch{return}
  if(u.pathname.endsWith('/lyudi-i-biznesy-edition-10.pdf'))goal('book_download');
  if(a.hasAttribute('download')||/\.(pdf|xlsx|zip|m4a)$/.test(u.pathname))goal('material_download');
  const position=a.closest('header,.siteNav,nav')?'nav':a.closest('.hero,.routeHero,#hero')?'hero':'final';
  if(u.hostname==='t.me')goal('cta_'+position+'_tg');
  if(['vk.ru','vk.com'].includes(u.hostname))goal('cta_'+position+'_vk');
  if(a.closest('.sticky-cta,.stickyCta'))goal('cta_sticky');
  if(u.hostname==='t.me'){goal('contact_telegram');if(/^\/mila(?:\.html|\/|$)/.test(location.pathname))goal('mila_contact')}
  if(['vk.ru','vk.com'].includes(u.hostname)){goal('contact_vk');if(/^\/mila(?:\.html|\/|$)/.test(location.pathname))goal('mila_contact')}
  if(location.pathname==='/dragon/'&&u.hostname.endsWith('lava.top'))goal('dragon_purchase');
 });
 document.addEventListener('submit',event=>{if(event.target.matches('[data-access-form]')&&event.target.querySelector('input')?.value.trim())goal('product_code_submit')},true);
 document.addEventListener('product-access-ready',()=>goal('product_access_ready'));
 document.querySelectorAll('.layerDirectAudio audio').forEach(audio=>{audio.addEventListener('play',()=>goal('practice_play'),{once:true});audio.addEventListener('ended',()=>goal('practice_end'))});
})();
