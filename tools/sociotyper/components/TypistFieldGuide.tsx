import React, { useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Compass, Flame, Layers3, ScrollText } from 'lucide-react';
import { ASPECT_GUIDE, MODEL_A_GUIDE, QUADRA_GUIDE, REININ_GUIDE, WISDOM_TIPS } from '../data/typistFieldGuide';

type Tab = 'reinin' | 'quadra' | 'aspects' | 'model-a' | 'wisdom';

export const WisdomScroll: React.FC<{ compact?: boolean; index: number; onIndex: (index: number) => void }> = ({ compact, index, onIndex }) => {
  const tip = WISDOM_TIPS[index % WISDOM_TIPS.length];
  const move = (delta: number) => onIndex((index + delta + WISDOM_TIPS.length) % WISDOM_TIPS.length);
  return <aside className={`tw-wisdom ${compact ? 'is-compact' : ''}`}>
    <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
    <div className="tw-wisdom-mark"><Compass size={compact ? 30 : 45} /><span>ᚨ</span></div>
    <div className="tw-wisdom-copy"><small>— Свиток мудрости —</small><h3>{tip.title}</h3><p>{tip.text}</p></div>
    <div className="tw-wisdom-nav"><button onClick={() => move(-1)} aria-label="Предыдущий совет"><ChevronLeft size={17} /></button><span>{index + 1} / {WISDOM_TIPS.length}</span><button onClick={() => move(1)} aria-label="Следующий совет"><ChevronRight size={17} /></button></div>
  </aside>;
};

export const TypistFieldGuide: React.FC = () => {
  const [tab, setTab] = useState<Tab>('reinin');
  const [wisdom, setWisdom] = useState(0);
  return <section className="tw-field-guide">
    <div className="tw-field-guide-head"><div><span className="tw-kicker">Можно читать во время анализа</span><h2><BookOpen size={25} /> Полевой справочник типировщика</h2><p>Не тест и не набор ярлыков. Это карта того, какие независимые сигналы проверяет система.</p></div><span>15 + 1 + 8</span></div>
    <div className="tw-guide-nav">
      <button className={tab === 'reinin' ? 'is-active' : ''} onClick={() => setTab('reinin')}><Layers3 size={15} /> 15 Рейнина</button>
      <button className={tab === 'quadra' ? 'is-active' : ''} onClick={() => setTab('quadra')}><Flame size={15} /> Дух квадры</button>
      <button className={tab === 'aspects' ? 'is-active' : ''} onClick={() => setTab('aspects')}>8 аспектов</button>
      <button className={tab === 'model-a' ? 'is-active' : ''} onClick={() => setTab('model-a')}>Модель А</button>
      <button className={tab === 'wisdom' ? 'is-active' : ''} onClick={() => setTab('wisdom')}><ScrollText size={15} /> Мудрость</button>
    </div>

    {tab === 'reinin' && <div className="tw-reinin-guide">{REININ_GUIDE.map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{item.title}</h3><b>{item.short}</b><p>{item.text}</p><small>{item.trap}</small></div></article>)}</div>}
    {tab === 'quadra' && <div className="tw-quadra-guide">{QUADRA_GUIDE.map(item => <article key={item.name}><span>{item.name.slice(0, 1)}</span><h3>{item.name}</h3><b>{item.aspects}</b><p>{item.text}</p></article>)}<p className="tw-guide-caveat">Квадра описывает предпочитаемую атмосферу ценностей. Она не выбирает ТИМ без подтверждения функциями и признаками.</p></div>}
    {tab === 'aspects' && <div className="tw-aspect-guide">{ASPECT_GUIDE.map(item => <article key={item.id}><span>{item.code}</span><div><h3>{item.name}</h3><p>{item.focus}</p><small><b>Тень:</b> {item.shadow}</small><small><b>Дар:</b> {item.gift}</small></div></article>)}</div>}
    {tab === 'model-a' && <div className="tw-model-a-guide">{MODEL_A_GUIDE.map(item => <article key={item[0]}><span>{item[0]}</span><div><h3>{item[1]}</h3><p>{item[2]}</p></div></article>)}</div>}
    {tab === 'wisdom' && <WisdomScroll index={wisdom} onIndex={setWisdom} />}
  </section>;
};
