import {FormulaGallery} from './FormulaGallery';
import React,{useState} from 'react';
import '../physics-math.js';
import {Flashcard} from '../types';
declare global {interface Window {PhysicsMath:{typeset:(text:string,extra?:string[])=>string;check:(index:number,input:string)=>{status:string;message?:string};parse:(text:string,variables:string[])=>any;value:(node:any,vars:Record<string,number>)=>number}}}
export function Formula({text}:{text:string}){return <div className="formula-display" dangerouslySetInnerHTML={{__html:window.PhysicsMath.typeset(text,['y','z','a1','an','b','c','D','S','Sn'])}}/>;}
export function RichText({text,skipFormula}:{text:string;skipFormula?:string}){
 // Only isolated equations are parsed. Unsupported notation remains visible as text.
 return <>{String(text).replace(/([A-Za-z][A-Za-z0-9_]*\s*=[^\n]+?),\s*(?=где|здесь)/g,'$1\n').replace(/\(([A-Za-z][A-Za-z0-9_]*\s*=[^()]+)\)/g,'\n$1\n').split('\n').map((line,i)=>{const fragments=line.split(/(?<=[.!?;])\s+/);return <div key={i} className="rich-line">{fragments.map((part,j)=>{const candidate=part.replace(/^Ответ:\s*/,'').replace(/[.]$/,'');const html=candidate.includes('=')&&candidate.length<250?window.PhysicsMath.typeset(candidate,['y','z','b','c','D','S','a1','an','Sn']):'';if(skipFormula&&html.replace(/ aria-label="[^"]*"/,'')===window.PhysicsMath.typeset(skipFormula).replace(/ aria-label="[^"]*"/,''))return null;return html.startsWith('<math')?<Formula key={j} text={candidate}/>:<React.Fragment key={j}>{part}{' '}</React.Fragment>;})}</div>;})}</>;
}
export function CardContent({card,answer,teacher=false,skipFormula}:{card:Flashcard;answer:boolean;teacher?:boolean;skipFormula?:string}){
 const [step,setStep]=useState(0);
 const [hints,setHints]=useState(()=>localStorage.getItem('study_hints')!=='false');
 let text=answer?card.back:card.front;const showFormula=card.formula&&card.formulaSide===(answer?'back':'front');
 if(showFormula){if(answer&&text.startsWith('Ответ: '+card.formula+'.'))text=text.slice(('Ответ: '+card.formula+'.').length).trim();if(!answer)text=text.replace(card.formula!, 'выше');}
 const explainFormula=!answer&&card.formulaSide==='front'&&/объясни|объясните/i.test(card.front);
 const steps=explainFormula?['Назовите каждую величину и её единицы измерения. Затем прочитайте зависимость словами: что от чего зависит?', 'Скажите, при каких условиях работает формула. Приведите один пример: что изменится, если одну величину увеличить вдвое?']:card.hints?.some(h=>h.trim())?card.hints.filter(h=>h.trim()):card.hint?[card.hint]:['Выделите, что дано и что нужно получить. Попробуйте назвать подходящее правило до просмотра ответа.'];
 if(answer&&card.answerSpec?.kind==='geometry'&&card.answerSpec.rule==='area-any')return <FormulaGallery/>;
 const sameFormula=skipFormula&&card.formula&&window.PhysicsMath.typeset(skipFormula).replace(/ aria-label="[^"]*"/,'')===window.PhysicsMath.typeset(card.formula).replace(/ aria-label="[^"]*"/,'');
 return <div>{showFormula&&!sameFormula&&<Formula text={card.formula!}/>}<RichText text={text} skipFormula={showFormula?card.formula:skipFormula}/>{explainFormula&&!teacher&&<p className="formula-explain-guide">Что нужно объяснить: смысл величин и единицы, зависимость между ними, условия применения. Просто прочитать формулу недостаточно.</p>}{!answer&&!teacher&&<div className="card-hint" onClick={e=>e.stopPropagation()}><label><input type="checkbox" checked={hints} onChange={e=>{setHints(e.target.checked);localStorage.setItem('study_hints',String(e.target.checked));}}/>Подсказки включены</label>{hints&&<><button className="hint-step" onClick={()=>setStep(Math.max(1,step))}>💡 Подсказка 1: с чего начать</button>{step>=1&&<RichText text={steps[0]}/>} {steps.length>1&&<button className="hint-step" disabled={step<1} onClick={()=>setStep(2)}>Подсказка 2: следующий шаг {step<1?'(сначала откройте первую)':''}</button>}{step>=2&&<RichText text={steps[1]}/>}</>}</div>}</div>;
}
