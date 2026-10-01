const fs=require('fs');const root=__dirname+'/../';
let s=fs.readFileSync(root+'src/App.tsx','utf8');
s=s.replace('user={mockUser}','user={{...mockUser, daysActive: rewards.dates.length}}');
s=s.replace('count: 8,','count: 50,');
s=s.replace('const sourceLabel = data.source', 'const sourceLabel = data.source');
const from=s.indexOf('              {/* Add Material */}'),to=s.indexOf('\n              \n            </div>',from);
if(from>=0&&to>=0)s=s.slice(0,from)+`              <div className="bg-white rounded-3xl p-6 border border-zinc-100"><h3 className="font-semibold mb-2">Свои карточки</h3><p className="text-sm text-zinc-500 mb-3">Предложите вопрос и ответ, проверьте материал и добавьте его в обучение.</p><button className="text-emerald-700 font-semibold" onClick={()=>setCurrentView('teacher')}>Открыть редактор</button></div>`+s.slice(to);
const combo=s.indexOf('              {/* Combo */}'),comboEnd=s.indexOf('\n            </div>\n          </div>',combo);
if(combo>=0&&comboEnd>=0)s=s.slice(0,combo)+`              <div className="bg-[#FAF0E6] rounded-3xl p-6"><p className="text-xs uppercase text-amber-800 mb-3">Мои достижения</p><h3 className="font-bold text-2xl">{rewards.xp} XP · {rewards.gems} кристаллов</h3><p className="text-sm mt-3">Завершено сессий: {rewards.sessions}</p><p className="text-sm mt-2">За все карточки сессии и повторы: +50 XP и +15 кристаллов.</p></div>`+s.slice(comboEnd);
const forecast=s.indexOf('            {/* Forecast */}'),forecastEnd=s.indexOf('            {/* Create Deck with AI */}',forecast);
if(forecast>=0&&forecastEnd>=0)s=s.slice(0,forecast)+`            <div className="bg-[#EAF4ED] rounded-3xl p-6"><h3 className="font-semibold">Ваша библиотека</h3><p className="text-sm mt-2">{cards.filter(c=>!c.deleted&&!c.pending).length} карточек для обучения. Освоено: {cards.filter(c=>!c.deleted&&!c.pending&&c.mastery==='known').length}. На проверке: {cards.filter(c=>c.pending&&!c.deleted).length}.</p><p className="text-xs mt-2 text-zinc-500">Карточки ЕГЭ предназначены для тематического повторения, они не заменяют полный экзаменационный вариант.</p></div>\n`+s.slice(forecastEnd);
s=s.replace('Мозг не удаляет знания - он просто прячет их глубже, если ими не пользоваться.','Почему повторение по памяти помогает учиться?');
fs.writeFileSync(root+'src/App.tsx',s);
let f=fs.readFileSync(root+'src/components/FactModal.tsx','utf8');
const start=f.indexOf('const SCIENCE_FACTS'),end=f.indexOf('\ninterface FactModalProps');
f=f.slice(0,start)+`const SCIENCE_FACTS = [
 {id:'f1',topic:'Математика',title:'Почему мы забываем?',short:'Карточка помогает заметить разницу между узнаванием и самостоятельным ответом.',deepDive:['Когда ответ перед глазами, легко принять знакомую формулировку за умение воспроизвести её. Закрытый ответ позволяет проверить себя.','Сначала попробуйте ответить, затем сравните с решением. Если ошиблись, разберите причину и повторите карточку.'],takeaway:'Кнопка «Не знаю» возвращает карточку в очередь этой сессии.',icon:'🧠'},
 {id:'f2',topic:'Физика',title:'Свет меняет направление',short:'Преломление связано с изменением скорости распространения света в среде.',deepDive:['Показатель преломления n = c/v. При переходе из воздуха в стекло скорость света уменьшается.','Закон Снеллиуса: n₁ sin α = n₂ sin β. Углы отсчитывают от нормали к границе, а не от самой поверхности.'],takeaway:'Сначала нарисуйте нормаль, затем отмечайте углы.',icon:'🔎'},
 {id:'f3',topic:'Логика',title:'Правдоподобно не значит доказано',short:'Из «если A, то B» и истинности B нельзя автоматически вывести A.',deepDive:['Если идёт дождь, дорога мокрая. Но мокрая дорога не доказывает дождь: её могли полить.','Чтобы опровергнуть общий вывод, достаточно одного корректного контрпримера.'],takeaway:'Ищите альтернативное объяснение наблюдаемого результата.',icon:'💡'},
 {id:'f4',topic:'Математика',title:'Проценты не всегда отменяются',short:'Повышение на 20% и снижение на 20% не возвращают исходное значение.',deepDive:['100 · 1,2 = 120. Затем 120 · 0,8 = 96. Проценты во второй операции считаются от новой базы.'],takeaway:'Последовательные процентные изменения удобно перемножать как коэффициенты.',icon:'📐'}
];\n`+f.slice(end);
fs.writeFileSync(root+'src/components/FactModal.tsx',f);
