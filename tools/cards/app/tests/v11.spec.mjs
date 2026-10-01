import {test,expect} from '@playwright/test';
import fs from 'node:fs';import vm from 'node:vm';
test('gravity diagnosis names the missing second mass and orbital denominator stays grouped',()=>{
 const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('src/physics-math.js','utf8'),context);
 expect(context.PhysicsMath.check(3,'f=G*m1*m1/r2')).toMatchObject({status:'incorrect',message:expect.stringContaining('m1 и m2')});
 expect(context.PhysicsMath.check(3,'f=G*m1*m2/r2').status).toBe('correct');
 const html=context.PhysicsMath.typeset('T = 2πr/v = 2π√(r³/GM)');
 expect(html).toContain('<mrow><mi>G</mi><mo>·</mo><mi>M</mi></mrow>');
});
test('wrong answer has a reason and explanation card offers a scaffold and two staged hints',async({page})=>{
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());
 await page.addInitScript(()=>{localStorage.setItem('study_selected_topics',JSON.stringify(['Проба']));localStorage.setItem('repetitor_mix_completed_v1','false');localStorage.setItem('study_cards_v1',JSON.stringify([
 {id:'reason',topic:'Проба',front:'Запиши силу тяготения',back:'F=G*m1*m2/r^2',formula:'F=G*m1*m2/r^2',formulaSide:'back',answerSpec:{kind:'formula',index:3}},
 {id:'explanation',topic:'Проба',front:'Объясни формулу aц=v^2/r. Что означают величины и когда её применять?',back:'Ускорение к центру.',formula:'ac=v^2/r',formulaSide:'front'}]));});
 await page.goto('/');await page.getByLabel('Ваш ответ').fill('F=G*m1*m1/r2');await page.getByRole('button',{name:'Проверить ответ',exact:true}).click();
 await expect(page.locator('.grade-feedback')).toContainText('m1 и m2');
 await expect(page.locator('.formula-explain-guide')).toContainText('условия применения');
 const second=page.getByRole('button',{name:/Подсказка 2/});await expect(second).toBeDisabled();
 await page.getByRole('button',{name:/Подсказка 1/}).click();await expect(page.locator('.card-hint')).toContainText('единицы измерения');
 await second.click();await expect(page.locator('.card-hint')).toContainText('увеличить вдвое');
 await page.screenshot({path:'../../preview-v11-feedback.png'});
});
test('habit rename keeps dated marks, delete can be undone and persists across reload',async({page})=>{
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());
 await page.addInitScript(()=>{if(localStorage.getItem('v11-seeded'))return;localStorage.setItem('v11-seeded','true');localStorage.setItem('study_selected_topics',JSON.stringify(['Логика']));localStorage.setItem('repetitor_tracker_habits_v2',JSON.stringify([{id:'h1',name:'Зашел сюда',category:'daily'},{id:'reading',name:'Чтение',category:'daily'}]));localStorage.setItem('repetitor_tracker_cells_v3',JSON.stringify({'reading_2026-09-29':'partial'}));});
 await page.goto('/');await page.getByRole('button',{name:'Мой трекер',exact:true}).click();await page.getByRole('button',{name:'Редактор привычек',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Редактор привычек'});await dialog.getByRole('button',{name:'Чтение',exact:true}).click();
 await dialog.getByLabel('Название привычки').fill('Читать 20 минут');await dialog.getByLabel('Категория').selectOption('study');await dialog.getByRole('button',{name:'Сохранить изменения'}).click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('repetitor_tracker_cells_v3'))['reading_2026-09-29'])).toBe('partial');
 await dialog.getByRole('button',{name:'Удалить привычку',exact:true}).click();await expect(dialog.getByRole('button',{name:'Читать 20 минут',exact:true})).toHaveCount(0);
 await dialog.getByRole('button',{name:'Восстановить привычку'}).click();await expect(dialog.getByLabel('Название привычки')).toHaveValue('Читать 20 минут');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.screenshot({path:'../../preview-v11-habits-mobile.png'});
 await dialog.getByRole('button',{name:'Удалить привычку',exact:true}).click();await dialog.getByRole('button',{name:'Закрыть редактор привычек'}).click();await page.reload();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('repetitor_tracker_habits_v2')).map(h=>h.id))).toEqual(['h1']);
});
