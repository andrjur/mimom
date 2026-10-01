import {createHash} from 'node:crypto';
export const AI_TIMEOUT_MS=270000;
export const KNYAZEV_MODELS=['minimax-2.7','deepseek-v4-flash','kimi-2.6'];
const cursors=new Map<string,number>();
export class ProviderError extends Error { status:number; constructor(status:number){super(`Провайдер ИИ вернул HTTP ${status}. Проверьте ключ, модель, лимиты и доступность провайдера.`);this.status=status;} }
export function isKnyazev(config:any){try{return config?.enabled&&config.format==='openai-compatible'&&new URL(config.endpoint).origin==='https://knyazevai.work';}catch{return false;}}
export async function withModelRotation<T>(config:any,run:(config:any)=>Promise<T>,pause:(ms:number)=>Promise<void>=ms=>new Promise(r=>setTimeout(r,ms))){
 if(!isKnyazev(config))return run(config);
 const models=Array.from(new Set((Array.isArray(config.models)&&config.models.length?config.models:KNYAZEV_MODELS).filter((m:unknown)=>typeof m==='string'&&m.length>0&&m.length<=150))).slice(0,3) as string[];
 if(!models.length)throw Error('Укажите хотя бы одну модель Knyazev AI.');
 const key=createHash('sha256').update(String(config.apiKey||'')).digest('hex');
 const start=(cursors.get(key)||0)%models.length;
 if(cursors.size>1000)cursors.clear();cursors.set(key,(start+1)%models.length);
 for(let attempt=0;attempt<models.length;attempt++){
  try{return await run({...config,model:models[(start+attempt)%models.length]});}
  catch(e){const retry=e instanceof ProviderError?[408,429,500,502,503,504].includes(e.status):e instanceof Error&&['TimeoutError','AbortError','TypeError'].includes(e.name);
   if(!retry)throw e;
   if(attempt===models.length-1)throw Error('Все выбранные модели Knyazev AI временно недоступны. Попробуйте позже. Автоматических попыток больше не будет.');
   await pause(1000*(attempt+1));
  }
 }
 throw Error('Модель недоступна');
}
