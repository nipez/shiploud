/** Official X API — writes only (OAuth 2.0 PKCE + POST /2/tweets).
 *  Radar and follower snapshots stay on public fxtwitter fetches.
 *
 *  Tokens live in D1 `x_connections`. If TOKEN_WRAP_SECRET is set they are
 *  AES-GCM encrypted; otherwise they are stored as-is.
 *  Worker secret encryption is next if that wrapping secret is absent.
 */

import { xLength, X_LIMIT } from './drafts'
export { X_LIMIT }

export const X_AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize'
export const X_TOKEN_URL = 'https://api.x.com/2/oauth2/token'
export const X_TWEETS_URL = 'https://api.x.com/2/tweets'
export const X_ME_URL = 'https://api.x.com/2/users/me'
export const X_SCOPES = 'tweet.write tweet.read users.read offline.access'
export const DEFAULT_OAUTH_REDIRECT =
  'https://shiploud-api.nickperez.workers.dev/api/x/oauth/callback'
export const DEFAULT_APP_ORIGIN = 'https://app.getshiploud.com'
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000
export const ACCESS_SKEW_MS = 60 * 1000

export type XAuthEnv = {
  DB: D1Database
  X_CLIENT_ID?: string
  X_CLIENT_SECRET?: string
  X_OAUTH_REDIRECT?: string
  TOKEN_WRAP_SECRET?: string
}

export type JsonFn = (data: unknown, status?: number) => Response

type ConnRow = {
  user_id: string
  handle: string
  x_user_id: string
  access_token: string
  refresh_token: string | null
  expires_at: string
  connected_at: string
}

export function xPostingConfigured(env: XAuthEnv): boolean {
  return Boolean((env.X_CLIENT_ID || '').trim() && (env.X_CLIENT_SECRET || '').trim())
}

export function oauthRedirectUri(env: XAuthEnv): string {
  const v = (env.X_OAUTH_REDIRECT || '').trim()
  return v || DEFAULT_OAUTH_REDIRECT
}

export function wrapSecret(env: XAuthEnv): string | null {
  const v = (env.TOKEN_WRAP_SECRET || '').trim()
  return v || null
}

function base64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function randomVerifier(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

export function randomState(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

export async function challengeS256(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(hash)
}

export function buildAuthorizeUrl(opts: {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
}): string {
  const q = [
    'response_type=code',
    `client_id=${encodeURIComponent(opts.clientId)}`,
    `redirect_uri=${encodeURIComponent(opts.redirectUri)}`,
    `scope=${encodeURIComponent(X_SCOPES)}`,
    `state=${encodeURIComponent(opts.state)}`,
    `code_challenge=${encodeURIComponent(opts.codeChallenge)}`,
    'code_challenge_method=S256',
  ].join('&')
  return `${X_AUTHORIZE_URL}?${q}`
}

async function aesKey(secret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/** Prefix `enc:v1:` so plaintext rows from before wrapping still decrypt as-is. */
export async function encryptSecret(plain: string, secret: string): Promise<string> {
  const key = await aesKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain))
  return `enc:v1:${base64Url(iv)}:${base64Url(ct)}`
}

export async function decryptSecret(stored: string, secret: string | null): Promise<string> {
  if (!stored.startsWith('enc:v1:')) return stored
  if (!secret) throw new Error('wrap_secret_missing')
  const parts = stored.split(':')
  if (parts.length !== 4) throw new Error('bad_wrapped_token')
  const iv = base64UrlToBytes(parts[2])
  const ct = base64UrlToBytes(parts[3])
  const key = await aesKey(secret)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(pt)
}

async function seal(value: string, secret: string | null): Promise<string> {
  if (!secret) return value
  return encryptSecret(value, secret)
}

async function open(value: string, secret: string | null): Promise<string> {
  return decryptSecret(value, secret)
}

function basicAuth(clientId: string, clientSecret: string): string {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`
}

function appRedirect(ok: boolean, reason?: string): string {
  if (ok) return `${DEFAULT_APP_ORIGIN}/?x=connected`
  const r = (reason || 'oauth_failed').replace(/[^a-z0-9_.-]/gi, '_').slice(0, 80)
  return `${DEFAULT_APP_ORIGIN}/?x=error&reason=${encodeURIComponent(r)}`
}

function redirectToApp(ok: boolean, reason?: string): Response {
  return Response.redirect(appRedirect(ok, reason), 302)
}

async function recordEvent(
  env: XAuthEnv,
  userId: string,
  name: 'x_connected' | 'x_posted' | 'x_replied',
  props: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const id = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  const createdAt = new Date().toISOString()
  try {
    await env.DB.prepare(
      `INSERT INTO events (id, session_token, name, props, created_at, user_id)
       VALUES (?, NULL, ?, ?, ?, ?)`,
    )
      .bind(id, name, JSON.stringify(props), createdAt, userId)
      .run()
  } catch {
    /* analytics must never fail the request */
  }
}

type TokenPayload = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}

async function exchangeToken(
  env: XAuthEnv,
  body: URLSearchParams,
): Promise<TokenPayload> {
  const clientId = (env.X_CLIENT_ID || '').trim()
  const clientSecret = (env.X_CLIENT_SECRET || '').trim()
  const res = await fetch(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuth(clientId, clientSecret),
    },
    body,
  })
  const data = (await res.json().catch(() => ({}))) as TokenPayload
  if (!res.ok || !data.access_token) {
    const err = data.error_description || data.error || `token_http_${res.status}`
    throw new Error(String(err))
  }
  return data
}

async function fetchXMe(
  accessToken: string,
): Promise<{ id: string; username: string } | null> {
  try {
    const res = await fetch(`${X_ME_URL}?user.fields=username`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      data?: { id?: string; username?: string }
    }
    const id = data.data?.id
    const username = data.data?.username
    if (!id || !username) return null
    return { id, username: username.replace(/^@+/, '') }
  } catch {
    return null
  }
}

async function upsertConnection(
  env: XAuthEnv,
  userId: string,
  row: {
    handle: string
    xUserId: string
    accessToken: string
    refreshToken: string | null
    expiresAt: string
    connectedAt?: string
  },
): Promise<void> {
  const secret = wrapSecret(env)
  const access = await seal(row.accessToken, secret)
  const refresh = row.refreshToken ? await seal(row.refreshToken, secret) : null
  const connectedAt = row.connectedAt || new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO x_connections
      (user_id, handle, x_user_id, access_token, refresh_token, expires_at, connected_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       handle = excluded.handle,
       x_user_id = excluded.x_user_id,
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at,
       connected_at = excluded.connected_at`,
  )
    .bind(userId, row.handle, row.xUserId, access, refresh, row.expiresAt, connectedAt)
    .run()
}

async function loadConnection(env: XAuthEnv, userId: string): Promise<ConnRow | null> {
  const row = await env.DB.prepare(
    `SELECT user_id, handle, x_user_id, access_token, refresh_token, expires_at, connected_at
     FROM x_connections WHERE user_id = ?`,
  )
    .bind(userId)
    .first<ConnRow>()
  return row ?? null
}

function expiresAtFrom(expiresIn: number | undefined): string {
  const sec = Number.isFinite(expiresIn) && (expiresIn as number) > 0 ? (expiresIn as number) : 7200
  return new Date(Date.now() + sec * 1000).toISOString()
}

async function refreshAccess(
  env: XAuthEnv,
  userId: string,
  row: ConnRow,
): Promise<ConnRow> {
  const secret = wrapSecret(env)
  const refreshToken = row.refresh_token ? await open(row.refresh_token, secret) : ''
  if (!refreshToken) throw new Error('not_connected')
  const clientId = (env.X_CLIENT_ID || '').trim()
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  })
  const tokens = await exchangeToken(env, body)
  const nextRefresh = tokens.refresh_token || refreshToken
  const expiresAt = expiresAtFrom(tokens.expires_in)
  await upsertConnection(env, userId, {
    handle: row.handle,
    xUserId: row.x_user_id,
    accessToken: tokens.access_token as string,
    refreshToken: nextRefresh,
    expiresAt,
    connectedAt: row.connected_at,
  })
  return {
    ...row,
    access_token: await seal(tokens.access_token as string, secret),
    refresh_token: nextRefresh ? await seal(nextRefresh, secret) : null,
    expires_at: expiresAt,
  }
}

async function accessTokenForPost(env: XAuthEnv, userId: string): Promise<ConnRow> {
  const row = await loadConnection(env, userId)
  if (!row) throw new Error('not_connected')
  const exp = Date.parse(row.expires_at)
  const expired = !Number.isFinite(exp) || exp - ACCESS_SKEW_MS <= Date.now()
  if (!expired) return row
  try {
    return await refreshAccess(env, userId, row)
  } catch {
    throw new Error('not_connected')
  }
}

export async function handleOAuthStart(
  env: XAuthEnv,
  userId: string,
  json: JsonFn,
): Promise<Response> {
  if (!xPostingConfigured(env)) {
    return json(
      { error: 'x_not_configured', message: 'X posting not configured' },
      503,
    )
  }
  const clientId = (env.X_CLIENT_ID || '').trim()
  const redirectUri = oauthRedirectUri(env)
  const state = randomState()
  const verifier = randomVerifier()
  const challenge = await challengeS256(verifier)
  const createdAt = new Date().toISOString()
  const cutoff = new Date(Date.now() - OAUTH_STATE_TTL_MS).toISOString()
  await env.DB.prepare('DELETE FROM x_oauth_states WHERE created_at < ?').bind(cutoff).run()
  await env.DB.prepare(
    `INSERT INTO x_oauth_states (state, user_id, code_verifier, created_at)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(state, userId, verifier, createdAt)
    .run()
  const url = buildAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge: challenge,
  })
  return json({ url }, 200)
}

export async function handleOAuthCallback(env: XAuthEnv, request: Request): Promise<Response> {
  const url = new URL(request.url)
  const err = url.searchParams.get('error')
  if (err) return redirectToApp(false, err)
  const code = url.searchParams.get('code') || ''
  const state = url.searchParams.get('state') || ''
  if (!code || !state) return redirectToApp(false, 'missing_code')
  if (!xPostingConfigured(env)) return redirectToApp(false, 'x_not_configured')

  const row = await env.DB.prepare(
    `SELECT state, user_id, code_verifier, created_at FROM x_oauth_states WHERE state = ?`,
  )
    .bind(state)
    .first<{ state: string; user_id: string; code_verifier: string; created_at: string }>()
  await env.DB.prepare('DELETE FROM x_oauth_states WHERE state = ?').bind(state).run()
  if (!row) return redirectToApp(false, 'invalid_state')
  const age = Date.now() - Date.parse(row.created_at)
  if (!Number.isFinite(age) || age > OAUTH_STATE_TTL_MS) {
    return redirectToApp(false, 'state_expired')
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: oauthRedirectUri(env),
      code_verifier: row.code_verifier,
      client_id: (env.X_CLIENT_ID || '').trim(),
    })
    const tokens = await exchangeToken(env, body)
    const me = await fetchXMe(tokens.access_token as string)
    if (!me) return redirectToApp(false, 'user_lookup_failed')
    const expiresAt = expiresAtFrom(tokens.expires_in)
    await upsertConnection(env, row.user_id, {
      handle: me.username,
      xUserId: me.id,
      accessToken: tokens.access_token as string,
      refreshToken: tokens.refresh_token || null,
      expiresAt,
    })
    await recordEvent(env, row.user_id, 'x_connected', { handle: me.username })
    return redirectToApp(true)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'oauth_failed'
    return redirectToApp(false, message)
  }
}

export async function handleConnectionGet(
  env: XAuthEnv,
  userId: string,
  json: JsonFn,
): Promise<Response> {
  const configured = xPostingConfigured(env)
  const row = await loadConnection(env, userId)
  if (!row) {
    return json({ connected: false, handle: null, configured }, 200)
  }
  return json({ connected: true, handle: row.handle, configured }, 200)
}

export async function handleConnectionDelete(
  env: XAuthEnv,
  userId: string,
  json: JsonFn,
): Promise<Response> {
  await env.DB.prepare('DELETE FROM x_connections WHERE user_id = ?').bind(userId).run()
  await env.DB.prepare('DELETE FROM x_oauth_states WHERE user_id = ?').bind(userId).run()
  return json({ ok: true, connected: false, handle: null }, 200)
}

export async function handleXPost(
  env: XAuthEnv,
  userId: string,
  body: { text?: unknown; replyToId?: unknown },
  json: JsonFn,
): Promise<Response> {
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) return json({ error: 'text_required' }, 400)
  if (xLength(text) > X_LIMIT) {
    return json({ error: 'too_long', message: `Post must be ${X_LIMIT} characters or fewer.` }, 400)
  }

  const replyRaw = typeof body.replyToId === 'string' ? body.replyToId.trim() : ''
  const replyToId = replyRaw && /^\d{5,32}$/.test(replyRaw) ? replyRaw : ''
  if (replyRaw && !replyToId) {
    return json({ error: 'invalid_reply_to', message: 'replyToId must be a tweet id.' }, 400)
  }

  let row: ConnRow
  try {
    row = await accessTokenForPost(env, userId)
  } catch {
    return json({ error: 'not_connected', message: 'Connect X to post from here.' }, 401)
  }

  const secret = wrapSecret(env)
  let token: string
  try {
    token = await open(row.access_token, secret)
  } catch {
    return json({ error: 'not_connected', message: 'Connect X to post from here.' }, 401)
  }

  const postOnce = async (access: string): Promise<Response> => {
    const res = await fetch(X_TWEETS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        replyToId
          ? { text, reply: { in_reply_to_tweet_id: replyToId } }
          : { text },
      ),
    })
    const data = (await res.json().catch(() => ({}))) as {
      data?: { id?: string; text?: string }
      title?: string
      detail?: string
      errors?: Array<{ message?: string }>
    }
    if (res.status === 401) return json({ error: 'x_unauthorized' }, 401)
    if (!res.ok || !data.data?.id) {
      const msg =
        data.detail ||
        data.title ||
        data.errors?.[0]?.message ||
        `x_post_failed_${res.status}`
      return json({ error: 'x_post_failed', message: String(msg) }, res.status === 403 ? 403 : 502)
    }
    const id = data.data.id
    const handle = row.handle.replace(/^@+/, '')
    const tweetUrl = handle
      ? `https://x.com/${encodeURIComponent(handle)}/status/${id}`
      : `https://x.com/i/web/status/${id}`
    await recordEvent(env, userId, replyToId ? 'x_replied' : 'x_posted', {
      id,
      handle,
      ...(replyToId ? { replyToId } : {}),
    })
    return json({ id, url: tweetUrl }, 200)
  }

  let result = await postOnce(token)
  if (result.status === 401) {
    try {
      const refreshed = await refreshAccess(env, userId, row)
      token = await open(refreshed.access_token, secret)
      result = await postOnce(token)
    } catch {
      return json({ error: 'not_connected', message: 'Connect X to post from here.' }, 401)
    }
  }
  if (result.status === 401) {
    return json({ error: 'not_connected', message: 'Connect X to post from here.' }, 401)
  }
  return result
}
