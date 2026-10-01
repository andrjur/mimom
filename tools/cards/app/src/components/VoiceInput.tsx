import React,{useEffect,useRef,useState} from 'react';
import {Flashcard} from '../types';
export function normalizeSpeech(text:string,card:Flashcard){
 let value=text.trim().replace(/[.!?]$/,'');
 if(card.answerSpec?.kind==='number'){
  const numbers:Record<string,string>={'ноль':'0','один':'1','одна':'1','два':'2','две':'2','три':'3','четыре':'4','пять':'5','шесть':'6','семь':'7','восемь':'8','девять':'9','десять':'10'};
  value=value.toLowerCase().split(/\s+/).map(w=>numbers[w]||w).join(' ').replace(/минус/g,'-').replace(/плюс/g,'+').replace(/умножить на/g,'*').replace(/(?:разделить|делить) на/g,'/').replace(/запятая/g,',');
 }
 return value;
}
export function VoiceInput({card,onText,onListening,disabled}:{card:Flashcard;onText:(text:string)=>void;onListening:(v:boolean)=>void;disabled?:boolean}){
 const recognition=useRef<any>(null),alive=useRef(true);const [listening,setListening]=useState(false),[message,setMessage]=useState(''),[local,setLocal]=useState(false);
 const api=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;recognition.current?.abort();};},[]);
 const start=async()=>{
  if(listening){recognition.current?.stop();return;}
  if(!api)return;
  setMessage('');const r=new api();recognition.current=r;r.lang='ru-RU';r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
  r.onresult=(e:any)=>{if(!alive.current)return;const segments=Array.from(e.results as any[]);const text=segments.map((s:any)=>s[0].transcript).join(' ');setMessage(text);if(segments.every((s:any)=>s.isFinal)){onText(normalizeSpeech(text,card));r.stop();}};
  r.onerror=(e:any)=>{if(alive.current)setMessage(e.error==='not-allowed'?'Разрешите микрофон в браузере или введите ответ с клавиатуры.':e.error==='no-speech'?'Не расслышал. Попробуйте ещё раз.':'Распознавание недоступно. Можно воспользоваться микрофоном экранной клавиатуры.');};
  r.onend=()=>{if(alive.current){setListening(false);onListening(false);}};
  try{
   if(local){if(!api.available||!('processLocally' in r))throw Error('Локальное распознавание не поддерживается этим браузером.');const status=await api.available({langs:['ru-RU'],processLocally:true});if(status!=='available')throw Error('Русский языковой пакет не установлен. Используйте микрофон клавиатуры или отключите локальный режим.');r.processLocally=true;}
   if(!alive.current)return;r.start();setListening(true);onListening(true);
  }catch(e){setMessage(e instanceof Error?e.message:'Не удалось включить микрофон.');setListening(false);onListening(false);}
 };
 return <div className="voice-input"><button type="button" disabled={disabled||!api} aria-pressed={listening} onClick={start}>{listening?'■ Закончить запись':'🎙 Ответить голосом'}</button><details><summary>Как работает голос</summary><p>{api?'Браузер преобразует речь в текст. Аудио может обрабатываться сервисом браузера. Наш сервер не получает запись.':'В этом браузере распознавание недоступно. Используйте микрофон экранной клавиатуры телефона.'}</p><label><input type="checkbox" checked={local} onChange={e=>setLocal(e.target.checked)} disabled={listening}/>Только на устройстве</label><p>Автопроверка начнётся после окончания речи. Проверьте распознанный текст; оценку можно исправить слева.</p></details><p role="status">{message}</p></div>;
}
