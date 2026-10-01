import {apiUrl} from '../api';
import React,{useEffect,useState} from 'react';
import {UserAiConfig} from '../types';
export function QuickAiSetup({config,onChange,onAdvanced}:{config:UserAiConfig;onChange:(c:UserAiConfig)=>void;onAdvanced:()=>void}){
 const [googleReady,setGoogleReady]=useState(false);
 useEffect(()=>{fetch(apiUrl('/api/ai-status')).then(r=>r.json()).then(d=>setGoogleReady(d.googleReady===true)).catch(()=>{});},[]);
 const knyazev=config.endpoint.includes('knyazevai.work');
 const provider=knyazev?'knyazev':config.format==='gemini'?'google':'custom';
 return <section aria-label="Быстрое подключение ИИ" className="mt-8 rounded-3xl bg-white border border-emerald-200 p-5 sm:p-7 space-y-4">
 <h2 className="font-bold text-xl">Ключ ИИ прямо здесь</h2>
 <p className="text-sm text-zinc-600">Карточки уже готовы к обучению, ключ для них не нужен. ИИ подключается для новых карточек и объяснений.</p>
 <div className="flex flex-wrap gap-3"><label>Провайдер<select aria-label="Провайдер на главной" className="block border rounded-xl p-3 mt-1 bg-white" value={provider} onChange={e=>{if(e.target.value==='custom'){onAdvanced();return;}const isKn=e.target.value==='knyazev';onChange({enabled:true,format:isKn?'openai-compatible':'gemini',endpoint:isKn?'https://knyazevai.work/v1':'https://generativelanguage.googleapis.com',apiKey:'',model:isKn?'minimax-2.7':'gemini-3.8-flash'});}}><option value="google">Google Gemini</option><option value="knyazev">Knyazev AI</option><option value="custom">Другой провайдер</option></select></label>
 <label className="flex-1 min-w-0 max-sm:basis-full">API-ключ<input aria-label="API-ключ на главной" type="password" autoComplete="off" placeholder={knyazev?'Ключ Knyazev AI':provider==='google'?'Ключ Google Gemini':'Ключ выбранного провайдера'} className="block w-full border rounded-xl p-3 mt-1" value={config.apiKey} onChange={e=>onChange({...config,apiKey:e.target.value.trim(),enabled:true})}/></label></div>
 <p className="text-xs text-zinc-500">Сохраняется автоматически только в этой вкладке. При смене провайдера введите его ключ.</p>
 {knyazev?<p className="text-sm text-emerald-800">{(config.models||['minimax-2.7','deepseek-v4-flash','kimi-2.6']).join(' → ')}. Каждый новый запрос начинает со следующей модели. При перегрузке переключаемся автоматически. Ожидание до 270 секунд на попытку, максимум 3 попытки.</p>:provider==='custom'?<p className="text-sm">API: {config.endpoint}. Модель: {config.model||'выберите в настройках'}. Ключ проверяется при запросе.</p>:<p className="text-sm">{googleReady?'Серверный Google уже подключён. Можно пробовать ИИ без личного ключа.':config.apiKey?'Ключ Google сохранён. Соединение можно проверить в настройках.':'Для готовых карточек ничего настраивать не нужно. Для ИИ Google пока нужен ключ.'}</p>}
 <button className="text-sm text-emerald-800 underline" onClick={onAdvanced}>Расширенные настройки ИИ</button>
 </section>;
}

