-- Official X OAuth 2.0 (writes). Radar/followers stay on public fxtwitter.
-- One connection per ShipLoud user. Tokens stored here; AES-GCM wrap when
-- TOKEN_WRAP_SECRET is set. Worker secret encryption is next if that env is absent.

CREATE TABLE IF NOT EXISTS x_connections (
  user_id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  x_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT NOT NULL,
  connected_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS x_oauth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS x_oauth_states_created_at_idx ON x_oauth_states (created_at);
