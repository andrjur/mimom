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
    const result = aScore === bScore ? 'Недостаточно данных' : (aScore > bScore ? d.a : d.b);
    const margin = total ? Math.abs(aScore - bScore) / total : 0;
    const confidence = total && aScore !== bScore ? Math.round(50 + margin * 28) : 0;
    dichotomies.push({
      name: d.name,
      result,
      confidence,
      evidence: total ? `${aScore}:${bScore} по словам-маркерам` : 'Явных слов-маркеров не найдено'
    });
  }

  return {
    source: 'local', tim: { abbreviation: '', name: 'Локальные наблюдения' },
    summary: 'ИИ ещё не завершил анализ. Словарь нашёл отдельные слова, но они не определяют тип. Можно изучить наблюдения и дополнить рассказ.',
    confidenceLevel: 'insufficient', confidence: 0, alternatives: [], dichotomies,
    wordEvidence: evidence.sort((a, b) => b.weight - a.weight || a.word.localeCompare(b.word)).slice(0, 40),
    doubts: ['Слова без контекста не определяют тип.', 'Дождитесь проверки цитат или добавьте примеры решений и поступков.'],
    nextQuestions: ['Вспомните недавнее трудное решение. Что произошло, что вы сделали и почему?'],
    stages: [{ id: 'observations', label: 'Слова в тексте', status: 'done', model: 'Локальный словарь' }, { id: 'final', label: 'Проверка ИИ', status: 'waiting' }],
    createdAt: new Date().toISOString(), providerUsed: 'Локальный словарь', randomFallback: false
  };
}
