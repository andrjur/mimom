import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { MicrophoneIcon, StopIcon, PaperAirplaneIcon } from './Icons';
import { transcribeAudio } from '../services/geminiService';

interface MonologueScreenProps {
  useNativeAudio?: boolean;
  onComplete: (monologue: string, audioData?: { base64: string; mimeType: string; voicePrompt?: string; name: string }[]) => void;
  initialMonologue: string;
  error?: string | null;
  onOpenSettings?: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
}

interface TopicSection {
  title: string;
  subtitle: string;
  questions: string[];
}

const TOPIC_SECTIONS: TopicSection[] = [
  {
    title: "Раздел 1: Ваш путь и эволюция целей",
    subtitle: "Запишите эссе на тему того, как менялись ваши взгляды с возрастом, ИЛИ ответьте на вопросы:",
    questions: [
      "Что было вашей главной целью и мерилом успеха в 20–25 лет?",
      "Как изменились ваши приоритеты к 30–35 годам (или сейчас)?",
      "Что является вашей главной движущей силой сегодня? Зачем вы просыпаетесь по утрам?",
      "Вспомните свою самую болезненную неудачу. Как вы с ней справились?",
      "Какой самый важный жизненный урок вы усвоили на данный момент?"
    ]
  },
  {
    title: "Раздел 2: Идеальная среда и лидерство",
    subtitle: "Опишите идеальную для вас команду и рабочую среду ИЛИ ответьте на вопросы:",
    questions: [
      "Опишите коллектив, в котором вы бы максимально раскрыли свой потенциал. Какая там атмосфера?",
      "Как должен вести себя идеальный начальник/лидер?",
      "Какую роль в компании людей обычно играете вы сами?",
      "Если нужно выбрать что-то одно, что для вас важнее: абсолютная безопасность, сила и победа над конкурентами, строгий порядок, максимальная эффективность, теплая атмосфера или свобода творчества? Почему?",
      "Что вас больше всего бесит в поведении других людей?"
    ]
  },
  {
    title: "Раздел 3: Порядок, правила и справедливость",
    subtitle: "Порассуждайте о том, для чего нужны законы, ИЛИ ответьте на вопросы:",
    questions: [
      "Для чего, по-вашему, существуют правила в обществе?",
      "Являются ли правила абсолютом, или это инструмент, который можно нарушать? Если можно, то когда?",
      "Что такое \"справедливость\" лично в вашем понимании?",
      "Как вы реагируете, когда вам говорят: \"Таковы правила, делай так и никак иначе\"?",
      "Вам комфортнее работать по четкой, пошаговой инструкции или когда вам дают полную свободу действий, но требуют результат?"
    ]
  },
  {
    title: "Раздел 4: Конфликт и сотрудничество",
    subtitle: "Опишите вашу стратегию в конфликтах ИЛИ ответьте на вопросы:",
    questions: [
      "Как вы обычно ведете себя при серьезном конфликте интересов?",
      "Какова ваша главная цель в споре: доказать истину, сохранить отношения, найти компромисс или победить любой ценой?",
      "Как вы справляетесь с негативными эмоциями (гнев, обида)? Легко ли вам их выражать?",
      "Насколько для вас важно, чтобы ваше мнение было принято окружающими?",
      "Вы легко прощаете людей или долго помните обиды?"
    ]
  },
  {
    title: "Раздел 5: Общая картина и смысл",
    subtitle: "Порассуждайте о смысле жизни и будущем ИЛИ ответьте на вопросы:",
    questions: [
      "Что для вас значит слово \"успех\"? Как вы понимаете, что человек успешен?",
      "Какова, по-вашему, главная цель человеческого существования?",
      "Каким вы видите будущее человечества лет через 50?",
      "Что вас больше всего вдохновляет в этом мире?",
      "Если бы у вас были безграничные ресурсы, какую одну глобальную проблему вы бы решили?"
    ]
  }
];

const MonologueScreen: React.FC<MonologueScreenProps> = ({ onComplete, initialMonologue, error: initialError, useNativeAudio, onOpenSettings }) => {
  const [monologue, setMonologue] = useState(initialMonologue || '');
  useEffect(() => { setMonologue(initialMonologue || ''); }, [initialMonologue]);
  const [voicePrompt, setVoicePrompt] = useState('Типируем только этот голос (игнорируем другие)');
  const { status, startListening, stopListening, hasRecognitionSupport } = useSpeechRecognition(monologue, setMonologue);
  const voiceRec = useSpeechRecognition(voicePrompt, setVoicePrompt);
  const isListening = status === 'listening' || status === 'reconnecting';
  const isVoicePromptListening = voiceRec.status === 'listening' || voiceRec.status === 'reconnecting';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentError, setCurrentError] = useState(initialError);
  useEffect(() => { setCurrentError(initialError); }, [initialError]);

  const [showHelpBanner, setShowHelpBanner] = useState<boolean>(() => {
    return localStorage.getItem('DISMISSED_INLINE_HELP') !== 'true';
  });

  const toggleHelpBanner = () => {
    setShowHelpBanner(prev => {
      const next = !prev;
      localStorage.setItem('DISMISSED_INLINE_HELP', next ? 'false' : 'true');
      return next;
    });
  };

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [monologue]);

  
  
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const dragCounter = useRef(0);

  const handleSelectedFiles = useCallback((files: File[]) => {
      if (!files || files.length === 0) return;
      setCurrentError(null);

      const validFiles = files.filter(f => f.type.startsWith('audio/') || f.type.startsWith('video/') || f.name.endsWith('.mp3') || f.name.endsWith('.ogg') || f.name.endsWith('.wav'));
      
      if (validFiles.length === 0) {
          setCurrentError("Неверный тип файла. Пожалуйста, загрузите аудио или видео файлы.");
          return;
      }

      // Check file size limits
      const oversizedFiles = validFiles.filter(f => f.size > 30 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
          setCurrentError(
              `Файл(ы) слишком большие: ${oversizedFiles.map(f => `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} МБ)`).join(', ')}. ` +
              `Лимит на прямую загрузку составляет 30 МБ. Пожалуйста, сожмите аудио или запишите его частями.`
          );
          return;
      }
      
      setAttachedFiles(prev => [...prev, ...validFiles]);
  }, []);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
          setIsDragging(false);
      }
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      setCurrentError(null);

      const files = [...e.dataTransfer.files];
      handleSelectedFiles(files);
  }, [handleSelectedFiles]);

  const handleCompleteWrapper = async () => {
      if (monologue.trim().length > 50 || attachedFiles.length > 0) {
          if (attachedFiles.length > 0) {
              setIsTranscribing(true);
              try {
                  if (useNativeAudio) {
                      const newAttached = await Promise.all(attachedFiles.map(async (file) => {
                          const base64Data = await fileToBase64(file);
                          const mimeType = file.type === 'audio/mp3' ? 'audio/mpeg' : (file.type || 'audio/mpeg');
                          return { base64: base64Data, mimeType, voicePrompt, name: file.name };
                      }));
                      onComplete(monologue || "[Анализ аудио]", newAttached);
                  } else {
                      let allTranscribed = "";
                      for (const file of attachedFiles) {
                          const base64Data = await fileToBase64(file);
                          const mimeType = file.type === 'audio/mp3' ? 'audio/mpeg' : (file.type || 'audio/mpeg');
                          const transcribedText = await transcribeAudio(base64Data, mimeType);
                          allTranscribed += (allTranscribed ? "\n\n" : "") + transcribedText;
                      }
                      const finalMonologue = monologue ? `${monologue}\n\n${allTranscribed}` : allTranscribed;
                      onComplete(finalMonologue);
                  }
              } catch (err: unknown) {
                  const errorMsg = err instanceof Error ? err.message : "Произошла ошибка при обработке файла.";
                  setCurrentError(errorMsg);
                  setIsTranscribing(false);
              }
          } else {
              onComplete(monologue);
          }
      }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-brand-surface rounded-xl shadow-2xl animate-fade-in w-full relative"
         onDrop={handleDrop}
         onDragOver={handleDragOver}
         onDragEnter={handleDragEnter}
         onDragLeave={handleDragLeave}
    >
      <div className="text-center mb-6 relative">
        <h1 className="text-4xl md:text-5xl font-bold font-serif text-brand-accent mb-2">
            Соционический Типировщик
        </h1>
        <p className="text-base md:text-lg text-brand-text-secondary max-w-3xl mx-auto leading-relaxed">
            Поразмышляйте над темами справочника слева и запишите рассказ. Говорите, пишите ответы или <strong className="text-brand-primary">перетащите аудиофайл (.mp3, .ogg)</strong>. Чем подробнее вы ответите, тем точнее нейросеть определит ваш социотип!
        </p>

        {/* Toggleable help button if banner dismissed */}
        {!showHelpBanner && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={toggleHelpBanner}
              className="px-3.5 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span>💡 Показать подсказку по началу работы</span>
            </button>
          </div>
        )}
      </div>

      {/* Onboarding Guidance Banner for New Users / Ethics */}
      {showHelpBanner && (
        <div className="mb-6 bg-gradient-to-r from-amber-500/10 via-brand-primary/10 to-amber-500/10 border border-brand-primary/25 rounded-2xl p-4 sm:p-5 relative shadow-sm text-left animate-fade-in">
          <button
            onClick={toggleHelpBanner}
            className="absolute top-3 right-3 text-brand-text-secondary hover:text-brand-primary text-xs font-bold px-2 py-1 rounded bg-black/5 hover:bg-black/10 transition cursor-pointer"
            title="Скрыть подсказку"
          >
            ✕ Скрыть
          </button>
          <div className="flex items-center gap-2 mb-2 font-serif font-bold text-brand-primary text-sm sm:text-base">
            <span className="text-lg">💡</span>
            <span>Быстрый старт: Как пройти типирование без сложностей</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-brand-text leading-relaxed">
            <div className="bg-brand-surface/80 p-3 rounded-xl border border-brand-primary/10 shadow-2xs">
              <span className="font-bold text-brand-primary block mb-1">1. 🔑 Настройте ИИ (API)</span>
              <span>Вверху справа есть статус ИИ. Если горит красным, нажмите <button onClick={onOpenSettings} className="underline font-bold text-brand-primary hover:text-brand-secondary cursor-pointer">⚙️ Настройки</button> и укажите ваш ключ или выберите бесплатный <b>Pollinations AI</b>.</span>
            </div>
            <div className="bg-brand-surface/80 p-3 rounded-xl border border-brand-primary/10 shadow-2xs">
              <span className="font-bold text-brand-primary block mb-1">2. ✍️ Ответьте на вопросы</span>
              <span>Посмотрите на вопросы в справочнике слева 👈. Ответы можно набрать в окне ввода справа, надиктовать с микрофона 🎙️ или загрузить готовое аудио 📁.</span>
            </div>
            <div className="bg-brand-surface/80 p-3 rounded-xl border border-brand-primary/10 shadow-2xs">
              <span className="font-bold text-brand-primary block mb-1">3. 🚀 Запустите анализ</span>
              <span>Нажмите яркую кнопку <b>«Анализировать ответы»</b> внизу справа. Нейросеть составит подробный соционический отчет и карту функций!</span>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Smart Error Box */}
      {currentError && (
        <div 
          className={`px-5 py-4 rounded-xl relative mb-6 text-left shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border ${
            currentError.includes('API') || currentError.includes('ключ') || currentError.includes('авторизаци') || currentError.includes('401') || currentError.includes('403') || currentError.includes('UNAUTHENTICATED')
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900'
              : 'bg-red-50 border-red-200 text-red-700'
          }`} 
          role="alert"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0 mt-0.5">
              {currentError.includes('API') || currentError.includes('ключ') || currentError.includes('авторизаци') ? '🔑' : '⚠️'}
            </span>
            <div>
              <strong className="font-bold block text-sm">
                {currentError === 'API_KEY_MISSING' || currentError.includes('API key is required')
                  ? 'Необходимо указать API-ключ ИИ'
                  : 'Обратите внимание:'}
              </strong>
              <span className="text-xs sm:text-sm leading-relaxed block mt-0.5">
                {currentError === 'API_KEY_MISSING' || currentError.includes('API key is required')
                  ? 'Для распознавания речи и анализа текста требуется настроить провайдера ИИ. Укажите ваш API-ключ или выберите бесплатную модель Pollinations AI (без ключа).'
                  : currentError}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end mt-2 sm:mt-0">
            <button 
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`Error Log:\n${currentError}\n\nTime: ${new Date().toISOString()}`);
                alert('Лог ошибки скопирован в буфер обмена! Отправьте его разработчику.');
              }}
              className="whitespace-nowrap px-4 py-2 bg-black/10 text-brand-text hover:bg-black/20 rounded-lg font-bold text-xs transition shadow-sm cursor-pointer"
            >
              📋 Скопировать лог
            </button>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="whitespace-nowrap px-4 py-2 bg-brand-primary text-white rounded-lg font-bold text-xs hover:bg-brand-secondary transition shadow-sm cursor-pointer"
              >
                ⚙️ Настройки API
              </button>
            )}
            <button 
              type="button"
              onClick={handleCompleteWrapper}
              className="whitespace-nowrap px-4 py-2 bg-brand-bg text-brand-text border border-brand-cream-dark hover:bg-brand-surface rounded-lg font-bold text-xs transition shadow-sm cursor-pointer"
            >
              Повторить
            </button>
          </div>
        </div>
      )}

      {/* Main Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch relative min-h-[500px] lg:h-[62vh] lg:max-h-[680px]">
        {/* Drag & Drop Overlay */}
        {isDragging && (
            <div className="pointer-events-none absolute inset-0 bg-brand-primary/50 border-4 border-dashed border-brand-accent rounded-xl flex items-center justify-center z-20 backdrop-blur-[2px] transition-all">
                <p className="text-2xl font-bold text-white bg-brand-dark/80 px-8 py-4 rounded-2xl shadow-2xl border border-brand-accent/30 animate-pulse">
                  Перетащите аудиофайл сюда
                </p>
            </div>
        )}

        {/* Left Column: Handbook of reference questions (Desktop & Mobile Scrollable) */}
        <div className="lg:col-span-6 flex flex-col bg-brand-bg border border-brand-cream-dark rounded-xl p-5 overflow-hidden h-full shadow-inner">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-brand-primary/10">
            <h3 className="font-serif font-bold text-brand-primary text-base md:text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
              <span>👇 ТЕМЫ ДЛЯ АУДИО</span>
            </h3>
            <span className="text-[10px] font-bold font-mono text-brand-text-secondary bg-brand-cream-dark/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              5 разделов
            </span>
          </div>
          
          <p className="text-xs text-brand-text-secondary mb-4 leading-relaxed italic">
            Выбирайте любые блоки или ответьте на все вопросы для максимальной точности типирования:
          </p>
          
          {/* Scrollable List of Sections */}
          <div className="flex-grow overflow-y-auto space-y-4 pr-1.5 scrollbar-thin scrollbar-thumb-brand-cream-dark scrollbar-track-transparent text-left">
            {TOPIC_SECTIONS.map((section, idx) => (
              <div key={idx} className="bg-brand-surface border border-brand-cream-dark rounded-xl p-4 shadow-sm relative overflow-hidden transition-all hover:shadow">
                <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary/40"></div>
                <h4 className="font-serif font-bold text-brand-primary text-sm md:text-base mb-1 pl-1">
                  {section.title}
                </h4>
                <p className="text-xs text-brand-text-secondary font-medium mb-2.5 pl-1 leading-relaxed">
                  {section.subtitle}
                </p>
                <ul className="space-y-1.5 pl-1">
                  {section.questions.map((q, qidx) => (
                    <li key={qidx} className="text-xs text-brand-text leading-relaxed flex items-start gap-1.5">
                      <span className="text-brand-gold font-bold mt-0.5">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Textarea Workspace */}
        <div className="lg:col-span-6 flex flex-col h-full w-full bg-brand-bg border border-brand-cream-dark rounded-xl p-5 shadow-inner">
          
          {/* Workspace Header Bar */}
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-brand-primary/10 flex-shrink-0">
            <h3 className="font-serif font-bold text-brand-primary text-sm md:text-base flex items-center gap-2">
              <span>✍️ Окно ввода</span>
            </h3>
            <div className="flex items-center gap-2">
              <input 
                type="file"
                id="audio-upload-input"
                className="hidden"
                accept="audio/*,video/*,.mp3,.ogg,.wav"
                multiple
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  handleSelectedFiles(files);
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById('audio-upload-input')?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all text-xs font-semibold cursor-pointer shadow-sm"
                title="Загрузить аудио или видео файл"
              >
                <span>📎 Прикрепить файл</span>
              </button>

              {hasRecognitionSupport && (
                <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 shadow-sm cursor-pointer text-xs font-semibold ${
                      isListening 
                        ? 'bg-red-500 text-white animate-pulse scale-105 hover:bg-red-600' 
                        : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white'
                    } ${status === 'reconnecting' ? 'bg-yellow-500 text-white' : ''}`}
                    title={isListening ? "Остановить запись" : "Записать вопрос голосом"}
                >
                  {isListening ? <StopIcon className="w-3.5 h-3.5" /> : <MicrophoneIcon className="w-3.5 h-3.5" />}
                  <span>{isListening ? 'Идет запись...' : 'Голосовой ввод'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Text Area Input */}
          <div className="relative flex-grow min-h-[220px] h-[300px] lg:h-full">
               <textarea
                  ref={textareaRef}
                  value={monologue}
                  onChange={(e) => setMonologue(e.target.value)}
                  placeholder="Запишите ваши мысли, используя темы слева как подсказки. Начните говорить с микрофона, пишите текст вручную или просто перетащите сюда аудиофайл (.mp3, .ogg)..."
                  className="w-full h-full p-4 bg-brand-surface border border-brand-cream-dark rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-brand-text placeholder-brand-text-secondary/55 text-base md:text-lg leading-relaxed shadow-sm"
              />
              {isTranscribing && (
                  <div className="absolute inset-0 bg-brand-surface/85 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm z-10">
                      <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-brand-accent"></div>
                      <p className="mt-4 text-brand-text font-semibold animate-pulse text-sm">Распознавание и транскрибация речи...</p>
                  </div>
              )}
          </div>

          {/* Attached Files List - Rendered naturally underneath, not overlapping text! */}
          {attachedFiles.length > 0 && (
              <div className="mt-3 bg-brand-surface border border-brand-primary/20 p-3 rounded-xl shadow-sm max-h-28 overflow-y-auto flex-shrink-0 text-left">
                  <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider block">Прикрепленные файлы ({attachedFiles.length})</span>
                      <button onClick={() => setAttachedFiles([])} className="text-[10px] text-red-500 hover:text-red-600 font-bold cursor-pointer px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 transition-colors">Очистить</button>
                  </div>
                  <ul className="text-xs text-brand-text flex flex-wrap gap-2">
                      {attachedFiles.map((f, idx) => (
                          <li key={idx} className="bg-brand-bg px-2.5 py-1.5 rounded-md border border-brand-cream-dark flex items-center gap-1.5 shadow-sm text-[11px] font-medium">
                            🎙️ {f.name}
                          </li>
                      ))}
                  </ul>
              </div>
          )}

          {/* Voice Prompt for native audio - Rendered nicely, non-overlapping */}
          {useNativeAudio && (
            <div className="mt-3 bg-brand-surface border border-brand-primary/10 p-3.5 rounded-xl shadow-sm text-left flex-shrink-0">
               <label className="flex items-center gap-2 text-[11px] font-bold text-brand-primary uppercase tracking-wider mb-1.5">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></span>Нативный режим Omni</span>
                  <span className="text-brand-text-secondary lowercase">/ уточняющий промпт по голосу</span>
               </label>
               <div className="relative">
                 <textarea
                   value={voicePrompt}
                   onChange={(e) => setVoicePrompt(e.target.value)}
                   className="w-full px-3 py-2 pr-12 bg-brand-bg/50 border border-brand-cream-dark rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/50 focus:outline-none focus:border-brand-primary text-brand-text font-medium min-h-[60px] resize-y"
                   placeholder="Например: Анализируем только женский голос..."
                 />
                 {hasRecognitionSupport && (
                    <button 
                      onClick={() => isVoicePromptListening ? voiceRec.stopListening() : voiceRec.startListening()}
                      className={`absolute right-2 top-2 p-2 rounded-lg transition-all shadow-sm ${isVoicePromptListening ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 animate-pulse' : 'bg-brand-surface text-brand-text-secondary hover:text-brand-primary hover:bg-brand-cream border border-brand-primary/10'}`}
                      title={isVoicePromptListening ? "Остановить запись" : "Голосовой ввод"}
                    >
                      {isVoicePromptListening ? <StopIcon /> : <MicrophoneIcon />}
                    </button>
                 )}
               </div>
               <p className="text-[10px] text-brand-text-secondary mt-1 leading-relaxed">Опишите, чей голос нужно типировать (например: 'мужчину', 'только голос с акцентом'). Остальные голоса на записи будут игнорироваться ИИ.</p>
            </div>
          )}

          {/* Submit and Word count block */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3.5 flex-shrink-0">
                <span className="text-xs font-semibold text-brand-text-secondary">
                  {monologue.trim().length < 50 && attachedFiles.length === 0 ? (
                    <span className="text-amber-600 font-medium">
                      Минимум 50 символов (введено: {monologue.trim().length}/50)
                    </span>
                  ) : (
                    <span className="text-brand-green font-bold flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 bg-brand-green rounded-full animate-pulse"></span>
                      ✓ Готово для анализа ({monologue.trim().length} символов)
                    </span>
                  )}
                </span>
                <button
                    onClick={handleCompleteWrapper}
                    disabled={(monologue.trim().length < 50 && attachedFiles.length === 0) || isTranscribing}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-3.5 bg-brand-primary text-white font-bold text-base md:text-lg rounded-xl hover:bg-brand-secondary active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-primary/20 cursor-pointer"
                >
                    <span>Анализировать ответы</span>
                    <PaperAirplaneIcon />
                </button>
            </div>
          </div>
      </div>
    </div>
  );
};

export default MonologueScreen;
