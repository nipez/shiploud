-- Public marketing waitlist: email only (+ light metadata).

CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT,
  created_at TEXT NOT NULL,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON waitlist (created_at);
