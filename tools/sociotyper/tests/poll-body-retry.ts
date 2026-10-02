import assert from 'node:assert/strict';
import { pollAnalysis } from '../services/typistApi';

const originalFetch=globalThis.fetch;
const urls:string[]=[];
const logs:any[]=[];
try {
  globalThis.fetch=(async (input:any)=>{
    urls.push(String(input));
    if(urls.length===1)return {ok:true,json:async()=>{throw new DOMException('Body timed out','TimeoutError');}} as Response;
    if(urls.length===2)return {ok:true,json:async()=>({status:'running',events:[],cursor:7,hasMore:true})} as Response;
    return {ok:true,json:async()=>({status:'complete',result:{tim:{abbreviation:'ЛИИ',name:'Робеспьер'},confidence:0}})} as Response;
  }) as typeof fetch;
  const result=await pollAnalysis('fixture-job',undefined,entry=>logs.push(entry));
  assert.equal(urls.length,3);
  assert.match(urls[0],/after=0$/);
  assert.match(urls[1],/after=0$/,'A failed body must not advance the cursor');
  assert.match(urls[2],/after=7$/);
  assert.equal(logs.filter(l=>l.event==='connection.retry').length,1);
  assert.equal(result.result.tim.abbreviation,'ЛИИ');

  const controller=new AbortController();
  let calls=0;
  globalThis.fetch=(async()=>{
    calls++;
    return {ok:true,json:async()=>{controller.abort();throw new DOMException('Aborted','AbortError');}} as Response;
  }) as typeof fetch;
  await assert.rejects(()=>pollAnalysis('cancelled-job',controller.signal),{name:'AbortError'});
  assert.equal(calls,1,'Explicit cancellation must not retry');
  console.log('PASS: body timeout retries with preserved cursor; cancellation stops immediately');
} finally { globalThis.fetch=originalFetch; }
