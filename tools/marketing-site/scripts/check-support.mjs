import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const arg=process.argv.indexOf('--built');const root=arg<0?repo:path.resolve(repo,process.argv[arg+1]);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const config=JSON.parse(fs.readFileSync(path.join(repo,'tools/marketing-site/content/support.json'),'utf8'));
const html=read('one-layer/index.html');
assert.equal(config.phone,'+79684494137');assert.equal(config.videoId,'XIzlLJax3gs');
assert.equal(config.billUrl,'https://yoomoney.ru/bill/pay/1L3E159AA54.261023');
assert.equal(config.fundraiseUrl,'https://yoomoney.ru/fundraise/1L3E1QHPM89.261023');
assert.ok(html.includes('https://www.youtube.com/embed/'+config.videoId+'?rel=0'));
assert.ok(html.includes('referrerPolicy="strict-origin-when-cross-origin"')||html.includes('referrerpolicy="strict-origin-when-cross-origin"'));
assert.ok(!/<iframe[^>]*hidden/.test(html)&&!html.includes('Запросить практику за'));
for(const value of [config.videoUrl,config.billUrl,config.fundraiseUrl,config.transferUrl,config.displayPhone,'СБП · ЛЮБАЯ СУММА','поддержать на 590 ₽','Банк получателя:','Это не QR-платёж СБП'])assert.ok(html.includes(value),'Missing support detail '+value);
assert.equal((html.match(/<textarea /g)||[]).length,7);
for(const file of ['assets/one-layer.css','assets/one-layer.js','assets/support/yoomoney-590-qr.svg','assets/support/donation-card.svg'])assert.ok(fs.existsSync(path.join(root,file)));
assert.ok(read('assets/support/yoomoney-590-qr.svg').includes('<metadata>'+config.billUrl+'</metadata>'));
assert.ok(read('assets/support/donation-card.svg').includes(config.displayPhone));
const js=read('assets/one-layer.js');new vm.Script(js);assert.ok(js.includes(config.phone));assert.ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(js),'Worksheet must stay in the tab');
assert.ok(read('apply/index.html').includes('data-open-practice'));
for(const file of ['one-layer/index.html','assets/one-layer.js','assets/one-layer.css','assets/support/donation-card.svg'])assert.ok(!read(file).includes(String.fromCharCode(8212)),'Forbidden punctuation '+file);
assert.ok(!read('index.html').includes('АУДИОПРАКТИКА · 590 ₽'));
assert.ok(read('catalog/index.html').includes('По желанию'));
console.log('Passed: unrestricted video and direct link, exact support destinations, phone, fixed-amount labels, QR target, local worksheet and updated discovery copy.');
const feedback=read('assets/one-layer-feedback.js');new vm.Script(feedback);
assert.ok(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon/.test(feedback));
assert.ok(feedback.includes('https://t.me/Andreyjurievich?text=')&&feedback.includes('Публикацию НЕ разрешаю.'));
for(const text of ['data-layer-feedback','Текст готов. Ещё не отправлен.','бесплатно сколько угодно раз','Пока без изменений','Не подошло','после проверки'])assert.ok(html.includes(text),'Missing feedback detail '+text);
assert.ok(/name="publish"/.test(html)&&!/<input[^>]*name="publish"[^>]*checked/.test(html));
for(const [file,url] of [['one-layer-qr',config.practiceUrl],['yoomoney-any-qr',config.transferUrl]]){
  assert.ok(read('assets/support/'+file+'.svg').includes('<metadata>'+url+'</metadata>'));
  const png=fs.readFileSync(path.join(root,'assets/support/'+file+'.png'));
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.ok(png.readUInt32BE(16)>=256&&png.readUInt32BE(20)>=256);
}
const reviews=JSON.parse(fs.readFileSync(path.join(repo,'tools/marketing-site/content/one-layer-reviews.json'),'utf8'));
for(const review of reviews){
  assert.equal(review.status,'approved');assert.equal(review.publicationConsent,true);
  assert.ok(review.id&&review.date&&review.text&&review.text.length<=1200);
  assert.ok(Object.keys(review).every(key=>['id','status','publicationConsent','date','text','name'].includes(key)),'Do not publish contacts, private notes or pending feedback');
}
console.log('Passed: review draft stays local; publication opt-in defaults off; no fake send confirmation; approved-only public reviews; separate practice and support QR targets.');
