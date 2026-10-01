const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const edit=(p,f)=>{p=path.join(root,p);fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')))};
edit('src/data.ts',s=>{
 const start=s.indexOf('['),end=s.lastIndexOf('\n];');
 const original=Function('return '+s.slice(start,end+2))().filter(c=>!c.id.startsWith('img-'));
 fs.writeFileSync(path.join(root,'public/catalog/base.json'),JSON.stringify(original,null,2));
 return `import { Flashcard } from './types';
let cache: Flashcard[] | null = null;
export const getTotalCardsCount = () => cache?.length || 0;
export async function fetchCards(offset: number, limit: number): Promise<Flashcard[]> {
 if (!cache) {
  const lists = await Promise.all(['/catalog/base.json','/catalog/ege.json'].map(async url => {
   const res = await fetch(url); if (!res.ok) throw new Error('Не удалось загрузить каталог'); return await res.json() as Flashcard[];
  })); cache=lists.flat();
 }
 return cache.slice(offset,offset+limit);
}
`;
});
edit('src/types.ts',s=>s.replace('  interval?: string;',`  interval?: string;
  mastery?: 'known' | 'learning';
  source?: string;
  sourceUrl?: string;
  objective?: string;
  pending?: boolean;`));
edit('src/App.tsx',s=>s
 .replace('getTotalCardsCount, generateMoreCards','getTotalCardsCount')
 .replace("readSaved('study_cards_v1', [])","readSaved('study_cards_v1', []).filter((c: Flashcard) => !c.id.startsWith('img-'))")
 .replace("{ ...c, quality: known ? 'good' : 'bad' }","{ ...c, mastery: known ? 'known' : 'learning' }")
 .replaceAll('!c.deleted &&','!c.deleted && !c.pending &&')
 .replace('const CHUNK_SIZE = 1000;','const CHUNK_SIZE = 10000;')
 .replace('console.error(\'Failed to load cards:\', err);',"setGenerationNotice('Не удалось загрузить каталог. Проверьте соединение и обновите страницу.');")
 .replace('<TeacherView cards={cards} />','<TeacherView cards={cards} onChange={next => { setCards(next); resetSession(); }} />')
 .replace("interval: '1 день'\n        }));","interval: '1 день', pending: true\n        }));")
 .replace('(${newFlashcards.length} карточек) ${sourceLabel}!', '(${newFlashcards.length} карточек) ${sourceLabel}. Проверьте и одобрите их в разделе «Для учителя».')
 .replace('{isFlipped ? currentCard.back : currentCard.front}\n                          </div>',`{isFlipped ? currentCard.back : currentCard.front}
                          </div>
                          {currentCard.source && <p className="text-xs text-zinc-500 mt-5">Источник: {currentCard.source}</p>}
                          {isFlipped && <div className="flex flex-wrap items-center gap-2 mt-5 text-xs"><span>Качество материала:</span>{(['good','average','bad'] as const).map((quality,i)=><button key={quality} onClick={e=>{e.stopPropagation();setCards(prev=>prev.map(c=>c.id===currentCard.id?{...c,quality}:c));}} aria-pressed={currentCard.quality===quality} className={\`border rounded-lg px-3 py-2 \${currentCard.quality===quality?'bg-emerald-100 border-emerald-600':'bg-white'}\`}>{['Хорошая','Средняя','Плохая'][i]}</button>)}</div>}`)
 );
// Replace inherited punctuation in source text, including reused educational material.
function clean(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())clean(p);else if(/\.(tsx?|js|css|json)$/.test(f.name))edit(path.relative(root,p),s=>s.replaceAll(String.fromCharCode(8212),'-'));}}
clean(path.join(root,'src'));clean(path.join(root,'sources'));clean(path.join(root,'public'));
