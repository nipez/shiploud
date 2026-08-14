-- Per-handle public tweet cache for reply radar (avoid hammering fxtwitter).
CREATE TABLE IF NOT EXISTS radar_cache (
  handle TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS radar_cache_fetched_at_idx ON radar_cache (fetched_at);
