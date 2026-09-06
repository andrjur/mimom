import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const port = Number(process.env.DEMO_PORT || 8769);
const apiKey = process.env.DEMO_KNYAZEV_API_KEY || '';
const usage = new Map();
const types = 'ИЛЭ Дон Кихот, СЭИ Дюма, ЭСЭ Гюго, ЛИИ Робеспьер, ЭИЭ Гамлет, ЛСИ Максим Горький, СЛЭ Жуков, ИЭИ Есенин, СЭЭ Наполеон, ИЛИ Бальзак, ЛИЭ Джек Лондон, ЭСИ Драйзер, ЛСЭ Штирлиц, ЭИИ Достоевский, ИЭЭ Гексли, СЛИ Габен';

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const send = (res, status, body, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
const readBody = req => new Promise((resolve, reject) => { let body = ''; req.on('data', chunk => { body += chunk; if (body.length > 60_000_000) reject(new Error('PAYLOAD_TOO_LARGE')); }); req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (error) { reject(error); } }); req.on('error', reject); });
const parseJson = value => { const clean = String(value || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''); return JSON.parse(clean); };
const client = req => {
  const raw = String(req.headers.cookie || '').match(/demo_id=([a-z0-9-]+)/i)?.[1];
  const id = raw || crypto.randomUUID();
  if (!usage.has(id)) usage.set(id, { attemptsLeft: 4, questionsLeft: 10 });
  return { id, state: usage.get(id), cookie: raw ? null : `demo_id=${id}; Path=/; SameSite=Lax; Max-Age=86400` };
};

async function callModel(prompt) {
  if (!apiKey) throw new Error('DEMO_KEY_NOT_SET');
  const response = await fetch('https://knyazevai.work/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'deepseek-v4-flash', temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `KNYAZEV_${response.status}`);
  return parseJson(payload?.choices?.[0]?.message?.content || payload?.output_text || '{}');
}

async function analyze(input) {
  const audioNote = (input.audio || []).length
    ? `Прикреплены аудиофайлы: ${(input.audio || []).map(item => item.name).join(', ')}. В локальном деморежиме оценивай только текст; голос будет полноценно обработан после подключения OMNI на Worker.`
    : 'Аудио не приложено.';
  const prompt = `Ты осторожный соционический типировщик. Проведи внутри ответа четыре проверки: наблюдения без типирования; основной тип и две альтернативы; попытка опровергнуть лидера; честный итог. Не типируй по профессии, одному слову или желаемому образу. Явно укажи сомнения. Если данных мало, confidenceLevel=insufficient. Не показывай скрытые рассуждения. Допустимые типы: ${types}.\n\nТипируем: ${input.name || 'участника'}\nИнструкция по голосу: ${input.voiceGuide || ''}\n${audioNote}\n\nМатериал:\n${String(input.text || '').slice(0, 80000)}\n\nВерни только JSON: {"tim":{"abbreviation":"","name":""},"summary":"","confidence":0,"confidenceLevel":"low|medium|high|insufficient","alternatives":[{"abbreviation":"","name":"","probability":0,"reason":""}],"dichotomies":[{"name":"","result":"","confidence":0,"evidence":""}],"wordEvidence":[{"word":"короткая цитата","dimension":"","pole":"","count":1,"weight":1}],"doubts":[""]}.`;
  return callModel(prompt);
}

async function api(req, res, pathname) {
  const session = client(req);
  const headers = session.cookie ? { 'Set-Cookie': session.cookie } : {};
  if (pathname.endsWith('/status')) return send(res, 200, session.state, headers);
  if (req.method !== 'POST') return send(res, 405, { message: 'Метод не поддерживается' }, headers);
  const input = await readBody(req);
  if (pathname.endsWith('/analyze')) {
    if (session.state.attemptsLeft <= 0) return send(res, 402, { message: 'Четыре демопопытки закончились.' }, headers);
    session.state.attemptsLeft -= 1;
    const result = await analyze(input);
    return send(res, 200, { result, attemptsLeft: session.state.attemptsLeft, providerUsed: 'Knyazev AI · локальный деморежим', stages: [
      { id: 'observations', label: 'Наблюдения', status: 'done', model: 'DeepSeek V4 Flash' },
      { id: 'hypotheses', label: 'Гипотезы', status: 'done', model: 'DeepSeek V4 Flash' },
      { id: 'critic', label: 'Критик', status: 'done', model: 'DeepSeek V4 Flash' },
      { id: 'final', label: 'Итог', status: 'done', model: 'DeepSeek V4 Flash' }
    ] }, headers);
  }
  if (pathname.endsWith('/ask')) {
    if (session.state.questionsLeft <= 0) return send(res, 402, { message: 'Десять вопросов закончились.' }, headers);
    session.state.questionsLeft -= 1;
    const result = await callModel(`Дай короткое и понятное пояснение к результату соционического типирования. Не повышай уверенность и не ставь диагноз. Результат: ${JSON.stringify(input.result).slice(0, 25000)}\nВопрос: ${String(input.question || '').slice(0, 3000)}\nJSON: {"answer":"","suggestedQuestions":["",""]}`);
    return send(res, 200, { ...result, questionsLeft: session.state.questionsLeft }, headers);
  }
  return send(res, 404, { message: 'Маршрут не найден' }, headers);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/typist/')) return await api(req, res, url.pathname);
    let relative = url.pathname.replace(/^\/sociotyper\/?/, '') || 'index.html';
    relative = decodeURIComponent(relative);
    const target = path.resolve(dist, relative);
    if (!target.startsWith(path.resolve(dist))) return send(res, 403, 'Forbidden');
    let data;
    try { data = await fs.readFile(target); } catch { data = await fs.readFile(path.join(dist, 'index.html')); }
    res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch (error) {
    send(res, 500, { message: error instanceof Error ? error.message : 'Ошибка демосервера' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Демо готово: http://127.0.0.1:${port}/sociotyper/`);
  console.log('Ключ находится только в памяти этого процесса и не попадает в сайт.');
});
