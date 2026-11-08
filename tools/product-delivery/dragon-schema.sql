CREATE TABLE IF NOT EXISTS dragon_sessions (
 owner TEXT PRIMARY KEY, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS dragon_codes (
 code_hash TEXT PRIMARY KEY, max_uses INTEGER NOT NULL CHECK(max_uses IN (1,5,10)),
 uses INTEGER NOT NULL DEFAULT 0 CHECK(uses>=0 AND uses<=max_uses)
);
CREATE TABLE IF NOT EXISTS dragon_grants (
 owner TEXT PRIMARY KEY REFERENCES dragon_sessions(owner),
 code_hash TEXT NOT NULL REFERENCES dragon_codes(code_hash), created_at INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS dragon_capacity BEFORE INSERT ON dragon_grants BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM dragon_codes WHERE code_hash=NEW.code_hash AND uses<max_uses)
 THEN RAISE(ABORT,'DRAGON_EXHAUSTED') END;
END;
CREATE TRIGGER IF NOT EXISTS dragon_spend AFTER INSERT ON dragon_grants BEGIN
 UPDATE dragon_codes SET uses=uses+1 WHERE code_hash=NEW.code_hash;
END;
CREATE TABLE IF NOT EXISTS dragon_comments (
 id TEXT PRIMARY KEY, page TEXT NOT NULL, owner TEXT NOT NULL,
 parent TEXT REFERENCES dragon_comments(id), body TEXT NOT NULL,
 image TEXT, created_at INTEGER NOT NULL, updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS dragon_comments_page ON dragon_comments(page,created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS dragon_comment_clock (owner TEXT PRIMARY KEY,last_at INTEGER NOT NULL);
CREATE TRIGGER IF NOT EXISTS dragon_slow BEFORE INSERT ON dragon_comments WHEN NEW.owner!='author-seed' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM dragon_comment_clock WHERE owner=NEW.owner
 AND last_at>NEW.created_at-CASE WHEN NEW.page='landing' THEN 15000 ELSE 600000 END)
 THEN RAISE(ABORT,'DRAGON_SLOW') END;
END;
CREATE TRIGGER IF NOT EXISTS dragon_clock AFTER INSERT ON dragon_comments WHEN NEW.owner!='author-seed' BEGIN
 INSERT INTO dragon_comment_clock(owner,last_at) VALUES(NEW.owner,NEW.created_at)
 ON CONFLICT(owner) DO UPDATE SET last_at=NEW.created_at;
END;
