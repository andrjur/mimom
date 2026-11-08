const api='/api/products/dragon/';
const ready=fetch(api+'session',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Не удалось открыть доступ');return r.json()});
const accessForm=document.querySelector('[data-dragon-access]');
if(accessForm){
 const status=accessForm.querySelector('[role=status]'),button=accessForm.querySelector('button');
 ready.then(s=>{if(s.access){document.querySelector('[data-existing-access]').hidden=false;}}).catch(e=>status.textContent=e.message);
 accessForm.addEventListener('submit',async e=>{
  e.preventDefault();button.disabled=true;status.textContent='Проверяю код…';
  try{await ready;const r=await fetch(api+'redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:accessForm.elements.code.value}),signal:AbortSignal.timeout(25000)});const d=await r.json();if(!r.ok)throw Error(d.message);if(!d.reused)try{sessionStorage.setItem('dragon-new-access','1')}catch{}location.assign(d.url);}
  catch(err){status.textContent=err.name==='TimeoutError'?'Ответ задержался. Повторите в этом браузере, ещё одна выдача не потратится.':err.message;button.disabled=false;}
 });
}
if(location.pathname==='/dragon-online/')ready.then(s=>{if(s.access&&sessionStorage.getItem('dragon-new-access')){sessionStorage.removeItem('dragon-new-access');const link=document.createElement('a');link.href=api+'download';link.download='Dragon-intention.zip';link.hidden=true;document.body.append(link);link.click();link.remove();}}).catch(()=>{});
function el(tag,text,cls){const x=document.createElement(tag);if(text)x.textContent=text;if(cls)x.className=cls;return x;}
document.querySelectorAll('[data-dragon-comments]').forEach(root=>{
 const page=root.dataset.dragonComments;
 root.append(el('h2','Обсудим?'),el('p',page==='landing'?'Можно без имени. Последние комментарии сверху.':'Можно без имени. Одна новая запись или ответ в 10 минут для этого анонимного аккаунта на всех страницах упражнений. Свои записи можно редактировать в любое время.','comment-hint'));
 root.append(el('p','Аккаунт сохраняется в этом браузере. После очистки cookie сайт не сможет узнать ваши записи.','comment-hint'));
 const list=el('div'),more=el('details'),summary=el('summary','Показать остальные комментарии'),older=el('div'),notice=el('p');notice.setAttribute('role','status');more.append(summary,older);more.hidden=true;
 root.append(list,more);
 const form=el('form'),label=el('label','Ваш комментарий'),text=el('textarea');text.rows=4;text.maxLength=4000;text.required=true;text.id='comment-'+page;label.htmlFor=text.id;
 const send=el('button','Отправить'),cancel=el('button','Отменить ответ');cancel.type='button';cancel.hidden=true;let parent=null,edit=null,next=null;
 form.append(label,text,send,cancel,notice);root.append(form);
 function reset(){parent=null;edit=null;label.textContent='Ваш комментарий';send.textContent='Отправить';cancel.hidden=true;text.value='';}
 cancel.addEventListener('click',reset);
 async function getComments(params){const r=await fetch(api+'comments?'+new URLSearchParams({page,...params}),{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.message);return d;}
 function action(name,fn){const b=el('button',name,'text-action');b.type='button';b.addEventListener('click',fn);return b;}
 function render(c,isReply=false){
  const article=el('article',null,isReply?'comment reply':'comment');
  const meta=el('p',(c.mine?'Вы':c.image?'Андрей Индыков':'Аноним')+' · '+new Date(c.created_at).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'})+(c.updated_at?' · изменено':''),'comment-meta');
  article.append(meta,el('p',c.body,'comment-body'));
  if(c.image){const img=el('img');img.src='/assets/dragon-first-comment.png';img.alt='Скриншот обсуждения: пять минут работы как способ начать';img.loading='lazy';article.append(img);}
  const controls=el('div',null,'comment-controls');
  if(!isReply)controls.append(action('Ответить',()=>{parent=c.id;edit=null;label.textContent='Ответ на комментарий';cancel.hidden=false;text.focus();}));
  if(c.mine)controls.append(action('Редактировать',()=>{edit=c.id;parent=null;label.textContent='Изменить свою запись';send.textContent='Сохранить';text.value=c.body;cancel.hidden=false;text.focus();}));
  article.append(controls);
  if(!isReply&&c.replies){
   const replies=el('div'),hidden=el('details'),s=el('summary','Ещё ответы'),rest=el('div');hidden.append(s,rest);article.append(replies,hidden);hidden.hidden=true;
   let replyNext=null,loaded=false;
   getComments({parent:c.id}).then(d=>{d.items.slice(0,2).forEach(r=>replies.append(render(r,true)));d.items.slice(2).forEach(r=>rest.append(render(r,true)));replyNext=d.next;hidden.hidden=d.items.length<=2&&!d.next;loaded=true;}).catch(e=>replies.append(el('p',e.message)));
   hidden.addEventListener('toggle',async()=>{if(!hidden.open||!loaded||!replyNext)return;const cursor=replyNext;replyNext=null;try{const d=await getComments({parent:c.id,before:cursor});d.items.forEach(r=>rest.append(render(r,true)));replyNext=d.next;if(d.next){const b=action('Загрузить ещё ответы',async()=>{b.remove();const d=await getComments({parent:c.id,before:replyNext});d.items.forEach(r=>rest.append(render(r,true)));replyNext=d.next;hidden.open=false;hidden.open=true;});rest.append(b);}}catch(e){rest.append(el('p',e.message));replyNext=cursor;}});
  }
  return article;
 }
 async function load(){const d=await getComments({});list.replaceChildren(...d.items.map(c=>render(c)));next=d.next;more.hidden=!next;older.replaceChildren();more.open=false;if(!d.items.length)list.append(el('p','Здесь пока тихо. Можно начать с вопроса.','comment-hint'));}
 let loading=false;
 async function olderPage(){if(loading||!next)return;loading=true;try{const d=await getComments({before:next});d.items.forEach(c=>older.append(render(c)));next=d.next;older.querySelector('[data-load-more]')?.remove();if(next){const b=action('Загрузить ещё',olderPage);b.dataset.loadMore='';older.append(b);}}catch(e){notice.textContent=e.message;}finally{loading=false;}}
 more.addEventListener('toggle',()=>{if(more.open&&!older.children.length)olderPage();});
 ready.then(load).catch(e=>notice.textContent=e.message);
 form.addEventListener('submit',async e=>{e.preventDefault();send.disabled=true;notice.textContent='Сохраняю…';try{await ready;const r=await fetch(api+'comments',{method:edit?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(edit?{id:edit,body:text.value}:{page,parent,body:text.value}),signal:AbortSignal.timeout(20000)});const d=await r.json();if(!r.ok)throw Error(d.message+(d.retryAfter?' Подождите '+Math.ceil(d.retryAfter/60)+' мин.':''));reset();await load();notice.textContent=d.message;}catch(e){notice.textContent=e.message;}finally{send.disabled=false;}});
});
