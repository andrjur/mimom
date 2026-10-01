import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());await page.addInitScript(()=>{if(!localStorage.getItem('study_selected_topics'))localStorage.setItem('study_selected_topics',JSON.stringify(['Логика']));});});
async function chooseDeck(page,topic){await page.getByRole('button',{name:'Выбрать колоду',exact:true}).click();await page.getByRole('button',{name:'Учить '+topic,exact:true}).click();}

import {AI_TIMEOUT_MS,KNYAZEV_MODELS,ProviderError,withModelRotation} from '../ai-rotation.ts';
const config=key=>({enabled:true,format:'openai-compatible',endpoint:'https://knyazevai.work/v1',apiKey:key,model:'minimax-2.7'});
test('270 seconds and round robin without external requests',async()=>{
 expect(AI_TIMEOUT_MS).toBe(270000);const used=[];for(let i=0;i<4;i++)await withModelRotation(config('round-test'),async c=>{used.push(c.model);return c.model;});expect(used).toEqual([...KNYAZEV_MODELS,'minimax-2.7']);
});
test('overloads and timeouts rotate; auth errors stop; retries bounded',async()=>{
 const used=[];await withModelRotation(config('retry-test'),async c=>{used.push(c.model);if(used.length===1)throw new ProviderError(429);if(used.length===2)throw new DOMException('timeout','TimeoutError');return 'ok';},async()=>{});expect(used).toEqual(KNYAZEV_MODELS);
 let count=0;await expect(withModelRotation(config('auth-test'),async()=>{count++;throw new ProviderError(401);},async()=>{})).rejects.toThrow('401');expect(count).toBe(1);
 count=0;await expect(withModelRotation(config('max-test'),async()=>{count++;throw new ProviderError(504);},async()=>{})).rejects.toThrow('Все выбранные модели');expect(count).toBe(3);
});
test('home key field works, does not leak key on provider change, cards need no setup',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:/^Показать ответ/})).toBeVisible();const panel=page.getByRole('region',{name:'Быстрое подключение ИИ'});await panel.scrollIntoViewIfNeeded();await page.getByLabel('Провайдер на главной').selectOption('knyazev');await page.getByLabel('API-ключ на главной').fill('test-key');await expect(panel.getByText(/270 секунд/)).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('repetitor_user_ai_config_v1')).apiKey)).toBe('');await page.reload();await expect(page.getByLabel('API-ключ на главной')).toHaveValue('test-key');await page.getByLabel('Провайдер на главной').selectOption('google');await expect(page.getByLabel('API-ключ на главной')).toHaveValue('');await page.setViewportSize({width:390,height:844});await panel.scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.screenshot({path:'../../preview-v3-key-mobile.png'});
});
