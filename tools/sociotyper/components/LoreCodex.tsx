import React, { useState, useMemo } from 'react';
import { LORE_TIPS } from '../data/loreTips';
import { LoreGraphic } from './LoreGraphic';

interface LoreCodexProps {
  selectedTimAbbr?: string;
}

const getRecommendedLoreIds = (timAbbr: string): { id: number; label: string; confidence: number }[] => {
  switch (timAbbr) {
    case 'ИЛИ':
      return [
        { id: 1, label: 'Выявлен профиль Динамика', confidence: 90 },
        { id: 5, label: 'Выявлена Решительность', confidence: 85 },
        { id: 11, label: 'Резонанс с Лучом Конкретного Знания', confidence: 92 },
        { id: 18, label: 'Позиция: 1Л Догматик', confidence: 88 },
        { id: 24, label: 'Позиция: 3Э Сухарь', confidence: 75 }
      ];
    case 'ЛИЭ':
      return [
        { id: 1, label: 'Выявлен профиль Динамика', confidence: 95 },
        { id: 9, label: 'Резонанс с Лучом Разумной Деятельности', confidence: 94 },
        { id: 15, label: 'Позиция: 2В Дворянин', confidence: 89 },
        { id: 19, label: 'Позиция: 2Л Риторик', confidence: 85 }
      ];
    case 'ЛИИ':
      return [
        { id: 1, label: 'Выявлен профиль Статика', confidence: 90 },
        { id: 11, label: 'Резонанс с Лучом Конкретного Знания', confidence: 95 },
        { id: 18, label: 'Позиция: 1Л Догматик', confidence: 92 },
        { id: 17, label: 'Позиция: 4В Крестьянин', confidence: 80 }
      ];
    case 'ЭИИ':
      return [
        { id: 1, label: 'Выявлен профиль Статика', confidence: 85 },
        { id: 8, label: 'Резонанс с Лучом Любви и Мудрости', confidence: 96 },
        { id: 15, label: 'Позиция: 2В Дворянин', confidence: 85 },
        { id: 25, label: 'Позиция: 4Э Зевака', confidence: 90 }
      ];
    case 'ИЛЭ':
      return [
        { id: 1, label: 'Выявлен профиль Статика', confidence: 88 },
        { id: 9, label: 'Резонанс с Лучом Разумной Деятельности', confidence: 85 },
        { id: 19, label: 'Позиция: 2Л Риторик', confidence: 90 }
      ];
    case 'СЭИ':
      return [
        { id: 1, label: 'Выявлен профиль Динамика', confidence: 90 },
        { id: 8, label: 'Резонанс с Лучом Любви и Мудрости', confidence: 88 },
        { id: 23, label: 'Позиция: 2Э Актер', confidence: 92 }
      ];
    case 'ЭСЭ':
      return [
        { id: 1, label: 'Выявлен профиль Динамика', confidence: 92 },
        { id: 10, label: 'Резонанс с Лучом Гармонии', confidence: 85 },
        { id: 22, label: 'Позиция: 1Э Романтик', confidence: 88 }
      ];
    case 'ЭИЭ':
      return [
        { id: 1, label: 'Выявлен профиль Динамика', confidence: 94 },
        { id: 10, label: 'Резонанс с Лучом Гармонии', confidence: 91 },
        { id: 22, label: 'Позиция: 1Э Романтик', confidence: 93 }
      ];
    case 'ЛСИ':
      return [
        { id: 1, label: 'Выявлен профиль Статика', confidence: 92 },
        { id: 12, label: 'Резонанс с Лучом Преданности', confidence: 87 },
        { id: 18, label: 'Позиция: 1Л Догматик', confidence: 90 }
      ];
    case 'СЛЭ':
      return [
        { id: 1, label: 'Выявлен профиль Статика', confidence: 90 },
        { id: 7, label: 'Резонанс с Лучом Воли', confidence: 94 },
        { id: 14, label: 'Позиция: 1В Царь', confidence: 95 }
      ];
    case 'ИЭИ':
      return [
        { id: 1, label: 'Выявлен профиль Динамика', confidence: 91 },
        { id: 8, label: 'Резонанс с Лучом Любви и Мудрости', confidence: 93 },
        { id: 23, label: 'Позиция: 2Э Актер', confidence: 88 }
      ];
    case 'СЭЭ':
      return [
        { id: 1, label: 'Выявлен профиль Статика', confidence: 89 },
        { id: 7, label: 'Резонанс с Лучом Воли', confidence: 92 },
        { id: 14, label: 'Позиция: 1В Царь', confidence: 91 }
      ];
    case 'ЭСИ':
      return [
        { id: 1, label: 'Выявлен профиль Статика', confidence: 91 },
        { id: 12, label: 'Резонанс с Лучом Преданности', confidence: 89 },
        { id: 24, label: 'Позиция: 3Э Сухарь', confidence: 82 }
      ];
    case 'ЛСЭ':
      return [
        { id: 1, label: 'Выявлен профиль Динамика', confidence: 93 },
        { id: 13, label: 'Резонанс с Лучом Церемониального Порядка', confidence: 91 },
        { id: 20, label: 'Позиция: 3Л Скептик', confidence: 80 }
      ];
    case 'ИЭЭ':
      return [
        { id: 1, label: 'Выявлен профиль Статика', confidence: 87 },
        { id: 8, label: 'Резонанс с Лучом Любви и Мудрости', confidence: 92 },
        { id: 23, label: 'Позиция: 2Э Актер', confidence: 89 }
      ];
    case 'СЛИ':
      return [
        { id: 1, label: 'Выявлен профиль Динамика', confidence: 90 },
        { id: 13, label: 'Резонанс с Лучом Церемониального Порядка', confidence: 87 },
        { id: 27, label: 'Позиция: 2Ф Труженик', confidence: 94 }
      ];
    default:
      return [
        { id: 3, label: 'Высокий Позитивизм', confidence: 85 },
        { id: 10, label: 'Резонанс с Лучом Гармонии', confidence: 80 },
        { id: 15, label: 'Позиция: 2В Дворянин', confidence: 75 }
      ];
  }
};

export const LoreCodex: React.FC<LoreCodexProps> = ({ selectedTimAbbr = 'ИЛИ' }) => {
  const [selectedTipId, setSelectedTipId] = useState(1);
  
  const recommendations = useMemo(() => {
    return getRecommendedLoreIds(selectedTimAbbr);
  }, [selectedTimAbbr]);

  const activeTip = LORE_TIPS.find(t => t.id === selectedTipId) || LORE_TIPS[0];

  const activeRecommendation = useMemo(() => {
    return recommendations.find(r => r.id === activeTip.id);
  }, [recommendations, activeTip]);

  return (
    <div className="bg-brand-dark text-white rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-brand-primary/20 animate-fade-in relative overflow-hidden">
      {/* Decorative runic border overlay */}
      <div className="absolute top-2 left-2 right-2 bottom-2 border border-brand-gold/10 pointer-events-none rounded-lg"></div>

      <div className="flex flex-col md:flex-row gap-6 relative z-10">
        
        {/* Left column: List of tips/secrets */}
        <div className="w-full md:w-2/5 border-r border-brand-gold/10 pr-0 md:pr-5 flex flex-col h-[400px]">
          <div className="pb-3 border-b border-brand-gold/15 mb-4 text-left">
            <h3 className="font-serif font-bold text-brand-gold text-lg tracking-wide">
              ✦ СВИТКИ МУДРОСТИ
            </h3>
            <p className="text-[10px] text-brand-cream-dark/60 uppercase tracking-wider mt-0.5">
              Нажмите для изучения разделов знаний
            </p>
          </div>
          
          <div className="flex-grow overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-brand-gold/20 scrollbar-track-transparent">
            {LORE_TIPS.map((tip) => {
              const isSelected = tip.id === selectedTipId;
              const rec = recommendations.find(r => r.id === tip.id);
              
              const borderStyle = isSelected
                ? 'bg-brand-gold/15 border-brand-gold text-brand-gold shadow-md font-bold'
                : rec
                ? 'bg-brand-gold/5 border-brand-gold/30 text-brand-cream shadow-sm hover:bg-brand-gold/10'
                : 'bg-black/20 border-brand-gold/5 text-brand-cream-dark/80 hover:bg-black/40 hover:border-brand-gold/30';

              return (
                <button
                  key={tip.id}
                  onClick={() => setSelectedTipId(tip.id)}
                  className={`w-full text-left p-2.5 rounded-lg transition-all duration-200 border cursor-pointer flex items-center justify-between gap-2.5 ${borderStyle}`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] uppercase tracking-widest font-bold opacity-65">
                        {tip.category}
                      </span>
                      {rec && (
                        <span className="bg-brand-gold/25 text-brand-gold text-[8px] font-mono px-1.5 py-0.5 rounded border border-brand-gold/40 animate-pulse font-bold">
                          ★ ВАС ({rec.confidence}%)
                        </span>
                      )}
                    </div>
                    <span className="text-xs md:text-sm tracking-wide mt-0.5">
                      {tip.title}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-brand-gold animate-pulse' : rec ? 'text-brand-gold/80' : 'opacity-40'}`}>
                    {isSelected ? '✦' : rec ? '★' : '→'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: Active Lore Card Display */}
        <div className="w-full md:w-3/5 flex flex-col justify-between bg-black/40 rounded-xl border border-brand-gold/15 p-5 sm:p-6 shadow-inner min-h-[400px] relative">
          
          {/* Decorative Skyrim Corners */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-brand-gold/40"></div>
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-brand-gold/40"></div>
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-brand-gold/40"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-brand-gold/40"></div>

          <div>
            <div className="flex items-center justify-between text-brand-gold/70 text-[10px] uppercase font-bold tracking-widest mb-4 border-b border-brand-gold/10 pb-2.5">
              <span>Карта знаний #{activeTip.id}</span>
              <span className="bg-brand-gold/10 px-2.5 py-0.5 rounded border border-brand-gold/25 text-brand-gold font-mono tracking-normal">
                {activeTip.category}
              </span>
            </div>

            {activeRecommendation && (
              <div className="mb-4 p-3 bg-brand-gold/10 border border-brand-gold/35 rounded-xl text-left animate-fade-in flex items-center gap-2.5">
                <span className="text-xl">✦</span>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-brand-gold font-bold">
                    Сонастройка с вашим профилем: {activeRecommendation.confidence}%
                  </p>
                  <p className="text-[11px] text-brand-cream-dark leading-relaxed font-semibold">
                    {activeRecommendation.label}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center sm:items-start sm:flex-row gap-6">
              <div className="flex-shrink-0 p-3.5 bg-brand-gold/5 rounded-full border border-brand-gold/20 shadow-lg relative">
                <div className="absolute inset-0 border border-dashed border-brand-gold/20 rounded-full animate-spin-slow"></div>
                <LoreGraphic type={activeTip.graphicType} className="w-20 h-20 text-brand-gold" />
              </div>

              <div className="text-left flex-grow">
                <h4 className="font-serif font-bold text-lg md:text-xl text-brand-gold mb-2.5 tracking-wide border-b border-brand-gold/5 pb-1">
                  {activeTip.title}
                </h4>
                <p className="text-xs md:text-sm text-brand-cream-dark leading-relaxed font-sans font-light">
                  {activeTip.text}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-brand-gold/10 flex items-center justify-between text-[10px] text-brand-cream-dark/40 font-mono">
            <span>КОДЕКС НЕЙРОИНДЫКОВА</span>
            <span className="text-brand-gold font-semibold tracking-wider font-serif uppercase">ИЗУЧЕНО ✦</span>
          </div>

        </div>

      </div>
    </div>
  );
};
