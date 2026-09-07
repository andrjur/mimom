import { EmailMessage } from 'cloudflare:email';

const ALLOWED_ORIGINS = new Set([
  'https://indikov.ru',
  'https://www.indikov.ru',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://127.0.0.1:8770',
  'http://localhost:8770',
  'http://127.0.0.1:8771',
  'http://localhost:8771'
]);

const isAllowedOrigin = origin => {
  if (!origin || ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith('.workers.dev') || host.endsWith('.workers.run');
  } catch { return false; }
};

const TYPE_NAMES = {
  'ИЛЭ': 'Дон Кихот', 'СЭИ': 'Дюма', 'ЭСЭ': 'Гюго', 'ЛИИ': 'Робеспьер',
  'ЭИЭ': 'Гамлет', 'ЛСИ': 'Максим Горький', 'СЛЭ': 'Жуков', 'ИЭИ': 'Есенин',
  'СЭЭ': 'Наполеон', 'ЛИЭ': 'Джек Лондон', 'ИЛИ': 'Бальзак', 'ЭСИ': 'Драйзер',
  'ЛСЭ': 'Штирлиц', 'ЭИИ': 'Достоевский', 'ИЭЭ': 'Гексли', 'СЛИ': 'Габен'
};

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
});

const corsHeaders = origin => ({
  'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? (origin || 'https://indikov.ru') : 'https://indikov.ru',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Vary': 'Origin'
});

const getCookie = (request, name) => {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : '';
};

const cleanId = value => /^[a-zA-Z0-9_-]{8,100}$/.test(value || '') ? value : '';

async function getVisitor(request) {
  const existing = cleanId(getCookie(request, 'nid'));
  return { id: existing || crypto.randomUUID(), fresh: !existing };
}

async function ensureUser(env, visitorId) {
  if (!env.DB) return { analysis_credits: 4, question_credits: 10 };
  await env.DB.prepare(`INSERT OR IGNORE INTO users (session_id, analysis_credits, question_credits, created_at, updated_at)
    VALUES (?, 4, 10, datetime('now'), datetime('now'))`).bind(visitorId).run();
  return env.DB.prepare('SELECT analysis_credits, question_credits FROM users WHERE session_id = ?').bind(visitorId).first();
}

async function consumeCredit(env, visitorId, kind) {
  // Быстрый деморежим без D1. Счётчик надёжно хранится в браузере; после
  // подключения D1 сервер начнёт контролировать остаток самостоятельно.
  if (!env.DB) return {
    analysis_credits: kind === 'analysis' ? 3 : 4,
    question_credits: kind === 'question' ? 9 : 10
  };
  await ensureUser(env, visitorId);
  const column = kind === 'analysis' ? 'analysis_credits' : 'question_credits';
  const updated = await env.DB.prepare(`UPDATE users SET ${column} = ${column} - 1, updated_at = datetime('now') WHERE session_id = ? AND ${column} > 0 RETURNING analysis_credits, question_credits`).bind(visitorId).first();
  if (!updated) throw new Error(kind === 'analysis' ? 'NO_ANALYSIS_CREDITS' : 'NO_QUESTION_CREDITS');
  return updated;
}

const stripFences = text => String(text || '').replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();

function parseJsonResponse(payload) {
  const anthropicText = Array.isArray(payload?.content) ? payload.content.find(item => item?.type === 'text')?.text : '';
  const text = payload?.choices?.[0]?.message?.content ?? anthropicText ?? payload?.text ?? '';
  const clean = stripFences(text);
  try { return JSON.parse(clean); } catch {
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error('MODEL_INVALID_JSON');
  }
}

function resolveProvider(env, byok = {}) {
  if (byok.mode === 'byok') {
    if (!byok.key || typeof byok.key !== 'string' || byok.key.length < 8) throw new Error('BYOK_KEY_MISSING');
    const allowed = new Set(['knyazev', 'gemini', 'openai', 'anthropic', 'openrouter', 'custom']);
    if (!allowed.has(byok.provider)) throw new Error('BYOK_PROVIDER_NOT_ALLOWED');
    const defaults = {
      knyazev: 'https://knyazevai.work/v1',
      gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com/v1',
      openrouter: 'https://openrouter.ai/api/v1'
    };
    let baseUrl = defaults[byok.provider] || String(byok.baseUrl || '');
    if (byok.provider === 'custom') {
      if (env.ALLOW_CUSTOM_BYOK !== 'true') throw new Error('CUSTOM_BYOK_DISABLED');
      const target = new URL(baseUrl);
      const hostname = target.hostname.toLowerCase();
      if (target.protocol !== 'https:' || hostname === 'localhost' || hostname.endsWith('.local') || /^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname)) {
        throw new Error('CUSTOM_BYOK_URL_NOT_ALLOWED');
      }
    }
    return {
      provider: byok.provider,
      shared: false,
      key: byok.key,
      baseUrl: baseUrl.replace(/\/$/, ''),
      model: String(byok.model || ''),
      effort: ['low', 'medium', 'high', 'xhigh', 'max'].includes(byok.effort) ? byok.effort : 'high',
      logPrompts: env.LOG_PROMPTS === 'true'
    };
  }
  const includedKey = env.KNYAZEV_API_KEY;
  if (!includedKey) throw new Error('INCLUDED_PROVIDER_NOT_CONFIGURED');
  return {
    provider: 'knyazev',
    shared: true,
    key: includedKey,
    baseUrl: (env.KNYAZEV_BASE_URL || 'https://knyazevai.work/v1').replace(/\/$/, ''),
    model: env.KNYAZEV_MODEL || 'minimax-2.7',
    logPrompts: env.LOG_PROMPTS === 'true'
  };
}

async function callTextModel(config, prompt, modelOverride, meta = {}) {
  const model = modelOverride || config.model;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('MODEL_TIMEOUT'), Number(meta.timeoutMs || 90000));
  const logFull = Boolean(config.logPrompts && meta.fullLog);
  console.log({
    event: 'typist.model.request', traceId: meta.traceId || '', stage: meta.stage || 'unknown',
    provider: config.provider, model, promptChars: prompt.length,
    prompt: logFull ? prompt : undefined,
    promptPreview: logFull ? undefined : '[скрыт: пользователь не включил отладочное сохранение]'
  });
  try {
    let response;
    if (config.provider === 'anthropic') {
      response = await fetch(`${config.baseUrl || 'https://api.anthropic.com/v1'}/messages`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-api-key': config.key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: meta.maxTokens || 2400, temperature: 0.1, output_config: { effort: config.effort || 'high' }, messages: [{ role: 'user', content: prompt }] })
      });
    } else {
      response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.key}` },
        body: JSON.stringify({
          model, temperature: 0.1, max_tokens: meta.maxTokens || 2400, response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Return valid JSON only. Be explicit about uncertainty. Never infer facts that are not supported by the supplied material.' },
            { role: 'user', content: prompt }
          ]
        })
      });
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || payload?.message || `UPSTREAM_${response.status}`);
    const parsed = parseJsonResponse(payload);
    console.log({
      event: 'typist.model.response', traceId: meta.traceId || '', stage: meta.stage || 'unknown',
      provider: config.provider, model, durationMs: Date.now() - startedAt,
      usage: payload?.usage || null, response: logFull ? parsed : undefined,
      responseKeys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : []
    });
    return parsed;
  } catch (error) {
    console.error({
      event: 'typist.model.error', traceId: meta.traceId || '', stage: meta.stage || 'unknown',
      provider: config.provider, model, durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function transcribeAudio(env, audio, voiceGuide) {
  if (!audio?.length) return '';
  if (!env.OMNI_API_KEY || !env.OMNI_BASE_URL || !env.OMNI_MODEL) {
    return '[Аудио приложено, но отдельная OMNI-модель пока не настроена. Не делай выводов об интонации и голосе.]';
  }
  const parts = [{ type: 'text', text: `Сделай точную расшифровку аудио. ${voiceGuide ? `Дополнительный ориентир пользователя: ${voiceGuide}.` : 'Если говорящих несколько и их нельзя надёжно различить, не приписывай реплики конкретному человеку.'} Верни JSON {"transcript":"...","voiceObservations":["..."]}. Наблюдения по темпу и паузам помечай как слабые признаки. Не определяй социотип.` }];
  for (const item of audio) {
    const format = item.mimeType.includes('wav') ? 'wav' : item.mimeType.includes('webm') ? 'webm' : 'mp3';
    parts.push({ type: 'input_audio', input_audio: { data: item.base64, format } });
  }
  const response = await fetch(`${String(env.OMNI_BASE_URL).replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OMNI_API_KEY}` },
    body: JSON.stringify({ model: env.OMNI_MODEL, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: parts }] })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OMNI_${response.status}`);
  const result = parseJsonResponse(payload);
  return `${result.transcript || ''}\n\nНаблюдения по голосу: ${(result.voiceObservations || []).join('; ')}`;
}

const compact = value => JSON.stringify(value).slice(0, 50000);

const REININ_PROBES = [
  ['ei', 'Экстраверсия / Интроверсия', 'Экстраверсия', 'Интроверсия', 1, 'Экстраверт расширяет поле объектов, людей и внешних связей; интроверт углубляет отношение субъекта к одному объекту и его внутренним нюансам.', 'Не считай общительность, сценичность, застенчивость или количество друзей прямым доказательством.'],
  ['le', 'Логика / Этика', 'Логика', 'Этика', 2, 'Логический полюс формализует через факты, правила, причинность и эффективность; этический — через мотивы, отношения, состояние людей и влияние решения на них.', 'Профессия, образование, управленческий жаргон и выученные нормы могут маскировать естественный язык выбора.'],
  ['si', 'Сенсорика / Интуиция', 'Сенсорика', 'Интуиция', 2, 'Сенсорный полюс возвращает рассказ к телу, территории, ресурсам и наблюдаемому действию; интуитивный — к возможностям, времени, смыслам и альтернативным сценариям.', 'Спорт, массаж, фантазии или любовь к технологиям по отдельности не определяют полюс.'],
  ['ri', 'Рациональность / Иррациональность', 'Рациональность', 'Иррациональность', 0.5, 'Рациональный полюс старается заранее зафиксировать решение, порядок и обязательство; иррациональный держит форму открытой и перестраивается вслед за изменившейся ситуацией.', 'Дисциплина, дедлайн, тревога и хаос быта могут быть внешней адаптацией. Вес этого признака половинный.'],
  ['sd', 'Статика / Динамика', 'Статика', 'Динамика', 2, 'Статика членит опыт на состояния, объекты и качества как отдельные кадры; динамика описывает непрерывный поток изменений, действий и переходов.', 'Считай грамматику и способ сборки рассказа на длинных фрагментах, а не наличие отдельных глаголов.'],
  ['yo', 'Уступчивость / Упрямство', 'Уступчивость', 'Упрямство', 1, 'Уступчивый легче меняет интерес или цель ради доступных ресурсов; упрямый меняет набор ресурсов и способов, сохраняя выбранный интерес.', 'Не путай с мягкостью, конфликтностью, покладистостью или силой воли.'],
  ['ad', 'Аристократия / Демократия', 'Аристократия', 'Демократия', 1, 'Аристократический полюс быстрее считывает принадлежность к группе, роль, статус и нормы слоя; демократический оценивает человека индивидуально, слабее опираясь на групповой ранг.', 'Должность, армейская или корпоративная среда создают сильные выученные маркеры.'],
  ['ts', 'Тактика / Стратегия', 'Тактика', 'Стратегия', 1, 'Тактик отталкивается от доступного следующего шага и уточняет цель по ходу; стратег удерживает дальнюю цель и подбирает либо отбрасывает шаги относительно неё.', 'Умение составлять планы есть у обоих полюсов; важно, что остаётся фиксированным при изменениях.'],
  ['ce', 'Конструктивизм / Эмотивизм', 'Конструктивизм', 'Эмотивизм', 1, 'Конструктивист сначала меняет предметную ситуацию и через дело регулирует состояние; эмотивист сначала настраивает эмоциональную атмосферу и уже из неё переходит к делу.', 'Забота поступком и сочувственные формулы могут быть воспитанными социальными навыками.'],
  ['cf', 'Беспечность / Предусмотрительность', 'Беспечность', 'Предусмотрительность', 1, 'Беспечный начинает с того, что доступно сейчас, и достраивает контекст по ходу; предусмотрительный заранее собирает условия, риски, ресурсы и недостающие сведения.', 'Не приравнивай тревожность к предусмотрительности, а смелость — к беспечности.'],
  ['qd', 'Квестимность / Деклатимность', 'Квестимность', 'Деклатимность', 1, 'Квестим строит речь как обмен, оставляет открытые петли и ориентируется на ответ собеседника; деклатим выдаёт цельные завершённые утверждения и дольше удерживает монологическую форму.', 'Интервью, диктовка, монтаж и привычка к публичным выступлениям сильно искажают этот признак.'],
  ['pn', 'Позитивизм / Негативизм', 'Позитивизм', 'Негативизм', 1, 'Позитивист начинает с имеющихся элементов и работающих связей; негативист замечает исключения, отсутствие, дефицит и то, чем объект не является.', 'Эмоциональный оптимизм или мрачность не равны этому информационному признаку.'],
  ['pr', 'Процесс / Результат', 'Процесс', 'Результат', 1, 'Процессный полюс погружается в течение деятельности и внутренние стадии; результатный членит путь завершёнными итогами, закрывает этап и переключается.', 'Дедлайн, отчётность и проектный жаргон временно делают речь более результатной.'],
  ['ms', 'Весёлость / Серьёзность', 'Весёлость', 'Серьёзность', 1, 'Весёлый полюс легче входит в общее поле идей и эмоций, предполагая разделяемый контекст; серьёзный удерживает личную позицию, дистанцию и индивидуальную ответственность смысла.', 'Юмор, улыбка, мрачный тон и любовь к компаниям не являются прямым тестом.'],
  ['jd', 'Рассудительность / Решительность', 'Рассудительность', 'Решительность', 1, 'Рассудительный ценит подготовку, комфортное состояние и постепенное включение; решительный легче мобилизуется напряжением, фиксирует момент действия и входит в рывок.', 'Спортивная дисциплина, кризисная профессия и хронический стресс могут быть приобретённой адаптацией.']
].map(([id, label, poleA, poleB, weight, focus, trap]) => ({ id: `reinin-${id}`, kind: 'reinin', label, poleA, poleB, weight, focus, trap }));

const ASPECT_PROBES = [
  ['te', 'Чёрная логика · ЧЛ', 'деловая эффективность, факты, польза, рабочие методы', 'тень: навязывание пользы; дар: деятельная забота'],
  ['ti', 'Белая логика · БЛ', 'структуры, определения, классификации, непротиворечивость', 'тень: догматизм; дар: ясная система'],
  ['fe', 'Чёрная этика · ЧЭ', 'эмоциональный фон, выразительность, заражение состоянием', 'тень: эмоциональное давление; дар: оживление людей'],
  ['fi', 'Белая этика · БЭ', 'отношения, дистанция, личная оценка, верность', 'тень: морализаторство; дар: точность отношений'],
  ['ne', 'Чёрная интуиция · ЧИ', 'возможности, варианты, необычные связи, потенциал', 'тень: распыление; дар: открытие возможностей'],
  ['ni', 'Белая интуиция · БИ', 'время, тенденции, образы развития, предчувствие', 'тень: фатализм; дар: чувство своевременности'],
  ['se', 'Чёрная сенсорика · ЧС', 'воля, границы, давление, захват пространства', 'тень: силовое давление; дар: защита и решительность'],
  ['si', 'Белая сенсорика · БС', 'телесные ощущения, комфорт, качество состояния, гармония', 'тень: застревание в комфорте; дар: тонкая настройка состояния']
].map(([id, label, focus, shaneri]) => ({ id: `aspect-${id}`, kind: 'aspect', label, focus, shaneri, weight: 1 }));

const QUADRA_PROBE = {
  id: 'quadra-spirit', kind: 'quadra', label: 'Дух квадры', weight: 1,
  focus: 'Альфа: ЧИ+БЛ+ЧЭ+БС — любопытство, равный обмен идеями, лёгкость и комфорт; Бета: ЧЭ+БЛ+ЧС+БИ — мобилизация, иерархия, драматизм и общий исторический вектор; Гамма: ЧС+БЭ+ЧЛ+БИ — личная ответственность, результат, верность выбранным отношениям и реалистичный прогноз; Дельта: ЧЛ+БЭ+ЧИ+БС — полезность, развитие талантов, спокойная человечность и качество повседневности'
};

const ALL_PROBES = [...REININ_PROBES, QUADRA_PROBE, ...ASPECT_PROBES];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const MODEL_A_POSITIONS = '1 программная: сильная базовая призма; 2 творческая: сильный гибкий инструмент; 3 ролевая: нормативная маска и напряжение; 4 болевая: уязвимость к критике; 5 суггестивная: потребность во внешней поддержке; 6 активационная: мотивируется поддержкой; 7 ограничительная: сильное жёсткое пресечение; 8 фоновая: сильная автоматическая забота без демонстрации';

function stableModelIndex(seed, probeId, length) {
  let hash = 2166136261;
  const value = `${seed}:${probeId}`;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0) % length;
}

async function claimSharedProviderSlot(env, provider, traceId) {
  if (!provider.shared || !env.DB) return;
  const limit = Math.max(1, Math.min(10, Number(env.PROBE_REQUESTS_PER_MINUTE || 10)));
  while (true) {
    const now = Date.now();
    const minuteBucket = Math.floor(now / 60000);
    const firstSlot = crypto.getRandomValues(new Uint32Array(1))[0] % limit;
    for (let offset = 0; offset < limit; offset += 1) {
      const slot = (firstSlot + offset) % limit;
      const claimed = await env.DB.prepare('INSERT OR IGNORE INTO provider_request_slots (minute_bucket, slot, trace_id, created_at) VALUES (?, ?, ?, datetime(\'now\'))')
        .bind(minuteBucket, slot, traceId || '').run();
      if (Number(claimed?.meta?.changes || 0) > 0) {
        if (slot === firstSlot) env.DB.prepare('DELETE FROM provider_request_slots WHERE minute_bucket < ?').bind(minuteBucket - 3).run().catch(() => undefined);
        return;
      }
    }
    await delay(Math.max(1000, (minuteBucket + 1) * 60000 - now + 750));
  }
}

function probePrompt(source, probe) {
  if (probe.kind === 'reinin') {
    return `${source}\n\nНЕЗАВИСИМАЯ ПРОВЕРКА ОДНОГО ПРИЗНАКА РЕЙНИНА: ${probe.label}. Рабочее различение: ${probe.focus} Контрольная ловушка: ${probe.trap} Рассматривай только эту шкалу. Не определяй ТИМ и не подгоняй ответ под тип. Ищи устойчивые способы выбора и речи, а не профессию, настроение, социальную роль или одно слово. Отдельно проверь наиболее сильное альтернативное объяснение. Приведи до трёх коротких дословных цитат из материала. Если данных мало, так и скажи. Вес признака при итоговом синтезе: ${probe.weight}. JSON строго: {"probeId":"${probe.id}","label":"${probe.label}","pole":"${probe.poleA}|${probe.poleB}|insufficient","score":0,"confidence":0,"evidence":[{"quote":"","observation":""}],"counterEvidence":[""],"alternativeExplanation":"","missing":""}. score от -100 (${probe.poleB}) до +100 (${probe.poleA}); confidence 0–100.`;
  }
  if (probe.kind === 'quadra') {
    return `${source}\n\nНЕЗАВИСИМАЯ ПРОВЕРКА «ДУХ КВАДРЫ». Оцени не отдельные слова и не предполагаемый ТИМ, а устойчивую атмосферу ценностей, форму кооперации, отношение к силе, пользе, идеям, эмоциональной мобилизации, личной дистанции и телесному комфорту. Ориентир: ${probe.focus}. Не определяй ТИМ. Различай личные ценности, рабочую роль, культуру среды и желаемый образ. Для каждой квадры приведи аргумент «за» и возможное альтернативное объяснение. JSON строго: {"probeId":"quadra-spirit","label":"Дух квадры","scores":{"Альфа":0,"Бета":0,"Гамма":0,"Дельта":0},"leading":"Альфа|Бета|Гамма|Дельта|insufficient","confidence":0,"evidence":[{"quote":"","observation":""}],"counterEvidence":[""],"culturalCaveat":"","missing":""}. Баллы 0–100 не обязаны суммироваться до 100.`;
  }
  return `${source}\n\nНЕЗАВИСИМАЯ ПРОВЕРКА ОДНОГО ИНФОРМАЦИОННОГО АСПЕКТА: ${probe.label}. Фокус: ${probe.focus}. Таблица Шанэри как дополнительная линза: ${probe.shaneri}. Позиции Модели А: ${MODEL_A_POSITIONS}. Не определяй ТИМ. Отличай свободное использование аспекта от демонстративной роли, выученного жаргона и болезненной компенсации. Приведи до трёх коротких цитат. Предложи не более двух возможных позиций функции и явно укажи, если различить их нельзя. JSON строго: {"probeId":"${probe.id}","label":"${probe.label}","manifestation":"strong|mixed|weak|insufficient","confidence":0,"positionHypotheses":[{"position":0,"confidence":0,"reason":""}],"evidence":[{"quote":"","observation":""}],"shadowSignals":[""],"giftSignals":[""],"missing":""}.`;
}

async function runProbeWave(env, provider, probes, source, modelPool, mixSeed, meta) {
  const settled = await Promise.allSettled(probes.map(async probe => {
    const model = modelPool[stableModelIndex(mixSeed, probe.id, modelPool.length)];
    await claimSharedProviderSlot(env, provider, meta(`probe:${probe.id}`).traceId);
    const result = await callTextModel(provider, probePrompt(source, probe), model, { ...meta(`probe:${probe.id}`), maxTokens: 850, timeoutMs: 45000 });
    return { ...result, model };
  }));
  return settled.map((entry, index) => entry.status === 'fulfilled'
    ? { ...entry.value, probeId: probes[index].id, label: probes[index].label, status: 'done' }
    : { probeId: probes[index].id, label: probes[index].label, model: modelPool[stableModelIndex(mixSeed, probes[index].id, modelPool.length)], status: 'warning', error: entry.reason instanceof Error ? entry.reason.message : String(entry.reason), confidence: 0 });
}

async function runPipeline(env, provider, text, audioContext, lockedDichotomies = {}, lockedPsychosophy = {}, preferredTim = '', diagnostics = {}) {
  const isKnyazev = provider.provider === 'knyazev';
  const modelPool = isKnyazev
    ? String(env.KNYAZEV_MIX_MODELS || 'minimax-2.7,deepseek-v4-flash').split(',').map(item => item.trim()).filter(Boolean)
    : [provider.model];
  const finalModel = isKnyazev ? (env.FINAL_MODEL || 'minimax-2.7') : provider.model;

  const hardConstraints = Object.keys(lockedDichotomies || {}).length || Object.keys(lockedPsychosophy || {}).length
    ? `\n\nЖЁСТКИЕ ОГРАНИЧЕНИЯ ПОЛЬЗОВАТЕЛЯ (не меняй и не оспаривай их при пересчёте):\nДихотомии: ${compact(lockedDichotomies)}\nПсихософия: ${compact(lockedPsychosophy)}`
    : '';
  const preference = TYPE_NAMES[preferredTim] ? `\n\nПРЕДПОЧТЕНИЕ ПОЛЬЗОВАТЕЛЯ: ${preferredTim} (${TYPE_NAMES[preferredTim]}). Это не доказательство и не жёсткий замок: отдельно проверь эту версию и честно укажи, подтверждается ли она.` : '';
  const source = `ТЕКСТ УЧАСТНИКА:\n${text || '[текста нет]'}\n\nАУДИО/ТРАНСКРИПТ:\n${audioContext || '[аудио нет]'}${hardConstraints}${preference}`;
  const meta = stage => ({ traceId: diagnostics.traceId, fullLog: diagnostics.fullLog, stage });
  const requestsPerMinute = Math.max(1, Math.min(10, Number(env.PROBE_REQUESTS_PER_MINUTE || 10)));
  const waves = [];
  for (let index = 0; index < ALL_PROBES.length; index += requestsPerMinute) waves.push(ALL_PROBES.slice(index, index + requestsPerMinute));
  const probeResults = [];
  for (let index = 0; index < waves.length; index += 1) {
    const waveStartedAt = Date.now();
    probeResults.push(...await runProbeWave(env, provider, waves[index], source, modelPool, diagnostics.mixSeed || diagnostics.traceId, meta));
    if (index < waves.length - 1) {
      const remainingWindow = Math.max(0, 61000 - (Date.now() - waveStartedAt));
      if (remainingWindow) await delay(remainingWindow);
    }
  }

  const successful = probeResults.filter(item => item.status === 'done');
  await claimSharedProviderSlot(env, provider, diagnostics.traceId);
  const finalResult = await callTextModel(provider, `${source}\n\nРЕЗУЛЬТАТЫ 24 НЕЗАВИСИМЫХ ПРОВЕРОК:\n${compact(successful)}\n\nЗАДАЧА СИНТЕЗА. Сопоставь 15 признаков Рейнина, дух квадры и 8 аспектов с гипотезами позиций Модели А. Базис Юнга и Статика/Динамика имеют больший вес, Рациональность/Иррациональность — половинный; остальные признаки — обычный. Не считай отсутствие признака доказательством противоположного. Сначала сравни минимум три конкурирующих ТИМа, затем выступи критиком лидера: ищи натяжки, ролевое поведение, культурную среду, желаемый образ и противоречащие цитаты. Если надёжных данных нет, верни confidenceLevel=insufficient. Основной тип и альтернативы только из списка ${Object.entries(TYPE_NAMES).map(([k,v]) => `${k} (${v})`).join(', ')}. JSON строго: {"tim":{"abbreviation":"","name":""},"summary":"","confidence":0,"confidenceLevel":"low|medium|high|insufficient","alternatives":[{"abbreviation":"","name":"","probability":0,"reason":""}],"dichotomies":[{"name":"","result":"","confidence":0,"evidence":""}],"wordEvidence":[{"word":"короткая цитата","dimension":"","pole":"","count":1,"weight":1}],"doubts":[""],"quadra":{"name":"","confidence":0,"evidence":""},"probeAgreement":{"agree":0,"disagree":0,"insufficient":0}}. Не раскрывай скрытую цепочку рассуждений; покажи только проверяемые основания и сомнения.`, finalModel, { ...meta('final-synthesis'), maxTokens: 5200, timeoutMs: 100000 });

  return {
    result: finalResult,
    probeResults,
    stages: [
      ...probeResults.map(item => ({ id: item.probeId, label: item.label, status: item.status, model: item.model })),
      { id: 'final', label: 'Синтез и критик', status: 'done', model: finalModel }
    ],
    providerUsed: `${provider.provider}:${modelPool.join(' + ')} → ${finalModel}`,
    requestPlan: { probes: ALL_PROBES.length, requestsPerMinute, waves: waves.length, fallbackAfterSeconds: 210 }
  };
}

function applyExplicitRandomFallback(pipeline, input, audioContext, traceId) {
  const result = pipeline?.result || {};
  const abbreviation = String(result?.tim?.abbreviation || result?.tim || '').trim().toUpperCase();
  const confidence = Number(result?.confidence || 0);
  const modelUndecided = !TYPE_NAMES[abbreviation] || (result?.confidenceLevel === 'insufficient' && confidence <= 10);
  const hasPreference = Boolean(TYPE_NAMES[String(input.preferredTim || '').trim().toUpperCase()]);
  const hasLocks = Object.keys(input.lockedDichotomies || {}).length > 0 || Object.keys(input.lockedPsychosophy || {}).length > 0;
  const usefulText = (String(input.text || '').match(/[а-яёa-z0-9-]+/gi) || []).length >= 8;
  const usefulAudio = Boolean(audioContext && !/^\[Аудио/.test(audioContext));
  const noUsableMaterial = !usefulText && !usefulAudio;
  if ((!modelUndecided && !noUsableMaterial) || hasPreference || hasLocks) return pipeline;

  const abbreviations = Object.keys(TYPE_NAMES);
  const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % abbreviations.length;
  const randomAbbreviation = abbreviations[randomIndex];
  const alternatives = [1, 2].map(offset => {
    const alt = abbreviations[(randomIndex + offset * 5) % abbreviations.length];
    return { abbreviation: alt, name: TYPE_NAMES[alt], probability: 0, reason: 'Случайная запасная версия; не результат анализа.' };
  });
  pipeline.result = {
    ...result,
    tim: { abbreviation: randomAbbreviation, name: TYPE_NAMES[randomAbbreviation] },
    summary: `Модель не смогла обоснованно определить ТИМ. Чтобы всё равно открыть интерфейс результата, генератор случайности выбрал ${TYPE_NAMES[randomAbbreviation]} (${randomAbbreviation}). Это не типирование и не рекомендация.`,
    confidence: 0,
    confidenceLevel: 'insufficient',
    alternatives,
    dichotomies: [],
    wordEvidence: [],
    doubts: [
      'ТИМ выбран криптографическим генератором случайных чисел, потому что доказательств и пользовательских предпочтений не было.',
      ...(Array.isArray(result?.doubts) ? result.doubts : [])
    ],
    randomFallback: true
  };
  console.warn({ event: 'typist.random_fallback', traceId, reason: noUsableMaterial ? 'no_usable_material' : 'model_undecided', selectedTim: randomAbbreviation });
  return pipeline;
}

async function saveDebug(env, input, visitorId, ctx) {
  if (!input.debugConsent || env.STORE_DEBUG_PAYLOADS !== 'true' || !env.DEBUG_BUCKET) return null;
  const submissionId = crypto.randomUUID();
  const prefix = `debug/${new Date().toISOString().slice(0, 10)}/${submissionId}`;
  const metadata = {
    submissionId,
    sessionId: visitorId,
    personId: cleanId(input.sessionId) || crypto.randomUUID(),
    name: String(input.name || 'Участник').slice(0, 100),
    text: String(input.text || '').slice(0, 100000),
    voiceGuide: String(input.voiceGuide || '').slice(0, 1000),
    createdAt: new Date().toISOString(),
    expiresInDays: Number(env.DEBUG_RETENTION_DAYS || 7)
  };
  await env.DEBUG_BUCKET.put(`${prefix}/00_README.md`, `# Отладочная копия\n\nУчастник: ${metadata.name}\nДата: ${metadata.createdAt}\nСрок хранения: ${metadata.expiresInDays} дней\n\n## Анкета\n\n${metadata.text}`, { httpMetadata: { contentType: 'text/markdown; charset=utf-8' } });
  await env.DEBUG_BUCKET.put(`${prefix}/01_data.json`, JSON.stringify(metadata, null, 2), { httpMetadata: { contentType: 'application/json' } });
  for (let i = 0; i < (input.audio || []).length; i += 1) {
    const item = input.audio[i];
    const bytes = Uint8Array.from(atob(item.base64), char => char.charCodeAt(0));
    await env.DEBUG_BUCKET.put(`${prefix}/audio/${String(i + 1).padStart(2, '0')}-${String(item.name || 'audio').replace(/[^a-zA-Zа-яА-Я0-9_.-]/g, '_')}`, bytes, { httpMetadata: { contentType: item.mimeType || 'application/octet-stream' } });
  }
  if (env.DB) await env.DB.prepare(`INSERT INTO debug_submissions (id, session_id, person_id, r2_prefix, expires_at, created_at) VALUES (?, ?, ?, ?, datetime('now', ?), datetime('now'))`).bind(submissionId, visitorId, metadata.personId, prefix, `+${metadata.expiresInDays} days`).run();
  if (env.NOTIFY_EMAIL && env.NOTIFY_TO && env.NOTIFY_FROM) ctx.waitUntil(sendDebugNotice(env, metadata, prefix));
  return { submissionId, prefix };
}

async function finishDebugCopy(env, debugCopy, pipeline, audioContext) {
  if (!debugCopy || !env.DEBUG_BUCKET) return;
  const result = pipeline?.result || {};
  const markdown = [
    '# Результат типирования',
    '',
    `Основная гипотеза: **${result?.tim?.name || 'не определена'} (${result?.tim?.abbreviation || '—'})**`,
    `Уверенность: ${Number(result?.confidence || 0)}% · ${result?.confidenceLevel || 'insufficient'}`,
    '',
    '## Резюме',
    '',
    result?.summary || 'Нет резюме.',
    '',
    '## Сомнения',
    '',
    ...(Array.isArray(result?.doubts) && result.doubts.length ? result.doubts.map(item => `- ${item}`) : ['- Не указаны']),
    '',
    '## Расшифровка и наблюдения по аудио',
    '',
    audioContext || 'Аудио не было или расшифровка недоступна.'
  ].join('\n');
  await env.DEBUG_BUCKET.put(`${debugCopy.prefix}/02_result.md`, markdown, { httpMetadata: { contentType: 'text/markdown; charset=utf-8' } });
  await env.DEBUG_BUCKET.put(`${debugCopy.prefix}/03_result.json`, JSON.stringify(pipeline, null, 2), { httpMetadata: { contentType: 'application/json' } });
}

async function sendDebugNotice(env, metadata, prefix) {
  const raw = [
    `From: НейроИндыков <${env.NOTIFY_FROM}>`,
    `To: ${env.NOTIFY_TO}`,
    `Subject: Новая отладочная запись: ${metadata.name}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    `Сохранена новая копия для отладки.`,
    `Участник: ${metadata.name}`,
    `Путь в R2: ${prefix}`,
    `Автоудаление: через ${metadata.expiresInDays} дней.`,
    '',
    'Аудио не прикреплено к письму: оно остаётся в закрытом R2.'
  ].join('\r\n');
  await env.NOTIFY_EMAIL.send(new EmailMessage(env.NOTIFY_FROM, env.NOTIFY_TO, raw));
}

async function handleAnalyze(request, env, visitor, ctx) {
  const input = await request.json();
  const traceId = crypto.randomUUID();
  if ((!input.text || String(input.text).trim().length < 30) && !(input.audio || []).length) return json({ error: 'NOT_ENOUGH_DATA', message: 'Добавьте текст или аудио.' }, 400);
  const provider = resolveProvider(env, input.byok || {});
  console.log({
    event: 'typist.analysis.start', traceId, personId: cleanId(input.sessionId) || 'unknown',
    provider: provider.provider, model: provider.model, textChars: String(input.text || '').length,
    audioFiles: (input.audio || []).map(item => ({ name: String(item.name || ''), mimeType: String(item.mimeType || ''), base64Chars: String(item.base64 || '').length })),
    lockedDichotomies: input.lockedDichotomies || {}, lockedPsychosophy: input.lockedPsychosophy || {},
    preferredTim: input.preferredTim || '', fullText: env.LOG_PROMPTS === 'true' && input.debugConsent ? String(input.text || '') : undefined
  });
  let credits = await ensureUser(env, visitor.id);
  if (input.byok?.mode !== 'byok') credits = await consumeCredit(env, visitor.id, 'analysis');
  const debugCopy = await saveDebug(env, input, visitor.id, ctx);
  let audioContext = '';
  try { audioContext = await transcribeAudio(env, input.audio || [], input.voiceGuide || 'Определи говорящих только если это надёжно возможно; иначе верни общую расшифровку без приписывания реплик конкретному человеку.'); }
  catch { audioContext = '[Аудио не удалось расшифровать. Не делай выводов о голосе.]'; }
  let pipeline = await runPipeline(
    env, provider, String(input.text || ''), audioContext,
    input.lockedDichotomies || {}, input.lockedPsychosophy || {}, input.preferredTim || '',
    { traceId, mixSeed: cleanId(input.sessionId) || traceId, fullLog: Boolean(input.debugConsent) }
  );
  pipeline = applyExplicitRandomFallback(pipeline, input, audioContext, traceId);
  await finishDebugCopy(env, debugCopy, pipeline, audioContext);
  console.log({ event: 'typist.analysis.complete', traceId, selectedTim: pipeline?.result?.tim?.abbreviation || '', confidence: pipeline?.result?.confidence || 0, randomFallback: Boolean(pipeline?.result?.randomFallback) });
  return json({ ...pipeline, traceId, attemptsLeft: Number(credits?.analysis_credits ?? 0), questionsLeft: Number(credits?.question_credits ?? 0), debugId: debugCopy?.submissionId || null });
}

async function handleAsk(request, env, visitor) {
  const input = await request.json();
  if (!input.question || !input.result) return json({ error: 'BAD_QUESTION' }, 400);
  const provider = resolveProvider(env, input.byok || {});
  let credits = await ensureUser(env, visitor.id);
  if (input.byok?.mode !== 'byok') credits = await consumeCredit(env, visitor.id, 'question');
  const answer = await callTextModel(provider, `РЕЗУЛЬТАТ ТИПИРОВАНИЯ:\n${compact(input.result)}\n\nВОПРОС:\n${String(input.question).slice(0, 3000)}\n\nОтветь просто и конкретно. Не повышай уверенность исходного результата. Верни JSON {"answer":"","suggestedQuestions":["","",""]}.`, env.QUESTION_MODEL || provider.model, { traceId: crypto.randomUUID(), stage: 'question', fullLog: false });
  return json({ answer: answer.answer || '', suggestedQuestions: answer.suggestedQuestions || [], questionsLeft: Number(credits?.question_credits ?? 0) });
}

async function handleValidate(request, env) {
  const input = await request.json();
  const provider = resolveProvider(env, { ...input, mode: 'byok' });
  const result = await callTextModel(
    provider,
    'Проверка соединения. Верни только JSON {"ok":true,"message":"Ключ принят"}.',
    provider.model,
    { traceId: crypto.randomUUID(), stage: 'validate-key', fullLog: false }
  );
  if (!result?.ok) throw new Error('KEY_VALIDATION_FAILED');
  return json({ ok: true, provider: provider.provider, model: provider.model });
}

async function handleRedeem(request, env, visitor) {
  if (!env.DB) return json({ error: 'STORAGE_NOT_CONFIGURED' }, 503);
  const { code } = await request.json();
  const normalized = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized.length < 8) return json({ error: 'INVALID_CODE' }, 400);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized)))).map(b => b.toString(16).padStart(2, '0')).join('');
  await ensureUser(env, visitor.id);
  const row = await env.DB.prepare(`UPDATE access_codes SET status = 'redeemed', redeemed_session_id = ?, redeemed_at = datetime('now') WHERE code_hash = ? AND status = 'new' RETURNING analysis_credits, question_credits`).bind(visitor.id, hash).first();
  if (!row) return json({ error: 'CODE_NOT_FOUND', message: 'Код не найден или уже использован.' }, 404);
  await env.DB.prepare(`UPDATE users SET analysis_credits = analysis_credits + ?, question_credits = question_credits + ?, updated_at = datetime('now') WHERE session_id = ?`).bind(row.analysis_credits, row.question_credits, visitor.id).run();
  const user = await ensureUser(env, visitor.id);
  return json({ ok: true, attemptsLeft: user.analysis_credits, questionsLeft: user.question_credits });
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (!isAllowedOrigin(origin)) return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403, headers);
    const url = new URL(request.url);
    const visitor = await getVisitor(request);
    const cookie = visitor.fresh ? `nid=${encodeURIComponent(visitor.id)}; Path=/; Max-Age=31536000; Secure; SameSite=Lax; HttpOnly` : '';
    try {
      let response;
      if (url.pathname.endsWith('/health') && request.method === 'GET') response = json({ ok: true, storage: Boolean(env.DB), debugStorage: Boolean(env.DEBUG_BUCKET), omni: Boolean(env.OMNI_API_KEY) });
      else if (url.pathname.endsWith('/status') && request.method === 'GET') {
        const credits = await ensureUser(env, visitor.id);
        response = json({ attemptsLeft: Number(credits?.analysis_credits ?? 0), questionsLeft: Number(credits?.question_credits ?? 0) });
      }
      else if (url.pathname.endsWith('/analyze') && request.method === 'POST') response = await handleAnalyze(request, env, visitor, ctx);
      else if (url.pathname.endsWith('/ask') && request.method === 'POST') response = await handleAsk(request, env, visitor);
      else if (url.pathname.endsWith('/validate') && request.method === 'POST') response = await handleValidate(request, env);
      else if (url.pathname.endsWith('/redeem') && request.method === 'POST') response = await handleRedeem(request, env, visitor);
      else response = json({ error: 'NOT_FOUND' }, 404);
      const nextHeaders = new Headers(response.headers);
      Object.entries(headers).forEach(([key, value]) => nextHeaders.set(key, value));
      if (cookie) nextHeaders.append('Set-Cookie', cookie);
      return new Response(response.body, { status: response.status, headers: nextHeaders });
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      const status = code.startsWith('NO_') ? 402 : code.includes('CONFIGURED') ? 503 : code.includes('MISSING') ? 400 : 502;
      return json({ error: code, message: code === 'NO_ANALYSIS_CREDITS' ? 'Бесплатные попытки закончились. Введите код пакета или подключите свой API.' : code === 'NO_QUESTION_CREDITS' ? '10 поясняющих вопросов закончились.' : 'ИИ пока не ответил. Страница покажет предварительную компьютерную гипотезу и продолжит ждать.' }, status, { ...headers, ...(cookie ? { 'Set-Cookie': cookie } : {}) });
    }
  }
};
