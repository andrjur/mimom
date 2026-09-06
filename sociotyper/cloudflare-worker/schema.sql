CREATE TABLE IF NOT EXISTS users (
  session_id TEXT PRIMARY KEY,
  analysis_credits INTEGER NOT NULL DEFAULT 4 CHECK (analysis_credits >= 0),
  question_credits INTEGER NOT NULL DEFAULT 10 CHECK (question_credits >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS access_codes (
  code_hash TEXT PRIMARY KEY,
  label TEXT,
  analysis_credits INTEGER NOT NULL DEFAULT 4,
  question_credits INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'redeemed', 'revoked')),
  redeemed_session_id TEXT,
  redeemed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS debug_submissions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  r2_prefix TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_debug_submissions_expiry ON debug_submissions(expires_at);
CREATE INDEX IF NOT EXISTS idx_debug_submissions_session ON debug_submissions(session_id, created_at);
PRAGMA optimize;
