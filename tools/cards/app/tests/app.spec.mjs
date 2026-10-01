import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());await page.addInitScript(()=>{sessionStorage.setItem('study_teacher','true');if(!localStorage.getItem('study_selected_topics'))localStorage.setItem('study_selected_topics',JSON.stringify(['Логика']));});});
async function chooseDeck(page,topic){await page.getByRole('button',{name:'Выбрать колоду',exact:true}).click();await page.getByRole('button',{name:'Учить '+topic,exact:true}).click();}

import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync('public/catalog/ege.json','utf8'));
test('catalog has real separated physics topics and valid mathematics',()=>{
 expect(catalog.filter(c=>c.id.startsWith('ege-physics')).length).toBe(234);
 expect(catalog.filter(c=>c.id.startsWith('ege-math')).length).toBe(152);
 expect(new Set(catalog.map(c=>c.id)).size).toBe(catalog.length);
 expect(catalog.some(c=>c.topic==='ЕГЭ Физика · Оптика')).toBe(true);
 expect(catalog.some(c=>c.topic==='ЕГЭ Физика · Механика')).toBe(true);
 for(const c of catalog){expect(c.front.length).toBeGreaterThan(10);expect(c.back.length).toBeGreaterThan(10);expect(c.back).not.toMatch(/undefined|NaN|Факт #/);}
 const triangles=catalog.filter(c=>c.objective==='Прямоугольный треугольник');
 triangles.forEach((c,i)=>{const n=i+1;expect(c.back).toContain(`= ${5*n}`);expect((3*n)**2+(4*n)**2).toBe((5*n)**2);});
});
test('kanban drag in both directions persists and mobile has no overflow',async({page})=>{
 await page.setViewportSize({width:1440,height:960});await page.goto('/');
 const deck=page.locator('[data-deck="Логика"]');await expect(deck).toBeVisible();
 await deck.dragTo(page.locator('[data-column="completed"]'));
 await expect(page.locator('[data-column="completed"] [data-deck="Логика"]')).toBeVisible();
 await page.reload();await expect(page.locator('[data-column="completed"] [data-deck="Логика"]')).toBeVisible();
 await deck.dragTo(page.locator('[data-column="later"]'));
 await expect(page.locator('[data-column="later"] [data-deck="Логика"]')).toBeVisible();
 await page.getByLabel('Статус Логика',{exact:true}).selectOption('active');
 await expect(page.locator('[data-column="active"] [data-deck="Логика"]')).toBeVisible();
 await page.screenshot({path:'../../kanban-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.screenshot({path:'../../kanban-mobile.png'});
});
test('mastery does not overwrite quality; repeat then reward once',async({page})=>{
 await page.goto('/');await chooseDeck(page,'Логика');
 await page.getByRole('button',{name:/^Показать ответ/}).click();await page.getByRole('button',{name:'Плохая',exact:true}).click();await page.getByRole('button',{name:/^Знаю/}).click();
 const first=await page.evaluate(()=>JSON.parse(localStorage.getItem('study_cards_v1')).find(c=>c.id==='log-1'));
 expect(first.quality).toBe('bad');expect(first.mastery).toBe('known');
 for(let i=1;i<20;i++){await page.getByRole('button',{name:/^Показать ответ/}).click();await page.getByRole('button',{name:i===19?/^Не знаю/:/^Знаю/}).click();}
 await expect(page.getByText('Сессия завершена!',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:/^Показать ответ/}).click();await page.getByRole('button',{name:/^Знаю/}).click();
 await expect(page.getByText('Сессия завершена!',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('study_rewards')).xp)).toBe(50);
 await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('study_rewards')).xp)).toBe(50);
});
test('facts open and close and long answers fit',async({page})=>{
 await page.setViewportSize({width:1280,height:900});await page.goto('/');
 await page.getByRole('button',{name:'Открыть',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Забавный факт'});await expect(dialog).toBeVisible();await page.getByRole('button',{name:'Следующий факт'}).click();await expect(dialog.getByText('Факт 2 из 7')).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
 await page.getByRole('button',{name:/^Показать ответ/}).click();const answer=page.locator('[aria-live="polite"]');expect((await answer.boundingBox()).width).toBeGreaterThan(700);await answer.scrollIntoViewIfNeeded();await page.screenshot({path:'../../answer-v2.png'});
});
test('teacher proposal approval and deletion',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Для учителя',exact:true}).click();await page.getByRole('button',{name:'Предложить карточку'}).click();
 await page.getByLabel('Вопрос',{exact:true}).fill('Тестовая формула?');await page.getByLabel('Ответ',{exact:true}).fill('Проверенный ответ');await page.getByRole('button',{name:'Сохранить',exact:true}).click();await page.getByLabel('Фильтр карточек').selectOption('pending');await expect(page.getByText('Тестовая формула?',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Одобрить',exact:true}).click();await expect(page.getByText('Тестовая формула?',{exact:true})).toHaveCount(0);
 await page.getByLabel('Фильтр карточек').selectOption('all');await page.getByLabel('Поиск карточек').fill('Тестовая формула');await page.getByRole('button',{name:'Удалить',exact:true}).click();await page.getByLabel('Фильтр карточек').selectOption('deleted');await expect(page.getByText('Тестовая формула?',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Восстановить',exact:true}).click();
});
test('AI without keys is an explicit error and never fake content',async({request})=>{
 for(const endpoint of ['generate','ask-ai']){const r=await request.post('/api/'+endpoint,{data:{topic:'Механика',query:'Что такое сила?'}});expect(r.status()).toBe(400);expect((await r.json()).error).toContain('Подключите свой API-ключ');}
 const r=await request.post('/api/test-ai',{data:{aiConfig:{enabled:true,format:'openai-compatible',apiKey:'test',model:'test',endpoint:'http://169.254.169.254'}}});expect(r.status()).toBe(400);expect((await r.json()).error).toContain('не разрешён');
});
import {createBotHandler} from '../telegram-bot.mjs';

test('tracker supports future dates and independent months',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-29T12:00:00'));
 await page.goto('/');await page.getByRole('button',{name:'Мой трекер',exact:true}).click();await page.getByRole('button',{name:'Месяц',exact:true}).click();await page.getByRole('button',{name:'Следующий месяц'}).click();const cell=page.getByRole('button',{name:/^Зашел сюда, 1\./});await expect(cell).toHaveAttribute('aria-label',/empty$/);await cell.click();await expect(cell).toHaveAttribute('aria-label',/done$/);await cell.click();await expect(cell).toHaveAttribute('aria-label',/partial$/);await cell.click();await expect(cell).toHaveAttribute('aria-label',/empty$/);await cell.click();await page.getByRole('button',{name:'Предыдущий месяц'}).click();await expect(cell).toHaveAttribute('aria-label',/empty$/);await page.reload();await page.getByRole('button',{name:'Мой трекер',exact:true}).click();await page.getByRole('button',{name:'Месяц',exact:true}).click();await page.getByRole('button',{name:'Следующий месяц'}).click();await expect(cell).toHaveAttribute('aria-label',/done$/);
});
test('mix only selected completed decks and respect session frequency',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('study_cards_v1',JSON.stringify([{id:'one',topic:'Тест',front:'Один вопрос?',back:'Проверенный ответ.'}]));localStorage.setItem('study_selected_topics',JSON.stringify(['Тест']));localStorage.setItem('repetitor_deck_statuses_v1',JSON.stringify({'Логика':'completed'}));localStorage.setItem('mix_topics',JSON.stringify(['Логика']));localStorage.setItem('mix_every','2');localStorage.setItem('repetitor_mix_completed_cnt_v1','2');});
 await page.goto('/');await expect(page.getByText('3 карточек в этой сессии · выучено: 0',{exact:true})).toBeVisible();
 for(let i=0;i<3;i++){await page.getByRole('button',{name:/^Показать ответ/}).click();await page.getByRole('button',{name:/^Знаю/}).click();}
 await page.getByRole('button',{name:'Повторить эту колоду'}).click();await expect(page.getByText('1 карточек в этой сессии · выучено: 0',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/^Показать ответ/}).click();await page.getByRole('button',{name:/^Знаю/}).click();await page.getByRole('button',{name:'Повторить эту колоду'}).click();await expect(page.getByText('3 карточек в этой сессии · выучено: 0',{exact:true})).toBeVisible();
});
test('catalogue counts and diagrams; no placeholders or duplicate ids',()=>{
 const all=[...JSON.parse(fs.readFileSync('public/catalog/base.json','utf8')),...catalog];expect(all.length).toBe(1292);for(const topic of ['Логика','Математика (5-9)','Искусственный интеллект'])expect(all.filter(c=>c.topic===topic).length).toBe(topic==='Математика (5-9)'?306:300);expect(all.filter(c=>c.imageUrl).length).toBe(240);expect(new Set(all.map(c=>c.id)).size).toBe(all.length);for(const c of all){expect(c.front+' '+c.back).not.toMatch(/Сгенерированный вопрос|Факт #|undefined|NaN/);expect(c.front+c.back).not.toContain(String.fromCharCode(8212));}
});
test('lazy loading fetches selected deck then optics on demand',async({page})=>{
 const requests=[];page.on('request',r=>{if(r.url().includes('/catalog/'))requests.push(r.url());});await page.goto('/');await expect(page.getByText('20 карточек в этой сессии · выучено: 0',{exact:true})).toBeVisible();expect(requests.filter(u=>/deck-\d+\.json/.test(u)).length).toBe(1);await page.getByLabel('Поиск колод').fill('Оптика');await chooseDeck(page,'ЕГЭ Физика · Оптика');await expect(page.getByText(/Геометрическая оптика.*Запиши/s).first()).toBeVisible();expect(requests.filter(u=>/deck-\d+\.json/.test(u)).length).toBe(2);
});
test('Telegram repeats unknown, rejects stale clicks and awards once without network',async()=>{
 const calls=[];const bot=createBotHandler([{id:'one',topic:'Оптика',front:'Вопрос',back:'Ответ'}],async(method,body)=>{calls.push({method,body});});
 const message={chat:{id:123,type:'private'},message_id:1};let id=0;const cb=data=>bot.handle({callback_query:{id:String(++id),data,message}});
 await cb('deck:0');await cb('know:1');expect(bot.state.users['123'].xp).toBe(0);await cb('show:1');await cb('again:1');expect(bot.state.users['123'].queue).toEqual(['one']);await cb('know:1');expect(bot.state.users['123'].queue).toEqual(['one']);await cb('show:2');await cb('know:2');expect(bot.state.users['123'].xp).toBe(50);await cb('know:2');expect(bot.state.users['123'].xp).toBe(50);expect(calls.some(c=>c.body.text?.includes('Все карточки пройдены'))).toBe(true);
});
test('backup includes progress but excludes AI key',async({page})=>{
 await page.goto('/');await page.evaluate(()=>sessionStorage.setItem('study_ai_key','secret-do-not-export'));await page.getByRole('button',{name:'Для учителя',exact:true}).click();await expect(page.getByText(/1292 карточек\./)).toBeVisible();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Резервная копия',exact:true}).click();const download=await pending;const backup=fs.readFileSync(await download.path(),'utf8');expect(backup).not.toContain('secret-do-not-export');expect(JSON.parse(backup).cards.length).toBe(1292);
});
test('AI generation sends requested count and requires moderation',async({page})=>{
 let body;await page.route('**/api/generate',async route=>{body=route.request().postDataJSON();await route.fulfill({json:{source:'custom-ai',cards:[{front:'Что такое инерция?',back:'Сохранение скорости при нулевой равнодействующей сил в инерциальной системе.'}]}});});await page.goto('/');await page.getByLabel('Количество новых карточек').selectOption('50');await page.getByPlaceholder('Например: законы Ньютона').fill('Новая механика');await page.getByRole('button',{name:'Создать ✨'}).click();expect(body.count).toBe(50);await page.getByRole('button',{name:'Для учителя',exact:true}).click();await page.getByLabel('Фильтр карточек').selectOption('pending');await expect(page.getByText('Что такое инерция?',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Одобрить',exact:true}).click();await page.getByRole('button',{name:'Учиться',exact:true}).click();await page.getByLabel('Поиск колод').fill('Новая механика');await chooseDeck(page,'Новая механика');await expect(page.getByText('Что такое инерция?',{exact:true})).toBeVisible();
});
test('AI settings retain key in tab but not local storage',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Подключить свой ИИ',exact:true}).click();await page.getByLabel('API-ключ',{exact:true}).fill('example-key');await page.getByRole('button',{name:'Сохранить',exact:true}).click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('repetitor_user_ai_config_v1')).apiKey)).toBe('');expect(await page.evaluate(()=>sessionStorage.getItem('study_ai_key'))).toBe('example-key');await page.reload();await page.getByRole('button',{name:/^Мой ИИ/}).count();await page.getByTitle('Настроить свой ИИ: эндпоинт, формат, токен').click();await expect(page.getByLabel('API-ключ',{exact:true})).toHaveValue('example-key');
});
test('illustrated math card and mobile teacher layout',async({page})=>{
 await page.goto('/');await chooseDeck(page,'Математика (5-9)');await page.getByRole('button',{name:'Для учителя',exact:true}).click();await page.getByLabel('Поиск карточек').fill('Стороны прямоугольника 3 см');await expect(page.getByText('Стороны прямоугольника 3 см и 6 см. Найди периметр и площадь.',{exact:true})).toBeVisible();await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
test('backup restore validates before changing data',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Для учителя',exact:true}).click();await expect(page.getByText(/1292 карточек\./)).toBeVisible();
 const cards=[{id:'backup-one',topic:'Проверка импорта',front:'Восстановленный вопрос?',back:'Восстановленный ответ.'}];
 await page.getByLabel('Восстановить копию',{exact:true}).setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:2,cards,preferences:{study_rewards:JSON.stringify({xp:'oops'})}}))});await expect(page.getByText('Некорректная настройка: study_rewards',{exact:true})).toBeVisible();await expect(page.getByText(/1292 карточек\./)).toBeVisible();
 await page.getByLabel('Восстановить копию',{exact:true}).setInputFiles({name:'good.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:2,cards,preferences:{study_rewards:JSON.stringify({xp:77,gems:8,sessions:1,dates:[]}),study_selected_topics:JSON.stringify(['Проверка импорта'])}}))});await expect(page.getByText(/Карточки восстановлены/)).toBeVisible();await page.reload();await expect(page.getByText('Восстановленный вопрос?',{exact:true})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('study_rewards')).xp)).toBe(77);
});
