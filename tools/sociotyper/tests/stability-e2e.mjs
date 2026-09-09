import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:8792/api/typist';
const owner = crypto.randomUUID();
async function api(path, method = 'GET', body, visitor = owner) {
 const response = await fetch(base + path, { method, headers: { Cookie: `nid=${visitor}`, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
 return { status: response.status, data: await response.json() };
}
assert.equal((await api('/health')).data.jobsReady, true);
assert.equal((await api('/status')).data.attemptsLeft, 4);
const jobId = crypto.randomUUID();
const input = { jobId, text: 'Я люблю читать и программировать. Мне интересно придумывать новые проекты и помогать друзьям.', byok: { mode: 'included' } };
const created = await api('/jobs', 'POST', input);
assert.equal(created.status, 202, JSON.stringify(created));
assert.equal((await api('/jobs', 'POST', input)).status, 202);
assert.equal((await api('/status')).data.attemptsLeft, 3);
assert.equal((await api(`/jobs/${jobId}`, 'GET', undefined, crypto.randomUUID())).status, 404);
let cursor = 0; const done = new Set(); const models = new Set();
const deadline = Date.now() + 360000;
while (Date.now() < deadline) {
 const { data } = await api(`/jobs/${jobId}?after=${cursor}`);
 assert.notEqual(data.status, 'error', JSON.stringify(data));
 for (const event of data.events || []) {
  if (event.stage?.status === 'done') { done.add(event.stage.id); models.add(event.stage.model); }
 }
 if (data.cursor !== cursor) console.log(`Server status ${data.status}; completed ${done.size}/25; cursor ${data.cursor}`);
 cursor = data.cursor;
 if (data.status === 'complete' && !data.hasMore) {
  assert.equal(done.size, 25);
  assert.equal(data.result.probeResults.length, 24);
  assert.equal(data.result.probeResults[0].confidence, 0);
  assert.equal(models.size, 3);
  console.log('PASS: 24 probes + synthesis, 3 models, zero confidence preserved, owner isolation, idempotent credit');
  break;
 }
 await new Promise(resolve => setTimeout(resolve, 2000));
}
assert.equal(done.size, 25, 'Pipeline failed to finish');
const cancelId = crypto.randomUUID();
assert.equal((await api('/jobs', 'POST', { ...input, jobId: cancelId })).status, 202);
assert.equal((await api(`/jobs/${cancelId}`, 'DELETE')).status, 200);
assert.equal((await api(`/jobs/${cancelId}`, 'DELETE')).status, 200);
assert.equal((await api('/status')).data.attemptsLeft, 3);
console.log('PASS: cancellation refunds exactly once');
