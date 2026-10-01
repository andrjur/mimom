import geometryCards from './geometryCards.json';
import {Flashcard} from './types';
export function migrateGeometry(cards:Flashcard[]):Flashcard[]{
 const anchor=cards.find(c=>c.id==='math-1');
 const updated=cards.map(c=>{const replacement=geometryCards.find(g=>g.id===c.id);return replacement&&(c.contentVersion||0)<7?{...c,...replacement,topic:c.topic,originTopic:c.originTopic,ancestorTopics:c.ancestorTopics,mastery:c.mastery,answerStats:c.answerStats,deleted:c.deleted,contentVersion:7} as Flashcard:c;});
 if(anchor)for(const g of geometryCards.filter(c=>c.id.startsWith('math-area-')))if(!updated.some(c=>c.id===g.id))updated.push({...g,topic:anchor.topic,originTopic:anchor.originTopic,ancestorTopics:anchor.ancestorTopics} as Flashcard);
 return updated;
}
const expressions:Record<string,{vars:string[];rhs:string}>={
 height:{vars:['S','a','h'],rhs:'a*h/2'},angle:{vars:['S','a','b','alpha'],rhs:'a*b*sin(alpha)/2'},
 heron:{vars:['S','a','b','c','p'],rhs:'sqrt(p*(p-a)*(p-b)*(p-c))'},
 inradius:{vars:['S','p','r'],rhs:'p*r'},circumradius:{vars:['S','a','b','c','R'],rhs:'a*b*c/(4*R)'},
 right:{vars:['S','a','b'],rhs:'a*b/2'},pythagoras:{vars:['a','b','c'],rhs:'sqrt(a^2+b^2)'}
};
export function checkGeometry(rule:string,input:string):{status:string;message?:string}{
 const text=input.toLowerCase().replace(/(^|\s)вадрат/g,'$1квадрат').replace(/[.,!]/g,'').trim();
 if(rule==='pythagoras'){
  const word='(?:в прямоугольном треугольнике )?';
  if(new RegExp('^'+word+'квадрат гипотенузы (?:равен|=) сумме квадратов катетов$').test(text)||new RegExp('^'+word+'сумма квадратов катетов (?:равна|=) квадрату гипотенузы$').test(text))return {status:'correct'};
 }
 const names=rule==='area-any'?['height','angle','heron','inradius','circumradius','right']:[rule.replace('area-','')];
 let parsed=false;
 for(const name of names){if(name==='circumradius'&&/(?:^|[^A-Za-z])r(?:[^A-Za-z]|$)/.test(input))continue;if(name==='inradius'&&/(?:^|[^A-Za-z])R(?:[^A-Za-z]|$)/.test(input))continue;const spec=expressions[name];if(!spec)continue;
  try{const math=window.PhysicsMath;const answer=math.parse(input.replace(/γ/g,'alpha').replace(/h_a/g,'h'),spec.vars);const expected=math.parse(spec.rhs,spec.vars).left;parsed=true;let valid=true,sensitivity=0;const target=name==='pythagoras'?'c':'S';
   for(let i=0;i<24;i++){const env:Record<string,number>={};spec.vars.forEach((v,j)=>env[v]=1.2+((i*7+j*11+i*j)%37)/5);if(name==='heron'){env.c=Math.sqrt(env.a**2+env.b**2-2*env.a*env.b*Math.cos(.4+(i%9)*.25));env.p=(env.a+env.b+env.c)/2;}if(name==='angle')env.alpha=.25+(i%12)*.2;env[target]=math.value(expected,env);const a=math.value(answer.left,env),b=answer.right?math.value(answer.right,env):env[target];if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>1e-8*Math.max(1,Math.abs(a),Math.abs(b))){valid=false;break;}if(answer.right){env[target]+=1.37;if(Math.abs(math.value(answer.left,env)-math.value(answer.right,env))>1e-8)sensitivity++;}}
   if(valid&&(!answer.right||sensitivity>=20))return {status:'correct'};
  }catch{/* Try another permitted formula. */}
 }
 return parsed?{status:'incorrect'}:{status:'unrecognized',message:rule==='pythagoras'?'Запишите связь квадратов катетов и гипотенузы словами или формулой.':'Проверьте обозначения: S, a, b, c, h, p, r, R, alpha. Корень: sqrt(...).'};
}
