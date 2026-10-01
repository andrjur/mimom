import React,{useEffect,useRef} from 'react';
import {Flashcard} from '../types';
import {CardContent,RichText} from './CardContent';
import {AnswerEditor,checkAnswer} from './AnswerEditor';
export interface GradedAnswer {card:Flashcard;correct:boolean;text:string;verified:boolean;serial:number}
export function PreviousAnswer({answer,onEdit}:{answer:GradedAnswer;onEdit:()=>void}){
 const feedback=!answer.correct&&answer.verified?checkAnswer(answer.card,answer.text).message:undefined;
 return <aside className={'previous-answer '+(answer.correct?'correct':'incorrect')} aria-label="Предыдущая карточка"><span className="eyebrow">← Уже проверено</span><strong role="status">{answer.correct?'✓ Верно':'↻ На повтор'}{!answer.verified?' · самооценка':''}</strong>{feedback&&<p className="grade-feedback" role="note">{feedback}</p>}<div className="previous-question"><CardContent card={answer.card} answer={false} teacher/></div><details open={window.matchMedia('(min-width:901px)').matches}><summary>Мой ответ и разбор</summary><div className="previous-draft"><RichText text={answer.text||'Ответ не записан'}/></div><CardContent card={answer.card} answer teacher skipFormula={answer.correct&&answer.card.answerSpec?.kind==='formula'?answer.text:undefined}/></details><button onClick={onEdit}>Исправить мой ответ</button></aside>;
}
export function CorrectAnswer({answer,onClose,onCorrect}:{answer:GradedAnswer;onClose:()=>void;onCorrect:(correct:boolean,text:string)=>void}){
 const ref=useRef<HTMLDialogElement>(null),draft=useRef(answer.text);
 useEffect(()=>{ref.current?.showModal();},[]);
 return <dialog ref={ref} className="personal-dialog correction-dialog" aria-label="Исправить предыдущий ответ" onCancel={onClose}><header><h2>Исправить ответ</h2><button aria-label="Закрыть исправление" onClick={onClose}>✕</button></header><p>{answer.card.front}</p><p>Старый ответ: {answer.text||'не записан'}. Оценка заменится, лишняя попытка не добавится.</p><AnswerEditor card={answer.card} initialValue={answer.text} autoCheck={false} onDraft={text=>{draft.current=text;}} onChecked={(correct,text)=>onCorrect(correct,text)}/>{!answer.card.answerSpec&&<div className="flex gap-3"><button className="primary-action" onClick={()=>onCorrect(true,draft.current)}>Мой ответ верный</button><button onClick={()=>onCorrect(false,draft.current)}>Оставить на повтор</button></div>}</dialog>;
}
