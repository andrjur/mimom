import {Flashcard} from './types';
import {CATALOG} from './catalogMeta';
const cache=new Map<string,Promise<Flashcard[]>>();
export const getTotalCardsCount=()=>CATALOG.reduce((n,d)=>n+d.count,0);
export async function fetchCards(offset:number,limit:number,topics?:string[]):Promise<Flashcard[]>{
 const decks=CATALOG.filter(d=>!topics||topics.includes(d.topic));
 const lists=await Promise.all(decks.map(d=>{
  if(!cache.has(d.topic))cache.set(d.topic,fetch((import.meta as any).env.BASE_URL+'catalog/'+d.file).then(async r=>{if(!r.ok)throw Error('Не удалось загрузить '+d.topic);return await r.json() as Flashcard[];}).catch(e=>{cache.delete(d.topic);throw e;}));
  return cache.get(d.topic)!;
 }));return lists.flat().slice(offset,offset+limit);
}
