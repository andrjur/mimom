export interface Flashcard {
  id: string;
  topic: string;
  front: string;
  back: string;
  hint?: string;
  hints?: string[];
  contentVersion?:number;
  manualCheck?: boolean;
  hintsEdited?: boolean;
  answerSpec?: {kind:'number'; value:number; unit?:string; tolerance?:number} | {kind:'formula'; index:number} | {kind:'geometry';rule:string};
  answerStats?: {correct:number; incorrect:number};
  originTopic?: string;
  ancestorTopics?: string[];
  formula?: string;
  formulaSide?: 'front'|'back';
  interval?: string;
  mastery?: 'known' | 'learning';
  source?: string;
  sourceUrl?: string;
  objective?: string;
  pending?: boolean;
  imageUrl?: string;
  quality?: 'good' | 'average' | 'bad';
  deleted?: boolean;
}

export interface User {
  name: string;
  role: string;
  daysActive: number;
  initials: string;
}

export type AiProviderFormat = 'openai-compatible' | 'gemini';

export interface UserAiConfig {
  enabled: boolean;
  format: AiProviderFormat;
  endpoint: string;
  apiKey: string;
  model: string;
  models?: string[];
}
