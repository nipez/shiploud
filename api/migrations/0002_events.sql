CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  session_token TEXT,
  name TEXT NOT NULL,
  props TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS events_created_at_idx ON events (created_at);
CREATE INDEX IF NOT EXISTS events_name_created_at_idx ON events (name, created_at);
