CREATE TABLE IF NOT EXISTS analysis_jobs (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued',
 input TEXT, result TEXT, error TEXT, charged INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS analysis_jobs_owner ON analysis_jobs(owner, created_at);
CREATE TABLE IF NOT EXISTS analysis_events (
 seq INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS analysis_events_job ON analysis_events(job_id, seq);
CREATE TABLE IF NOT EXISTS provider_lanes (key_hash TEXT PRIMARY KEY, next_ms INTEGER NOT NULL);
