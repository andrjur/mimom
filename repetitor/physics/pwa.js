(()=>{
'use strict';
let state='loading';
function refresh(){
 const label=document.querySelector('.offline');
 const text=state==='ready'?'Без интернета':state==='failed'?'Нужен интернет':'Сохраняю офлайн…';
 if(label&&label.textContent!==text){label.textContent=text;label.title=state==='ready'?'Все 234 карточки сохранены на устройстве.':'Дождитесь сохранения карточек перед отключением интернета.';}
 const home=document.querySelector('.shell'),standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
 if(home&&!standalone&&!localStorage.getItem('physics.install.dismissed')&&!document.querySelector('.install-note')){
  const note=document.createElement('aside');note.className='install-note';
  note.innerHTML='<button aria-label="Скрыть инструкцию установки">×</button><strong>На экран «Домой»</strong><p>На iPhone и iPad: откройте эту страницу в Safari, нажмите «Поделиться» → «На экран Домой». Включите «Открывать как веб-приложение», если этот пункт доступен.</p>';
  note.querySelector('button').addEventListener('click',()=>{localStorage.setItem('physics.install.dismissed','true');note.remove();});
  home.querySelector('.top').after(note);
 }
}
new MutationObserver(refresh).observe(document.getElementById('app'),{childList:true,subtree:true});refresh();
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(()=>navigator.serviceWorker.ready).then(()=>{state='ready';refresh();}).catch(()=>{state='failed';refresh();});}
else{state='failed';refresh();}
})();
