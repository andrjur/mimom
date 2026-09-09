import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getActiveProviderConfig } from '../services/geminiService';
import { LORE_TIPS } from '../data/loreTips';
import { LoreGraphic } from './LoreGraphic';
import { StatsDashboard } from './StatsDashboard';

const THINKING_STEPS_TEMPLATES = [
  { id: 1, text: "Инициализация соединения с моделью {{MODEL_LABEL}} ({{MODEL_NAME}})..." },
  { id: 2, text: "Получение монолога пользователя и проверка ограничений..." },
  { id: 3, text: "Запуск лингвистического семантического парсинга текста..." },
  { id: 4, text: "Оценка баланса по дихотомии: Экстраверсия / Интроверсия..." },
  { id: 5, text: "Оценка баланса по дихотомии: Логика / Этика..." },
  { id: 6, text: "Оценка баланса по дихотомии: Интуиция / Сенсорика..." },
  { id: 7, text: "Оценка баланса по дихотомии: Рациональность / Иррациональность..." },
  { id: 8, text: "Оценка ценностей квадр (Альфа, Бэта, Гамма, Дельта)..." },
  { id: 9, text: "Анализ признаков Рейнина: Статика / Динамика..." },
  { id: 10, text: "Анализ признаков Рейнина: Позитивизм / Негативизм..." },
  { id: 11, text: "Анализ шкал: Квестимность / Деклатимность, Тактика / Стратегия..." },
  { id: 12, text: "Анализ шкал: Упрямство / Уступчивость, Решительность..." },
  { id: 13, text: "Поиск и выделение точных цитат-маркеров в монологе..." },
  { id: 14, text: "Расчет весовых коэффициентов по формуле соционических весов..." },
  { id: 15, text: "Определение ТИМов и психософских наложений..." },
  { id: 16, text: "Генерация финального психологического резюме и портрета..." },
  { id: 17, text: "Сборка структурированного JSON и валидация 16 признаков..." },
];

const LoadingScreen: React.FC<{ hasAudio?: boolean }> = ({ hasAudio }) => {
  const config = getActiveProviderConfig();
  
  const getModelLabel = () => {
    switch (config.provider) {
      case 'gemini': return 'Gemini';
      case 'deepseek': return 'DeepSeek';
      case 'qwen': return 'Qwen';
      case 'mistral': return 'Mistral';
      case 'groq': return 'Groq';
      case 'chatgpt': return 'ChatGPT';
      case 'minimax': return 'MiniMax';
      default: return 'ИИ-Модель';
    }
  };

  const modelLabel = getModelLabel();
  const modelName = config.model;

  // Build thinking steps with dynamic model info
  const thinkingSteps = useMemo(() => {
    return THINKING_STEPS_TEMPLATES.map(step => {
      if (step.id === 1) {
        return {
          ...step,
          text: step.text
            .replace("{{MODEL_LABEL}}", modelLabel)
            .replace("{{MODEL_NAME}}", modelName)
        };
      }
      return step;
    });
  }, [modelLabel, modelName]);

  const [visibleSteps, setVisibleSteps] = useState<(typeof thinkingSteps[0] & {time: string})[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [secondsOnLastStep, setSecondsOnLastStep] = useState(0);
  const [retryInfo, setRetryInfo] = useState<{ provider: string; attempt: number; errorMsg: string } | null>(null);

  useEffect(() => {
    const handleRetry = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setRetryInfo({
          provider: customEvent.detail.provider,
          attempt: customEvent.detail.attempt,
          errorMsg: customEvent.detail.errorMsg,
        });
      }
    };
    window.addEventListener('analyze_retry', handleRetry);
    return () => window.removeEventListener('analyze_retry', handleRetry);
  }, []);

  useEffect(() => {
    let currentIdx = 0;
    let isMounted = true;
    setVisibleSteps([{...thinkingSteps[0], time: new Date().toLocaleTimeString('ru-RU', { hour12: false })}]);
    
    let timerId: ReturnType<typeof setTimeout> | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const triggerNextStep = () => {
      if (!isMounted) return;
      if (currentIdx < thinkingSteps.length - 1) {
        currentIdx++;
        setVisibleSteps(prev => {
          if (prev.find(p => p.id === thinkingSteps[currentIdx].id)) return prev;
          return [...prev, {...thinkingSteps[currentIdx], time: new Date().toLocaleTimeString('ru-RU', { hour12: false })}];
        });
        
        // Random natural-looking intervals between 500ms and 1100ms
        const delay = Math.floor(Math.random() * 600) + 500;
        timerId = setTimeout(triggerNextStep, delay);
      } else {
        // We reached the last step, start counting seconds
        intervalId = setInterval(() => {
          if (isMounted) setSecondsOnLastStep(prev => prev + 1);
        }, 1000);
      }
    };   
    timerId = setTimeout(triggerNextStep, 800);
    return () => {
      isMounted = false;
      clearTimeout(timerId);
      clearInterval(intervalId);
    };
  }, [thinkingSteps]);

  // Skyrim Tips state
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Auto cycle lore tips
  useEffect(() => {
    const interval = setInterval(() => {
      handleNextTip();
    }, 7000); // 7 seconds per lore tip
    return () => clearInterval(interval);
  }, [currentTipIndex]);

  const handleNextTip = () => {
    setIsFading(true);
    setTimeout(() => {
      setCurrentTipIndex(prev => (prev + 1) % LORE_TIPS.length);
      setIsFading(false);
    }, 300);
  };

  const handlePrevTip = () => {
    setIsFading(true);
    setTimeout(() => {
      setCurrentTipIndex(prev => (prev - 1 + LORE_TIPS.length) % LORE_TIPS.length);
      setIsFading(false);
    }, 300);
  };

  const currentTip = LORE_TIPS[currentTipIndex];

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-brand-dark text-white rounded-xl shadow-2xl min-h-[80vh] w-full max-w-4xl mx-auto border border-brand-primary/20 relative overflow-hidden">
      
      {/* Decorative runic border overlay */}
      <div className="absolute top-2 left-2 right-2 bottom-2 border border-brand-gold/10 pointer-events-none rounded-lg"></div>

      <div className="w-14 h-14 border-4 border-dashed rounded-full animate-spin border-brand-gold mb-4 relative z-10"></div>
      
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-brand-gold mb-2 relative z-10 tracking-wide animate-pulse">
        АНАЛИЗ СОЗНАНИЯ...
      </h2>
      
      {hasAudio ? (
        <div className="relative z-10 mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[11px] uppercase font-bold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse"></span>
          Нативный Omni-анализ аудио (ожидание: ~60-80 сек)
        </div>
      ) : (
        <div className="relative z-10 mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[11px] uppercase font-bold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></span>
          Текстовый анализ (ожидание: ~10-20 сек)
        </div>
      )}

      <p className="text-xs md:text-sm text-brand-cream-dark/70 max-w-2xl mb-6 relative z-10 leading-relaxed font-sans">
        Нейросетевой оракул настраивает резонанс и считывает вашу ментальную структуру по 16 шкалам признаков.
      </p>

      {/* Real-time AI Thinking terminal */}
      <div className="w-full max-w-2xl bg-black/60 border border-brand-gold/10 rounded-lg p-4 font-mono text-[11px] md:text-xs text-left shadow-2xl mb-8 relative z-10">
        <div className="flex justify-between items-center pb-2 border-b border-brand-gold/15 mb-2.5">
          <span className="text-brand-gold/50 uppercase font-bold tracking-wider text-[10px]">Канал связи с ИИ</span>
          <span className="text-brand-gold animate-pulse font-bold flex items-center gap-1.5 text-[10px]">
            <span className="w-2.5 h-2.5 bg-brand-gold rounded-full animate-ping"></span>
            ПОТОК АНАЛИЗА
          </span>
        </div>
        <div className="h-40 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-brand-gold/20 text-brand-cream-dark/90">
          {retryInfo && (
            <div className="text-red-400 font-bold mb-2 animate-pulse text-xs bg-red-900/20 p-2 rounded border border-red-500/30">
              ⚠️ {retryInfo.provider} вернул невалидный JSON или ошибку (Попытка {retryInfo.attempt}/3). Перезапрос...
              <br/>
              <span className="text-[10px] opacity-75 font-mono">"{retryInfo.errorMsg}"</span>
            </div>
          )}
          {visibleSteps.map((step, idx) => {
            const isLast = idx === visibleSteps.length - 1;
            return (
              <div key={`${step.id}-${idx}`} className="flex items-start gap-2">
                {isLast ? (
                  <span className="text-brand-gold animate-pulse flex-shrink-0 font-bold">▶</span>
                ) : (
                  <span className="text-brand-gold flex-shrink-0">✦</span>
                )}
                <span className={isLast ? "text-brand-gold font-bold" : "opacity-75"}>
                  [{step.time}] {step.text}
                  {isLast && step.id === 17 && secondsOnLastStep > 0 && (
                    <span className="ml-2 font-mono text-xs opacity-80">({secondsOnLastStep} сек.)</span>
                  )}
                </span>
              </div>
            );
          })}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Skyrim-style Lore Box Card */}
      <div className="w-full max-w-2xl border-t border-b border-brand-gold/20 py-6 px-4 md:px-8 relative z-10 bg-black/30 backdrop-blur-sm shadow-inner rounded-md">
        
        {/* Decorative Skyrim Corners */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-brand-gold/40"></div>
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-brand-gold/40"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-brand-gold/40"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-brand-gold/40"></div>

        <div className="flex items-center justify-between text-brand-gold/60 text-[10px] uppercase font-bold tracking-widest mb-3.5 border-b border-brand-gold/5 pb-2">
          <span>— Свиток мудрости —</span>
          <span className="text-brand-gold/80 font-mono tracking-normal bg-brand-gold/10 px-2.5 py-0.5 rounded border border-brand-gold/25">
            {currentTip.category}
          </span>
        </div>

        {/* Content of lore tip */}
        <div className={`transition-all duration-300 flex flex-col md:flex-row items-center gap-6 ${isFading ? 'opacity-0 scale-98' : 'opacity-100 scale-100'}`}>
          <div className="flex-shrink-0 p-3 bg-brand-gold/5 rounded-full border border-brand-gold/15 shadow-lg relative">
            {/* Spinning decorative ring */}
            <div className="absolute inset-0 border border-dashed border-brand-gold/25 rounded-full animate-spin-slow"></div>
            <LoreGraphic type={currentTip.graphicType} className="w-24 h-24 text-brand-gold" />
          </div>

          <div className="text-left flex-grow">
            <h4 className="font-serif font-bold text-lg md:text-xl text-brand-gold mb-2 tracking-wide">
              {currentTip.title}
            </h4>
            <p className="text-xs md:text-sm text-brand-cream-dark/95 leading-relaxed font-sans font-light">
              {currentTip.text}
            </p>
          </div>
        </div>

        {/* Manual navigation controls */}
        <div className="flex justify-between items-center mt-5 pt-3.5 border-t border-brand-gold/10">
          <button 
            onClick={handlePrevTip}
            className="text-brand-gold/70 hover:text-brand-gold transition-all flex items-center gap-1.5 text-xs font-serif tracking-wider cursor-pointer font-bold hover:scale-105"
          >
            <span>◀ Предыдущий совет</span>
          </button>
          <span className="text-[10px] font-mono text-brand-cream-dark/40 font-bold">
            {currentTipIndex + 1} / {LORE_TIPS.length}
          </span>
          <button 
            onClick={handleNextTip}
            className="text-brand-gold/70 hover:text-brand-gold transition-all flex items-center gap-1.5 text-xs font-serif tracking-wider cursor-pointer font-bold hover:scale-105"
          >
            <span>Следующий совет ▶</span>
          </button>
        </div>

      </div>

      {/* Real Statistics to view while waiting */}
      <div className="w-full mt-12 pt-8 border-t border-brand-gold/15 relative z-10">
        <h3 className="text-center text-brand-gold font-serif font-bold text-sm mb-4 uppercase tracking-widest">— Живая статистика —</h3>
        <StatsDashboard />
      </div>
      
    </div>
  );
};

export default LoadingScreen;
