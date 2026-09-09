import React, { useMemo, useState } from 'react';
import { AlertTriangle, Archive, Bot, Check, HelpCircle, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react';
import { TIM_DEFINITIONS } from '../constants';
import type { ByokSettings, PersonSession, TypistPersona } from '../typistTypes';
import { askTypist } from '../services/typistApi';
import { downloadSessionArchive } from '../services/archiveService';
import { AnalysisPipeline } from './AnalysisPipeline';
import { LegacyResultAdapter } from './LegacyResultAdapter';
import { LogConsole, ProbeArchive } from './TypistDiagnostics';

const LEVELS = {
  insufficient: { label: 'Данных недостаточно', className: 'insufficient' },
  low: { label: 'Низкая уверенность', className: 'low' },
  medium: { label: 'Средняя уверенность', className: 'medium' },
  high: { label: 'Высокая уверенность', className: 'high' }
};

interface Props {
  session: PersonSession;
  allSessions: PersonSession[];
  byok: ByokSettings;
  aiPending: boolean;
  upgradeCountdown?: number | null;
  onCancelUpgrade: () => void;
  onShowAi: () => void;
  onRestart: () => void;
  onRetry: (lockedDichotomies?: Record<string, string>, lockedPsychosophy?: Record<string, unknown>, preferredTim?: string) => void;
  onQuestionsLeft: (value: number) => void;
  persona: TypistPersona;
}

export const TypistResultCard: React.FC<Props> = ({ session, allSessions, byok, persona, aiPending, upgradeCountdown, onCancelUpgrade, onShowAi, onRestart, onRetry, onQuestionsLeft }) => {
  const [tab, setTab] = useState<'summary' | 'scales' | 'words' | 'reference' | 'ask'>('summary');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);
  const result = session.result;

  const comparison = useMemo(() => {
    if (!session.localResult || !session.aiResult) return [];
    const local = new Map(session.localResult.dichotomies.map(item => [item.name, item.result]));
    return session.aiResult.dichotomies.map(item => ({ ...item, local: local.get(item.name), same: local.get(item.name) === item.result }));
  }, [session.localResult, session.aiResult]);

  if (!result) return null;
  const level = LEVELS[result.confidenceLevel] || LEVELS.low;
  const definition = TIM_DEFINITIONS[result.tim.abbreviation];

  const sendQuestion = async (preset?: string) => {
    const value = (preset || question).trim();
    if (!value || asking || (byok.mode !== 'byok' && session.questionsLeft <= 0)) return;
    setQuestion('');
    setAsking(true);
    try {
      const response = await askTypist({ sessionId: session.id, question: value, result, byok, persona });
      setAnswer(response.answer);
      onQuestionsLeft(byok.mode === 'byok' ? session.questionsLeft : (response.questionsLeft ?? Math.max(0, session.questionsLeft - 1)));
    } catch {
      setAnswer(`Короткая локальная пояснялка: результат ${result.tim.name} — это гипотеза о привычном способе обрабатывать информацию. Сверяйте её с альтернативами и примерами поведения, а не с красивым описанием.`);
      if (byok.mode !== 'byok') onQuestionsLeft(Math.max(0, session.questionsLeft - 1));
    } finally {
      setAsking(false);
    }
  };

  return (
    <section className="tw-result">
      {result.randomFallback && (
        <div className="tw-random-fallback" role="alert">
          <span aria-hidden="true">⚄</span><div><strong>ТИМ не определён — запущен генератор случайности</strong><p>Показанная версия нужна только для открытия интерфейса результата. Она не основана на материале и имеет нулевую диагностическую силу.</p></div>
        </div>
      )}
      {result.randomFallback && result.originalHypothesis && <details className="tw-result-appendix"><summary>Исходная гипотеза ИИ до случайного выбора</summary><p>{result.originalHypothesis.tim?.name} · {result.originalHypothesis.confidence ?? 0}%</p><p>{result.originalHypothesis.summary}</p></details>}
      {aiPending && result.source === 'local' && (
        <div className="tw-ai-background" role="status">
          <LoaderCircle className="tw-spin" size={21} />
          <div><strong>Предварительный ответ уже можно изучать</strong><span>ИИ продолжает проверять наблюдения, альтернативы и возражения. Эта работа не остановлена.</span></div>
          <div className="tw-ai-pulse" aria-hidden="true"><i /><i /><i /><i /></div>
        </div>
      )}
      {aiPending && <AnalysisPipeline stages={session.liveStages || []} compact />}
      {upgradeCountdown != null && (
        <div className="tw-upgrade-banner">
          <Sparkles size={20} />
          <div><strong>Пришёл более умный ответ ИИ</strong><span>Переключаю через {upgradeCountdown}…</span></div>
          <button onClick={onCancelUpgrade}>Не переключать</button>
        </div>
      )}
      {session.aiResult && result.source === 'local' && upgradeCountdown == null && (
        <button className="tw-ai-ready" onClick={onShowAi}><Bot size={18} /> Показать ответ ИИ</button>
      )}

      <LegacyResultAdapter session={session} allSessions={allSessions} onRestart={onRestart} onReanalyze={onRetry} />

      <ProbeArchive probes={result.probeResults} />
      <LogConsole logs={session.clientLogs} name={session.name} />

      <details className="tw-result-appendix">
        <summary><Sparkles size={17} /> Протокол анализа, сомнения, слова и вопросы</summary>
        <div className="tw-result-appendix-body">

      <div className="tw-result-head">
        <div>
          <span className="tw-kicker">{result.source === 'ai' ? 'ИИ-анализ' : 'Черновой ответ компьютера'}</span>
          <h3>{result.tim.name} <em>{result.tim.abbreviation}</em></h3>
        </div>
        <div className={`tw-confidence ${level.className}`}><b>{result.confidence}%</b><span>{level.label}</span></div>
      </div>

      <AnalysisPipeline stages={result.stages} compact />

      <nav className="tw-result-tabs" aria-label="Разделы результата">
        {[
          ['summary', 'Вывод'], ['scales', 'Признаки'], ['words', 'Слова'], ['reference', 'Справочник'], ['ask', byok.mode === 'byok' ? 'Задать вопрос · ∞' : `Задать вопрос · ${session.questionsLeft}`]
        ].map(([id, label]) => <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id as typeof tab)}>{label}</button>)}
      </nav>

      <div className="tw-result-body">
        {tab === 'summary' && (
          <div className="tw-summary-grid">
            <div>
              <h4>Что увидел анализ</h4>
              <p>{result.summary}</p>
              {definition?.description && <p className="tw-muted">Справочное описание: {definition.description}</p>}
            </div>
            <aside>
              <h4><AlertTriangle size={17} /> Что пока спорно</h4>
              <ul>{(result.doubts.length ? result.doubts : ['Явных сомнений модель не указала.']).map(item => <li key={item}>{item}</li>)}</ul>
              {result.alternatives.length > 0 && <div className="tw-alternatives"><span>Альтернативы</span>{result.alternatives.map(item => <b key={item.abbreviation}>{item.name} · {item.probability}%</b>)}</div>}
            </aside>
          </div>
        )}

        {tab === 'scales' && (
          <div className="tw-scale-list">
            {result.dichotomies.map(item => {
              const compared = comparison.find(row => row.name === item.name);
              return <article key={item.name} className={compared ? (compared.same ? 'agrees' : 'differs') : ''}>
                <div><span>{item.name}</span>{compared && <i>{compared.same ? <><Check size={13} /> ИИ и компьютер согласны</> : `ИИ: ${compared.result} · компьютер: ${compared.local}`}</i>}</div>
                <strong>{item.result}</strong><meter min="0" max="100" value={item.confidence} /><em>{item.confidence}%</em>
                <p>{item.evidence}</p>
              </article>;
            })}
          </div>
        )}

        {tab === 'words' && (
          <div className="tw-table-wrap">
            <p className="tw-muted">Таблица показывает, какие слова повлияли на локальную гипотезу. Это не словарь «типичных людей», а прозрачный след грубого алгоритма.</p>
            <table><thead><tr><th>Слово</th><th>Шкала</th><th>Полюс</th><th>Вхождений</th></tr></thead><tbody>
              {(session.localResult?.wordEvidence || result.wordEvidence).map((item, index) => <tr key={`${item.word}-${index}`}><td><b>{item.word}</b></td><td>{item.dimension}</td><td>{item.pole}</td><td>{item.count}</td></tr>)}
            </tbody></table>
          </div>
        )}

        {tab === 'reference' && (
          <div className="tw-reference">
            <HelpCircle size={24} /><div><h4>Как читать результат</h4><p>ТИМ — основная гипотеза. Проценты показывают уверенность именно этого анализа, а не «сколько в вас типа». Низкая уверенность означает: полезнее добрать примеры, чем спорить с итогом.</p><p>Сначала проверьте четыре базовые шкалы. Затем посмотрите альтернативы и только после этого переходите к признакам Рейнина и отношениям.</p></div>
          </div>
        )}

        {tab === 'ask' && (
          <div className="tw-ask">
            <div className="tw-ask-head"><div><h4>{persona.emoji} Отвечает: {persona.name}</h4><p>{byok.mode === 'byok' ? 'Запросы идут через ваш API и не расходуют лимит сайта.' : 'Каждое нажатие «Задать вопрос» расходует 1 из 10 запросов.'} Персонаж меняет только подачу.</p></div><span>{byok.mode === 'byok' ? '∞' : `${session.questionsLeft}/10`}</span></div>
            {byok.mode !== 'byok' && <div className="tw-question-meter" aria-label={`Осталось ${session.questionsLeft} из 10 вопросов`}>{Array.from({ length: 10 }, (_, index) => <i key={index} className={index >= session.questionsLeft ? 'is-used' : ''} />)}</div>}
            <div className="tw-question-chips">
              {['Где здесь больше всего сомнений?', 'Чем отличаются две главные версии?', 'Как проверить тип на примере?', 'Предложи три уточняющих вопроса'].map(item => <button key={item} onClick={() => setQuestion(item)}>{item}</button>)}
            </div>
            <div className="tw-ask-form"><textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Например: почему выбрана именно логика?" /><button disabled={!question.trim() || asking || (byok.mode !== 'byok' && session.questionsLeft <= 0)} onClick={() => sendQuestion()}>{asking ? 'Думаю…' : 'Задать вопрос'}</button></div>
            {answer && <div className="tw-answer">{answer}</div>}
          </div>
        )}
      </div>

      <footer className="tw-result-actions">
        <button onClick={() => downloadSessionArchive(session)}><Archive size={17} /> Скачать архив</button>
        <button onClick={() => onRetry()}><RefreshCw size={17} /> Повторить ИИ · −1 попытка</button>
        <button onClick={onRestart}><RefreshCw size={17} /> Типировать заново</button>
      </footer>
        </div>
      </details>
    </section>
  );
};
