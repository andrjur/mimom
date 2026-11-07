CREATE TABLE IF NOT EXISTS product_codes (
  code_hash TEXT PRIMARY KEY,
  product TEXT NOT NULL CHECK(product IN ('start','ai')),
  redeemed_at INTEGER,
  redemption_hash TEXT
);
CREATE TABLE IF NOT EXISTS product_attempts (
  bucket_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS product_ab_views (
  visitor_hash TEXT NOT NULL,
  product TEXT NOT NULL,
  variant TEXT NOT NULL CHECK(variant IN ('a','b')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(visitor_hash,product)
);
CREATE TABLE IF NOT EXISTS product_ab_redemptions (
  code_hash TEXT PRIMARY KEY,
  product TEXT NOT NULL,
  variant TEXT NOT NULL CHECK(variant IN ('a','b')),
  visitor_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
