import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
let provider,child,lastRequest,mode='normal';
test.beforeAll(async()=>{
 provider=createServer(async(req,res)=>{if(req.method==='GET'&&req.url==='/v1/models'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({data:[{id:'local-chat',name:'Local chat'}]}));}let text='';for await(const chunk of req)text+=chunk;lastRequest={headers:req.headers,body:JSON.parse(text)};res.setHeader('Content-Type','application/json');if(mode==='fail'){res.statusCode=401;return res.end(JSON.stringify({error:'fake provider error'}));}res.end(JSON.stringify({choices:[{message:{content:mode==='json'?JSON.stringify({cards:[{front:'Вопрос?',back:'Точный ответ'}],facts:Array.from({length:7},(_,i)=>({title:'Факт '+i,short:'Точный факт '+i}))}):mode==='badjson'?'oops':'Проверенный ответ от локальной модели'}}]}));});
 await new Promise(r=>provider.listen(3014,'127.0.0.1',r));
 child=spawn(process.execPath,['--experimental-strip-types','server.ts'],{env:{...process.env,PORT:'3013',NODE_ENV:'production',AI_ALLOWED_ORIGINS:'http://127.0.0.1:3014',ENABLE_SHARED_AI:'false',GEMINI_API_KEY:''},windowsHide:true,stdio:'ignore'});
 await expect.poll(async()=>{try{return (await fetch('http://localhost:3013')).status;}catch{return 0;}},{timeout:15000}).toBe(200);
});
test.afterAll(async()=>{child?.kill();await new Promise(r=>provider.close(r));});
const config={enabled:true,format:'openai-compatible',endpoint:'http://127.0.0.1:3014/v1',apiKey:'',model:'local-test'};
test('local provider works without a paid key and respects prompt',async()=>{
 mode='normal';const r=await fetch('http://localhost:3013/api/ask-ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'Сравни импульс и энергию',aiConfig:config})});expect(r.status).toBe(200);expect((await r.json()).source).toBe('custom-ai');expect(lastRequest.headers.authorization).toBeUndefined();expect(lastRequest.body.messages[1].content).toContain('Сравни импульс и энергию');
});
test('generation validates JSON and provider failures do not fabricate cards',async()=>{
 const send=()=>fetch('http://localhost:3013/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:'Физика',count:50,aiConfig:{...config,apiKey:'mock-test-key'}})});
 mode='json';let r=await send();expect(r.status).toBe(200);expect((await r.json()).cards.length).toBe(1);expect(lastRequest.headers.authorization).toBe('Bearer mock-test-key');expect(lastRequest.body.messages[1].content).toContain('50 разных');
 mode='badjson';r=await send();expect(r.status).toBe(400);
 mode='fail';r=await send();expect(r.status).toBe(400);const data=await r.json();expect(data.cards).toBeUndefined();expect(data.error).toContain('HTTP 401');expect(JSON.stringify(data)).not.toContain('mock-test-key');
});

test('model list uses allowed provider endpoint and validates origin',async()=>{const r=await fetch('http://localhost:3013/api/models',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({aiConfig:config})});expect(r.status).toBe(200);expect((await r.json()).models).toEqual([{id:'local-chat',name:'Local chat'}]);});
