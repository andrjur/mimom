import fs from 'node:fs';
import path from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import Home from '../app/page.js';
import FamilyExperiments from '../components/FamilyExperiments.js';
import ImageLab from '../components/ImageLab.js';
import ProductLanding,{practiceProducts} from '../components/ProductLanding.js';
import OneLayerStories from '../components/OneLayerStories.js';
import Route from '../app/[slug]/page.js';
import {pages} from '../lib/pages.js';
const root=process.argv[2];
const source=path.join(root,'tools/marketing-site');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
function save(slug,element,title,description){
 const productEntry=Object.entries(practiceProducts).find(([,p])=>slug===p.slug||slug===p.slug+'/b');
 const productVariant=slug.endsWith('/b')?'b':'a';
 const url='https://indikov.ru/'+(productEntry?productEntry[1].slug+'/':slug?slug+'/':'');
 const extra=slug==='image-lab'?'<link rel="stylesheet" href="lab.css?v=20261104-camera"><script defer src="lab.js?v=20261104-camera"></script>':slug==='one-layer/stories'?'<style>'+fs.readFileSync(path.join(source,'app/stories.css'),'utf8')+'</style><script defer src="trial.js"></script>':slug==='family-experiments'?'<link rel="stylesheet" href="/assets/family.css"><script defer src="/assets/family.js"></script>':slug==='one-layer'?'<link rel="stylesheet" href="/assets/one-layer.css"><script defer src="/assets/one-layer.js"></script><script defer src="/assets/one-layer-feedback.js"></script>':'';
 const experimentScript=productEntry?`<script>(()=>{try{const product=${JSON.stringify(productEntry[0])},current=${JSON.stringify(productVariant)},base=${JSON.stringify('/'+productEntry[1].slug+'/')},q=new URLSearchParams(location.search),forced=q.get('variant'),key='product-experiment-v1-'+product;let choice;if(forced==='a'||forced==='b')choice=forced;else if(current==='b'){choice='b';if(!localStorage.getItem(key))localStorage.setItem(key,choice)}else{choice=localStorage.getItem(key);if(!['a','b'].includes(choice)){choice=(crypto.getRandomValues(new Uint8Array(1))[0]&1)?'b':'a';localStorage.setItem(key,choice)}}const target=base+(choice==='b'?'b/':'');if(location.pathname!==target)location.replace(target+location.search+location.hash)}catch{}})();</script>`:'';
 const productExtra=productEntry?experimentScript+'<link rel="stylesheet" href="/assets/products.css?v=20261108"><script defer src="/assets/products.js?v=20261108"></script>'+(productVariant==='b'?'<meta name="robots" content="noindex,follow">':''):'';
 const html='<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(title)+'</title><meta name="description" content="'+escape(description)+'"><link rel="canonical" href="'+url+'"><meta property="og:title" content="'+escape(title)+'"><meta property="og:description" content="'+escape(description)+'"><meta property="og:url" content="'+url+'"><meta property="og:type" content="website"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/marketing.css?v=20261002"><script defer src="/assets/marketing.js?v=20261002"></script>'+'<link rel="stylesheet" href="/assets/site-refresh.css?v=20261108"><script defer src="/assets/site-refresh.js?v=20261108"></script>'+extra+productExtra+(['apply','thank-you'].includes(slug)?'<meta name="robots" content="noindex,follow">':'')+'</head><body>'+renderToStaticMarkup(element)+'</body></html>';
 const dir=slug?path.join(root,slug):root;fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html.replaceAll(String.fromCharCode(8212),'-'));
}
async function main(){
for(const [id,p] of Object.entries(practiceProducts)){
save(p.slug,<ProductLanding id={id} variant="a"/>,p.title+' | Практикум Андрея Индыкова',p.lead);
save(p.slug+'/b',<ProductLanding id={id} variant="b"/>,p.title+' | Практикум Андрея Индыкова',p.lead);
}
save('',<Home/>,'Авторский блог | Андрей Индыков','Авторский блог Андрея Индыкова: наблюдения о жизни, общении, обучении и ИИ, разборы знакомых ситуаций и материалы для собственных экспериментов.');
save('family-experiments',<FamilyExperiments/>,'30 семейных экспериментов: игры для пар, семей и партнёров | Андрей Индыков','30 коучинговых игр и упражнений для пар, семей и рабочих партнёров. Три тира по сложности, 60 схем, примеры под спойлерами и готовые маршруты на вечер.');
save('image-lab',<ImageLab/>,'Научи модель видеть разницу | Андрей Индыков','Учебный стенд: соберите примеры с камеры или фотографий, обучите модель изображений и проверьте её на новых кадрах. Обработка в браузере.');
save('one-layer/stories',<OneLayerStories/>,'Жили-были. И застряли. | Андрей Индыков','Десять вымышленных учебных историй о знакомых ситуациях и бесплатная практика «Один слой». Можно выбрать один эпизод и следующую пробу.');
fs.copyFileSync(path.join(source,'public/stories.js'),path.join(root,'one-layer/stories/trial.js'));
for(const slug of Object.keys(pages)){if(slug==='articles')continue;save(slug,await Route({params:{slug}}),pages[slug].title+' | Андрей Индыков',pages[slug].lead);}
fs.mkdirSync(path.join(root,'assets'),{recursive:true});fs.copyFileSync(path.join(source,'app/style.css'),path.join(root,'assets/marketing.css'));
fs.copyFileSync(path.join(source,'public/marketing.js'),path.join(root,'assets/marketing.js'));
fs.copyFileSync(path.join(source,'app/products.css'),path.join(root,'assets/products.css'));
fs.copyFileSync(path.join(source,'public/products.js'),path.join(root,'assets/products.js'));
fs.copyFileSync(path.join(source,'app/family.css'),path.join(root,'assets/family.css'));
fs.copyFileSync(path.join(source,'public/family.js'),path.join(root,'assets/family.js'));
fs.copyFileSync(path.join(source,'app/one-layer.css'),path.join(root,'assets/one-layer.css'));
fs.copyFileSync(path.join(source,'public/one-layer.js'),path.join(root,'assets/one-layer.js'));
fs.copyFileSync(path.join(source,'public/one-layer-feedback.js'),path.join(root,'assets/one-layer-feedback.js'));
for(const file of fs.readdirSync(path.join(source,'public'))){if(['.nojekyll','sitemap.xml','robots.txt','marketing.js','products.js','family.js','one-layer.js','one-layer-feedback.js','stories.js'].includes(file))continue;fs.copyFileSync(path.join(source,'public',file),path.join(root,file));}
console.log('Exported home and '+(Object.keys(pages).length-1)+' product pages; preserved the article archive and school pages.');

}
main().catch(error=>{console.error(error);process.exit(1)});
