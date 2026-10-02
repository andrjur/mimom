const products=[
{title:'Экспресс-тест «9 сфер»',price:'0 ₽',text:'Таблица для самоаудита и выбора текущего приоритета.',href:'/9-sfer/',cta:'Получить таблицу'},
{title:'Личный навигатор «9 сфер»',price:'390 ₽',text:'Расширенная работа с выбранным приоритетом и маршрутом на неделю.',href:'/apply/?track=9-sfer',cta:'Уточнить навигатор'},
{title:'Summa Vitae',price:'990 ₽',text:'Самооценка текущей жизни: субъективные оценки и наблюдаемые факты.',href:'/apply/?track=9-sfer',cta:'Уточнить получение'},
{title:'Практика «Один слой»',price:'590 ₽',text:'Аудиопрактика по одной ситуации и одному доступному чувству.',href:'/one-layer/',cta:'Посмотреть практику'},
{title:'«Дефрагментация»',price:'990 ₽',text:'Рабочая тетрадь: один приоритет и семидневный эксперимент с AGROW.',href:'/apply/?track=coaching',cta:'Уточнить материалы'},
{title:'Личная перезагрузка',price:'1 990 ₽',text:'Самостоятельный комплект: Summa Vitae, «Один слой» и «Дефрагментация». Это комплект материалов, а не VIP-сопровождение.',href:'/apply/?track=coaching',cta:'Уточнить комплект'},
{title:'Комплект с личным разбором',price:'3 900–4 900 ₽',text:'Материалы и 40 минут обсуждения приоритета и следующего шага. Отличается от двухчасового архитектурного аудита.',href:'/apply/?track=coaching',cta:'Обсудить разбор'},
{title:'«Клиент говорит»',price:'от 390 ₽',text:'Типирование и тренажёр коммуникации для специалистов. Доступный формат уточняйте перед оплатой.',href:'/apply/?track=typology',cta:'Уточнить тренажёр'}
];
export default function Catalog(){return <div className="catalogGrid">{products.map((p,i)=><article key={p.title} className={'catalogCard tone'+i%3}><div className="catalogMeta"><span>МАТЕРИАЛ {String(i+1).padStart(2,'0')}</span><b>{p.price}</b></div><h2>{p.title}</h2><p>{p.text}</p><a className="textLink" href={p.href}>{p.cta}</a></article>)}</div>}
