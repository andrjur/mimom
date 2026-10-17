'use strict';
const CACHE='indikov-physics-pwa-v1';
const FILES=['./','index.html','style.css','physics-math.js','data.js','app.js','pwa.js','icon.svg','icon-180.png','icon-192.png','icon-512.png','manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('indikov-physics-pwa-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
  const cached=await cache.match(request,{ignoreSearch:true});
  if(cached)return cached;
  try{return await fetch(request);}catch(error){if(request.mode==='navigate')return (await cache.match('./'))||Response.error();return Response.error();}
 }));
});
