import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, AudioLines, CheckCircle2, ChevronDown, ChevronUp, CircleHelp, Clock3, CreditCard, FileAudio, FileText, KeyRound, LoaderCircle, Mic, Plus, ShieldCheck, Sparkles, Square, Trash2, UploadCloud, Users, WandSparkles, X } from 'lucide-react';
import { QUESTIONS } from '../constants';
import { INTERTYPE_RELATIONS_DATA, RELATION_METADATA } from './relations';
import type { ApiConnection, ByokSettings, PersonSession, PipelineStage, StoredAudio, TypistPersona } from '../typistTypes';
import { runLocalTypist } from '../services/localTypist';
import { cancelJob, pollAnalysis, fileToBase64, getUsageStatus, redeemAccessCode, requestAnalysis, validateByok } from '../services/typistApi';
import { deleteAudio, loadSessions, restoreSessions, saveAudio, saveSessions } from '../services/sessionStorage';
import { ApiSetupSheet } from './ApiSetupSheet';
import { AnalysisPipeline } from './AnalysisPipeline';
import { TypistResultCard } from './TypistResultCard';
import { TypistFieldGuide, WisdomScroll } from './TypistFieldGuide';
import { ASPECT_GUIDE, REININ_GUIDE, WISDOM_TIPS } from '../data/typistFieldGuide';
import { LogConsole } from './TypistDiagnostics';
import { DEFAULT_PERSONA, PersonaStudio } from './PersonaStudio';
import { prepareAudio } from '../services/audioPreparation';

const FALLBACK_AFTER_MS = 210000;

const stableModelIndex = (seed: string, probeId: string, length: number) => {
  let hash = 2166136261;
  const value = `${seed}:${probeId}`;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0) % length;
};

const DEFAULT_BYOK: ByokSettings = {
  mode: 'included', provider: 'knyazev', key: '', baseUrl: 'https://knyazevai.work/v1', model: 'minimax-2.7', effort: 'high', connections: [], omniEnabled: true
};

const BYOK_DEFAULTS: Record<Exclude<ByokSettings['provider'], 'custom'>, Pick<ByokSettings, 'baseUrl' | 'model'>> = {
  routerai: { baseUrl: 'https://routerai.ru/api/v1', model: 'inception/mercury-2.5' },
  knyazev: { baseUrl: 'https://knyazevai.work/v1', model: 'minimax-2.7' },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.6-flash' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-fable-5-1' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'google/gemini-2.5-flash' }
};

const makeSession = (index: number): PersonSession => ({
  id: `person-${Date.now()}-${index}`,
  name: `Участник ${index}`,
  text: '',
  voiceGuide: '',
  audio: [],
  status: 'draft',
  result: null,
  localResult: null,
  aiResult: null,
  attemptsLeft: 4,
  questionsLeft: 10,
  collapsed: false,
  clientLogs: []
});

const activeConnections = (settings: ByokSettings) => settings.connections?.filter(item => item.policy !== 'off') || [];
const makeConnection = (settings: ByokSettings, checkedModel?: string): ApiConnection => ({
  id: `${settings.provider}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label: settings.provider === 'knyazev' ? 'Knyazev AI / Gonka' : settings.provider === 'custom' ? 'Другой API' : settings.provider,
  provider: settings.provider,
  key: settings.key,
  baseUrl: settings.baseUrl,
  model: checkedModel || settings.model,
  policy: 'system',
  omniCapable: /(?:gemini|gpt-4o-audio|omni)/i.test(checkedModel || settings.model),
  effort: settings.effort
});

const countWords = (value: string) => (value.trim().match(/[а-яёa-z0-9-]+/gi) || []).length;

const relationFor = (a: string, b: string) => {
  const relations = INTERTYPE_RELATIONS_DATA[a];
  if (!relations) return null;
  const pair = Object.entries(relations).find(([, partner]) => partner.abbr === b);
  if (!pair) return null;
  return RELATION_METADATA[pair[0]] || null;
};

const PersonInput: React.FC<{
  session: PersonSession;
  debugConsent: boolean;
  useIncluded: boolean;
  audioCapable: boolean;
  onChange: (patch: Partial<PersonSession>) => void;
  onAddAudio: (audio: StoredAudio) => void;
  onRemoveAudio: (audio: StoredAudio) => void;
  onAnalyze: () => void;
}> = ({ session, debugConsent, useIncluded, audioCapable, onChange, onAddAudio, onRemoveAudio, onAnalyze }) => {
  const [showQuestions, setShowQuestions] = useState(false);
  const [recording, setRecording] = useState(false);
  const [dragging, setDragging] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const wordCount = countWords(session.text);
  const ready = session.text.trim().length >= 80 || session.audio.length > 0;

  const addFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    let currentTotal = session.audio.reduce((sum, item) => sum + item.size, 0);
    const textParts: string[] = [];
    for (const file of Array.from(files)) {
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|ogg|wav|m4a|webm)$/i.test(file.name);
      const isText = file.type.startsWith('text/') || /\.(txt|md|json|csv)$/i.test(file.name);
      if (isText) {
        if (file.size > 4 * 1024 * 1024) {
          onChange({ error: `Текстовый файл «${file.name}» больше 4 МБ. Разделите его на части.` });
          continue;
        }
        textParts.push(`### Файл: ${file.name}\n${await file.text()}`);
        continue;
      }
      if (!isAudio) {
        onChange({ error: `Формат «${file.name}» пока не читается. Перенесите аудио, TXT, Markdown, JSON или CSV.` });
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        onChange({ error: `Файл «${file.name}» больше 20 МБ. Для надёжной отправки сожмите или разделите запись.` });
        continue;
      }
      if (currentTotal + file.size > 45 * 1024 * 1024) {
        onChange({ error: 'Суммарный объём аудио для одного человека не должен превышать 45 МБ.' });
        continue;
      }
      onAddAudio({ id: `${session.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: file.name, mimeType: file.type || 'audio/mpeg', size: file.size, blob: file });
      currentTotal += file.size;
    }
    if (textParts.length) onChange({ text: `${session.text}${session.text ? '\n\n' : ''}${textParts.join('\n\n')}`, error: undefined });
  };

  const toggleRecording = async () => {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = event => event.data.size && chunksRef.current.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        onAddAudio({ id: `${session.id}-${Date.now()}`, name: `Запись_${new Date().toLocaleTimeString('ru-RU').replace(/:/g, '-')}.webm`, mimeType: blob.type, size: blob.size, blob });
        stream.getTracks().forEach(track => track.stop());
        setRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      onChange({ error: 'Браузер не дал доступ к микрофону. Разрешите микрофон или загрузите готовый аудиофайл.' });
    }
  };

  return (
    <div className="tw-person-input">
      <div className="tw-now-typing"><span>Сейчас типируем:</span><input value={session.name} onChange={e => onChange({ name: e.target.value })} aria-label="Имя участника" /></div>
      <p className="tw-lead">Напишите или расскажите несколько реальных историй: как выбираете, спорите, планируете, ошибаетесь и восстанавливаетесь.</p>

      <div className="tw-input-card">
        <div className="tw-input-toolbar">
          <button onClick={() => setShowQuestions(!showQuestions)}><CircleHelp size={17} /> {showQuestions ? 'Скрыть темы' : 'Темы для рассказа'}</button>
          <label><FileAudio size={17} /> Добавить файл<input type="file" accept="audio/*,.mp3,.ogg,.wav,.m4a,.webm,.txt,.md,.json,.csv" multiple onChange={e => { void addFiles(e.target.files); e.target.value = ''; }} /></label>
          <button className={recording ? 'is-recording' : ''} onClick={toggleRecording}>{recording ? <Square size={15} /> : <Mic size={17} />} {recording ? 'Остановить' : 'Записать'}</button>
        </div>

        {showQuestions && <div className="tw-question-bank">{QUESTIONS.map((question, index) => <button key={question} onClick={() => onChange({ text: `${session.text}${session.text ? '\n\n' : ''}${index + 1}. ${question}\n` })}><b>{index + 1}</b>{question}</button>)}</div>}

        <textarea value={session.text} onChange={e => onChange({ text: e.target.value, error: undefined })} placeholder="Начните с конкретной ситуации: что произошло, что вы подумали, что сделали и почему…" />
        <div className="tw-text-meta"><span>{wordCount} слов</span><span>{wordCount < 120 ? 'Для точности полезно 200–500 слов' : 'Материала уже достаточно для первой гипотезы'}</span></div>
      </div>

      <label
        className={`tw-drop-zone ${dragging ? 'is-dragging' : ''}`}
        onDragEnter={event => { event.preventDefault(); setDragging(true); }}
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
        onDrop={event => { event.preventDefault(); setDragging(false); void addFiles(event.dataTransfer.files); }}
      >
        <input type="file" accept="audio/*,.mp3,.ogg,.wav,.m4a,.webm,.txt,.md,.json,.csv" multiple onChange={event => { void addFiles(event.target.files); event.target.value = ''; }} />
        <UploadCloud size={27} />
        <span><b>Перетащите файлы сюда</b><small>Аудио, TXT, Markdown, JSON, CSV или готовый ответ ИИ</small></span>
        <em><FileText size={15} /> Выбрать</em>
      </label>

      <div className={`tw-audio-box ${audioCapable ? 'is-omni' : 'is-text-model'}`}>
        <div className="tw-audio-title"><AudioLines size={18} /><div><b>{audioCapable ? 'Режим по голосу · OMNI' : 'Аудио для текстовой модели'}</b><span>{audioCapable ? 'Оригинал аудио анализируется как отдельный источник. Если в записи несколько людей, кратко опишите нужный голос.' : 'DeepSeek не слышит звук напрямую. Аудио сохранится в сессии, но для точного типирования добавьте расшифровку или текстовый рассказ.'}</span></div></div>
        {audioCapable && <input value={session.voiceGuide} onChange={e => onChange({ voiceGuide: e.target.value })} placeholder="Например: анализируем женский голос Анны; мужской голос задаёт вопросы" />}
        {session.audio.length > 0 && <div className="tw-audio-list">{session.audio.map(audio => <div key={audio.id}><FileAudio size={15} /><span>{audio.name}</span><small>{(audio.size / 1024 / 1024).toFixed(1)} МБ</small><progress max="100" value="100" aria-label={`${audio.name} загружен на 100%`} /><em>100%</em><button onClick={() => onRemoveAudio(audio)} aria-label={`Удалить ${audio.name}`}><X size={15} /></button></div>)}</div>}
      </div>

      {session.error && <div className="tw-error">{session.error}</div>}

      <button className="tw-analyze-button" onClick={onAnalyze} disabled={!ready || (useIncluded && session.attemptsLeft <= 0)}>
        <WandSparkles size={21} /><span>Анализировать</span><em>{useIncluded ? (session.attemptsLeft > 0 ? `−1 попытка · останется ${session.attemptsLeft - 1}` : 'нужен код') : 'свой API · без лимита сайта'}</em>
      </button>
      <p className="tw-one-click">Одно нажатие запускает весь анализ. Дополнительного подтверждения не будет.{debugConsent ? ' Копия материалов сохранится для отладки на 7 дней.' : ''}</p>
    </div>
  );
};

const QuickApiConnect: React.FC<{
  value: ByokSettings;
  onChange: (value: ByokSettings) => void;
  onAdvanced: () => void;
}> = ({ value, onChange, onAdvanced }) => {
  const [provider, setProvider] = useState<ByokSettings['provider']>(value.provider);
  const [key, setKey] = useState(value.key);
  const connectedNow = value.mode === 'byok' && activeConnections(value).length > 0;
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>(connectedNow ? 'ok' : 'idle');
  const [message, setMessage] = useState(value.mode === 'byok' && value.key ? `Подключено: ${value.model}` : '');

  const connect = async () => {
    const defaults = provider === 'custom' ? { baseUrl: value.baseUrl, model: value.model } : BYOK_DEFAULTS[provider];
    const candidate: ByokSettings = { ...value, ...defaults, mode: 'byok', provider, key: key.trim() };
    setStatus('checking');
    setMessage('Проверяем ключ…');
    try {
      const checked = await validateByok(candidate);
      const model = checked.model || candidate.model;
      const connection = makeConnection(candidate, model);
      const previous = candidate.connections || [];
      const connections = [...previous.filter(item => !(item.provider === connection.provider && item.baseUrl === connection.baseUrl)), connection];
      const connected = { ...candidate, model, connections };
      onChange(connected);
      try { sessionStorage.setItem('indikov-typist-byok', JSON.stringify(connected)); } catch { /* приватный режим */ }
      setStatus('ok');
      setMessage(`Ключ работает · ${connected.model}`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Не удалось проверить ключ.');
    }
  };

  const disconnect = () => {
    onChange({ ...value, mode: 'included', key: '', connections: [] });
    setKey('');
    setStatus('idle');
    setMessage('');
    try { sessionStorage.removeItem('indikov-typist-byok'); } catch { /* приватный режим */ }
  };

  return <section className={`tw-quick-api ${status}`}>
    <div className="tw-quick-api-copy"><KeyRound size={20} /><div><span className="tw-kicker">Свой API · без лимита сайта</span><b>Вставьте ключ прямо здесь</b><small>Для друзей: Knyazev AI, Gemini, OpenAI, Claude, OpenRouter или другой совместимый API.</small></div></div>
    <div className="tw-quick-api-controls">
      <select value={provider} onChange={event => { setProvider(event.target.value as ByokSettings['provider']); setStatus('idle'); }} aria-label="Провайдер API">
        <option value="knyazev">Knyazev AI / Gonka</option><option value="routerai">RouterAI · Mercury 2.5 · экономно</option><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic Claude</option><option value="openrouter">OpenRouter</option><option value="custom">Другой API</option>
      </select>
      <div className="tw-quick-api-key"><input type="password" autoComplete="off" value={key} onChange={event => { setKey(event.target.value); setStatus('idle'); }} placeholder={provider === 'knyazev' ? 'kn_live_…' : 'Вставьте API-ключ'} /><button onClick={connect} disabled={!key.trim() || status === 'checking'}>{status === 'checking' ? <LoaderCircle size={17} className="tw-spin" /> : 'Подключить'}</button></div>
      <button className="tw-quick-api-more" onClick={onAdvanced}>Скриншоты и другие настройки</button>
    </div>
    {connectedNow && <div className="tw-api-squares" aria-label="API подключён: 10 активных индикаторов">{Array.from({ length: 10 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 90}ms` }} />)}</div>}
    {message && <div className="tw-quick-api-message">{status === 'ok' && <CheckCircle2 size={16} />}<span>{message}</span>{status === 'ok' && <button onClick={disconnect}>Отключить все</button>}</div>}
  </section>;
};

const WaitingCard: React.FC<{ session: PersonSession; onCancel: () => void; transferProgress: number }> = ({ session, onCancel, transferProgress }) => {
  const [seconds, setSeconds] = useState(0);
  const [wisdomIndex, setWisdomIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(Math.max(0, Math.floor((Date.now() - (session.analysisStartedAt || Date.now())) / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [session.analysisStartedAt]);
  useEffect(() => {
    const timer = window.setInterval(() => setWisdomIndex(value => (value + 1) % WISDOM_TIPS.length), 9000);
    return () => window.clearInterval(timer);
  }, []);
  const definitions = [...REININ_GUIDE.map(item => ({ id: item.id, label: item.title })), { id: 'quadra-spirit', label: 'Дух квадры' }, ...ASPECT_GUIDE.map(item => ({ id: item.id, label: item.name }))];
  const stages: PipelineStage[] = definitions.map(item => session.liveStages?.find(stage => stage.id === item.id) || { ...item, status: 'waiting', note: 'Ожидает назначения сервером' });
  const final = session.liveStages?.find(stage => stage.id === 'final');
  const done = stages.filter(stage => stage.status === 'done').length;
  const failed = stages.filter(stage => stage.status === 'warning').length;
  const percent = Math.round((done + failed + (final?.status === 'done' ? 1 : 0)) / 25 * 100);
  const models = [...new Set(stages.map(stage => stage.model).filter(Boolean))];
  return <div className="tw-waiting">
    <div className="tw-waiting-top"><div><span className="tw-kicker">ИИ работает</span><h3>{session.name} · {done}/24 ответов</h3></div><span><Clock3 size={17} /> {seconds} сек.</span></div>
    <div className="tw-transfer-progress"><div><span>{transferProgress < 100 ? 'Подготовка аудиофайлов' : session.jobId ? 'Задание принято сервером' : 'Отправка и проверка материалов'}</span><b>{transferProgress}%</b></div><progress max="100" value={transferProgress} /></div>
    <div className="tw-analysis-meter"><div><span>Обработано этапов{failed ? ' · ошибок: ' + failed : ''}</span><b>{percent}%</b></div><progress max="100" value={percent} /><small>24 проверки + синтез. Процент меняется только по событиям сервера.</small></div>
    {session.error && <div className="tw-inline-warning">{session.error}</div>}
    <div className="tw-model-mix">{models.map(model => <span key={model}><b>{model}</b><small>{stages.filter(stage => stage.model === model).length} проверок</small></span>)}</div>
    <AnalysisPipeline stages={stages} compact />
    <AnalysisPipeline stages={[final || { id: 'final', label: 'Синтез и критик', status: 'waiting', note: 'Ожидает ответы проверок' }]} />
    <p>Можно обновить страницу: задание и его результаты доступны в этом браузере в течение суток. Через 3:30 откроется предварительная справочная версия, если ИИ ещё работает.</p>
    <WisdomScroll compact index={wisdomIndex} onIndex={setWisdomIndex} />
    <LogConsole logs={session.clientLogs} name={session.name} />
    <button className="tw-cancel-analysis" onClick={onCancel}><Square size={15} /> Остановить анализ</button>
  </div>;
};

type ReadySession = PersonSession & { result: NonNullable<PersonSession['result']> };
const pairData = (a: ReadySession, b: ReadySession) => {
  const second = new Map(b.result.dichotomies.map(item => [item.name, item.result]));
  const rows = a.result.dichotomies.filter(item => second.has(item.name)).map(item => ({ name: item.name, a: item.result, b: second.get(item.name), same: item.result === second.get(item.name) }));
  const sameCount = rows.filter(row => row.same).length;
  const relation = relationFor(a.result.tim.abbreviation, b.result.tim.abbreviation);
  return { a, b, rows, relation, score: rows.length ? Math.round(sameCount / rows.length * 100) : 0 };
};

const MatchPanel: React.FC<{ sessions: PersonSession[] }> = ({ sessions }) => {
  const ready = sessions.filter(item => item.result && !item.result.randomFallback) as ReadySession[];
  const [selectedA, setSelectedA] = useState('');
  const [selectedB, setSelectedB] = useState('');
  if (ready.length < 2) return null;
  const combinations = ready.flatMap((a, index) => ready.slice(index + 1).map(b => pairData(a, b)));
  const chosenA = ready.find(item => item.id === selectedA) || ready[0];
  const chosenB = ready.find(item => item.id === selectedB && item.id !== chosenA.id) || ready.find(item => item.id !== chosenA.id)!;
  const chosen = pairData(chosenA, chosenB);
  if (ready.length <= 4) return <section className="tw-match">
    <div className="tw-match-head"><div><span className="tw-kicker">Мэтчинг всех со всеми</span><h2>{combinations.length} пар</h2></div><p>Для 3–4 участников автоматически сравниваем каждую возможную пару.</p></div>
    <div className="tw-match-cards">{combinations.map(pair => <article key={`${pair.a.id}-${pair.b.id}`}>
      <span>{pair.a.name} × {pair.b.name}</span><b>{pair.score}% совпадений</b><small>{pair.a.result.tim.abbreviation} · {pair.b.result.tim.abbreviation}</small>
      {pair.relation && <p><strong>{pair.relation.name}</strong>{pair.relation.description}</p>}
    </article>)}</div>
    <p className="tw-disclaimer">Это карта различий информационных привычек, а не оценка любви или качества отношений.</p>
  </section>;
  return <section className="tw-match">
    <div className="tw-match-head"><div><span className="tw-kicker">Выберите пару</span><h2>Сравнение участников</h2></div><div className="tw-match-selects"><select value={chosenA.id} onChange={e => setSelectedA(e.target.value)}>{ready.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><span>×</span><select value={chosenB.id} onChange={e => setSelectedB(e.target.value)}>{ready.filter(item => item.id !== chosenA.id).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div>
    <div className="tw-match-people"><article><span>{chosen.a.name}</span><b>{chosen.a.result.tim.name}</b><em>{chosen.a.result.tim.abbreviation}</em></article><Sparkles /><article><span>{chosen.b.name}</span><b>{chosen.b.result.tim.name}</b><em>{chosen.b.result.tim.abbreviation}</em></article></div>
    {chosen.relation && <div className="tw-relation"><b>{chosen.relation.name}</b><p>{chosen.relation.description}</p></div>}
    <div className="tw-match-grid">{chosen.rows.map(row => <div key={row.name} className={row.same ? 'same' : 'different'}><span>{row.name}</span><b>{row.same ? 'совпадают' : 'различаются'}</b><small>{row.a} · {row.b}</small></div>)}</div>
    <p className="tw-disclaimer">Мэтчинг показывает различия информационных привычек. Он не измеряет любовь, профессиональную пригодность или «качество» отношений.</p>
  </section>;
};

export const TypistWorkbench: React.FC = () => {
  const [restoring, setRestoring] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const initial = useMemo(() => loadSessions(), []);
  const [sessions, setSessions] = useState<PersonSession[]>(initial.sessions.length ? initial.sessions : [makeSession(1)]);
  const [activeId, setActiveId] = useState(initial.activeId || sessions[0].id);
  const [apiOpen, setApiOpen] = useState(false);
  const [byok, setByok] = useState<ByokSettings>(() => {
    try { return { ...DEFAULT_BYOK, ...JSON.parse(sessionStorage.getItem('indikov-typist-byok') || '{}') }; }
    catch { return DEFAULT_BYOK; }
  });
  const [persona, setPersona] = useState<TypistPersona>(() => {
    try { return { ...DEFAULT_PERSONA, ...JSON.parse(localStorage.getItem('indikov-typist-persona') || '{}') }; }
    catch { return DEFAULT_PERSONA; }
  });
  const [debugConsent, setDebugConsent] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [codeStatus, setCodeStatus] = useState('');
  const [hasActivatedCode, setHasActivatedCode] = useState(false);
  const [upgrades, setUpgrades] = useState<Record<string, number | null>>({});
  const [transferProgress, setTransferProgress] = useState<Record<string, number>>({});
  const [backgroundAi, setBackgroundAi] = useState<Record<string, boolean>>({});
  const sessionsRef = useRef(sessions);
  const fallbackTimers = useRef<Record<string, number>>({});
  const upgradeTimers = useRef<Record<string, number>>({});
  const analysisControllers = useRef<Record<string, AbortController>>({});

  useEffect(() => { sessionsRef.current = sessions; if (!restoring) saveSessions(sessions, activeId); }, [sessions, activeId, restoring]);
  useEffect(() => { try { localStorage.setItem('indikov-typist-persona', JSON.stringify(persona)); } catch { /* приватный режим */ } }, [persona]);
  useEffect(() => {
    try {
      if (byok.mode === 'byok' && byok.key) sessionStorage.setItem('indikov-typist-byok', JSON.stringify(byok));
      else sessionStorage.removeItem('indikov-typist-byok');
    } catch { /* приватный режим браузера */ }
  }, [byok]);
  useEffect(() => {
    let mounted = true;
    restoreSessions().then(snapshot => {
      if (!mounted || !snapshot.sessions.length) return;
      const restored = snapshot.sessions.map(item => item.status === 'analyzing' && !item.jobId ? { ...item, status: 'draft' as const, error: 'Предыдущий запрос прервался. Материалы сохранены; можно запустить снова.' } : item);
      setSessions(restored);
      setActiveId(restored.some(item => item.id === snapshot.activeId) ? snapshot.activeId! : restored[0].id);
    }).catch(() => undefined).finally(() => { if (mounted) setRestoring(false); });
    const onStorageError = () => setStorageError(true);
    window.addEventListener('typist-storage-error', onStorageError);
    return () => { mounted = false; window.removeEventListener('typist-storage-error', onStorageError); };
  }, []);
  useEffect(() => {
    if (!restoring) getUsageStatus().then(usage => setSessions(current => current.map(item => ({ ...item, attemptsLeft: usage.attemptsLeft, questionsLeft: usage.questionsLeft })))).catch(() => undefined);
  }, [restoring]);
  useEffect(() => () => {
    Object.values(fallbackTimers.current).forEach(window.clearTimeout);
    Object.values(upgradeTimers.current).forEach(window.clearInterval);
    Object.values(analysisControllers.current).forEach(controller => controller.abort());
  }, []);

  const update = (id: string, patch: Partial<PersonSession>) => setSessions(current => current.map(session => session.id === id ? { ...session, ...patch } : session));
  const appendLog = (id: string, entry: unknown) => setSessions(current => current.map(session => {
    if (session.id !== id) return session;
    const seq = Number((entry as { seq?: number })?.seq) || 0;
    if (seq && seq <= (session.eventCursor || 0)) return session;
    const next = [...(session.clientLogs || []), JSON.stringify({ at: new Date().toISOString(), ...((typeof entry === 'object' && entry) ? entry : { message: entry }) })];
    const encoder = new TextEncoder();
    let bytes = next.reduce((sum, item) => sum + encoder.encode(item).length + 1, 0);
    while (bytes > 1024 * 1024 && next.length) bytes -= encoder.encode(next.shift()!).length + 1;
    const event = entry as { stage?: PipelineStage; event?: string; stages?: PipelineStage[] };
    const liveStages = event.event === 'probe.status' && event.stage ? [...(session.liveStages || []).filter(stage => stage.id !== event.stage!.id), event.stage] : event.event === 'analysis.plan' && event.stages ? event.stages : session.liveStages;
    return { ...session, clientLogs: next, liveStages, eventCursor: seq || session.eventCursor };
  }));

  const addAudio = async (sessionId: string, audio: StoredAudio) => {
    await saveAudio(audio).catch(() => undefined);
    setSessions(current => current.map(session => session.id === sessionId ? { ...session, audio: [...session.audio, audio], error: undefined } : session));
  };

  useEffect(() => {
    if (restoring) return;
    sessionsRef.current.forEach(session => {
      if (!session.jobId || session.aiResult || analysisControllers.current[session.id]) return;
      const controller = new AbortController();
      analysisControllers.current[session.id] = controller;
      setBackgroundAi(current => ({ ...current, [session.id]: true }));
      update(session.id, { status: session.result ? 'local-ready' : 'analyzing', error: undefined });
      const remaining = Math.max(0, FALLBACK_AFTER_MS - (Date.now() - (session.analysisStartedAt || Date.now())));
      fallbackTimers.current[session.id] = window.setTimeout(() => {
        const latest = sessionsRef.current.find(item => item.id === session.id);
        if (latest?.status === 'analyzing') update(session.id, { status: 'local-ready', result: session.localResult || runLocalTypist(session.text, session.id) });
      }, remaining);
      pollAnalysis(session.jobId, controller.signal, entry => appendLog(session.id, entry)).then(response => {
        update(session.id, { result: response.result, aiResult: response.result, status: 'ai-ready', error: undefined });
      }).catch(error => {
        if (!controller.signal.aborted) update(session.id, { status: 'draft', error: `Не удалось восстановить задание: ${error instanceof Error ? error.message : String(error)}` });
      }).finally(() => {
        clearTimeout(fallbackTimers.current[session.id]);
        setBackgroundAi(current => ({ ...current, [session.id]: false }));
        delete analysisControllers.current[session.id];
      });
    });
  }, [restoring]);

  const removeAudio = async (sessionId: string, audio: StoredAudio) => {
    await deleteAudio([audio.id]).catch(() => undefined);
    setSessions(current => current.map(session => session.id === sessionId ? { ...session, audio: session.audio.filter(item => item.id !== audio.id) } : session));
  };

  const startUpgradeCountdown = (sessionId: string) => {
    window.clearInterval(upgradeTimers.current[sessionId]);
    setUpgrades(current => ({ ...current, [sessionId]: 5 }));
    upgradeTimers.current[sessionId] = window.setInterval(() => {
      setUpgrades(current => {
        const value = current[sessionId];
        if (value == null) return current;
        if (value <= 1) {
          window.clearInterval(upgradeTimers.current[sessionId]);
          const latest = sessionsRef.current.find(item => item.id === sessionId);
          if (latest?.aiResult) update(sessionId, { result: latest.aiResult, status: 'ai-ready' });
          return { ...current, [sessionId]: null };
        }
        return { ...current, [sessionId]: value - 1 };
      });
    }, 1000);
  };

  const analyze = async (session: PersonSession, lockedDichotomies: Record<string, string> = {}, lockedPsychosophy: Record<string, unknown> = {}, preferredTim?: string) => {
    if (session.jobId && backgroundAi[session.id]) {
      try { await cancelJob(session.jobId); } catch { update(session.id, { error: 'Сначала дождитесь подтверждения остановки текущего задания.' }); return; }
    }
    const analysisStartedAt = Date.now();
    analysisControllers.current[session.id]?.abort();
    const controller = new AbortController();
    analysisControllers.current[session.id] = controller;
    const local = runLocalTypist(session.text, session.id);
    appendLog(session.id, { event: 'analysis.start', participant: session.name, textChars: session.text.length, audioFiles: session.audio.length, providers: activeConnections(byok).map(item => ({ label: item.label, policy: item.policy, model: item.model })) });
    setBackgroundAi(current => ({ ...current, [session.id]: true }));
    setTransferProgress(current => ({ ...current, [session.id]: session.audio.length ? 0 : 100 }));
    const attemptsLeft = session.attemptsLeft;
    update(session.id, { analysisStartedAt, liveStages: [], jobId: undefined, eventCursor: 0, clientLogs: [] });
    if (byok.mode === 'included') {
      setSessions(current => current.map(item => ({ ...item, attemptsLeft, ...(item.id === session.id ? { status: 'analyzing' as const, result: null, localResult: local, aiResult: null, error: undefined } : {}) })));
    } else {
      update(session.id, { status: 'analyzing', result: null, localResult: local, aiResult: null, error: undefined });
    }
    fallbackTimers.current[session.id] = window.setTimeout(() => {
      const latest = sessionsRef.current.find(item => item.id === session.id);
      if (latest?.status === 'analyzing') update(session.id, { result: local, status: 'local-ready' });
    }, FALLBACK_AFTER_MS);

    try {
      const audioItems = session.audio.filter(item => item.blob);
      if (byok.omniEnabled !== false && audioItems.length !== session.audio.length) throw new Error('Часть аудиофайлов недоступна в браузере. Добавьте их повторно перед анализом.');
      const progressById: Record<string, number> = {};
      const reportProgress = () => {
        const total = audioItems.reduce((sum, item) => sum + item.size, 0) || 1;
        const loaded = audioItems.reduce((sum, item) => sum + item.size * ((progressById[item.id] || 0) / 100), 0);
        setTransferProgress(current => ({ ...current, [session.id]: Math.min(100, Math.round((loaded / total) * 100)) }));
      };
      const audio: Array<{ name: string; mimeType: string; base64: string }> = [];
      if (byok.omniEnabled !== false) for (const item of audioItems) audio.push(await prepareAudio(item, percent => { progressById[item.id] = percent; reportProgress(); }));
      setTransferProgress(current => ({ ...current, [session.id]: 100 }));
      const response = await requestAnalysis({ sessionId: session.id, name: session.name, text: session.text, voiceGuide: session.voiceGuide, audio, byok, debugConsent, lockedDichotomies, lockedPsychosophy, preferredTim, signal: controller.signal, onLog: entry => appendLog(session.id, entry), onJob: id => update(session.id, { jobId: id }) });
      (response.result.probeResults || []).forEach(probe => appendLog(session.id, { event: 'probe.response', probe }));
      appendLog(session.id, { event: 'analysis.complete', traceId: response.result.debugTraceId, tim: response.result.tim, confidence: response.result.confidence, randomFallback: response.result.randomFallback });
      window.clearTimeout(fallbackTimers.current[session.id]);
      const latest = sessionsRef.current.find(item => item.id === session.id);
      if (latest?.result?.source === 'local') {
        const remaining = response.attemptsLeft ?? attemptsLeft;
        setSessions(current => current.map(item => ({ ...item, attemptsLeft: byok.mode === 'included' ? remaining : item.attemptsLeft, ...(item.id === session.id ? { aiResult: response.result, status: 'local-ready' as const } : {}) })));
        startUpgradeCountdown(session.id);
      } else {
        const remaining = response.attemptsLeft ?? attemptsLeft;
        setSessions(current => current.map(item => ({ ...item, attemptsLeft: byok.mode === 'included' ? remaining : item.attemptsLeft, ...(item.id === session.id ? { result: response.result, aiResult: response.result, status: 'ai-ready' as const } : {}) })));
      }
    } catch (error) {
      appendLog(session.id, { event: 'analysis.error', error: error instanceof Error ? error.message : String(error) });
      window.clearTimeout(fallbackTimers.current[session.id]);
      if (controller.signal.aborted) {
        update(session.id, { status: 'draft', error: 'Анализ остановлен. Материалы сохранены.' });
      } else {
        update(session.id, { status: 'draft', error: error instanceof Error ? error.message : 'Ошибка сети. Материалы сохранены.' });
      }
    } finally {
      setBackgroundAi(current => ({ ...current, [session.id]: false }));
      if (analysisControllers.current[session.id] === controller) delete analysisControllers.current[session.id];
      getUsageStatus().then(usage => setSessions(current => current.map(item => ({ ...item, attemptsLeft: usage.attemptsLeft })))).catch(() => undefined);
    }
  };

  const cancelAnalysis = async (session: PersonSession) => {
    if (session.jobId) {
      try { await cancelJob(session.jobId); } catch { update(session.id, { error: 'Сервер пока не подтвердил остановку. Попробуйте ещё раз.' }); return false; }
    }
    window.clearTimeout(fallbackTimers.current[session.id]);
    analysisControllers.current[session.id]?.abort();
    setBackgroundAi(current => ({ ...current, [session.id]: false }));
    update(session.id, { status: 'draft', jobId: undefined, error: 'Анализ остановлен. Материалы сохранены.' });
    return true;
  };

  const restart = async (session: PersonSession) => {
    if (backgroundAi[session.id] && !await cancelAnalysis(session)) return;
    update(session.id, { status: 'draft', result: null, localResult: null, aiResult: null, error: undefined, jobId: undefined, liveStages: [], analysisStartedAt: undefined });
  };

  const addPerson = () => {
    if (sessions.length >= 8) return;
    const next = makeSession(Math.max(0, ...sessions.map(item => Number(item.name.match(/\d+$/)?.[0]) || 0)) + 1);
    setSessions(current => [next, ...current]);
    setActiveId(next.id);
  };

  const activateCode = async () => {
    setCodeStatus('Проверяю код…');
    try {
      const credits = await redeemAccessCode(accessCode);
      setSessions(current => current.map(item => ({ ...item, attemptsLeft: credits.attemptsLeft, questionsLeft: credits.questionsLeft })));
      setAccessCode('');
      setHasActivatedCode(true);
      setCodeStatus(`Готово: ${credits.attemptsLeft} анализов и ${credits.questionsLeft} вопросов.`);
    } catch (error) {
      setCodeStatus(error instanceof Error ? error.message : 'Не удалось активировать код.');
    }
  };

  const removePerson = async (session: PersonSession) => {
    if (backgroundAi[session.id] && !await cancelAnalysis(session)) return;
    await deleteAudio(session.audio.map(item => item.id)).catch(() => undefined);
    const remaining = sessionsRef.current.filter(item => item.id !== session.id);
    const replacement = remaining.length ? remaining : [makeSession(1)];
    setSessions(replacement);
    setActiveId(replacement[0].id);
  };

  if (restoring) return <div className="tw-app"><main className="tw-main"><p role="status">Восстанавливаем ваши материалы…</p></main></div>;
  return <div className="tw-app">
    <header className="tw-header">
      <a href="https://indikov.ru/typolog/" className="tw-wordmark" aria-label="Андрей Индыков — Indikov.ru">
        <span className="tw-wordmark-name"><b>A.</b><span><i>И</i>ндыков</span></span>
        <span className="tw-wordmark-url"><b>A.</b><u><span><i>I</i>ndikov</span><small>.ru</small></u></span>
      </a>
      <div className="tw-header-actions">
        <span className="tw-lives" aria-label={`Использовано ${Math.max(0, 4 - (sessions[0]?.attemptsLeft ?? 0))} из 4 попыток`}>
          {[0, 1, 2, 3].map(index => {
            const used = index < Math.max(0, 4 - (sessions[0]?.attemptsLeft ?? 0));
            return <i key={index} className={used ? 'is-used' : ''}>{used ? '＊' : ''}</i>;
          })}
        </span>
        <button className={byok.mode === 'byok' && activeConnections(byok).length ? 'is-api-connected' : ''} onClick={() => setApiOpen(true)}><KeyRound size={17} /> {byok.mode === 'byok' && activeConnections(byok).length ? `API подключёно · ${activeConnections(byok).length}` : 'Подключение своего API'}</button>
      </div>
    </header>

    <main className={`tw-main ${sessions.some(item => item.status !== 'draft') ? 'has-progress' : ''}`}>
      {storageError && <div className="tw-inline-warning">Браузер не смог сохранить данные. Скачайте архив перед закрытием страницы.</div>}
      <div className="tw-title-row">
        <div><span className="tw-kicker">Типирование с явными сомнениями</span><h1>НейроТипировщик</h1><h2 className="tw-subtitle">Проверяем гипотезы.<br />Показываем, где сомневаемся.</h2><p>Пятнадцать признаков Рейнина, дух квадры и восемь аспектов проверяются отдельно, затем ИИ сравнивает альтернативы и критикует итог. Если ответ задержится, через 3 минуты 30 секунд появится локальная предварительная версия. Процент показывает завершённые проверки, а не оставшееся время.</p></div>
        <div className="tw-trust-card"><ShieldCheck /><b>Ваши материалы разделены по людям</b><span>Ответы и аудио Анны никогда не смешиваются с материалами второго участника.</span></div>
      </div>

      <QuickApiConnect value={byok} onChange={setByok} onAdvanced={() => setApiOpen(true)} />

      <PersonaStudio value={persona} onChange={setPersona} />

      <div className="tw-session-strip">
        <div><Users size={18} />{sessions.map(session => <button key={session.id} className={activeId === session.id ? 'is-active' : ''} onClick={() => setActiveId(session.id)}>{session.name}<span>{backgroundAi[session.id] ? 'ИИ работает' : session.result ? session.result.tim.abbreviation : 'анкета'}</span></button>)}</div>
        {sessions.length < 8 && <button onClick={addPerson}><Plus size={17} /> Добавить человека</button>}
      </div>

      <div className={`tw-people-grid ${sessions.length > 1 ? 'is-pair' : ''} ${sessions.length > 2 ? 'is-many' : ''}`}>
        {sessions.map((session, index) => <article key={session.id} className={`tw-person-panel ${activeId === session.id ? 'is-active' : ''}`}>
          <div className="tw-person-panel-label"><span><Users size={15} /></span>{session.name}<div><button title={session.collapsed ? 'Развернуть участника' : 'Свернуть участника'} onClick={() => update(session.id, { collapsed: !session.collapsed })} aria-label={session.collapsed ? 'Развернуть' : 'Свернуть'}>{session.collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}</button><button title="Удалить участника и его материалы" onClick={() => removePerson(session)} aria-label="Удалить участника"><Trash2 size={15} /></button></div></div>
          {!session.collapsed && <>
          {session.status === 'draft' && <PersonInput session={session} debugConsent={debugConsent} useIncluded={byok.mode === 'included'} audioCapable={byok.omniEnabled !== false && (activeConnections(byok).some(item => item.omniCapable) || /(?:gemini|gpt-4o-audio|omni)/i.test(byok.model))} onChange={patch => update(session.id, patch)} onAddAudio={audio => addAudio(session.id, audio)} onRemoveAudio={audio => removeAudio(session.id, audio)} onAnalyze={() => analyze(session)} />}
          {session.status === 'analyzing' && <WaitingCard session={session} transferProgress={transferProgress[session.id] ?? 100} onCancel={() => { void cancelAnalysis(session); }} />}
          {(session.status === 'local-ready' || session.status === 'ai-ready' || session.status === 'error') && <>
            {session.error && <div className="tw-inline-warning">{session.error}</div>}
            <TypistResultCard session={session} allSessions={sessions} byok={byok} persona={persona} aiPending={!!backgroundAi[session.id]} upgradeCountdown={upgrades[session.id]} onCancelUpgrade={() => { window.clearInterval(upgradeTimers.current[session.id]); setUpgrades(current => ({ ...current, [session.id]: null })); }} onShowAi={() => session.aiResult && update(session.id, { result: session.aiResult, status: 'ai-ready' })} onRestart={() => restart(session)} onRetry={(locked, psych, preferredTim) => analyze(session, locked, psych, preferredTim)} onQuestionsLeft={value => setSessions(current => current.map(item => ({ ...item, questionsLeft: value })))} />
          </>}
          </>}
        </article>)}
      </div>

      <MatchPanel sessions={sessions} />

      <TypistFieldGuide />

      <section className="tw-beta-storage">
        <div><Archive size={20} /><div><b>Восстановление и журнал</b><span>Задание и его журнал доступны на этом устройстве в течение суток. Для продолжения после перезагрузки сервер временно хранит текст и ключи в зашифрованном виде. Исходное аудио остаётся в браузере; при включённом аудиоанализе оно передаётся выбранному провайдеру. Технические журналы Cloudflare могут храниться дольше. Сохраните нужный результат в архив.</span></div></div>
        <label><input type="checkbox" checked={debugConsent} onChange={e => setDebugConsent(e.target.checked)} /><span>Включать полные промпты в отладочные журналы (они содержат текст анкеты)</span></label>
      </section>

      <section className="tw-payment-card">
        <div className="tw-payment-icon"><CreditCard /></div><div><span className="tw-kicker">{hasActivatedCode ? 'Спасибо за поддержку' : 'Пакеты без регистрации'}</span><h2>{hasActivatedCode ? 'Поддержите автора любой суммой' : 'Перевёл → прислал скриншот → получил код → ввёл'}</h2><p>{hasActivatedCode ? <>Если типировщик оказался полезным, можно перевести любую сумму по номеру +79684494137 в «ЮМани» по СБП или в Telegram <a href="https://t.me/Andreyjurievich" target="_blank" rel="noreferrer">@Andreyjurievich</a> с помощью Кошелька.</> : <>Для доп типирований с полным промптом оплата по номеру +79684494137 банк «ЮМани» по СБП или в тг <a href="https://t.me/Andreyjurievich" target="_blank" rel="noreferrer">https://t.me/Andreyjurievich</a> с помощью Кошелька.</>}</p></div>{!hasActivatedCode && <button onClick={() => setPaymentOpen(!paymentOpen)}>У меня есть код</button>}
        {!hasActivatedCode && <div className="tw-price-grid">
          <article><b>100 ₽</b><span>1 анализ</span><small>первое типирование</small></article>
          <article><b>200 ₽</b><span>3 анализа</span><small>для себя и друзей</small></article>
          <article><b>800 ₽</b><span>15 анализов</span><small>для практики</small></article>
          <article><b>4 000 ₽</b><span>100 анализов</span><small>для типолога</small></article>
        </div>}
        <div className="tw-payment-contacts"><a href="tel:+79684494137">ЮMoney / СБП: +7 968 449-41-37</a><a href="https://t.me/Andreyjurievich" target="_blank" rel="noreferrer">Написать Андрею в Telegram ↗</a></div>
        {paymentOpen && <div className="tw-code-redeem"><input value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX" /><button onClick={activateCode} disabled={accessCode.replace(/[^A-Z0-9]/g, '').length < 8}>Активировать</button>{codeStatus && <span>{codeStatus}</span>}</div>}
      </section>
    </main>

    <ApiSetupSheet open={apiOpen} value={byok} onChange={setByok} onClose={() => setApiOpen(false)} />
  </div>;
};
