import React from 'react';
import { Sparkles, Flame, Trophy, Award, ArrowRight, RotateCcw, CheckCircle2, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface DuolingoCelebrationProps {
  onRestart: () => void;
  onChooseNext: () => void;
  deckComplete: boolean;
  remainingCount: number;
  onOpenTracker: () => void;
  masteredCount: number;
  totalXp: number;
  totalGems: number;
  selectedTopics: string[];
}

export function DuolingoCelebration({
  totalXp, totalGems, deckComplete, remainingCount, onChooseNext,
  onRestart,
  onOpenTracker,
  masteredCount,
  selectedTopics
}: DuolingoCelebrationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-gradient-to-b from-white via-[#FAFDFB] to-[#F0FDF4] rounded-3xl p-8 md:p-12 border-2 border-emerald-300 shadow-[0_20px_50px_-15px_rgba(16,185,129,0.15)] text-center relative overflow-hidden my-4"
    >
      {/* Decorative confetti burst particles */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-200/30 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-200/30 rounded-full blur-2xl pointer-events-none" />
      
      {/* Top mascot badge */}
      <div className="relative inline-block mb-4">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center text-5xl sm:text-6xl shadow-lg shadow-emerald-500/25 mx-auto ring-8 ring-emerald-50 animate-bounce">
          🏆
        </div>
        <span className="absolute -top-2 -right-2 bg-amber-400 text-amber-950 font-black text-xs px-2.5 py-1 rounded-full shadow-md border-2 border-white flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> +50 XP
        </span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight mb-2">
        {deckComplete?'Колода пройдена!':'Сессия завершена!'}
      </h2>
      <p className="text-zinc-600 text-sm sm:text-base max-w-md mx-auto mb-8">
        {deckComplete?'Все карточки рабочей колоды отмечены как известные. Можно выбрать следующую или повторить эту.':`Хорошая работа! В рабочей колоде осталось освоить ${remainingCount} карточек. Продолжим?`} Повторы этой сессии тоже завершены.
      </p>

      {/* Duolingo-style Stats Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto mb-8">
        {/* XP */}
        <div className="bg-amber-50/90 border-2 border-amber-200/80 rounded-2xl p-3.5 flex flex-col items-center">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> Опыт
          </span>
          <span className="text-2xl font-black text-amber-900">+50 XP</span>
          <span className="text-[10px] text-amber-600/80 font-medium">Бонус за раунд</span>
        </div>

        {/* Gems */}
        <div className="bg-cyan-50/90 border-2 border-cyan-200/80 rounded-2xl p-3.5 flex flex-col items-center">
          <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider mb-1">
            💎 Кристаллы
          </span>
          <span className="text-2xl font-black text-cyan-900">+15</span>
          <span className="text-[10px] text-cyan-600/80 font-medium">Всего: {totalGems}</span>
        </div>

        {/* Streak */}
        <div className="bg-orange-50/90 border-2 border-orange-200/80 rounded-2xl p-3.5 flex flex-col items-center">
          <span className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" /> Накоплено
          </span>
          <span className="text-2xl font-black text-orange-900">{totalXp} XP</span>
          <span className="text-[10px] text-orange-600/80 font-medium">Всего опыта</span>
        </div>

        {/* Accuracy */}
        <div className="bg-emerald-50/90 border-2 border-emerald-200/80 rounded-2xl p-3.5 flex flex-col items-center">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Усвоено
          </span>
          <span className="text-2xl font-black text-emerald-900">{masteredCount}</span>
          <span className="text-[10px] text-emerald-600/80 font-medium">Отметили «Знаю»</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={deckComplete?onChooseNext:onRestart}
          className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" /> {deckComplete?'Выбрать следующую колоду':'Продолжить колоду'}
        </button>

        <button onClick={deckComplete?onRestart:onChooseNext} className="px-6 py-3.5 border border-emerald-200 rounded-2xl text-sm">{deckComplete?'Повторить эту колоду':'Выбрать другую колоду'}</button>
        <button
          onClick={onOpenTracker}
          className="px-6 py-3.5 bg-white hover:bg-zinc-50 border-2 border-zinc-200 active:scale-95 text-zinc-800 font-bold text-sm rounded-2xl shadow-xs transition flex items-center gap-2"
        >
          <span>На сегодня хватит</span>
          <ArrowRight className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
    </motion.div>
  );
}
