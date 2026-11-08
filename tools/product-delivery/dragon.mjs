import {hash,normalize} from './worker.mjs';
import pages from './dragon-pages.json' with {type:'json'};
import archive from './dragon-archive.json' with {type:'json'};
const cookieName='dragon_account';
const baseHeaders={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const json=(status,data)=>Response.json(data,{status,headers:baseHeaders});
const pageAllowed=p=>p==='landing'||p==='reader'||Object.hasOwn(pages,p);
async function owner(request,env){
 const token=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!/^[a-f0-9]{64}$/.test(token||''))return null;
 const id=await hash(token);
 return await env.DB.prepare('SELECT owner FROM dragon_sessions WHERE owner=?').bind(id).first()?id:null;
}
async function granted(id,env){return !!id&&!!await env.DB.prepare('SELECT owner FROM dragon_grants WHERE owner=?').bind(id).first();}
async function asset(env,path){return env.ASSETS.fetch(new Request('https://private.invalid'+path));}
async function serve(env,path,type){
 const a=await asset(env,path);if(!a.ok)return json(404,{message:'Материал не найден'});
 return new Response(a.body,{headers:{...baseHeaders,'Content-Type':type||a.headers.get('Content-Type')||'application/octet-stream'}});
}
export async function dragon(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!(path.startsWith('/api/products/dragon/')||path.startsWith('/dragon-online/')))return null;
 try{
 const id=await owner(request,env),access=await granted(id,env);
 if(path==='/api/products/dragon/session'&&request.method==='GET'){
  if(id)return json(200,{access});
  const token=[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');
  await env.DB.prepare('INSERT INTO dragon_sessions(owner,created_at) VALUES(?,?)').bind(await hash(token),Date.now()).run();
  const r=json(200,{access:false});r.headers.set('Set-Cookie',`${cookieName}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`);return r;
 }
 if(path.startsWith('/dragon-online/')){
  if(!['GET','HEAD'].includes(request.method))return json(405,{message:'Метод не поддерживается'});
  if(!access)return new Response(null,{status:303,headers:{...baseHeaders,Location:'/dragon/#access'}});
  if(path==='/dragon-online/')return serve(env,'/dragon-reader/index.html','text/html; charset=utf-8');
  const m=path.match(/^\/dragon-online\/techniques\/([a-z0-9-]+)\/$/);
  if(m&&pages[m[1]])return serve(env,'/dragon-reader/pages/'+m[1]+'.html','text/html; charset=utf-8');
  const a=path.match(/^\/dragon-online\/(assets|maps)\/([a-zA-Z0-9._-]+)$/);
  if(a)return serve(env,'/dragon-reader/'+a[1]+'/'+a[2]);
  return json(404,{message:'Страница не найдена'});
 }
 if(path==='/api/products/dragon/download'&&request.method==='GET'){
  if(!access)return json(403,{message:'Сначала получите доступ по коду'});
  const first=await asset(env,archive.parts[0]);if(!first.ok)return json(503,{message:'Архив временно недоступен'});
  let part=0,reader=first.body.getReader();
  const stream=new ReadableStream({async pull(controller){try{let r=await reader.read();while(r.done){reader.releaseLock();part++;if(part>=archive.parts.length){controller.close();return;}const response=await asset(env,archive.parts[part]);if(!response.ok)throw Error('Missing archive part');reader=response.body.getReader();r=await reader.read();}controller.enqueue(r.value);}catch(e){controller.error(e);}},async cancel(reason){await reader.cancel(reason);}});
  return new Response(stream,{headers:{...baseHeaders,'Content-Type':'application/zip','Content-Disposition':'attachment; filename="Dragon-intention.zip"','Content-Length':String(archive.bytes)}});
 }
 if(path==='/api/products/dragon/comments'&&request.method==='GET'){
  const page=url.searchParams.get('page');if(!pageAllowed(page))return json(400,{message:'Неизвестная страница'});
  if(page!=='landing'&&!access)return json(403,{message:'Сначала получите доступ по коду'});
  const parent=url.searchParams.get('parent');
  if(parent&&!/^[a-zA-Z0-9-]{1,80}$/.test(parent))return json(400,{message:'Неверная ветка'});
  const cursor=url.searchParams.get('before')||'',split=cursor.split(':');
  if(cursor&&(!/^\d{1,16}$/.test(split[0])||!/^[a-zA-Z0-9-]{1,80}$/.test(split[1]||'')))return json(400,{message:'Неверный указатель страницы'});
  const rows=await env.DB.prepare(`SELECT id,body,image,created_at,updated_at,owner,parent,(SELECT count(*) FROM dragon_comments r WHERE r.parent=c.id) AS replies FROM dragon_comments c WHERE page=? AND ${parent?'parent=?':'parent IS NULL'} ${cursor?'AND (created_at<? OR (created_at=? AND id<?))':''} ORDER BY created_at DESC,id DESC LIMIT ?`).bind(page,...(parent?[parent]:[]),...(cursor?[Number(split[0]),Number(split[0]),split[1]]:[]),parent?21:5).all();
  const limit=parent?20:4,more=rows.results.length>limit,items=rows.results.slice(0,limit).map(r=>({id:r.id,body:r.body,image:r.image,created_at:r.created_at,updated_at:r.updated_at,mine:r.owner===id,replies:r.replies}));
  const last=items.at(-1);return json(200,{items,next:more&&last?`${last.created_at}:${last.id}`:null});
 }
 if(!['POST','PATCH'].includes(request.method))return json(405,{message:'Метод не поддерживается'});
 const origin=request.headers.get('Origin');
 if(origin!=='https://indikov.ru'&&origin!=='https://www.indikov.ru'&&!(env.LOCAL_TEST==='true'&&origin==='http://127.0.0.1:3197'))return json(403,{message:'Откройте форму на indikov.ru'});
 if(!id)return json(401,{message:'Обновите страницу. Для доступа нужны файлы cookie этого сайта'});
 if(!request.headers.get('Content-Type')?.includes('application/json'))return json(415,{message:'Неверный формат'});
 const raw=await request.text();if(raw.length>12000)return json(413,{message:'Сообщение слишком длинное'});
 let data;try{data=JSON.parse(raw)}catch{return json(400,{message:'Не удалось прочитать запрос'})}
 if(path==='/api/products/dragon/redeem'&&request.method==='POST'){
  if(access)return json(200,{access:true,url:'/dragon-online/',download:'/api/products/dragon/download',reused:true});
  const code=normalize(data.code);if(!/^\d{12}$/.test(code))return json(400,{message:'Введите 12 цифр кода'});
  const now=Date.now(),ip=request.headers.get('CF-Connecting-IP')||'local',bucket=await hash('dragon:'+ip+':'+Math.floor(now/600000));
  const a=await env.DB.prepare('INSERT INTO product_attempts(bucket_key,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(bucket_key) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(bucket,now+1200000).first();
  if(a.attempts>15)return json(429,{message:'Слишком много попыток. Попробуйте через 10 минут'});
  const row=await env.DB.prepare('SELECT code_hash,uses,max_uses FROM dragon_codes WHERE code_hash=?').bind(await hash(code)).first();
  if(!row)return json(404,{message:'Код не найден. Проверьте цифры'});
  if(row.uses>=row.max_uses)return json(409,{message:'Все выдачи по этому коду уже использованы'});
  for(const p of [...archive.parts,'/dragon-reader/index.html']){const a=await env.ASSETS.fetch(new Request('https://private.invalid'+p,{method:'HEAD'}));if(!a.ok)return json(503,{message:'Материал временно недоступен. Код не потрачен'});}
  try{await env.DB.prepare('INSERT INTO dragon_grants(owner,code_hash,created_at) VALUES(?,?,?)').bind(id,row.code_hash,now).run();}
  catch(e){if(await granted(id,env))return json(200,{access:true,url:'/dragon-online/',download:'/api/products/dragon/download',reused:true});if(String(e).includes('DRAGON_EXHAUSTED'))return json(409,{message:'Все выдачи по этому коду уже использованы'});throw e;}
  return json(200,{access:true,url:'/dragon-online/',download:'/api/products/dragon/download'});
 }
 if(path==='/api/products/dragon/comments'){
  const body=typeof data.body==='string'?data.body.trim():'';
  if(body.length<1||body.length>4000)return json(400,{message:'Напишите от 1 до 4000 символов'});
  if(request.method==='PATCH'){
   const old=await env.DB.prepare('SELECT page FROM dragon_comments WHERE id=? AND owner=?').bind(String(data.id||''),id).first();
   if(!old)return json(403,{message:'Можно редактировать только свою запись'});
   if(old.page!=='landing'&&!access)return json(403,{message:'Нужен доступ к упражнениям'});
   await env.DB.prepare('UPDATE dragon_comments SET body=?,updated_at=? WHERE id=? AND owner=?').bind(body,Date.now(),data.id,id).run();return json(200,{message:'Изменения сохранены'});
  }
  const page=data.page;if(!pageAllowed(page))return json(400,{message:'Неизвестная страница'});
  if(page!=='landing'&&!access)return json(403,{message:'Сначала получите доступ по коду'});
  const parent=data.parent||null;
  if(parent&&!await env.DB.prepare('SELECT id FROM dragon_comments WHERE id=? AND page=? AND parent IS NULL').bind(String(parent),page).first())return json(400,{message:'Ветка не найдена'});
  const last=await env.DB.prepare('SELECT last_at FROM dragon_comment_clock WHERE owner=?').bind(id).first();
  const wait=page==='landing'?15000:600000;
  if(last&&Date.now()-last.last_at<wait)return json(429,{message:'Новую запись можно отправить позже. Свою можно редактировать сейчас',retryAfter:Math.ceil((wait-Date.now()+last.last_at)/1000)});
  try{await env.DB.prepare('INSERT INTO dragon_comments(id,page,owner,parent,body,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),page,id,parent,body,Date.now()).run();}
  catch(e){if(String(e).includes('DRAGON_SLOW'))return json(429,{message:'Медленный режим: одна новая запись в 10 минут. Редактирование доступно всегда',retryAfter:600});throw e;}
  return json(201,{message:'Комментарий добавлен'});
 }
 return json(404,{message:'Страница не найдена'});
 }catch{return json(503,{message:'Не удалось выполнить запрос. Попробуйте ещё раз, доступ сохраняется'});}
}
