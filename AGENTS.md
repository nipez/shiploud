# AGENTS.md

## Cursor Cloud specific instructions

ShipLoud is one product with three independent npm projects (no root workspace manifest — install per folder):

| Service | Path | Dev command | Port | Notes |
| --- | --- | --- | --- | --- |
| API (Cloudflare Worker + D1 + Workers AI + cron) | `api/` | `npm run dev` (`wrangler dev`) | 8787 | Backend for everything. See caveats below. |
| App (build-in-public web app) | `app/` | `npm run dev` | 5174 | React + Vite. Needs the API for login/sync/drafts/radar. |
| Landing (marketing + waitlist) | `landing/` | `npm run dev` | 5173 | React + Vite. Waitlist/admin call the API. |

Standard scripts live in each `package.json`; the update script already runs `npm install` in all three.

### Lint / test / build
- There is no ESLint config and no automated test suite. Type-checking is the lint proxy: `npm run build` (runs `tsc -b` then `vite build`) for `app/` and `landing/`, and `npx tsc --noEmit` in `api/`.
- `api/scripts/*.mjs` and `app/scripts/smoke-generate.mjs` are ad-hoc manual smoke scripts, not a test runner.

### Running the API locally (non-obvious caveats)
- Apply local D1 migrations once per VM before first run (creates a local SQLite store under `api/.wrangler/`, which is not persisted by the update script): `cd api && npm run d1:migrate:local`.
- Passphrase login needs a secret. Create `api/.dev.vars` (git-ignored) with `DOFOOD_PASS=localdev` (and optionally `SHIPLOUD_PASS=localdev`). Then `POST /api/login {"pass":"localdev"}` returns a bootstrap admin token.
- **AI binding hangs local requests unless a dummy Cloudflare token is set.** In `wrangler dev` the `AI` binding connects to the *remote* Workers AI service; with no Cloudflare auth it launches an interactive OAuth browser login that makes `/api/drafts/generate` and `/api/radar/replies` hang forever. Start the worker with a dummy token so the AI call fails fast and the code falls back to its deterministic template generator (responses come back instantly with `"source":"template"`):
  `CLOUDFLARE_API_TOKEN=localdevdummy npm run dev` (run from `api/`).
  Real AI (`"source":"ai"`) only works with genuine Cloudflare credentials; the template fallback is the expected local behavior.

### Pointing the App at the local worker
- `app/.env.development` ships `VITE_API_URL=https://shiploud-api.nickperez.workers.dev` (production). In Vite, `.env.development` has higher priority than `.env.local`, so to hit the local worker create `app/.env.development.local` (highest priority; do not commit it) with:
  `VITE_API_URL=http://localhost:8787`
- With no `VITE_API_URL` the app runs in local-only mode (pure `localStorage`, no login/cloud features).

### Landing waitlist/admin
- `landing/src/WaitlistForm.tsx` and `Admin.tsx` **hardcode** the production worker URL, so the landing UI cannot be repointed at the local worker via env vars. To exercise the waitlist against the local worker, call it directly, e.g. `curl -X POST http://localhost:8787/api/waitlist -H 'Content-Type: application/json' -d '{"email":"x@example.com"}'`.

### Optional / degrades gracefully
- X posting (`/api/x/*`) returns 503 without `X_CLIENT_ID`/`X_CLIENT_SECRET`; the app falls back to X web-intent.
- Follower stats / reply radar use public fxtwitter/vxtwitter reads and fail soft (stale/empty) without outbound internet.
