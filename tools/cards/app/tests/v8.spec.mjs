import {test,expect} from '@playwright/test';
async function seed(page,count=2){await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.addInitScript(count=>{localStorage.setItem('study_cards_v1',JSON.stringify(Array.from({length:count},(_,i)=>({id:'auto'+i,topic:'Авто',front:'Вопрос '+i,back:'2',answerSpec:{kind:'number',value:2}}))));localStorage.setItem('study_selected_topics',JSON.stringify(['Авто']));localStorage.setItem('repetitor_mix_completed_v1','false');},count);}
const stats=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('study_cards_v1')).find(c=>c.id==='auto0').answerStats);
test('automatic transition and correction replace grade while preserving next draft',async({page})=>{
 await seed(page);await page.goto('/');await page.getByLabel('Ваш ответ').fill('3');await expect(page.getByLabel('Предыдущая карточка')).toContainText('На повтор');
 await page.getByLabel('Проверять автоматически').uncheck();await page.getByLabel('Ваш ответ').fill('4/2');await page.getByRole('button',{name:'Исправить мой ответ'}).click();
 const dialog=page.getByRole('dialog',{name:'Исправить предыдущий ответ'});await dialog.getByLabel('Ваш ответ').fill('2');await dialog.getByRole('button',{name:'Проверить ответ',exact:true}).click();
 await expect(page.getByLabel('Ваш ответ')).toHaveValue('4/2');expect(await stats(page)).toEqual({correct:1,incorrect:0});await page.getByLabel('Ваш ответ').press('Enter');await expect(page.getByText('Колода пройдена!',{exact:true})).toBeVisible();
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.locator('.study-flow').scrollIntoViewIfNeeded();await page.screenshot({path:'../../preview-v8-mobile.png'});
});
test('last answer correction reopens repeat and rewards only once',async({page})=>{
 await seed(page,1);await page.goto('/');await page.getByLabel('Ваш ответ').fill('2');await page.getByLabel('Ваш ответ').press('Enter');await expect(page.getByText('Колода пройдена!',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Исправить мой ответ'}).click();const d=page.getByRole('dialog');await d.getByLabel('Ваш ответ').fill('3');await d.getByRole('button',{name:'Проверить ответ',exact:true}).click();await expect(page.getByLabel('Ваш ответ')).toBeEnabled();expect(await stats(page)).toEqual({correct:0,incorrect:1});
 await page.getByLabel('Ваш ответ').fill('2');await page.getByLabel('Ваш ответ').press('Enter');await expect(page.getByText('Колода пройдена!',{exact:true})).toBeVisible();expect(await stats(page)).toEqual({correct:1,incorrect:1});await expect(page.getByText('Завершено сессий: 1')).toBeVisible();
});
test('speech interim is not submitted, final numeric phrase is checked',async({page})=>{
 await seed(page);await page.addInitScript(()=>{window.SpeechRecognition=class{constructor(){window.rec=this;}start(){}stop(){this.onend?.();}abort(){window.aborted=true;} };});await page.goto('/');await page.getByRole('button',{name:'🎙 Ответить голосом'}).click();
 await page.evaluate(()=>{const r=[{transcript:'три'}];r.isFinal=false;window.rec.onresult({results:[r]});});await expect(page.getByLabel('Ваш ответ')).toHaveValue('');
 await page.evaluate(()=>{const r=[{transcript:'два'}];r.isFinal=true;window.rec.onresult({results:[r]});});await expect(page.getByLabel('Предыдущая карточка')).toContainText('✓ Верно');expect(await page.evaluate(()=>window.aborted)).toBe(true);
 await page.getByText('Как работает голос').click();await page.getByLabel('Только на устройстве').check();await page.getByRole('button',{name:'🎙 Ответить голосом'}).click();await expect(page.getByText('Локальное распознавание не поддерживается этим браузером.')).toBeVisible();
});
