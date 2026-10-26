import { resolveProvider, includedReady, textEndpoint, textRequestBody } from './providers.js';
import { runCompactPipeline, PIPELINE_VERSION } from './compact-pipeline.js';
import { EmailMessage } from 'cloudflare:email';
import { WorkflowEntrypoint } from 'cloudflare:workers';
import { seal, unseal, emitJob, readJob, refundJob, expireJobs } from './jobs.js';

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

function resolveProviders(env, byok = {}) {
  if (byok.mode !== 'byok' || !Array.isArray(byok.connections) || !byok.connections.length) return [resolveProvider(env, byok)];
  const active = byok.connections.filter(item => item && item.policy !== 'off');
  if (!active.length) throw new Error('BYOK_KEY_MISSING');
  return active.map(item => ({
    ...resolveProvider(env, { ...byok, ...item, mode: 'byok' }),
    connectionId: String(item.id || crypto.randomUUID()),
    label: String(item.label || item.provider || 'API'),
    policy: ['always', 'random', 'system'].includes(item.policy) ? item.policy : 'system',
    omniCapable: Boolean(item.omniCapable)
  }));
}

function providerTickets(providers) {
  const tickets = [];
  providers.forEach(provider => {
    const count = provider.policy === 'always' ? 3 : provider.policy === 'system' ? 2 : 1;
    for (let index = 0; index < count; index += 1) tickets.push(provider);
  });
  return tickets.length ? tickets : providers;
}

function personaPresentation(input = {}) {
  const mode = ['kind', 'troll', 'dry', 'custom'].includes(input.mode) ? input.mode : 'kind';
  const presets = {
    kind: 'Тёплый, благожелательный и ясный тон. Поддерживай любопытство, не скрывая сомнений.',
    troll: 'Игровой тролльный тон: допустима лёгкая ирония над идеями, но никаких оскорблений человека. Факты передавай буквально.',
    dry: 'Сухой информационный тон: кратко, нейтрально, структурно, без метафор и эмоциональной оценки.'
  };
  const custom = String(input.instructions || '').replace(/[\u0000-\u001f]/g, ' ').slice(0, 1500);
  return mode === 'custom' ? `Авторский персонаж «${String(input.name || 'Персонаж').slice(0, 60)}»: ${custom || 'спокойный ясный тон'}` : presets[mode];
}

async function callTextModel(config, prompt, modelOverride, meta = {}) {
  const model = modelOverride || config.model;
  const startedAt = Date.now();
  const controller = new AbortController();
  // Each request has a bounded timeout; verified results survive a failed report.
  const timeoutMs = Number(meta.timeoutMs || 75000);
  const timeout = setTimeout(() => controller.abort('MODEL_TIMEOUT'), timeoutMs);
  const logFull = Boolean(config.logPrompts && meta.fullLog);
  console.log({
    event: 'typist.model.request', traceId: meta.traceId || '', stage: meta.stage || 'unknown',
    provider: config.provider, model, promptChars: prompt.length,
    prompt: logFull ? prompt : undefined,
    promptPreview: logFull ? undefined : '[скрыт: пользователь не включил отладочное сохранение]'
  });
  try {
    let response;
    if (meta.env && meta.jobId) await emitJob(meta.env, meta.jobId, { event: 'model.request', stage: meta.stage, provider: config.provider, model, promptVersion: PIPELINE_VERSION, promptChars: prompt.length, prompt: meta.fullLog ? prompt : undefined });
    if (config.provider === 'anthropic') {
      response = await fetch(`${config.baseUrl || 'https://api.anthropic.com/v1'}/messages`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-api-key': config.key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: meta.maxTokens || 2400, temperature: 0.1, output_config: { effort: config.effort || 'high' }, messages: [{ role: 'user', content: prompt }] })
      });
    } else {
      response = await fetch(textEndpoint(config), {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.key}` },
        body: JSON.stringify(textRequestBody(config, model, prompt, meta.maxTokens || 2400))
      });
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || payload?.message || `UPSTREAM_${response.status}`);
    if (payload?.choices?.[0]?.finish_reason === 'length') throw new Error('MODEL_OUTPUT_TRUNCATED');
    const parsed = parseJsonResponse(payload);
    if (meta.env && meta.jobId) await emitJob(meta.env, meta.jobId, { event: 'model.response', stage: meta.stage, provider: config.provider, model, durationMs: Date.now() - startedAt, usage: payload.usage || null, requestCost: payload.billing?.request_cost ?? null, response: parsed });
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

async function transcribeAudio(env, audio, voiceGuide, byok = {}) {
  if (!audio?.length) return '';
  const chosen = byok.mode === 'byok' ? resolveProviders(env, byok).find(item => !['dewiar', 'polza', 'vsegpt'].includes(item.provider) && /gemini|gpt-4o-audio|omni/i.test(item.model)) : null;
  const config = chosen || (env.OMNI_API_KEY && env.OMNI_BASE_URL && env.OMNI_MODEL ? { key: env.OMNI_API_KEY, baseUrl: env.OMNI_BASE_URL, model: env.OMNI_MODEL } : null);
  if (!config) throw new Error('OMNI_NOT_CONFIGURED');
  const parts = [{ type: 'text', text: `Сделай точную расшифровку аудио. ${voiceGuide ? `Дополнительный ориентир пользователя: ${voiceGuide}.` : 'Если говорящих несколько и их нельзя надёжно различить, не приписывай реплики конкретному человеку.'} Верни JSON {"transcript":"...","voiceObservations":["..."]}. Наблюдения по темпу и паузам помечай как слабые признаки. Не определяй социотип.` }];
  for (const item of audio) {
    const format = item.mimeType.includes('wav') ? 'wav' : item.mimeType.includes('mpeg') || item.mimeType.includes('mp3') ? 'mp3' : '';
    if (!format) throw new Error('AUDIO_FORMAT_UNSUPPORTED_USE_WAV');
    parts.push({ type: 'input_audio', input_audio: { data: item.base64, format } });
  }
  await claimSharedProviderSlot(env, config, 'audio');
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(90000),
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.key}` },
    body: JSON.stringify({ model: config.model, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: parts }] })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OMNI_${response.status}`);
  const result = parseJsonResponse(payload);
  return `${result.transcript || ''}\n\nНаблюдения по голосу: ${(result.voiceObservations || []).join('; ')}`;
}

const compact = value => JSON.stringify(value);

const REININ_PROBES = [
  ['ei', 'Экстраверсия / Интроверсия', 'Экстраверсия', 'Интроверсия', 1, 'Экстраверт расширяет поле объектов, людей и внешних связей; интроверт углубляет отношение субъекта к одному объекту и его внутренним нюансам.', 'Не считай общительность, сценичность, застенчивость или количество друзей прямым доказательством.'],
  ['le', 'Логика / Этика', 'Логика', 'Этика', 2, 'Логический полюс формализует через факты, правила, причинность и эффективность; этический , через мотивы, отношения, состояние людей и влияние решения на них.', 'Профессия, образование, управленческий жаргон и выученные нормы могут маскировать естественный язык выбора.'],
  ['si', 'Сенсорика / Интуиция', 'Сенсорика', 'Интуиция', 2, 'Сенсорный полюс возвращает рассказ к телу, территории, ресурсам и наблюдаемому действию; интуитивный , к возможностям, времени, смыслам и альтернативным сценариям.', 'Спорт, массаж, фантазии или любовь к технологиям по отдельности не определяют полюс.'],
  ['ri', 'Рациональность / Иррациональность', 'Рациональность', 'Иррациональность', 0.5, 'Рациональный полюс старается заранее зафиксировать решение, порядок и обязательство; иррациональный держит форму открытой и перестраивается вслед за изменившейся ситуацией.', 'Дисциплина, дедлайн, тревога и хаос быта могут быть внешней адаптацией. Вес этого признака половинный.'],
  ['sd', 'Статика / Динамика', 'Статика', 'Динамика', 2, 'Статика членит опыт на состояния, объекты и качества как отдельные кадры; динамика описывает непрерывный поток изменений, действий и переходов.', 'Считай грамматику и способ сборки рассказа на длинных фрагментах, а не наличие отдельных глаголов.'],
  ['yo', 'Уступчивость / Упрямство', 'Уступчивость', 'Упрямство', 1, 'Уступчивый легче меняет интерес или цель ради доступных ресурсов; упрямый меняет набор ресурсов и способов, сохраняя выбранный интерес.', 'Не путай с мягкостью, конфликтностью, покладистостью или силой воли.'],
  ['ad', 'Аристократия / Демократия', 'Аристократия', 'Демократия', 1, 'Аристократический полюс быстрее считывает принадлежность к группе, роль, статус и нормы слоя; демократический оценивает человека индивидуально, слабее опираясь на групповой ранг.', 'Должность, армейская или корпоративная среда создают сильные выученные маркеры.'],
  ['ts', 'Тактика / Стратегия', 'Тактика', 'Стратегия', 1, 'Тактик отталкивается от доступного следующего шага и уточняет цель по ходу; стратег удерживает дальнюю цель и подбирает либо отбрасывает шаги относительно неё.', 'Умение составлять планы есть у обоих полюсов; важно, что остаётся фиксированным при изменениях.'],
  ['ce', 'Конструктивизм / Эмотивизм', 'Конструктивизм', 'Эмотивизм', 1, 'Конструктивист сначала меняет предметную ситуацию и через дело регулирует состояние; эмотивист сначала настраивает эмоциональную атмосферу и уже из неё переходит к делу.', 'Забота поступком и сочувственные формулы могут быть воспитанными социальными навыками.'],
  ['cf', 'Беспечность / Предусмотрительность', 'Беспечность', 'Предусмотрительность', 1, 'Беспечный начинает с того, что доступно сейчас, и достраивает контекст по ходу; предусмотрительный заранее собирает условия, риски, ресурсы и недостающие сведения.', 'Не приравнивай тревожность к предусмотрительности, а смелость , к беспечности.'],
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
  focus: 'Альфа: ЧИ+БЛ+ЧЭ+БС , любопытство, равный обмен идеями, лёгкость и комфорт; Бета: ЧЭ+БЛ+ЧС+БИ , мобилизация, иерархия, драматизм и общий исторический вектор; Гамма: ЧС+БЭ+ЧЛ+БИ , личная ответственность, результат, верность выбранным отношениям и реалистичный прогноз; Дельта: ЧЛ+БЭ+ЧИ+БС , полезность, развитие талантов, спокойная человечность и качество повседневности'
};

const ALL_PROBES = [...REININ_PROBES, QUADRA_PROBE, ...ASPECT_PROBES];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function stableModelIndex(seed, probeId, length) {
  let hash = 2166136261;
  const value = `${seed}:${probeId}`;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0) % length;
}

async function claimSharedProviderSlot(env, provider, traceId) {
  if (!env.DB) return;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${provider.baseUrl}:${provider.key}`));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const spacing = Math.ceil(61000 / Math.max(1, Math.min(10, Number(env.PROBE_REQUESTS_PER_MINUTE || 10))));
  const row = await env.DB.prepare('INSERT INTO provider_lanes (key_hash, next_ms) VALUES (?, ?) ON CONFLICT(key_hash) DO UPDATE SET next_ms = MAX(next_ms, ?) + ? RETURNING next_ms')
    .bind(hash, Date.now() + spacing, Date.now(), spacing).first();
  const wait = Math.max(0, row.next_ms - spacing - Date.now());
  if (wait > 540000) throw new Error('PROVIDER_QUEUE_FULL');
  if (wait) await delay(wait);
}

function chooseProvider(providers, seed, probeId) {
  const index = ['reinin-ei', 'reinin-yo', 'reinin-qd', 'quadra-spirit'].indexOf(probeId);
  const mandatory = providers.filter(item => item.policy === 'always');
  if (index >= 0 && index < mandatory.length) return mandatory[index];
  const tickets = providerTickets(providers);
  return tickets[stableModelIndex(seed, `provider:${probeId}`, tickets.length)];
}

async function runPipeline(env, providers, text, audioContext, lockedDichotomies = {}, lockedPsychosophy = {}, preferredTim = '', diagnostics = {}) {
  return runCompactPipeline({ env, providers, text, audioContext, locks: lockedDichotomies, definitions: ALL_PROBES, diagnostics,
    callModel: callTextModel, chooseProvider, claimSlot: claimSharedProviderSlot, emit: emitJob });
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
    `Основная гипотеза: **${result?.tim?.name || 'не определена'} (${result?.tim?.abbreviation || ','})**`,
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
  const providers = resolveProviders(env, input.byok || {});
  console.log({
    event: 'typist.analysis.start', traceId, personId: cleanId(input.sessionId) || 'unknown',
    providers: providers.map(provider => ({ provider: provider.provider, label: provider.label, model: provider.model, policy: provider.policy })), textChars: String(input.text || '').length,
    audioFiles: (input.audio || []).map(item => ({ name: String(item.name || ''), mimeType: String(item.mimeType || ''), base64Chars: String(item.base64 || '').length })),
    lockedDichotomies: input.lockedDichotomies || {}, lockedPsychosophy: input.lockedPsychosophy || {},
    preferredTim: input.preferredTim || '', fullText: env.LOG_PROMPTS === 'true' && input.debugConsent ? String(input.text || '') : undefined
  });
  let credits = await ensureUser(env, visitor.id);
  if (input.byok?.mode !== 'byok') credits = await consumeCredit(env, visitor.id, 'analysis');
  const debugCopy = await saveDebug(env, input, visitor.id, ctx);
  let audioContext = '';
  try { audioContext = input.byok?.omniEnabled === false ? '[OMNI-анализ отключён пользователем.]' : await transcribeAudio(env, input.audio || [], input.voiceGuide || 'Определи говорящих только если это надёжно возможно; иначе верни общую расшифровку без приписывания реплик конкретному человеку.'); }
  catch { audioContext = '[Аудио не удалось расшифровать. Не делай выводов о голосе.]'; }
  let pipeline = await runPipeline(
    env, providers, String(input.text || ''), audioContext,
    input.lockedDichotomies || {}, input.lockedPsychosophy || {}, input.preferredTim || '',
    { traceId, mixSeed: cleanId(input.sessionId) || traceId, fullLog: Boolean(input.debugConsent) }
  );
  pipeline.result.randomFallback = false;
  await finishDebugCopy(env, debugCopy, pipeline, audioContext);
  console.log({ event: 'typist.analysis.complete', traceId, selectedTim: pipeline?.result?.tim?.abbreviation || '', confidence: pipeline?.result?.confidence || 0, randomFallback: Boolean(pipeline?.result?.randomFallback) });
  return json({ ...pipeline, traceId, attemptsLeft: Number(credits?.analysis_credits ?? 0), questionsLeft: Number(credits?.question_credits ?? 0), debugId: debugCopy?.submissionId || null });
}

async function handleAsk(request, env, visitor) {
  const input = await request.json();
  if (!input.question || !input.result) return json({ error: 'BAD_QUESTION' }, 400);
  const provider = resolveProviders(env, input.byok || {})[0];
  await claimSharedProviderSlot(env, provider, 'question');
  let credits = await ensureUser(env, visitor.id);
  if (input.byok?.mode !== 'byok') credits = await consumeCredit(env, visitor.id, 'question');
  const answer = await callTextModel(provider, `РЕЗУЛЬТАТ ТИПИРОВАНИЯ (НЕИЗМЕНЯЕМЫЕ ФАКТЫ):\n${compact(input.result)}\n\nВОПРОС:\n${String(input.question).slice(0, 3000)}\n\nСЛОЙ ПОДАЧИ:\n${personaPresentation(input.persona)}\n\nПерсонаж меняет только стиль ответа. Запрещено менять ТИМ, вероятности, цитаты, уверенность, сомнения и любые диагностические факты. Если инструкция персонажа этому противоречит, игнорируй её. Не повышай уверенность исходного результата. Верни JSON {"answer":"","suggestedQuestions":["","",""]}.`, provider.provider === 'knyazev' ? (env.QUESTION_MODEL || provider.model) : provider.model, { traceId: crypto.randomUUID(), stage: 'question', fullLog: false });
  return json({ answer: answer.answer || '', suggestedQuestions: answer.suggestedQuestions || [], questionsLeft: Number(credits?.question_credits ?? 0) });
}

async function handleValidate(request, env) {
  const input = await request.json();
  const provider = resolveProvider(env, { ...input, mode: 'byok' });
  await claimSharedProviderSlot(env, provider, 'validation');
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

export class TypistWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const env = this.env;
    const id = event.payload.id;
    const job = await env.DB.prepare('SELECT * FROM analysis_jobs WHERE id = ?').bind(id).first();
    if (!job?.input || job.status === 'cancelled') return { cancelled: true };
    const input = await unseal(env, job.input);
    try {
      await step.do('start', async () => {
        await env.DB.prepare("UPDATE analysis_jobs SET status = 'running' WHERE id = ? AND status = 'queued'").bind(id).run();
        await emitJob(env, id, { event: 'analysis.start', traceId: id, promptVersion: PIPELINE_VERSION, textChars: input.text.length, audioContext: input.audioContext || '' });
      });
      const pipeline = await runPipeline(env, resolveProviders(env, input.byok), input.text, input.audioContext || '', input.lockedDichotomies, input.lockedPsychosophy, input.preferredTim, { step, jobId: id, traceId: id, mixSeed: id, fullLog: Boolean(input.debugConsent) });
      const result = pipeline;
      result.traceId = id;
      await step.do('complete', async () => {
        const credits = await ensureUser(env, job.owner);
        result.attemptsLeft = credits.analysis_credits;
        await env.DB.prepare("UPDATE analysis_jobs SET status = 'complete', result = ?, input = NULL WHERE id = ? AND status != 'cancelled'").bind(await seal(env, result), id).run();
      });
      return { id, complete: true };
    } catch (error) {
      await step.do('failed', async () => {
        await env.DB.prepare("UPDATE analysis_jobs SET status = 'error', error = ?, input = NULL WHERE id = ? AND status != 'cancelled'").bind(String(error?.message || error).slice(0, 500), id).run();
        await refundJob(env, id);
      });
      return { id, failed: true };
    }
  }
}

async function createJob(request, env, visitor) {
  if (!env.TYPIST_WORKFLOW || !env.JOB_ENCRYPTION_KEY) throw new Error('JOB_STORAGE_NOT_CONFIGURED');
  const input = await request.json();
  const id = cleanId(input.jobId);
  if (!id) return json({ error: 'INVALID_JOB_ID' }, 400);
  const existing = await readJob(env, id, visitor.id);
  if (existing) return json({ jobId: id }, 202);
  resolveProviders(env, input.byok || {});
  const text = String(input.text || '');
  if (text.length < 30 && String(input.audioContext || '').length < 30) return json({ error: 'NOT_ENOUGH_DATA', message: 'Добавьте текст или готовую расшифровку.' }, 400);
  if (text.length + String(input.audioContext || '').length > 60000) return json({ error: 'CONTEXT_TOO_LONG', message: 'Лимит материала , 60 000 знаков. Разделите большой текст.' }, 400);
  const included = input.byok?.mode !== 'byok';
  await ensureUser(env, visitor.id);
  const encrypted = await seal(env, { text, audioContext: String(input.audioContext || ''), byok: input.byok || {}, debugConsent: Boolean(input.debugConsent), lockedDichotomies: input.lockedDichotomies || {}, lockedPsychosophy: input.lockedPsychosophy || {}, preferredTim: String(input.preferredTim || '') });
  const rows = await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO analysis_jobs (id, owner, input, charged, created_at, expires_at) SELECT ?, ?, ?, ?, ?, ? WHERE ? = 0 OR EXISTS (SELECT 1 FROM users WHERE session_id = ? AND analysis_credits > 0)')
      .bind(id, visitor.id, encrypted, included ? 1 : 0, Date.now(), Date.now() + 86400000, included ? 1 : 0, visitor.id),
    env.DB.prepare('UPDATE users SET analysis_credits = analysis_credits - 1 WHERE session_id = ? AND ? = 1 AND changes() = 1').bind(visitor.id, included ? 1 : 0)
  ]);
  if (!rows[0].meta.changes) {
    if (await readJob(env, id, visitor.id)) return json({ jobId: id }, 202);
    throw new Error('NO_ANALYSIS_CREDITS');
  }
  try { await env.TYPIST_WORKFLOW.create({ id, params: { id } }); }
  catch (error) {
    await env.DB.prepare("UPDATE analysis_jobs SET status = 'error', input = NULL, error = 'WORKFLOW_START_FAILED' WHERE id = ?").bind(id).run();
    await refundJob(env, id);
    throw error;
  }
  return json({ jobId: id }, 202);
}

export default {
  async scheduled(_event, env, ctx) { ctx.waitUntil(expireJobs(env)); },
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
      if (url.pathname.endsWith('/health') && request.method === 'GET') response = json({ ok: true, release: PIPELINE_VERSION, storage: Boolean(env.DB), debugStorage: Boolean(env.DEBUG_BUCKET), omni: Boolean(env.OMNI_API_KEY), includedProvider: String(env.INCLUDED_PROVIDER || 'knyazev'), includedReady: includedReady(env), jobsReady: Boolean(env.TYPIST_WORKFLOW && env.JOB_ENCRYPTION_KEY) });
      else if (url.pathname.endsWith('/jobs') && request.method === 'POST') response = await createJob(request, env, visitor);
      else if (/\/jobs\/[a-zA-Z0-9_-]+$/.test(url.pathname)) {
        const id = url.pathname.split('/').pop();
        const job = await readJob(env, id, visitor.id, Math.max(0, Number(url.searchParams.get('after')) || 0));
        if (!job) response = json({ error: 'JOB_NOT_FOUND', message: 'Задание не найдено или истекло время хранения.' }, 404);
        else if (request.method === 'GET') response = json(job);
        else if (request.method === 'DELETE') {
          if (['queued','running','cancelled'].includes(job.status)) {
            await env.DB.prepare("UPDATE analysis_jobs SET status = 'cancelled', input = NULL WHERE id = ? AND status IN ('queued','running')").bind(id).run();
            const instance = await env.TYPIST_WORKFLOW.get(id);
            try {
              const state = await instance.status();
              if (!['terminated', 'complete', 'errored'].includes(state.status)) await instance.terminate();
            }
            finally { await refundJob(env, id); }
          }
          response = json({ ok: true });
        } else response = json({ error: 'METHOD_NOT_ALLOWED' }, 405);
      }
      else if (url.pathname.endsWith('/transcribe') && request.method === 'POST') {
        const input = await request.json();
        response = json({ transcript: await transcribeAudio(env, input.audio || [], input.voiceGuide || '', input.byok || {}) });
      }
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
      return json({ error: code, message: code === 'NO_ANALYSIS_CREDITS' ? 'Бесплатные попытки закончились. Введите код пакета или подключите свой API.' : code === 'NO_QUESTION_CREDITS' ? '10 поясняющих вопросов закончились.' : `Запрос завершился ошибкой (${code}). Проверьте подключение API и журнал; ожидание ответа по этому запросу прекращено.` }, status, { ...headers, ...(cookie ? { 'Set-Cookie': cookie } : {}) });
    }
  }
};
