(() => {
 const query=new URLSearchParams(location.search);
 const keys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','entry'];
 document.querySelectorAll('a[href]').forEach(a=>{
  const raw=a.getAttribute('href');
  if(!raw?.startsWith('/')||raw.startsWith('//')||a.hasAttribute('download')||/\.(?:png|jpe?g|svg|css|js|xlsx|pdf)(?:[?#]|$)/i.test(raw))return;
  const url=new URL(raw,location.origin);
  keys.forEach(k=>{if(query.has(k)&&!url.searchParams.has(k))url.searchParams.set(k,query.get(k).slice(0,100));});
  a.setAttribute('href',url.pathname+url.search+url.hash);
 });
 const form=document.querySelector('[data-application]');
 if(!form)return;
 form.hidden=false;
 const select=form.elements.namedItem('track');
 if([...select.options].some(o=>o.value===query.get('track')))select.value=query.get('track');
 const materials=new Set(['one-layer','book','9-sfer-material']);
 const box=document.querySelector('[data-draft-box]');
 function configure(){const short=materials.has(select.value);form.querySelector('[data-material-fields]').hidden=!short;form.querySelector('[data-personal-fields]').hidden=short;for(const name of ['task','result','tried','time']){const field=form.elements.namedItem(name);field.disabled=short;field.required=!short&&['task','result'].includes(name);field.setCustomValidity('');}box.hidden=true;}
 configure();select.addEventListener('change',configure);
 const tg=document.querySelector('[data-telegram]');
 const draft=document.getElementById('draft');
 const updateTelegram=()=>{tg.href='https://t.me/andreyjurievich?text='+encodeURIComponent(draft.value);};
 form.addEventListener('submit',event=>{
  event.preventDefault();const short=materials.has(select.value);
  if(!short)for(const name of ['task','result']){const field=form.elements.namedItem(name);field.setCustomValidity(field.value.trim()?'':'Пожалуйста, напишите ответ.');if(!field.reportValidity())return;}
  const values=new FormData(form);const value=k=>String(values.get(k)||'').trim();
  const source=keys.filter(k=>query.has(k)).map(k=>k+': '+query.get(k).slice(0,100)).join('\n');
  const details=short?'\nПодскажите наличие, способ оплаты и получения.'+(value('comment')?'\nКомментарий: '+value('comment'):''):'\n\nМоя задача: '+value('task')+'\nЖелаемое изменение: '+value('result')+'\nЧто уже пробовал(а): '+(value('tried')||'Пока не указано')+'\nДоступное время: '+(value('time')||'Хочу обсудить');
  draft.value='Андрей, здравствуйте!\nИнтересует: '+select.selectedOptions[0].text+'.'+details+(source?'\n\nИсточник обращения:\n'+source:'');
  box.hidden=false;updateTelegram();draft.focus();document.querySelector('[data-copy-status]').textContent='Проверьте текст перед отправкой.';
 });
 form.querySelectorAll('textarea').forEach(f=>f.addEventListener('input',()=>f.setCustomValidity('')));
 draft.addEventListener('input',updateTelegram);
 document.querySelector('[data-copy]').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(draft.value);document.querySelector('[data-copy-status]').textContent='Текст скопирован. Вставьте его в личный чат и отправьте.';}catch{draft.focus();draft.select();document.querySelector('[data-copy-status]').textContent='Скопируйте выделенный текст вручную.';}});
})();
