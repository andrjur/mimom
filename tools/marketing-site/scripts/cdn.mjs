import fs from 'node:fs';
import path from 'node:path';
export function routeStaticAssets(repo,sha){
 const prefix='https://cdn.jsdelivr.net/gh/andrjur/mimom@'+sha;
 let count=0;
 function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','tools','docs'].includes(e.name))continue;const file=path.join(dir,e.name);if(e.isDirectory())visit(file);else if(e.name.endsWith('.html')){let html=fs.readFileSync(file,'utf8');const next=html.replace(/((?:src|href)=['"])(\/[^'"?#]+\.(?:js|css|png|jpe?g|gif|webp|svg|xlsx))(?:\?[^'"]*)?(['"])/gi,(full,before,url,after)=>{if(!fs.existsSync(path.join(repo,url)))return full;count++;return before+prefix+url+after;});if(next!==html)fs.writeFileSync(file,next);}}}
 visit(repo);console.log('Routed '+count+' static references to pinned CDN.');
}
