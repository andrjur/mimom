document.querySelectorAll('[data-access-form]').forEach(form=>{
  const input=form.querySelector('input'), button=form.querySelector('button'), status=form.querySelector('[role="status"]');
  const error=form.querySelector('[role="alert"]'), product=form.dataset.product;
  const result=form.querySelector('[data-download-result]'), again=form.querySelector('[data-download-again]');
  const variant=form.dataset.variant||'a';
  let visitor=null;
  const productLinks={start:'/hochu-no-ne-delayu/',ai:'/ii-ne-poddakivay/'};
  if(!new URLSearchParams(location.search).has('variant') && location.hostname==='indikov.ru'){
    try{
      visitor=localStorage.getItem('product-visitor-v1')||crypto.randomUUID();localStorage.setItem('product-visitor-v1',visitor);
      fetch('/api/products/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product,variant,visitor}),keepalive:true}).catch(()=>{});
    }catch{}
  }
  let downloadUrl;
  form.addEventListener('submit',async event=>{
    event.preventDefault(); error.textContent=''; status.textContent=''; result.hidden=true;
    form.querySelector('[data-other-product]')?.remove();
    const code=input.value.trim();
    if(!code){error.textContent='Введите код, который Андрей передал вам лично.';input.focus();return;}
    let key;
    try {
      // Save before the request. If storage is unavailable do not activate a code
      // which cannot be recovered after a failed network response.
      const normalized=code.toUpperCase().replace(/[\s-]/g,'');
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalized));
      const storageKey='product-access-'+product+'-'+Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
      key=localStorage.getItem(storageKey)||crypto.randomUUID(); localStorage.setItem(storageKey,key);
    }catch{error.textContent='Браузер не позволяет сохранить доступ. Откройте страницу в обычной вкладке и разрешите хранение данных для этого сайта.';return;}
    button.disabled=true; button.textContent='Готовлю скачивание…'; input.setAttribute('aria-invalid','false');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try {
      const response=await fetch('/api/products/redeem',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({product,code,variant,visitor}),signal:controller.signal});
      if(!response.ok){const data=await response.json();if(productLinks[data.product]){const link=document.createElement('a');link.href=productLinks[data.product]+'#access';link.textContent='Открыть страницу нужного практикума';link.className='practiceTextLink';link.dataset.otherProduct='';error.after(link);}throw new Error(data.message||'Не удалось получить материал. Повторите позже.');}
      const blob=await response.blob();
      if(downloadUrl)URL.revokeObjectURL(downloadUrl);
      downloadUrl=URL.createObjectURL(blob); again.href=downloadUrl;
      again.download=product==='start'?'hochu-no-ne-delayu.zip':'ii-ne-poddakivay.zip';
      result.hidden=false; status.textContent='Комплект готов. Скачивание началось. Если файл не сохранился, нажмите «Скачать ещё раз».';
      document.dispatchEvent(new Event('product-access-ready'));
      again.click();
    }catch(exception){input.setAttribute('aria-invalid','true');error.textContent=exception.name==='AbortError'?'Загрузка заняла слишком много времени. Повторите с тем же кодом в этом браузере.':exception.message==='Failed to fetch'?'Соединение прервалось. Повторите с тем же кодом в этом браузере.':exception.message;}
    finally{clearTimeout(timer);button.disabled=false;button.textContent='Получить комплект';}
  });
});
