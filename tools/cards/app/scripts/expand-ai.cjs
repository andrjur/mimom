const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..'),file=path.join(root,'public/catalog/base.json');
const cards=JSON.parse(fs.readFileSync(file,'utf8')).filter(c=>!c.id.startsWith('ai-study-'));
let idx=0;
const add=(objective,front,back)=>cards.push({id:`ai-study-${++idx}`,topic:'Искусственный интеллект',objective,front,back,source:'Авторский курс: основы машинного обучения и работа с ИИ'});
const concepts=fs.readFileSync(path.join(root,'sources/ai-concepts.txt'),'utf8').trim().split(/\r?\n/).map(line=>line.split('|'));
if(concepts.length!==70||concepts.some(row=>row.length!==4))throw Error('Ожидается 70 записей по четыре поля');
for(const [term,definition,question,answer] of concepts){add(term,`Что такое «${term}» в работе с ИИ?`,definition);add(term,question,answer);}
for(let n=1;n<=14;n++){
 const tp=3*n,fp=n,fn=2*n,tn=4*n;
 add('Расчёт precision',`Классификатор спама: TP = ${tp}, FP = ${fp}. Найди precision.`,`Precision = TP/(TP+FP) = ${tp}/${tp+fp} = 0,75. Среди помеченных сообщений 75% действительно спам.`);
 add('Расчёт recall',`Классификатор спама: TP = ${tp}, FN = ${fn}. Найди recall.`,`Recall = TP/(TP+FN) = ${tp}/${tp+fn} = 0,6. Найдено 60% реально положительных примеров.`);
 add('Расчёт accuracy',`Матрица ошибок: TP = ${tp}, FP = ${fp}, FN = ${fn}, TN = ${tn}. Найди accuracy.`,`Всего ${tp+fp+fn+tn} примеров, верных ${tp+tn}. Accuracy = (TP+TN)/(TP+FP+FN+TN) = 0,7. При дисбалансе это число нужно дополнять другими метриками.`);
 add('Расчёт F1',`В тесте модели TP = ${2*n}, FP = ${n}, FN = ${n}. Найди F1 напрямую через матрицу ошибок.`,`F1 = 2TP/(2TP+FP+FN) = ${4*n}/${6*n} = 2/3 ≈ 0,667. Здесь precision и recall также равны 2/3.`);
 add('Расчёт MAE',`Ошибки регрессионной модели (прогноз минус цель): ${n}, ${-2*n}, ${3*n}. Найди MAE.`,`MAE = (|${n}| + |${-2*n}| + |${3*n}|)/3 = ${6*n}/3 = ${2*n}. Знаки ошибок не компенсируют друг друга.`);
 add('Расчёт MSE',`Ошибки регрессионной модели: ${n}, ${-n}, ${2*n}. Найди MSE.`,`MSE = (${n*n} + ${n*n} + ${4*n*n})/3 = ${2*n*n}. Единицы MSE являются квадратом единиц целевой величины.`);
 add('Линейный нейрон',`Линейный слой без активации: y = 2x₁ - x₂ + 1. Найди выход при x₁ = ${n}, x₂ = ${n+3}.`,`y = 2·${n} - ${n+3} + 1 = ${n-2}. Вес второго признака отрицательный, свободный член равен 1.`);
 add('Шаг градиентного спуска',`Функция потерь L(w) = (w - ${n})². Начальный вес w = ${n+5}, скорость обучения η = 0,1. Выполни один шаг градиентного спуска.`,`L′(w) = 2(w - ${n}). В начальной точке градиент равен 10. Новый вес: ${n+5} - 0,1·10 = ${n+4}. Потеря уменьшается с 25 до 16.`);
 add('Скалярное произведение',`Векторы представлений a = (${n}, 1), b = (2, ${n+1}). Найди скалярное произведение. Это уже косинусное сходство?`,`a·b = ${n}·2 + 1·${n+1} = ${3*n+1}. Это не косинус: нужно разделить на |a||b| = √(${n*n+1})·√(${4+(n+1)**2}).`);
 add('Бюджет контекста',`Условная модель допускает 8192 токена ввода и вывода суммарно. Инструкции занимают 512, вопрос 256, документы ${n*256}, резерв ответа 1024. Сколько токенов свободно?`,`Занято 512 + 256 + ${n*256} + 1024 = ${1792+n*256}. Осталось 8192 - ${1792+n*256} = ${6400-n*256}. Это учебный пример: реальные правила окна и оплаты зависят от API.`);
}
if(idx!==280)throw Error('Ожидается 280 новых карточек');
fs.writeFileSync(file,JSON.stringify(cards,null,2));
const ege=JSON.parse(fs.readFileSync(path.join(root,'public/catalog/ege.json'),'utf8'));
const all=[...cards,...ege];
fs.writeFileSync(path.join(root,'public/catalog/manifest.json'),JSON.stringify({version:2,total:all.length,illustrated:all.filter(c=>c.imageUrl).length,topics:Object.fromEntries([...new Set(all.map(c=>c.topic))].map(t=>[t,all.filter(c=>c.topic===t).length]))},null,2));
console.log(`Всего ${all.length}, иллюстрировано ${all.filter(c=>c.imageUrl).length}`);
