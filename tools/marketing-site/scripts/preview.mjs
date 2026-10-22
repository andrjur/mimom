// Local preview for the Jekyll article templates when Ruby is unavailable.
// Production compilation is checked separately with GitHub's Jekyll action.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {Liquid} from 'liquidjs';
import {marked} from 'marked';
import {parse} from 'yaml';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
export function splitFrontmatter(text){const m=text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)/);return m?{data:parse(m[1]),content:m[2]}:{data:{},content:text};}
export function readPosts(){return fs.readdirSync(path.join(repo,'_posts')).filter(f=>f.endsWith('.md')).map(file=>{const p=splitFrontmatter(fs.readFileSync(path.join(repo,'_posts',file),'utf8'));const date=p.data.date||file.slice(0,10)+'T09:00:00+03:00';return {...p.data,file,date,url:p.data.permalink||'/articles/'+file.slice(11,-3)+'/',content:p.content};}).sort((a,b)=>String(b.date).localeCompare(String(a.date))||a.file.localeCompare(b.file));}
export async function renderArticles(){
 const site={...parse(fs.readFileSync(path.join(repo,'_config.yml'),'utf8')),posts:readPosts()};
 const engine=new Liquid();engine.registerFilter('absolute_url',s=>new URL(s||'/',site.url).href);engine.registerFilter('relative_url',s=>s);
 const template=name=>splitFrontmatter(fs.readFileSync(path.join(repo,'_layouts',name+'.html'),'utf8')).content;
 const include=s=>s.replace(/{%\s*include\s+([\w.-]+)\s*%}/g,(_,name)=>fs.readFileSync(path.join(repo,'_includes',name),'utf8'));
 const render=(s,data)=>engine.parseAndRender(include(s),{site,...data});
 const pages=new Map();
 for(const post of site.posts){const content=marked.parse(await render(post.content,{page:post}));const article=await render(template('post'),{page:post,content});pages.set(post.url,await render(template('default'),{page:post,content:article}));}
 const listing=splitFrontmatter(fs.readFileSync(path.join(repo,'articles/index.html'),'utf8'));const page={...listing.data,url:'/articles/'};const content=await render(listing.content,{page});pages.set('/articles/',await render(template('default'),{page,content}));
 return pages;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const pages=await renderArticles();const port=Number(process.argv[2]||4775);
 const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
 const server=http.createServer((req,res)=>{let url;try{url=new URL(req.url,'http://localhost');}catch{res.writeHead(400).end();return;}let body=pages.get(url.pathname);let file=path.resolve(repo,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(repo+path.sep)&&file!==repo){res.writeHead(403).end();return;}if(body===undefined){if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)){res.writeHead(404).end('Not found');return;}body=fs.readFileSync(file);}const ext=pages.has(url.pathname)?'.html':path.extname(file);if(ext==='.html')body=String(body).replace(/https:\/\/cdn\.jsdelivr\.net\/gh\/andrjur\/mimom@[^/"']+/g,'');res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);});
 server.listen(port,'127.0.0.1',()=>console.log('Preview ready: http://127.0.0.1:'+port+' ('+pages.size+' article pages)'));
}
