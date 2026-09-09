import http from 'node:http';
let requests = 0;
http.createServer(async (req, res) => {
 res.setHeader('Content-Type', 'application/json');
 if (req.url === '/stats') return res.end(JSON.stringify({ requests }));
 if (req.url === '/v1/models') return res.end(JSON.stringify({ data: ['minimax-2.7','deepseek-v4-flash','kimi-2.6'].map(id => ({ id })) }));
 let body = ''; for await (const part of req) body += part;
 const input = JSON.parse(body || '{}'); requests++;
 const prompt = input.messages?.at(-1)?.content || '';
 let answer;
 if (String(prompt).includes('ЗАДАЧА СИНТЕЗА')) answer = { tim: { abbreviation: 'ИЛЭ', name: 'Дон Кихот' }, summary: 'Тестовый ответ, не реальное типирование.', confidence: 70, confidenceLevel: 'medium', alternatives: [{ abbreviation: 'ЛИИ', name: 'Робеспьер', probability: 35 }], doubts: [], dichotomies: [] };
 else answer = { ok: true, pole: 'insufficient', confidence: 0, evidence: [{ quote: 'люблю читать', observation: 'Прямая цитата теста.' }], transcript: 'Тестовая расшифровка: люблю читать', voiceObservations: [] };
 res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }], usage: { total_tokens: 10 } }));
}).listen(8793, '127.0.0.1', () => console.log('Mock provider listening on 8793; no external AI requests'));
