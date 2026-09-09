import React, { useState, useMemo } from 'react';
import { TIM_DEFINITIONS } from '../constants';

interface SocionicsMatrixProps {
  selectedTimAbbreviation: string | null;
  onSelectTim?: (abbr: string) => void;
}

interface MatrixCell {
  abbr: string;
  name: string;
  alias: string;
  quadra: 'Альфа' | 'Бэта' | 'Гамма' | 'Дельта';
  stimulus: string;
  club: string;
  communication: string;
  traits: string[];
}

const MATRIX_CELLS: MatrixCell[] = [
  // Row 1: Alpha Quadra
  {
    abbr: 'ИЛЭ',
    name: 'Дон Кихот',
    alias: 'Искатель',
    quadra: 'Альфа',
    stimulus: 'Уникальность',
    club: 'Сайентисты',
    communication: 'Деловая',
    traits: ['статик', 'квестим', 'позитивист', 'тактик', 'беспечный', 'уступчивый', 'конструктивист', 'правый (процесс)', 'экстраверт', 'интуит', 'логик', 'иррационал']
  },
  {
    abbr: 'СЭИ',
    name: 'Дюма',
    alias: 'Посредник',
    quadra: 'Альфа',
    stimulus: 'Благосостояние',
    club: 'Социалы',
    communication: 'Душевная',
    traits: ['динамик', 'деклатим', 'негативист', 'стратег', 'беспечный', 'уступчивый', 'эмотивист', 'правый (процесс)', 'интроверт', 'сенсорик', 'этик', 'иррационал', 'заботливый', 'восприимчиво-адаптивный']
  },
  {
    abbr: 'ЭСЭ',
    name: 'Гюго',
    alias: 'Энтузиаст',
    quadra: 'Альфа',
    stimulus: 'Статус',
    club: 'Социалы',
    communication: 'Страстная',
    traits: ['динамик', 'деклатим', 'позитивист', 'тактик', 'заботливый', 'предусмотрительный', 'упрямый', 'конструктивист', 'левый (результат)', 'экстраверт', 'сенсорик', 'этик', 'рационал', 'линейно-напористый']
  },
  {
    abbr: 'ЛИИ',
    name: 'Робеспьер',
    alias: 'Аналитик',
    quadra: 'Альфа',
    stimulus: 'Самодостаточность',
    club: 'Сайентисты',
    communication: 'Хладнокровная',
    traits: ['статик', 'квестим', 'негативист', 'стратег', 'предусмотрительный', 'упрямый', 'эмотивист', 'левый (результат)', 'интроверт', 'интуит', 'логик', 'рационал', 'уравновешенно-стабильный']
  },

  // Row 2: Beta Quadra
  {
    abbr: 'ЭИЭ',
    name: 'Гамлет',
    alias: 'Наставник',
    quadra: 'Бэта',
    stimulus: 'Уникальность',
    club: 'Гуманитарии',
    communication: 'Страстная',
    traits: ['динамик', 'квестим', 'негативист', 'стратег', 'конструктивист', 'правый (процесс)', 'беспечный', 'упрямый', 'экстраверт', 'интуит', 'этик', 'рационал', 'линейно-напористый']
  },
  {
    abbr: 'ЛСИ',
    name: 'Максим Горький',
    alias: 'Инспектор',
    quadra: 'Бэта',
    stimulus: 'Благосостояние',
    club: 'Практики',
    communication: 'Хладнокровная',
    traits: ['статик', 'деклатим', 'позитивист', 'тактик', 'эмотивист', 'правый (процесс)', 'беспечный', 'упрямый', 'интроверт', 'сенсорик', 'логик', 'рационал', 'уравновешенно-стабильный']
  },
  {
    abbr: 'СЛЭ',
    name: 'Жуков',
    alias: 'Маршал',
    quadra: 'Бэта',
    stimulus: 'Статус',
    club: 'Практики',
    communication: 'Деловая',
    traits: ['статик', 'деклатим', 'негативист', 'стратег', 'конструктивист', 'левый (результат)', 'предусмотрительный', 'уступчивый', 'экстраверт', 'сенсорик', 'логик', 'иррационал', 'гибко-разворотливый']
  },
  {
    abbr: 'ИЭИ',
    name: 'Есенин',
    alias: 'Лирик',
    quadra: 'Бэта',
    stimulus: 'Самодостаточность',
    club: 'Гуманитарии',
    communication: 'Душевная',
    traits: ['динамик', 'квестим', 'позитивист', 'тактик', 'эмотивист', 'левый (результат)', 'предусмотрительный', 'уступчивый', 'интроверт', 'интуит', 'этик', 'иррационал', 'восприимчиво-адаптивный']
  },

  // Row 3: Gamma Quadra
  {
    abbr: 'СЭЭ',
    name: 'Наполеон',
    alias: 'Политик',
    quadra: 'Гамма',
    stimulus: 'Статус',
    club: 'Социалы',
    communication: 'Страстная',
    traits: ['статик', 'квестим', 'позитивист', 'стратег', 'эмотивист', 'правый (процесс)', 'предусмотрительный', 'упрямый', 'экстраверт', 'сенсорик', 'этик', 'иррационал', 'гибко-разворотливый']
  },
  {
    abbr: 'ИЛИ',
    name: 'Бальзак',
    alias: 'Критик',
    quadra: 'Гамма',
    stimulus: 'Самодостаточность',
    club: 'Сайентисты',
    communication: 'Хладнокровная',
    traits: ['динамик', 'деклатим', 'негативист', 'тактик', 'конструктивист', 'правый (процесс)', 'предусмотрительный', 'упрямый', 'интроверт', 'интуит', 'логик', 'иррационал', 'восприимчиво-адаптивный']
  },
  {
    abbr: 'ЛИЭ',
    name: 'Джек Лондон',
    alias: 'Предприниматель',
    quadra: 'Гамма',
    stimulus: 'Уникальность',
    club: 'Сайентисты',
    communication: 'Деловая',
    traits: ['динамик', 'деклатим', 'позитивист', 'стратег', 'эмотивист', 'левый (результат)', 'беспечный', 'уступчивый', 'экстраверт', 'интуит', 'логик', 'рационал', 'линейно-напористый']
  },
  {
    abbr: 'ЭСИ',
    name: 'Драйзер',
    alias: 'Хранитель',
    quadra: 'Гамма',
    stimulus: 'Благосостояние',
    club: 'Социалы',
    communication: 'Душевная',
    traits: ['статик', 'квестим', 'негативист', 'тактик', 'конструктивист', 'левый (результат)', 'беспечный', 'уступчивый', 'интроверт', 'сенсорик', 'этик', 'рационал', 'уравновешенно-стабильный']
  },

  // Row 4: Delta Quadra
  {
    abbr: 'ЛСЭ',
    name: 'Штирлиц',
    alias: 'Управитель',
    quadra: 'Дельта',
    stimulus: 'Статус',
    club: 'Практики',
    communication: 'Деловая',
    traits: ['динамик', 'квестим', 'негативист', 'правый (процесс)', 'эмотивист', 'предусмотрительный', 'уступчивый', 'экстраверт', 'сенсорик', 'логик', 'рационал', 'линейно-напористый', 'тактик']
  },
  {
    abbr: 'ЭИИ',
    name: 'Достоевский',
    alias: 'Гуманист',
    quadra: 'Дельта',
    stimulus: 'Самодостаточность',
    club: 'Гуманитарии',
    communication: 'Душевная',
    traits: ['статик', 'деклатим', 'позитивист', 'стратег', 'конструктивист', 'правый (процесс)', 'предусмотрительный', 'уступчивый', 'интроверт', 'интуит', 'этик', 'рационал', 'уравновешенно-стабильный']
  },
  {
    abbr: 'ИЭЭ',
    name: 'Гексли',
    alias: 'Советчик',
    quadra: 'Дельта',
    stimulus: 'Уникальность',
    club: 'Гуманитарии',
    communication: 'Страстная',
    traits: ['статик', 'деклатим', 'негативист', 'тактик', 'эмотивист', 'левый (результат)', 'беспечный', 'упрямый', 'экстраверт', 'интуит', 'этик', 'иррационал', 'гибко-разворотливый']
  },
  {
    abbr: 'СЛИ',
    name: 'Габен',
    alias: 'Мастер',
    quadra: 'Дельта',
    stimulus: 'Благосостояние',
    club: 'Практики',
    communication: 'Хладнокровная',
    traits: ['динамик', 'квестим', 'позитивист', 'стратег', 'конструктивист', 'левый (результат)', 'беспечный', 'упрямый', 'интроверт', 'сенсорик', 'логик', 'иррационал', 'восприимчиво-адаптивный']
  }
];

const TRAIT_MAPPING: { [key: string]: { [key: string]: string } } = {
  "Экстраверсия / Интроверсия": { "Экстраверсия": "экстраверт", "Интроверсия": "интроверт" },
  "Рациональность / Иррациональность": { "Рациональность": "рационал", "Иррациональность": "иррационал" },
  "Логика / Этика": { "Логика": "логик", "Этика": "этик" },
  "Интуиция / Сенсорика": { "Интуиция": "интуит", "Сенсорика": "сенсорик" },
  "Статика / Динамика": { "Статика": "статик", "Динамика": "динамик" },
  "Позитивизм / Негативизм": { "Позитивизм": "позитивист", "Негативизм": "негативист" },
  "Квестимность / Деклатимность": { "Квестимность": "квестим", "Деклатимность": "деклатим" },
  "Тактика / Стратегия": { "Тактика": "тактик", "Стратегия": "стратег" },
  "Аристократия / Демократия": { "Аристократия": "аристократ", "Демократия": "демократ" },
  "Рассудительность / Решительность": { "Рассудительность": "рассудительный", "Решительность": "решительный" },
  "Субъективизм / Объективизм": { "Субъективизм": "субъективист", "Объективизм": "объективист" },
  "Процесс / Результат": { "Процесс": "правый (процесс)", "Результат": "левый (результат)" },
  "Предусмотрительность / Беспечность": { "Предусмотрительность": "предусмотрительный", "Беспечность": "беспечный" },
  "Упрямство / Уступчивость": { "Упрямство": "упрямый", "Уступчивость": "уступчивый" },
  "Конструктивизм / Эмотивизм": { "Конструктивизм": "конструктивист", "Эмотивизм": "эмотивист" },
};

const DYNAMIC_MATRIX_CELLS: MatrixCell[] = MATRIX_CELLS.map(cell => {
  const timDef = TIM_DEFINITIONS[cell.abbr];
  const dynamicTraits = [...(cell.traits || [])];
  if (timDef) {
    Object.entries(TRAIT_MAPPING).forEach(([dichotomyName, mapping]) => {
      const val = timDef[dichotomyName];
      if (val && mapping[val]) {
        if (!dynamicTraits.includes(mapping[val])) {
          dynamicTraits.push(mapping[val]);
        }
      }
    });
  }
  return {
    ...cell,
    traits: dynamicTraits
  };
});

interface FilterDichotomy {
  id: string;
  name: string;
  pole1: string;
  pole2: string;
}

const FILTER_DICHOTOMIES: FilterDichotomy[] = [
  { id: 'extra', name: 'Экстраверсия / Интроверсия', pole1: 'экстраверт', pole2: 'интроверт' },
  { id: 'rationality', name: 'Рациональность / Иррациональность', pole1: 'рационал', pole2: 'иррационал' },
  { id: 'logicEthics', name: 'Логика / Этика', pole1: 'логик', pole2: 'этик' },
  { id: 'intuitionSensory', name: 'Интуиция / Сенсорика', pole1: 'интуит', pole2: 'сенсорик' },
  { id: 'staticDynamic', name: 'Статика / Динамика', pole1: 'статик', pole2: 'динамик' },
  { id: 'posNeg', name: 'Позитивизм / Негативизм', pole1: 'позитивист', pole2: 'негативист' },
  { id: 'questDec', name: 'Квестимность / Деклатимность', pole1: 'квестим', pole2: 'деклатим' },
  { id: 'tacticalStrategic', name: 'Тактика / Стратегия', pole1: 'тактик', pole2: 'стратег' },
  { id: 'aristocracyDemocracy', name: 'Аристократия / Демократия', pole1: 'аристократ', pole2: 'демократ' },
  { id: 'judgingPerceiving', name: 'Рассудительность / Решительность', pole1: 'рассудительный', pole2: 'решительный' },
  { id: 'subjectivismObjectivism', name: 'Субъективизм / Объективизм', pole1: 'субъективист', pole2: 'объективист' },
  { id: 'processResult', name: 'Процесс / Результат', pole1: 'правый (процесс)', pole2: 'левый (результат)' },
  { id: 'farsightedCarefree', name: 'Предусмотрительность / Беспечность', pole1: 'предусмотрительный', pole2: 'беспечный' },
  { id: 'obstinateYielding', name: 'Упрямство / Уступчивость', pole1: 'упрямый', pole2: 'уступчивый' },
  { id: 'constructivismEmotivisim', name: 'Конструктивизм / Эмотивизм', pole1: 'конструктивист', pole2: 'эмотивист' },
];

export const SocionicsMatrix: React.FC<SocionicsMatrixProps> = ({
  selectedTimAbbreviation,
  onSelectTim
}) => {
  const [selectedQuadra, setSelectedQuadra] = useState<'Все' | 'Альфа' | 'Бэта' | 'Гамма' | 'Дельта'>('Все');
  const [activeDichotomy, setActiveDichotomy] = useState<string | null>(null);
  const [activePole, setActivePole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [disableActiveHighlight, setDisableActiveHighlight] = useState(false);

  // Find currently active dichotomy options
  const activeDichotomyObj = useMemo(() => {
    return FILTER_DICHOTOMIES.find(d => d.id === activeDichotomy) || null;
  }, [activeDichotomy]);

  const handleSelectDichotomy = (dichotomyId: string) => {
    if (activeDichotomy === dichotomyId) {
      setActiveDichotomy(null);
      setActivePole(null);
    } else {
      setActiveDichotomy(dichotomyId);
      const dichotomy = FILTER_DICHOTOMIES.find(d => d.id === dichotomyId);
      if (dichotomy) {
        setActivePole(dichotomy.pole1); // Default to pole1
      }
    }
  };

  const isCellMatchingFilter = (cell: MatrixCell) => {
    // 1. Quadra filter
    if (selectedQuadra !== 'Все' && cell.quadra !== selectedQuadra) {
      return false;
    }

    // 2. Dichotomy filter
    if (activePole && !cell.traits.includes(activePole)) {
      return false;
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = cell.name.toLowerCase().includes(query);
      const matchAbbr = cell.abbr.toLowerCase().includes(query);
      const matchAlias = cell.alias.toLowerCase().includes(query);
      const matchTraits = cell.traits.some(t => t.toLowerCase().includes(query));
      if (!matchName && !matchAbbr && !matchAlias && !matchTraits) {
        return false;
      }
    }

    return true;
  };

  const getQuadraColorClasses = (quadra: 'Альфа' | 'Бэта' | 'Гамма' | 'Дельта', isHighlighted: boolean, isActive: boolean) => {
    if (isActive) {
      switch (quadra) {
        case 'Альфа':
          return 'bg-blue-950/90 border-blue-400 text-white shadow-[0_0_15px_rgba(96,165,250,0.45)] scale-[1.02] z-10';
        case 'Бэта':
          return 'bg-red-950/90 border-red-400 text-white shadow-[0_0_15px_rgba(248,113,113,0.45)] scale-[1.02] z-10';
        case 'Гамма':
          return 'bg-purple-950/90 border-purple-400 text-white shadow-[0_0_15px_rgba(192,132,252,0.45)] scale-[1.02] z-10';
        case 'Дельта':
          return 'bg-emerald-950/90 border-emerald-400 text-white shadow-[0_0_15px_rgba(52,211,153,0.45)] scale-[1.02] z-10';
      }
    }

    if (!isHighlighted) {
      return 'bg-brand-surface border-brand-primary/10 opacity-35 scale-[0.98] blur-[0.3px] transition-all duration-300';
    }

    switch (quadra) {
      case 'Альфа':
        return 'bg-blue-950/30 hover:bg-blue-950/50 border-blue-500/25 hover:border-blue-500/40 text-brand-text';
      case 'Бэта':
        return 'bg-red-950/30 hover:bg-red-950/50 border-red-500/25 hover:border-red-500/40 text-brand-text';
      case 'Гамма':
        return 'bg-purple-950/30 hover:bg-purple-950/50 border-purple-500/25 hover:border-purple-500/40 text-brand-text';
      case 'Дельта':
        return 'bg-emerald-950/30 hover:bg-emerald-950/50 border-emerald-500/25 hover:border-emerald-500/40 text-brand-text';
    }
  };

  const getQuadraBadgeClasses = (quadra: 'Альфа' | 'Бэта' | 'Гамма' | 'Дельта') => {
    switch (quadra) {
      case 'Альфа': return 'bg-blue-500/10 text-blue-300 border-blue-500/25';
      case 'Бэта': return 'bg-red-500/10 text-red-300 border-red-500/25';
      case 'Гамма': return 'bg-purple-500/10 text-purple-300 border-purple-500/25';
      case 'Дельта': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25';
    }
  };

  const getQuadraHeaderColor = (quadra: 'Альфа' | 'Бэта' | 'Гамма' | 'Дельта') => {
    switch (quadra) {
      case 'Альфа': return 'text-blue-400';
      case 'Бэта': return 'text-red-400';
      case 'Гамма': return 'text-purple-400';
      case 'Дельта': return 'text-emerald-400';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto my-8 p-6 bg-brand-surface rounded-2xl border border-brand-primary/15 shadow-xl transition-all duration-300">
      
      {/* Title & Introduction */}
      <div className="mb-6 border-b border-brand-primary/10 pb-4">
        <h3 className="text-xl font-bold font-serif text-brand-primary flex items-center gap-2">
          <span>Интерактивная матрица соционических типов</span>
        </h3>
        <p className="text-xs text-brand-text-secondary mt-1">
          Исследуйте квадры, аспекты и 15 признаков Рейнина на высококонтрастной интерактивной сетке. Типы, соответствующие вашему анализу или фильтрам, подсвечиваются ярким цветом.
        </p>
      </div>

      {/* Control Panels */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        
        {/* Quadra filter buttons */}
        <div className="md:col-span-4 flex flex-col gap-1.5">
          <span className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider font-mono">Фильтр по Квадрам:</span>
          <div className="flex flex-wrap gap-1.5">
            {(['Все', 'Альфа', 'Бэта', 'Гамма', 'Дельта'] as const).map(q => (
              <button
                key={q}
                onClick={() => setSelectedQuadra(q)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer ${selectedQuadra === q ? 'bg-brand-primary text-white border-brand-primary shadow-sm' : 'bg-brand-bg hover:bg-brand-cream-dark/30 text-brand-text-secondary border-brand-primary/10'}`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Reinin Dichotomies filter buttons */}
        <div className="md:col-span-8 flex flex-col gap-1.5">
          <span className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider font-mono">Интерактивные признаки Рейнина (контрастная подсветка):</span>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_DICHOTOMIES.map(d => (
              <button
                key={d.id}
                onClick={() => handleSelectDichotomy(d.id)}
                className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition-all duration-200 cursor-pointer ${activeDichotomy === d.id ? 'bg-brand-primary text-white border-brand-primary shadow-md' : 'bg-brand-bg hover:bg-brand-cream-dark/30 text-brand-text-secondary border-brand-primary/10'}`}
              >
                {d.name.split(' / ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dichotomy Poles Toggle (shows only when a dichotomy is active) */}
      {activeDichotomyObj && (
        <div className="mb-6 p-3 bg-brand-bg rounded-xl border border-brand-primary/10 flex items-center justify-center gap-4 animate-fade-in text-xs font-semibold">
          <span className="text-brand-text-secondary font-mono">Выбранный признак: <strong className="text-brand-primary font-sans">{activeDichotomyObj.name}</strong></span>
          <div className="flex gap-2">
            <button
              onClick={() => setActivePole(activeDichotomyObj.pole1)}
              className={`px-4 py-1.5 rounded-full border transition-all cursor-pointer ${activePole === activeDichotomyObj.pole1 ? 'bg-brand-primary text-white border-brand-primary font-bold shadow-sm' : 'bg-brand-surface hover:bg-brand-cream-dark border-brand-primary/10 text-brand-text-secondary'}`}
            >
              {activeDichotomyObj.pole1.toUpperCase()}
            </button>
            <button
              onClick={() => setActivePole(activeDichotomyObj.pole2)}
              className={`px-4 py-1.5 rounded-full border transition-all cursor-pointer ${activePole === activeDichotomyObj.pole2 ? 'bg-brand-primary text-white border-brand-primary font-bold shadow-sm' : 'bg-brand-surface hover:bg-brand-cream-dark border-brand-primary/10 text-brand-text-secondary'}`}
            >
              {activeDichotomyObj.pole2.toUpperCase()}
            </button>
          </div>
        </div>
      )}

      {/* Search and Quick Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-grow w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по ТИМу, псевдониму или признаку (например: 'джек', 'искатель', 'статик')..."
            className="w-full bg-brand-surface border border-brand-cream-dark rounded-xl px-4 py-2.5 text-brand-text text-sm focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 placeholder-brand-text-secondary/50 shadow-sm transition-all duration-200"
          />
        </div>
        <div className="flex-shrink-0 flex items-center bg-brand-bg border border-brand-primary/10 rounded-xl px-4 py-2.5 shadow-sm">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-brand-text-secondary uppercase tracking-wider font-mono select-none">
            <input
              type="checkbox"
              id="disable-highlight-toggle"
              checked={disableActiveHighlight}
              onChange={(e) => setDisableActiveHighlight(e.target.checked)}
              className="w-4 h-4 rounded border-brand-primary/20 accent-brand-primary text-brand-primary cursor-pointer"
            />
            <span>Не подсвечивать текущий ТИМ</span>
          </label>
        </div>
      </div>

      {/* 4x4 Grid Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DYNAMIC_MATRIX_CELLS.map((cell) => {
          const isHighlighted = isCellMatchingFilter(cell);
          const isActive = !disableActiveHighlight && selectedTimAbbreviation === cell.abbr;
          const quadraClass = getQuadraColorClasses(cell.quadra, isHighlighted, isActive);
          const badgeClass = getQuadraBadgeClasses(cell.quadra);

          return (
            <div
              key={cell.abbr}
              onClick={() => onSelectTim && onSelectTim(cell.abbr)}
              className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[190px] relative overflow-hidden ${quadraClass}`}
            >
              {/* Top Row: Abbreviation & Quadra Badge */}
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex flex-col">
                  <span className="text-lg font-bold tracking-tight font-serif flex items-center gap-1 text-brand-primary">
                    {cell.name}
                    {isActive && <span className="text-brand-accent text-sm animate-pulse">●</span>}
                  </span>
                  <span className={`text-xs font-mono font-bold tracking-wide uppercase ${getQuadraHeaderColor(cell.quadra)}`}>
                    {cell.abbr}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeClass}`}>
                  {cell.alias}
                </span>
              </div>

              {/* Middle Section: Meta details */}
              <div className="my-2 space-y-1 text-[11px] border-t border-brand-primary/5 pt-2 flex-grow">
                <div className="flex justify-between">
                  <span className="text-brand-text-secondary">Стимул:</span>
                  <span className="font-semibold text-brand-text">{cell.stimulus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-text-secondary">Клуб / Общение:</span>
                  <span className="font-semibold text-brand-text">{cell.club} / {cell.communication}</span>
                </div>
              </div>

              {/* Bottom Section: Reinin Traits (high contrast tags) */}
              <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t border-brand-primary/5">
                {cell.traits.slice(0, 5).map((trait) => {
                  const isFilteredTrait = activePole === trait;
                  return (
                    <span
                      key={trait}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                        isFilteredTrait
                          ? 'bg-brand-primary text-white font-bold shadow-sm'
                          : 'bg-zinc-800/10 text-brand-text-secondary'
                      }`}
                    >
                      {trait}
                    </span>
                  );
                })}
                {cell.traits.length > 5 && (
                  <span className="text-[9px] text-brand-text-secondary opacity-60 px-1 py-0.5">
                    +{cell.traits.length - 5}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend and stats */}
      <div className="mt-4 pt-4 border-t border-brand-primary/10 flex flex-wrap justify-between items-center text-[10px] text-brand-text-secondary gap-3">
        <span>Нажмите на любую карточку типа, чтобы переключить детальный анализ на этот ТИМ.</span>
        <div className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500/25 border border-blue-400 inline-block"></span> Альфа (Весна)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/25 border border-red-400 inline-block"></span> Бэта (Лето)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500/25 border border-purple-400 inline-block"></span> Гамма (Осень)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/25 border border-emerald-400 inline-block"></span> Дельта (Зима)
          </span>
        </div>
      </div>
    </div>
  );
};
