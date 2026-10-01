import { createPortal } from 'react-dom';
import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Brain, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ScienceFact {
  id: string;
  topic: string;
  title: string;
  short: string;
  deepDive: string[];
  takeaway: string;
  icon: string;
}

export const SCIENCE_FACTS = [
 {id:'f1',topic:'Как учиться',title:'Почему мы забываем?',short:'Карточка помогает заметить разницу между узнаванием и самостоятельным ответом.',deepDive:['Когда ответ перед глазами, легко принять знакомую формулировку за умение воспроизвести её. Закрытый ответ позволяет проверить себя.','Сначала попробуйте ответить, затем сравните с решением. Если ошиблись, разберите причину и повторите карточку.'],takeaway:'Кнопка «Не знаю» возвращает карточку в очередь этой сессии.',icon:'🧠'},
 {id:'f2',topic:'Физика',title:'Свет меняет направление',short:'Преломление связано с изменением скорости распространения света в среде.',deepDive:['Показатель преломления n = c/v. При переходе из воздуха в стекло скорость света уменьшается.','Закон Снеллиуса: n₁ sin α = n₂ sin β. Углы отсчитывают от нормали к границе, а не от самой поверхности.'],takeaway:'Сначала нарисуйте нормаль, затем отмечайте углы.',icon:'🔎'},
 {id:'f3',topic:'Логика',title:'Правдоподобно не значит доказано',short:'Из «если A, то B» и истинности B нельзя автоматически вывести A.',deepDive:['Если идёт дождь, дорога мокрая. Но мокрая дорога не доказывает дождь: её могли полить.','Чтобы опровергнуть общий вывод, достаточно одного корректного контрпримера.'],takeaway:'Ищите альтернативное объяснение наблюдаемого результата.',icon:'💡'},
 {id:'f4',topic:'Математика',title:'Проценты не всегда отменяются',short:'Повышение на 20% и снижение на 20% не возвращают исходное значение.',deepDive:['100 · 1,2 = 120. Затем 120 · 0,8 = 96. Проценты во второй операции считаются от новой базы.'],takeaway:'Последовательные процентные изменения удобно перемножать как коэффициенты.',icon:'📐'}
];

interface FactModalProps {
  onGenerate?:()=>void; busy?:boolean;
  facts?:ScienceFact[];
  isOpen: boolean;
  onClose: () => void;
}

export function FactModal({ isOpen, onClose, onGenerate,busy, facts=SCIENCE_FACTS }: FactModalProps) {
  const [factIndex, setFactIndex] = useState(0);
  useEffect(()=>setFactIndex(0),[facts[0]?.topic]);
  const fact = facts[factIndex%facts.length];

  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (isOpen) dialog.current?.showModal(); else dialog.current?.close(); }, [isOpen]);

  const nextFact = () => {
    setFactIndex((prev) => (prev + 1) % facts.length);
  };

  return createPortal(
    <dialog ref={dialog} onCancel={onClose} onClick={e => { if (e.target === dialog.current) onClose(); }} aria-label="Забавный факт" className="m-auto p-0 bg-transparent max-w-none max-h-none w-full h-full backdrop:bg-black/40">
    <AnimatePresence>
      <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 ">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-zinc-200 shadow-2xl relative max-h-[90dvh] overflow-y-auto"
        >
          {onGenerate&&<button className="text-xs underline text-emerald-700 mb-4" disabled={busy} onClick={onGenerate}>{busy?'Готовлю факты…':'Создать 7 новых фактов с ИИ'}</button>}
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{fact.icon}</span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {fact.topic}
                </span>
                <span className="text-xs text-zinc-400 ml-2">
                  Факт {factIndex + 1} из {facts.length}
                </span>
              </div>
            </div>
            <button
              aria-label="Закрыть факт" onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-xl font-bold text-zinc-900 mb-2 leading-tight">
            {fact.title}
          </h3>

          <p className="text-sm font-medium text-emerald-800 bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 mb-4">
            {fact.short}
          </p>

          <div className="space-y-2.5 text-xs text-zinc-600 leading-relaxed max-h-56 overflow-y-auto pr-1 mb-5">
            {fact.deepDive.map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>

          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 text-xs text-zinc-800 font-medium mb-6">
            💡 {fact.takeaway}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={nextFact}
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-3 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition flex items-center gap-1.5"
            >
              <span>Следующий факт</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Понятно!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
    </dialog>, document.body
  );
}
