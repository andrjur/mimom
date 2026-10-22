import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {readPosts,renderArticles} from './preview.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const manifest=JSON.parse(fs.readFileSync(path.join(repo,'tools/marketing-site/content/campaigns.json'),'utf8'));
const posts=readPosts();const newPosts=posts.filter(p=>p.funnel===true);assert.equal(newPosts.length,10);assert.equal(new Set(newPosts.map(p=>p.url)).size,10);
const rendered=await renderArticles();
function exists(url){const p=new URL(url,'https://indikov.ru');if(p.origin!=='https://indikov.ru')return true;if(rendered.has(p.pathname))return true;const file=path.join(repo,decodeURIComponent(p.pathname));return fs.existsSync(file)&&(!fs.statSync(file).isDirectory()||fs.existsSync(path.join(file,'index.html')));}
for(const p of newPosts){assert.ok(p.description&&p.title&&p.image&&p.practice_title);assert.equal(p.practice_fields.length,3);assert.ok(manifest.some(m=>m.url==='https://indikov.ru'+p.url));assert.ok(fs.existsSync(path.join(repo,p.image)));assert.ok(p.content.split(/\s+/).length>=350);assert.ok(!p.content.includes(String.fromCharCode(8212)));for(const url of [p.cta_url,p.tool_url]){assert.ok(exists(url),'Broken next step: '+url);assert.equal(new URL(url,'https://indikov.ru').searchParams.get('entry'),p.url.split('/').filter(Boolean).at(-1));}for(const match of p.content.matchAll(/\]\((\/[^)]+)\)/g))assert.ok(exists(match[1]),'Broken article link: '+match[1]);const html=rendered.get(p.url);assert.ok(!html.includes('{%')&&!html.includes('{{'),'Unrendered Liquid');assert.ok(html.includes('data-practice')&&html.includes('data-practice-download'));assert.ok(html.includes('property="og:image"'));}
for(const f of ['assets/marketing.js','assets/life-tools.js'])new vm.Script(fs.readFileSync(path.join(repo,f),'utf8'),{filename:f});
for(const f of ['index.html','_includes/site-nav.html','_layouts/default.html','_layouts/post.html','tools/marketing-site/components/SiteShell.js']){const s=fs.readFileSync(path.join(repo,f),'utf8');assert.ok(!/href=["']\/(?:mila\.html|about\.html|pereSBorka\.html|repetitor\/)/.test(s),'Hidden route exposed: '+f);}
for(const f of ['mila.html','about.html','pereSBorka.html','repetitor/index.html','repetitor/cards/index.html'])assert.ok(fs.existsSync(path.join(repo,f)),'Preserved route missing: '+f);
const home=fs.readFileSync(path.join(repo,'index.html'),'utf8');for(const m of home.matchAll(/href="(\/[^"#]*)"/g))assert.ok(exists(m[1]),'Broken homepage link: '+m[1]);
if(process.argv.includes('--built')){const dir=path.resolve(repo,process.argv[process.argv.indexOf('--built')+1]);for(const p of newPosts){const html=fs.readFileSync(path.join(dir,p.url,'index.html'),'utf8');assert.ok(html.includes(p.title)&&html.includes('data-practice'),'Missing production article');assert.ok(!html.includes('{%')&&!html.includes('{{'));}}
console.log('Passed: 10 articles, worksheet templates, covers, metadata, next steps, homepage links, preserved direct routes and script syntax.');
