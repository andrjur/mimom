import fs from 'node:fs';
import assert from 'node:assert/strict';
import {productVariantA} from '../lib/product-variant-a.js';
import {productVariantB} from '../lib/product-variant-b.js';
const strings=value=>typeof value==='string'?[value]:Array.isArray(value)?value.flatMap(strings):Object.values(value).flatMap(strings);
for(const [variant,copy] of Object.entries({a:productVariantA,b:productVariantB}))for(const [id,data] of Object.entries(copy)){
 const narrative=strings(data).join(' ');assert.ok(narrative.length>=4500,`${id}/${variant}: short copy ${narrative.length}`);assert.ok(!narrative.includes(String.fromCharCode(8212)));
 const slug=id==='start'?'hochu-no-ne-delayu':'ii-ne-poddakivay';const file=slug+(variant==='b'?'/b':'')+'/index.html';const html=fs.readFileSync(file,'utf8');
 assert.ok(html.includes(data.headline));assert.ok(html.includes('data-variant="'+variant+'"'));assert.ok(html.includes('/assets/products.js'));assert.ok(html.includes('Одноразовый код'));
 assert.ok(!html.includes('codes-import')&&!html.includes('private-assets'));if(variant==='b')assert.ok(html.includes('noindex,follow'));
 const text=html.match(/<main[^>]*>([\s\S]*?)<\/main>/)[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
 console.log(`${id} / ${variant.toUpperCase()}: narrative ${narrative.length} chars, complete landing ${text.length} chars`);
}
console.log('Four landing variants, access forms, canonical variants and text lengths verified.');
