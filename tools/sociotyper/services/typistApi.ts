import type { ByokSettings, PipelineStage, ProbeResult, TypistDichotomy, TypistPersona, TypistResult } from '../typistTypes';

export const DEFAULT_API_BASE = (import.meta as ImportMeta & { env?: { VITE_TYPIST_API_BASE?: string } }).env?.VITE_TYPIST_API_BASE || '/api/typist';

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord => value && typeof value === 'object' ? value as JsonRecord : {};

const normalizeConfidence = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
};

export function normalizeRemoteResult(payloadInput: unknown): TypistResult {
  const payload = record(payloadInput);
  const value = record(payload.result || payload);
  const probeResults = (payload?.probeResults || value?.probeResults || []) as ProbeResult[];
  const timValue = record(value.tim);
  const confidence = normalizeConfidence(value.confidence ?? timValue.confidence ?? 0);
  const level = (['low', 'medium', 'high', 'insufficient'].includes(String(value.confidenceLevel)) ? value.confidenceLevel : (confidence >= 78 ? 'high' : confidence >= 52 ? 'medium' : confidence >= 30 ? 'low' : 'insufficient')) as TypistResult['confidenceLevel'];
  const rawStages = Array.isArray(payload.stages) ? payload.stages : Array.isArray(value.stages) ? value.stages : [
    { id: 'observations', label: 'Наблюдения', status: 'done' },
    { id: 'hypotheses', label: 'Гипотезы', status: 'done' },
    { id: 'critic', label: 'Критик', status: 'done' },
    { id: 'final', label: 'Итог', status: 'done' }
  ];
  const stages: PipelineStage[] = rawStages.map(stageInput => {
    const stage = record(stageInput) as unknown as PipelineStage;
    return ({
    ...stage,
    rawResponse: stage.rawResponse ?? probeResults.find(item => item.probeId === stage.id)
    });
  });

  const finalDichotomies: TypistDichotomy[] = (Array.isArray(value.dichotomies) ? value.dichotomies : []).map(itemInput => {
    const item = record(itemInput);
    return ({
    name: String(item.name || item.dimension || 'Шкала'),
    result: String(item.result || item.value || 'Недостаточно данных'),
    confidence: normalizeConfidence(item.confidence),
    evidence: String(item.evidence || item.justification || item.justification_pole1 || '')
    });
  });
  const byName = new Map(finalDichotomies.map(item => [item.name, item]));
  const probeDichotomies: TypistDichotomy[] = probeResults.filter(item => item.probeId?.startsWith('reinin-')).map(item => {
    const quotes = Array.isArray(item.evidence) ? item.evidence.map(row => row?.quote ? `«${row.quote}»${row.observation ? ` — ${row.observation}` : ''}` : row?.observation || '').filter(Boolean) : [];
    return {
      name: String(item.label || item.probeId),
      result: String(item.pole || 'Недостаточно данных'),
      confidence: normalizeConfidence(item.confidence),
      evidence: quotes.join(' · ') || String(item.missing || item.error || 'Прямая цитата не получена.')
    };
  });
  probeDichotomies.forEach(item => byName.set(item.name, { ...byName.get(item.name), ...item }));
  const quadraProbe = probeResults.find(item => item.probeId === 'quadra-spirit');
  if (quadraProbe) {
    const quote = Array.isArray(quadraProbe.evidence) ? quadraProbe.evidence.map(row => row?.quote ? `«${row.quote}»${row.observation ? ` — ${row.observation}` : ''}` : row?.observation || '').filter(Boolean).join(' · ') : '';
    byName.set('Дух квадры', { name: 'Дух квадры', result: String(quadraProbe.leading || 'Недостаточно данных'), confidence: normalizeConfidence(quadraProbe.confidence), evidence: quote || String(quadraProbe.error || 'Прямая цитата не получена.') });
  }

  return {
    source: 'ai',
    tim: {
      abbreviation: String(timValue.abbreviation || (typeof value.tim === 'string' ? value.tim : '') || '—'),
      name: String(timValue.name || value.name || 'Тип не определён')
    },
    summary: String(value?.summary || 'ИИ вернул результат без краткого резюме.'),
    confidenceLevel: level,
    confidence,
    alternatives: (Array.isArray(value.alternatives) ? value.alternatives : []).slice(0, 3).map(itemInput => {
      const item = record(itemInput);
      return ({
      abbreviation: String(item.abbreviation || item.tim || '—'),
      name: String(item.name || 'Альтернатива'),
      probability: normalizeConfidence(item.probability ?? item.confidence ?? 0),
      reason: String(item.reason || '')
      });
    }),
    dichotomies: Array.from(byName.values()),
    wordEvidence: (Array.isArray(value.wordEvidence) ? value.wordEvidence : []).map(itemInput => {
      const item = record(itemInput);
      return ({
      word: String(item.word || item.quote || ''),
      dimension: String(item.dimension || 'Наблюдение'),
      pole: String(item.pole || ''),
      count: Number(item.count || 1),
      weight: Number(item.weight || 1)
      });
    }),
    doubts: (Array.isArray(value.doubts) ? value.doubts : Array.isArray(value.uncertainties) ? value.uncertainties : []).map(String),
    stages,
    createdAt: new Date().toISOString(),
    providerUsed: String(payload?.providerUsed || value?.providerUsed || 'ИИ'),
    randomFallback: Boolean(value?.randomFallback || payload?.randomFallback),
    debugTraceId: String(payload.traceId || value.debugTraceId || '') || undefined,
    probeResults,
    originalHypothesis: payload.originalHypothesis as TypistResult['originalHypothesis'],
    quadra: value.quadra ? { name: String(record(value.quadra).name || ''), confidence: normalizeConfidence(record(value.quadra).confidence), evidence: String(record(value.quadra).evidence || '') } : undefined
  };
}

export async function requestAnalysis(input: {
  sessionId: string;
  name: string;
  text: string;
  voiceGuide: string;
  audio: Array<{ name: string; mimeType: string; base64: string }>;
  byok: ByokSettings;
  debugConsent: boolean;
  lockedDichotomies?: Record<string, string>;
  lockedPsychosophy?: Record<string, unknown>;
  preferredTim?: string;
  signal?: AbortSignal;
  onLog?: (entry: unknown) => void;
  onJob?: (id: string) => void;
}): Promise<{ result: TypistResult; attemptsLeft?: number }> {
  input.onLog?.({ event: 'client.request.start', at: new Date().toISOString(), sessionId: input.sessionId, textChars: input.text.length, audioFiles: input.audio.length });
  const health = await fetch(`${DEFAULT_API_BASE}/health`, { signal: input.signal }).then(response => response.json());
  if (input.byok.mode !== 'byok' && !health.includedReady) throw new Error('Встроенный API пока не настроен. Подключите свой ключ; попытка не списана.');
  if (!health.jobsReady) throw new Error('Сервер заданий пока не настроен. Попытка не списана.');
  let audioContext = '';
  if (input.audio.length && input.byok.omniEnabled !== false) {
    input.onLog?.({ event: 'audio.transcription.start' });
    const transcription = await fetch(`${DEFAULT_API_BASE}/transcribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', signal: input.signal, body: JSON.stringify({ audio: input.audio, voiceGuide: input.voiceGuide, byok: input.byok }) });
    const data = await transcription.json();
    if (!transcription.ok) throw new Error(`Расшифровка не получена: ${data.error || transcription.status}. Добавьте текст или выберите аудиомодель.`);
    audioContext = String(data.transcript || '');
    input.onLog?.({ event: 'audio.transcription.complete', transcript: audioContext });
  }
  const jobId = crypto.randomUUID();
  const response = await fetch(`${DEFAULT_API_BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    signal: input.signal,
    body: JSON.stringify({ ...input, audio: undefined, audioContext, jobId })
  });
  const text = await response.text();
  let payload: JsonRecord = {};
  try { payload = JSON.parse(text); } catch { payload = { message: text }; }
  input.onLog?.({ event: 'client.response', at: new Date().toISOString(), status: response.status, payload });
  if (!response.ok) throw new Error(String(payload.message || payload.error || `HTTP ${response.status}`));
  input.onJob?.(jobId);
  return pollAnalysis(jobId, input.signal, input.onLog);
}

export async function cancelJob(id: string) {
  const response = await fetch(`${DEFAULT_API_BASE}/jobs/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
  if (!response.ok) throw new Error('Сервер не подтвердил остановку задания.');
}

export async function pollAnalysis(id: string, signal?: AbortSignal, onLog?: (entry: unknown) => void): Promise<{ result: TypistResult; attemptsLeft?: number }> {
  let cursor = 0;
  let networkErrors = 0;
  while (true) {
    signal?.throwIfAborted();
    let response: Response;
    try {
      response = await fetch(`${DEFAULT_API_BASE}/jobs/${encodeURIComponent(id)}?after=${cursor}`, { credentials: 'include', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
      networkErrors = 0;
    } catch (error) {
      if (signal?.aborted || ++networkErrors > 5) throw error;
      onLog?.({ event: 'connection.retry', attempt: networkErrors });
      await new Promise(resolve => setTimeout(resolve, 2000));
      continue;
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || payload.error || `HTTP ${response.status}`);
    for (const entry of payload.events || []) onLog?.(entry);
    cursor = Number(payload.cursor) || cursor;
    if (payload.hasMore) continue;
    if (payload.status === 'complete') return { result: normalizeRemoteResult(payload.result), attemptsLeft: payload.result?.attemptsLeft };
    if (payload.status === 'error' || payload.status === 'cancelled') throw new Error(payload.error || (payload.status === 'cancelled' ? 'Анализ остановлен.' : 'Ошибка задания. Попытка возвращена.'));
    await new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
      const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, 1800);
      signal?.addEventListener('abort', abort, { once: true });
    });
  }
}

export async function askTypist(input: {
  sessionId: string;
  question: string;
  result: TypistResult;
  byok: ByokSettings;
  persona: TypistPersona;
}): Promise<{ answer: string; suggestedQuestions: string[]; questionsLeft?: number }> {
  const response = await fetch(`${DEFAULT_API_BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
  return {
    answer: String(payload.answer || payload.responseText || ''),
    suggestedQuestions: (payload.suggestedQuestions || []).map(String),
    questionsLeft: payload.questionsLeft
  };
}

export async function redeemAccessCode(code: string): Promise<{ attemptsLeft: number; questionsLeft: number }> {
  const response = await fetch(`${DEFAULT_API_BASE}/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || 'Код не найден или уже использован.');
  return { attemptsLeft: Number(payload.attemptsLeft || 0), questionsLeft: Number(payload.questionsLeft || 0) };
}

export async function getUsageStatus(): Promise<{ attemptsLeft: number; questionsLeft: number }> {
  const response = await fetch(`${DEFAULT_API_BASE}/status`, { credentials: 'include' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
  return { attemptsLeft: Number(payload.attemptsLeft || 0), questionsLeft: Number(payload.questionsLeft || 0) };
}

export async function validateByok(settings: ByokSettings): Promise<{ provider: string; model: string }> {
  const response = await fetch(`${DEFAULT_API_BASE}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(settings)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Ключ не прошёл проверку.');
  return { provider: String(payload.provider || settings.provider), model: String(payload.model || settings.model) };
}

export function fileToBase64(file: Blob, onProgress?: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = event => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    reader.onload = () => {
      onProgress?.(100);
      resolve(String(reader.result).split(',')[1] || '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
