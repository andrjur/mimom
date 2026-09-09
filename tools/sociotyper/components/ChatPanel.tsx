import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { PaperAirplaneIcon, MicrophoneIcon, StopIcon } from './Icons';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ThumbsUp, ThumbsDown } from 'lucide-react';


interface ChatPanelProps {
  history: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  suggestedQuestions: string[];
  input?: string;
  setInput?: (val: string) => void;
  onRateMessage?: (index: number, rating: 'like' | 'dislike') => void;
}

const SimpleHtmlRenderer: React.FC<{ text: string }> = ({ text }) => {
    // Convert any **bold** to <strong> for compatibility, but render direct HTML cleanly.
    const html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return <div className="text-sm whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
};

export const ChatPanel: React.FC<ChatPanelProps> = ({ history, onSendMessage, isLoading, suggestedQuestions, input: externalInput, setInput: externalSetInput, onRateMessage }) => {
  const [internalInput, setInternalInput] = useState('');
  const input = externalInput !== undefined ? externalInput : internalInput;
  const setInput = externalSetInput !== undefined ? externalSetInput : setInternalInput;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { status, startListening, stopListening, hasRecognitionSupport } = useSpeechRecognition(input, setInput);
  const isListening = status === 'listening' || status === 'reconnecting';

  useEffect(() => {
    if (history.length > 0) {
      const container = messagesContainerRef.current;
      if (container) {
        // Smoothly scroll only the message container itself to the bottom
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [history]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(150, textareaRef.current.scrollHeight)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      if(isListening) {
        stopListening();
      }
      onSendMessage(input);
      setInput('');
    }
  };
  
  const handleMicClick = () => {
      if(isLoading) return;
      if(isListening) {
          stopListening();
      } else {
          startListening();
      }
  }

  return (
    <div className="flex flex-col h-full bg-brand-surface border border-brand-primary/10 rounded-xl min-h-[550px] shadow-sm">
      <h3 className="text-lg font-bold text-brand-text mb-2 p-4 border-b border-brand-primary/10 flex-shrink-0 font-serif">
        Задать вопрос ИИ
      </h3>
      <div ref={messagesContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
        {history.map((msg, index) => {
          const isLast = index === history.length - 1;
          return (
            <div 
              key={index} 
              ref={isLast ? lastMessageRef : null}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group`}
            >
              <div className="flex items-center gap-2 max-w-[90%] md:max-w-[80%]">
                {msg.role === 'model' && (
                  <div className="flex sm:flex-col gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onRateMessage?.(index, 'like')}
                      
                      className={`p-1.5 rounded-lg hover:bg-brand-primary/10 transition-all ${
                        msg.rating === 'like' 
                          ? 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 shadow-sm scale-110' 
                          : 'text-brand-text-secondary/60 hover:text-brand-primary'
                      } `}
                      title="Хороший ответ"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRateMessage?.(index, 'dislike')}
                      
                      className={`p-1.5 rounded-lg hover:bg-red-500/10 transition-all ${
                        msg.rating === 'dislike' 
                          ? 'text-red-500 bg-red-500/10 border border-red-500/20 shadow-sm scale-110' 
                          : 'text-brand-text-secondary/60 hover:text-red-500'
                      } `}
                      title="Плохой ответ"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div
                  className={`px-4 py-2.5 rounded-xl shadow-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-primary text-white'
                      : msg.isError
                        ? 'bg-red-500/10 border border-red-500/20 text-red-900 dark:text-red-200'
                        : 'bg-brand-bg border border-brand-primary/5 text-brand-text'
                  }`}
                >
                  <SimpleHtmlRenderer text={msg.content} />
                  {msg.isError && (
                    <div className="mt-3 pt-2.5 border-t border-red-500/15 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const userMsgs = history.slice(0, index).filter(m => m.role === 'user');
                          if (userMsgs.length > 0) {
                            onSendMessage(userMsgs[userMsgs.length - 1].content);
                          }
                        }}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition duration-200 cursor-pointer flex items-center gap-1 shadow-sm hover:scale-102 active:scale-98"
                      >
                        <span>🔄 Повторить запрос</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {msg.rating && (
                <span className={`text-[10px] mt-1 font-mono font-semibold ${msg.rating === 'like' ? 'text-emerald-600' : 'text-red-500'} pl-8`}>
                  {msg.rating === 'like' ? '✓ Вы оценили этот ответ положительно' : '✗ Ответ оценен отрицательно (учтено в глобальной статистике)'}
                </span>
              )}
            </div>
          );
        })}
         {isLoading && (
            <div className="flex items-start">
                <div className="max-w-xs px-4 py-2 rounded-xl bg-brand-bg border border-brand-primary/5 text-brand-text">
                   <div className="flex items-center justify-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-brand-primary/60 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-brand-primary/60 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-brand-primary/60 rounded-full animate-pulse"></div>
                   </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

       { !isLoading && suggestedQuestions.length > 0 && (
            <div className="p-4 border-t border-brand-primary/10 flex-shrink-0">
                <p className="text-brand-text-secondary mb-3 text-center text-xs font-mono uppercase tracking-wider">Рекомендуемые вопросы по вашему типу:</p>
                <div className="flex flex-wrap justify-center gap-2">
                    {suggestedQuestions.map((q, i) => (
                    <button
                        key={i}
                        onClick={() => onSendMessage(q)}
                        className="px-3 py-1.5 bg-brand-bg text-brand-text text-xs font-medium rounded-full hover:bg-brand-primary hover:text-white border border-brand-primary/10 hover:border-brand-primary transition-all duration-200"
                    >
                        {q}
                    </button>
                    ))}
                </div>
            </div>
        )}

      <div className="p-4 border-t border-brand-primary/10 flex-shrink-0">
        <div className="flex items-stretch bg-brand-surface border border-brand-cream-dark rounded-xl overflow-hidden focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/25 transition-all duration-200 shadow-sm">
          {hasRecognitionSupport && (
            <button
                onClick={handleMicClick}
                disabled={isLoading}
                className={`p-4 transition-colors ${isListening ? 'text-red-500 animate-pulse bg-red-500/5' : 'text-brand-text-secondary hover:text-brand-primary hover:bg-brand-cream/10'} disabled:text-brand-cream-dark`}
                title={isListening ? 'Остановить запись' : 'Записать вопрос голосом'}
            >
              {isListening ? <StopIcon/> : <MicrophoneIcon />}
            </button>
          )}
          <textarea
            ref={textareaRef}
            id="chat-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Спросите у ИИ об особенностях вашего типа, сильных и слабых сторонах или о совместимости..."
            className="w-full bg-transparent px-4 py-3 focus:outline-none text-brand-text placeholder-brand-text-secondary/60 resize-none text-sm md:text-base leading-relaxed min-h-[96px] max-h-[220px] overflow-y-auto font-sans"
            disabled={isLoading}
            rows={3}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-5 text-white transition-all bg-brand-primary disabled:bg-brand-cream-dark disabled:opacity-50 hover:bg-brand-secondary flex items-center justify-center shadow-md active:scale-95"
            title="Отправить сообщение"
          >
            <PaperAirplaneIcon />
          </button>
        </div>
        <p className="text-[10px] text-brand-text-secondary text-center mt-2">
          Нажмите <b>Enter</b> для отправки. Чтобы перенести строку, зажмите <b>Shift + Enter</b>.
        </p>
      </div>
    </div>
  );
};