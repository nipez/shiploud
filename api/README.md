# shiploud-api

Cloudflare Worker + D1 sync API for ShipLoud dogfood (multi-user).

- Worker URL: https://shiploud-api.nickperez.workers.dev
- D1 database: shiploud-dogfood (1ff86af8-5665-4deb-9f7e-b4246b2364c2)
- Secrets: DOFOOD_PASS / SHIPLOUD_PASS (passphrase login for Nicholas bootstrap)

## Auth
- POST /api/login  `{"pass":"..."}` → Nicholas bootstrap user (early access)
- POST /api/login  `{"email","password"}` → real user
- POST /api/signup `{"email","password","inviteCode","displayName?"}`
- POST /api/invites (auth; founders) → `{"code"}` once
- GET  /api/me

## State (per-user)
- GET/PUT /api/state  → `kv_state` key `app_state:<userId>`

## Waitlist
- POST /api/waitlist  `{"email","source?"}` → `{ok:true}` (public; upsert/ignore duplicate; no existence leak)
- GET  /api/waitlist/count → `{ok:true,count}` (public count only)
- GET  /api/waitlist → `{emails:[{email,source,created_at}],count}` (auth + admin only)

## Other
- POST /api/drafts/generate (auth) → Workers AI short X drafts (`source: ai|template`)
- GET  /api/builders/profiles (auth) `?handles=a,b,c` → `{ profiles: [{ handle, name, avatarUrl, bio, followers }] }`
  - Public fxtwitter profile (`/ :handle`), D1 `builder_profiles` ~24h; parallel, fail-soft (handle still returned)
- GET  /api/builders/preview (auth) `?handle=tibo_maker` → `{ handle, posts: [{ text, createdAt, mediaUrl? }] }` (max 3)
  - Same fxtwitter statuses as radar; shares D1 `radar_cache` ~20 min; skips replies/reposts when marked
  - Batch: `?handles=a,b` → `{ previews: [{ handle, posts }] }`
- GET/POST /api/radar (auth) `{ handles, voice?, force? }` → `{ items: [{ handle, displayName, avatarUrl, tweetId, text, url, createdAt, media, likes, reposts, replies, suggestedReply, suggestedReplies }] }`
  - `suggestedReplies` is 3 short warm/curious options; `suggestedReply` is the first (back-compat)
  - Public posts via fxtwitter (`/2/profile/:handle/statuses`), D1 `radar_cache` ~20 min (tweets only; replies always regenerated)
  - Passes through full text, author name/avatar, https photo/video URLs, and like/rt/reply counts when fxtwitter provides them
  - Suggested replies: Workers AI warm-peer prompt (≤180 chars), template fallback — never dunk
- POST /api/events, GET /api/events/summary
- POST /api/x/refresh, GET /api/x/stats, GET /api/x/probe (public fxtwitter — not official X reads)
- GET  /api/x/oauth/start (auth) → `{ url }` PKCE authorize URL; **503** if X_CLIENT_ID/SECRET unset
- GET  /api/x/oauth/callback — exchange code, save connection, 302 to `https://app.getshiploud.com/?x=connected`
- GET  /api/x/connection (auth) → `{ connected, handle, configured }` (never tokens)
- DELETE /api/x/connection (auth) — disconnect
- POST /api/x/post (auth) `{ text, replyToId? }` → `{ id, url }`; if `replyToId` set, posts as a reply (`in_reply_to_tweet_id`); **401** if not connected
- GET /api/health

Official X API is **writes only** (OAuth 2.0 PKCE + POST /2/tweets). Radar/followers stay on fxtwitter.

Callback URL for the X developer portal:
`https://shiploud-api.nickperez.workers.dev/api/x/oauth/callback`

## AI
- Binding: `AI` (Workers AI)
- Model: `@cf/meta/llama-3.1-8b-instruct-fp8`
- Fallback: server template generator if AI fails

## Deploy
export XDG_CACHE_HOME=/workspace/.cache CLOUDFLARE_ACCOUNT_ID=af7d11f04c2cb5763fd0e928f907f46d
wrangler d1 migrations apply shiploud-dogfood --remote
wrangler deploy
