CREATE TABLE IF NOT EXISTS x_snapshots (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  followers INTEGER NOT NULL,
  following INTEGER,
  posts_count INTEGER,
  checked_at TEXT NOT NULL,
  source TEXT NOT NULL,
  raw_note TEXT
);

CREATE INDEX IF NOT EXISTS x_snapshots_handle_checked_at_idx
  ON x_snapshots (handle, checked_at);
