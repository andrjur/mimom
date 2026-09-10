export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'insufficient';
export type ResultSource = 'local' | 'ai';

export interface WordEvidence {
  word: string;
  dimension: string;
  pole: string;
  count: number;
  weight: number;
}

export interface TypistDichotomy {
  name: string;
  result: string;
  confidence: number;
  evidence: string;
}

export interface TypistCandidate {
  abbreviation: string;
  name: string;
  probability: number;
  reason?: string;
}

export interface PipelineStage {
  id: string;
  label: string;
  status: 'waiting' | 'running' | 'done' | 'warning';
  model?: string;
  provider?: string;
  note?: string;
  rawResponse?: unknown;
}

export interface ProbeResult {
  probeId: string;
  label: string;
  status: 'done' | 'warning';
  provider?: string;
  model?: string;
  confidence?: number;
  pole?: string;
  leading?: string;
  evidence?: Array<{ quote?: string; observation?: string; quoteVerified?: boolean }>;
  error?: string;
  [key: string]: unknown;
}

export interface TypistResult {
  source: ResultSource;
  tim: { abbreviation: string; name: string };
  summary: string;
  confidenceLevel: ConfidenceLevel;
  confidence: number;
  alternatives: TypistCandidate[];
  dichotomies: TypistDichotomy[];
  wordEvidence: WordEvidence[];
  doubts: string[];
  stages: PipelineStage[];
  createdAt: string;
  providerUsed?: string;
  randomFallback?: boolean;
  debugTraceId?: string;
  probeResults?: ProbeResult[];
  quadra?: { name: string; confidence: number; evidence: string };
  originalHypothesis?: { tim?: { abbreviation: string; name: string }; confidence?: number; summary?: string };
}

export interface StoredAudio {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  blob?: Blob;
}

export type SessionStatus = 'draft' | 'analyzing' | 'local-ready' | 'ai-ready' | 'error';

export interface PersonSession {
  id: string;
  name: string;
  text: string;
  voiceGuide: string;
  audio: StoredAudio[];
  status: SessionStatus;
  result: TypistResult | null;
  localResult: TypistResult | null;
  aiResult: TypistResult | null;
  attemptsLeft: number;
  questionsLeft: number;
  error?: string;
  collapsed?: boolean;
  clientLogs?: string[];
  jobId?: string;
  eventCursor?: number;
  analysisStartedAt?: number;
  liveStages?: PipelineStage[];
}

export type ProviderId = 'knyazev' | 'just' | 'routerai' | 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'custom';
export type ConnectionPolicy = 'always' | 'random' | 'off' | 'system';

export interface ApiConnection {
  id: string;
  label: string;
  provider: ProviderId;
  key: string;
  baseUrl: string;
  model: string;
  policy: ConnectionPolicy;
  omniCapable?: boolean;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

export interface ByokSettings {
  mode: 'included' | 'byok';
  provider: ProviderId;
  key: string;
  baseUrl: string;
  model: string;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  connections?: ApiConnection[];
  omniEnabled?: boolean;
}

export type PersonaMode = 'kind' | 'troll' | 'dry' | 'custom';

export interface TypistPersona {
  mode: PersonaMode;
  name: string;
  emoji: string;
  instructions: string;
}
