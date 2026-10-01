import React,{useEffect,useRef,useState} from 'react';
import {HabitItem} from '../trackerStore';

const categories=[['daily','Каждый день'],['study','Учёба'],['health','Здоровье'],['productivity','Продуктивность'],['mood','Настроение']];
export function HabitEditor({habits,onSave,onClose}:{habits:HabitItem[];onSave:(habits:HabitItem[])=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [selected,setSelected]=useState(habits[0]?.id||''),[name,setName]=useState(habits[0]?.name||''),[category,setCategory]=useState(habits[0]?.category||'daily');
 const [removed,setRemoved]=useState<{habit:HabitItem;index:number}|null>(null);
 const [saved,setSaved]=useState(false);
 useEffect(()=>{dialog.current?.showModal();},[]);
 const select=(habit?:HabitItem)=>{setSaved(false);setSelected(habit?.id||'');setName(habit?.name||'');setCategory(habit?.category||'daily');};
 return <dialog ref={dialog} className="personal-dialog habit-editor-dialog" aria-label="Редактор привычек" onCancel={onClose}>
  <header><h2>Мои привычки</h2><button aria-label="Закрыть редактор привычек" onClick={onClose}>✕</button></header>
  <p>Выберите привычку. При переименовании все её отметки сохраняются.</p>
  <div className="habit-editor-layout"><nav aria-label="Выбор привычки">{habits.map(h=><button key={h.id} aria-pressed={selected===h.id} onClick={()=>select(h)}>{h.name}</button>)}</nav>
   {selected?<form onSubmit={e=>{e.preventDefault();if(name.trim()){onSave(habits.map(h=>h.id===selected?{...h,name:name.trim(),category}:h));setSaved(true);}}}>
    <label>Название привычки<input value={name} maxLength={100} required onChange={e=>{setName(e.target.value);setSaved(false);}}/></label>
    <label>Категория<select value={category} onChange={e=>{setCategory(e.target.value);setSaved(false);}}>{categories.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    {saved&&<p role="status">✓ Изменения сохранены. Отметки сохранены.</p>}
    {['h1','h2'].includes(selected)&&<p>Автоматическая отметка приложения сохранится при смене названия.</p>}
    <div className="habit-editor-actions"><button className="primary-action" disabled={!name.trim()}>Сохранить изменения</button><button type="button" className="habit-delete" onClick={()=>{const index=habits.findIndex(h=>h.id===selected);setRemoved({habit:habits[index],index});const next=habits.filter(h=>h.id!==selected);onSave(next);select(next[Math.min(index,next.length-1)]);}}>Удалить привычку</button></div>
   </form>:<p>Привычек пока нет. Добавьте новую в трекере.</p>}
  </div>
  {removed&&<div className="habit-removed" role="status">Удалена: {removed.habit.name}. <button onClick={()=>{const next=[...habits];next.splice(removed.index,0,removed.habit);onSave(next);select(removed.habit);setRemoved(null);}}>Восстановить привычку</button></div>}
 </dialog>;
}
