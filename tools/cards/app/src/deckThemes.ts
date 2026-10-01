export interface DeckTheme {
  name: string;
  badgeBg: string;
  badgeText: string;
  cardBg: string;
  cardBorder: string;
  accent: string;
  patternType: 'grid' | 'dots' | 'diagonal' | 'circuit' | 'waves' | 'cross' | 'rings' | 'sparkles';
  icon: string;
  description: string;
}

export const DECK_THEMES: Record<string, DeckTheme> = {
  'Логика': {
    name: 'Логика',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'text-emerald-800',
    cardBg: 'bg-gradient-to-br from-[#EEF7F2] via-[#F8FAF9] to-[#E5F2EB]',
    cardBorder: 'border-emerald-300/80',
    accent: '#059669',
    patternType: 'grid',
    icon: '🧠',
    description: 'Парадоксы, силлогизмы, законы мышления'
  },
  'Математика (5-9)': {
    name: 'Математика (5-9)',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: 'text-indigo-800',
    cardBg: 'bg-gradient-to-br from-[#EEF2FF] via-[#FAF5FF] to-[#E0E7FF]',
    cardBorder: 'border-indigo-300/80',
    accent: '#4F46E5',
    patternType: 'diagonal',
    icon: '📐',
    description: 'Формулы, теоремы, свойства фигур'
  },
  'Искусственный интеллект': {
    name: 'Искусственный интеллект',
    badgeBg: 'bg-cyan-100 text-cyan-900 border-cyan-200',
    badgeText: 'text-cyan-900',
    cardBg: 'bg-gradient-to-br from-[#ECFEFF] via-[#F0FDFA] to-[#CFFAFE]',
    cardBorder: 'border-cyan-300/80',
    accent: '#0891B2',
    patternType: 'circuit',
    icon: '🤖',
    description: 'Промпты, эмбеддинги, архитектуры сетей'
  },
  'География': {
    name: 'География',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
    badgeText: 'text-amber-900',
    cardBg: 'bg-gradient-to-br from-[#FEF3C7] via-[#FFFBEB] to-[#FDE68A]/60',
    cardBorder: 'border-amber-300/80',
    accent: '#D97706',
    patternType: 'waves',
    icon: '🌍',
    description: 'Столицы, материки, природные зоны'
  },
  'Биология': {
    name: 'Биология',
    badgeBg: 'bg-teal-100 text-teal-900 border-teal-200',
    badgeText: 'text-teal-900',
    cardBg: 'bg-gradient-to-br from-[#CCFBF1] via-[#F0FDFA] to-[#99F6E4]/50',
    cardBorder: 'border-teal-300/80',
    accent: '#0D9488',
    patternType: 'dots',
    icon: '🌿',
    description: 'Клетки, эволюция, экосистемы'
  },
  'История': {
    name: 'История',
    badgeBg: 'bg-stone-200 text-stone-800 border-stone-300',
    badgeText: 'text-stone-800',
    cardBg: 'bg-gradient-to-br from-[#F5F5F4] via-[#FAF8F5] to-[#E7E5E4]',
    cardBorder: 'border-stone-300',
    accent: '#78716C',
    patternType: 'cross',
    icon: '📜',
    description: 'Даты, события, великие личности'
  },
  'Астрономия': {
    name: 'Астрономия',
    badgeBg: 'bg-violet-100 text-violet-900 border-violet-200',
    badgeText: 'text-violet-900',
    cardBg: 'bg-gradient-to-br from-[#EDE9FE] via-[#F5F3FF] to-[#DDD6FE]',
    cardBorder: 'border-violet-300/80',
    accent: '#7C3AED',
    patternType: 'rings',
    icon: '🪐',
    description: 'Планеты, созвездия, галактики'
  },
  'Искусство': {
    name: 'Искусство',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-200',
    badgeText: 'text-rose-900',
    cardBg: 'bg-gradient-to-br from-[#FFE4E6] via-[#FFF1F2] to-[#FECDD3]',
    cardBorder: 'border-rose-300/80',
    accent: '#E11D48',
    patternType: 'sparkles',
    icon: '🎨',
    description: 'Стили, картины, эпохи шедевров'
  }
};

export const DEFAULT_DECK_THEME: DeckTheme = {
  name: 'Общая',
  badgeBg: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  badgeText: 'text-zinc-800',
  cardBg: 'bg-gradient-to-br from-[#F8FAFC] via-[#FFFFFF] to-[#F1F5F9]',
  cardBorder: 'border-zinc-300',
  accent: '#52525B',
  patternType: 'grid',
  icon: '📚',
  description: 'Учебные карточки'
};

// Stable colour per deck, including custom topics and split decks.
export function getDeckTheme(topic: string): DeckTheme {
  const base = DECK_THEMES[topic] || Object.entries(DECK_THEMES).find(([name]) => topic.startsWith(name))?.[1] || DEFAULT_DECK_THEME;
  let hash = 0;
  for (const letter of topic) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return {...base, name: topic, accent: `hsl(${hue} 65% 36%)`};
}
