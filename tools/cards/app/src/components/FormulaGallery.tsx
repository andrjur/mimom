import React,{useState} from 'react';
import geometryCards from '../geometryCards.json';
import {Formula,RichText} from './CardContent';
const variants=geometryCards.filter(c=>c.id.startsWith('math-area-'));
export function FormulaGallery(){
 const [index,setIndex]=useState(0);const [formula,...notes]=variants[index].back.split('\n');
 return <section className="formula-gallery" onClick={e=>e.stopPropagation()} aria-label="Шесть формул площади"><header><strong>6 верных способов</strong><span>{index+1} / 6</span></header><Formula text={formula}/>{index===2?<><p>a, b, c: стороны. p: полупериметр.</p><Formula text="p=(a+b+c)/2"/></>:<p>{notes.join(' ')}</p>}<footer><button onClick={()=>setIndex((index+5)%6)} aria-label="Предыдущая формула">←</button><button onClick={()=>setIndex((index+1)%6)}>Другой способ →</button></footer><details className="text-sm mt-3"><summary>Все формулы и условия</summary>{variants.map(c=><div key={c.id} className="my-3"><RichText text={c.back}/></div>)}</details></section>;
}
