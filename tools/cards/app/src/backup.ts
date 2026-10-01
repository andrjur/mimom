import {Flashcard} from './types';
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const strings=(x:unknown):x is string[]=>Array.isArray(x)&&x.every(v=>typeof v==='string');
export function parseBackup(text:string):{cards:Flashcard[];preferences:Record<string,string>}{
 const data=JSON.parse(text);
 if(data.version!==2||!Array.isArray(data.cards)||data.cards.length>20000||data.cards.some((c:any)=>!record(c)||!['id','front','back','topic'].every(k=>typeof c[k]==='string'&&(c[k] as string).length>0&&(c[k] as string).length<30000)))throw Error('Неверный формат карточек в копии');
 if(new Set(data.cards.map((c:Flashcard)=>c.id)).size!==data.cards.length)throw Error('Повторяющиеся идентификаторы');
 if(data.preferences!==undefined&&!record(data.preferences))throw Error('Неверный формат настроек');
 const preferences:Record<string,string>={};
 for(const [key,raw] of Object.entries(data.preferences||{})){
  let check:((v:any)=>boolean)|undefined;
  if(key==='study_rewards')check=v=>record(v)&&['xp','gems','sessions'].every(k=>Number.isSafeInteger(v[k])&&Number(v[k])>=0)&&strings(v.dates)&&v.dates.every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d));
  else if(['study_selected_topics','mix_topics','study_split_parents'].includes(key))check=strings;
  else if(key==='study_profile')check=v=>record(v)&&typeof v.name==='string'&&v.name.length<=60&&typeof v.address==='string'&&v.address.length<=80&&Array.isArray(v.rewards)&&v.rewards.every(r=>record(r)&&typeof r.id==='string'&&typeof r.topic==='string'&&typeof r.title==='string'&&r.title.length<=160&&Number.isInteger(r.threshold)&&Number(r.threshold)>=1&&Number(r.threshold)<=100&&(r.earned===undefined||typeof r.earned==='boolean'))&&v.rewards.every(r=>(v.rewards as any[]).filter((x:any)=>x.topic===r.topic).length<=2);
  else if(key==='study_deck_facts')check=v=>record(v)&&Object.values(v).every(fs=>Array.isArray(fs)&&fs.length<=100&&fs.every(f=>record(f)&&['id','topic','title','short','takeaway','icon'].every(k=>typeof f[k]==='string')&&strings(f.deepDive)));
  else if(key==='study_session_size')check=v=>[0,10,20,50].includes(v);
  else if(key==='mix_every')check=v=>[1,2,3,5].includes(v);
  else if(key==='repetitor_mix_completed_cnt_v1')check=v=>Number.isInteger(v)&&v>=1&&v<=100;
  else if(key==='repetitor_mix_completed_v1')check=v=>typeof v==='boolean';
  else if(key==='repetitor_deck_statuses_v1')check=v=>record(v)&&Object.values(v).every(s=>['active','later','completed'].includes(String(s)));
  else if(/^repetitor_tracker_cells_v[23]$/.test(key))check=v=>record(v)&&Object.values(v).every(s=>['empty','done','cyclic','partial'].includes(String(s)));
  else if(key==='repetitor_tracker_habits_v2')check=v=>Array.isArray(v)&&v.every(h=>record(h)&&typeof h.id==='string'&&typeof h.name==='string'&&['daily','study','health','productivity','mood'].includes(String(h.category)));
  if(!check)continue;
  if(typeof raw!=='string'||!check(JSON.parse(raw)))throw Error('Некорректная настройка: '+key);
  preferences[key]=raw;
 }
 for(const c of data.cards){if(c.answerSpec&&!(c.answerSpec.kind==='number'&&Number.isFinite(c.answerSpec.value)||c.answerSpec.kind==='formula'&&Number.isInteger(c.answerSpec.index)&&c.answerSpec.index>=0&&c.answerSpec.index<29||c.answerSpec.kind==='geometry'&&['area-any','area-height','area-angle','area-heron','area-inradius','area-circumradius','area-right','pythagoras'].includes(c.answerSpec.rule)))throw Error('Некорректный эталон ответа');if(c.hints&&!strings(c.hints))throw Error('Некорректные подсказки');}
 return {cards:data.cards,preferences};
}
