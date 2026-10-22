import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const games=JSON.parse(fs.readFileSync(path.join(repo,'tools/marketing-site/content/family-experiments.json'),'utf8'));
const out=path.join(repo,'assets/family-experiments');fs.mkdirSync(out,{recursive:true});
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const colors=['#dff39a','#ccebef','#e3d9fa'];
function wrap(text,max=17){const result=[];let row='';for(const word of text.split(' ')){if(row&&row.length+word.length+1>max){result.push(row);row=word;}else row+=(row?' ':'')+word;}if(row)result.push(row);return result;}
function diagram(e,kind){const accent=colors[e.tier-1],elements=[],nodes=[],lines=[];let uid=0;
 const base=(type,x,y,w,h)=>({id:e.id+'-'+kind+'-'+uid++,type,x,y,width:w,height:h,angle:0,strokeColor:'#28232f',backgroundColor:'transparent',fillStyle:'solid',strokeWidth:1.5,strokeStyle:'solid',roughness:0,opacity:100,groupIds:[],frameId:null,roundness:null,seed:1000+uid,version:1,versionNonce:uid,index:null,isDeleted:false,boundElements:null,updated:1,link:null,locked:false});
 function text(s,x,y,w,size=26,center=true,container=null){const rows=wrap(s,Math.floor(w/(size*.55)));const h=rows.length*size*1.25;const el={...base('text',x,y,w,h),text:rows.join('\n'),originalText:rows.join('\n'),fontSize:size,fontFamily:2,textAlign:center?'center':'left',verticalAlign:'middle',containerId:container,autoResize:true,lineHeight:1.25};elements.push(el);return el;}
 function node(label,x,y,w,h,role='action',fill='#f1eef6'){const el={...base('rectangle',x,y,w,h),backgroundColor:fill,roundness:{type:3},customData:{role:'node',nodeId:e.id+'-'+kind+'-'+nodes.length,kind:role}};elements.push(el);const t=text(label,x+12,y+h/2-wrap(label,Math.floor((w-24)/(26*.55))).length*26*1.25/2,w-24,26,true,el.id);el.boundElements=[{id:t.id,type:'text'}];nodes.push({label,x,y,w,h,fill,rows:t.text.split('\n'),role});}
 function line(x1,y1,x2,y2,arrow=true){lines.push({x1,y1,x2,y2,arrow});elements.push({...base(arrow?'arrow':'line',Math.min(x1,x2),Math.min(y1,y2),Math.abs(x2-x1),Math.abs(y2-y1)),points:[[x1<=x2?0:Math.abs(x2-x1),y1<=y2?0:Math.abs(y2-y1)],[x1<=x2?Math.abs(x2-x1):0,y1<=y2?Math.abs(y2-y1):0]],startBinding:null,endBinding:null,startArrowhead:null,endArrowhead:arrow?'arrow':null});}
 const heading=kind==='route'?'Как играть':e.mapTitle;
 const header=text(heading,24,22,352,28,false);if(header.height>80)throw new Error('Long heading '+e.id);
 if(kind==='route'){e.flow.forEach((s,i)=>{node(s,56,116+i*84,288,78,i===0?'input':i===3?'result':'action',i===3?accent:'#f4f2ed');if(i<3)line(200,195+i*84,200,198+i*84);});}
 else if(e.mapType==='grid'){e.map.forEach((s,i)=>node(s,22+(i%2)*184,126+Math.floor(i/2)*164,172,146,i===3?'result':'action',i===3?accent:'#f4f2ed'));}
 else if(e.mapType==='compare'){line(200,116,200,432,false);e.map.forEach((s,i)=>node(s,i<2?22:212,i%2===0?130:275,166,128,i%2===0?'input':'result',i%2===0?accent:'#f4f2ed'));}
 else if(e.mapType==='cycle'){node(e.map[0],28,120,155,118,'input',accent);node(e.map[1],217,120,155,118);node(e.map[2],217,294,155,118,'decision','#fff3bf');node(e.map[3],28,294,155,118,'result',accent);line(187,179,211,179);line(295,244,295,285);line(211,353,188,353);line(105,286,105,245);}
 else{e.map.forEach((s,i)=>{node(s,28+i*12,120+i*81,308-i*12,65,i===3?'result':'action',i===3?accent:'#f4f2ed');});}
 const source={type:'excalidraw',version:2,source:'https://indikov.ru/family-experiments/#'+e.id,elements,appState:{viewBackgroundColor:'#fffdf8',gridSize:null},files:{}};
 for(const n of nodes){if(n.rows.length*32.5>n.h-12)throw new Error('Overflow '+e.id+' '+n.label);for(const row of n.rows)if(row.length>24)throw new Error('Long line '+row);}
 let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="400" height="480" role="img" aria-labelledby="title desc"><title id="title">'+esc(heading)+'</title><desc id="desc">'+esc((kind==='route'?e.flow:e.map).join('; '))+'</desc><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M1 1 L6 4 L1 7" fill="none" stroke="#51465f" stroke-width="1.5"/></marker></defs><rect width="400" height="480" rx="12" fill="#fffdf8"/><rect x="24" y="92" width="48" height="6" rx="3" fill="'+accent+'"/>';
 svg+='<g font-family="Arial, sans-serif" fill="#28232f">'+header.text.split('\n').map((s,i)=>'<text x="24" y="'+(48+i*35)+'" font-size="28" font-weight="700">'+esc(s)+'</text>').join('');
 for(const l of lines)svg+='<line x1="'+l.x1+'" y1="'+l.y1+'" x2="'+l.x2+'" y2="'+l.y2+'" stroke="#51465f" stroke-width="2"'+(l.arrow?' marker-end="url(#arrow)"':'')+'/>';
 for(const n of nodes){svg+='<rect x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" rx="12" fill="'+n.fill+'" stroke="#9d93a8" stroke-width="1.3"/>';n.rows.forEach((s,i)=>{svg+='<text x="'+(n.x+n.w/2)+'" y="'+(n.y+n.h/2+(i-(n.rows.length-1)/2)*32.5+9)+'" text-anchor="middle" font-size="26">'+esc(s)+'</text>';});}
 svg+='</g></svg>';return{svg,source};
}
for(const e of games)for(const kind of ['route','map']){const result=diagram(e,kind);const file=path.join(out,e.id+'-'+kind);fs.writeFileSync(file+'.svg',result.svg);fs.writeFileSync(file+'.excalidraw',JSON.stringify(result.source,null,2));}
console.log('Generated 60 SVG diagrams and 60 editable Excalidraw sources.');
