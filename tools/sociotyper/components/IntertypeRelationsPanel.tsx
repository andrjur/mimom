import React, { useState } from 'react';
import { INTERTYPE_RELATIONS_DATA, RELATION_METADATA } from './relations';

interface IntertypeRelationsPanelProps {
  currentTimAbbr: string;
  currentTimName: string;
}

export const IntertypeRelationsPanel: React.FC<IntertypeRelationsPanelProps> = ({ currentTimAbbr, currentTimName }) => {
  const [filterRating, setFilterRating] = useState<'all' | 'excellent' | 'good' | 'neutral' | 'difficult'>('all');
  
  const relations = {
    ...INTERTYPE_RELATIONS_DATA[currentTimAbbr],
    identical: { abbr: currentTimAbbr, name: currentTimName }
  };
  
  const relationList = Object.entries(relations).map(([relationKey, partner]) => {
    const meta = RELATION_METADATA[relationKey] || {
      name: relationKey,
      description: "Интертипные отношения в соционике.",
      rating: 'neutral'
    };
    return {
      key: relationKey,
      partnerAbbr: partner.abbr,
      partnerName: partner.name,
      relationName: meta.name,
      description: meta.description,
      rating: meta.rating
    };
  });

  const filteredRelations = relationList.filter(item => {
    if (filterRating === 'all') return true;
    return item.rating === filterRating;
  });

  const getRatingBadge = (rating: 'excellent' | 'good' | 'neutral' | 'difficult') => {
    switch (rating) {
      case 'excellent':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            ★ Дуальные / Идеальные
          </span>
        );
      case 'good':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            ▲ Благоприятные
          </span>
        );
      case 'neutral':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 border border-slate-500/20">
            ● Нейтральные
          </span>
        );
      case 'difficult':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            ■ Сложные / Конфликтные
          </span>
        );
    }
  };

  return (
    <div className="bg-brand-surface p-6 rounded-2xl border border-brand-primary/15 shadow-xl animate-fade-in w-full my-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-brand-primary/10">
        <div>
          <h3 className="text-xl font-bold font-serif text-brand-primary flex items-center gap-2">
            <span>Таблица интертипных отношений</span>
          </h3>
          <p className="text-xs text-brand-text-secondary mt-1">
            Справочник совместимости и интертипных связей для социотипа <strong className="text-brand-primary">{currentTimName} ({currentTimAbbr})</strong>
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-1.5 bg-brand-bg p-1 rounded-xl border border-brand-primary/10">
          <button
            onClick={() => setFilterRating('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${filterRating === 'all' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text-secondary hover:text-brand-primary'}`}
          >
            Все ({relationList.length})
          </button>
          <button
            onClick={() => setFilterRating('excellent')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${filterRating === 'excellent' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text-secondary hover:text-brand-primary'}`}
          >
            Идеальные
          </button>
          <button
            onClick={() => setFilterRating('good')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${filterRating === 'good' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text-secondary hover:text-brand-primary'}`}
          >
            Хорошие
          </button>
          <button
            onClick={() => setFilterRating('neutral')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${filterRating === 'neutral' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text-secondary hover:text-brand-primary'}`}
          >
            Нейтральные
          </button>
          <button
            onClick={() => setFilterRating('difficult')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${filterRating === 'difficult' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text-secondary hover:text-brand-primary'}`}
          >
            Сложные
          </button>
        </div>
      </div>

      {/* Grid List of Relations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRelations.map((item) => (
          <div
            key={item.key}
            className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-md bg-brand-bg ${
              item.rating === 'excellent'
                ? 'border-emerald-500/20 hover:border-emerald-500/40'
                : item.rating === 'good'
                ? 'border-amber-500/20 hover:border-amber-500/40'
                : item.rating === 'difficult'
                ? 'border-rose-500/20 hover:border-rose-500/40'
                : 'border-brand-primary/10 hover:border-brand-primary/25'
            }`}
          >
            <div className="flex justify-between items-start gap-2 mb-2">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-brand-text-secondary">
                  {item.relationName}
                </span>
                <span className="text-base font-bold text-brand-primary font-serif">
                  {item.partnerName} <span className="text-brand-secondary font-sans text-sm font-semibold">({item.partnerAbbr})</span>
                </span>
              </div>
              {getRatingBadge(item.rating)}
            </div>
            <p className="text-xs text-brand-text-secondary leading-relaxed mt-2 italic">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
