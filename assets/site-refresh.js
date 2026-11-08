(()=>{
 const today=new Date();
 if(today>=new Date('2026-11-08T00:00:00+03:00')&&today<new Date('2027-01-21T00:00:00+03:00'))document.documentElement.classList.add('festive-season');
 document.querySelectorAll('.siteNav a[href]').forEach(a=>{if(new URL(a.href,location.href).pathname===location.pathname)a.setAttribute('aria-current','page')});
 const menu=document.querySelector('.mobileNav');
 if(menu){document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus()}});document.addEventListener('click',e=>{if(menu.open&&!menu.contains(e.target))menu.open=false});}
 const filters=document.querySelector('[data-catalog-filters]');
 if(filters){const cards=[...document.querySelectorAll('[data-catalog-kind]')];filters.hidden=false;filters.addEventListener('click',e=>{const b=e.target.closest('button[data-filter]');if(!b)return;const kind=b.dataset.filter;filters.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));cards.forEach(card=>card.hidden=kind!=='all'&&card.dataset.catalogKind!==kind);document.querySelector('[data-catalog-count]').textContent='Материалов: '+cards.filter(c=>!c.hidden).length;});}
 const legacy=/^\/(neurocoaching|typolog|sociotyper|school|repetitor)(\/|$)/.test(location.pathname)||/\/(about|dar|mila|pereSBorka|Lorenz)\.html$/.test(location.pathname);
 if(legacy&&!document.querySelector('.siteNav')){const back=document.createElement('div');back.className='legacyReturn';back.setAttribute('aria-label','Другие разделы сайта');for(const [href,label] of [['/','Андрей Индыков'],['/articles/','Авторский блог'],['/catalog/','Все материалы']]){const a=document.createElement('a');a.href=href;a.textContent=label;back.append(a)}document.body.append(back);}
})();
