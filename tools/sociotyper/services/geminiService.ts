
const mapModelName = (modelName: string | undefined): string | undefined => {
  if (!modelName) return modelName;
  if (modelName.includes('gemini-3.6-flash')) return modelName.replace('gemini-3.6-flash', 'gemini-2.5-flash');
  if (modelName.includes('gemini-3.5-pro')) return modelName.replace('gemini-3.5-pro', 'gemini-2.5-pro');
  return modelName;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
import { AnalysisResult, ChatMessage } from '../types';

export interface ProviderConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export const getActiveProviderConfig = (): ProviderConfig => {
  const provider = localStorage.getItem('ACTIVE_PROVIDER') || 'gemini';
  let apiKey = localStorage.getItem(`${provider.toUpperCase()}_API_KEY`) || '';
  if (!apiKey && provider === 'gemini') {
    apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || '';
  }
  const baseUrl = localStorage.getItem(`${provider.toUpperCase()}_BASE_URL`) || '';
  const model = localStorage.getItem(`${provider.toUpperCase()}_MODEL`) || (provider === 'gemini' ? 'gemini-3.6-flash' : '');
  return { provider, apiKey, baseUrl, model };
};

export const getAllConfiguredProviders = (): ProviderConfig[] => {
  if (typeof window === 'undefined') return [];
  const providers = ['gemini', 'deepseek', 'qwen', 'mistral', 'groq', 'chatgpt', 'minimax', 'openrouter', 'github', 'huggingface', 'cohere', 'together', 'sambanova', 'xai', 'novita', 'yandex', 'sber', 'nvidia', 'custom', 'omniroute'];
  const configs: ProviderConfig[] = [];
  
  providers.forEach(p => {
    let apiKey = localStorage.getItem(`${p.toUpperCase()}_API_KEY`) || '';
    if (!apiKey && p === 'gemini') {
      apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || '';
    }
    if (apiKey || p === 'gemini' || p === 'pollinations') {
      configs.push({
        provider: p,
        apiKey,
        baseUrl: localStorage.getItem(`${p.toUpperCase()}_BASE_URL`) || '',
        model: localStorage.getItem(`${p.toUpperCase()}_MODEL`) || (p === 'gemini' ? 'gemini-3.6-flash' : '')
      });
    }
  });
  
  return configs;
};

export const isOverloadedError = (error: any): boolean => {
  if (error && (error.status === 429 || error.status === 503)) return true;
  if (error && error.message && (error.message.includes('429') || error.message.includes('503') || error.message.includes('overloaded'))) return true;
  return false;
};


export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  const config = getActiveProviderConfig();
  const gladiaKey = localStorage.getItem('gladiaKey') || '';
  const useGladia = localStorage.getItem('useGladia') === 'true';

  try {
    if (useGladia) {
      // Gladia API
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const file = new File([blob], "audio.webm", { type: mimeType }); 

      const formData = new FormData();
      formData.append('audio', file);
      formData.append('language', 'ru');

      const response = await fetch('https://api.gladia.io/v2/transcription', {
        method: 'POST',
        headers: {
          'x-gladia-key': gladiaKey.trim()
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error("Gladia API Error: " + errorText);
      }
      
      const resJson = await response.json();
      
      const resultUrl = resJson.result_url;
      if (!resultUrl) {
         throw new Error("No result_url from Gladia");
      }

      // Polling for Gladia result
      let transcriptionText = '';
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const pollRes = await fetch(resultUrl, {
          headers: { 'x-gladia-key': gladiaKey.trim() }
        });
        const pollData = await pollRes.json();
        if (pollData.status === 'done') {
           transcriptionText = pollData.result?.transcription?.full_transcript || '';
           break;
        } else if (pollData.status === 'error') {
           throw new Error('Gladia transcription failed');
        }
      }
      return transcriptionText;

    } else if (config.provider === 'gemini' || !['chatgpt', 'groq'].includes(config.provider)) {
      const response = await fetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base64Data,
          mimeType,
          apiKey: config.apiKey
        })
      });
      if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        try {
          const text = await response.text();
          try {
            const errJson = JSON.parse(text);
            errMsg = errJson.message || errJson.error || errMsg;
          } catch {
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
              errMsg = 'Ошибка сервера при транскрибации. Пожалуйста, проверьте API ключ в настройках.';
            } else {
              errMsg = text.slice(0, 200) || errMsg;
            }
          }
        } catch (readErr) {
          console.warn('Failed to parse response error text:', readErr);
        }
        if (errMsg.includes('API key is required') || errMsg.includes('API_KEY_MISSING')) {
          throw new Error('API_KEY_MISSING');
        }
        throw new Error(errMsg);
      }
      const resJson = await response.json();
      return resJson.text || '';
    } else {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const file = new File([blob], "audio.mp3", { type: mimeType });

      const formData = new FormData();
      formData.append('file', file);
      
      let url = '';
      let modelName = '';
      if (config.provider === 'chatgpt') {
        url = `${config.baseUrl || 'https://api.openai.com/v1'}/audio/transcriptions`;
        modelName = 'whisper-1';
      } else {
        url = `${config.baseUrl || 'https://api.groq.com/openai/v1'}/audio/transcriptions`;
        modelName = 'whisper-large-v3';
      }
      
      formData.append('model', modelName);
      formData.append('language', 'ru');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(config.apiKey || '').trim()}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Whisper transcription failed`);
      }
      
      const resJson = await response.json();
      return resJson.text || '';
    }
  } catch (error: any) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
};

// analysisSchema moved to server-side

export const analyzeMonologue = async (
  monologue: string, 
  lockedDichotomies: Record<string, string>,
  chatHistory?: ChatMessage[],
  lockedPsychosophy?: Record<string, any>,
  audioData?: any
): Promise<AnalysisResult> => {
  const startTime = Date.now();
  const primaryConfig = getActiveProviderConfig();
  if (!primaryConfig.apiKey && primaryConfig.provider !== 'gemini') throw new Error("API_KEY_MISSING");
  
  const allConfigs = getAllConfiguredProviders();
  const fallbackConfigs = allConfigs.filter(c => c.provider !== primaryConfig.provider);

  const getPromptForProvider = (provider: string) => {
    let textToAnalyze = monologue;
    if (provider !== 'gemini' && textToAnalyze.length > 5000) {
      textToAnalyze = textToAnalyze.substring(0, 5000) + '... [текст сокращен для этой модели из-за лимитов токенов]';
    }
    
    const dichotomiesList = [
      "Рациональность / Иррациональность",
      "Экстраверсия / Интроверсия",
      "Сенсорика / Интуиция",
      "Логика / Этика",
      "Статика / Динамика",
      "Позитивизм / Негативизм",
      "Квестимность / Деклатимность",
      "Тактика / Стратегия",
      "Конструктивизм / Эмотивизм",
      "Процесс / Результат (Правые / Левые)",
      "Уступчивость / Упрямство",
      "Беспечность / Предусмотрительность",
      "Рассудительность / Решительность",
      "Объективизм / Субъективизм (Веселые / Серьезные)",
      "Аристократия / Демократия"
    ].map(d => `- ${d}`).join('\n');

    const schemaInstruction = `ОБЯЗАТЕЛЬНО верни ТОЛЬКО валидный JSON (без разметки markdown), содержащий следующие поля:
1. "tim": объект с полями "abbreviation" (например, "ИЛЭ") и "name" (например, "ИЛЭ (Дон Кихот)")
2. "summary": "Текстовое резюме анализа..."
3. "dichotomies": массив из 15 объектов, каждый из которых представляет ОДНУ из 15 соционических дихотомий (признаков Рейнина). 

Список всех 15 дихотомий, которые ДОЛЖНЫ БЫТЬ в массиве dichotomies:
${dichotomiesList}

Формат объекта дихотомии:
{
  "name": "Название дихотомии (например, Экстраверсия / Интроверсия)",
  "result": "Полюс, который победил (например, Экстраверсия)",
  "confidence": число от 0 до 1 (например, 0.85),
  "justification_pole1": "Почему это похоже на полюс 1...",
  "justification_pole2": "Почему это похоже на полюс 2..."
}

ВНИМАНИЕ: Некоторые соционические признаки заблокированы (зафиксированы) пользователем. Ты ОБЯЗАН подобрать соционический ТИМ и выставить значения дихотомий так, чтобы они СТРОГО соответствовали этим зафиксированным значениям. Ошибки недопустимы. Заблокированные признаки: ${JSON.stringify(lockedDichotomies)}
Если есть история чата, учти ее контекст: ${JSON.stringify(chatHistory || [])}
`;

    return `Ты — профессиональный эксперт по соционике.\n\n${schemaInstruction}\nПроанализируй этот текст:\n${textToAnalyze}`;
  };
  const fetchFromProvider = async (config: ProviderConfig): Promise<AnalysisResult> => {
    const prompt = getPromptForProvider(config.provider);

    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
        let jsonText = "{}";
        
        if (config.provider === 'gemini') {
          const fetchPromise = fetch('/api/gemini/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              monologue,
              lockedDichotomies,
              chatHistory,
              lockedPsychosophy,
              audioData,
              apiKey: config.apiKey,
              model: mapModelName(config.model)
            })
          });
          const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout превышен (120 сек.)")), 120000));
          const res = await Promise.race([fetchPromise, timeoutPromise]) as Response;
          if (!res.ok) {
            let errMsg = `HTTP ${res.status}`;
            try {
              const text = await res.text();
              try {
                const errJson = JSON.parse(text);
                errMsg = errJson.message || errJson.error || errMsg;
              } catch {
                if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                  errMsg = 'Ошибка сервера при анализе. Пожалуйста, проверьте API ключ в настройках.';
                } else {
                  errMsg = text.slice(0, 200) || errMsg;
                }
              }
            } catch (readErr) {
              console.warn('Failed to parse analyze error text:', readErr);
            }
            if (errMsg.includes('API key is required') || errMsg.includes('API_KEY_MISSING') || errMsg.includes('API_KEY_INVALID') || errMsg.includes('UNAUTHENTICATED')) {
              throw new Error('API_KEY_MISSING');
            }
            throw new Error(errMsg);
          }
          const parsedResult = await res.json();
          jsonText = JSON.stringify(parsedResult);
        } else {
          // OpenAI compatible endpoint
          const url = getProviderUrl(config.provider, config.baseUrl);
          
          let modelName = mapModelName(config.model);
          if (!modelName) {
            switch (config.provider) {
              case 'groq': modelName = 'llama-3.3-70b-versatile'; break;
              case 'mistral': modelName = 'mistral-large-latest'; break;
              case 'deepseek': modelName = 'deepseek-chat'; break;
              case 'qwen': modelName = 'qwen-max'; break;
              case 'minimax': modelName = 'abab6.5g-chat'; break;
              case 'yandex': modelName = 'yandexgpt'; break;
              case 'sber': modelName = 'GigaChat'; break;
              case 'pollinations': modelName = 'openai'; break;
              case 'gemini': modelName = 'gemini-3.6-flash'; break;
              case 'openrouter': modelName = 'google/gemini-3.6-flash'; break;
              case 'github': modelName = 'Phi-4-multimodal-instruct'; break;
              case 'huggingface': modelName = 'Qwen/Qwen2.5-72B-Instruct'; break;
              case 'cohere': modelName = 'command-r-plus'; break;
              case 'together': modelName = 'meta-llama/Llama-3-70b-chat-hf'; break;
              case 'sambanova': modelName = 'Meta-Llama-3.1-70B-Instruct'; break;
              case 'xai': modelName = 'grok-beta'; break;
              case 'novita': modelName = 'meta-llama/llama-3-70b-instruct'; break;
              case 'chatgpt': modelName = 'gpt-4o-mini'; break;
              case 'nvidia': modelName = 'thm/glm-4-9b-chat'; break;
              case 'custom': modelName = 'gpt-4o-mini'; break;
              case 'omniroute': modelName = 'auto'; break;
              default: modelName = 'gpt-4o'; break;
            }
          }

          const messages: any[] = [];
          if (audioData) {
             if (config.provider === 'chatgpt') {
               const audioArray = Array.isArray(audioData) ? audioData : [audioData];
               messages.push({
                 role: 'user',
                 content: [
                   { type: 'text', text: prompt + "\n\nАУДИО-ИНСТРУКЦИЯ: " + (audioArray[0].voicePrompt || 'Анализируй не только текст, но и сам голос, интонации, темп, плавность речи и паузы.') },
                   ...audioArray.map((ad: any) => {
                       let format = ad.mimeType.split('/')[1] || 'mp3';
                       if (format === 'mpeg') format = 'mp3';
                       if (format === 'ogg') format = 'mp3'; // OpenAI requires wav or mp3 mostly, but let's hope they support ogg or fallback to mp3
                       return { type: 'input_audio', input_audio: { data: ad.base64, format: format } };
                   })
                 ]
               });
             } else {
               throw new Error(`Провайдер ${config.provider} не поддерживает нативный аудио-вход.`);
             }
          } else {
             messages.push({
               role: 'system',
               content: "You are a helpful assistant that ALWAYS returns valid JSON matching the user's requested schema. Do not include markdown formatting, just raw JSON."
             });
             messages.push({
               role: 'user',
               content: prompt + "\n\nCRITICAL: You MUST return ONLY valid JSON matching exactly the requested structure."
             });
          }

          const body: any = {
            model: modelName,
            messages,
            temperature: 0.2
          };
          
          if (!['sber', 'yandex', 'huggingface', 'cohere', 'sambanova'].includes(config.provider)) {
            body.response_format = { type: "json_object" };
          }
          
          
          const fetchPromise = fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey.trim()}`
            },
            body: JSON.stringify(body)
          });
          
          const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout превышен (120 сек.)")), 120000));
          const res = await Promise.race([fetchPromise, timeoutPromise]) as Response;
          
          if (!res.ok) {
             const text = await res.text();
             let friendlyMsg = text;
             if (config.provider === 'github' && (res.status === 401 || text.includes('models') || text.includes('unauthorized'))) {
                friendlyMsg = `Ошибка авторизации GitHub Models (401). Вашему токену не хватает прав доступа к ИИ-моделям!\n\n👉 КАК ИСПРАВИТЬ:\n1. Войдите в свой аккаунт на GitHub и откройте настройки вашего Fine-grained токена.\n2. В разделе "Account permissions" (Права аккаунта) найдите строку "Models" (Модели).\n3. Установите для неё значение "Read-only" (Доступ только для чтения).\n4. Прокрутите вниз и нажмите кнопку "Save" (Сохранить).\n5. Попробуйте отправить запрос снова!`;
             }
             const errMsg = `HTTP ${res.status}: ${friendlyMsg}`;
             const err = new Error(errMsg);
             (err as any).status = res.status;
             throw err;
          }
          
          const json = await res.json();
          jsonText = json.choices?.[0]?.message?.content || "{}";
        }
        
        // Clean markdown from jsonText if model hallucinates it
        if (jsonText.startsWith('```')) {
           jsonText = jsonText.replace(/^\s*```json\s*/i, '').replace(/^\s*```\s*/, '').replace(/\s*```\s*$/, '');
        }

        
        console.log('--- RAW JSON RESPONSE FROM MODEL ---');
        console.log(jsonText);
        
        console.log('------------------------------------');
        if (jsonText.indexOf('"tim": null') !== -1 && jsonText.indexOf('"name": "') !== -1) {
             // specific edge case fixing
             try {
                 const parsedTry = JSON.parse(jsonText);
                 if (!parsedTry.tim && parsedTry.dichotomies && parsedTry.summary) {
                     // The model gave dichotomies and summary, but no TIM block. 
                     // Let's try to extract TIM from the summary or somewhere else
                     const extractedTimMatch = parsedTry.summary.match(/(ИЛЭ|СЭИ|ЭСЭ|ЛИИ|ЭИЭ|ЛСИ|СЛЭ|ИЭИ|СЭЭ|ИЛИ|ЛИЭ|ЭСИ|ЛСЭ|ЭИИ|ИЭЭ|СЛИ)/);
                     if (extractedTimMatch) {
                         parsedTry.tim = { abbreviation: extractedTimMatch[1], name: extractedTimMatch[1] };
                         jsonText = JSON.stringify(parsedTry);
                     }
                 }
             } catch(e) {
                 console.warn("Edge case parsedTry failed", e);
             }
        }

        
        // Sometimes the model wraps the whole response in an array
        if (jsonText.trim().startsWith('[') && jsonText.trim().endsWith(']')) {
           try {
             const parsedArray = JSON.parse(jsonText);
             if (parsedArray.length > 0) {
               jsonText = JSON.stringify(parsedArray[0]);
             }
           } catch(e) {
             console.warn("Array parsing failed", e);
           }
        }

                
        let parsed: Record<string, any> = {};
        try {
            parsed = JSON.parse(jsonText);
        } catch (e) {
            console.error("JSON parse error:", e);
            // Try to extract anything that looks like JSON if it's wrapped in text
            const match = jsonText.match(/\{.*\}/s);
            if (match) {
                try {
                    parsed = JSON.parse(match[0]);
                } catch (e2) {
                    throw new Error("Не удалось распарсить ответ от модели ИИ (неверный формат JSON).");
                }
            } else {
                throw new Error("Не удалось распарсить ответ от модели ИИ (неверный формат JSON).");
            }
        }

        
        // Найдём TIM
        let tim = parsed.tim;
        if (!tim) {
                        const searchTim = (obj: any): any => {
                if (!obj || typeof obj !== 'object') return null;
                if (obj.abbreviation && obj.name) return { abbreviation: obj.abbreviation, name: obj.name };
                if (obj.abbreviation && obj.type) return { abbreviation: obj.abbreviation, name: obj.type };
                if (obj.type_code && obj.name) return { abbreviation: obj.type_code, name: obj.name };
                if (obj.type_code && obj.type) return { abbreviation: obj.type_code, name: obj.type };
                if (obj.socionics && obj.socionics.abbreviation) return { abbreviation: obj.socionics.abbreviation, name: obj.socionics.type || obj.socionics.name };
                
                // Match common keys for type
                const possibleTypeKeys = ['determined_type', 'socionics_type', 'type', 'likely_type', 'probable_type', 'most_likely', 'тип'];
                for (const key of possibleTypeKeys) {
                    if (obj[key]) {
                        const val = obj[key];
                        if (typeof val === 'string') {
                            const match = val.match(/(.+?)\s*\((.+?)\)/);
                            if (match) {
                                const part1 = match[1].trim();
                                const part2 = match[2].trim();
                                const abbreviation = part1.length < part2.length ? part1 : part2;
                                const name = part1.length < part2.length ? part2 : part1;
                                return { name, abbreviation };
                            }
                            return { name: val, abbreviation: val };
                        } else if (typeof val === 'object') {
                            if (val.abbreviation) return { abbreviation: val.abbreviation, name: val.name || val.type || val.abbreviation };
                            if (val.type) return { abbreviation: val.type, name: val.name || val.type };
                            if (val.likely_type) return searchTim({ type: val.likely_type });
                            if (val.probable_type) return searchTim({ type: val.probable_type });
                            if (val.most_likely) return searchTim({ type: val.most_likely });
                        }
                    }
                }

                for (const key in obj) {
                    const res = searchTim(obj[key]);
                    if (res) return res;
                }
                return null;
            };
            tim = searchTim(parsed);
        }

        let dichotomies = parsed.dichotomies;
        if (!dichotomies) {
            const searchDich = (obj: any): any => {
                if (!obj || typeof obj !== 'object') return null;
                if (Array.isArray(obj) && obj.length > 0 && obj[0].name && obj[0].result) return obj;
                if (obj.dichotomies) return obj.dichotomies;
                for (const key in obj) {
                    const res = searchDich(obj[key]);
                    if (res) return res;
                }
                return null;
            };
            let foundD = searchDich(parsed);
            if (foundD && !Array.isArray(foundD) && typeof foundD === 'object') {
                foundD = Object.keys(foundD).map(k => {
                   const val = foundD[k];
                   return {
                      name: k,
                      result: val.value || val.result || String(val),
                      confidence: val.confidence || 0,
                      justification_pole1: val.evidence || "",
                      justification_pole2: ""
                   };
                });
            }
            dichotomies = foundD || [];
        }

        let summary = parsed.summary;
        if (!summary) {
            const searchSummary = (obj: any): any => {
                if (!obj || typeof obj !== 'object') return null;
                if (obj.summary && typeof obj.summary === 'string') return obj.summary;
                if (obj.summary && typeof obj.summary === 'object') return JSON.stringify(obj.summary);
                for (const key in obj) {
                    const res = searchSummary(obj[key]);
                    if (res) return res;
                }
                return null;
            };
            summary = searchSummary(parsed) || "Резюме не найдено, но тип определен.";
        }

        parsed.tim = tim;
        parsed.dichotomies = dichotomies;
        parsed.summary = summary;

        // Relaxing the validation slightly if only some fields are missing but tim is there
        
        
        if (!parsed.tim) {
            // One final check - did the model just return the tim as a string?
            if (typeof parsed === 'string') {
               try { parsed = JSON.parse(parsed) } catch (e) { console.warn("Failed parsing parsed string", e); }
            }
            if (parsed.tim_abbreviation || parsed.tim_name) {
                parsed.tim = { abbreviation: parsed.tim_abbreviation || parsed.tim_name, name: parsed.tim_name || parsed.tim_abbreviation };
            }
            if (parsed.result && typeof parsed.result === 'string') {
               parsed.tim = { abbreviation: parsed.result, name: parsed.result };
            }
        }
        if (!parsed.tim) {
            if (Object.keys(parsed).length === 0) {
               throw new Error("Модель вернула пустой ответ. Повторная попытка...");
            }
            const genericTimMatch = parsed.summary ? parsed.summary.match(/(ИЛЭ|СЭИ|ЭСЭ|ЛИИ|ЭИЭ|ЛСИ|СЛЭ|ИЭИ|СЭЭ|ИЛИ|ЛИЭ|ЭСИ|ЛСЭ|ЭИИ|ИЭЭ|СЛИ)/) : null;
            if (genericTimMatch) {
               parsed.tim = { abbreviation: genericTimMatch[1], name: genericTimMatch[1] };
            } else {
               throw new Error("Модель ИИ вернула неполный ответ (отсутствуют ключевые шкалы).");
            }
        }
        if (!parsed.summary) {
           parsed.summary = "Анализ завершен, но резюме не было сформировано моделью.";
        }
        if (!parsed.dichotomies || !Array.isArray(parsed.dichotomies)) parsed.dichotomies = [];
        if (!parsed.functions) parsed.functions = {};
        if (!parsed.psychosophy) parsed.psychosophy = {};
        parsed.analysisDuration = Math.round((Date.now() - startTime) / 1000);
        parsed.providerUsed = config.provider;
        return parsed as AnalysisResult;
      } catch (error: any) {
        if (config.provider === primaryConfig.provider) {
          console.warn(`Attempt ${attempts} failed for provider ${config.provider}`, error);
        }
        if (config.provider === primaryConfig.provider) {
          window.dispatchEvent(new CustomEvent('analyze_retry', { 
            detail: { attempt: attempts, errorMsg: error.message || 'Ошибка парсинга JSON', provider: config.provider }
          }));
        }
        if (error.status === 429 || error.status === 402 || attempts >= 3) {
          if (config.provider === primaryConfig.provider && (error.status === 429 || error.status === 402)) {
             error.message = error.status === 429 ? "Исчерпан лимит запросов (Rate Limit) у провайдера. " + (config.provider === 'groq' ? "Пожалуйста, подождите минуту или выберите другую модель." : "") : "Недостаточно средств (Insufficient Balance) на ключе API.";
          }
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    throw new Error("Failed after retries");
  };

  const primaryPromise = fetchFromProvider(primaryConfig);
  const fallbackPromises = fallbackConfigs.map(c => fetchFromProvider(c));
  
    const timeoutPromise = new Promise<AnalysisResult>((_, reject) => {
    setTimeout(() => {
      reject(new Error("Время ожидания ответа ИИ истекло (120 сек). Модель слишком долго обрабатывала запрос (вероятно, провайдер перегружен). Попробуйте сменить модель в настройках."));
    }, 120000);
  });

  const executionPromise = (async () => {
    if (fallbackPromises.length === 0) {
      return primaryPromise;
    }

    return new Promise<AnalysisResult>((resolve, reject) => {
      let resolved = false;
      let firstFallbackResult: AnalysisResult | null = null;
      let primaryError: any = null;

      const onAnyFinish = (res: AnalysisResult) => {
        if (!resolved) {
          resolved = true;
          resolve(res);
        }
      };

      primaryPromise.then(res => {
        onAnyFinish(res);
      }).catch(err => {
        primaryError = err;
        if (!resolved && firstFallbackResult) {
          resolved = true;
          resolve(firstFallbackResult);
        }
      });

      Promise.any(fallbackPromises).then(res => {
        firstFallbackResult = res;
        if (primaryError && !resolved) {
          resolved = true;
          resolve(res);
        }
      }).catch(() => {});

      Promise.allSettled([primaryPromise, ...fallbackPromises]).then(results => {
        if (!resolved) {
          const successes = results.filter(r => r.status === 'fulfilled');
          if (successes.length > 0) {
            resolved = true;
            resolve((successes[0] as PromiseFulfilledResult<AnalysisResult>).value);
          } else {
            resolved = true;
            reject(primaryError || new Error("Все ИИ-провайдеры завершились с ошибкой"));
          }
        }
      });
    });
  })();

  return Promise.race([executionPromise, timeoutPromise]);
};

// chatSchema moved to server-side


const getProviderUrl = (provider: string, baseUrl?: string): string => {
  let url = baseUrl;
  if (!url) {
    switch (provider) {
      case 'groq': return 'https://api.groq.com/openai/v1/chat/completions';
      case 'mistral': return 'https://api.mistral.ai/v1/chat/completions';
      case 'deepseek': return 'https://api.deepseek.com/v1/chat/completions';
      case 'qwen': return 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
      case 'minimax': return 'https://api.minimax.chat/v1/chat/completions';
      case 'yandex': return 'https://llm.api.cloud.yandex.net/foundationModels/v1/chat/completions';
      case 'sber': return 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
      case 'gemini': return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      case 'openrouter': return 'https://openrouter.ai/api/v1/chat/completions';
      case 'github': return 'https://models.inference.ai.azure.com/chat/completions';
      case 'huggingface': return 'https://api-inference.huggingface.co/v1/chat/completions';
      case 'cohere': return 'https://api.cohere.ai/v1/chat/completions';
      case 'together': return 'https://api.together.xyz/v1/chat/completions';
      case 'sambanova': return 'https://api.sambanova.ai/v1/chat/completions';
      case 'xai': return 'https://api.x.ai/v1/chat/completions';
      case 'novita': return 'https://api.novita.ai/v3/openai/chat/completions';
      case 'chatgpt': return 'https://api.openai.com/v1/chat/completions';
      case 'nvidia': return 'https://integrate.api.nvidia.com/v1/chat/completions';
      case 'omniroute': return 'http://localhost:20128/v1/chat/completions';
      default: return 'https://api.openai.com/v1/chat/completions';
    }
  }
  if (!url.endsWith('/chat/completions')) {
    url = url.replace(/\/$/, '') + '/chat/completions';
  }
  return url;
};

export const getChatResponse = async (
  historyOrQuestion: any,
  result: AnalysisResult,
  selectedTim: string
): Promise<{ responseText: string, suggestedQuestions: string[] }> => {
  const config = getActiveProviderConfig();
  if (!config.apiKey) throw new Error("API_KEY_MISSING");

  let chatContext = "";
  if (Array.isArray(historyOrQuestion)) {
      chatContext = historyOrQuestion.map(m => `${m.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${m.content}`).join('\n');
  } else {
      chatContext = `Пользователь: ${historyOrQuestion}`;
  }

  const prompt = `Контекст диалога по типированию:\nЕго ТИМ: ${selectedTim}.\nИстория диалога:\n${chatContext}\n\nОБЯЗАТЕЛЬНО верни валидный JSON с полями:\n1. "responseText": "твой ответ"\n2. "suggestedQuestions": массив строк с 3-4 рекомендованными вопросами.\nВерни ТОЛЬКО JSON.`;

  if (config.provider === 'gemini') {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          historyOrQuestion,
          result,
          selectedTim,
          apiKey: config.apiKey,
          model: mapModelName(config.model)
        })
      });
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.message || `HTTP ${response.status}: Chat generation failed`);
      }
      return response.json();
  } else {
      const url = getProviderUrl(config.provider, config.baseUrl);
      const body: any = {
        model: mapModelName(config.model) || 'mixtral-8x7b-32768',
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      };
      if (!['sber', 'yandex', 'huggingface', 'cohere', 'sambanova'].includes(config.provider)) {
        body.response_format = { type: "json_object" };
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey.trim()}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const json = await res.json();
      let text = json.choices?.[0]?.message?.content || "{}";
      if (text.startsWith('```')) text = text.replace(/^\s*```json\s*/i, '').replace(/^\s*```\s*/, '').replace(/\s*```\s*$/, '');
      return JSON.parse(text);
  }
};

export const analyzeCompatibility = async (name1: string, tim1: string, psycho1: string, name2: string, tim2: string, psycho2: string, relationContext: string = "Романтика / Брак"): Promise<string> => {
  const config = getActiveProviderConfig();
  if (!config.apiKey && config.provider !== 'gemini') throw new Error("API_KEY_MISSING");

  const prompt = `Проанализируй интертипные отношения в соционике и психософии (Афанасьева) между двумя участниками.
Участник 1: ${name1}, ТИМ: ${tim1}, Психософия: ${psycho1}
Участник 2: ${name2}, ТИМ: ${tim2}, Психософия: ${psycho2}
Контекст взаимодействия: ${relationContext}

Опиши их совместимость именно в контексте "${relationContext}", возможные сильные стороны союза и потенциальные конфликты (как по функциям ТИМа, так и по функциям Психософии). Дай практические советы для улучшения отношений в этой сфере. Сделай ответ структурированным, с подзаголовками и красивым форматированием.`;

  if (config.provider === 'gemini') {
      const response = await fetch('/api/gemini/compatibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name1,
          tim1,
          psycho1,
          name2,
          tim2,
          psycho2,
          relationContext,
          apiKey: config.apiKey,
          model: mapModelName(config.model)
        })
      });
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.message || `HTTP ${response.status}: Compatibility analysis failed`);
      }
      const resJson = await response.json();
      return resJson.text || "Анализ не удался.";
  } else {
      const url = getProviderUrl(config.provider, config.baseUrl);
      const body = {
        model: mapModelName(config.model) || 'mixtral-8x7b-32768',
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey.trim()}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const json = await res.json();
      return json.choices?.[0]?.message?.content || "Анализ не удался.";
  }
};

export const analyzeMotivation = async (name: string, tim: string, psychosophy: string): Promise<string> => {
  const config = getActiveProviderConfig();
  if (!config.apiKey) throw new Error("API_KEY_MISSING");

  const prompt = `Проанализируй синергию ТИМа (${tim}) и Психософского типа (${psychosophy}) для пользователя по имени ${name}.\nОпиши их "Совместный вектор мотивации" - как соционика и психософия дополняют друг друга. \nДай точные советы по выбору карьеры, рабочему окружению и способам избегать выгорания.\nСделай ответ структурированным, с подзаголовками и красивым форматированием.`;

  if (config.provider === 'gemini') {
      const response = await fetch('/api/gemini/motivation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          tim,
          psychosophy,
          apiKey: config.apiKey,
          model: mapModelName(config.model)
        })
      });
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.message || `HTTP ${response.status}: Motivation analysis failed`);
      }
      const resJson = await response.json();
      return resJson.text || "Анализ не удался.";
  } else {
      const url = getProviderUrl(config.provider, config.baseUrl);
      const body = {
        model: mapModelName(config.model) || 'mixtral-8x7b-32768',
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey.trim()}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const json = await res.json();
      return json.choices?.[0]?.message?.content || "Анализ не удался.";
  }
};
