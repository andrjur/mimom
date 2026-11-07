import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import worker,{hash} from './worker.mjs';
function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(fs.readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
 return {sqlite,env:{DB:{prepare(sql){let args=[];return {bind(...a){args=a;return this},async first(){return sqlite.prepare(sql).get(...args)},async run(){return sqlite.prepare(sql).run(...args)}}}},ASSETS:{async fetch(){return new Response('zip-content',{headers:{'Content-Type':'application/zip'}})}}}};
}
const token='1234-5678-9012',key='12345678-1234-4234-8234-123456789abc';
async function seed(f,code=token,product='start'){f.sqlite.prepare('INSERT INTO product_codes (code_hash,product) VALUES (?,?)').run(await hash(code.replaceAll('-','')),product)}
function req(code=token,k=key,product='start',ip='one'){return new Request('https://indikov.ru/api/products/redeem',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://indikov.ru','Idempotency-Key':k,'CF-Connecting-IP':ip},body:JSON.stringify({code,product})})}
test('one activation wins under concurrency, same browser can recover',async()=>{const f=fixture();await seed(f);const responses=await Promise.all(Array.from({length:8},(_,i)=>worker.fetch(req(token,key.slice(0,-1)+i),f.env)));assert.equal(responses.filter(r=>r.status===200).length,1);const row=f.sqlite.prepare('SELECT * FROM product_codes').get();assert.ok(row.redeemed_at);const winning=responses.findIndex(r=>r.status===200);assert.equal((await worker.fetch(req(token,key.slice(0,-1)+winning),f.env)).status,200);assert.equal((await worker.fetch(req(token,'unrelated-browser-1234567890'),f.env)).status,409);f.sqlite.close()});
test('wrong product does not burn code; normalized spoken code works',async()=>{const f=fixture();await seed(f);assert.equal((await worker.fetch(req(token,key,'ai'),f.env)).status,409);assert.equal(f.sqlite.prepare('SELECT redeemed_at FROM product_codes').get().redeemed_at,null);const r=await worker.fetch(req(' 1234 5678 9012 '),f.env);assert.equal(r.status,200);assert.equal(await r.text(),'zip-content');assert.match(r.headers.get('Content-Disposition'),/attachment/);f.sqlite.close()});
test('missing asset preserves code and private files have no route',async()=>{const f=fixture();await seed(f);f.env.ASSETS.fetch=async()=>new Response('not found',{status:404});assert.equal((await worker.fetch(req(),f.env)).status,503);assert.equal(f.sqlite.prepare('SELECT redeemed_at FROM product_codes').get().redeemed_at,null);for(const path of ['/start.zip','/ai.zip','/private-assets/start.zip'])assert.equal((await worker.fetch(new Request('https://indikov-products.example.workers.dev'+path),f.env)).status,404);f.sqlite.close()});
test('invalid origin, malformed input, expiry and rate limit',async()=>{const f=fixture();await seed(f);const bad=req();bad.headers.set('Origin','https://evil.example');assert.equal((await worker.fetch(bad,f.env)).status,403);assert.equal((await worker.fetch(req('nope'),f.env)).status,400);assert.equal((await worker.fetch(req(),f.env)).status,200);f.sqlite.prepare('UPDATE product_codes SET redeemed_at=?').run(Date.now()-86401000);assert.equal((await worker.fetch(req(),f.env)).status,409);for(let i=0;i<14;i++)await worker.fetch(req('9999-9999-9999'),f.env);assert.equal((await worker.fetch(req('9999-9999-9999'),f.env)).status,429);f.sqlite.close()});
test('experiment deduplicates visits and attributes activation to first view',async()=>{
 const f=fixture();await seed(f);const visitor='abcdefab-1234-4567-8901-abcdefabcdef';
 for(const variant of ['a','b']){
  const view=new Request('https://indikov.ru/api/products/event',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://indikov.ru'},body:JSON.stringify({product:'start',variant,visitor})});
  assert.equal((await worker.fetch(view,f.env)).status,200);
 }
 assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM product_ab_views').get().n,1);
 const activate=()=>new Request('https://indikov.ru/api/products/redeem',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://indikov.ru','Idempotency-Key':key},body:JSON.stringify({product:'start',code:token,variant:'b',visitor})});
 assert.equal((await worker.fetch(activate(),f.env)).status,200);assert.equal((await worker.fetch(activate(),f.env)).status,200);
 const row=f.sqlite.prepare('SELECT * FROM product_ab_redemptions').get();assert.equal(row.variant,'a');assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM product_ab_redemptions').get().n,1);assert.notEqual(row.visitor_hash,visitor);f.sqlite.close();
});
test('preview access does not enter experiment statistics',async()=>{const f=fixture();await seed(f);assert.equal((await worker.fetch(req(),f.env)).status,200);assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM product_ab_redemptions').get().n,0);f.sqlite.close()});
