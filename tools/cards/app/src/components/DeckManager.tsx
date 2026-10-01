import {DeckWizard} from './DeckWizard';
import React, { useState } from 'react';
export type DeckStatus = 'active' | 'later' | 'completed';
export interface DeckStatusMap { [topic: string]: DeckStatus }
interface Props {
 onSplit:(topic:string)=>void;
 availableTopics: string[]; selectedTopics: string[]; deckStatuses: DeckStatusMap;
 onChangeDeckStatus: (topic: string, status: DeckStatus) => void;
 topicCounts: Record<string, number>; repeatQueueCount: number;
 onResetSession: () => void; mixTopics: string[]; mixEvery: number;
 onMixTopics: (topics: string[]) => void; onMixEvery: (n: number) => void;
 mixCompleted: boolean; onToggleMixCompleted: (b: boolean) => void;
 mixCompletedCount: number; onChangeMixCompletedCount: (n: number) => void;
}
const columns: {id: DeckStatus; title: string; note: string}[] = [
 {id:'completed',title:'Пройдено',note:'Сохранить для повторения'},
 {id:'active',title:'В работе',note:'Одна колода, на которой сосредоточимся'},
 {id:'later',title:'На будущее',note:'Вернуться, когда будет время'},
];
export function DeckManager(p: Props) {
 const [wizard,setWizard]=useState<boolean>(()=>localStorage.getItem('study_selected_topics')===null);
 const [settings, setSettings] = useState(false);
 const [query, setQuery] = useState('');
 const [over, setOver] = useState<DeckStatus | null>(null);
 const [message, setMessage] = useState('');
 const move = (topic: string, status: DeckStatus) => {
  if (!p.availableTopics.includes(topic)) return;
  p.onChangeDeckStatus(topic,status); setMessage(`${topic}: ${columns.find(c=>c.id===status)?.title}`); setOver(null);
 };
 const completed = p.availableTopics.filter(t=>p.deckStatuses[t]==='completed');
 return <section className="deck-board bg-white rounded-3xl border border-zinc-200 p-4 sm:p-6 mb-6">
  <div className="flex flex-wrap items-center justify-between gap-3 mb-3"><div><h2 className="font-bold text-xl">Мои колоды</h2><p className="text-sm text-zinc-500">Выберите одну колоду через мастер. Пройденное и планы хранятся по бокам.</p></div>
   <button onClick={()=>setSettings(!settings)} className="border rounded-xl px-3 py-2">Подмешивание</button>
  </div>
  <div className="flex flex-wrap gap-3 mb-4"><input aria-label="Поиск колод" placeholder="Найти тему, например оптика" value={query} onChange={e=>setQuery(e.target.value)} className="border rounded-xl p-2 flex-1 min-w-0"/><button onClick={()=>setWizard(true)} className="bg-emerald-800 text-white rounded-xl px-4 py-2">Выбрать колоду</button><button onClick={p.onResetSession} className="border rounded-xl px-3">Новая сессия</button></div>
  {settings && <div className="rounded-xl p-4 bg-emerald-50 mb-4 space-y-3">
   <label className="flex gap-2"><input type="checkbox" checked={p.mixCompleted} onChange={e=>p.onToggleMixCompleted(e.target.checked)}/>Подмешивать карточки из пройденных колод</label>
   <div className="flex flex-wrap gap-4"><label>Сколько всего <input aria-label="Количество карточек из пройденного" className="border bg-white rounded p-2 w-20" type="number" min="1" max="100" value={p.mixCompletedCount} onChange={e=>p.onChangeMixCompletedCount(Math.max(1,Math.min(100,Number(e.target.value)||1)))}/></label>
   <label>Периодичность <select aria-label="Частота подмешивания" className="border bg-white rounded p-2" value={p.mixEvery} onChange={e=>p.onMixEvery(Number(e.target.value))}><option value={1}>Каждую сессию</option><option value={2}>Каждую 2-ю</option><option value={3}>Каждую 3-ю</option><option value={5}>Каждую 5-ю</option></select></label></div>
   <p className="text-sm">Выберите источники повторения. Указанное количество делится между всеми выбранными колодами.</p>
   {!completed.length && <p>Перенесите хотя бы одну колоду в «Пройдено».</p>}
   {completed.map(t=><label className="flex gap-2" key={t}><input type="checkbox" checked={p.mixTopics.includes(t)} onChange={()=>p.onMixTopics(p.mixTopics.includes(t)?p.mixTopics.filter(x=>x!==t):[...p.mixTopics,t])}/>{t}</label>)}
   <p className="text-xs text-zinc-500">Настройки и перенос колоды начинают сессию заново. Периодичность считается по завершённым сессиям.</p>
  </div>}
  <p role="status" className="text-sm text-emerald-700 mb-2">{message}</p>
  <div className="kanban-columns">{columns.map(col=>{
   const topics=p.availableTopics.filter(t=>(p.deckStatuses[t]||'later')===col.id);
   return <section key={col.id} data-column={col.id} aria-label={col.title} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';setOver(col.id);}} onDrop={e=>{e.preventDefault();move(e.dataTransfer.getData('text/plain'),col.id);}} className={`kanban-column ${col.id} ${over===col.id?'drag-over':''}`}>
    <h3 className="font-bold">{col.title} <span className="text-xs opacity-60">{topics.length}</span></h3><p className="text-xs text-zinc-500 mb-4">{col.note}</p>
    <div className="kanban-list">{topics.filter(t=>col.id==='active'||t.toLowerCase().includes(query.toLowerCase())).map(t=><article key={t} data-deck={t} draggable onDragStart={e=>{e.dataTransfer.setData('text/plain',t);e.dataTransfer.effectAllowed='move';}} onDragEnd={()=>setOver(null)} className={`deck-tile ${col.id==='active'&&p.selectedTopics.includes(t)?'selected':''}`}>
     <div className="flex items-start gap-2"><span aria-hidden="true" className="text-zinc-400 cursor-grab">⠿</span><h4 className="font-semibold text-sm flex-1">{t}</h4></div>
     <p className="text-xs text-zinc-500 mt-2">{p.topicCounts[t]||0} карточек</p>{p.topicCounts[t]>10&&<button className="split-button" onClick={()=>p.onSplit(t)}>✂ Разделить колоду</button>}
     <div className="flex flex-wrap gap-2 mt-3"><select aria-label={`Статус ${t}`} value={col.id} onChange={e=>move(t,e.target.value as DeckStatus)} className="border rounded-lg text-xs p-1 min-w-0">{columns.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select><button className="text-xs text-emerald-700" onClick={()=>col.id==='active'?setWizard(true):move(t,'active')}>{col.id==='active'?'Сменить колоду':'Выбрать для работы'}</button></div>
    </article>)}</div>
    {!topics.length&&<p className="text-sm text-zinc-400 py-8 text-center">{col.id==='active'?'Выберите колоду через мастер':'Перетащите колоду сюда'}</p>}

 </section>;
  })}</div>
   {wizard&&<DeckWizard topics={p.availableTopics} counts={p.topicCounts} current={p.selectedTopics[0]} onClose={()=>setWizard(false)} onChoose={topic=>{p.onChangeDeckStatus(topic,'active');setMessage('В работе: '+topic);}}/>}
 </section>;
}
