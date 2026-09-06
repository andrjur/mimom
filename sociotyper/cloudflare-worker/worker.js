import { EmailMessage } from 'cloudflare:email';

// ВРЕМЕННЫЙ ПУБЛИЧНЫЙ ДЕМО-КЛЮЧ. После записи ролика отозвать и заменить
// переменной KNYAZEV_API_KEY в Cloudflare Worker Secrets.
const TEMP_DEMO_KNYAZEV_KEY = 'kn_live_23364b4daa5c29aa242666027f1b60d6';

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
      key: byok.key,
      baseUrl: baseUrl.replace(/\/$/, ''),
      model: String(byok.model || ''),
      effort: ['low', 'medium', 'high', 'xhigh', 'max'].includes(byok.effort) ? byok.effort : 'high'
    };
  }
  const includedKey = env.KNYAZEV_API_KEY || TEMP_DEMO_KNYAZEV_KEY;
  if (!includedKey) throw new Error('INCLUDED_PROVIDER_NOT_CONFIGURED');
  return {
    provider: 'knyazev',
    key: includedKey,
    baseUrl: (env.KNYAZEV_BASE_URL || 'https://knyazevai.work/v1').replace(/\/$/, ''),
    model: env.KNYAZEV_MODEL || 'deepseek-v4-flash'
  };
}

async function callTextModel(config, prompt, modelOverride) {
  if (config.provider === 'anthropic') {
    const response = await fetch(`${config.baseUrl || 'https://api.anthropic.com/v1'}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': config.key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: modelOverride || config.model, max_tokens: 12000, temperature: 0.1, output_config: { effort: config.effort || 'high' }, messages: [{ role: 'user', content: prompt }] })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || `UPSTREAM_${response.status}`);
    return parseJsonResponse(payload);
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.key}` },
    body: JSON.stringify({
      model: modelOverride || config.model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return valid JSON only. Be explicit about uncertainty. Never infer facts that are not supported by the supplied material.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || payload?.message || `UPSTREAM_${response.status}`);
  return parseJsonResponse(payload);
}

async function transcribeAudio(env, audio, voiceGuide) {
  if (!audio?.length) return '';
  if (!env.OMNI_API_KEY || !env.OMNI_BASE_URL || !env.OMNI_MODEL) {
    return '[Аудио приложено, но отдельная OMNI-модель пока не настроена. Не делай выводов об интонации и голосе.]';
  }
  const parts = [{ type: 'text', text: `Транскрибируй только нужного человека. Инструкция: ${voiceGuide}. Верни JSON {"transcript":"...","voiceObservations":["..."]}. Не определяй социотип.` }];
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

async function runPipeline(env, provider, text, audioContext) {
  const observationsModel = env.OBSERVATION_MODEL || provider.model;
  const hypothesesModel = env.HYPOTHESIS_MODEL || provider.model;
  const criticModel = env.CRITIC_MODEL || provider.model;
  const finalModel = env.FINAL_MODEL || provider.model;

  const source = `ТЕКСТ УЧАСТНИКА:\n${text || '[текста нет]'}\n\nАУДИО/ТРАНСКРИПТ:\n${audioContext || '[аудио нет]'}`;
  const strongAnthropic = provider.provider === 'anthropic' && /(?:fable|opus|sonnet-5)/i.test(provider.model || '');
  if (strongAnthropic) {
    const result = await callTextModel(provider, `${source}\n\nЦЕЛЬ: построить проверяемую, честную гипотезу о соционическом типе человека. Внутренне выполни четыре проверки: (1) отдели наблюдаемые факты и короткие цитаты от интерпретаций; (2) сравни основной ТИМ минимум с двумя альтернативами; (3) постарайся опровергнуть лидирующую версию и найди натяжки; (4) собери итог и явно назови недостающие данные. Не ставь высокую уверенность без независимых подтверждений. Не типируй по одному слову, профессии, настроению или социальной роли. Пиши просто и прямо. Не выводи внутренние рассуждения. Основной тип и альтернативы только из списка ${Object.entries(TYPE_NAMES).map(([k,v]) => `${k} (${v})`).join(', ')}. Верни только JSON: {"tim":{"abbreviation":"","name":""},"summary":"","confidence":0,"confidenceLevel":"low|medium|high|insufficient","alternatives":[{"abbreviation":"","name":"","probability":0,"reason":""}],"dichotomies":[{"name":"","result":"","confidence":0,"evidence":""}],"wordEvidence":[{"word":"короткая цитата","dimension":"","pole":"","count":1,"weight":1}],"doubts":[""]}.`, finalModel);
    return {
      result,
      stages: [
        { id: 'observations', label: 'Наблюдения', status: 'done', model: `${finalModel} · единый глубокий запрос` },
        { id: 'hypotheses', label: 'Гипотезы', status: 'done', model: finalModel },
        { id: 'critic', label: 'Критик', status: 'done', model: finalModel },
        { id: 'final', label: 'Итог', status: 'done', model: finalModel }
      ],
      providerUsed: `${provider.provider}:${finalModel}`
    };
  }
  const [observations, hypotheses, criticism] = await Promise.all([
    callTextModel(provider, `${source}\n\nЗАДАЧА 1. Без типирования извлеки наблюдения: проверяемые факты, короткие цитаты, повторяющиеся способы выбора, реакции на неопределённость, стиль аргументации. Отделяй наблюдение от интерпретации. JSON: {"facts":[{"quote":"","observation":"","relevance":""}],"missingData":[""]}.`, observationsModel),
    callTextModel(provider, `${source}\n\nЗАДАЧА 2. Независимо построй конкурирующие гипотезы по соционике: основной ТИМ и минимум две альтернативы из списка ${Object.keys(TYPE_NAMES).join(', ')}. Не выдавай уверенность выше данных. JSON: {"primary":{"abbreviation":"","name":"","confidence":0,"reason":""},"alternatives":[{"abbreviation":"","name":"","confidence":0,"reason":""}],"dichotomies":[{"name":"Экстраверсия / Интроверсия","result":"","confidence":0,"evidence":""}],"uncertainties":[""]}. Уверенность 0–100.`, hypothesesModel),
    callTextModel(provider, `${source}\n\nЗАДАЧА 3. Ты независимый критик до знакомства с чужой гипотезой. Найди признаки, которые чаще всего типируют ошибочно: социальные роли, профессию, настроение, выученный жаргон, желаемый образ. Назови взаимоисключающие объяснения и вопросы, способные их развести. JSON: {"problems":[""],"counterHypotheses":[""],"whatToAskNext":[""],"confidenceCeiling":0}.`, criticModel)
  ]);
  const finalResult = await callTextModel(provider, `${source}\n\nНАБЛЮДЕНИЯ:\n${compact(observations)}\n\nГИПОТЕЗЫ:\n${compact(hypotheses)}\n\nКРИТИКА:\n${compact(criticism)}\n\nЗАДАЧА 4. Собери честный итог. Если данных мало, так и напиши. Основной тип и альтернативы должны быть из списка ${Object.entries(TYPE_NAMES).map(([k,v]) => `${k} (${v})`).join(', ')}. JSON строго: {"tim":{"abbreviation":"","name":""},"summary":"","confidence":0,"confidenceLevel":"low|medium|high|insufficient","alternatives":[{"abbreviation":"","name":"","probability":0,"reason":""}],"dichotomies":[{"name":"","result":"","confidence":0,"evidence":""}],"wordEvidence":[{"word":"короткая цитата","dimension":"","pole":"","count":1,"weight":1}],"doubts":[""]}. Явно укажи сомнения.`, finalModel);

  return {
    result: finalResult,
    stages: [
      { id: 'observations', label: 'Наблюдения', status: 'done', model: observationsModel },
      { id: 'hypotheses', label: 'Гипотезы', status: 'done', model: hypothesesModel },
      { id: 'critic', label: 'Критик', status: 'done', model: criticModel },
      { id: 'final', label: 'Итог', status: 'done', model: finalModel }
    ],
    providerUsed: provider.provider
  };
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
  if ((!input.text || String(input.text).trim().length < 30) && !(input.audio || []).length) return json({ error: 'NOT_ENOUGH_DATA', message: 'Добавьте текст или аудио.' }, 400);
  const provider = resolveProvider(env, input.byok || {});
  let credits = await ensureUser(env, visitor.id);
  if (input.byok?.mode !== 'byok') credits = await consumeCredit(env, visitor.id, 'analysis');
  const debugCopy = await saveDebug(env, input, visitor.id, ctx);
  let audioContext = '';
  try { audioContext = await transcribeAudio(env, input.audio || [], input.voiceGuide || 'типировать основной голос'); }
  catch { audioContext = '[Аудио не удалось расшифровать. Не делай выводов о голосе.]'; }
  const pipeline = await runPipeline(env, provider, String(input.text || ''), audioContext);
  await finishDebugCopy(env, debugCopy, pipeline, audioContext);
  return json({ ...pipeline, attemptsLeft: Number(credits?.analysis_credits ?? 0), questionsLeft: Number(credits?.question_credits ?? 0), debugId: debugCopy?.submissionId || null });
}

async function handleAsk(request, env, visitor) {
  const input = await request.json();
  if (!input.question || !input.result) return json({ error: 'BAD_QUESTION' }, 400);
  const provider = resolveProvider(env, input.byok || {});
  let credits = await ensureUser(env, visitor.id);
  if (input.byok?.mode !== 'byok') credits = await consumeCredit(env, visitor.id, 'question');
  const answer = await callTextModel(provider, `РЕЗУЛЬТАТ ТИПИРОВАНИЯ:\n${compact(input.result)}\n\nВОПРОС:\n${String(input.question).slice(0, 3000)}\n\nОтветь просто и конкретно. Не повышай уверенность исходного результата. Верни JSON {"answer":"","suggestedQuestions":["","",""]}.`, env.QUESTION_MODEL || provider.model);
  return json({ answer: answer.answer || '', suggestedQuestions: answer.suggestedQuestions || [], questionsLeft: Number(credits?.question_credits ?? 0) });
}

async function handleValidate(request, env) {
  const input = await request.json();
  const provider = resolveProvider(env, { ...input, mode: 'byok' });
  const result = await callTextModel(
    provider,
    'Проверка соединения. Верни только JSON {"ok":true,"message":"Ключ принят"}.',
    provider.model
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
