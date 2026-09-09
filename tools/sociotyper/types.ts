/* eslint-disable @typescript-eslint/no-explicit-any */
export type SpeechRecognitionStatus = 'idle' | 'listening' | 'reconnecting' | 'error';

export interface DichotomyResult {
  name: string;
  result: string;
  confidence: number;
  justification_pole1: string;
  justification_pole2: string;
}

export interface TIM {
  abbreviation: string;
  name:string;
}

export interface AnalysisResult {
  tim: TIM;
  summary: string;
  dichotomies: DichotomyResult[];
  analysisDuration?: number; // В секундах
  providerUsed?: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    rating?: 'like' | 'dislike';
    isError?: boolean;
}

export interface RankedTim {
    abbreviation: string;
    name: string;
    score: number;
    probability: number;
}

export interface ChatResponse {
    responseText: string;
    suggestedQuestions: string[];
}

export interface TypingSession {
  id: string;
  name: string;
  screen: 'monologue' | 'loading' | 'result';
  monologue: string;
  analysisResult: AnalysisResult | null;
  lockedDichotomies: Record<string, string>;
  lockedPsychosophy: Record<string, any>;
  selectedTimAbbreviation: string | null;
  chatHistory: ChatMessage[];
  audioData?: AudioData;
}
export interface AudioData {
  base64: string;
  mimeType: string;
  voicePrompt: string;
}
