import { generateDrafts, type GenerateJournal, type GenerateProject } from './drafts'
import { capProfileHandles, getBuilderProfiles } from './builders'
import { buildRadar, capHandles, favoriteHandlesFromState, generateMoreReplies, getHandleTweets, tweetsToPreview, validHandle } from './radar'
import {
  handleConnectionDelete,
  handleConnectionGet,
  handleOAuthCallback,
  handleOAuthStart,
  handleXPost,
} from './xAuth'
export interface Env {
  DB: D1Database
  AI?: Ai
  DOFOOD_PASS?: string
  SHIPLOUD_PASS?: string
  BOOTSTRAP_EMAIL?: string
  X_CLIENT_ID?: string
  X_CLIENT_SECRET?: string
  X_OAUTH_REDIRECT?: string
  TOKEN_WRAP_SECRET?: string
}

const ALLOWED_ORIGINS = [
  'https://shiploud-app.pages.dev',
  'https://shiploud.pages.dev',
  'https://app.getshiploud.com',
  'https://www.getshiploud.com',
  'https://getshiploud.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]

const SHARED_STATE_KEY = 'app_state'
const BOOTSTRAP_EMAIL_DEFAULT = 'nicholas@getshiploud.com'
const BOOTSTRAP_DISPLAY = 'Nicholas'
const BOOTSTRAP_ROLE = 'admin'

const PBKDF2_ITERATIONS = 100_000
const PBKDF2_HASH = 'SHA-256'
const SALT_BYTES = 16
const KEY_BYTES = 32

const ALLOWED_EVENTS = new Set([
  'session_login',
  'setup_saved',
  'journal_saved',
  'drafts_generated',
  'draft_copied',
  'draft_saved_for_later',
  'draft_marked_posted',
  'reply_copied',
  'reply_handle_clicked',
  'reply_radar_refreshed',
  'x_followers_refreshed',
  'x_connected',
  'x_posted',
  'x_replied',
])

type XSnapshot = {
  id: string
  handle: string
  followers: number
  following: number | null
  posts_count: number | null
  checked_at: string
  source: string
  raw_note: string | null
}

type FetchedProfile = {
  handle: string
  followers: number
  following: number | null
  posts_count: number | null
  source: string
  raw_note: string
}

type UserRow = {
  id: string
  email: string
  password_hash: string | null
  display_name: string | null
  role: string
  created_at: string
}

type AuthOk = { token: string; userId: string; role: string }

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  try {
    const u = new URL(origin)
    if (
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
      (u.protocol === 'http:' || u.protocol === 'https:')
    ) {
      return true
    }
    // Cloudflare Pages preview + project domains for ShipLoud
    if (
      u.protocol === 'https:' &&
      (u.hostname === 'shiploud.pages.dev' ||
        u.hostname.endsWith('.shiploud.pages.dev') ||
        u.hostname === 'shiploud-app.pages.dev' ||
        u.hostname.endsWith('.shiploud-app.pages.dev'))
    ) {
      return true
    }
  } catch {
    return false
  }
  return false
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = isAllowedOrigin(origin) && origin ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

/** Light in-isolate rate limit for public waitlist (best-effort). */
const waitlistHits = new Map<string, { count: number; resetAt: number }>()

function allowWaitlistHit(ip: string, limit = 12, windowMs = 60_000): boolean {
  const now = Date.now()
  const cur = waitlistHits.get(ip)
  if (!cur || now > cur.resetAt) {
    waitlistHits.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (cur.count >= limit) return false
  cur.count += 1
  return true
}

function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

function json(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  })
}

/** Fail closed: no hardcoded production passphrase. Secrets must be set. */
function getPass(env: Env): string {
  return (env.DOFOOD_PASS || env.SHIPLOUD_PASS || '').trim()
}

function bootstrapEmail(env: Env): string {
  return (env.BOOTSTRAP_EMAIL || BOOTSTRAP_EMAIL_DEFAULT).trim().toLowerCase()
}

function stateKeyForUser(userId: string): string {
  return `app_state:${userId}`
}

function randomToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomId(prefix: string): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return `${prefix}_${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

function inviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('')
}

function eventId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function bufToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBuf(hex: string): Uint8Array {
  const clean = hex.trim()
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error('bad_hex')
  }
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES)
  crypto.getRandomValues(salt)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    KEY_BYTES * 8,
  )
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bufToHex(salt.buffer)}$${bufToHex(bits)}`
}

async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored || typeof stored !== 'string') return false
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  if (!Number.isFinite(iterations) || iterations < 10_000) return false
  let salt: Uint8Array
  let expected: Uint8Array
  try {
    salt = hexToBuf(parts[2])
    expected = hexToBuf(parts[3])
  } catch {
    return false
  }
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    expected.length * 8,
  )
  const got = new Uint8Array(bits)
  if (got.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ expected[i]
  return diff === 0
}

function sanitizeProps(raw: unknown): Record<string, string | number | boolean | null> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, string | number | boolean | null> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k !== 'string' || k.length > 40) continue
    if (typeof v === 'string') out[k] = v.slice(0, 200)
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
    else if (typeof v === 'boolean') out[k] = v
    else if (v === null) out[k] = null
  }
  return out
}

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase()
}

function asFiniteInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.floor(v))
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) {
    return Math.max(0, Math.floor(Number(v)))
  }
  return null
}

function pickUserObject(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null
  const root = data as Record<string, unknown>
  if (root.user && typeof root.user === 'object') return root.user as Record<string, unknown>
  if (root.data && typeof root.data === 'object') {
    const d = root.data as Record<string, unknown>
    if (d.user && typeof d.user === 'object') return d.user as Record<string, unknown>
    return d
  }
  if ('followers' in root || 'followers_count' in root || 'screen_name' in root) return root
  return null
}

function parseProfilePayload(
  data: unknown,
  expectedHandle: string,
  source: string,
): FetchedProfile | null {
  const user = pickUserObject(data)
  if (!user) return null
  const followers =
    asFiniteInt(user.followers) ??
    asFiniteInt(user.followers_count) ??
    asFiniteInt(user.followersCount)
  if (followers === null) return null
  const following =
    asFiniteInt(user.following) ??
    asFiniteInt(user.friends_count) ??
    asFiniteInt(user.friendsCount) ??
    asFiniteInt(user.following_count)
  const posts =
    asFiniteInt(user.tweets) ??
    asFiniteInt(user.statuses_count) ??
    asFiniteInt(user.statusesCount) ??
    asFiniteInt(user.posts) ??
    asFiniteInt(user.posts_count)
  const screen =
    typeof user.screen_name === 'string'
      ? user.screen_name
      : typeof user.username === 'string'
        ? user.username
        : expectedHandle
  return {
    handle: normalizeHandle(screen) || expectedHandle,
    followers,
    following,
    posts_count: posts,
    source,
    raw_note: `ok:${source}`,
  }
}

async function tryFetchJson(
  url: string,
  source: string,
  expectedHandle: string,
): Promise<FetchedProfile | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ShipLoudBot/0.1 (+https://www.getshiploud.com)',
      },
      redirect: 'follow',
    })
    if (!res.ok) return null
    const data = (await res.json()) as unknown
    return parseProfilePayload(data, expectedHandle, source)
  } catch {
    return null
  }
}

/** Public profile stats — never uses X login or paid API. */
async function fetchPublicXProfile(handleRaw: string): Promise<FetchedProfile | { error: string }> {
  const handle = normalizeHandle(handleRaw)
  if (!handle || !/^[a-z0-9_]{1,15}$/i.test(handle)) {
    return { error: 'invalid_handle' }
  }

  const attempts: Array<{ url: string; source: string }> = [
    { url: `https://api.fxtwitter.com/${encodeURIComponent(handle)}`, source: 'fxtwitter' },
    {
      url: `https://api.fxtwitter.com/2/profile/${encodeURIComponent(handle)}`,
      source: 'fxtwitter_v2',
    },
    {
      url: `https://api.vxtwitter.com/${encodeURIComponent(handle)}`,
      source: 'vxtwitter',
    },
  ]

  const errors: string[] = []
  for (const a of attempts) {
    const got = await tryFetchJson(a.url, a.source, handle)
    if (got) return got
    errors.push(a.source)
  }

  return { error: `fetch_failed:${errors.join(',')}` }
}

function handlesFromStateValue(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const state = JSON.parse(value) as {
      setup?: { projects?: Array<{ xHandle?: string }> }
    }
    const projects = state.setup?.projects ?? []
    const handles = new Set<string>()
    for (const p of projects) {
      const h = normalizeHandle(p.xHandle || '')
      if (h) handles.add(h)
    }
    return [...handles]
  } catch {
    return []
  }
}

async function handlesFromUserState(env: Env, userId: string): Promise<string[]> {
  const row = await env.DB.prepare('SELECT value FROM kv_state WHERE key = ?')
    .bind(stateKeyForUser(userId))
    .first<{ value: string }>()
  return handlesFromStateValue(row?.value)
}

async function handlesFromAllUserStates(env: Env): Promise<string[]> {
  const { results } = await env.DB.prepare(
    `SELECT value FROM kv_state WHERE key LIKE 'app_state:%'`,
  ).all<{ value: string }>()
  const handles = new Set<string>()
  for (const row of results ?? []) {
    for (const h of handlesFromStateValue(row.value)) handles.add(h)
  }
  // Legacy shared blob (pre-migration) — still scan until removed.
  const shared = await env.DB.prepare('SELECT value FROM kv_state WHERE key = ?')
    .bind(SHARED_STATE_KEY)
    .first<{ value: string }>()
  for (const h of handlesFromStateValue(shared?.value)) handles.add(h)
  return [...handles]
}

/**
 * Ensure Nicholas bootstrap user exists and shared app_state is copied to
 * app_state:<nicholasId> once. Safe to call repeatedly.
 */
async function ensureBootstrapUser(env: Env): Promise<UserRow> {
  const email = bootstrapEmail(env)
  let user = await env.DB.prepare(
    'SELECT id, email, password_hash, display_name, role, created_at FROM users WHERE email = ?',
  )
    .bind(email)
    .first<UserRow>()

  if (!user) {
    const id = randomId('user')
    const createdAt = new Date().toISOString()
    await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, display_name, role, created_at)
       VALUES (?, ?, NULL, ?, ?, ?)`,
    )
      .bind(id, email, BOOTSTRAP_DISPLAY, BOOTSTRAP_ROLE, createdAt)
      .run()
    user = {
      id,
      email,
      password_hash: null,
      display_name: BOOTSTRAP_DISPLAY,
      role: BOOTSTRAP_ROLE,
      created_at: createdAt,
    }
  } else if (user.role !== BOOTSTRAP_ROLE && user.role !== 'founder') {
    // keep as-is
  } else if (user.role !== BOOTSTRAP_ROLE) {
    await env.DB.prepare(`UPDATE users SET role = ? WHERE id = ?`)
      .bind(BOOTSTRAP_ROLE, user.id)
      .run()
    user = { ...user, role: BOOTSTRAP_ROLE }
  }

  const perKey = stateKeyForUser(user.id)
  const per = await env.DB.prepare('SELECT key FROM kv_state WHERE key = ?')
    .bind(perKey)
    .first<{ key: string }>()
  if (!per) {
    const shared = await env.DB.prepare(
      'SELECT value, updated_at FROM kv_state WHERE key = ?',
    )
      .bind(SHARED_STATE_KEY)
      .first<{ value: string; updated_at: string }>()
    if (shared?.value) {
      await env.DB.prepare(
        `INSERT INTO kv_state (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO NOTHING`,
      )
        .bind(perKey, shared.value, shared.updated_at || new Date().toISOString())
        .run()
    }
  }

  return user
}

async function createSession(env: Env, userId: string): Promise<string> {
  const token = randomToken()
  const createdAt = new Date().toISOString()
  await env.DB.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)')
    .bind(token, userId, createdAt)
    .run()
  return token
}

async function requireAuth(request: Request, env: Env): Promise<AuthOk | Response> {
  const origin = request.headers.get('Origin')
  const header = request.headers.get('Authorization') || ''
  const m = header.match(/^Bearer\s+(.+)$/i)
  if (!m) return json({ error: 'unauthorized' }, 401, origin)
  const token = m[1].trim()
  if (!token) return json({ error: 'unauthorized' }, 401, origin)
  const row = await env.DB.prepare(
    `SELECT s.token AS token, s.user_id AS user_id, u.role AS role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
  )
    .bind(token)
    .first<{ token: string; user_id: string; role: string }>()
  if (!row) return json({ error: 'unauthorized' }, 401, origin)
  return { token: row.token, userId: row.user_id, role: row.role || 'founder' }
}

function canCreateInvite(role: string): boolean {
  return role === 'admin' || role === 'founder' || role === BOOTSTRAP_ROLE
}

function isAdminRole(role: string): boolean {
  return role === 'admin' || role === BOOTSTRAP_ROLE
}

async function resolveRefreshHandle(
  env: Env,
  userId: string,
  bodyHandle?: string,
): Promise<string | null> {
  if (bodyHandle && typeof bodyHandle === 'string') {
    const h = normalizeHandle(bodyHandle)
    if (h) return h
  }
  const fromState = await handlesFromUserState(env, userId)
  return fromState[0] ?? null
}

async function insertSnapshot(
  env: Env,
  profile: FetchedProfile,
  userId?: string | null,
): Promise<XSnapshot> {
  const id = eventId()
  const checkedAt = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO x_snapshots
      (id, handle, followers, following, posts_count, checked_at, source, raw_note, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      profile.handle,
      profile.followers,
      profile.following,
      profile.posts_count,
      checkedAt,
      profile.source,
      profile.raw_note,
      userId ?? null,
    )
    .run()
  return {
    id,
    handle: profile.handle,
    followers: profile.followers,
    following: profile.following,
    posts_count: profile.posts_count,
    checked_at: checkedAt,
    source: profile.source,
    raw_note: profile.raw_note,
  }
}

async function latestSnapshot(env: Env, handle: string): Promise<XSnapshot | null> {
  const row = await env.DB.prepare(
    `SELECT id, handle, followers, following, posts_count, checked_at, source, raw_note
     FROM x_snapshots
     WHERE handle = ?
     ORDER BY checked_at DESC
     LIMIT 1`,
  )
    .bind(handle)
    .first<XSnapshot>()
  return row ?? null
}

async function snapshotNear(
  env: Env,
  handle: string,
  daysAgo: number,
): Promise<XSnapshot | null> {
  const targetMs = Date.now() - daysAgo * 24 * 60 * 60 * 1000
  const targetIso = new Date(targetMs).toISOString()
  const before = await env.DB.prepare(
    `SELECT id, handle, followers, following, posts_count, checked_at, source, raw_note
     FROM x_snapshots
     WHERE handle = ? AND checked_at <= ?
     ORDER BY checked_at DESC
     LIMIT 1`,
  )
    .bind(handle, targetIso)
    .first<XSnapshot>()
  if (before) return before
  const after = await env.DB.prepare(
    `SELECT id, handle, followers, following, posts_count, checked_at, source, raw_note
     FROM x_snapshots
     WHERE handle = ? AND checked_at > ?
     ORDER BY checked_at ASC
     LIMIT 1`,
  )
    .bind(handle, targetIso)
    .first<XSnapshot>()
  return after ?? null
}

async function historySnapshots(
  env: Env,
  handle: string,
  days = 30,
  limit = 60,
): Promise<XSnapshot[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { results } = await env.DB.prepare(
    `SELECT id, handle, followers, following, posts_count, checked_at, source, raw_note
     FROM x_snapshots
     WHERE handle = ? AND checked_at >= ?
     ORDER BY checked_at ASC
     LIMIT ?`,
  )
    .bind(handle, since, limit)
    .all<XSnapshot>()
  return results ?? []
}

function deltaFrom(latest: XSnapshot | null, older: XSnapshot | null): number | null {
  if (!latest || !older) return null
  if (latest.id === older.id) return 0
  return latest.followers - older.followers
}

async function statsPayload(env: Env, handle: string) {
  const latest = await latestSnapshot(env, handle)
  const d7 = await snapshotNear(env, handle, 7)
  const d30 = await snapshotNear(env, handle, 30)
  const history = await historySnapshots(env, handle, 30, 60)
  return {
    handle,
    latest,
    delta7: deltaFrom(latest, d7),
    delta30: deltaFrom(latest, d30),
    weekStart: d7,
    monthStart: d30,
    history: history.map((h) => ({
      followers: h.followers,
      checked_at: h.checked_at,
      source: h.source,
    })),
  }
}

async function refreshHandle(
  env: Env,
  handleRaw: string,
  userId?: string | null,
): Promise<
  | { ok: true; profile: FetchedProfile; snapshot: XSnapshot }
  | { ok: false; error: string; latest: XSnapshot | null }
> {
  const handle = normalizeHandle(handleRaw)
  const fetched = await fetchPublicXProfile(handle)
  if ('error' in fetched) {
    const latest = await latestSnapshot(env, handle)
    return { ok: false, error: fetched.error, latest }
  }
  const snapshot = await insertSnapshot(env, fetched, userId)
  return { ok: true, profile: fetched, snapshot }
}

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const e = raw.trim().toLowerCase()
  if (!e || e.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null
  return e
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')
    const path = url.pathname.replace(/\/$/, '') || '/'

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    try {
      // Ensure bootstrap user + state migration exists before auth routes.
      if (
        path === '/api/login' ||
        path === '/api/signup' ||
        path === '/api/health' ||
        path.startsWith('/api/')
      ) {
        await ensureBootstrapUser(env)
      }

      if (path === '/api/login' && request.method === 'POST') {
        let body: { pass?: string; email?: string; password?: string }
        try {
          body = (await request.json()) as { pass?: string; email?: string; password?: string }
        } catch {
          return json({ error: 'invalid_json' }, 400, origin)
        }

        // Preferred: email + password
        const email = normalizeEmail(body.email)
        if (email && typeof body.password === 'string') {
          const user = await env.DB.prepare(
            'SELECT id, email, password_hash, display_name, role, created_at FROM users WHERE email = ?',
          )
            .bind(email)
            .first<UserRow>()
          if (!user || !(await verifyPassword(body.password, user.password_hash))) {
            return json({ error: 'invalid_credentials' }, 401, origin)
          }
          const token = await createSession(env, user.id)
          return json(
            {
              token,
              user: {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
                role: user.role,
              },
            },
            200,
            origin,
          )
        }

        // Legacy / early-access: passphrase → always Nicholas bootstrap user
        if (typeof body.pass === 'string' && body.pass) {
          const expected = getPass(env)
          if (!expected || body.pass !== expected) {
            return json({ error: 'invalid_pass' }, 401, origin)
          }
          const bootstrap = await ensureBootstrapUser(env)
          const token = await createSession(env, bootstrap.id)
          return json(
            {
              token,
              user: {
                id: bootstrap.id,
                email: bootstrap.email,
                displayName: bootstrap.display_name,
                role: bootstrap.role,
              },
              via: 'passphrase',
            },
            200,
            origin,
          )
        }

        return json({ error: 'credentials_required' }, 400, origin)
      }

      if (path === '/api/signup' && request.method === 'POST') {
        let body: {
          email?: string
          password?: string
          inviteCode?: string
          displayName?: string
        }
        try {
          body = (await request.json()) as {
            email?: string
            password?: string
            inviteCode?: string
            displayName?: string
          }
        } catch {
          return json({ error: 'invalid_json' }, 400, origin)
        }
        const email = normalizeEmail(body.email)
        const password = typeof body.password === 'string' ? body.password : ''
        const code =
          typeof body.inviteCode === 'string' ? body.inviteCode.trim().toUpperCase() : ''
        const displayName =
          typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 80) : ''
        if (!email) return json({ error: 'email_required' }, 400, origin)
        if (password.length < 8) return json({ error: 'password_too_short' }, 400, origin)
        if (!code) return json({ error: 'invite_required' }, 400, origin)

        const invite = await env.DB.prepare(
          'SELECT code, created_by, used_by, used_at, created_at FROM invites WHERE code = ?',
        )
          .bind(code)
          .first<{
            code: string
            created_by: string
            used_by: string | null
            used_at: string | null
            created_at: string
          }>()
        if (!invite) return json({ error: 'invalid_invite' }, 400, origin)
        if (invite.used_by || invite.used_at) {
          return json({ error: 'invite_used' }, 400, origin)
        }

        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
          .bind(email)
          .first<{ id: string }>()
        if (existing) return json({ error: 'email_taken' }, 409, origin)

        const id = randomId('user')
        const createdAt = new Date().toISOString()
        const passwordHash = await hashPassword(password)
        const name = displayName || email.split('@')[0]

        try {
          await env.DB.batch([
            env.DB.prepare(
              `INSERT INTO users (id, email, password_hash, display_name, role, created_at)
               VALUES (?, ?, ?, ?, 'founder', ?)`,
            ).bind(id, email, passwordHash, name, createdAt),
            env.DB.prepare(
              `UPDATE invites SET used_by = ?, used_at = ? WHERE code = ? AND used_by IS NULL`,
            ).bind(id, createdAt, code),
          ])
        } catch (err) {
          const message = err instanceof Error ? err.message : 'signup_failed'
          if (/UNIQUE|unique/i.test(message)) {
            return json({ error: 'email_taken' }, 409, origin)
          }
          throw err
        }

        // Confirm invite was claimed (race).
        const claimed = await env.DB.prepare(
          'SELECT used_by FROM invites WHERE code = ?',
        )
          .bind(code)
          .first<{ used_by: string | null }>()
        if (claimed?.used_by !== id) {
          await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
          return json({ error: 'invite_used' }, 400, origin)
        }

        const token = await createSession(env, id)
        return json(
          {
            token,
            user: { id, email, displayName: name, role: 'founder' },
          },
          200,
          origin,
        )
      }

      if (path === '/api/invites' && request.method === 'POST') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        if (!canCreateInvite(auth.role)) {
          return json({ error: 'forbidden' }, 403, origin)
        }
        const code = inviteCode()
        const createdAt = new Date().toISOString()
        await env.DB.prepare(
          `INSERT INTO invites (code, created_by, used_by, used_at, created_at)
           VALUES (?, ?, NULL, NULL, ?)`,
        )
          .bind(code, auth.userId, createdAt)
          .run()
        return json({ code, createdAt }, 200, origin)
      }

      if (path === '/api/me' && request.method === 'GET') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        const user = await env.DB.prepare(
          'SELECT id, email, display_name, role, created_at FROM users WHERE id = ?',
        )
          .bind(auth.userId)
          .first<{
            id: string
            email: string
            display_name: string | null
            role: string
            created_at: string
          }>()
        if (!user) return json({ error: 'unauthorized' }, 401, origin)
        return json(
          {
            user: {
              id: user.id,
              email: user.email,
              displayName: user.display_name,
              role: user.role,
              createdAt: user.created_at,
            },
          },
          200,
          origin,
        )
      }

      if (path === '/api/state' && request.method === 'GET') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        const key = stateKeyForUser(auth.userId)
        const row = await env.DB.prepare(
          'SELECT value, updated_at FROM kv_state WHERE key = ?',
        )
          .bind(key)
          .first<{ value: string; updated_at: string }>()
        if (!row) {
          return json({ state: null, updatedAt: null }, 200, origin)
        }
        let state: unknown = null
        try {
          state = JSON.parse(row.value)
        } catch {
          state = null
        }
        return json({ state, updatedAt: row.updated_at }, 200, origin)
      }

      if (path === '/api/state' && request.method === 'PUT') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        let body: { state?: unknown }
        try {
          body = (await request.json()) as { state?: unknown }
        } catch {
          return json({ error: 'invalid_json' }, 400, origin)
        }
        if (body.state === undefined || body.state === null || typeof body.state !== 'object') {
          return json({ error: 'state_required' }, 400, origin)
        }
        const value = JSON.stringify(body.state)
        const updatedAt = new Date().toISOString()
        const key = stateKeyForUser(auth.userId)
        await env.DB.prepare(
          `INSERT INTO kv_state (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        )
          .bind(key, value, updatedAt)
          .run()
        return json({ ok: true, updatedAt }, 200, origin)
      }

      if (path === '/api/events' && request.method === 'POST') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        let body: { name?: unknown; props?: unknown }
        try {
          body = (await request.json()) as { name?: unknown; props?: unknown }
        } catch {
          return json({ error: 'invalid_json' }, 400, origin)
        }
        const name = typeof body.name === 'string' ? body.name.trim() : ''
        if (!name || !ALLOWED_EVENTS.has(name)) {
          return json({ error: 'event_not_allowed' }, 400, origin)
        }
        const props = sanitizeProps(body.props)
        const id = eventId()
        const createdAt = new Date().toISOString()
        await env.DB.prepare(
          `INSERT INTO events (id, session_token, name, props, created_at, user_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
          .bind(id, auth.token, name, JSON.stringify(props), createdAt, auth.userId)
          .run()
        return json({ ok: true, id }, 200, origin)
      }

      if (path === '/api/events/summary' && request.method === 'GET') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { results } = await env.DB.prepare(
          `SELECT name, COUNT(*) AS count
           FROM events
           WHERE created_at >= ? AND (user_id = ? OR (user_id IS NULL AND session_token = ?))
           GROUP BY name
           ORDER BY count DESC`,
        )
          .bind(since, auth.userId, auth.token)
          .all<{ name: string; count: number }>()
        const counts: Record<string, number> = {}
        for (const row of results ?? []) {
          counts[row.name] = Number(row.count) || 0
        }
        return json({ since, counts }, 200, origin)
      }

      if (path === '/api/x/oauth/start' && request.method === 'GET') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        return handleOAuthStart(env, auth.userId, (data, status = 200) => json(data, status, origin))
      }

      if (path === '/api/x/oauth/callback' && request.method === 'GET') {
        return handleOAuthCallback(env, request)
      }

      if (path === '/api/x/connection' && request.method === 'GET') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        return handleConnectionGet(env, auth.userId, (data, status = 200) => json(data, status, origin))
      }

      if (path === '/api/x/connection' && request.method === 'DELETE') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        return handleConnectionDelete(env, auth.userId, (data, status = 200) => json(data, status, origin))
      }

      if (path === '/api/x/post' && request.method === 'POST') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        let body: { text?: unknown; replyToId?: unknown } = {}
        try {
          body = (await request.json()) as { text?: unknown; replyToId?: unknown }
        } catch {
          return json({ error: 'invalid_json' }, 400, origin)
        }
        return handleXPost(env, auth.userId, body, (data, status = 200) => json(data, status, origin))
      }

      if (path === '/api/x/refresh' && request.method === 'POST') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        let body: { handle?: string } = {}
        try {
          const text = await request.text()
          if (text) body = JSON.parse(text) as { handle?: string }
        } catch {
          return json({ error: 'invalid_json' }, 400, origin)
        }
        const handle = await resolveRefreshHandle(env, auth.userId, body.handle)
        if (!handle) {
          return json({ error: 'handle_required' }, 400, origin)
        }
        const result = await refreshHandle(env, handle, auth.userId)
        const stats = await statsPayload(env, handle)
        if (!result.ok) {
          return json(
            {
              ok: false,
              error: result.error,
              message:
                'Could not fetch public X profile. Last good snapshot kept if available.',
              ...stats,
            },
            502,
            origin,
          )
        }
        return json({ ok: true, source: result.profile.source, ...stats }, 200, origin)
      }

      if (path === '/api/x/stats' && request.method === 'GET') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        let handle = normalizeHandle(url.searchParams.get('handle') || '')
        if (!handle) {
          handle = (await resolveRefreshHandle(env, auth.userId)) || ''
        }
        if (!handle) {
          return json({ error: 'handle_required' }, 400, origin)
        }
        const stats = await statsPayload(env, handle)
        return json({ ok: true, ...stats }, 200, origin)
      }

      if (path === '/api/x/probe' && request.method === 'GET') {
        const handle = normalizeHandle(url.searchParams.get('handle') || 'dreamandbuildit')
        const fetched = await fetchPublicXProfile(handle)
        if ('error' in fetched) {
          return json({ ok: false, handle, error: fetched.error }, 502, origin)
        }
        return json(
          {
            ok: true,
            handle: fetched.handle,
            followers: fetched.followers,
            following: fetched.following,
            posts_count: fetched.posts_count,
            source: fetched.source,
          },
          200,
          origin,
        )
      }

      if (path === '/api/waitlist' && request.method === 'POST') {
        if (!allowWaitlistHit(clientIp(request))) {
          return json({ error: 'rate_limited' }, 429, origin)
        }
        let body: { email?: unknown; source?: unknown }
        try {
          body = (await request.json()) as { email?: unknown; source?: unknown }
        } catch {
          return json({ error: 'invalid_json' }, 400, origin)
        }
        const email = normalizeEmail(body.email)
        if (!email) return json({ error: 'email_required' }, 400, origin)
        const sourceRaw = typeof body.source === 'string' ? body.source.trim().slice(0, 80) : ''
        const source = sourceRaw || 'marketing'
        const ua = (request.headers.get('User-Agent') || '').slice(0, 300) || null
        const id = randomId('wl')
        const createdAt = new Date().toISOString()
        try {
          await env.DB.prepare(
            `INSERT INTO waitlist (id, email, source, created_at, user_agent)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(email) DO NOTHING`,
          )
            .bind(id, email, source, createdAt, ua)
            .run()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'waitlist_failed'
          // Unique races / missing table should not leak existence.
          if (!/UNIQUE|unique/i.test(message)) throw err
        }
        // Always ok — do not reveal whether the email already existed.
        return json({ ok: true }, 200, origin)
      }

      if (path === '/api/waitlist' && request.method === 'GET') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        if (!isAdminRole(auth.role)) {
          return json({ error: 'forbidden' }, 403, origin)
        }
        const { results } = await env.DB.prepare(
          `SELECT email, source, created_at
           FROM waitlist
           ORDER BY created_at DESC`,
        ).all<{ email: string; source: string | null; created_at: string }>()
        const emails = (results ?? []).map((r) => ({
          email: r.email,
          source: r.source || 'marketing',
          created_at: r.created_at,
        }))
        return json({ emails, count: emails.length }, 200, origin)
      }

      if (path === '/api/waitlist/count' && request.method === 'GET') {
        const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM waitlist').first<{
          count: number
        }>()
        return json({ ok: true, count: Number(row?.count) || 0 }, 200, origin)
      }

      if (path === '/api/drafts/generate' && request.method === 'POST') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        let body: {
          journal?: GenerateJournal
          project?: GenerateProject
          shipped?: string
          numbers?: string
          blockerLesson?: string
          link?: string
          date?: string
          projectId?: string
          building?: string
          who?: string
          goal?: string
          voice?: string
          url?: string
          name?: string
        }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'invalid_json' }, 400, origin)
        }

        const journal: GenerateJournal = {
          shipped: body.journal?.shipped ?? body.shipped,
          numbers: body.journal?.numbers ?? body.numbers,
          blockerLesson: body.journal?.blockerLesson ?? body.blockerLesson,
          link: body.journal?.link ?? body.link,
          date: body.journal?.date ?? body.date,
          projectId: body.journal?.projectId ?? body.projectId,
        }
        const project: GenerateProject = {
          id: body.project?.id ?? body.projectId,
          name: body.project?.name ?? body.name,
          building: body.project?.building ?? body.building,
          who: body.project?.who ?? body.who,
          goal: body.project?.goal ?? body.goal,
          voice: body.project?.voice ?? body.voice,
          url: body.project?.url ?? body.url,
        }

        if (!String(journal.shipped || '').trim() && !String(journal.numbers || '').trim()) {
          return json({ error: 'journal_required' }, 400, origin)
        }

        const result = await generateDrafts(env.AI, journal, project)
        return json(
          {
            drafts: result.drafts,
            source: result.source,
            model: result.model ?? null,
          },
          200,
          origin,
        )
      }



      if (path === '/api/builders/preview' && request.method === 'GET') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        const raw = url.searchParams.get('handle') || url.searchParams.get('handles') || ''
        const handles = capProfileHandles(raw)
        if (handles.length === 0) {
          const one = validHandle(raw)
          if (!one) return json({ error: 'handle_required', posts: [] }, 400, origin)
          handles.push(one)
        }
        const limited = handles.slice(0, 8)
        const previews = await Promise.all(
          limited.map(async (handle) => {
            const tweets = await getHandleTweets(env.DB, handle)
            return { handle, posts: tweetsToPreview(tweets) }
          }),
        )
        if (previews.length === 1) {
          return json({ handle: previews[0].handle, posts: previews[0].posts }, 200, origin)
        }
        return json({ previews }, 200, origin)
      }

      if (path === '/api/builders/profiles' && request.method === 'GET') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        const handles = capProfileHandles(url.searchParams.get('handles') || '')
        const profiles = await getBuilderProfiles(env.DB, handles)
        return json({ profiles }, 200, origin)
      }

      if (path === '/api/radar/replies' && request.method === 'POST') {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        let body: { text?: unknown; voice?: unknown; handle?: unknown; avoid?: unknown } = {}
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'invalid_json' }, 400, origin)
        }
        const text = typeof body.text === 'string' ? body.text.trim() : ''
        if (!text) return json({ error: 'text_required' }, 400, origin)
        const voice = typeof body.voice === 'string' ? body.voice : ''
        const handle = typeof body.handle === 'string' ? body.handle : ''
        const avoid = Array.isArray(body.avoid)
          ? body.avoid.filter((x): x is string => typeof x === 'string')
          : []
        const result = await generateMoreReplies(env.AI, { text, voice, handle, avoid })
        return json({ replies: result.replies, source: result.source }, 200, origin)
      }

      if ((path === '/api/radar') && (request.method === 'GET' || request.method === 'POST')) {
        const auth = await requireAuth(request, env)
        if (auth instanceof Response) return auth
        let body: {
          handles?: unknown
          voice?: unknown
          force?: unknown
          fast?: unknown
          project?: { voice?: unknown }
        } = {}
        if (request.method === 'POST') {
          try {
            const text = await request.text()
            if (text) body = JSON.parse(text) as typeof body
          } catch {
            return json({ error: 'invalid_json' }, 400, origin)
          }
        }
        let handles = capHandles(body.handles)
        if (handles.length === 0) {
          handles = capHandles(url.searchParams.get('handles') || '')
        }
        if (handles.length === 0) {
          const row = await env.DB.prepare('SELECT value FROM kv_state WHERE key = ?')
            .bind(stateKeyForUser(auth.userId))
            .first<{ value: string }>()
          handles = favoriteHandlesFromState(row?.value)
        }
        const voiceRaw =
          (typeof body.voice === 'string' && body.voice) ||
          (typeof body.project?.voice === 'string' && body.project.voice) ||
          url.searchParams.get('voice') ||
          ''
        const force =
          body.force === true ||
          body.force === '1' ||
          url.searchParams.get('force') === '1' ||
          url.searchParams.get('force') === 'true'
        const fastParam = body.fast ?? url.searchParams.get('fast')
        const fast =
          fastParam === true ||
          fastParam === '1' ||
          fastParam === 'true' ||
          (request.method === 'GET' && fastParam !== '0' && fastParam !== 'false' && !force)
        const result = await buildRadar(env, handles, String(voiceRaw), Boolean(force), { fast })
        return json(
          {
            items: result.items,
            stale: result.stale,
            error: result.error,
            toneVersion: result.toneVersion,
            pendingHandles: result.pendingHandles,
            cached: result.cached,
          },
          200,
          origin,
        )
      }

      if (path === '/api/health' && request.method === 'GET') {
        return json({ ok: true, service: 'shiploud-api', multiUser: true }, 200, origin)
      }

      return json({ error: 'not_found' }, 404, origin)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'server_error'
      return json({ error: 'server_error', message }, 500, origin)
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        await ensureBootstrapUser(env)
        let handles = await handlesFromAllUserStates(env)
        if (handles.length === 0) handles = ['dreamandbuildit']
        for (const h of handles) {
          try {
            await refreshHandle(env, h, null)
          } catch {
            /* keep going */
          }
        }
      })(),
    )
  },
}
