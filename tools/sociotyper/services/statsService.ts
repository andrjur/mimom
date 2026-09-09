/* eslint-disable @typescript-eslint/no-explicit-any */
export interface UsageStats {
  launches: number;
  typings: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  providerStats: Record<string, {
    launches: number;
    typings: number;
    tokens: number;
  }>;
  ratings: {
    likes: number;
    dislikes: number;
  };
}

const DEFAULT_LOCAL_STATS: UsageStats = {
  launches: 1,
  typings: 0,
  totalTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  providerStats: {
    gemini: { launches: 1, typings: 0, tokens: 0 },
    deepseek: { launches: 0, typings: 0, tokens: 0 },
    qwen: { launches: 0, typings: 0, tokens: 0 },
    mistral: { launches: 0, typings: 0, tokens: 0 },
    groq: { launches: 0, typings: 0, tokens: 0 },
    chatgpt: { launches: 0, typings: 0, tokens: 0 },
    minimax: { launches: 0, typings: 0, tokens: 0 },
  },
  ratings: {
    likes: 0,
    dislikes: 0,
  }
};

// Realistic global statistics initialized to zero for 100% real tracking of local actions
const BASE_GLOBAL_STATS: UsageStats = {
  launches: 0,
  typings: 0,
  totalTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  providerStats: {
    gemini: { launches: 0, typings: 0, tokens: 0 },
    deepseek: { launches: 0, typings: 0, tokens: 0 },
    qwen: { launches: 0, typings: 0, tokens: 0 },
    mistral: { launches: 0, typings: 0, tokens: 0 },
    groq: { launches: 0, typings: 0, tokens: 0 },
    chatgpt: { launches: 0, typings: 0, tokens: 0 },
    minimax: { launches: 0, typings: 0, tokens: 0 },
  },
  ratings: {
    likes: 0,
    dislikes: 0,
  }
};

const LOCAL_STORAGE_KEY = 'SOCIONICS_LOCAL_STATS_v1';

// Umami event tracking helper
interface UmamiTracker {
  track: (event: string, data?: Record<string, any>) => void;
}
declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

export const trackUmamiEvent = (eventName: string, data?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.umami) {
    try {
      window.umami.track(eventName, data);
    } catch (e) {
      console.error('Umami tracking failed:', e instanceof Error ? e.message : e);
    }
  }
};

export const getLocalStats = (): UsageStats => {
  if (typeof window === 'undefined') return DEFAULT_LOCAL_STATS;
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_LOCAL_STATS));
      return DEFAULT_LOCAL_STATS;
    }
    const parsed = JSON.parse(data) as UsageStats;
    // Auto-repair/reset if local stats are polluted with the old mockup thousands of launches
    if (parsed.launches > 500) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_LOCAL_STATS));
      return DEFAULT_LOCAL_STATS;
    }
    return parsed;
  } catch {
    return DEFAULT_LOCAL_STATS;
  }
};

export const saveLocalStats = (stats: UsageStats) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats: ', e instanceof Error ? e.message : e);
  }
};

export const getGlobalStats = (): UsageStats => {
  const local = getLocalStats();
  
  // Combine base global stats with local ones so they dynamically tick up in the UI
  const combined: UsageStats = {
    launches: BASE_GLOBAL_STATS.launches + local.launches,
    typings: BASE_GLOBAL_STATS.typings + local.typings,
    totalTokens: BASE_GLOBAL_STATS.totalTokens + local.totalTokens,
    inputTokens: BASE_GLOBAL_STATS.inputTokens + local.inputTokens,
    outputTokens: BASE_GLOBAL_STATS.outputTokens + local.outputTokens,
    providerStats: {},
    ratings: {
      likes: BASE_GLOBAL_STATS.ratings.likes + local.ratings.likes,
      dislikes: BASE_GLOBAL_STATS.ratings.dislikes + local.ratings.dislikes,
    }
  };

  // Merge provider stats
  Object.keys(BASE_GLOBAL_STATS.providerStats).forEach(prov => {
    const baseProv = BASE_GLOBAL_STATS.providerStats[prov];
    const localProv = local.providerStats[prov] || { launches: 0, typings: 0, tokens: 0 };
    combined.providerStats[prov] = {
      launches: baseProv.launches + localProv.launches,
      typings: baseProv.typings + localProv.typings,
      tokens: baseProv.tokens + localProv.tokens,
    };
  });

  return combined;
};

export const trackLaunch = (provider: string) => {
  const local = getLocalStats();
  local.launches += 1;
  
  if (!local.providerStats[provider]) {
    local.providerStats[provider] = { launches: 0, typings: 0, tokens: 0 };
  }
  local.providerStats[provider].launches += 1;
  
  saveLocalStats(local);
  trackUmamiEvent('app_launch', { provider });
};

export const trackTyping = (provider: string, inputChars: number, outputChars: number) => {
  const local = getLocalStats();
  local.typings += 1;
  
  // Slavic/Cyrillic approximation: 1 token ~ 2.5 characters in average for Russian, or about 0.8 coefficient for letters
  const estimatedInputTokens = Math.round(inputChars * 0.8);
  const estimatedOutputTokens = Math.round(outputChars * 0.8);
  const total = estimatedInputTokens + estimatedOutputTokens;

  local.inputTokens += estimatedInputTokens;
  local.outputTokens += estimatedOutputTokens;
  local.totalTokens += total;

  if (!local.providerStats[provider]) {
    local.providerStats[provider] = { launches: 0, typings: 0, tokens: 0 };
  }
  local.providerStats[provider].typings += 1;
  local.providerStats[provider].tokens += total;

  saveLocalStats(local);
  trackUmamiEvent('typing_completed', { 
    provider, 
    estimatedTokens: total,
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens
  });
};

export const trackChatTokens = (provider: string, inputChars: number, outputChars: number) => {
  const local = getLocalStats();
  
  const estimatedInputTokens = Math.round(inputChars * 0.8);
  const estimatedOutputTokens = Math.round(outputChars * 0.8);
  const total = estimatedInputTokens + estimatedOutputTokens;

  local.inputTokens += estimatedInputTokens;
  local.outputTokens += estimatedOutputTokens;
  local.totalTokens += total;

  if (!local.providerStats[provider]) {
    local.providerStats[provider] = { launches: 0, typings: 0, tokens: 0 };
  }
  local.providerStats[provider].tokens += total;

  saveLocalStats(local);
  trackUmamiEvent('chat_tokens_tracked', { 
    provider, 
    estimatedTokens: total 
  });
};

export const trackRating = (isLike: boolean, prevRating?: 'like' | 'dislike') => {
  const local = getLocalStats();
  if (prevRating === 'like') local.ratings.likes = Math.max(0, local.ratings.likes - 1);
  if (prevRating === 'dislike') local.ratings.dislikes = Math.max(0, local.ratings.dislikes - 1);

  if (isLike) {
    local.ratings.likes += 1;
  } else {
    local.ratings.dislikes += 1;
  }
  saveLocalStats(local);
  trackUmamiEvent('rating_received', { rating: isLike ? 'like' : 'dislike' });
};
