/* eslint-disable @typescript-eslint/no-explicit-any */
import ReactMarkdown from 'react-markdown';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AnalysisResult, DichotomyResult, RankedTim, ChatResponse, TypingSession } from '../types';
import { ChatPanel } from './ChatPanel';
import { getChatResponse, getActiveProviderConfig } from '../services/geminiService';
import { ChatMessage } from '../types';
import { LockClosedIcon, LockOpenIcon } from './Icons';
import { TIM_DEFINITIONS } from '../constants';
import { IntertypeRelationsPanel } from './IntertypeRelationsPanel';
import { SocionicsMatrix } from './SocionicsMatrix';
import { LoreCodex } from './LoreCodex';
import { TIM_EXTRA_DETAILS } from '../data/timExtraDetails';
import { StatsDashboard } from './StatsDashboard';
import { trackChatTokens, trackRating } from '../services/statsService';
import { CANONICAL_TYPOLOGIES } from '../data/alternativeTypologies';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Mail, Copy, Download, Check, FileText, Star } from 'lucide-react';


import { analyzeCompatibility, analyzeMotivation } from '../services/geminiService';
import { INTERTYPE_RELATIONS_DATA, RELATION_METADATA } from './relations';

interface ResultScreenProps {
  result: AnalysisResult;
  rankedTims: RankedTim[];
  selectedTimAbbreviation: string;
  onSelectTim: (abbreviation: string) => void;
  monologue: string;
  lockedDichotomies: Record<string, string>;
  lockedPsychosophy: Record<string, any>;
  setLockedPsychosophy: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onRestart: () => void;
  onReanalyze: (chatHistory?: ChatMessage[], lockedPsych?: Record<string, any>) => void;
  onDichotomyChange: (name: string, newResult: string) => void;
  onLockDichotomy: (name: string, result: string) => void;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  sessionName: string;
  sessions: TypingSession[];
  activeSessionId: string;
  compactForTypist?: boolean;
}

const DICHOTOMY_PRIORITIES: { [key: string]: 'high' | 'medium' } = {
    'Логика / Этика': 'high',
    'Интуиция / Сенсорика': 'high',
    'Экстраверсия / Интроверсия': 'high',
    'Рациональность / Иррациональность': 'high',
};

const DichotomyCard: React.FC<{ 
    item: DichotomyResult, 
    isLocked: boolean,
    isMatch: boolean,
    expectedValue: string,
    selectedTimAbbr: string,
    priority: 'high' | 'medium' | 'low',
    index: number,
    onLock: (name: string, result: string) => void,
    onSelect: (name: string, newResult: string) => void,
    onPrefillChat: (question: string) => void
}> = ({ item, isLocked, isMatch, expectedValue, selectedTimAbbr, priority, index, onLock, onSelect, onPrefillChat }) => {
  const [pole1, pole2] = item.name.split(' / ');
  const isPole1 = item.result === pole1;
  const confidence = Math.min(100, Math.max(0, item.confidence ?? 0));
  const hasEvidence = confidence > 0 && (item.result === pole1 || item.result === pole2);

  // Calculate proportional button widths (bounded between 35% and 65% for aesthetic balance)
  const pct1 = !hasEvidence ? 50 : isPole1 ? confidence : (100 - confidence);
  const minWidth = 35;
  const maxWidth = 65;
  const range = maxWidth - minWidth;
  const width1 = minWidth + ((pct1 / 100) * range);
  const width2 = 100 - width1;

  const justificationText = isPole1 ? item.justification_pole1 : item.justification_pole2;

  const handleSelect = (selectedPole: string) => {
      if (isLocked) return;
      onSelect(item.name, selectedPole);
  }

  // Visual status and matching indicators
  const borderClass = !hasEvidence ? 'border-brand-cream-dark' : isMatch 
    ? 'border-emerald-500 bg-emerald-500/5' 
    : 'border-rose-400 bg-rose-50/20';

  // Determine which pole is expected according to the top-level TIM selected
  const isExpectedPole1 = expectedValue === pole1;

  return (
      <div className={`bg-brand-surface p-4 rounded-xl border ${borderClass} relative transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md`}>
      {/* Card Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 mr-2 text-left">
          <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-brand-text-secondary flex items-center gap-1.5">
            <span className="opacity-50 font-sans">{index}.</span>
            {item.name}
          </h3>
          <p className="text-[10px] mt-0.5 font-bold font-sans">
            {!hasEvidence ? <span>Недостаточно данных · уверенность {confidence}%</span> : isMatch ? (
              <span className="text-emerald-600">✓ Соответствует ТИМу {selectedTimAbbr}</span>
            ) : (
              <span className="text-rose-600">⚠ Несоответствие: ТИМ {selectedTimAbbr} требует «{expectedValue}»</span>
            )}
          </p>
        </div>
        <button disabled={item.result !== pole1 && item.result !== pole2 && !isLocked} title="Зафиксировать выбранный полюс" onClick={() => onLock(item.name, item.result)} className="p-1 text-brand-text-secondary hover:text-brand-primary flex-shrink-0 transition-colors">
          {isLocked ? <LockClosedIcon className="text-brand-gold w-4 h-4"/> : <LockOpenIcon className="w-4 h-4"/>}
        </button>
      </div>

      {/* Proportional Interactive Buttons */}
      <div className="flex justify-between items-center gap-2 mb-3">
        <button 
            onClick={() => handleSelect(pole1)}
            disabled={isLocked && !isPole1}
            style={{ width: `${width1}%` }}
            className={`font-semibold text-xs py-2 px-1 rounded-lg transition-all text-center border cursor-pointer truncate ${
              isPole1 
                ? 'bg-brand-primary text-white border-brand-primary shadow-sm font-bold scale-[1.02]' 
                : isExpectedPole1 && !isLocked
                ? 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border-dashed border-emerald-500/60 animate-pulse font-bold'
                : 'bg-brand-bg hover:bg-brand-cream-dark text-brand-text border-brand-cream-dark disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
            title={pole1}
        >
            {pole1} {!hasEvidence ? '(—)' : isPole1 ? `(${confidence}%)` : '(—)'}
        </button>
        <button 
            onClick={() => handleSelect(pole2)}
            disabled={isLocked && isPole1}
            style={{ width: `${width2}%` }}
            className={`font-semibold text-xs py-2 px-1 rounded-lg transition-all text-center border cursor-pointer truncate ${
              !isPole1 
                ? 'bg-brand-primary text-white border-brand-primary shadow-sm font-bold scale-[1.02]' 
                : !isExpectedPole1 && !isLocked
                ? 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border-dashed border-emerald-500/60 animate-pulse font-bold'
                : 'bg-brand-bg hover:bg-brand-cream-dark text-brand-text border-brand-cream-dark disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
            title={pole2}
        >
            {pole2} {!hasEvidence ? '(—)' : !isPole1 ? `(${confidence}%)` : '(—)'}
        </button>
      </div>

      {/* Justification Text */}
      <p className="text-[11px] text-brand-text-secondary leading-relaxed mt-1 text-left italic">
        {justificationText}
      </p>

      {/* AI Clarification Action Button */}
      <div className="mt-3 pt-2.5 border-t border-brand-primary/5 flex justify-between items-center text-[10px]">
        <span className="text-brand-text-secondary font-medium font-mono">Приоритет: {priority === 'high' ? 'Высокий' : priority === 'medium' ? 'Средний' : 'Базовый'}</span>
        <button
          onClick={() => onPrefillChat(`Поясни, пожалуйста, подробнее результаты ИИ-анализа по дихотомии «${item.name}». Сейчас в результатах определен полюс «${item.result}» с уверенностью ${confidence}%, однако для типа «${selectedTimAbbr}» характерна «${expectedValue}». На основе каких маркеров в моем тексте ты сделал такой вывод, и как разрешить это противоречие?`)}
          className="text-brand-primary font-bold hover:text-brand-secondary transition-colors flex items-center gap-1 bg-brand-primary/5 hover:bg-brand-primary/10 px-2 py-1 rounded cursor-pointer"
        >
          💬 Прояснить у ИИ
        </button>
      </div>
    </div>
  );
};

const QUADRAS = ['Альфа', 'Бэта', 'Гамма', 'Дельта'];

const QUADRA_SPIRITS: Record<string, { title: string, season: string, description: string, values: string }> = {
  'Альфа': {
    title: 'Альфа',
    season: 'Весна — зарождение идей, беззаботность и уют',
    description: 'Дух Весны: атмосфера беззаботного поиска истины, открытости новому опыту, веселья и уюта. Здесь ценятся оригинальные теории, искренний смех, отсутствие чинов и иерархий, дружелюбие и домашнее тепло.',
    values: 'Ценности квадры: ЧИ (интуиция возможностей), БС (сенсорика ощущений), ЧЭ (этика эмоций), БЛ (структурная логика)'
  },
  'Бэта': {
    title: 'Бэта',
    season: 'Лето — страсть, борьба и великие свершения',
    description: 'Дух Лета: высокая эмоциональность, решимость изменить мир, преданность общей идее и упорная борьба с трудностями. Здесь ценятся воля, сила духа, дисциплина, романтика подвигов и верность иерархии.',
    values: 'Ценности квадры: ЧС (волевая сенсорика), БИ (интуиция времени), ЧЭ (этика эмоций), БЛ (структурная логика)'
  },
  'Гамма': {
    title: 'Гамма',
    season: 'Осень — прагматизм, сбор урожая и реформы',
    description: 'Дух Осени: индивидуальная предприимчивость, прагматизм, критическое мышление и решительные реформаторские действия. Здесь ценятся реальная польза, эффективность, здоровая конкуренция и независимость.',
    values: 'Ценности квадры: ЧС (волевая сенсорика), БИ (интуиция времени), ЧЛ (деловая логика), БЭ (этика отношений)'
  },
  'Дельта': {
    title: 'Дельта',
    season: 'Зима — мудрость, созидание и душевная гармония',
    description: 'Дух Зимы: глубокий гуманизм, стабильность, профессионализм и душевное равновесие. Здесь ценятся качественный созидательный труд, экологичность отношений, тепло семейного очага и самосовершенствование.',
    values: 'Ценности квадры: ЧИ (интуиция возможностей), БС (сенсорика ощущений), ЧЛ (деловая логика), БЭ (этика отношений)'
  }
};

const PSYCHOSOPHY_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  '1Л': {
    title: '1Л — Догматик (Первая Логика)',
    description: 'Выраженная, единоличная, самоуверенная, недостаточно гибкая. Вы носите в себе законченную картину мира, которую кропотливо выстраивали сами. Когда жизнь ее обрушает, вынув один-два кирпича внизу, вы начинаете так же кропотливо выстраивать новую. Вы уверены в своем видении мира, подчас можете навязывать его другим, вас сложно переубедить в нем. Вы любите догмы: либо берете готовые, устраивающие вас, либо создаете их сами.'
  },
  '1В': {
    title: '1В — Царь (Первая Воля)',
    description: 'Непреклонная, неcгибаемая. Выраженная, единоличная воля. Прочный внутренний стержень, негибкий. “Я”. “Я ТАК живу”. “Я тут решил, а вы как хотите…” “Я знаю, чего я хочу, и я этого добьюсь”. В худших проявлениях это будет диктатор и самодур. А так это просто несговорчивый и непреклонный человек (причем лишь в тех случаях, когда он чего-то не хочет). Т.е. если он чего-то не хочет, его невозможно переубедить или договориться.'
  },
  '1Э': {
    title: '1Э — Романтик (Первая Эмоция)',
    description: 'Самоуверенная, негибкая. Выраженная и единоличная. Проявляете свои эмоции без оглядки на других и подчас сильнейше воздействуете этим на окружающих, к месту или не к месту – неважно, вас это не волнует. Вы считаете это своим полным правом и предполагаете, что если кто-то не разделяет ваших чувств, то он заявит вам об этом. Расплакаться, приведя человека в замешательство, всех заразить своим приподнятым настроением, даже если это сейчас не к месту, или навесить мрачную угрюмую атмосферу, угнетающую всех вокруг – вам это по плечу.'
  },
  '1Ф': {
    title: '1Ф — Собственник (Первая Физика)',
    description: 'Выраженная, яркая, подчеркнутая телесность, не подстраивающаяся под других. Уверенно действуете в вопросах силы, внешности, красоты, здоровья, обустройства быта, хорошо разбираетесь в этом во всем. Готовы поделиться своим комфортом с другими – но так, как ВАМ удобно. Прекрасно чувствуете свое тело, обладаете физической энергетикой, которой как бы заполняете пространство. Любите окружать себя красивыми дорогими вещами. Наслаждаетесь инстинктами, чувственностью, телесностью. Вам чужд аскетизм, не понимаете тех, кто ужимает себя. Любите телесные радости (массаж, бассейн, косметологов, спорт). Благополучие, выгода и процветание – важный двигатель вашей деятельности.'
  },
  '2Л': {
    title: '2Л — Ритор (Вторая Логика)',
    description: 'Выраженная, уверенная, гибкая, тонко взаимодействующая с чужой. Непринужденно вовлекаете в диалог, задавая вопросы, даже если ответ вам известен досконально. Вам интересно не выдавать вовне результат своих размышлений, а находиться в обмене мыслями с собеседником. Поэтому любите диспуты, споры, дискуссии. Второй логике важно не просто высказаться, а обязательно выслушать ответное мнение, рассмотреть его, сделать интеллектуальную игру общей, позволить собеседнику раскрыться в своей логике, даже если та несовершенна.'
  },
  '2В': {
    title: '2В — Дворянин (Вторая Воля)',
    description: 'Уверенная, твердая, но гибкая, учитывающая волю других. Выраженная, гибко взаимодействующая воля. В отличие от человека первой воли вы готовы договариваться, подстраиваться, искать ВЗАИМОвыгодные решения: “Давайте решать вместе!” “Я предлагаю поступить так-то. А как хочешь ты?”'
  },
  '2Э': {
    title: '2Э — Актер (Вторая Эмоция)',
    description: 'Уверенная, гибкая, тонко подстраивающаяся под других. Выраженная, но в отличие от первой эмоции гибко взаимодействующая. Мастер эмоций, умело пускаете их в ход, играете ими, прислушиваясь к эмоциональному ответу других, подстраиваясь под их состояние, чутко вовлекая их в этот процесс. Вам нравится строить эмоциональный диалог, получать ответ, создавать совместную игру, сопереживать, сонастраиваться и согревать словом.'
  },
  '2Ф': {
    title: '2Ф — Труженик (Вторая Физика)',
    description: 'Выраженная, гибко взаимодействующая, тонко подстраивающаяся под других. Уверенно чувствуете себя в вопросах тела, комфорта, внешности, удовольствий. Можете подстроиться под других в этих вопросах и дать им поддержку в этом. В отличие от первой физики вам очень важно, что чувствует партнер. Бесстрашны во всем, что касается физического взаимодействия. Доверяете своему телу и его гибкости. Вторая физика стремится иметь детей, опекает их, совершенно неутомима в быту, с удовольствием готовит, наводит порядок и занимается ремеслом.'
  },
  '3Л': {
    title: '3Л — Скептик (Третья Логика)',
    description: 'Маловыраженная, уязвимая, неуверенная, нуждающаяся в мягкой помощи и поддержке. Требующая бережного обращения, проявляемая с осторожностью и неуверенно либо скрываемая. Не любите категоричные утверждения самоуверенной первой логики, подвергаете их сомнению, т.к. это задевает ваше самолюбие. Вам сложно собрать разрозненные факты в стройную законченную картину и расставить в ней логические приоритеты. Неуверенно себя чувствуете в стихии логических и интеллектуальных словопрений, опасаетесь ударить в грязь лицом, поэтому прибегаете к психологической защите – скепсису, отрицанию, спорам, логическим придиркам, сомнению в чужих логических построениях.'
  },
  '3В': {
    title: '3В — Мещанин (Третья Воля)',
    description: 'Уязвимая. Маловыраженная, уязвимая воля, проявляемая с осторожностью и неуверенно либо скрываемая. Мятущаяся, нуждающаяся в мягкой помощи и поддержке в принятии решений и волеизъявлении. Не всегда чувствуете, когда имеете право хотеть, а когда и в чем – нет. Нет четкого представления о своих желаниях и о своем месте в мире, постоянно сомневаетесь в том, на что имеете право. Вам трудно до конца сказать ни «да» ни «нет»: приходится метаться между этими «да» и «нет», и в этом проявляется раздвоенность личности. Сложно признавать свою вину, когда виноваты. Универсальным средством самозащиты третьей воли становится ложь, создающая панцирь от чужих оценок.'
  },
  '3Э': {
    title: '3Э — Сухарь (Третья Эмоция)',
    description: 'Неуверенная, нуждающаяся в мягкой помощи и поддержке. Маловыраженная, уязвимая, проявляемая с осторожностью и неуверенно либо скрываемая. Каменное непроницаемое лицо. Не чувствуете, когда надо проявить эмоцию, когда – нет. Эмоции внешне выглядят стертыми, даже если кипят глубоко внутри. Внешне можете выглядеть равнодушным, с застывшим или непроницаемым лицом. Речь может звучать однообразно, монотонно, без выражения. Вам трудно широко и открыто улыбнуться или в голос рассмеяться. С трудом выдерживаете эмоциональное давление, чьи-то истерики и бурное изъявление чувств. Упреки в сухости и черствости болезненны для вас. Психологическая защита – ирония.'
  },
  '3Ф': {
    title: '3Ф — Недотрога (Третья Физика)',
    description: 'Маловыраженная, уязвимая. Требующая бережного обращения, проявляемая с осторожностью и неуверенно либо скрываемая. Неуверенно себя чувствуете в вопросах тела, комфорта, внешности, удовольствий, нуждаетесь в мягкой помощи или поддержке. Не всегда чувствуете, когда надо, когда – нет. Болезненно реагируете на бестактные замечания насчет этого. Стремитесь доказать миру, что вы в этом на высоте. Иногда включается психологическая защита – ханжество (недотрога, втайне мечтающая об обратном). Очень чувствительны к чужой боли.'
  },
  '4Л': {
    title: '4Л — Школяр (Четвертая Логика)',
    description: 'Маловыраженная, пассивная. Вам неохота тратить свою жизнь на поиски смысла и стройной законченной картины мира. Вам не важна истина, главное – “чтобы работало”. Если требуется установить истину, провести системный анализ, логически выработать и утвердить идеологию, построить стройную логическую систему, вы предпочтете переложить это на других и воспользоваться готовым плодом их труда.'
  },
  '4В': {
    title: '4В — Крепостной (Четвертая Воля)',
    description: 'Маловыраженная, пассивная. Спокойно-нейтральная, пассивная. Безразличие к собственному волеизъявлению, к “необходимости иметь внутренний волевой стержень”. Расплывчатые представления о своих желаниях, поэтому можете спокойно принять чужие желания и решения как свои. Если есть верх и низ, то себя можете спокойно поставить вниз. Нет желания быть лидером, вести, самоутверждаться через ведущую роль, управлять людьми, особенно честолюбивыми и волевыми. Можете подстраиваться под первовольного человека, быть податливым его воле и решениям.'
  },
  '4Э': {
    title: '4Э — Зевака (Четвертая Эмоция)',
    description: 'Маловыраженная, пассивная. Четвертая эмоция – маловыраженная по сравнению с первой или второй, но в ней нет такой уязвимости, как у третьей. Вы РОВНО выражаете свои эмоции и чувства, для вас их ВНЕШНЕЕ выражение НЕ ТАК ВАЖНО. Можете заражаться эмоциями других, не пытаетесь задавать свою игру в этом. В итоге, эмоций на лице меньше, они поспокойнее, реже бывают бурными, но и не такие зажатые, подавленные или скованные, как в случае третьей.'
  },
  '4Ф': {
    title: '4Ф — Аскет (Четвертая Физика)',
    description: 'Маловыраженная, пассивная. Спокойная, в каком-то смысле безразличная к вопросам тела, комфорта, внешности, удовольствий. Не напрягаетесь на этот счет, считаете это не столь важным. Секс тоже занимает в вашей иерархии далеко не самые первые места. Вы любите полениться, не видите в этом ничего зазорного. Способны долго работать в суровых условиях, не замечая физических лишений.'
  }
};

const QuadraSelector: React.FC<{
    item: DichotomyResult,
    isLocked: boolean,
    isMatch: boolean,
    expectedQuadra: string,
    selectedTimAbbr: string,
    onLock: (name: string, result: string) => void,
    onSelect: (name: string, newResult: string) => void,
    onPrefillChat: (question: string) => void
}> = ({ item, isLocked, isMatch, expectedQuadra, selectedTimAbbr, onLock, onSelect, onPrefillChat }) => {
    const hasEvidence = (item.confidence ?? 0) > 0 && QUADRAS.includes(item.result);
    
    const handleSelect = (quadra: string) => {
        if(isLocked) return;
        onSelect(item.name, quadra);
    }
    const justificationText = 
        item.result === 'Альфа' ? item.justification_pole1 :
        item.result === 'Бэта' ? item.justification_pole2 :
        item.result === 'Гамма' ? item.justification_pole1 : 
        item.justification_pole2;
    
    const borderClass = !hasEvidence ? 'border-brand-cream-dark' : isMatch 
      ? 'border-emerald-500 bg-emerald-500/5' 
      : 'border-rose-400 bg-rose-50/20';

    const spirit = QUADRA_SPIRITS[item.result];

    return (
      <div className={`bg-brand-surface p-4 rounded-xl border ${borderClass} relative transition-all duration-300 shadow-sm text-left`}>
            <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-sm font-bold text-brand-text font-serif">Квадра</h3>
                  <p className="text-[10px] mt-0.5 font-bold font-sans">
                    {!hasEvidence ? <span>Недостаточно данных для квадры</span> : isMatch ? (
                      <span className="text-emerald-600">✓ Соответствует канону ТИМа {selectedTimAbbr}</span>
                    ) : (
                      <span className="text-rose-600">⚠ Несоответствие: ТИМ {selectedTimAbbr} принадлежит квадре «{expectedQuadra}»</span>
                    )}
                  </p>
                </div>
                <button onClick={() => onLock(item.name, item.result)} className="p-1 text-brand-text-secondary hover:text-brand-primary transition-colors">
                    {isLocked ? <LockClosedIcon className="text-brand-gold w-4 h-4"/> : <LockOpenIcon className="w-4 h-4"/>}
                </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
                {QUADRAS.map(quadra => {
                    const isSelected = item.result === quadra;
                    const isExpected = expectedQuadra === quadra;
                    return (
                        <button
                            key={quadra}
                            onClick={() => handleSelect(quadra)}
                            disabled={isLocked && !isSelected}
                            className={`font-semibold text-xs py-1.5 rounded-lg transition-all text-center border cursor-pointer ${
                              isSelected 
                                ? 'bg-brand-primary text-white border-brand-primary shadow-sm font-bold' 
                                : isExpected && !isLocked
                                ? 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border-dashed border-emerald-500/60 animate-pulse font-bold'
                                : 'bg-brand-bg hover:bg-brand-cream-dark text-brand-text border-brand-cream-dark disabled:opacity-40 disabled:cursor-not-allowed'
                            }`}
                        >
                            {quadra}
                        </button>
                    )
                })}
            </div>
            
            {spirit && (
                <div className="mt-3 p-3 bg-brand-bg/50 border border-brand-primary/5 rounded-xl text-left animate-fade-in mb-3">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-brand-primary/80 font-bold mb-1">
                        🍂 Дух квадры: {spirit.season}
                    </p>
                    <p className="text-[11px] text-brand-text leading-relaxed mb-1.5">
                        {spirit.description}
                    </p>
                    <p className="text-[10px] text-brand-text-secondary font-medium leading-relaxed italic">
                        {spirit.values}
                    </p>
                </div>
            )}
            
            <p className="text-[11px] text-brand-text-secondary leading-relaxed italic mb-2.5">{justificationText}</p>

            <div className="pt-2 border-t border-brand-primary/5 flex justify-end text-[10px]">
              <button
                onClick={() => onPrefillChat(`Поясни, пожалуйста, подробнее мои ценности по Квадре. В результатах анализа определена квадра «${item.result}», но выбранный тип «${selectedTimAbbr}» относится к квадре «${expectedQuadra}». На основе каких ценностных маркеров в моем монологе была определена квадра «${item.result}», и почему возникло это расхождение?`)}
                className="text-brand-primary font-bold hover:text-brand-secondary transition-colors flex items-center gap-1 bg-brand-primary/5 hover:bg-brand-primary/10 px-2 py-1 rounded cursor-pointer"
              >
                💬 Прояснить у ИИ
              </button>
            </div>
        </div>
    );
};


const BeginnerGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="text-xs bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-bold px-3 py-2 rounded-xl border border-brand-primary/15 transition-all w-full text-center mb-6 cursor-pointer"
      >
        ✦ Показать Быстрый Путеводитель Новичка
      </button>
    );
  }

  return (
      <div className="bg-amber-50/70 border border-amber-500/20 rounded-2xl p-4 md:p-5 relative overflow-hidden animate-fade-in shadow-sm mb-6">
      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
      <div className="flex justify-between items-start mb-2.5 border-b border-amber-500/15 pb-2">
        <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5 font-serif">
          🧭 Быстрый путеводитель: Как работает диагностика?
        </h3>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-amber-700/75 hover:text-amber-950 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
        >
          Свернуть
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-amber-950/90 leading-relaxed text-left">
        <div className="p-3 bg-white/40 rounded-xl border border-amber-500/5">
          <p className="font-bold text-amber-900 mb-1">1. Меняйте Трафарет (ТИМ)</p>
          Кликая по ТИМам в верхнем ряду, вы накладываете канонический трафарет этого ТИМа на ваши фактические признаки на шкалах ниже.
        </div>
        <div className="p-3 bg-white/40 rounded-xl border border-amber-500/5">
          <p className="font-bold text-amber-900 mb-1">2. Следите за Цветом карточек</p>
          <div className="space-y-1 mt-1">
            <p>🟢 <span className="text-emerald-700 font-semibold">Зеленый</span>: Признак совпадает с выбранным типом.</p>
            <p>🔴 <span className="text-rose-700 font-semibold">Красный</span>: Несоответствие канону.</p>
            <p>🟢 <span className="text-emerald-600 font-semibold border-b border-dashed border-emerald-500/60">Пунктир</span>: Кликните, чтобы переключить на канон!</p>
          </div>
        </div>
        <div className="p-3 bg-white/40 rounded-xl border border-amber-500/5">
          <p className="font-bold text-amber-900 mb-1">3. Оспаривайте у ИИ 🎤</p>
          Не согласны с признаком? Кликните на кнопку <span className="font-semibold text-brand-primary">💬 Прояснить у ИИ</span>. Запрос автоматически подготовит Чат, где вы сможете подробно доказать свою правоту!
        </div>
        <div className="p-3 bg-white/40 rounded-xl border border-amber-500/5">
          <p className="font-bold text-amber-900 mb-1">4. Фиксируйте «Замками» 🔒</p>
          Кликните по иконке замочка 🔓/🔒 рядом с признаком, чтобы заблокировать его. При клике на «Пересчитать ИИ» заблокированные признаки станут жестким ограничением — ИИ пересчитает ТИМ, строго соответствуя им!
        </div>
      </div>
    </div>
  );
};

const TimAnalysisBento: React.FC<{ selectedTimAbbr: string }> = ({ selectedTimAbbr }) => {
  const extra = TIM_EXTRA_DETAILS[selectedTimAbbr];
  if (!extra) return null;

  return (
      <div className="w-full mt-6 bg-brand-surface p-5 rounded-2xl border border-brand-primary/15 shadow-sm animate-fade-in text-brand-text">
      {/* Section Header */}
      <div className="border-b border-brand-primary/10 pb-3.5 mb-5 text-left">
        <h2 className="text-lg md:text-xl font-bold text-brand-primary font-serif flex items-center gap-2">
          🧠 Психофеноменологическая Карта и Рекомендации
        </h2>
        <p className="text-[10px] text-brand-text-secondary uppercase tracking-widest mt-0.5 font-mono">
          Глубинный разбор масок, мотивации и карьерного соответствия для {selectedTimAbbr}
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
        {/* Card 1: Психофеноменология искажений */}
        <div className="bg-brand-bg/50 border border-brand-primary/5 p-4 rounded-xl flex flex-col justify-between shadow-inner">
          <div>
            <h3 className="text-xs font-bold text-brand-secondary font-mono uppercase tracking-wider mb-2">
              🎭 Психофеноменология Искажений
            </h3>
            <p className="text-xs text-brand-text leading-relaxed font-sans font-light">
              {extra.phenomenology}
            </p>
          </div>
          <div className="mt-3 text-[10px] text-brand-text-secondary border-t border-brand-primary/5 pt-2 italic">
            * Адаптивное поведение часто маскирует истинные дихотомии.
          </div>
        </div>

        {/* Card 2: Рекомендованные сферы */}
        <div className="bg-brand-bg/50 border border-brand-primary/5 p-4 rounded-xl flex flex-col justify-between shadow-inner">
          <div>
            <h3 className="text-xs font-bold text-brand-secondary font-mono uppercase tracking-wider mb-2">
              💼 Подходящие Сферы & Профессии
            </h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {extra.professions.map((prof, i) => (
                <span 
                  key={i} 
                  className="bg-brand-primary/10 text-brand-primary text-[11px] font-medium px-2.5 py-1 rounded-lg border border-brand-primary/15 transition-all hover:bg-brand-primary hover:text-white"
                >
                  {prof}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3 text-[10px] text-brand-text-secondary border-t border-brand-primary/5 pt-2 italic">
            * Сферы максимальной реализации сильных функций.
          </div>
        </div>

        {/* Card 3: Топливо и Адаптация */}
        <div className="bg-brand-bg/50 border border-brand-primary/5 p-4 rounded-xl flex flex-col gap-4 shadow-inner md:col-span-2 lg:col-span-1">
          {/* Subcard 1: Топливо */}
          <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg">
            <h4 className="text-[10px] font-bold text-amber-600 font-mono uppercase tracking-wider mb-1">
              ⚡ Внутреннее топливо типа
            </h4>
            <p className="text-xs text-brand-text font-medium leading-relaxed font-light">
              {extra.fuel}
            </p>
          </div>
          
          {/* Subcard 2: Адаптация */}
          <div className="bg-brand-primary/5 border border-brand-primary/10 p-3 rounded-lg">
            <h4 className="text-[10px] font-bold text-brand-primary font-mono uppercase tracking-wider mb-1">
              🧭 Социальная Адаптация
            </h4>
            <p className="text-xs text-brand-text leading-relaxed font-light">
              {extra.adaptationTips}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const TimReference: React.FC = () => {
    const tims = useMemo(() => Object.entries(TIM_DEFINITIONS), []);
    const [selectedTimAbbr, setSelectedTimAbbr] = useState(tims[0][0]);
    const selectedTim = TIM_DEFINITIONS[selectedTimAbbr];

    // Exclude certain keys from being displayed as dichotomies
    const dichotomiesToShow = Object.entries(selectedTim).filter(([key]) => key !== 'name' && key !== 'description');

    return (
      <div className="flex flex-col md:flex-row gap-6 min-h-[50vh] animate-fade-in text-brand-text">
            {/* Sidebar with TIM list */}
            <div className="md:w-1/3 lg:w-1/4 flex-shrink-0">
                <h3 className="text-sm font-bold text-brand-primary mb-3 font-serif sticky top-0 bg-brand-surface py-2">Выберите ТИМ</h3>
                <div className="space-y-1 h-[50vh] overflow-y-auto pr-2">
                    {tims.map(([abbr, def]) => (
                        <button 
                            key={abbr} 
                            onClick={() => setSelectedTimAbbr(abbr)}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-all text-xs font-medium cursor-pointer ${selectedTimAbbr === abbr ? 'bg-brand-primary text-white font-bold shadow-sm' : 'bg-brand-bg hover:bg-brand-cream-dark text-brand-text'}`}
                        >
                            {def.name} ({abbr})
                        </button>
                    ))}
                </div>
            </div>

            {/* Main content with TIM details */}
            <div className="md:w-2/3 lg:w-3/4">
                <div className="bg-brand-bg p-5 rounded-xl border border-brand-primary/10 mb-6">
                    <h2 className="text-xl font-bold text-brand-primary font-serif">{selectedTim.name} <span className="text-brand-secondary font-sans text-base font-semibold">({selectedTimAbbr})</span></h2>
                    <p className="mt-2 text-xs text-brand-text-secondary leading-relaxed italic">{selectedTim.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dichotomiesToShow.map(([key, value]) => (
                        <div key={key} className="bg-brand-surface p-3 rounded-lg border border-brand-primary/10 shadow-sm">
                            <p className="text-[10px] text-brand-text-secondary font-medium tracking-wide uppercase font-mono">{key}</p>
                            <p className="font-bold text-brand-primary text-xs mt-0.5">{value as string}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const ResultScreen: React.FC<ResultScreenProps> = ({
  sessions,
  activeSessionId, result, rankedTims, selectedTimAbbreviation, onSelectTim, onRestart, onReanalyze, onDichotomyChange, onLockDichotomy, lockedDichotomies, lockedPsychosophy, setLockedPsychosophy, chatHistory, setChatHistory, sessionName, monologue, compactForTypist = false }) => {
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'analysis' | 'reference' | 'lore' | 'stats' | 'compatibility' | 'motivation'>('analysis');
  const [backgroundTasks, setBackgroundTasks] = useState<Record<string, string>>({});

  const addBackgroundTask = useCallback((id: string, text: string) => {
    setBackgroundTasks(prev => ({ ...prev, [id]: text }));
  }, []);
  
  const removeBackgroundTask = useCallback((id: string) => {
    setBackgroundTasks(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const handleCompatibilityAnalyzingChange = useCallback((b: boolean) => {
    b ? addBackgroundTask('compatibility', 'Синтез совместимости...') : removeBackgroundTask('compatibility');
  }, [addBackgroundTask, removeBackgroundTask]);

  const handleMotivationAnalyzingChange = useCallback((b: boolean) => {
    b ? addBackgroundTask('motivation', 'Синтез карьерного вектора...') : removeBackgroundTask('motivation');
  }, [addBackgroundTask, removeBackgroundTask]);
  
  const [chatInput, setChatInput] = useState('');
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showImpossibleLocksAlert, setShowImpossibleLocksAlert] = useState(false);

  const isImpossibleCombination = useMemo(() => {
    const locks = lockedDichotomies || {};
    if (Object.keys(locks).length === 0) return false;
    
    for (const [, definition] of Object.entries(TIM_DEFINITIONS)) {
      let isMatch = true;
      for (const [lockedKey, lockedVal] of Object.entries(locks)) {
        if ((definition as any)[lockedKey] !== lockedVal) {
          isMatch = false;
          break;
        }
      }
      if (isMatch) return false; // Found a matching TIM
    }
    return true; // No TIM matches all locked values
  }, [lockedDichotomies]);

  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);
  const [emailTo, setEmailTo] = useState('a9507652513@gmail.com');

  const stripHtml = (html: string): string => {
    if (!html) return '';
    let text = html;
    
    // Replace <p> tags and closed paragraphs with suitable newlines
    text = text.replace(/<p[^>]*>/gi, '');
    text = text.replace(/<\/p>/gi, '\n\n');
    
    // Replace <br\s*\/?> with newlines
    text = text.replace(/<br\s*\/?>/gi, '\n');
    
    // Replace <li> tags with bullet points
    text = text.replace(/<li[^>]*>/gi, '• ');
    text = text.replace(/<\/li>/gi, '\n');
    
    // Replace <ul>/</ul> and <ol>/</ol> tags
    text = text.replace(/<ul[^>]*>/gi, '');
    text = text.replace(/<\/ul>/gi, '\n');
    text = text.replace(/<ol[^>]*>/gi, '');
    text = text.replace(/<\/ol>/gi, '\n');

    // Remove bold and italic tags, keeping their inner content
    text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '$1');
    text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1');
    text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '$1');
    text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '$1');

    // Strip any remaining HTML tags safely
    text = text.replace(/<[^>]+>/g, '');

    // Replace multiple spaces or tabs
    text = text.replace(/[ \t]+/g, ' ');

    // Normalize multiple consecutive newlines
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // Decode common HTML entities
    text = text.replace(/&nbsp;/gi, ' ')
               .replace(/&lt;/gi, '<')
               .replace(/&gt;/gi, '>')
               .replace(/&amp;/gi, '&')
               .replace(/&quot;/gi, '"')
               .replace(/&#39;/gi, "'");

    return text.trim();
  };

  const generateReportText = () => {
    const currentTim = TIM_DEFINITIONS[selectedTimAbbreviation];
    const psychosophy = psychosophyType;
    
    let report = `==================================================\n`;
    report += `РЕЗУЛЬТАТЫ СОЦИОНИЧЕСКОГО ТИПИРОВАНИЯ\n`;
    report += `Имя участника: ${sessionName}\n`;
    report += `Дата: ${new Date().toLocaleDateString('ru-RU')} в ${new Date().toLocaleTimeString('ru-RU')}\n`;
    report += `==================================================\n\n`;
    
    report += `🏆 ОПРЕДЕЛЕННЫЙ ТИП (ТИМ):\n`;
    report += `${currentTim ? `${currentTim.name} (${selectedTimAbbreviation} — ${currentTim.type})` : selectedTimAbbreviation}\n\n`;
    
    report += `⚡ ТИП ПО ПСИХОСОФИИ:\n`;
    report += `${psychosophy}\n\n`;
    
    report += `📝 АНАЛИЗИРУЕМЫЙ МОНОЛОГ:\n`;
    report += `"${stripHtml(monologue)}"\n\n`;
    
    report += `📊 ПОКАЗАТЕЛИ ПО ДИХОТОМИЯМ:\n`;
    result.dichotomies.forEach(d => {
      const isLocked = !!lockedDichotomies[d.name];
      report += `- ${d.name}: ${d.result} (Уверенность: ${d.confidence}%)${isLocked ? ' 🔒 [Заблокировано]' : ''}\n`;
    });
    report += `\n`;
    
    if (chatHistory.length > 0) {
      report += `💬 ИСТОРИЯ ДИАЛОГА С ИИ-ЭКСПЕРТОМ:\n`;
      chatHistory.forEach((msg, idx) => {
        const roleName = msg.role === 'user' ? 'Пользователь' : 'ИИ-Типировщик';
        report += `[${idx + 1}] ${roleName}:\n${stripHtml(msg.content)}\n\n`;
      });
    }
    
    report += `==================================================\n`;
    report += `Сгенерировано в приложении Socionics AI Typist\n`;
    return report;
  };

  
  const handleDownloadPdf = async () => {
    if (!certificateRef.current) return;
    try {
      setIsGeneratingPdf(true);
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#FAF8F5',
        logging: false
      });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Соционический_Сертификат_${sessionName}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Ошибка при генерации PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadTxt = () => {
    const text = generateReportText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `socionics_report_${sessionName.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const fallbackCopyText = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  const handleCopyReport = () => {
    const text = generateReportText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        fallbackCopyText(text);
      });
    } else {
      fallbackCopyText(text);
    }
  };

  
  const handleSendEmail = () => {
    // Shortened email body to prevent URL length limits
    let text = `РЕЗУЛЬТАТЫ СОЦИОНИЧЕСКОГО ТИПИРОВАНИЯ\n`;
    text += `Имя участника: ${sessionName}\n\n`;
    
    text += `🏆 ОПРЕДЕЛЕННЫЙ ТИП (ТИМ):\n`;
    text += `${selectedTimDefinition?.name || ''} (${selectedTimAbbreviation} - ${selectedTimDefinition?.formula || ''})\n\n`;

    text += `⚡ ТИП ПО ПСИХОСОФИИ:\n`;
    text += `${psychosophyType}\n\n`;

    text += `Вложение с полным отчетом недоступно при отправке через mailto. \n`;
    text += `Пожалуйста, скачайте PDF-сертификат или TXT-файл на сайте.\n\n`;
    
    text += `Сгенерировано в приложении Socionics AI Typist\n`;

    const subject = encodeURIComponent(`Соционический отчет — ${sessionName}`);
    const body = encodeURIComponent(text);
    const mailtoUrl = `mailto:${emailTo}?subject=${subject}&body=${body}`;
    
    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.click();
  };

  
  const selectedTimDefinition = TIM_DEFINITIONS[selectedTimAbbreviation];

  const canonicalType = useMemo(() => {
    return CANONICAL_TYPOLOGIES[selectedTimAbbreviation]?.psychosophy.type || 'ЛВЭФ';
  }, [selectedTimAbbreviation]);

  const [psychosophyType, setPsychosophyType] = useState<string>(canonicalType);
  const [openLockMenu, setOpenLockMenu] = useState<string | null>(null);

  // Scroll to top on mount to ensure user starts at the top of the results
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  // Sync with selected TIM when selected TIM changes
  useEffect(() => {
    setPsychosophyType(canonicalType);
  }, [selectedTimAbbreviation, canonicalType]);

  // Click outside to close lock menus
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenLockMenu(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const isPositionPermitted = (lockVal: any, pos: number): boolean => {
    if (lockVal === undefined || lockVal === null || lockVal === 'free') return true;
    if (lockVal === 1 || lockVal === 2 || lockVal === 3 || lockVal === 4 || typeof lockVal === 'number' || !isNaN(Number(lockVal))) {
      return pos === Number(lockVal);
    }
    if (lockVal === 'strong') return pos === 1 || pos === 2;
    if (lockVal === 'weak') return pos === 3 || pos === 4;
    if (lockVal === 'process') return pos === 2 || pos === 3;
    if (lockVal === 'result') return pos === 1 || pos === 4;
    return true;
  };

  const getLockText = (lockVal: any, position: number): string => {
    if (position === -1) return '';
    if (lockVal === undefined || lockVal === null || lockVal === 'free') return '';
    if (lockVal === 1 || lockVal === 2 || lockVal === 3 || lockVal === 4 || typeof lockVal === 'number' || !isNaN(Number(lockVal))) {
      return `Строго ${lockVal}-я`;
    }
    if (lockVal === 'strong') return 'Сильная (1-2)';
    if (lockVal === 'weak') return 'Слабая (3-4)';
    if (lockVal === 'process') return 'Процесс (2-3)';
    if (lockVal === 'result') return 'Результ (1-4)';
    return '';
  };

  const letterToName: Record<string, string> = {
    'Л': 'Логика',
    'В': 'Воля',
    'Э': 'Эмоция',
    'Ф': 'Физика'
  };

  const canSwap = (letter1: string, pos1: number, letter2: string, pos2: number): boolean => {
    const name1 = letterToName[letter1];
    const name2 = letterToName[letter2];
    
    const lock1 = lockedPsychosophy[name1];
    const lock2 = lockedPsychosophy[name2];
    
    // Check if letter1 is permitted to move to pos2
    const ok1 = isPositionPermitted(lock1, pos2);
    // Check if letter2 is permitted to move to pos1
    const ok2 = isPositionPermitted(lock2, pos1);
    
    return ok1 && ok2;
  };

  const handleSwapPsychosophy = (funcLetter: string, targetIndex: number) => {
    const currentOrder = psychosophyType.split('');
    const currentIndex = currentOrder.indexOf(funcLetter);
    if (currentIndex === -1 || currentIndex === targetIndex) return;

    const temp = currentOrder[targetIndex];
    
    // Check if this swap is allowed under current locks
    if (!canSwap(funcLetter, currentIndex + 1, temp, targetIndex + 1)) return;

    // Swap positions
    currentOrder[targetIndex] = funcLetter;
    currentOrder[currentIndex] = temp;

    const newType = currentOrder.join('');
    setPsychosophyType(newType);

    setLockedPsychosophy(prev => {
      const updated = { ...prev };
      const name1 = letterToName[funcLetter];
      const name2 = letterToName[temp];

      // If either has exact position lock, update it (though it shouldn't be swappable anyway unless allowed)
      if (typeof updated[name1] === 'number') {
        updated[name1] = targetIndex + 1;
      }
      if (typeof updated[name2] === 'number') {
        updated[name2] = currentIndex + 1;
      }
      return updated;
    });
  };

  const handlePrefillChat = (question: string) => {
    setChatInput(question);
    setTimeout(() => {
      const textarea = document.getElementById('chat-textarea') as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.focus();
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const chatPanelEl = document.getElementById('ai-chat-panel');
        if (chatPanelEl) {
          chatPanelEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, 100);
  };

  const handleRateMessage = (index: number, rating: 'like' | 'dislike') => {
    setChatHistory(prev => {
      const updated = [...prev];
      if (updated[index]) {
        const prevRating = updated[index].rating;
        if (prevRating === rating) return prev;
        updated[index] = { ...updated[index], rating };
        trackRating(rating === 'like', prevRating);
      }
      return updated;
    });
  };

  useEffect(() => {
    if (selectedTimDefinition) {
      const timName = (selectedTimDefinition?.name || 'Неизвестно');
      const timAbbr = selectedTimAbbreviation;
      setSuggestedQuestions([
        `Кто дуал для ${timName} (${timAbbr})?`,
        `Каковы сильные стороны ${timName}?`,
        `Какие профессии подходят типу ${timName}?`,
        `Как мне лучше всего отдыхать и восстанавливать силы?`
      ]);
    }
  }, [selectedTimAbbreviation, selectedTimDefinition]);
  const initialSummary = result.summary;

  const { quadraResult, otherDichotomies } = useMemo(() => {
    const quadra = result.dichotomies.find(d => d.name === 'Квадра');
    const others = result.dichotomies.filter(d => d.name !== 'Квадра').sort((a, b) => {
        const priorityA = DICHOTOMY_PRIORITIES[a.name] || 'low';
        const priorityB = DICHOTOMY_PRIORITIES[b.name] || 'low';
        if (priorityA === 'high' && priorityB !== 'high') return -1;
        if (priorityA !== 'high' && priorityB === 'high') return 1;
        if (priorityA === 'medium' && priorityB === 'low') return -1;
        if (priorityA !== 'high' && priorityB === 'high') return 1;
        if (priorityA === 'low' && priorityB === 'medium') return 1;
        return a.name.localeCompare(b.name);
    });
    return { quadraResult: quadra, otherDichotomies: others };
  }, [result.dichotomies]);

  const handleSendMessage = async (message: string) => {
    if (!result) return;
    setChatInput('');

    const newUserMessage: ChatMessage = { role: 'user', content: message };
    const updatedHistory = [...chatHistory, newUserMessage];
    setChatHistory(updatedHistory);
    setIsChatLoading(true);

    try {
      const firstMessageGreeting: ChatMessage[] = chatHistory.length === 0 ? 
        [{ role: 'model', content: `Здравствуйте! Я ваш ИИ-ассистент. Я проанализировал ваш монолог и определил ваш наиболее вероятный социотип как **${(selectedTimDefinition?.name || 'Неизвестно')}**. Чем я могу помочь?` }] : [];
      
      if (firstMessageGreeting.length > 0) {
        setChatHistory([...firstMessageGreeting, newUserMessage]);
      }

      const modelResponse: ChatResponse = await getChatResponse(updatedHistory, result, selectedTimAbbreviation);
      
      const newModelMessage: ChatMessage = { role: 'model', content: modelResponse.responseText };
      setChatHistory(prev => [...prev, newModelMessage]);
      setSuggestedQuestions(modelResponse.suggestedQuestions);

      const config = getActiveProviderConfig();
      const inputLen = JSON.stringify(updatedHistory).length;
      const outputLen = JSON.stringify(modelResponse).length;
      trackChatTokens(config.provider, inputLen, outputLen);

    } catch (e: any) {
      const config = getActiveProviderConfig();
      const provName = config.provider ? config.provider.toUpperCase() : 'ИИ';
      
      let errorDesc = `Произошла ошибка при обращении к провайдеру ИИ (${provName}). `;
      const errMsgStr = String(e.message || '').toLowerCase();
      
      if (errMsgStr.includes('api_key_missing') || errMsgStr.includes('key') || errMsgStr.includes('auth') || errMsgStr.includes('401') || errMsgStr.includes('403')) {
        errorDesc += `Скорее всего, указан неверный, неактивный или пустой API-ключ для **${provName}**, либо закончился баланс лимитов на вашей стороне. Пожалуйста, откройте настройки ИИ (значок шестерёнки в правом верхнем углу), проверьте и обновите ваш ключ.`;
      } else if (errMsgStr.includes('fetch') || errMsgStr.includes('network') || errMsgStr.includes('connection') || errMsgStr.includes('offline')) {
        errorDesc += `Проблема сетевого подключения (Failed to fetch). Если вы используете прокси-сервер, проверьте правильность адреса в поле **Base URL**. Также убедитесь, что у вас есть доступ к сети и данный адрес не заблокирован.`;
      } else if (errMsgStr.includes('404')) {
        errorDesc += `Модель не найдена (HTTP 404). Скорее всего, выбранная модель **${config.model || 'по умолчанию'}** не поддерживается текущей конечной точкой API, либо вы опечатались в названии модели в настройках.`;
      } else if (errMsgStr.includes('400')) {
        errorDesc += `Некорректный запрос (HTTP 400). Возможно, выбранная модель не поддерживается вашим типом ключа, или возник конфликт форматов системного промпта.`;
      } else {
        errorDesc += `Пожалуйста, проверьте API-ключ, настройки провайдера ИИ и адрес шлюза в меню настроек.`;
      }

      const errorMessage: ChatMessage = {
        role: 'model',
        content: `⚠️ **Ошибка API-соединения (${provName})**\n\n${errorDesc}\n\n*Технические детали: ${e.message || 'Неизвестная ошибка'}*`,
        isError: true
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };
  
  const renderAnalysisTab = () => (
    <div className="animate-fade-in flex flex-col gap-6">
        {/* Beginner Guide */}
        <BeginnerGuide />

        <div className="flex flex-col lg:flex-row gap-6">
            {/* --- Left Column (Info) --- */}
            <div className="lg:w-2/5 xl:w-1/3 flex flex-col gap-4">
                <div className="bg-brand-bg p-5 rounded-xl border border-brand-primary/10 text-left">
                    <h2 className="text-lg font-bold mb-2 text-brand-text font-serif">Описание типа</h2>
                    <p className="text-xs text-brand-text leading-relaxed font-sans font-light">{(selectedTimDefinition?.description || '')}</p>
                    <div className='mt-4 pt-4 border-t border-brand-primary/10'>
                        <h3 className="text-xs font-bold mb-1.5 text-brand-primary uppercase tracking-wide font-mono">Резюме анализа:</h3>
                        <p className="text-[11px] text-brand-text-secondary leading-relaxed italic">{initialSummary}</p>
                        {(result.analysisDuration || result.providerUsed) && (
                            <div className="mt-3 pt-3 border-t border-brand-primary/5 text-[10px] text-brand-text-secondary font-mono text-right opacity-70">
                                Время анализа: {result.analysisDuration || '?'} сек. {result.providerUsed && `| Ответ от ИИ: ${result.providerUsed}`}
                            </div>
                        )}
                    </div>
                </div>

                {/* Смежные типологии (Интегральный профиль) */}
                {!compactForTypist && (() => {
                    const canonical = CANONICAL_TYPOLOGIES[selectedTimAbbreviation];
                    if (!canonical) return null;
                    return (
      <div className="bg-brand-bg p-5 rounded-xl border border-brand-primary/10 text-left space-y-4 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none"></div>
                            <h2 className="text-sm font-bold text-brand-primary uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-brand-primary/10 pb-2">
                                🌌 Интегральный Профиль
                            </h2>
                            
                            {/* Блавацкая */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <h3 className="text-xs font-bold text-brand-text flex items-center gap-1">
                                        🔮 Лучи Блаватской (Миссия)
                                    </h3>
                                    <span className="text-[10px] bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                                        {canonical.blavatskyRay.name}
                                    </span>
                                </div>
                                <p className="text-[11px] text-brand-text-secondary leading-relaxed font-light">
                                    {canonical.blavatskyRay.description}
                                </p>
                            </div>

                            {/* DISC */}
                            <div className="space-y-1 pt-3 border-t border-brand-primary/5">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <h3 className="text-xs font-bold text-brand-text flex items-center gap-1">
                                        📊 Профиль DISC
                                    </h3>
                                    <span className="text-[10px] bg-blue-500/10 text-blue-600 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                                        {canonical.disc.profile} ({canonical.disc.name})
                                    </span>
                                </div>
                                <p className="text-[11px] text-brand-text-secondary leading-relaxed font-light">
                                    {canonical.disc.description}
                                </p>
                            </div>

                            {/* Психософия */}
                            <div className="space-y-1 pt-3 border-t border-brand-primary/5">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <h3 className="text-xs font-bold text-brand-text flex items-center gap-1">
                                        ⚡ Психософия (Афанасьев)
                                    </h3>
                                    <span className="text-[10px] bg-purple-500/10 text-purple-600 font-bold px-2 py-0.5 rounded-full border border-purple-500/20">
                                        {canonical.psychosophy.type} ({canonical.psychosophy.name})
                                    </span>
                                </div>
                                <p className="text-[11px] text-brand-text-secondary leading-relaxed font-light">
                                    {canonical.psychosophy.description}
                                </p>
                            </div>
                        </div>
                    );
                })()}

                <div className="bg-brand-bg p-4 rounded-xl border border-brand-primary/10 text-left space-y-3">
                    <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider font-mono">Управление ИИ-анализом</h3>
                    <p className="text-[11px] text-brand-text-secondary leading-relaxed">
                      Если вы не согласны с результатом или зафиксировали/изменили дихотомии, вы можете запустить перерасчет.
                    </p>
                    <div className="p-2.5 bg-brand-primary/5 rounded-xl border border-brand-primary/10 text-[10.5px] text-brand-primary leading-relaxed space-y-2">
                      <div>
                        💡 <b>Контекстное обучение ИИ:</b> при нажатии «Пересчитать ИИ» текущий диалог из чата ниже автоматически добавится в запрос. ИИ учтет ваши ответы, сомнения и аргументы!
                      </div>
                      <div className="pt-2 border-t border-brand-primary/10">
                        🔒 <b>Влияние замков (блокировки):</b> признаки или функции психософии с активным значком замка будут <b>строго зафиксированы</b>. ИИ не сможет их изменить при пересчете, а будет выстраивать соционический анализ и подбирать итоговый ТИМ строго вокруг ваших заблокированных выборов!
                      </div>
                    </div>
                    {isImpossibleCombination && (
                      <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/25 text-[11px] text-red-600 leading-relaxed font-bold animate-pulse">
                        ⚠️ Внимание! Выбранная комбинация заблокированных признаков невозможна! Ни один соционический ТИМ не удовлетворяет всем вашим замкам одновременно. Клик по кнопке «Пересчитать ИИ» заблокирован во избежание ошибок. Пожалуйста, снимите часть замков (нажмите на 🔒).
                      </div>
                    )}
                    <div className="flex justify-center pt-1">
                        <button
                          onClick={() => {
                            if (isImpossibleCombination) {
                              setShowImpossibleLocksAlert(true);
                            } else {
                              onReanalyze(chatHistory);
                            }
                          }}
                          className={`w-full px-4 py-2.5 font-bold text-xs rounded-lg transition-all duration-300 cursor-pointer shadow-sm text-center ${
                            isImpossibleCombination 
                              ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                              : 'bg-brand-primary hover:bg-brand-secondary text-white'
                          }`}
                          title={isImpossibleCombination ? "Выбранная комбинация признаков невозможна" : "Пересчитать тип с учетом заблокированных признаков и диалога"}
                        >
                          ⚠ Пересчитать ИИ · расходуется 1 попытка
                        </button>
                    </div>
                </div>

                {/* Export Results Panel */}
                <div className="bg-brand-bg p-4 rounded-xl border border-brand-primary/10 text-left space-y-3 shadow-sm animate-fade-in">
                    <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <span>📤</span> Экспорт результатов ({sessionName})
                    </h3>
                    <p className="text-[11px] text-brand-text-secondary leading-relaxed font-light">
                      Вы можете скопировать или скачать готовый соционический отчет, а также отправить его на email руководителю проекта для дальнейшего оформления.
                    </p>
                    <div className="space-y-2 pt-1">
                        <div className="flex flex-col gap-2">
                            <input 
                                type="email" 
                                value={emailTo}
                                onChange={e => setEmailTo(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-brand-primary/20 rounded-lg text-xs focus:outline-none focus:border-brand-primary text-brand-text"
                                placeholder="Введите email для отправки"
                            />
                            <button 
                                onClick={handleSendEmail}
                                disabled={!emailTo}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary disabled:opacity-50 hover:bg-brand-secondary text-white font-bold text-xs rounded-lg transition-all duration-300 cursor-pointer shadow-sm"
                                title="Отправить готовый структурированный отчет"
                            >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Отправить на email</span>
                            </button>
                        </div>
                        
                        <div className="flex gap-2.5">
                            <button
                              onClick={handleCopyReport}
                              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-surface border border-brand-primary/15 text-brand-text font-bold text-xs rounded-lg hover:bg-brand-cream-dark/20 transition-all duration-300 cursor-pointer text-center ${
                                copied ? 'border-brand-green/40 text-brand-green' : ''
                              }`}
                              title="Скопировать отчет в буфер обмена в формате Markdown"
                            >
                              {copied ? <Check className="w-3.5 h-3.5 animate-bounce" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
                            </button>
                            
                            <button
                              onClick={handleDownloadTxt}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-surface border border-brand-primary/15 text-brand-text font-bold text-xs rounded-lg hover:bg-brand-cream-dark/20 transition-all duration-300 cursor-pointer text-center"
                              title="Скачать структурированный отчет в формате TXT-файла"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>.TXT</span>
                            </button>
                            <button
                              onClick={handleDownloadPdf}
                              disabled={isGeneratingPdf}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-primary text-white font-bold text-xs rounded-lg hover:bg-brand-secondary transition-all duration-300 cursor-pointer text-center disabled:opacity-50"
                              title="Скачать красивый сертификат в PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{isGeneratingPdf ? 'Сборка...' : '.PDF'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* --- Right Column (Analysis Grid) --- */}
            <div className="lg:w-3/5 xl:w-2/3">
                <h2 className="text-lg font-bold mb-1 text-center text-brand-text font-serif">Разбор по дихотомиям</h2>
                <p className="text-center text-xs text-brand-text-secondary mb-3">Совпадающие с <span className="font-bold text-brand-primary">{(selectedTimDefinition?.name || 'Неизвестно')}</span> признаки подсвечены <span className="text-brand-green font-bold">зеленым</span>.</p>
                
                {/* Как использовать Замки (🔒) */}
                <div className="mb-4 p-3.5 bg-amber-500/5 border border-amber-500/15 rounded-xl text-left text-xs text-brand-text leading-relaxed">
                    💡 <b>Инструкция по «Замкам» (🔒):</b> Вы можете зафиксировать любую дихотомию или квадру, если уверены в ней на 100%. Кликните по значку замочка 🔓 рядом с ней. При нажатии кнопки <b>«Пересчитать ИИ»</b> (в левом меню), ИИ-модель примет заблокированные признаки как непреложную истину и подберет подходящий ТИМ строго в рамках этих ограничений!
                </div>
                
                {quadraResult && (
                    <div className="mb-4 max-w-xl mx-auto">
                        <QuadraSelector 
                            item={quadraResult}
                            isLocked={!!lockedDichotomies['Квадра']}
                            isMatch={(selectedTimDefinition?.['Квадра']) === (quadraResult?.result)}
                            expectedQuadra={(selectedTimDefinition?.['Квадра'])}
                            selectedTimAbbr={selectedTimAbbreviation}
                            onLock={onLockDichotomy}
                            onSelect={onDichotomyChange}
                            onPrefillChat={handlePrefillChat}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {otherDichotomies.map((d, index) => {
                    const isMatch = (selectedTimDefinition?.[d.name]) === d.result;
                    const priority = DICHOTOMY_PRIORITIES[d.name] || 'low';
                    return (
                        <DichotomyCard 
                            key={`${d.name || 'trait'}-${index}`} 
                            item={d} 
                            isLocked={!!lockedDichotomies[d.name]}
                            isMatch={isMatch}
                            expectedValue={(selectedTimDefinition?.[d.name])}
                            selectedTimAbbr={selectedTimAbbreviation}
                            priority={priority}
                            index={index + 1}
                            onLock={onLockDichotomy}
                            onSelect={onDichotomyChange}
                            onPrefillChat={handlePrefillChat}
                        />
                    )
                })}
                </div>

                {/* Психософия (Афанасьев) Карта с Замочками и Справочник */}
                <div className="mt-6 border-t border-brand-primary/10 pt-5 text-left">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                        <div>
                            <h2 className="text-base font-bold text-brand-text font-serif flex items-center gap-2">
                                ⚡ Карта функций Психософии (Афанасьев)
                            </h2>
                            <p className="text-[11px] text-brand-text-secondary">
                                {psychosophyType === canonicalType ? (
                                    <span className="text-emerald-600 font-semibold">✓ Соответствует канону типа {selectedTimAbbreviation} ({canonicalType})</span>
                                ) : (
                                    <span className="text-rose-600 font-semibold">⚠ Измененный профиль (Канон {selectedTimAbbreviation} требует «{canonicalType}»)</span>
                                )}
                            </p>
                        </div>
                        
                        {psychosophyType !== canonicalType && (
                            <button 
                                onClick={() => {
                                    setPsychosophyType(canonicalType);
                                    setLockedPsychosophy({});
                                }}
                                className="text-[10px] bg-brand-primary/5 hover:bg-brand-primary/10 text-brand-primary font-bold px-2.5 py-1 rounded transition-colors cursor-pointer"
                            >
                                Сбросить на канон
                            </button>
                        )}
                    </div>

                    <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl text-xs mb-4 text-brand-text leading-relaxed">
                        🎯 <b>Интерактивная карта Психософии:</b> Настройте порядок функций кликом по позиционным кнопкам <b>1, 2, 3, 4</b>. Схемы плавно поменяются местами. Кликните по значку замочка 🔓, чтобы зафиксировать позицию или ограничить её до <b>Сильной (1-2)</b>, <b>Слабой (3-4)</b>, <b>Процессионной (2-3)</b> или <b>Результативной (1-4)</b> — при перерасчете ИИ подберет социотип, строго удовлетворяющий этим ограничениям!
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-4">
                        {psychosophyType.split('').map((letter, index) => {
                            const position = index + 1;
                            const letterToName: Record<string, string> = {
                                'Л': 'Логика',
                                'В': 'Воля',
                                'Э': 'Эмоция',
                                'Ф': 'Физика'
                            };
                            const funcName = letterToName[letter];
                            const isLocked = lockedPsychosophy[funcName] !== undefined;
                            const keyString = `${position}${letter}`;
                            const info = PSYCHOSOPHY_DESCRIPTIONS[keyString] || { title: `${position}-я ${funcName}`, description: '' };
                            
                            // Check if this position is canonical
                            const canonicalIndex = canonicalType.indexOf(letter);
                            const isCanonicalPos = canonicalIndex === index;

                            // Process / Result, Strong / Weak classifications
                            const getAttributes = (pos: number): string => {
                                if (pos === 1) return 'Сильная • Результатная';
                                if (pos === 2) return 'Сильная • Процессионная';
                                if (pos === 3) return 'Слабая • Процессионная';
                                if (pos === 4) return 'Слабая • Результатная';
                                return '';
                            };

                            return (
      <div key={letter} className={`p-4 rounded-xl border bg-brand-surface relative transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md ${isCanonicalPos ? 'border-purple-500/40 bg-purple-500/[0.01]' : 'border-brand-primary/10'}`}>
                                    <div>
                                        <div className="flex justify-between items-start mb-2.5">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-mono font-bold text-purple-600 uppercase tracking-widest">
                                                        Позиция {position}
                                                    </span>
                                                    <span className="text-[9px] bg-purple-100/50 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                                                        {getAttributes(position)}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-xs text-brand-text mt-1 font-serif">
                                                    {info.title}
                                                </h3>
                                            </div>
                                            
                                            {/* Flexible Lock Popover */}
                                            <div className="relative">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenLockMenu(openLockMenu === funcName ? null : funcName);
                                                    }}
                                                    className={`p-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                                                        isLocked 
                                                            ? 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100' 
                                                            : 'text-brand-text-secondary border-transparent hover:border-brand-primary/20 hover:bg-brand-primary/5'
                                                    }`}
                                                    title="Настройки ограничений для этой функции"
                                                >
                                                    {isLocked ? (
                                                        <>
                                                            <LockClosedIcon className="text-purple-600 w-3.5 h-3.5"/>
                                                            <span className="text-[10px] font-bold font-mono tracking-tight">
                                                                {getLockText(lockedPsychosophy[funcName], position)}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <LockOpenIcon className="w-3.5 h-3.5 opacity-60"/>
                                                    )}
                                                </button>
                                                
                                                {openLockMenu === funcName && (
                                                    <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-brand-primary/10 py-1.5 z-50 text-left animate-fade-in">
                                                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary border-b border-brand-primary/5 pb-1 mb-1">
                                                            Ограничения: {funcName}
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLockedPsychosophy(prev => {
                                                                    const updated = { ...prev };
                                                                    delete updated[funcName];
                                                                    return updated;
                                                                });
                                                                setOpenLockMenu(null);
                                                            }}
                                                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-purple-50 text-brand-text flex items-center gap-2 cursor-pointer border-none bg-transparent"
                                                        >
                                                            <span>🔓</span> <span>Без ограничений</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLockedPsychosophy(prev => {
                                                                    const updated = { ...prev };
                                                                    updated[funcName] = position;
                                                                    return updated;
                                                                });
                                                                setOpenLockMenu(null);
                                                            }}
                                                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-purple-50 text-brand-text flex items-center gap-2 cursor-pointer border-none bg-transparent"
                                                        >
                                                            <span>🔒</span> <span>Строго {position}-я позиция</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLockedPsychosophy(prev => {
                                                                    const updated = { ...prev };
                                                                    updated[funcName] = 'strong';
                                                                    return updated;
                                                                });
                                                                setOpenLockMenu(null);
                                                            }}
                                                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-purple-50 text-brand-text flex items-center gap-2 cursor-pointer border-none bg-transparent"
                                                        >
                                                            <span>🔒</span> <span>Сильная (1, 2)</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLockedPsychosophy(prev => {
                                                                    const updated = { ...prev };
                                                                    updated[funcName] = 'weak';
                                                                    return updated;
                                                                });
                                                                setOpenLockMenu(null);
                                                            }}
                                                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-purple-50 text-brand-text flex items-center gap-2 cursor-pointer border-none bg-transparent"
                                                        >
                                                            <span>🔒</span> <span>Слабая (3, 4)</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLockedPsychosophy(prev => {
                                                                    const updated = { ...prev };
                                                                    updated[funcName] = 'process';
                                                                    return updated;
                                                                });
                                                                setOpenLockMenu(null);
                                                            }}
                                                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-purple-50 text-brand-text flex items-center gap-2 cursor-pointer border-none bg-transparent"
                                                        >
                                                            <span>🔒</span> <span>Процессионная (2, 3)</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLockedPsychosophy(prev => {
                                                                    const updated = { ...prev };
                                                                    updated[funcName] = 'result';
                                                                    return updated;
                                                                });
                                                                setOpenLockMenu(null);
                                                            }}
                                                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-purple-50 text-brand-text flex items-center gap-2 cursor-pointer border-none bg-transparent"
                                                        >
                                                            <span>🔒</span> <span>Результативная (1, 4)</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-brand-text-secondary leading-normal font-sans font-light mb-4 min-h-[48px]">
                                            {info.description}
                                        </p>
                                    </div>

                                    {/* Position Selectors */}
                                    <div className="flex items-center gap-1.5 border-t border-brand-primary/5 pt-3">
                                        <span className="text-[9px] font-mono text-brand-text-secondary mr-1 uppercase">Сменить:</span>
                                        {[1, 2, 3, 4].map(pos => {
                                            const isBtnActive = pos === position;
                                            const targetLetter = psychosophyType[pos - 1];
                                            const allowed = canSwap(letter, position, targetLetter, pos);
                                            const lockVal = lockedPsychosophy[funcName];
                                            const isStrictLock = typeof lockVal === 'number';
                                            const isCategoryLock = typeof lockVal === 'string' && lockVal !== 'free';
                                            const isPermittedByLock = isPositionPermitted(lockVal, pos);

                                            let btnClasses = "w-7 h-7 text-xs font-bold rounded-lg flex items-center justify-center border transition-all cursor-pointer ";
                                            if (isBtnActive) {
                                                if (isStrictLock) {
                                                    btnClasses += "bg-purple-200 text-purple-800 border-purple-400 font-extrabold shadow-sm";
                                                } else if (isCategoryLock) {
                                                    btnClasses += "bg-purple-100 text-purple-700 border-purple-300 font-bold";
                                                } else {
                                                    btnClasses += "bg-purple-600 text-white border-purple-600 font-bold";
                                                }
                                            } else {
                                                if (allowed) {
                                                    if (isCategoryLock && isPermittedByLock) {
                                                        btnClasses += "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100/60";
                                                    } else {
                                                        btnClasses += "bg-brand-bg hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 text-brand-text border-brand-cream-dark";
                                                    }
                                                } else {
                                                    btnClasses += "bg-brand-bg text-brand-text-secondary border-brand-cream opacity-20 cursor-not-allowed";
                                                }
                                            }

                                            return (
                                                <button
                                                    key={pos}
                                                    disabled={isBtnActive || !allowed}
                                                    onClick={() => handleSwapPsychosophy(letter, pos - 1)}
                                                    className={btnClasses}
                                                >
                                                    {pos}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Справочник по функциям Афанасьева */}
                    <details className="bg-brand-bg p-4 rounded-xl border border-brand-primary/10 cursor-pointer text-xs group transition-all duration-300">
                        <summary className="font-bold text-brand-text flex justify-between items-center select-none font-serif text-xs">
                            <span>📚 Справочник психософских позиций Афанасьева (1Л, 2Л, 3Л, 4Л и т.д.)</span>
                            <span className="text-brand-primary transition-transform duration-300 group-open:rotate-180">▼</span>
                        </summary>
                        <div className="mt-4 pt-3 border-t border-brand-primary/15 text-left grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                            <div className="space-y-3.5">
                                <h4 className="font-bold text-purple-700 uppercase tracking-wide font-mono text-[10px]">⚖️ Свойства позиций:</h4>
                                <div className="space-y-2 text-[11px]">
                                    <p><b>1-я функция (Избыточная, доминантная, результативная):</b> Сила, уверенность, эгоизм. Реализует себя сама, не терпит чужого давления.</p>
                                    <p><b>2-я функция (Уверенная, диалоговая, процессионная):</b> Высшая степень гибкости и поддержки. Любит диалог и совместное творчество.</p>
                                    <p><b>3-я функция (Болевая, ранимая, процессионная):</b> Самая чувствительная зона сомнений, страхов и придирчивого самоанализа.</p>
                                    <p><b>4-я функция (Слабая, результативная, безразличная):</b> Позиция "по запросу". Не тратит энергию, доверяет авторитету других.</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-[10.5px]">
                                <h4 className="font-bold text-purple-700 uppercase tracking-wide font-mono text-[10px]">📑 Все 16 типов функций:</h4>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                                    {Object.entries(PSYCHOSOPHY_DESCRIPTIONS).map(([key, item]) => (
                                        <div key={key} className="p-1.5 bg-brand-surface rounded border border-brand-primary/5">
                                            <span className="font-bold text-purple-600">{key}</span>: {item.title.split(' — ')[1].split(' (')[0]}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        </div>

        {/* FULL WIDTH CHAT PANEL RIGHT AFTER DICHOTOMY ANALYSIS */}
        {!compactForTypist && <div className="w-full mt-2" id="ai-chat-panel">
            <ChatPanel 
                history={chatHistory} 
                onSendMessage={handleSendMessage} 
                isLoading={isChatLoading}
                suggestedQuestions={suggestedQuestions}
                input={chatInput}
                setInput={setChatInput}
                onRateMessage={handleRateMessage}
            />
        </div>}

        {/* Bento Grid layout with psychophenomenology, fuel, professions, and adaptation guidelines */}
        <TimAnalysisBento selectedTimAbbr={selectedTimAbbreviation} />

        {/* Full-width Socionics Interactive Matrix */}
        <div className="w-full mt-6 border-t border-brand-primary/10 pt-5">
            <SocionicsMatrix 
                selectedTimAbbreviation={selectedTimAbbreviation}
                onSelectTim={onSelectTim}
            />
        </div>
        
        {/* Full-width Intertype Relations Compatibility Panel */}
        <div className="w-full mt-6 border-t border-brand-primary/10 pt-5">
            <IntertypeRelationsPanel 
                currentTimAbbr={selectedTimAbbreviation}
                currentTimName={(selectedTimDefinition?.name || 'Неизвестно')}
            />
        </div>
    </div>
  );

  return (
    <>
      {showRestartConfirm && (
        <div className="fixed inset-0 bg-brand-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-surface p-6 rounded-2xl border border-brand-primary/20 shadow-2xl max-w-sm w-full text-center">
            <h3 className="text-lg font-bold text-brand-primary mb-2 font-serif">Начать заново?</h3>
            <p className="text-sm text-brand-text-secondary mb-6">Текущие результаты анализа будут сброшены, и вы вернетесь к экрану ввода монолога.</p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setShowRestartConfirm(false)}
                className="px-4 py-2 bg-brand-bg hover:bg-brand-cream-dark text-brand-text rounded-xl text-sm font-semibold transition-colors cursor-pointer border border-brand-primary/10"
              >
                Отмена
              </button>
              <button 
                onClick={() => {
                  setShowRestartConfirm(false);
                  onRestart();
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Да, сбросить
              </button>
            </div>
          </div>
        </div>
      )}

      {showImpossibleLocksAlert && (
        <div className="fixed inset-0 bg-brand-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-surface p-6 rounded-2xl border border-red-500/30 shadow-2xl max-w-md w-full">
            <div className="flex items-center gap-2 mb-3 text-red-600">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold font-serif text-red-600">невозможно!</h3>
            </div>
            <p className="text-sm text-brand-text mb-4 leading-relaxed">
              Выбранная вами комбинация зафиксированных признаков (замков 🔒) математически <strong>невозможна</strong> в классической соционике. Ни один из 16 типов информационного метаболизма (ТИМ) не удовлетворяет всем этим критериям одновременно.
            </p>
            
            <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/10 mb-4">
              <span className="text-xs font-bold text-red-700 uppercase tracking-wider font-mono block mb-1">Заблокированные вами признаки:</span>
              <ul className="text-xs text-brand-text-secondary space-y-1 list-disc list-inside">
                {Object.entries(lockedDichotomies || {}).map(([key, val]) => (
                  <li key={key}>
                    <span className="font-medium text-brand-text">{key}:</span> <span className="font-bold text-brand-primary">{val}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <p className="text-xs text-brand-text-secondary mb-6 leading-relaxed">
              Чтобы запустить перерасчет ИИ, пожалуйста, разблокируйте хотя бы один из взаимоисключающих признаков, кликнув по значку 🔒 рядом с ним.
            </p>
            
            <div className="flex justify-end">
              <button 
                onClick={() => setShowImpossibleLocksAlert(false)}
                className="px-5 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 md:p-6 bg-brand-surface rounded-2xl shadow-xl border border-brand-primary/10 animate-fade-in w-full text-brand-text">
      
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-brand-primary/10 flex-wrap gap-2">
        <p className="text-xs font-mono text-brand-text-secondary uppercase tracking-wider">Ваши вероятные социотипы:</p>
        <button 
          onClick={() => setShowRestartConfirm(true)}
          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-red-200"
        >
          🔄 Начать заново
        </button>
      </div>

      <div className="text-center mb-4">
         <div className="flex justify-center items-center gap-2 my-3 flex-wrap">
            {rankedTims.map((tim) => (
                <button
                    key={tim.abbreviation}
                    onClick={() => onSelectTim(tim.abbreviation)}
                    className={`px-3 py-1.5 rounded-lg transition-all border text-center cursor-pointer ${selectedTimAbbreviation === tim.abbreviation ? 'bg-brand-primary text-white border-brand-primary shadow-sm font-semibold' : 'bg-brand-bg border-brand-primary/10 hover:border-brand-primary text-brand-text'}`}
                >
                    <span className="font-bold text-xs block">{tim.name}</span>
                    <span className="block text-[10px] opacity-80 font-mono mt-0.5">{tim.probability}%</span>
                </button>
            ))}
        </div>
      </div>
      
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-brand-primary font-serif tracking-tight">{(selectedTimDefinition?.name || 'Неизвестно')}</h1>
        <p className="text-lg font-semibold text-brand-secondary font-mono">({selectedTimAbbreviation})</p>
      </div>
      
      {/* TABS */}
      <div className="border-b border-brand-primary/10 mb-5">
          <nav className="flex space-x-4 overflow-x-auto whitespace-nowrap" aria-label="Tabs">
              <button 
                onClick={() => setActiveTab('analysis')} 
                className={`px-3 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'analysis' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-primary'}`}
              >
                  Анализ
              </button>
              <button 
                onClick={() => setActiveTab('reference')}
                className={`px-3 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'reference' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-primary'}`}
              >
                  Справочник по ТИМам
              </button>
              {!compactForTypist && <button 
                onClick={() => setActiveTab('lore')}
                className={`px-3 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'lore' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-primary'}`}
              >
                  Кодекс Мудрости ✦
              </button>}
              <button 
                onClick={() => setActiveTab('stats')}
                className={`px-3 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'stats' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-primary'}`}
              >
                  Статистика ИИ 📊
              </button>
              <button 
                onClick={() => setActiveTab('compatibility')}
                className={`px-3 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'compatibility' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-primary'}`}
              >
                  Совместимость 👥
              </button>
              <button 
                onClick={() => setActiveTab('motivation')}
                className={`px-3 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'motivation' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-primary'}`}
              >
                  Карьера и мотивация 💼
              </button>
          </nav>
      </div>

      {Object.values(backgroundTasks).length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {Object.entries(backgroundTasks).map(([key, text]) => (
            <div key={key} className="inline-flex w-fit items-center gap-2 bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-lg text-xs font-semibold animate-pulse shadow-sm border border-brand-primary/20">
              <div className="w-2 h-2 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
              <span>{text} (работает в фоне)</span>
            </div>
          ))}
        </div>
      )}
      
      <div className={activeTab === 'analysis' ? 'block' : 'hidden'}>
        {renderAnalysisTab()}
      </div>
      <div className={activeTab === 'reference' ? 'block' : 'hidden'}>
        <TimReference />
      </div>
      <div className={activeTab === 'lore' ? 'block' : 'hidden'}>
        <LoreCodex selectedTimAbbr={selectedTimAbbreviation} />
      </div>
      <div className={activeTab === 'stats' ? 'block' : 'hidden'}>
        <StatsDashboard />
      </div>
      <div className={activeTab === 'compatibility' ? 'block' : 'hidden'}>
        <CompatibilityTab 
          sessions={sessions} 
          activeSessionId={activeSessionId} 
          activePsychosophyType={psychosophyType} 
          onAnalyzingChange={handleCompatibilityAnalyzingChange}
        />
      </div>
      <div className={activeTab === 'motivation' ? 'block' : 'hidden'}>
        <MotivationTab 
          sessionName={sessionName} 
          timAbbr={selectedTimAbbreviation} 
          psychosophyType={psychosophyType} 
          onAnalyzingChange={handleMotivationAnalyzingChange}
        />
      </div>

      {/* Unobtrusive footer with link to indikov.ru */}
      <div className="text-center mt-8 pt-4 border-t border-brand-primary/10 text-[11px] text-brand-text-secondary font-mono">
        Разработано в соавторстве с <a href="https://indikov.ru" target="_blank" rel="noopener noreferrer" className="underline text-brand-primary hover:text-brand-secondary transition-colors font-semibold">НейроИндыков (indikov.ru)</a>
      </div>
    </div>
    </>
  );
};
export default ResultScreen;

const CompatibilityTab: React.FC<{ sessions: TypingSession[], activeSessionId: string, activePsychosophyType: string, onAnalyzingChange?: (b: boolean) => void }> = ({ sessions, activeSessionId, activePsychosophyType, onAnalyzingChange }) => {
  // We can match people who have a selected TIM
  const typedSessions = sessions.filter(s => s.selectedTimAbbreviation || s.analysisResult);

  // Set default selected individuals
  const [selectedA, setSelectedA] = useState<string>(activeSessionId);
  const defaultB = typedSessions.find(s => s.id !== activeSessionId)?.id || typedSessions[0]?.id || '';
  const [selectedB, setSelectedB] = useState<string>(defaultB);

  useEffect(() => {
    setSelectedA(activeSessionId);
    const newDefaultB = typedSessions.find(s => s.id !== activeSessionId)?.id || typedSessions[0]?.id || '';
    setSelectedB(newDefaultB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, typedSessions.length]); // typedSessions.length is used so we don't cause infinite loops but catch new sessions

  const [compatibilityResult, setCompatibilityResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [relationContext, setRelationContext] = useState<string>('Романтика / Брак');
  const [analyzedState, setAnalyzedState] = useState<{ timA: string, timB: string, context: string } | null>(null);

  const CONTEXT_OPTIONS = [
    'Романтика / Брак',
    'Коллеги / Бизнес',
    'Родитель / Ребенок',
    'Братья / Сестры',
    'Дружба'
  ];

  useEffect(() => {
    onAnalyzingChange?.(isAnalyzing);
  }, [isAnalyzing, onAnalyzingChange]);

  // Clear previous AI analysis if participants change
  useEffect(() => {
    setCompatibilityResult('');
  }, [selectedA, selectedB]);

  if (typedSessions.length < 2) {
    return (
      <div className="p-8 text-center text-brand-text-secondary bg-brand-surface border border-brand-primary/10 rounded-2xl max-w-4xl mx-auto my-6">
        <div className="text-3xl mb-3">👥</div>
        <h3 className="text-base font-bold text-brand-text mb-1">Недостаточно участников для сравнения</h3>
        <p className="text-xs text-brand-text-secondary leading-relaxed max-w-md mx-auto font-light">
          Для анализа совместимости и мэтчинга необходимо типировать хотя бы еще одного человека. Добавьте нового участника в верхней панели, пройдите типирование или укажите ТИМ вручную!
        </p>
      </div>
    );
  }

  const personA = typedSessions.find(s => s.id === selectedA);
  const personB = typedSessions.find(s => s.id === selectedB);

  const timA = personA?.selectedTimAbbreviation || personA?.analysisResult?.tim.abbreviation || '';
  const timB = personB?.selectedTimAbbreviation || personB?.analysisResult?.tim.abbreviation || '';

  const getRelation = () => {
    if (!timA || !timB) return null;

    if (timA === timB) {
      return {
        key: 'identical',
        relationName: RELATION_METADATA.identical.name,
        description: RELATION_METADATA.identical.description,
        rating: RELATION_METADATA.identical.rating
      };
    }

    const relationsForA = INTERTYPE_RELATIONS_DATA[timA];
    if (!relationsForA) return null;

    for (const [relationKey, partner] of Object.entries(relationsForA)) {
      if (partner.abbr === timB) {
        const meta = RELATION_METADATA[relationKey] || {
          name: relationKey,
          description: "Интертипные отношения в соционике.",
          rating: 'neutral' as const
        };
        return {
          key: relationKey,
          relationName: meta.name,
          description: meta.description,
          rating: meta.rating
        };
      }
    }
    return null;
  };

  const relation = getRelation();

  const getRatingBadge = (rating: 'excellent' | 'good' | 'neutral' | 'difficult') => {
    switch (rating) {
      case 'excellent':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm animate-fade-in">
            ★ Идеальная совместимость
          </span>
        );
      case 'good':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-sm animate-fade-in">
            ▲ Хорошая совместимость
          </span>
        );
      case 'neutral':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-600 border border-slate-500/20 shadow-sm animate-fade-in">
            ● Нейтральная совместимость
          </span>
        );
      case 'difficult':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 shadow-sm animate-fade-in">
            ■ Сложные / Конфликтные
          </span>
        );
    }
  };

  const getQuadra = (abbr: string) => {
    if (['ИЛЭ', 'СЭИ', 'ЭСЭ', 'ЛИИ'].includes(abbr)) return { name: 'Альфа 🌀', desc: 'открытость новому, свободное обсуждение, уют и искренность.', style: 'text-amber-600 bg-amber-500/5 border border-amber-500/20' };
    if (['СЛЭ', 'ИЭИ', 'ЭИЭ', 'ЛСИ'].includes(abbr)) return { name: 'Бета 🔥', desc: 'сила характера, воля, идейное лидерство, статус и глубина чувств.', style: 'text-rose-600 bg-rose-500/5 border border-rose-500/20' };
    if (['СЭЭ', 'ИЛИ', 'ЛИЭ', 'ЭСИ'].includes(abbr)) return { name: 'Гамма ⚡', desc: 'прагматизм, деловой напор, эффективность, личные связи и выгода.', style: 'text-blue-600 bg-blue-500/5 border border-blue-500/20' };
    if (['ЛСЭ', 'ЭИИ', 'ИЭЭ', 'СЛИ'].includes(abbr)) return { name: 'Дельта 🌱', desc: 'профессионализм, гуманизм, гармония, тихий комфорт и мастерство.', style: 'text-emerald-600 bg-emerald-500/5 border border-emerald-500/20' };
    return { name: 'Не определена', desc: '', style: 'text-gray-500 bg-gray-500/5 border border-gray-500/20' };
  };

  const quadraA = getQuadra(timA);
  const quadraB = getQuadra(timB);
  const isSameQuadra = quadraA.name === quadraB.name;

  const handleAnalyze = async () => {
    if (!personA || !personB || !timA || !timB) return;
    setIsAnalyzing(true);
    try {
      const res = await analyzeCompatibility(
        personA.name, 
        timA,
        psychoA, 
        personB.name, 
        timB,
        psychoB,
        relationContext
      );
      setCompatibilityResult(res);
      setAnalyzedState({ timA, timB, context: relationContext });
    } catch (err: any) {
      alert(err.message || 'Ошибка анализа совместимости');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isStale = analyzedState !== null && (analyzedState.timA !== timA || analyzedState.timB !== timB || analyzedState.context !== relationContext);

  const getPsychosophyStr = (session?: TypingSession) => {
    if (!session) return 'Не определен';
    if (session.id === activeSessionId) return activePsychosophyType;
    
    const timAbbr = session.selectedTimAbbreviation || session.analysisResult?.tim.abbreviation;
    return timAbbr ? (CANONICAL_TYPOLOGIES[timAbbr]?.psychosophy.type || 'ЛВЭФ') : 'Не определен';
  };

  const psychoA = getPsychosophyStr(personA);
  const psychoB = getPsychosophyStr(personB);

  return (
    <div className="bg-brand-surface p-6 rounded-2xl border border-brand-primary/10 shadow-sm animate-fade-in text-left max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-brand-primary font-serif">Мэтчинг и Сравнение Участников</h2>
        <p className="text-xs text-brand-text-secondary mt-1 font-sans">
          Интерактивный инструмент сравнения соционических и психософских типов любых двух участников вашей сессии.
        </p>
      </div>

      {/* Select Participants Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-brand-bg rounded-xl border border-brand-primary/10">
        {/* Person A */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-brand-text-secondary uppercase tracking-wider">Участник №1</label>
          <select 
            value={selectedA} 
            onChange={e => setSelectedA(e.target.value)}
            className="w-full px-3 py-2 bg-brand-surface border border-brand-cream-dark rounded-xl text-sm focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 text-brand-text font-semibold transition-all duration-200 cursor-pointer shadow-sm"
          >
            {typedSessions.map(s => {
              const abbr = s.selectedTimAbbreviation || s.analysisResult?.tim.abbreviation;
              const timName = abbr && TIM_DEFINITIONS[abbr] ? TIM_DEFINITIONS[abbr].name : 'Не определен';
              const display = abbr ? `${timName} (${abbr})` : timName;
              return (
                <option key={s.id} value={s.id}>
                  {s.name} - {display}
                </option>
              );
            })}
          </select>
          {personA && (
            <div className="p-3 bg-brand-surface rounded-xl border border-brand-cream-dark/50 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-brand-text">{personA.name}</span>
                <span className="px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-mono font-bold text-right">
                  {TIM_DEFINITIONS[timA]?.name} ({timA})
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-brand-text-secondary">
                <span>Квадра:</span>
                <span className={`px-2 py-0.5 rounded font-bold ${quadraA.style}`}>{quadraA.name}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-brand-text-secondary">
                <span>Психософия:</span>
                <span className="font-bold text-purple-600 font-mono">{psychoA}</span>
              </div>
            </div>
          )}
        </div>

        {/* Person B */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-brand-text-secondary uppercase tracking-wider">Участник №2</label>
          <select 
            value={selectedB} 
            onChange={e => setSelectedB(e.target.value)}
            className="w-full px-3 py-2 bg-brand-surface border border-brand-cream-dark rounded-xl text-sm focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 text-brand-text font-semibold transition-all duration-200 cursor-pointer shadow-sm"
          >
            {typedSessions.map(s => {
              const abbr = s.selectedTimAbbreviation || s.analysisResult?.tim.abbreviation;
              const timName = abbr && TIM_DEFINITIONS[abbr] ? TIM_DEFINITIONS[abbr].name : 'Не определен';
              const display = abbr ? `${timName} (${abbr})` : timName;
              return (
                <option key={s.id} value={s.id}>
                  {s.name} - {display}
                </option>
              );
            })}
          </select>
          {personB && (
            <div className="p-3 bg-brand-surface rounded-xl border border-brand-cream-dark/50 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-brand-text">{personB.name}</span>
                <span className="px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-mono font-bold text-right">
                  {TIM_DEFINITIONS[timB]?.name} ({timB})
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-brand-text-secondary">
                <span>Квадра:</span>
                <span className={`px-2 py-0.5 rounded font-bold ${quadraB.style}`}>{quadraB.name}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-brand-text-secondary">
                <span>Психософия:</span>
                <span className="font-bold text-purple-600 font-mono">{psychoB}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedA === selectedB ? (
        <div className="p-4 bg-brand-primary/5 text-brand-text-secondary border border-brand-primary/10 text-xs rounded-xl text-center">
          Выберите двух разных людей для сравнения их интертипных отношений.
        </div>
      ) : (
        <>
          {/* Instant Offline Relation Calculator */}
          {relation ? (
            <div className="p-5 bg-brand-bg border border-brand-primary/10 rounded-xl space-y-3 shadow-inner">
              <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-brand-primary/10">
                <div>
                  <span className="text-[10px] uppercase font-bold text-brand-text-secondary font-mono tracking-wider block">Совместимость по соционике</span>
                  <h3 className="text-lg font-bold text-brand-primary font-serif">
                    {relation.relationName} отношения
                  </h3>
                </div>
                <div>
                  {getRatingBadge(relation.rating)}
                </div>
              </div>

              <p className="text-xs text-brand-text leading-relaxed font-light">
                {relation.description}
              </p>

              {/* Advanced info: Quadra dynamics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="p-3 bg-brand-surface rounded-lg border border-brand-cream-dark/50 space-y-1">
                  <h4 className="font-bold text-brand-text flex items-center gap-1">
                    <span>{isSameQuadra ? '🌀 Квадральное согласие' : '⚔️ Разные квадры'}</span>
                  </h4>
                  <p className="text-[11px] text-brand-text-secondary leading-normal font-light">
                    {isSameQuadra 
                      ? `Оба партнера принадлежат к одной квадре ${quadraA.name}. У вас общие фундаментальные ценности, мировоззрение и взгляды на жизнь. Общаться легко, нет скрытого напряжения.` 
                      : `Участники из разных квадр (${quadraA.name} и ${quadraB.name}). Жизненные ценности и стили общения отличаются: ${quadraA.desc} против ${quadraB.desc}`
                    }
                  </p>
                </div>

                <div className="p-3 bg-brand-surface rounded-lg border border-brand-cream-dark/50 space-y-1">
                  <h4 className="font-bold text-brand-text flex items-center gap-1">
                    <span>🤝 Рекомендация по взаимодействию</span>
                  </h4>
                  <p className="text-[11px] text-brand-text-secondary leading-normal font-light">
                    {relation.rating === 'excellent' 
                      ? 'Идеальный союз! Вы прекрасно дополняете друг друга, поддерживаете слабые стороны партнера. Стройте близкие и продуктивные отношения.'
                      : relation.rating === 'good'
                      ? 'Очень хорошие отношения. Общение приносит пользу и радость, но в совместной деятельности важно уважать методы работы друг друга.'
                      : relation.rating === 'neutral'
                      ? 'Нейтральный фон. Хорошо для совместной деловой или интеллектуальной активности на дистанции, старайтесь не навязывать личные бытовые стандарты.'
                      : 'Сложный союз. Рекомендуется соблюдать психологическую дистанцию, не переходить на личности и детально разграничивать зоны ответственности.'
                    }
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-500/5 text-red-600 border border-red-500/10 text-xs rounded-xl">
              Не удалось рассчитать соционические отношения. Пожалуйста, убедитесь, что у участников определен ТИМ.
            </div>
          )}

          {/* Deep AI Analysis Button */}
          <div className="bg-brand-primary/5 p-5 rounded-2xl border border-brand-primary/10 text-center space-y-4">
            <h3 className="text-sm font-bold text-brand-primary font-serif">Глубокий ИИ-анализ совместимости</h3>
            
            <div className="max-w-md mx-auto space-y-2">
              <label className="block text-xs font-bold text-brand-text-secondary uppercase tracking-wider text-left">Контекст взаимодействия</label>
              <div className="flex flex-wrap justify-center gap-2">
                {CONTEXT_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setRelationContext(opt)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${relationContext === opt ? 'bg-brand-primary text-white shadow-sm' : 'bg-brand-surface text-brand-text-secondary hover:bg-brand-cream border border-brand-primary/10'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-brand-text-secondary max-w-xl mx-auto leading-relaxed">
              ИИ проанализирует сочетание ваших ТИМов ({timA} и {timB}), психософских типов ({psychoA} и {psychoB}) и предоставит подробную карту взаимодействия, сильных и слабых сторон союза в выбранном контексте.
            </p>
            <div className="pt-2 flex justify-center">
              <button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !selectedA || !selectedB}
                className={`px-6 py-2.5 hover:bg-brand-secondary text-white font-bold text-xs rounded-xl shadow-md transition duration-200 cursor-pointer disabled:opacity-50 flex items-center gap-2 select-none ${isStale && compatibilityResult ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-brand-primary'}`}
              >
                {isAnalyzing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    <span>ИИ рассчитывает карту совместимости...</span>
                  </>
                ) : (
                  <>
                    <span>{isStale && compatibilityResult ? '⚠️ Пересчитать анализ' : '🔮 Запустить глубокий ИИ-анализ'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {compatibilityResult && (
            <div className={`mt-4 p-5 bg-brand-primary/5 border ${isStale ? 'border-red-500/50 bg-red-500/5' : 'border-brand-primary/10'} rounded-xl animate-fade-in transition-all duration-300`}>
              {isStale && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Внимание: Данные участников или контекст изменились! Текущий анализ устарел. Нажмите "Пересчитать анализ" для обновления.</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-brand-primary/10 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔮</span>
                  <h4 className="font-serif font-bold text-sm text-brand-primary">Результат ИИ-моделирования: {analyzedState?.context || relationContext}</h4>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const blob = new Blob([compatibilityResult], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `Совместимость_${personA.name}_и_${personB.name}.txt`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-brand-primary/15 text-brand-text font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-brand-cream-dark transition-all duration-300"
                    title="Скачать результат (TXT)"
                  >
                    <Download className="w-3.5 h-3.5" /> Скачать
                  </button>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(`Совместимость: ${personA.name} и ${personB.name}`)}&body=${encodeURIComponent(compatibilityResult)}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-brand-secondary transition-all duration-300"
                    title="Отправить на почту"
                  >
                    <Mail className="w-3.5 h-3.5" /> На почту
                  </a>
                </div>
              </div>
              <div className="prose prose-sm md:prose-base prose-amber max-w-none text-xs text-brand-text leading-relaxed font-light markdown-body space-y-2">
                <ReactMarkdown>{compatibilityResult}</ReactMarkdown>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};


const MotivationTab: React.FC<{ sessionName: string, timAbbr: string, psychosophyType: string, onAnalyzingChange?: (b: boolean) => void }> = ({ sessionName, timAbbr, psychosophyType, onAnalyzingChange }) => {
  const [motivationResult, setMotivationResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    onAnalyzingChange?.(isAnalyzing);
  }, [isAnalyzing, onAnalyzingChange]);

  useEffect(() => {
    if (!psychosophyType || psychosophyType === 'Не определен') return;
    
    const fetchMotivation = async () => {
      setIsAnalyzing(true);
      try {
        const res = await analyzeMotivation(sessionName, timAbbr, psychosophyType);
        setMotivationResult(res);
      } catch (err: any) {
        console.error(err instanceof Error ? err.message : err);
        setMotivationResult('Ошибка при генерации вектора мотивации. Возможно, не настроен API ключ.');
      } finally {
        setIsAnalyzing(false);
      }
    };
    fetchMotivation();
  }, [sessionName, timAbbr, psychosophyType]);

  if (!psychosophyType || psychosophyType === 'Не определен') {
    return (
      <div className="p-8 text-center text-brand-text-secondary bg-brand-surface rounded-2xl border border-brand-primary/10">
        Сначала необходимо определить тип по психософии на вкладке Анализ.
      </div>
    );
  }

  return (
    <div className="bg-brand-surface p-6 rounded-2xl border border-brand-primary/10 shadow-sm animate-fade-in text-left max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-brand-primary font-serif mb-4 flex items-center gap-2">
        <Star className="w-5 h-5" />
        Совместный вектор мотивации
      </h2>
      <p className="text-brand-text-secondary mb-6 text-sm">
        Анализ синергии вашего ТИМа ({timAbbr}) и Психософского типа ({psychosophyType}) для точных советов по выбору карьеры.
      </p>

      {isAnalyzing ? (
        <div className="flex flex-col items-center justify-center p-12 opacity-70">
          <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-brand-primary">Анализируем карьерный вектор...</p>
        </div>
      ) : motivationResult ? (
        <div className="mt-4 p-5 bg-brand-primary/5 border border-brand-primary/10 rounded-xl animate-fade-in">
          <div className="flex justify-end gap-2 mb-4 border-b border-brand-primary/10 pb-3">
            <button
              onClick={() => {
                const blob = new Blob([motivationResult], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Карьера_и_Мотивация_${sessionName}.txt`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-brand-primary/15 text-brand-text font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-brand-cream-dark transition-all duration-300"
              title="Скачать результат (TXT)"
            >
              <Download className="w-3.5 h-3.5" /> Скачать
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent(`Карьерный вектор: ${sessionName}`)}&body=${encodeURIComponent(motivationResult)}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-brand-secondary transition-all duration-300"
              title="Отправить на почту"
            >
              <Mail className="w-3.5 h-3.5" /> На почту
            </a>
          </div>
          <div className="prose prose-sm md:prose-base prose-amber max-w-none markdown-body">
            <ReactMarkdown>{motivationResult}</ReactMarkdown>
          </div>
        </div>
      ) : null}
    </div>
  );
};
