const fs=require('fs');const p='src/App.tsx';let s=fs.readFileSync(p,'utf8');
s=s.replace("import { Flashcard, User, UserAiConfig }", "import { CATALOG } from './catalogMeta';\nimport { Flashcard, User, UserAiConfig }");
s=s.replace('useState<string[]>([]);\n  // In-session',"useState<string[]>(() => readSaved('study_selected_topics', ['Логика']));\n  useEffect(() => { localStorage.setItem('study_selected_topics', JSON.stringify(selectedTopics)); }, [selectedTopics]);\n  // In-session");
s=s.replace("  useEffect(() => {\n    loadMoreCards();\n  }, []);",`  useEffect(() => {
    let cancelled = false;
    const wanted = currentView === 'teacher' ? undefined : [...selectedTopics.filter(t => (deckStatuses[t] || 'active') === 'active'), ...(mixCompleted ? mixTopics.filter(t => deckStatuses[t] === 'completed') : [])];
    setIsLoadingCards(true);
    fetchCards(0, 20000, wanted).then(newCards => {
      if (cancelled) return;
      setCards(prev => { const ids = new Set(prev.map(c => c.id)); return [...prev, ...newCards.filter(c => !ids.has(c.id))]; });
    }).catch(() => { if (!cancelled) setGenerationNotice('Не удалось загрузить выбранную колоду. Проверьте соединение и выберите её снова.'); }).finally(() => { if (!cancelled) setIsLoadingCards(false); });
    return () => { cancelled = true; };
  }, [selectedTopics, mixTopics, mixCompleted, deckStatuses, currentView]);`);
s=s.replace('const set = new Set<string>();','const set = new Set<string>(CATALOG.map(d=>d.topic));');
const init=s.indexOf('  const initialized = useRef(false);');const initEnd=s.indexOf('  useEffect(() => {\n    if (!isSessionCompleted',init);s=s.slice(0,init)+s.slice(initEnd);
s=s.replace('const counts: Record<string, number> = {};','const counts: Record<string, number> = Object.fromEntries(CATALOG.map(d=>[d.topic,d.count]));\n    for (const topic of new Set(cards.map(c=>c.topic))) counts[topic]=0;');
s=s.replace('if (!currentCard || !isFlipped || isSessionCompleted) return;','if (!currentCard || !isFlipped || isSessionCompleted || isLoadingCards) return;');
const from=s.indexOf('  const loadMoreCards = async () => {'),end=s.indexOf('  const handleSmile =',from);s=s.slice(0,from)+s.slice(end);
s=s.replace("  const [hasMoreCards, setHasMoreCards] = useState(true);\n  const isLoadingRef = useRef(false);\n  const CHUNK_SIZE = 10000;\n",'');
s=s.replace('{cards.filter(c=>!c.deleted&&!c.pending).length} карточек для обучения.', '{getTotalCardsCount()} карточек в поставляемом каталоге. Загружено в браузер: {cards.filter(c=>!c.deleted&&!c.pending).length}.');
fs.writeFileSync(p,s);
