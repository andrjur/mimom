import {chromium} from '@playwright/test';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1600,height:1050}});
await page.addInitScript(()=>{localStorage.setItem('repetitor_deck_statuses_v1',JSON.stringify({'Искусственный интеллект':'completed','Математика (5-9)':'later','ЕГЭ Математика · Параметры':'later'}));localStorage.setItem('study_selected_topics',JSON.stringify(['ЕГЭ Физика · Механика','ЕГЭ Физика · Оптика']));});
await page.goto('http://localhost:3012');await page.getByText('20 карточек в этой сессии · выучено: 0',{exact:true}).waitFor();
await page.screenshot({path:'../../preview-v2-kanban.png'});
await page.getByRole('button',{name:/^Показать ответ/}).click();await page.locator('[aria-live="polite"]').scrollIntoViewIfNeeded();await page.screenshot({path:'../../preview-v2-physics.png'});
await page.setViewportSize({width:390,height:844});await page.locator('[aria-live="polite"]').scrollIntoViewIfNeeded();await page.screenshot({path:'../../preview-v2-mobile.png'});
await browser.close();
