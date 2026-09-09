const encoder = new TextEncoder();
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const unhex = value => Uint8Array.from(value.match(/.{2}/g) || [], x => parseInt(x, 16));

async function encryptionKey(env) {
  if (!env.JOB_ENCRYPTION_KEY) throw new Error('JOB_STORAGE_NOT_CONFIGURED');
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(env.JOB_ENCRYPTION_KEY));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function seal(env, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(env), encoder.encode(JSON.stringify(value)));
  return `${hex(iv)}.${hex(new Uint8Array(encrypted))}`;
}

export async function unseal(env, value) {
  const [iv, data] = value.split('.');
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unhex(iv) }, await encryptionKey(env), unhex(data));
  return JSON.parse(new TextDecoder().decode(plaintext));
}

export async function emitJob(env, jobId, entry) {
  if (!jobId) return;
  const active = await env.DB.prepare("SELECT id FROM analysis_jobs WHERE id = ? AND status IN ('queued','running')").bind(jobId).first();
  if (!active) throw new Error('JOB_CANCELLED');
  const event = { ...entry, at: new Date().toISOString() };
  const encrypted = await seal(env, event);
  await env.DB.prepare('INSERT INTO analysis_events (job_id, payload) VALUES (?, ?)').bind(jobId, encrypted).run();
}

export async function readJob(env, id, owner, after = 0) {
  const job = await env.DB.prepare('SELECT * FROM analysis_jobs WHERE id = ? AND owner = ? AND expires_at > ?').bind(id, owner, Date.now()).first();
  if (!job) return null;
  const events = await env.DB.prepare('SELECT seq, payload FROM analysis_events WHERE job_id = ? AND seq > ? ORDER BY seq LIMIT 30').bind(id, after).all();
  const entries = await Promise.all(events.results.map(async row => ({ seq: row.seq, ...await unseal(env, row.payload) })));
  return { id, status: job.status, startedAt: job.created_at, events: entries, cursor: entries.at(-1)?.seq || after,
    hasMore: entries.length === 30, result: job.result ? await unseal(env, job.result) : null, error: job.error || null };
}

export async function refundJob(env, id) {
  // D1 batch is transactional. The status guard makes replay harmless.
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET analysis_credits = analysis_credits + 1 WHERE session_id = (SELECT owner FROM analysis_jobs WHERE id = ? AND charged = 1 AND status IN ('error','cancelled'))").bind(id),
    env.DB.prepare("UPDATE analysis_jobs SET charged = 0 WHERE id = ? AND status IN ('error','cancelled')").bind(id)
  ]);
}

export async function expireJobs(env) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM analysis_events WHERE job_id IN (SELECT id FROM analysis_jobs WHERE expires_at < ?)').bind(Date.now()),
    env.DB.prepare('DELETE FROM analysis_jobs WHERE expires_at < ?').bind(Date.now())
  ]);
}
