-- Multi-user accounts: users, invites, per-user sessions.
-- Wiping sessions is intentional (auth model changes).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'founder',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  created_by TEXT NOT NULL,
  used_by TEXT,
  used_at TEXT,
  created_at TEXT NOT NULL
);

DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

-- Associate events / snapshots with a user when available (old rows stay NULL).
ALTER TABLE events ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS events_user_id_created_at_idx ON events (user_id, created_at);

ALTER TABLE x_snapshots ADD COLUMN user_id TEXT;
