import { TIM_DEFINITIONS } from '../constants';
import type { TypistDichotomy, TypistResult, WordEvidence } from '../typistTypes';

type Dimension = {
  name: string;
  a: string;
  b: string;
  aWords: string[];
  bWords: string[];
};

const DIMENSIONS: Dimension[] = [
  {
    name: 'Экстраверсия / Интроверсия', a: 'Экстраверсия', b: 'Интроверсия',
    aWords: ['люди', 'команда', 'общаться', 'вместе', 'знакомиться', 'обсудить', 'вовлекать', 'встреча', 'публично'],
    bWords: ['один', 'тишина', 'уединение', 'устал', 'размышлять', 'внутри', 'личное', 'спокойно', 'самостоятельно']
  },
  {
    name: 'Логика / Этика', a: 'Логика', b: 'Этика',
    aWords: ['факт', 'система', 'причина', 'эффективность', 'правило', 'логично', 'результат', 'данные', 'анализ', 'решение'],
    bWords: ['чувство', 'отношения', 'поддержка', 'обида', 'атмосфера', 'доверие', 'переживание', 'эмоции', 'забота', 'любит']
  },
  {
    name: 'Интуиция / Сенсорика', a: 'Интуиция', b: 'Сенсорика',
    aWords: ['идея', 'возможность', 'будущее', 'смысл', 'вариант', 'воображение', 'концепция', 'перспектива', 'потенциал'],
    bWords: ['комфорт', 'тело', 'деньги', 'качество', 'практика', 'руками', 'вкус', 'пространство', 'деталь', 'ощущение']
  },
  {
    name: 'Рациональность / Иррациональность', a: 'Рациональность', b: 'Иррациональность',
    aWords: ['план', 'срок', 'порядок', 'расписание', 'заранее', 'обязательно', 'структура', 'контроль', 'последовательно'],
    bWords: ['спонтанно', 'гибкость', 'по ситуации', 'импровизация', 'внезапно', 'свобода', 'поток', 'переключаться', 'интересно']
  }
];

const normalize = (text: string) => text.toLowerCase().replace(/ё/g, 'е');

const countTerm = (text: string, term: string) => {
  const normalizedTerm = normalize(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = text.match(new RegExp(`(^|[^а-яa-z])${normalizedTerm}`, 'g'));
  return matches?.length || 0;
};

export function runLocalTypist(text: string, fallbackSeed = ''): TypistResult {
  const normalized = normalize(text);
  const wordCount = (normalized.match(/[а-яa-z0-9-]+/g) || []).length;
  const evidence: WordEvidence[] = [];
  const dichotomies: TypistDichotomy[] = [];

  for (const d of DIMENSIONS) {
    let aScore = 0;
    let bScore = 0;
    for (const word of d.aWords) {
      const count = countTerm(normalized, word);
      if (count) {
        aScore += count;
        evidence.push({ word, dimension: d.name, pole: d.a, count, weight: count });
      }
    }
    for (const word of d.bWords) {
      const count = countTerm(normalized, word);
      if (count) {
        bScore += count;
        evidence.push({ word, dimension: d.name, pole: d.b, count, weight: count });
      }
    }
    const total = aScore + bScore;
    const result = aScore === bScore ? d.a : (aScore > bScore ? d.a : d.b);
    const margin = total ? Math.abs(aScore - bScore) / total : 0;
    const confidence = total ? Math.round(50 + margin * 28) : 35;
    dichotomies.push({
      name: d.name,
      result,
      confidence,
      evidence: total ? `${aScore}:${bScore} по словам-маркерам` : 'Явных слов-маркеров не найдено'
    });
  }

  let ranked = Object.entries(TIM_DEFINITIONS).map(([abbreviation, def]) => {
    let score = 0;
    dichotomies.forEach(d => {
      if (def[d.name] === d.result) score += Math.max(1, d.confidence - 30);
    });
    return { abbreviation, name: def.name, score };
  }).sort((x, y) => y.score - x.score || x.abbreviation.localeCompare(y.abbreviation));

  const scoreLead = (ranked[0]?.score || 0) - (ranked[1]?.score || 0);
  const randomPlaceholder = Boolean(fallbackSeed) && (wordCount < 45 || evidence.length < 5 || scoreLead < 12);
  if (randomPlaceholder) {
    const fallbackHash = Array.from(fallbackSeed).reduce((value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
    const randomValue = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : fallbackHash;
    const offset = randomValue % ranked.length;
    ranked = [...ranked.slice(offset), ...ranked.slice(0, offset)];
    const placeholderDefinition = TIM_DEFINITIONS[ranked[0].abbreviation];
    dichotomies.forEach(item => {
      item.result = placeholderDefinition[item.name] || item.result;
      item.confidence = 0;
      item.evidence = 'Критического перевеса нет; полюсы для черновика выбраны случайно.';
    });
  }

  const max = ranked[0]?.score || 1;
  const candidates = ranked.slice(0, 3).map((c, index) => ({
    abbreviation: c.abbreviation,
    name: c.name,
    probability: randomPlaceholder ? 0 : Math.min(100, Math.max(18, Math.round((c.score / max) * (index === 0 ? 62 : 48)))),
    reason: randomPlaceholder ? 'Случайная справочная версия' : index === 0 ? 'Лучше совпал по четырём базовым шкалам' : 'Конкурирующая локальная гипотеза'
  }));
  const top = candidates[0] || { abbreviation: 'ИЛЭ', name: 'Дон Кихот', probability: 25 };
  const confidenceLevel = randomPlaceholder || wordCount < 45 ? 'insufficient' : wordCount < 160 ? 'low' : 'medium';
  const doubts = [
    ...(randomPlaceholder ? ['Показанный ТИМ выбран случайно: достаточного перевеса свидетельств нет.'] : []),
    'Это черновая компьютерная гипотеза по словарным маркерам, а не полноценное типирование.',
    ...(wordCount < 160 ? ['Для различения близких типов нужен более длинный рассказ и примеры реального поведения.'] : []),
    ...(evidence.length < 5 ? ['В тексте мало диагностичных формулировок.'] : [])
  ];

  return {
    source: 'local',
    tim: { abbreviation: top.abbreviation, name: top.name },
    summary: randomPlaceholder
      ? `Данных недостаточно для критического перевеса. Генератор случайности временно выбрал ${top.name} (${top.abbreviation}). Это не типирование: дождитесь ИИ или добавьте факты.`
      : `Локальный алгоритм увидел больше маркеров, совместимых с типом ${top.name} (${top.abbreviation}). Это рабочая гипотеза, которую стоит проверить по альтернативам и спорным шкалам.`,
    confidenceLevel,
    confidence: randomPlaceholder ? 0 : confidenceLevel === 'insufficient' ? 22 : confidenceLevel === 'low' ? 38 : 56,
    alternatives: candidates.slice(1),
    dichotomies,
    wordEvidence: evidence.sort((a, b) => b.weight - a.weight || a.word.localeCompare(b.word)).slice(0, 40),
    doubts,
    stages: [
      { id: 'observations', label: 'Наблюдения', status: 'done', model: 'Локальный словарь' },
      { id: 'hypotheses', label: 'Гипотезы', status: 'done', model: 'Локальный алгоритм' },
      { id: 'critic', label: 'Критик', status: 'warning', note: 'ИИ ещё не ответил' },
      { id: 'final', label: 'Итог', status: 'warning', note: 'Предварительный' }
    ],
    createdAt: new Date().toISOString(),
    providerUsed: 'Локальный алгоритм',
    randomFallback: randomPlaceholder
  };
}
