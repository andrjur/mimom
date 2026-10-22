(() => {
 const form=document.querySelector('[data-practice]');if(!form)return;form.hidden=false;
 const output=document.querySelector('[data-practice-output]');const result=document.getElementById('practice-result');const status=document.querySelector('[data-practice-status]');
 form.addEventListener('submit',e=>{e.preventDefault();const fields=[...form.querySelectorAll('textarea')];for(const field of fields){field.setCustomValidity(field.value.trim()?'':'Запишите хотя бы одну короткую фразу.');if(!field.reportValidity())return;}result.value=form.dataset.title+'\n\n'+fields.map(f=>form.querySelector('label[for="'+f.id+'"]').textContent+'\n'+f.value.trim()).join('\n\n');output.hidden=false;result.focus();status.textContent='Карточка остаётся у вас. Можно скачать или скопировать.';});
 form.querySelectorAll('textarea').forEach(f=>f.addEventListener('input',()=>f.setCustomValidity('')));
 document.querySelector('[data-practice-copy]').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(result.value);status.textContent='Карточка скопирована.';}catch{result.focus();result.select();status.textContent='Скопируйте выделенный текст вручную.';}});
 document.querySelector('[data-practice-download]').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([result.value],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='moy-instrument.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Карточка подготовлена для скачивания.';});
 document.querySelector('[data-practice-clear]').addEventListener('click',()=>{form.reset();result.value='';status.textContent='';output.hidden=true;form.querySelector('textarea').focus();});
})();
