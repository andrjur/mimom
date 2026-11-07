const PRODUCTS = {
  start: {asset:'/start.zip', file:'hochu-no-ne-delayu.zip'},
  ai: {asset:'/ai.zip', file:'ii-ne-poddakivay.zip'}
};
const ORIGINS = new Set(['https://indikov.ru', 'https://www.indikov.ru']);
export const hash = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
export const normalize = text => String(text || '').toUpperCase().replace(/[\s-]/g,'');
function reply(status, message, extra={}) {
  return Response.json({message,...extra},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // No static fallback. Every path, including workers.dev, runs through this gate.
    if (url.pathname === '/api/products/health' && request.method === 'GET') {
      return reply(200,'Сервис выдачи работает');
    }
    if (!['/api/products/redeem','/api/products/event'].includes(url.pathname)) return reply(404,'Страница не найдена');
    if (request.method !== 'POST') return reply(405,'Используйте форму на странице практикума');
    const origin = request.headers.get('Origin');
    if (origin && !ORIGINS.has(origin) && !(env.LOCAL_TEST === 'true' && origin === 'http://127.0.0.1:3197')) return reply(403,'Откройте форму на indikov.ru');
    if (!request.headers.get('Content-Type')?.includes('application/json')) return reply(415,'Неверный формат запроса');
    if (Number(request.headers.get('Content-Length') || 0) > 1500) return reply(413,'Слишком длинный запрос');
    let data;
    try { const raw=await request.text(); if(raw.length>1500)return reply(413,'Слишком длинный запрос'); data=JSON.parse(raw); }
    catch { return reply(400,'Не удалось прочитать код. Введите его ещё раз'); }
    const product = PRODUCTS[data?.product];
    if(url.pathname==='/api/products/event'){
      if(!product || !['a','b'].includes(data.variant) || !/^[a-zA-Z0-9-]{30,50}$/.test(data.visitor||''))return reply(400,'Неверный формат события');
      try{
        const now=Date.now(),address=request.headers.get('CF-Connecting-IP')||'local';
        const bucketKey=await hash('view:'+address+':'+Math.floor(now/600000));
        const attempt=await env.DB.prepare('INSERT INTO product_attempts (bucket_key,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(bucket_key) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(bucketKey,now+1200000).first();
        if(attempt.attempts>120)return reply(429,'Слишком много запросов');
        await env.DB.prepare('INSERT OR IGNORE INTO product_ab_views(visitor_hash,product,variant,created_at) VALUES(?,?,?,?)').bind(await hash(data.visitor),data.product,data.variant,now).run();
        return reply(200,'Просмотр учтён');
      }catch{return reply(503,'Статистика временно недоступна');}
    }
    const code = normalize(data?.code);
    const key = request.headers.get('Idempotency-Key') || '';
    if (!product || !/^\d{12}$/.test(code) || !/^[a-zA-Z0-9-]{20,80}$/.test(key)) return reply(400,'Проверьте код: нужно 12 цифр, пробелы и дефисы можно не вводить');
    const now = Date.now();
    try {
      const bucket = Math.floor(now/600000);
      const address = request.headers.get('CF-Connecting-IP') || 'local';
      const attemptKey = await hash(address + ':' + bucket);
      const attempt = await env.DB.prepare('INSERT INTO product_attempts (bucket_key,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(bucket_key) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(attemptKey,now+1200000).first();
      if(attempt.attempts>15)return reply(429,'Слишком много попыток. Подождите 10 минут или напишите Андрею');
      const codeHash = await hash(code);
      const keyHash = await hash(key);
      // Resolve the asset before spending a code. A deployment error must not burn access.
      const asset = await env.ASSETS.fetch(new Request('https://private.invalid'+product.asset));
      if(!asset.ok)return reply(503,'Материал временно недоступен. Код сохранён, попробуйте позже');
      const claimed = await env.DB.prepare('UPDATE product_codes SET redeemed_at=?,redemption_hash=? WHERE code_hash=? AND product=? AND redeemed_at IS NULL RETURNING code_hash').bind(now,keyHash,codeHash,data.product).first();
      if(!claimed){
        const previous = await env.DB.prepare('SELECT product,redeemed_at,redemption_hash FROM product_codes WHERE code_hash=?').bind(codeHash).first();
        if(!previous)return reply(404,'Код не найден. Проверьте символы или напишите Андрею');
        if(previous.product!==data.product)return reply(409,'Этот код относится к другому практикуму. Откройте нужную страницу',{product:previous.product});
        if(previous.redemption_hash!==keyHash || now-previous.redeemed_at>86400000)return reply(409,'Код уже активирован. Повторите скачивание в том же браузере в течение суток или напишите Андрею');
      }
      // Measurement must never block delivery. Forced preview links omit the
      // anonymous visitor, so the owner's checks do not count as conversions.
      if(claimed && ['a','b'].includes(data.variant) && /^[a-zA-Z0-9-]{30,50}$/.test(data.visitor||'')){
        try{
          const visitorHash=await hash(data.visitor);
          const firstView=await env.DB.prepare('SELECT variant FROM product_ab_views WHERE visitor_hash=? AND product=?').bind(visitorHash,data.product).first();
          await env.DB.prepare('INSERT OR IGNORE INTO product_ab_redemptions(code_hash,product,variant,visitor_hash,created_at) VALUES(?,?,?,?,?)').bind(codeHash,data.product,firstView?.variant||data.variant,visitorHash,now).run();
        }catch{}
      }
      await env.DB.prepare('DELETE FROM product_attempts WHERE expires_at<?').bind(now).run();
      return new Response(asset.body,{status:200,headers:{
        'Content-Type':'application/zip','Content-Disposition':`attachment; filename="${product.file}"`,
        'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'
      }});
    } catch {
      return reply(503,'Сервис временно недоступен. Повторите в этом браузере с тем же кодом. Если не получится, напишите Андрею');
    }
  }
};
