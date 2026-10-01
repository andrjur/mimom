import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());await page.addInitScript(()=>{sessionStorage.setItem('study_teacher','true');if(!localStorage.getItem('study_selected_topics'))localStorage.setItem('study_selected_topics',JSON.stringify(['Логика']));});});
async function chooseDeck(page,topic){await page.getByRole('button',{name:'Выбрать колоду',exact:true}).click();await page.getByRole('button',{name:'Учить '+topic,exact:true}).click();}

import {randomBytes} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import {installSocial} from '../social.ts';
const stamp=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
test('partial migration, auto visit, points, future and undo',async({page})=>{
 const now=new Date(),today=stamp(now);await page.addInitScript(({today})=>{localStorage.setItem('repetitor_tracker_cells_v3',JSON.stringify({['h2_'+today]:'cyclic'}));},{today});
 await page.goto('/');expect(await page.evaluate(today=>JSON.parse(localStorage.getItem('repetitor_tracker_cells_v3'))['h1_'+today],today)).toBe('done');
 await page.getByRole('button',{name:'Мой трекер',exact:true}).click();await expect(page.getByTestId('tracker-total')).toHaveText('1,5');
 const cell=page.getByRole('button',{name:new RegExp('^Учил карточки, '+now.getDate()+'\\.'+(now.getMonth()+1)+'\\.'+now.getFullYear())});await expect(cell).toHaveAttribute('aria-label',/partial$/);await cell.click();await expect(page.getByTestId('tracker-total')).toHaveText('1');await page.getByRole('button',{name:'Отменить отметку'}).click();await expect(page.getByTestId('tracker-total')).toHaveText('1,5');
 await page.getByLabel('Перейти к дате').fill('2030-02-05');await page.getByRole('button',{name:/^Учил карточки, 5\.2\.2030/}).click();await expect(page.getByTestId('tracker-total')).toHaveText('0');await page.getByRole('button',{name:'Сегодня',exact:true}).click();await expect(page.getByTestId('tracker-total')).toHaveText('1,5');
 await page.setViewportSize({width:1440,height:1050});await page.screenshot({path:'../../preview-v4-tracker.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.screenshot({path:'../../preview-v4-mobile.png',fullPage:true});
});
test('physics MathML fractions and optional hints; teacher board',async({page})=>{
 await page.goto('/');await page.getByLabel('Поиск колод').fill('Механика');await chooseDeck(page,'ЕГЭ Физика · Механика');await expect(page.getByLabel('Подсказки включены')).toBeVisible();await page.getByRole('button',{name:/Подсказка 1/}).click();await expect(page.locator('.card-hint .rich-line').first()).toBeVisible();await page.getByLabel('Подсказки включены').uncheck();await expect(page.locator('.hint-step')).toHaveCount(0);await page.getByRole('button',{name:/^Показать ответ/}).click();await expect(page.locator('math mfrac').first()).toBeVisible();await expect(page.locator('math')).toHaveCount(1);await page.locator('math').first().scrollIntoViewIfNeeded();await page.screenshot({path:'../../preview-v4-formula.png'});
 await page.getByRole('button',{name:'Для учителя',exact:true}).click();await page.getByLabel('Поиск карточек').fill('Кинематика');await expect(page.locator('.teacher-note').first()).toBeVisible();await page.screenshot({path:'../../preview-v4-teacher.png',fullPage:true});
});
test('friend consent enforced server side, single use invites and revocation',async({request})=>{
 const app=express();app.use(express.json());const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cards-social-test-'));installSocial(app,path.join(dir,'state.json'));const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const base='http://127.0.0.1:'+server.address().port;
 try{
 const a=randomBytes(32).toString('hex'),b=randomBytes(32).toString('hex'),c=randomBytes(32).toString('hex');
 const send=(token,action,data={})=>request.post(base+'/api/social/'+action,{headers:{'x-tracker-token':token},data});
 for(const [token,name] of [[a,'Аня'],[b,'Боря'],[c,'Чужой']])expect((await send(token,'sync',{name,habits:[{id:'h1',name:'Заход',category:'daily'}],cells:{'h1_2026-09-23':'partial'}})).ok()).toBe(true);
 const invite=(await (await send(a,'invite')).json()).token;expect((await send(a,'accept',{token:invite})).status()).toBe(400);expect((await send(b,'preview',{token:invite})).ok()).toBe(true);expect((await (await send(b,'list')).json()).friends).toEqual([]);
 // Derive owner id to ensure even a guessed identity grants no access.
 const {createHash}=await import('node:crypto'),aid=createHash('sha256').update(a).digest('hex');expect((await send(b,'view',{id:aid})).status()).toBe(400);
 expect((await send(b,'accept',{token:invite})).ok()).toBe(true);expect((await send(c,'accept',{token:invite})).status()).toBe(400);expect((await send(c,'view',{id:aid})).status()).toBe(400);
 const list=(await (await send(b,'list')).json()).friends;expect(list[0].name).toBe('Аня');expect((await (await send(b,'view',{id:list[0].id})).json()).cells['h1_2026-09-23']).toBe('partial');await send(b,'revoke',{id:list[0].id});expect((await send(b,'view',{id:list[0].id})).status()).toBe(400);expect((await (await send(a,'list')).json()).friends).toEqual([]);
 }finally{await new Promise(r=>server.close(r));}
});
test('migrate old Gemini and refresh provider models without changing key',async({page,request})=>{
 await page.addInitScript(()=>localStorage.setItem('repetitor_user_ai_config_v1',JSON.stringify({enabled:true,format:'gemini',endpoint:'https://generativelanguage.googleapis.com',model:'gemini-2.5-flash',apiKey:''})));
 await page.route('**/api/models',r=>r.fulfill({json:{models:[{id:'gemini-3.8-flash',name:'Gemini 3.8 Flash'}]}}));await page.goto('/');await page.getByRole('button',{name:'Подключить свой ИИ',exact:true}).click();await expect(page.getByLabel('Модель',{exact:true})).toHaveValue('gemini-3.8-flash');await page.getByRole('button',{name:'Обновить модели у провайдера'}).click();await expect(page.locator('#provider-models option')).toHaveCount(1);await expect(page.getByRole('button',{name:'RouterAI',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'VseGPT',exact:true})).toBeVisible();
 const r=await request.post('/api/models',{data:{aiConfig:{format:'openai-compatible',apiKey:'test',endpoint:'http://169.254.169.254'}}});expect(r.status()).toBe(400);expect((await r.json()).error).toContain('не разрешён');
});
