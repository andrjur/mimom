import {apiUrl} from './api';
import {PreviousAnswer,CorrectAnswer,GradedAnswer} from './components/PreviousAnswer';
import {migrateGeometry} from './geometry';
import {AnswerEditor,checkAnswer} from './components/AnswerEditor';
import {Personalization,TeacherGate,PersonalProfile,rewardProgress} from './components/Personalization';
import {SplitDeck} from './components/SplitDeck';
import {getDeckFacts} from './facts';
import {DeckWizard} from './components/DeckWizard';
import {syncSharedTracker} from './components/FriendsPanel';
import {markVisit,readCells} from './trackerStore';
import {CardContent} from './components/CardContent';
import {QuickAiSetup} from './components/QuickAiSetup';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sidebar, ViewType } from './components/Sidebar';
import { TeacherView } from './components/TeacherView';
import { TrackerView } from './components/TrackerView';
import { DeckManager, DeckStatus, DeckStatusMap } from './components/DeckManager';
import { DeckPattern } from './components/DeckPattern';
import { DuolingoCelebration } from './components/DuolingoCelebration';
import { FactModal } from './components/FactModal';
import { AiSettingsModal } from './components/AiSettingsModal';
import { getDeckTheme, DEFAULT_DECK_THEME } from './deckThemes';
import { fetchCards, getTotalCardsCount } from './data';
import { CATALOG } from './catalogMeta';
import { Flashcard, User, UserAiConfig } from './types';
import { Settings, Sparkles, Upload, Flame, ChevronRight, Zap, RefreshCcw, Loader2, ThumbsUp, ThumbsDown, Minus, Trash2, AlertTriangle, Smile, Check, X, Bot, HelpCircle, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const mockUser: User = {
  name: 'Андрей',
  role: 'Студент',
  daysActive: 7,
  initials: 'АИ'
};

const jokesList = [
  {
    title: "Нейросеть и студент",
    text: [
      "- Я всё понял!",
      "- Отлично, а объяснить сможешь?",
      "- Сейчас спрошу у ИИ."
    ]
  },
  {
    title: "Дедукция на кухне",
    text: [
      "- В чём разница между дедукцией и индукцией?",
      "- Дедукция - это когда Шерлок знает всё заранее.",
      "- А индукция - это плита, на которой варится кофе студента."
    ]
  },
  {
    title: "Экзамен по логике",
    text: [
      "Профессор ставит студенту «отлично» без единого вопроса.",
      "- Но профессор, за что?",
      "- Закон достаточного основания: ты единственный пришел к 8:00."
    ]
  },
  {
    title: "Логик в буфете",
    text: [
      "Заходит логик в буфет и просит чай.",
      "Буфетчица: «Вам с сахаром или с лимоном?»",
      "Логик: «Да»."
    ]
  },
  {
    title: "Бритва Оккама",
    text: [
      "- Почему ты не сделал домашнее задание?",
      "- По принципу Оккама: не следует множить домашку без строгой необходимости."
    ]
  },
  {
    title: "Апория перед сессией",
    text: [
      "Сколько бы студент ни готовился к экзамену,",
      "до конца списка билетов всегда остаётся половина непрочитанного!"
    ]
  }
];

const readSaved = (key: string, fallback: any) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
export default function App() {
  const [teacher,setTeacher]=useState(()=>sessionStorage.getItem('study_teacher')==='true');
  const [gate,setGate]=useState(false),[personal,setPersonal]=useState(false),[splitTopic,setSplitTopic]=useState('');
  const afterUnlock=useRef<(()=>void)|null>(null);
  const requireTeacher=(action:()=>void)=>{if(teacher)action();else{afterUnlock.current=action;setGate(true);}};
  const navigate=(view:ViewType)=>{if(view==='teacher')requireTeacher(()=>setCurrentView(view));else setCurrentView(view);};
  const [profile,setProfile]=useState<PersonalProfile>(()=>readSaved('study_profile',{name:'Андрей',address:'',rewards:[]}));
  const [splitParents,setSplitParents]=useState<string[]>(()=>readSaved('study_split_parents',[]));
  const [factsByTopic,setFactsByTopic]=useState<Record<string,any[]>>(()=>readSaved('study_deck_facts',{}));
  const [checked,setChecked]=useState<boolean|null>(null);
  const [studentDraft,setStudentDraft]=useState('');
  const [previousAnswer,setPreviousAnswer]=useState<GradedAnswer|null>(null),[correcting,setCorrecting]=useState(false);
  const [answerSerial,setAnswerSerial]=useState(0);
  const submission=useRef(false),rewardBefore=useRef<any>(null),repeatDone=useRef(new Set<string>());

  useEffect(()=>{localStorage.setItem('study_profile',JSON.stringify(profile));},[profile]);
  useEffect(()=>{localStorage.setItem('study_split_parents',JSON.stringify(splitParents));},[splitParents]);
  useEffect(()=>{localStorage.setItem('study_deck_facts',JSON.stringify(factsByTopic));},[factsByTopic]);
  useEffect(()=>{markVisit();const id=setInterval(markVisit,60000);window.addEventListener('focus',markVisit);return()=>{clearInterval(id);window.removeEventListener('focus',markVisit);};},[]);
  useEffect(()=>{let timer:ReturnType<typeof setTimeout>;const sync=()=>{clearTimeout(timer);timer=setTimeout(()=>syncSharedTracker().catch(()=>{}),500);};sync();window.addEventListener('tracker-change',sync);window.addEventListener('storage',sync);return()=>{clearTimeout(timer);window.removeEventListener('tracker-change',sync);window.removeEventListener('storage',sync);};},[]);
  const [mixTopics, setMixTopics] = useState<string[]>(() => readSaved('mix_topics', []));
  const [mixEvery, setMixEvery] = useState<number>(() => readSaved('mix_every', 1));
  const [sessionSize, setSessionSize] = useState<number>(() => readSaved('study_session_size', 20));
  useEffect(() => { localStorage.setItem('study_session_size', JSON.stringify(sessionSize)); }, [sessionSize]);
  const [nextDeckOpen,setNextDeckOpen]=useState(false);
  const [roundKnownIds,setRoundKnownIds]=useState<Set<string>>(()=>new Set(readSaved('study_cards_v1',[]).filter((c:Flashcard)=>c.mastery==='known').map((c:Flashcard)=>c.id)));
  const [round, setRound] = useState(() => Date.now());
  const [sessionNumber, setSessionNumber] = useState(() => readSaved('study_rewards', { sessions: 0 }).sessions);
  const [rewards, setRewards] = useState(() => readSaved('study_rewards', { xp: 0, gems: 0, sessions: 0, dates: [] }));
  const streak = useMemo(() => { let count = 0; const day = new Date(); const dates = new Set(rewards.dates); if (!dates.has(day.toLocaleDateString('en-CA'))) day.setDate(day.getDate()-1); while(dates.has(day.toLocaleDateString('en-CA'))) { count++; day.setDate(day.getDate()-1); } return count; }, [rewards.dates]);
  const rewarded = useRef(false);
  useEffect(() => { localStorage.setItem('mix_topics', JSON.stringify(mixTopics)); localStorage.setItem('mix_every', JSON.stringify(mixEvery)); }, [mixTopics, mixEvery]);
  useEffect(() => { localStorage.setItem('study_rewards', JSON.stringify(rewards)); }, [rewards]);
  const [currentView, setCurrentView] = useState<ViewType>(()=>location.hash.includes('invite=')?'tracker':'learn');
  const [cards, setCards] = useState<Flashcard[]>(() => migrateGeometry(readSaved('study_cards_v1', []).filter((c: Flashcard) => !c.id.startsWith('img-'))));
  useEffect(() => { if (cards.length) localStorage.setItem('study_cards_v1', JSON.stringify(cards)); }, [cards]);
  useEffect(()=>{setProfile(p=>{let changed=false;const rewards=p.rewards.map(r=>{if(!r.earned&&r.title.trim()&&rewardProgress(r,cards)>=r.threshold){changed=true;return {...r,earned:true};}return r;});return changed?{...p,rewards}:p;});},[cards,profile.rewards]);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [generateCount, setGenerateCount] = useState(8);
  const [generateTopic, setGenerateTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [isLoadingCards, setIsLoadingCards] = useState(true);

  // Ask AI state
  const [askQuery, setAskQuery] = useState('');
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiAnswerQuery, setAiAnswerQuery] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  // Jokes state
  const [jokeIdx, setJokeIdx] = useState(0);
  const [smiled, setSmiled] = useState(false);

  // Selected topics for deck management
  const [selectedTopics, setSelectedTopics] = useState<string[]>(() => readSaved('study_selected_topics', []).filter((t:string)=>!['later','completed'].includes(readSaved('repetitor_deck_statuses_v1', {})[t])).slice(0,1));
  useEffect(() => { localStorage.setItem('study_selected_topics', JSON.stringify(selectedTopics)); }, [selectedTopics]);
  // In-session repeat queue for cards rated "Don't know"
  const [repeatQueue, setRepeatQueue] = useState<Flashcard[]>([]);
  // Track cards mastered during current session
  const [sessionMasteredCount, setSessionMasteredCount] = useState(0);

  // Fact modal state
  const [isFactModalOpen, setIsFactModalOpen] = useState(false);

  // User AI Configuration modal & state
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);
  const [userAiConfig, setUserAiConfig] = useState<UserAiConfig>(() => {
    try {
      const saved = localStorage.getItem('repetitor_user_ai_config_v1');
      if (saved) { const parsed = JSON.parse(saved); if(parsed.model==='gemini-2.5-flash')parsed.model='gemini-3.8-flash';if(parsed.model==='google/gemini-2.5-flash')parsed.model='google/gemini-3.8-flash';return { ...parsed, apiKey: sessionStorage.getItem('study_ai_key') || parsed.apiKey || '' }; }
    } catch (e) {}
    return {
      enabled: true,
      format: 'gemini',
      endpoint: 'https://generativelanguage.googleapis.com',
      apiKey: '',
      model: 'gemini-3.8-flash'
    };
  });

  // Save AI config to localStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('study_ai_key', userAiConfig.apiKey);
      localStorage.setItem('repetitor_user_ai_config_v1', JSON.stringify({...userAiConfig, apiKey: ''}));
    } catch (e) {}
  }, [userAiConfig]);

  // Deck lifecycle statuses: 'active' | 'later' | 'completed'
  const [deckStatuses, setDeckStatuses] = useState<DeckStatusMap>(() => {
    try {
      const saved = localStorage.getItem('repetitor_deck_statuses_v1');
      if (saved) {const statuses=JSON.parse(saved);for(const t of Object.keys(statuses))if(statuses[t]==='active')statuses[t]='later';if(selectedTopics[0])statuses[selectedTopics[0]]='active';return statuses;}
    } catch (e) {}
    return selectedTopics[0]?{[selectedTopics[0]]:'active'}:{};
  });

  // Settings for mixing completed cards
  const [mixCompleted, setMixCompleted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('repetitor_mix_completed_v1');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });

  const [mixCompletedCount, setMixCompletedCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('repetitor_mix_completed_cnt_v1');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return 3;
  });

  // Session completion state
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);
  const [sessionAnsweredIds, setSessionAnsweredIds] = useState<Set<string>>(new Set());

  // Save deck statuses & settings
  useEffect(() => {
    try {
      localStorage.setItem('repetitor_deck_statuses_v1', JSON.stringify(deckStatuses));
    } catch (e) {}
  }, [deckStatuses]);

  useEffect(() => {
    try {
      localStorage.setItem('repetitor_mix_completed_v1', JSON.stringify(mixCompleted));
    } catch (e) {}
  }, [mixCompleted]);

  useEffect(() => {
    try {
      localStorage.setItem('repetitor_mix_completed_cnt_v1', JSON.stringify(mixCompletedCount));
    } catch (e) {}
  }, [mixCompletedCount]);

  useEffect(() => {
    let cancelled = false;
    const wanted = currentView === 'teacher' ? undefined : [...selectedTopics.filter(t => (deckStatuses[t] || 'later') === 'active'), ...(mixCompleted ? mixTopics.filter(t => deckStatuses[t] === 'completed') : [])];
    setIsLoadingCards(true);
    fetchCards(0, 20000, wanted).then(newCards => {
      if (cancelled) return;
      setCards(prev => { const ids = new Set(prev.map(c => c.id)); const fresh=new Map(newCards.map(c=>[c.id,c])); return migrateGeometry([...prev.map(c=>{const n=fresh.get(c.id);return n&&n.front===c.front?{...n,...c,hint:n.hint,hints:c.hintsEdited?c.hints:n.hints,answerSpec:c.manualCheck?undefined:c.answerSpec||n.answerSpec,formula:n.formula,formulaSide:n.formulaSide}:c;}), ...newCards.filter(c => !ids.has(c.id))]); });
    }).catch(() => { if (!cancelled) setGenerationNotice('Не удалось загрузить выбранную колоду. Проверьте соединение и выберите её снова.'); }).finally(() => { if (!cancelled) setIsLoadingCards(false); });
    return () => { cancelled = true; };
  }, [selectedTopics, mixTopics, mixCompleted, deckStatuses, currentView]);

  // Compute available topics from loaded cards
  const availableTopics = useMemo(() => {
    const set = new Set<string>(CATALOG.filter(d=>!splitParents.includes(d.topic)).map(d=>d.topic));
    cards.forEach(c => {
      if (c.topic&&!splitParents.includes(c.topic)) set.add(c.topic);
    });
    return Array.from(set);
  }, [cards,splitParents]);

  const activeTopics = useMemo(() => {
    return availableTopics.filter(t => (deckStatuses[t] || 'later') === 'active');
  }, [availableTopics, deckStatuses]);

  const completedTopics = useMemo(() => {
    return availableTopics.filter(t => deckStatuses[t] === 'completed');
  }, [availableTopics, deckStatuses]);

  useEffect(() => {
    if (!isSessionCompleted || rewarded.current) return;
    rewardBefore.current=rewards;
    rewarded.current = true;
    const today = new Date().toLocaleDateString('en-CA');
    setRewards((prev: any) => ({ xp: prev.xp + 50, gems: prev.gems + 15, sessions: prev.sessions + 1, dates: Array.from(new Set([...prev.dates, today])) }));
  }, [isSessionCompleted]);

  // Topic card counts
  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(CATALOG.map(d=>[d.topic,d.count]));
    for (const topic of new Set(cards.map(c=>c.topic))) counts[topic]=0;
    cards.forEach(c => {
      if (!c.deleted) {
        counts[c.topic] = (counts[c.topic] || 0) + 1;
      }
    });
    return counts;
  }, [cards]);

  // Change deck status (active / later / completed)
  const changeDeckStatus = (topic: string, status: DeckStatus) => {
    if(status==='active'){
      setDeckStatuses(prev=>Object.fromEntries([...Object.entries(prev).map(([t,s])=>[t,s==='active'?(isSessionCompleted&&t===selectedTopics[0]&&selectedActiveCards.length>0&&selectedActiveCards.every(c=>c.mastery==='known')?'completed':'later'):s]),[topic,'active']]));
      setSelectedTopics([topic]);
    }else{setDeckStatuses(prev=>({...prev,[topic]:status}));setSelectedTopics(prev=>prev.filter(t=>t!==topic));}
    resetSession();
  };

  // Cards from selected active decks
  const selectedActiveCards = useMemo(() => {
    return cards.filter(c => !c.deleted && !c.pending && (deckStatuses[c.topic] || 'later') === 'active' && selectedTopics.includes(c.topic));
  }, [cards, selectedTopics, deckStatuses]);

  // Mixed refresher cards from completed decks
  const mixedRefresherCards = useMemo(() => {
    if (!mixCompleted || completedTopics.length === 0 || sessionNumber % mixEvery !== 0) return [];
    const completedCards = cards.filter(c => !c.deleted && !c.pending && completedTopics.includes(c.topic) && mixTopics.includes(c.topic));
    const ranked = completedCards.map(c => ({ c, rank: Array.from(c.id + ':' + round).reduce((h, v) => Math.imul(h ^ v.charCodeAt(0), 16777619) >>> 0, 2166136261) })).sort((a,b) => a.rank - b.rank);
    return ranked.slice(0, mixCompletedCount).map(item => item.c).map(c => ({
      ...c,
      isRefresher: true
    }));
  }, [cards, mixCompleted, completedTopics, mixCompletedCount, mixTopics, mixEvery, round, sessionNumber]);

  // Total session cards (active + mixed from completed)
  const sessionCards = useMemo(() => {
    if(!selectedTopics.length)return [];
    const unseen=selectedActiveCards.filter(c=>!roundKnownIds.has(c.id));
    const ordered=unseen.length?unseen:selectedActiveCards;
    const active = sessionSize ? ordered.slice(0, sessionSize) : ordered;
    return [...active, ...mixedRefresherCards];
  }, [selectedActiveCards, mixedRefresherCards, sessionSize, roundKnownIds, selectedTopics]);

  // Active cards filtered by selected decks (kept for compatibility)
  const filteredActiveCards = sessionCards;

  // If repeatQueue has cards, show those first; otherwise show session cards
  const isStudyingRepeatQueue = currentCardIdx >= sessionCards.length && repeatQueue.length > 0;
  const currentCard: (Flashcard & { isRefresher?: boolean }) | undefined = isStudyingRepeatQueue
    ? repeatQueue[0]
    : sessionCards.length > 0 && currentCardIdx < sessionCards.length
      ? sessionCards[currentCardIdx]
      : undefined;

  // Deck theme for current card
  const currentDeckTheme = currentCard ? getDeckTheme(currentCard.topic) : DEFAULT_DECK_THEME;

  useEffect(()=>{submission.current=false;setChecked(null);setStudentDraft('');},[currentCard?.id,currentCardIdx,round,isStudyingRepeatQueue,answerSerial]);
  useEffect(()=>{if(!answerSerial)return;const timer=setTimeout(()=>{const el=document.querySelector('.live-study');if(el&&el.getBoundingClientRect().top<0)el.scrollIntoView({block:'start',behavior:'instant'});},250);return()=>clearTimeout(timer);},[answerSerial]);
  const gradeCurrent=(correct:boolean,text=studentDraft)=>{
    if(!currentCard||submission.current||isLoadingCards||isSessionCompleted)return;
    submission.current=true;
    setPreviousAnswer({card:currentCard,correct,text,verified:true,serial:answerSerial});
    setCards(prev=>prev.map(c=>c.id===currentCard.id?{...c,answerStats:{correct:(c.answerStats?.correct||0)+(correct?1:0),incorrect:(c.answerStats?.incorrect||0)+(correct?0:1)}}:c));
    advanceCard(correct);
  };
  const correctPrevious=(correct:boolean,text:string)=>{
    const old=previousAnswer;if(!old)return;
    const delta=Number(correct)-Number(old.correct);
    setCards(prev=>prev.map(c=>c.id===old.card.id?{...c,mastery:correct?'known':'learning',...(old.verified?{answerStats:{correct:Math.max(0,(c.answerStats?.correct||0)+delta),incorrect:Math.max(0,(c.answerStats?.incorrect||0)-delta)}}:{})}:c));
    setSessionMasteredCount(n=>Math.max(0,n+delta));
    const queue=repeatQueue.filter(c=>c.id!==old.card.id);
    if(!correct&&!repeatDone.current.has(old.card.id))queue.push({...old.card,mastery:'learning'});
    setRepeatQueue(queue);setPreviousAnswer({...old,correct,text});setCorrecting(false);
    const finished=currentCardIdx>=sessionCards.length&&queue.length===0;
    if(!finished&&rewarded.current&&rewardBefore.current){setRewards(rewardBefore.current);rewarded.current=false;}
    setIsSessionCompleted(finished);
  };
  const revealAnswer=()=>{if(currentCard?.answerSpec&&studentDraft.trim()){const result=checkAnswer(currentCard,studentDraft);if(['correct','incorrect'].includes(result.status)){gradeCurrent(result.status==='correct');return;}}setIsFlipped(true);};
  const resetSession = () => {
    setPreviousAnswer(null);setCorrecting(false);submission.current=false;rewardBefore.current=null;repeatDone.current.clear();
    setChecked(null);
    setRoundKnownIds(new Set(cards.filter(c=>c.mastery==='known').map(c=>c.id)));
    rewarded.current = false;
    setSessionNumber(rewards.sessions);
    setRound(prev => prev + 1);
    setRepeatQueue([]);
    setCurrentCardIdx(0);
    setIsFlipped(false);
    setSessionMasteredCount(0);
    setSessionAnsweredIds(new Set());
    setIsSessionCompleted(false);
  };

  const handleBinaryRate=(known:boolean)=>{
    if(!currentCard||isSessionCompleted||isLoadingCards||submission.current)return;
    submission.current=true;

    setPreviousAnswer({card:currentCard,correct:known,text:studentDraft,verified:false,serial:answerSerial});
    advanceCard(known);
  };
  const advanceCard = (known:boolean) => {
    if(!currentCard)return;
    setAnswerSerial(n=>n+1);
    setIsFlipped(false);
    setCards(prev => prev.map(c => c.id === currentCard.id ? { ...c, mastery: known ? 'known' : 'learning' } : c));
    if (known) setSessionMasteredCount(prev => prev + 1);
    if (isStudyingRepeatQueue) {
      repeatDone.current.add(currentCard.id);
      const remaining = repeatQueue.slice(1);
      setRepeatQueue(remaining);
      if (remaining.length === 0) setIsSessionCompleted(true);
    } else {
      setSessionAnsweredIds(prev => new Set(prev).add(currentCard.id));
      if (!known) setRepeatQueue(prev => [...prev, currentCard]);
      const next = currentCardIdx + 1;
      setCurrentCardIdx(next);
      if (known && next >= sessionCards.length && repeatQueue.length === 0) setIsSessionCompleted(true);
    }
  };

  const handleSmile = () => {
    setSmiled(true);
    setJokeIdx(prev => (prev + 1) % jokesList.length);
    setTimeout(() => setSmiled(false), 2200);
  };

  const handleAskAi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!askQuery.trim() || isAskingAi) return;

    const queryToAsk = askQuery.trim();
    setIsAskingAi(true);
    setAiError(null);

    try {
      const res = await fetch(apiUrl('/api/ask-ai'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: queryToAsk,
          aiConfig: userAiConfig
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось получить ответ от ИИ');
      }
      setAiAnswer(data.answer + (data.model ? '\n\nМодель: ' + data.model : '')); 
      setAiAnswerQuery(queryToAsk);
    } catch (err: any) {
      setAiError(err.message || 'Ошибка соединения с сервером');
    } finally {
      setIsAskingAi(false);
    }
  };

  const deleteCard = () => {
    if(!teacher){requireTeacher(()=>{});return;}
    if (!currentCard) return;
    setCards(prev => prev.map(c => c.id === currentCard.id ? { ...c, deleted: true } : c));
    if (isStudyingRepeatQueue) {
      setRepeatQueue(prev => prev.filter(c => c.id !== currentCard.id));
    }
    resetSession();
  };

  const depletedTopics = Array.from(new Set(cards.map(c => c.topic))).filter(topic => {
    const topicCards = cards.filter(c => c.topic === topic);
    const goodCards = topicCards.filter(c => !c.deleted && !c.pending && c.quality !== 'bad');
    return topicCards.length > 0 && goodCards.length === 0;
  });

  const handleGenerate = async () => {
    if(!teacher){requireTeacher(()=>{});return;}
    if (!generateTopic.trim() || isGenerating) return;
    const topicToCreate = generateTopic.trim();
    setIsGenerating(true);
    setGenerationNotice(null);

    try {
      const res = await fetch(apiUrl('/api/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicToCreate,
          count: generateCount,
          aiConfig: userAiConfig
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось создать карточки через ИИ');
      }

      if (Array.isArray(data.cards) && data.cards.length > 0) {
        const newFlashcards: Flashcard[] = data.cards.map((c: any, idx: number) => ({
          id: `ai-${Date.now()}-${idx}`,
          topic: topicToCreate,
          front: c.front,
          back: c.back, hints:c.hints, answerSpec:c.answerSpec,
          interval: '1 день', pending: true
        }));

        setFactsByTopic(prev=>({...prev,[topicToCreate]:data.facts}));
        resetSession();
        setCards(prev => [...newFlashcards, ...prev]);
        // New proposals wait in the library until selected through the wizard.
        setDeckStatuses(prev => ({ ...prev, [topicToCreate]: prev[topicToCreate]||'later' }));
        setCurrentCardIdx(0);
        setIsFlipped(false);
        setRepeatQueue([]);
        setIsSessionCompleted(false);

        const sourceLabel = data.source === 'custom-ai'
          ? `создана вашим подключенным ИИ (${userAiConfig.model || 'пользовательский'})`
          : data.source === 'server-gemini'
            ? 'создана с помощью Gemini'
            : 'создана по учебной программе';

        setGenerationNotice(`Колода «${topicToCreate}» (${newFlashcards.length} карточек) ${sourceLabel}. Проверьте и одобрите их в разделе «Для учителя».`);
        setGenerateTopic('');
      } else {
        throw new Error('ИИ вернул пустой список карточек. Проверьте формулировку темы.');
      }
    } catch (err: any) {
      console.error('Generation failed:', err);
      setGenerationNotice(`⚠️ ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const [factBusy,setFactBusy]=useState(false);
  const generateFacts=async(topic:string)=>{
    if(!teacher||factBusy||!topic)return;setFactBusy(true);
    try{const r=await fetch(apiUrl('/api/deck-facts'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic,aiConfig:userAiConfig})});const d=await r.json();if(!r.ok)throw Error(d.error);setFactsByTopic(prev=>({...prev,[topic]:d.facts}));setGenerationNotice('Для «'+topic+'» добавлено '+d.facts.length+' фактов.');}
    catch(e){setGenerationNotice('Карточки сохранены. Факты: '+(e instanceof Error?e.message:'не удалось получить.'));}
    finally{setFactBusy(false);}
  };
  const changeTeacherCards=(next:Flashcard[])=>{
    if(!teacher)return;
    const newTopic=next.find(c=>!cards.some(old=>old.topic===c.topic)&&!CATALOG.some(d=>d.topic===c.topic))?.topic;
    setCards(next);resetSession();
    if(newTopic&&!factsByTopic[newTopic])void generateFacts(newTopic);
  };
  const deckFacts=getDeckFacts(selectedTopics[0]||'',cards,factsByTopic);
  const splitDeck=async(size:number)=>{
    const loaded=await fetchCards(0,20000,[splitTopic]);
    const merged=new Map(loaded.map(c=>[c.id,c]));cards.filter(c=>c.topic===splitTopic).forEach(c=>merged.set(c.id,c));
    const deck=[...merged.values()].filter(c=>c.topic===splitTopic);
    if(deck.length<=size)throw Error('В этой колоде слишком мало карточек для такого размера частей.');
    const prefix=splitTopic+' · часть ';
    const names=Array.from({length:Math.ceil(deck.length/size)},(_,i)=>prefix+(i+1));
    if(names.some(t=>availableTopics.includes(t)))throw Error('Колоды с такими названиями уже есть. Переименуйте их перед разделением.');
    const updated=deck.map((c,i)=>({...c,originTopic:c.originTopic||splitTopic,ancestorTopics:[...new Set([...(c.ancestorTopics||[]),splitTopic])],topic:names[Math.floor(i/size)]}));
    const ids=new Set(updated.map(c=>c.id));
    setCards(prev=>[...prev.filter(c=>!ids.has(c.id)),...updated]);
    setSplitParents(prev=>[...new Set([...prev,splitTopic])]);
    setDeckStatuses(prev=>({...Object.fromEntries(Object.entries(prev).filter(([t])=>t!==splitTopic).map(([t,s])=>[t,s==='active'?'later':s])),...Object.fromEntries(names.map((t,i)=>[t,i===0?'active':'later']))}));
    setMixTopics(prev=>prev.filter(t=>t!==splitTopic));setSelectedTopics([names[0]]);
    const facts=getDeckFacts(splitTopic,deck,factsByTopic);setFactsByTopic(prev=>({...prev,...Object.fromEntries(names.map(t=>[t,facts]))}));
    resetSession();setGenerationNotice('Колода разделена: '+names.length+' частей. Прогресс сохранён.');
  };

  // Format current date
  const currentDateFormatted = new Intl.DateTimeFormat('ru-RU', { 
    weekday: 'long', day: 'numeric', month: 'long' 
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[#FDFDFB] flex flex-col md:flex-row font-sans text-zinc-900">
      <Sidebar 
        user={{...mockUser,name:profile.name,initials:profile.name.slice(0,2).toUpperCase(),role:teacher?'Учитель':'Ученик', daysActive: Object.entries(readCells()).filter(([k,v])=>k.startsWith('h1_')&&v==='done').length}} 
        currentView={currentView} 
        onViewChange={navigate}
        onOpenPersonalization={() => setPersonal(true)}
        aiConfigured={Boolean(userAiConfig.apiKey)}
      />
      
      <main className="flex-1 min-w-0 overflow-y-auto">
        {currentView === 'teacher' && teacher && <TeacherView cards={cards} onChange={changeTeacherCards} />}
        {currentView === 'tracker' && <TrackerView />}
        {currentView === 'learn' && (
        <div className="max-w-[1600px] mx-auto p-6 md:p-8 lg:p-10">
          
          {/* Header */}
          <header className="flex flex-wrap gap-4 justify-between items-start mb-8">
            <div>
              <p className="text-xs font-bold text-zinc-400 tracking-widest uppercase mb-2">
                {currentDateFormatted}
              </p>
              <h1 className="text-3xl font-semibold text-zinc-900">{profile.address?profile.address+', продолжим учиться?':'Продолжим учиться?'}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAiSettingsOpen(true)}
                className="flex items-center gap-2 bg-white hover:bg-zinc-50 border border-zinc-200/90 px-3.5 py-2 rounded-full font-semibold text-xs text-zinc-800 transition shadow-xs cursor-pointer group"
                title="Настроить свой ИИ: эндпоинт, формат, токен"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 group-hover:rotate-12 transition-transform" />
                <span>{userAiConfig.apiKey ? (userAiConfig.model || 'Мой ИИ активен') : 'Подключить свой ИИ'}</span>
                <span className={`w-2 h-2 rounded-full ${userAiConfig.apiKey ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-zinc-300'}`} />
              </button>

              <div className="flex items-center gap-2 bg-[#FAF0E6] text-[#A66023] px-4 py-2 rounded-full font-bold text-sm">
                <Flame className="w-4 h-4 fill-current" />
                {streak} дн. · {rewards.xp} XP · 💎 {rewards.gems}
              </div>
              <button 
                onClick={() => setIsAiSettingsOpen(true)}
                className="p-2 border border-zinc-200 rounded-full text-zinc-500 hover:bg-zinc-50 transition cursor-pointer"
                title="Настройки ИИ и приложения"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* AI Generation Notification Banner */}
          {generationNotice && (
            <div className="mb-6 p-4 rounded-2xl bg-zinc-900 text-white flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-xs sm:text-sm font-medium">{generationNotice}</p>
              </div>
              <div className="flex items-center gap-2">

                <button
                  onClick={() => setGenerationNotice(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Repeat Queue banner if currently re-testing difficult cards */}
          {isStudyingRepeatQueue && (
            <div className="mb-6 bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3 text-amber-900">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center font-bold text-amber-800">
                  {repeatQueue.length}
                </div>
                <div>
                  <p className="text-sm font-bold">Сессионный повтор: колода «Не знаю»</p>
                  <p className="text-xs text-amber-700">Каждая карточка повторится один раз. Неусвоенные останутся для следующей сессии.</p>
                </div>
              </div>
              <button
                onClick={resetSession}
                className="text-xs font-semibold px-3 py-1.5 bg-white border border-amber-200 text-amber-800 rounded-xl hover:bg-amber-100 transition shadow-xs"
              >
                Вернуться к обычной колоде
              </button>
            </div>
          )}

          <div className="study-quickbar"><button onClick={()=>setNextDeckOpen(true)}>Сменить колоду</button><button onClick={resetSession}>Новая сессия</button><span>Повтор каждой карточки: максимум один раз за сессию.</span></div>
          {/* Top Grid */}
          <div className="learning-summary"><span>Проверенные ответы: ✓ {selectedActiveCards.reduce((n,c)=>n+(c.answerStats?.correct||0),0)} · Ошибки: {selectedActiveCards.reduce((n,c)=>n+(c.answerStats?.incorrect||0),0)}</span>{profile.rewards.filter(r=>r.topic===selectedTopics[0]||selectedActiveCards.some(c=>c.originTopic===r.topic||c.ancestorTopics?.includes(r.topic))).map(r=><div className="reward-progress" key={r.id}><strong>{r.earned?'🎉 Награда заслужена: ':'🎁 '}{r.title}</strong><progress max={r.threshold} value={rewardProgress(r,cards)}/><small>{Math.floor(rewardProgress(r,cards))}% / {r.threshold}%</small></div>)}</div>
          <div className="grid grid-cols-1 2xl:grid-cols-12 gap-6 mb-10">
            
            {/* Main Flashcard Area or Duolingo Celebration */}
            <div className="2xl:col-span-8 min-w-0 study-flow">
              {previousAnswer&&<PreviousAnswer key={previousAnswer.serial} answer={previousAnswer} onEdit={()=>setCorrecting(true)}/>}
              <div className="live-study">
              {isSessionCompleted ? (
                <DuolingoCelebration
                  deckComplete={selectedActiveCards.length>0&&selectedActiveCards.every(c=>c.mastery==='known')}
                  remainingCount={selectedActiveCards.filter(c=>c.mastery!=='known').length}
                  onChooseNext={()=>setNextDeckOpen(true)}
                  onRestart={resetSession}
                  onOpenTracker={() => { const key = 'repetitor_tracker_cells_v3'; const cells = readSaved(key, {}); cells['h2_' + new Date().toLocaleDateString('en-CA')] = 'done'; localStorage.setItem(key, JSON.stringify(cells)); setCurrentView('tracker'); }}
                  masteredCount={sessionMasteredCount}
                  selectedTopics={Array.from(new Set(sessionCards.map(c => c.topic)))}
                  totalXp={rewards.xp} totalGems={rewards.gems}
                />
              ) : (
                <>
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h2 className="text-xl font-medium text-zinc-900 mb-1">
                        {isStudyingRepeatQueue ? 'Единственный повтор в сессии' : 'Сегодня на повторение'}
                      </h2>
                      <p className="text-sm text-zinc-500">
                        {isStudyingRepeatQueue 
                          ? `${repeatQueue.length} карточек на закрепление`
                          : `${sessionCards.length} карточек в этой сессии · выучено: ${sessionMasteredCount}`
                        }
                      </p>
                    </div>
                    <div className="relative w-16 h-16 mr-4">
                      {/* Progress Circle */}
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                        <path 
                          strokeDasharray={`${Math.min(100, Math.round(((sessionMasteredCount) / Math.max(1, sessionCards.length)) * 100))}, 100`} 
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                          fill="none" 
                          stroke={currentDeckTheme.accent || "#487860"} 
                          strokeWidth="3" 
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-zinc-800">
                          {Math.min(100, Math.round(((sessionMasteredCount) / Math.max(1, sessionCards.length)) * 100))}%
                        </span>
                        <span className="text-[8px] text-zinc-400">сессия</span>
                      </div>
                    </div>
                  </div>

                  {depletedTopics.length > 0 && (
                    <div className="mb-4 bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-orange-800">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">
                          Похоже, качественных карточек по теме <span className="font-bold">«{depletedTopics[0]}»</span> больше нет (все признаны плохими или удалены). 
                        </p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setGenerateTopic(depletedTopics[0]);
                          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        }}
                        className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-900 text-xs font-bold rounded-xl transition flex-shrink-0 ml-4"
                      >
                        Создать новые
                      </button>
                    </div>
                  )}

                  {/* Flashcard Component with Deck Theme & Pattern */}
                  <motion.div key={(currentCard?.id||'empty')+':'+answerSerial} initial={{x:60,opacity:0}} animate={{x:0,opacity:1}} transition={{duration:0.22}}
                    style={{'--deck-accent':currentDeckTheme.accent} as React.CSSProperties}
                    className={`rounded-3xl p-5 sm:p-8 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] border transition-all duration-300 flex flex-col min-h-[440px] relative study-card perspective-1000 ${currentDeckTheme.cardBg} ${currentDeckTheme.cardBorder}`}
                    onClick={() => {}}
                  >
                    {/* SVG Background Pattern specific to the deck */}
                    <DeckPattern theme={currentDeckTheme} opacity={0.4} />

                    {(!currentCard) ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 relative z-10">
                        {isLoadingCards ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#A66023]" />
                            <p>Загрузка карточек...</p>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-500" />
                            <h3 className="text-xl font-bold text-zinc-800 mb-1">Выберите колоды для сессии</h3>
                            <p className="text-sm text-zinc-500 max-w-sm text-center mb-5">
                              В выбранных колодах нет неизученных карточек. Выберите другие колоды или начните раунд заново.
                            </p>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                resetSession();
                              }}
                              className="px-6 py-3 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-2"
                            >
                              <RefreshCcw className="w-3.5 h-3.5" /> Начать заново
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-auto relative z-10">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs font-bold px-3.5 py-1 rounded-full border shadow-xs flex items-center gap-1.5 ${currentDeckTheme.badgeBg} ${currentDeckTheme.badgeText} ${currentDeckTheme.cardBorder}`}>
                              <span>{currentDeckTheme.icon}</span>
                              <span>{currentCard?.topic}</span>
                            </span>

                            {currentCard?.isRefresher && (
                              <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                💡 Из пройденного (повтор)
                              </span>
                            )}
                            
                            {isStudyingRepeatQueue && (
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-100/90 border border-rose-200 px-2.5 py-0.5 rounded-full animate-pulse">
                                В очереди повтора: {repeatQueue.length}
                              </span>
                            )}

                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteCard(); }} 
                              className="p-1.5 rounded-full text-zinc-400 hover:text-red-500 hover:bg-white/80 transition ml-1" 
                              hidden={!teacher} title="Удалить карточку"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            {isLoadingCards && <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />}
                            <span className="text-xs text-zinc-500 font-medium">
                              {isStudyingRepeatQueue 
                                ? `Повтор карточки`
                                : `Карточка ${Math.min(currentCardIdx + 1, sessionCards.length)} из ${sessionCards.length}`
                              }
                            </span>
                          </div>
                        </div>

                        <div className="w-full flex-1 relative my-8 z-10 min-h-[240px] flex flex-col justify-center" aria-live="polite">
                          {currentCard.imageUrl && !isFlipped && <img src={currentCard.imageUrl} alt="Иллюстрация к вопросу" className="w-full max-w-xl max-h-64 object-contain rounded-xl mb-5" />}
                          {isFlipped&&<section className="answer-question" aria-label="Вопрос к ответу"><small>Вопрос</small><CardContent card={currentCard} answer={false} teacher/></section>}
                          <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-4">{isFlipped ? 'Ответ' : 'Вопрос'}</p>
                          <div className={isFlipped ? 'text-lg md:text-xl leading-relaxed whitespace-pre-wrap break-words select-text' : 'text-2xl md:text-3xl font-bold leading-relaxed whitespace-pre-wrap break-words'}>
                            <CardContent key={currentCard.id} card={currentCard} answer={isFlipped}/>
                          </div>
                          {!isFlipped&&<AnswerEditor key={currentCard.id+':'+currentCardIdx+':'+round+':'+answerSerial} card={currentCard} focusOnMount={answerSerial>0} paused={correcting} onDraft={setStudentDraft} onChecked={gradeCurrent} onKnow={()=>handleBinaryRate(true)}/>}
                          {isFlipped&&currentCard.answerSpec&&<p className={checked?'answer-verdict correct':'answer-verdict'} role="status">{checked===true?'✓ Верно!':checked===false?'Пока неверно. Карточка вернётся на повтор.':'Ответ открыт. Можно отметить «Знаю» (самооценка) или оставить на будущее повторение.'}</p>}
                          {currentCard.source && <p className="text-xs text-zinc-500 mt-5">Источник: {currentCard.source}</p>}
                          {isFlipped && teacher && <div className="flex flex-wrap items-center gap-2 mt-5 text-xs"><span>Качество материала:</span>{(['good','average','bad'] as const).map((quality,i)=><button key={quality} onClick={e=>{e.stopPropagation();setCards(prev=>prev.map(c=>c.id===currentCard.id?{...c,quality}:c));}} aria-pressed={currentCard.quality===quality} className={`border rounded-lg px-3 py-2 ${currentCard.quality===quality?'bg-emerald-100 border-emerald-600':'bg-white'}`}>{['Хорошая','Средняя','Плохая'][i]}</button>)}</div>}
                        </div>

                        {/* Controls: Binary "Знаю" vs "Не знаю" */}
                        <div className="flex justify-between items-center mt-auto pt-4 min-h-[56px] relative z-10 border-t border-zinc-200/60">
                          <span className="text-xs text-zinc-500 font-medium hidden sm:block">
                            Колода: <span className="font-semibold text-zinc-800">{currentCard?.topic}</span>
                          </span>
                          
                          {isFlipped ? (
                            <div className="flex flex-wrap items-center justify-center gap-3 mx-auto">
                              {/* Don't Know button - queues card immediately for repeat in same session */}
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleBinaryRate(false); }}
                                className="flex items-center gap-2 px-6 sm:px-7 py-3 rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 hover:border-rose-400 transition font-bold text-sm sm:text-base shadow-xs active:scale-95 cursor-pointer"
                                title={isStudyingRepeatQueue?'Оставить на следующую сессию':'Повторить один раз в этой сессии'}
                              >
                                <XCircle className="w-5 h-5 text-rose-600" />
                                <span>Не знаю</span>
                                <span className="text-xs opacity-75 font-normal ml-0.5">{isStudyingRepeatQueue?'(на потом)':'(на повтор)'}</span>
                              </button>

                              {/* Know button */}
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleBinaryRate(true); }}
                                className="flex items-center gap-2 px-6 sm:px-7 py-3 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400 transition font-bold text-sm sm:text-base shadow-xs active:scale-95 cursor-pointer"
                                title="Знаю - карточка усвоена"
                              >
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                <span>Знаю</span>
                                <span className="text-xs opacity-75 font-normal ml-0.5">(усвоено)</span>
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                revealAnswer();
                              }}
                              className="px-7 py-3 rounded-full bg-white border border-zinc-200/80 text-sm font-bold text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300 shadow-xs flex items-center gap-2 transition mx-auto cursor-pointer active:scale-95"
                            >
                              Показать ответ ↓
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAskQuery(`Объясни подробнее понятие: ${currentCard?.front}`);
                            }}
                            className="text-xs text-[#A66023] font-bold hidden sm:flex items-center gap-1 hover:underline"
                            title="Спросить ИИ об этой карточке"
                          >
                            Спросить ИИ <Sparkles className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                </>
              )}
              </div>
            </div>

            {/* Right Side Widgets */}
            <div className="2xl:col-span-4 min-w-0 flex flex-col gap-4 mt-8 lg:mt-0 lg:pt-14">
              
              {/* Ask AI */}
              <div className="bg-[#EAF4ED] rounded-3xl p-5 border border-[#D5E9DE] transition-all shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-[#294B3A] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#A88661]" /> Спросить ИИ
                  </h3>
                  <span className="text-[10px] font-bold tracking-wider text-[#345946] uppercase bg-white/80 border border-[#799C8A]/30 px-2 py-0.5 rounded-full">Репетитор.AI</span>
                </div>
                
                {/* Purpose explanation */}
                <div className="bg-white/60 rounded-xl p-2.5 mb-3 border border-[#CDE3D6] text-[11px] text-[#2F5240] leading-relaxed">
                  <p className="font-medium mb-1 flex items-center gap-1 text-[#244132]">
                    <HelpCircle className="w-3.5 h-3.5 text-[#345946]" /> Зачем здесь эта панель?
                  </p>
                  <span>
                    Личный репетитор прямо во время учебы: задавайте любые вопросы о терминах, просите сравнить понятия или привести современные аналоги (например, IT или жизненные примеры), не переключая вкладки.
                  </span>
                </div>

                <form onSubmit={handleAskAi} className="relative mb-2">
                  <textarea 
                    aria-label="Ваш вопрос ИИ" rows={5} maxLength={12000}
                    value={askQuery}
                    onChange={(e) => setAskQuery(e.target.value)}
                    placeholder="Например: что такое апория и современный аналог..." 
                    className="w-full bg-white rounded-xl py-2.5 pl-4 pr-11 text-sm border border-zinc-200/60 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#799C8A]/50 placeholder-zinc-400 text-zinc-800"
                  />
                  <button 
                    type="submit"
                    disabled={isAskingAi || !askQuery.trim()}
                    className={`absolute right-2 bottom-3 p-2 rounded-lg transition ${
                      askQuery.trim() && !isAskingAi
                        ? 'bg-[#345946] text-white hover:bg-[#284636] shadow-sm'
                        : 'bg-[#EAF4ED] text-[#799C8A] cursor-not-allowed'
                    }`}
                    title="Спросить ИИ"
                  >
                    {isAskingAi ? <Loader2 className="w-4 h-4 animate-spin text-[#345946]" /> : <Zap className="w-4 h-4" />}
                  </button>
                </form>

                {/* Quick suggestions */}
                {!aiAnswer && !isAskingAi && (
                  <div className="space-y-1 mt-2">
                    <p className="text-[10px] text-zinc-500 font-medium">Быстрые запросы со сравнением:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Апория и аналог', q: 'Что такое апория и современный аналог этого' },
                        { label: 'Дедукция vs Индукция', q: 'В чем разница между дедукцией и индукцией и примеры' },
                        { label: 'Бритва Оккама', q: 'Бритва Оккама простыми словами с жизненным примером' },
                      ].map(item => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setAskQuery(item.q);
                          }}
                          className="text-[11px] bg-white/80 hover:bg-white text-[#345946] px-2 py-0.5 rounded-md border border-[#D5E9DE] transition text-left"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Answer Card */}
                <AnimatePresence>
                  {aiAnswer && (
                    <motion.div 
                      initial={{ opacity: 0, y: 6 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -6 }}
                      className="mt-3 p-3.5 bg-white rounded-2xl border border-[#CDE3D6] shadow-sm text-xs text-zinc-700 space-y-2 relative"
                    >
                      <div className="flex justify-between items-center pb-1.5 border-b border-zinc-100">
                        <span className="font-semibold text-[#294B3A] flex items-center gap-1.5 text-xs">
                          <Bot className="w-3.5 h-3.5 text-[#345946]" /> «{aiAnswerQuery}»
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setAiAnswer(null)} 
                          className="text-zinc-400 hover:text-zinc-600 p-0.5 rounded-md"
                          title="Закрыть"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="leading-relaxed whitespace-pre-line text-zinc-700">{aiAnswer}</p>
                      <div className="pt-1 flex justify-end">
                        <button 
                          type="button" 
                          onClick={() => { setAiAnswer(null); setAskQuery(''); }}
                          className="text-[11px] font-medium text-[#345946] bg-[#EAF4ED] px-2.5 py-1 rounded-lg hover:bg-[#DDF0E3] transition"
                        >
                          Понятно, спасибо!
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {aiError && (
                  <p className="text-[11px] text-red-600 mt-2 bg-red-50 p-2 rounded-lg">{aiError}</p>
                )}
              </div>

              <div className="bg-white rounded-3xl p-6 border border-zinc-100"><h3 className="font-semibold mb-2">Свои карточки</h3><p className="text-sm text-zinc-500 mb-3">Предложите вопрос и ответ, проверьте материал и добавьте его в обучение.</p><button className="text-emerald-700 font-semibold" onClick={()=>navigate('teacher')}>Открыть редактор</button></div>
              
            </div>
          </div>

          {/* Deck Manager: choose which decks to study and manage lifecycle */}
          <div className="flex flex-wrap gap-3 items-center mb-4 text-sm"><label>Карточек из выбранной колоды за сессию <select aria-label="Размер сессии" className="border rounded-lg p-2 bg-white" value={sessionSize} onChange={e=>{setSessionSize(Number(e.target.value));resetSession();}}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={0}>Все</option></select></label><span className="text-zinc-500">Следующая завершённая сессия продолжает подборку.</span></div>
          {nextDeckOpen&&<DeckWizard topics={availableTopics.filter(t=>t!==selectedTopics[0]).sort((a,b)=>Number(deckStatuses[a]==='completed')-Number(deckStatuses[b]==='completed'))} counts={topicCounts} onClose={()=>setNextDeckOpen(false)} onChoose={t=>changeDeckStatus(t,'active')}/>}
          <DeckManager
            onSplit={topic=>requireTeacher(()=>setSplitTopic(topic))}
            availableTopics={availableTopics}
            selectedTopics={selectedTopics}
            deckStatuses={deckStatuses}
            onChangeDeckStatus={changeDeckStatus}
            topicCounts={topicCounts}
            repeatQueueCount={repeatQueue.length}
            onResetSession={resetSession}
            mixCompleted={mixCompleted}
            onToggleMixCompleted={value => { resetSession(); setMixCompleted(value); }}
            mixCompletedCount={mixCompletedCount}
            onChangeMixCompletedCount={value => { resetSession(); setMixCompletedCount(value); }}
            mixTopics={mixTopics} mixEvery={mixEvery}
            onMixTopics={value => { resetSession(); setMixTopics(value); }}
            onMixEvery={value => { resetSession(); setMixEvery(value); }}
          />


          {/* Break Section */}
          <div className="mb-10">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-xl font-medium text-zinc-900 mb-1">Перерыв на интересное</h2>
                <p className="text-sm text-zinc-500">Маленькая награда за большой мозг</p>
              </div>
              
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fact */}
              <div 
                onClick={() => setIsFactModalOpen(true)}
                className="bg-[#EAF4ED] rounded-3xl p-6 relative overflow-hidden cursor-pointer hover:shadow-md transition group"
              >
                <p className="text-[10px] font-bold tracking-widest text-[#5C8570] uppercase mb-2">Забавный факт</p>
                <h4 className="font-semibold text-[#294B3A] mb-2 group-hover:text-[#1e382b] transition-colors">{deckFacts[0].title}</h4>
                <p className="text-xs text-[#4F7361] mb-6">{selectedTopics[0]||'Выберите колоду'} · {deckFacts.length} фактов</p>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFactModalOpen(true);
                  }}
                  className="text-xs font-bold text-[#294B3A] flex items-center gap-1 hover:opacity-80 transition"
                >
                  Открыть <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="absolute -bottom-4 -right-4 text-6xl opacity-20 filter grayscale blur-[1px] pointer-events-none">🧠</div>
              </div>

              {/* Joke */}
              <div className="bg-[#F3EEF7] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-bold tracking-widest text-[#826A96] uppercase">Анекдот дня</p>
                    {smiled && (
                      <span className="text-[11px] font-bold text-[#6D28D9] bg-purple-100 px-2 py-0.5 rounded-full">
                        +1 к настроению! 😊
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-[#3D2554] mb-2">{jokesList[jokeIdx].title}</h4>
                  <div className="text-xs text-[#6A5282] mb-4 space-y-1.5 leading-relaxed">
                    {jokesList[jokeIdx].text.map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleSmile}
                  className="text-xs font-bold text-[#3D2554] bg-white/70 hover:bg-white px-3 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm w-fit mt-2"
                  title="Показать следующий анекдот для поднятия настроения"
                >
                  <Smile className="w-3.5 h-3.5 text-[#826A96]" />
                  <span>Улыбнуться (ещё анекдот)</span>
                  <RefreshCcw className="w-3 h-3 ml-1 text-[#826A96]" />
                </button>
                <div className="absolute -bottom-4 -right-4 text-6xl opacity-20 filter grayscale blur-[1px] pointer-events-none">🤖</div>
              </div>

              <div className="bg-[#FAF0E6] rounded-3xl p-6"><p className="text-xs uppercase text-amber-800 mb-3">Мои достижения</p><h3 className="font-bold text-2xl">{rewards.xp} XP · {rewards.gems} кристаллов</h3><p className="text-sm mt-3">Завершено сессий: {rewards.sessions}</p><p className="text-sm mt-2">За завершение сессии: +50 XP и +15 кристаллов.</p></div>
            </div>
          </div>

          {/* Bottom Widgets */}
          <div className="space-y-4">
            
            <div className="bg-[#EAF4ED] rounded-3xl p-6"><h3 className="font-semibold">Ваша библиотека</h3><p className="text-sm mt-2">{getTotalCardsCount()} карточек в поставляемом каталоге. Загружено в браузер: {cards.filter(c=>!c.deleted&&!c.pending).length}. Освоено: {cards.filter(c=>!c.deleted&&!c.pending&&c.mastery==='known').length}. На проверке: {cards.filter(c=>c.pending&&!c.deleted).length}.</p><p className="text-xs mt-2 text-zinc-500">Карточки ЕГЭ предназначены для тематического повторения, они не заменяют полный экзаменационный вариант.</p></div>
            {/* Create Deck with AI */}
            <div className="bg-[#EAF4ED] rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-[#D5E8DC]">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-semibold text-[#294B3A] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#A88661]" /> Создать колоду с ИИ
                  </h3>

                </div>
                <p className="text-xs text-[#4F7361]">Введи тему - создадим выбранное количество карточек через подключенный ИИ.</p>
              </div>
              <div className="flex-1 w-full max-w-md flex flex-wrap gap-2"><label className="w-full text-sm">Количество новых карточек <select aria-label="Количество новых карточек" className="border rounded-lg p-2 bg-white" value={generateCount} onChange={e=>setGenerateCount(Number(e.target.value))}><option value={8}>8</option><option value={20}>20</option><option value={50}>50</option></select></label>
                <input 
                  type="text" 
                  value={generateTopic}
                  onChange={(e) => setGenerateTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  placeholder="Например: законы Ньютона" 
                  className="flex-1 min-w-0 bg-white rounded-xl py-3 px-4 text-sm border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-[#799C8A]/50"
                  disabled={isGenerating}
                />
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !generateTopic.trim()}
                  className="bg-[#294B3A] hover:bg-[#1E3A2C] text-white px-5 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                >
                  {isGenerating ? <RefreshCcw className="w-4 h-4 animate-spin" /> : "Создать ✨"}
                </button>
              </div>
            </div>

          </div>
          <QuickAiSetup config={userAiConfig} onChange={setUserAiConfig} onAdvanced={()=>setIsAiSettingsOpen(true)}/>
        </div>
        )}

        {/* Interactive Science Fact Modal */}
        {correcting&&previousAnswer&&<CorrectAnswer answer={previousAnswer} onClose={()=>setCorrecting(false)} onCorrect={correctPrevious}/>}
        {personal&&<Personalization profile={profile} onSave={setProfile} onClose={()=>setPersonal(false)} topics={availableTopics} cards={cards} teacher={teacher} onTeacher={()=>requireTeacher(()=>{})} onLock={()=>{sessionStorage.removeItem('study_teacher');setTeacher(false);setCurrentView('learn');}}/>}
        {gate&&<TeacherGate onClose={()=>{setGate(false);afterUnlock.current=null;}} onUnlock={()=>{sessionStorage.setItem('study_teacher','true');setTeacher(true);setGate(false);afterUnlock.current?.();afterUnlock.current=null;}}/>}
        {splitTopic&&<SplitDeck topic={splitTopic} count={topicCounts[splitTopic]} onSplit={splitDeck} onClose={()=>setSplitTopic('')}/>}
        <FactModal onGenerate={teacher&&selectedTopics[0]?()=>generateFacts(selectedTopics[0]):undefined} busy={factBusy} facts={deckFacts} isOpen={isFactModalOpen} onClose={() => setIsFactModalOpen(false)} />

        {/* User AI Configuration Modal (Endpoint, Format, Token, Presets, Hints) */}
        <AiSettingsModal 
          isOpen={isAiSettingsOpen} 
          onClose={() => setIsAiSettingsOpen(false)} 
          config={userAiConfig} 
          onSave={setUserAiConfig} 
        />
      </main>
    </div>
  );
}

