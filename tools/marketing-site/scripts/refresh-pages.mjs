import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const refresh='<link rel="stylesheet" href="/assets/site-refresh.css?v=20261108"><script defer src="/assets/site-refresh.js?v=20261108"></script>';
let count=0;
function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name.startsWith('.')||['tools','assets','node_modules','vendor'].includes(e.name))continue;const f=path.join(dir,e.name);if(e.isDirectory())visit(f);else if(e.name.endsWith('.html')){let s=fs.readFileSync(f,'utf8');if(!s.includes('</head>'))continue;const rel=path.relative(root,f).replaceAll('\\','/');if(!s.includes('site-refresh.css'))s=s.replace('</head>',refresh+'</head>');
 if(rel.startsWith('neurocoaching/'))s=s.replace("<h2>Видео и аудио</h2><div class='slot'>Место для видео: вставьте сюда ссылку или iframe.</div><div class='slot'>Место для аудио: вставьте сюда плеер или ссылку.</div><p class='note'>Материал можно проходить в своём темпе. Запишите вывод сразу после просмотра или прослушивания.</p>","<h2>Работа с текстом</h2><p>На этой странице доступен текстовый материал. Видео и аудио пока не опубликованы.</p><p>Выберите одну ситуацию из своей жизни. Запишите наблюдение, возможное объяснение и маленькую пробу. После попытки сравните ожидание с результатом.</p>");
 const service=/^(?:code_artifact\.html|404\.html|.*\/404\.html|sociotyper\/cloudflare-worker\/)/.test(rel);
 if(service&&!/name=["']robots["']/.test(s))s=s.replace('</head>','<meta name="robots" content="noindex,follow"></head>');
 if(!/name=["']description["']/.test(s)&&!service){const title=(s.match(/<title[^>]*>([^<]+)/i)||[])[1];if(title){const d=(title.replaceAll('"','&quot;').replaceAll(String.fromCharCode(8212),'-')+'. Материал на сайте Андрея Индыкова.');s=s.replace('</head>','<meta name="description" content="'+d+'"></head>');}}
 fs.writeFileSync(f,s.replaceAll(String.fromCharCode(8212),'-').split(/\r?\n/).map(line=>line.trimEnd()).join('\n'));count++;
}}}
visit(root);console.log('Shared navigation, metadata and honest media states: '+count+' HTML files.');
