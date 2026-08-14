-- Public X profile cache for suggested-follow cards (fxtwitter, ~24h).
CREATE TABLE IF NOT EXISTS builder_profiles (
  handle TEXT PRIMARY KEY,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  followers INTEGER,
  fetched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS builder_profiles_fetched_at_idx ON builder_profiles (fetched_at);
