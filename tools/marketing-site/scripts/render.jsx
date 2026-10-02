import fs from 'node:fs';
import path from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import Home from '../app/page.js';
import Route from '../app/[slug]/page.js';
import {pages} from '../lib/pages.js';
const root=process.argv[2];
const source=path.join(root,'tools/marketing-site');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
function save(slug,element,title,description){
 const url='https://indikov.ru/'+(slug?slug+'/':'');
 const html='<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(title)+'</title><meta name="description" content="'+escape(description)+'"><link rel="canonical" href="'+url+'"><meta property="og:title" content="'+escape(title)+'"><meta property="og:description" content="'+escape(description)+'"><meta property="og:url" content="'+url+'"><meta property="og:type" content="website"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/marketing.css?v=20261002"><script defer src="/assets/marketing.js?v=20261002"></script>'+(['apply','thank-you'].includes(slug)?'<meta name="robots" content="noindex,follow">':'')+'</head><body>'+renderToStaticMarkup(element)+'</body></html>';
 const dir=slug?path.join(root,slug):root;fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html.replaceAll(String.fromCharCode(8212),'-'));
}
async function main(){
save('',<Home/>,'Андрей Индыков | Типология, продуктивность и обучение ИИ','Программы и практики для взрослых: типология, личное сопровождение, самоаудит и ИИ на рабочих задачах.');
for(const slug of Object.keys(pages)){if(slug==='articles')continue;save(slug,await Route({params:{slug}}),pages[slug].title+' | Андрей Индыков',pages[slug].lead);}
fs.mkdirSync(path.join(root,'assets'),{recursive:true});fs.copyFileSync(path.join(source,'app/style.css'),path.join(root,'assets/marketing.css'));
fs.copyFileSync(path.join(source,'public/marketing.js'),path.join(root,'assets/marketing.js'));
for(const file of fs.readdirSync(path.join(source,'public'))){if(['.nojekyll','sitemap.xml','robots.txt','marketing.js'].includes(file))continue;fs.copyFileSync(path.join(source,'public',file),path.join(root,file));}
console.log('Exported home and '+(Object.keys(pages).length-1)+' product pages; preserved the article archive and school pages.');

}
main().catch(error=>{console.error(error);process.exit(1)});
