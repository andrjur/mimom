import {VoiceInput} from './VoiceInput';
import {checkGeometry} from '../geometry';
import React,{useEffect,useRef,useState,useId} from 'react';
import {Flashcard} from '../types';
import {Formula} from './CardContent';

export function checkAnswer(card:Flashcard,input:string):{status:string;message?:string}{
 const spec=card.answerSpec;
 if(!input.trim())return {status:'blank',message:'Сначала запишите ответ.'};
 if(!spec)return {status:'manual'};
 if(spec.kind==='geometry')return checkGeometry(spec.rule,input);
 if(spec.kind==='formula')return window.PhysicsMath.check(spec.index,input);
 try{
  const parsed=window.PhysicsMath.parse(input,[]);
  if(parsed.right)throw Error('В этой задаче нужен численный результат, а не формула. Подставьте данные из вопроса и запишите число.');
  const value=window.PhysicsMath.value(parsed.left,{});
  if(!Number.isFinite(value))throw Error('Получилось неопределённое значение.');
  const correct=Math.abs(value-spec.value)<=Math.max(spec.tolerance??1e-6,Math.abs(spec.value)*1e-4);
  return {status:correct?'correct':'incorrect',message:correct?undefined:`Ваш результат: ${value.toLocaleString('ru')}. Правильный результат: ${spec.value.toLocaleString('ru')}${spec.unit?' '+spec.unit:''}. Сравните ход решения ниже.`};
 }catch(e){return {status:'unrecognized',message:/[A-Za-zА-Яа-я=]/.test(input)?'В этой задаче нужен численный результат. Подставьте данные и запишите число.':e instanceof Error?e.message:'Не удалось разобрать запись.'};}
}

export function AnswerEditor({card,onChecked,onKnow,onDraft,initialValue='',autoCheck=true,paused=false,focusOnMount=false}:{card:Flashcard;onKnow?:()=>void;focusOnMount?:boolean;initialValue?:string;autoCheck?:boolean;paused?:boolean;onDraft?:(value:string)=>void;onChecked:(correct:boolean,text:string)=>void}){
 const [value,setValue]=useState(initialValue),[result,setResult]=useState(''),[locked,setLocked]=useState(false);
 const [automatic,setAutomatic]=useState(()=>localStorage.getItem('study_auto_check')!=='false'),[composing,setComposing]=useState(false),[listening,setListening]=useState(false);
 const submitted=useRef(false),latest=useRef(onChecked);latest.current=onChecked;
 const submit=()=>{if(submitted.current||paused||composing||listening)return;const r=checkAnswer(card,value);if(['correct','incorrect'].includes(r.status)){submitted.current=true;setLocked(true);latest.current(r.status==='correct',value);}else setResult(r.message||'Проверьте обозначения и скобки.');};
 useEffect(()=>onDraft?.(value),[value]);
 useEffect(()=>{if(!autoCheck||!automatic||paused||composing||listening||locked||!card.answerSpec||!value.trim())return;const r=checkAnswer(card,value);if(!['correct','incorrect'].includes(r.status))return;setResult('Проверю после паузы во вводе…');const timer=setTimeout(submit,1800);return()=>clearTimeout(timer);},[value,automatic,autoCheck,paused,composing,listening,locked]);

 const mathRelevant=!!card.answerSpec||!!card.formula||/математ|физик|алгебр|геометр/i.test(card.topic)||/\b[A-Za-z]\s*=|[×²³√]/.test(card.front);
 const inputId=useId();
 const input=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{if(focusOnMount&&window.matchMedia('(min-width:900px)').matches)input.current?.focus({preventScroll:true});},[]);
 const insert=(token:string)=>{const el=input.current!;const start=el.selectionStart,end=el.selectionEnd;setValue(value.slice(0,start)+token+value.slice(end));requestAnimationFrame(()=>{el.focus();const cursor=start+(token.includes('()')?token.indexOf('()')+1:token.length);el.setSelectionRange(cursor,cursor);});};
 return <section className="answer-editor" onClick={e=>e.stopPropagation()}>
  <div className="answer-editor-heading"><label htmlFor={inputId}>Ваш ответ {card.answerSpec?.kind==='number'&&card.answerSpec.unit&&<small>(в {card.answerSpec.unit})</small>}</label><div className="answer-actions">{card.answerSpec&&<button type="button" className="primary-action" disabled={locked||!value.trim()||paused} onClick={submit}>Проверить ответ</button>}{onKnow&&<button type="button" className="quick-know" disabled={locked||paused} onClick={onKnow}>✓ Знаю</button>}</div></div>
  <textarea id={inputId} ref={input} rows={2} maxLength={2000} value={value} disabled={locked} onCompositionStart={()=>setComposing(true)} onCompositionEnd={()=>setComposing(false)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&card.answerSpec&&!composing){e.preventDefault();submit();}}} onChange={e=>{setResult('');setValue(e.target.value);}} placeholder={card.answerSpec?.kind==='number'?'Число или выражение, например 2,5 или 5/2':card.answerSpec?.kind==='formula'?'Например: F = m*a':'Запишите объяснение своими словами'}/>
  {mathRelevant&&<details className="formula-tools"><summary>Математическая клавиатура</summary><div className="formula-keys" aria-label="Редактор формул">{[['Дробь','()/()'],['Квадрат','^2'],['Степень','^()'],['Корень','sqrt()'],['×','*'],['π','pi'],['ρ','rho'],['λ','lambda'],['Δ','d'],['Индекс','_0'],['=','='],['( )','()']].map(([label,token])=><button type="button" disabled={locked} key={label} onClick={()=>insert(token)}>{label}</button>)}</div></details>}
  {mathRelevant&&<p className="notation-help">a2 или a**2 = a². Умножение: 2a или a*2. v0 означает начальную скорость.</p>}
  {value&&/[=^*/²³√]|[a-zа-я]2/i.test(value)&&<div className="answer-preview"><small>Предпросмотр записи</small><Formula text={value}/></div>}
  <VoiceInput card={card} onText={setValue} onListening={setListening} disabled={locked||paused}/>
  {autoCheck&&card.answerSpec&&<label className="auto-check-switch"><input type="checkbox" checked={automatic} onChange={e=>{setAutomatic(e.target.checked);localStorage.setItem('study_auto_check',String(e.target.checked));}}/>Проверять автоматически после паузы</label>}
  {!card.answerSpec&&<p className="text-sm text-zinc-500">Можно ответить своими словами или сразу отметить «Знаю». Это самооценка.</p>}
  <p role="status">{result}</p>
 </section>;
}

