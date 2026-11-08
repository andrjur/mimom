import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir='tools/product-delivery/private-assets/dragon-reader';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(f=>f.isDirectory()?walk(path.join(d,f.name)):[path.join(d,f.name)]);
const files=walk(dir),html=files.filter(f=>f.endsWith('.html'));
assert.equal(html.length,42);let images=0;
for(const f of html){const s=fs.readFileSync(f,'utf8');assert.ok(s.includes('noindex,nofollow,noarchive'));assert.ok(s.includes('data-dragon-comments'));assert.ok(!s.includes(String.fromCharCode(8212)));for(const m of s.matchAll(/src="(\/dragon-online\/[^\"]+)"/g)){images++;assert.ok(fs.existsSync(path.join(dir,m[1].slice('/dragon-online/'.length))),m[1]);}}
const biggest=Math.max(...walk('tools/product-delivery/private-assets').map(f=>fs.statSync(f).size));assert.ok(biggest<25*1024*1024);
console.log(JSON.stringify({htmlPages:html.length,images,missingImages:0,maxPrivateFileBytes:biggest,noindex:true}));
