import React, { useEffect, useMemo, useState } from 'react';
import { TIM_DEFINITIONS } from '../constants';
import type { AnalysisResult, ChatMessage, DichotomyResult, RankedTim, TypingSession } from '../types';
import type { PersonSession, TypistResult } from '../typistTypes';
import ResultScreen from './ResultScreen';

interface Props {
  session: PersonSession;
  allSessions: PersonSession[];
  onRestart: () => void;
  onReanalyze: (lockedDichotomies?: Record<string, string>, lockedPsychosophy?: Record<string, unknown>, preferredTim?: string) => void;
}

export const toLegacyResult = (value: TypistResult): AnalysisResult => {
  const definition = TIM_DEFINITIONS[value.tim.abbreviation] || {};
  const canonical = (name: string) => name === 'Дух квадры' ? 'Квадра' : name === 'Весёлость / Серьёзность' ? 'Объективизм / Субъективизм' : name.split(' / ').sort().join(' / ');
  const observed = new Map(value.dichotomies.map(item => [canonical(item.name), item]));
  const dimensions = Object.keys(definition).filter(key => key !== 'name' && key !== 'description' && key !== 'type' && key !== 'formula');
  const names = dimensions.length ? dimensions : value.dichotomies.map(item => item.name);
  const dichotomies: DichotomyResult[] = names.map(name => {
    const item = observed.get(canonical(name));
    const raw = item?.result || 'Недостаточно данных';
    const result = raw === 'insufficient' ? 'Недостаточно данных' : raw === 'Весёлость' ? 'Субъективизм' : raw === 'Серьёзность' ? 'Объективизм' : raw === 'Бета' ? 'Бэта' : raw;
    const [pole1, pole2] = name.split(' / ');
    const evidence = item?.evidence || 'Прямых данных для проверки признака нет.';
    return {
      name,
      result,
      confidence: item?.confidence ?? 0,
      justification_pole1: evidence,
      justification_pole2: evidence
    };
  });

  return {
    tim: value.tim,
    summary: value.summary,
    dichotomies,
    providerUsed: value.providerUsed
  };
};

const toRanked = (value: TypistResult): RankedTim[] => {
  const rows = [
    { abbreviation: value.tim.abbreviation, name: value.tim.name, probability: value.confidence },
    ...value.alternatives.map(item => ({ abbreviation: item.abbreviation, name: item.name, probability: item.probability }))
  ];
  return rows.slice(0, 4).map(item => ({ ...item, score: item.probability }));
};

const toLegacySession = (session: PersonSession): TypingSession => ({
  id: session.id,
  name: session.name,
  screen: session.result ? 'result' : session.status === 'analyzing' ? 'loading' : 'monologue',
  monologue: session.text,
  analysisResult: session.result ? toLegacyResult(session.result) : null,
  lockedDichotomies: {},
  lockedPsychosophy: {},
  selectedTimAbbreviation: session.result?.tim.abbreviation || null,
  chatHistory: []
});

export const LegacyResultAdapter: React.FC<Props> = ({ session, allSessions, onRestart, onReanalyze }) => {
  const initial = session.result!;
  const [selectedTim, setSelectedTim] = useState(initial.tim.abbreviation);
  const [userPreferredTim, setUserPreferredTim] = useState<string | undefined>();
  const [legacyResult, setLegacyResult] = useState<AnalysisResult>(() => toLegacyResult(initial));
  const [lockedDichotomies, setLockedDichotomies] = useState<Record<string, string>>({});
  const [lockedPsychosophy, setLockedPsychosophy] = useState<Record<string, unknown>>({});
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const legacySessions = useMemo(() => allSessions.map(toLegacySession), [allSessions]);

  useEffect(() => {
    setSelectedTim(initial.tim.abbreviation);
    setLegacyResult(toLegacyResult(initial));
  }, [initial.createdAt]);

  const handleSelectTim = (abbreviation: string) => {
    setSelectedTim(abbreviation);
    setUserPreferredTim(abbreviation);
  };
  const handleDichotomyChange = (name: string, newResult: string) => {
    setLegacyResult(current => ({
      ...current,
      dichotomies: current.dichotomies.map(item => item.name === name ? { ...item, result: newResult } : item)
    }));
  };
  const handleLock = (name: string, result: string) => {
    setLockedDichotomies(current => current[name] ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== name)) : { ...current, [name]: result });
  };

  return (
    <div className="tw-legacy-result" data-testid="restored-result">
      <details className="tw-prompt-window">
        <summary>Что именно проверяет ИИ</summary>
        <p>Отдели наблюдения от интерпретаций. Построй основную и две конкурирующие гипотезы. Попытайся опровергнуть лидирующую версию. Не скрывай недостаток данных. Зафиксированные пользователем признаки считай жёсткими ограничениями.</p>
        {initial.debugTraceId && <p><b>ID задания:</b> <code>{initial.debugTraceId}</code>. По нему можно найти 24 проверки, итоговый синтез и возможные повторы в Cloudflare Logs.</p>}
      </details>
      <details className="tw-all-types">
        <summary>Выбрать свою гипотезу из всех 16 ТИМов</summary>
        <div className="tw-all-types-scroll"><div className="tw-all-types-grid">{Object.entries(TIM_DEFINITIONS).map(([abbr, definition]) => <button key={abbr} className={selectedTim === abbr ? 'is-active' : ''} onClick={() => handleSelectTim(abbr)}><b>{definition.name}</b><span>{abbr}</span></button>)}</div></div>
        <p>Проценты ниже — уверенность анализа в версии, а не «доля типа» в человеке.</p>
      </details>
      <ResultScreen
        result={legacyResult}
        rankedTims={toRanked(initial)}
        selectedTimAbbreviation={selectedTim}
        onSelectTim={handleSelectTim}
        monologue={session.text}
        lockedDichotomies={lockedDichotomies}
        lockedPsychosophy={lockedPsychosophy}
        setLockedPsychosophy={setLockedPsychosophy}
        onRestart={onRestart}
        onReanalyze={() => onReanalyze(lockedDichotomies, lockedPsychosophy, userPreferredTim)}
        onDichotomyChange={handleDichotomyChange}
        onLockDichotomy={handleLock}
        chatHistory={chatHistory}
        setChatHistory={setChatHistory}
        sessionName={session.name}
        sessions={legacySessions}
        activeSessionId={session.id}
        compactForTypist
      />
    </div>
  );
};
