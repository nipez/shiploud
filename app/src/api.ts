import type { AppData } from './types'
import { didMigrateSetup, normalizeAppData } from './storage'

const TOKEN_KEY = 'shiploud-dogfood-token'

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ''

export type SyncStatus = 'idle' | 'loading' | 'synced' | 'saving' | 'offline' | 'error'

export type AuthUser = {
  id: string
  email: string
  displayName: string | null
  role: string
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function hasApi(): boolean {
  return Boolean(API_URL)
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin'
}

async function apiFetch(path: string, init: RequestInit = {}, token?: string | null): Promise<Response> {
  if (!API_URL) throw new Error('VITE_API_URL not configured')
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  const t = token === undefined ? getToken() : token
  if (t) headers.set('Authorization', `Bearer ${t}`)
  return fetch(`${API_URL}${path}`, { ...init, headers })
}

export async function loginWithPassphrase(pass: string): Promise<string> {
  const res = await apiFetch(
    '/api/login',
    {
      method: 'POST',
      body: JSON.stringify({ pass }),
    },
    null,
  )
  const data = (await res.json().catch(() => ({}))) as {
    token?: string
    error?: string
    user?: AuthUser
  }
  if (!res.ok || !data.token) throw new Error(data.error || 'login_failed')
  setToken(data.token)
  return data.token
}

/** @deprecated use loginWithPassphrase */
export async function login(pass: string): Promise<string> {
  return loginWithPassphrase(pass)
}

export async function loginWithEmail(email: string, password: string): Promise<string> {
  const res = await apiFetch(
    '/api/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    null,
  )
  const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string }
  if (!res.ok || !data.token) throw new Error(data.error || 'login_failed')
  setToken(data.token)
  return data.token
}

export async function signup(input: {
  email: string
  password: string
  inviteCode: string
  displayName?: string
}): Promise<string> {
  const res = await apiFetch(
    '/api/signup',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    null,
  )
  const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string }
  if (!res.ok || !data.token) throw new Error(data.error || 'signup_failed')
  setToken(data.token)
  return data.token
}

export async function fetchMe(token?: string | null): Promise<AuthUser | null> {
  try {
    if (!API_URL) return null
    const res = await apiFetch('/api/me', { method: 'GET' }, token)
    if (res.status === 401) {
      clearToken()
      return null
    }
    if (!res.ok) return null
    const data = (await res.json()) as { user?: AuthUser }
    return data.user ?? null
  } catch {
    return null
  }
}

export async function createInvite(): Promise<string> {
  const res = await apiFetch('/api/invites', { method: 'POST' })
  const data = (await res.json().catch(() => ({}))) as { code?: string; error?: string }
  if (res.status === 401) {
    clearToken()
    throw new Error('unauthorized')
  }
  if (!res.ok || !data.code) throw new Error(data.error || 'invite_failed')
  return data.code
}

export type FetchStateResult = {
  data: AppData | null
  /** True when older cloud blob needed setup / per-project migration. */
  migratedSetup: boolean
}

export async function fetchState(token?: string | null): Promise<FetchStateResult> {
  const res = await apiFetch('/api/state', { method: 'GET' }, token)
  if (res.status === 401) {
    clearToken()
    throw new Error('unauthorized')
  }
  if (!res.ok) throw new Error('fetch_failed')
  const data = (await res.json()) as { state?: unknown }
  const raw = data.state
  const migratedSetup = didMigrateSetup(raw)
  return { data: normalizeAppData(raw), migratedSetup }
}

export async function putState(state: AppData, token?: string | null): Promise<void> {
  const res = await apiFetch(
    '/api/state',
    { method: 'PUT', body: JSON.stringify({ state }) },
    token,
  )
  if (res.status === 401) {
    clearToken()
    throw new Error('unauthorized')
  }
  if (!res.ok) throw new Error('put_failed')
}

export type EventsSummary = {
  since: string
  counts: Record<string, number>
}

/** Auth summary for Weekly receipts. Returns null on any failure. */
export async function fetchEventsSummary(): Promise<EventsSummary | null> {
  try {
    if (!API_URL || !getToken()) return null
    const res = await apiFetch('/api/events/summary', { method: 'GET' })
    if (!res.ok) return null
    const data = (await res.json()) as EventsSummary
    if (!data || typeof data !== 'object' || !data.counts) return null
    return data
  } catch {
    return null
  }
}

export type XSnapshotLite = {
  followers: number
  checked_at: string
  source: string
}

export type XStatsResponse = {
  ok: boolean
  handle: string
  latest: {
    id: string
    handle: string
    followers: number
    following: number | null
    posts_count: number | null
    checked_at: string
    source: string
    raw_note: string | null
  } | null
  delta7: number | null
  delta30: number | null
  weekStart: { followers: number; checked_at: string } | null
  monthStart: { followers: number; checked_at: string } | null
  history: XSnapshotLite[]
  source?: string
  error?: string
  message?: string
}

export async function fetchXStats(handle?: string): Promise<XStatsResponse | null> {
  try {
    if (!API_URL || !getToken()) return null
    const q = handle ? `?handle=${encodeURIComponent(handle.replace(/^@+/, ''))}` : ''
    const res = await apiFetch(`/api/x/stats${q}`, { method: 'GET' })
    if (res.status === 401) {
      clearToken()
      return null
    }
    if (!res.ok) return null
    return (await res.json()) as XStatsResponse
  } catch {
    return null
  }
}

export async function refreshXStats(handle?: string): Promise<XStatsResponse> {
  if (!API_URL) throw new Error('VITE_API_URL not configured')
  const res = await apiFetch('/api/x/refresh', {
    method: 'POST',
    body: JSON.stringify(handle ? { handle: handle.replace(/^@+/, '') } : {}),
  })
  const data = (await res.json().catch(() => ({}))) as XStatsResponse
  if (res.status === 401) {
    clearToken()
    throw new Error('unauthorized')
  }
  if (!res.ok && !data.latest) {
    throw new Error(data.error || data.message || 'refresh_failed')
  }
  return data
}


export type RemoteDraftSource = 'ai' | 'template'

export type GenerateDraftsResponse = {
  drafts: Array<{ text: string }>
  source: RemoteDraftSource
  model?: string | null
}

/** Auth-required AI/template draft generation on the Worker. */
export async function generateDraftsRemote(input: {
  journal: {
    shipped: string
    numbers: string
    blockerLesson: string
    link: string
    date?: string
    projectId?: string
  }
  project: {
    id?: string
    name?: string
    building?: string
    who?: string
    goal?: string
    voice?: string
    url?: string
  }
}): Promise<GenerateDraftsResponse> {
  if (!API_URL) throw new Error('VITE_API_URL not configured')
  const res = await apiFetch('/api/drafts/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  const data = (await res.json().catch(() => ({}))) as GenerateDraftsResponse & {
    error?: string
  }
  if (res.status === 401) {
    clearToken()
    throw new Error('unauthorized')
  }
  if (!res.ok || !Array.isArray(data.drafts)) {
    throw new Error(data.error || 'generate_failed')
  }
  return {
    drafts: data.drafts,
    source: data.source === 'ai' ? 'ai' : 'template',
    model: data.model ?? null,
  }
}


export type RadarMedia = {
  type: 'photo' | 'video' | 'gif'
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
}

export type RadarItem = {
  handle: string
  tweetId: string
  text: string
  url: string
  createdAt: string
  suggestedReply: string
  suggestedReplies: string[]
  displayName: string
  avatarUrl: string
  media: RadarMedia[]
  likes: number | null
  reposts: number | null
  replies: number | null
}

function dropThisLanded(text: string): string {
  if (!/\bthis landed\b/i.test(text)) return text
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((p) => p.trim() && !/\bthis landed\b/i.test(p))
    .join(' ')
    .trim()
}

/** Em dash, en dash, or ` - ` clause break → period. Word hyphens (set-up) stay. */
export function stripClauseDashes(text: string): string {
  let t = text.replace(/\s*[—–]\s*/g, '. ').replace(/\s+-\s+/g, '. ')
  t = t.replace(/([.!?])\s+([a-z])/g, (_m, p: string, c: string) => `${p} ${c.toUpperCase()}`)
  t = t.replace(/\s+\./g, '.').replace(/\.{2,}/g, '.').replace(/\s{2,}/g, ' ').trim()
  return t
}

/** Strip JSON leftovers, "this landed", and clause dashes. Keep ? . ! */
export function tidyReply(text: string): string {
  let t = text.trim()
  const wrapped = t.match(/^["']([\s\S]*)["']\s*,?\s*$/)
  if (wrapped) t = wrapped[1].trim()
  t = t.replace(/["']\s*,?\s*$/, '').replace(/,\s*$/, '').trim()
  t = dropThisLanded(t)
  t = stripClauseDashes(t)
  return t
}

function isStaleHookQuote(t: string): boolean {
  return /^(?:The [“"][^”"]+[”"] bit stuck|[“"][^”"]+[”"] stuck with me|Been thinking about [“"][^”"]+[”"] too)\b/i.test(
    t,
  )
}

function isBannedFiller(text: string, tweet?: string): boolean {
  if (/\bthis landed\b/i.test(text)) return true
  if (/[—–]/.test(text) || /\s-\s/.test(text)) return true
  const shipOrExperiment = tweet
    ? /\b(shipped|shipping|launched|launch|went live|mvp|built|building|experiment|a\/b|hypothesis)\b/i.test(tweet)
    : false
  if (shipOrExperiment) return false
  return /what did you try first|next small experiment|how is this going for you/i.test(text)
}

/** Up to 3 distinct replies. Drops "this landed" and clause-dash junk. No generic pad. */
export function repliesForItem(
  item: Pick<RadarItem, 'suggestedReply' | 'suggestedReplies'> & { text?: string },
): string[] {
  const raw = [...(Array.isArray(item.suggestedReplies) ? item.suggestedReplies : []), item.suggestedReply]
  const out: string[] = []
  const seen = new Set<string>()
  for (const s of raw) {
    if (typeof s !== 'string') continue
    const t = tidyReply(s)
    if (!t || t.length > 180 || seen.has(t) || isStaleHookQuote(t)) continue
    if (isBannedFiller(t, item.text)) continue
    seen.add(t)
    out.push(t)
  }
  return out.slice(0, 3)
}

function asCount(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return Math.floor(v)
  return null
}

function httpsUrl(v: unknown): string {
  return typeof v === 'string' && /^https:\/\//i.test(v.trim()) ? v.trim() : ''
}

function asMedia(v: unknown): RadarMedia[] {
  if (!Array.isArray(v)) return []
  const out: RadarMedia[] = []
  const seen = new Set<string>()
  for (const item of v) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const url = httpsUrl(rec.url)
    const thumbnailUrl = httpsUrl(rec.thumbnailUrl) || httpsUrl(rec.thumbnail_url)
    if (!url && !thumbnailUrl) continue
    const typeRaw = typeof rec.type === 'string' ? rec.type.toLowerCase() : ''
    const type: RadarMedia['type'] =
      typeRaw === 'video' || typeRaw === 'gif' ? typeRaw : 'photo'
    const key = url || thumbnailUrl
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      type,
      url: url || thumbnailUrl,
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
      ...(typeof rec.width === 'number' ? { width: rec.width } : {}),
      ...(typeof rec.height === 'number' ? { height: rec.height } : {}),
    })
    if (out.length >= 4) break
  }
  return out
}

function asRadarItem(it: unknown): RadarItem | null {
  if (!it || typeof it !== 'object') return null
  const rec = it as Record<string, unknown>
  if (
    typeof rec.handle !== 'string' ||
    typeof rec.tweetId !== 'string' ||
    typeof rec.text !== 'string'
  ) {
    return null
  }
  return {
    handle: rec.handle,
    tweetId: rec.tweetId,
    text: rec.text,
    url: typeof rec.url === 'string' ? rec.url : '',
    createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : '',
    suggestedReply: '',
    suggestedReplies: [],
    displayName: typeof rec.displayName === 'string' && rec.displayName.trim() ? rec.displayName.trim() : rec.handle,
    avatarUrl: httpsUrl(rec.avatarUrl),
    media: asMedia(rec.media),
    likes: asCount(rec.likes),
    reposts: asCount(rec.reposts),
    replies: asCount(rec.replies),
  }
}

export type RadarResponse = {
  items: RadarItem[]
  stale?: boolean
  error?: string | null
  toneVersion?: number
  pendingHandles?: string[]
  cached?: boolean
}

function asHandleList(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of v) {
    if (typeof item !== 'string') continue
    const h = item.replace(/^@+/, '').trim().toLowerCase()
    if (!h || seen.has(h)) continue
    seen.add(h)
    out.push(h)
  }
  return out
}

/** Auth-required live reply radar (public posts via fxtwitter). */
export async function fetchRadar(input: {
  handles: string[]
  voice?: string
  force?: boolean
  fast?: boolean
}): Promise<RadarResponse> {
  if (!API_URL) throw new Error('VITE_API_URL not configured')
  const res = await apiFetch('/api/radar', {
    method: 'POST',
    body: JSON.stringify({
      handles: input.handles,
      voice: input.voice || '',
      force: Boolean(input.force),
      fast: Boolean(input.fast),
    }),
  })
  const data = (await res.json().catch(() => ({}))) as RadarResponse & { error?: string }
  if (res.status === 401) {
    clearToken()
    throw new Error('unauthorized')
  }
  if (!res.ok) {
    throw new Error(data.error || 'radar_failed')
  }
  const items = Array.isArray(data.items) ? data.items : []
  return {
    items: items.map(asRadarItem).filter((it): it is RadarItem => it !== null),
    stale: Boolean(data.stale),
    error: data.error ?? null,
    toneVersion: typeof data.toneVersion === 'number' ? data.toneVersion : undefined,
    pendingHandles: asHandleList(data.pendingHandles),
    cached: Boolean(data.cached),
  }
}

export async function fetchRadarReplies(input: {
  text: string
  voice?: string
  handle?: string
  avoid?: string[]
}): Promise<{ replies: string[]; source: 'ai' | 'template' }> {
  if (!API_URL) throw new Error('VITE_API_URL not configured')
  const res = await apiFetch('/api/radar/replies', {
    method: 'POST',
    body: JSON.stringify({
      text: input.text,
      voice: input.voice || '',
      handle: input.handle || '',
      avoid: input.avoid || [],
    }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    replies?: unknown
    source?: string
    error?: string
  }
  if (res.status === 401) {
    clearToken()
    throw new Error('unauthorized')
  }
  if (!res.ok) throw new Error(data.error || 'replies_failed')
  const raw = Array.isArray(data.replies) ? data.replies.filter((x): x is string => typeof x === 'string') : []
  const replies = repliesForItem({ suggestedReply: raw[0] || '', suggestedReplies: raw, text: input.text })
  const source = data.source === 'ai' ? 'ai' : 'template'
  return { replies, source }
}


export type BuilderProfile = {
  handle: string
  name: string
  avatarUrl: string
  bio: string
  followers: number | null
}

function asBuilderProfile(it: unknown): BuilderProfile | null {
  if (!it || typeof it !== 'object') return null
  const rec = it as Record<string, unknown>
  if (typeof rec.handle !== 'string' || !rec.handle.trim()) return null
  const handle = rec.handle.replace(/^@+/, '').trim().toLowerCase()
  if (!handle) return null
  return {
    handle,
    name: typeof rec.name === 'string' ? rec.name.trim() : '',
    avatarUrl: httpsUrl(rec.avatarUrl),
    bio: typeof rec.bio === 'string' ? rec.bio.trim() : '',
    followers: asCount(rec.followers),
  }
}

/** Auth-required public X profiles (fxtwitter via Worker, D1 ~24h). Fail-soft. */
export async function fetchBuilderProfiles(handles: string[]): Promise<BuilderProfile[]> {
  try {
    if (!API_URL || !getToken() || handles.length === 0) return []
    const cleaned: string[] = []
    const seen = new Set<string>()
    for (const raw of handles) {
      const h = raw.replace(/^@+/, '').trim().toLowerCase()
      if (!h || seen.has(h)) continue
      seen.add(h)
      cleaned.push(h)
    }
    if (cleaned.length === 0) return []
    const q = encodeURIComponent(cleaned.join(','))
    const res = await apiFetch(`/api/builders/profiles?handles=${q}`, { method: 'GET' })
    if (res.status === 401) {
      clearToken()
      return []
    }
    if (!res.ok) return []
    const data = (await res.json()) as { profiles?: unknown }
    const list = Array.isArray(data.profiles) ? data.profiles : []
    return list.map(asBuilderProfile).filter((p): p is BuilderProfile => p !== null)
  } catch {
    return []
  }
}




export type BuilderPreviewPost = {
  text: string
  createdAt: string
  mediaUrl?: string
}

type PreviewMemo = { posts: BuilderPreviewPost[]; ok: boolean; at: number }

const PREVIEW_MEMO_TTL_MS = 20 * 60 * 1000
const previewMemo = new Map<string, PreviewMemo>()
const previewInflight = new Map<string, Promise<BuilderPreviewPost[] | null>>()

function asPreviewPost(it: unknown): BuilderPreviewPost | null {
  if (!it || typeof it !== 'object') return null
  const rec = it as Record<string, unknown>
  if (typeof rec.text !== 'string' || !rec.text.trim()) return null
  const mediaUrl = httpsUrl(rec.mediaUrl)
  return {
    text: rec.text.trim(),
    createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : '',
    ...(mediaUrl ? { mediaUrl } : {}),
  }
}

/** Auth-required recent public posts (fxtwitter via Worker, shares radar_cache ~20 min). null = failed. */
export async function fetchBuilderPreview(handle: string): Promise<BuilderPreviewPost[] | null> {
  const h = handle.replace(/^@+/, '').trim().toLowerCase()
  if (!h || !API_URL || !getToken()) return null
  const cached = previewMemo.get(h)
  if (cached && Date.now() - cached.at < PREVIEW_MEMO_TTL_MS) {
    return cached.ok ? cached.posts : null
  }
  const pending = previewInflight.get(h)
  if (pending) return pending
  const run = (async (): Promise<BuilderPreviewPost[] | null> => {
    try {
      const res = await apiFetch(`/api/builders/preview?handle=${encodeURIComponent(h)}`, { method: 'GET' })
      if (res.status === 401) {
        clearToken()
        return null
      }
      if (!res.ok) {
        return null
      }
      const data = (await res.json()) as { posts?: unknown }
      const list = Array.isArray(data.posts) ? data.posts : []
      const posts = list.map(asPreviewPost).filter((p): p is BuilderPreviewPost => p !== null).slice(0, 3)
      previewMemo.set(h, { posts, ok: true, at: Date.now() })
      return posts
    } catch {
      return null
    } finally {
      previewInflight.delete(h)
    }
  })()
  previewInflight.set(h, run)
  return run
}

export type XConnection = {
  connected: boolean
  handle: string | null
  configured: boolean
}

export async function fetchXConnection(): Promise<XConnection> {
  if (!API_URL) {
    return { connected: false, handle: null, configured: false }
  }
  if (!getToken()) {
    return { connected: false, handle: null, configured: true }
  }
  const res = await apiFetch('/api/x/connection', { method: 'GET' })
  if (res.status === 401) {
    clearToken()
    throw new Error('unauthorized')
  }
  const data = (await res.json().catch(() => ({}))) as Partial<XConnection> & { error?: string }
  return {
    connected: Boolean(data.connected),
    handle: typeof data.handle === 'string' && data.handle ? data.handle.replace(/^@+/, '') : null,
    configured: data.configured !== false,
  }
}

export async function startXOAuth(): Promise<{ url: string }> {
  if (!API_URL) throw new Error('VITE_API_URL not configured')
  const res = await apiFetch('/api/x/oauth/start', { method: 'GET' })
  const data = (await res.json().catch(() => ({}))) as {
    url?: string
    error?: string
    message?: string
  }
  if (res.status === 401) {
    clearToken()
    throw new Error('unauthorized')
  }
  if (res.status === 503) {
    throw new Error(data.message || 'X posting not configured')
  }
  if (!res.ok || !data.url) {
    throw new Error(data.message || data.error || 'oauth_start_failed')
  }
  return { url: data.url }
}

export async function disconnectX(): Promise<void> {
  if (!API_URL) throw new Error('VITE_API_URL not configured')
  const res = await apiFetch('/api/x/connection', { method: 'DELETE' })
  if (res.status === 401) {
    clearToken()
    throw new Error('unauthorized')
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || 'disconnect_failed')
  }
}

export type XPostResult = { id: string; url: string }

export async function postToX(text: string, replyToId?: string): Promise<XPostResult> {
  if (!API_URL) throw new Error('VITE_API_URL not configured')
  const payload: { text: string; replyToId?: string } = { text }
  const reply = (replyToId || '').trim()
  if (reply) payload.replyToId = reply
  const res = await apiFetch('/api/x/post', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as XPostResult & {
    error?: string
    message?: string
  }
  if (res.status === 401) {
    if (data.error === 'not_connected' || data.error === 'x_unauthorized') {
      throw new Error(data.message || 'Connect X to post from here.')
    }
    clearToken()
    throw new Error('unauthorized')
  }
  if (!res.ok || !data.id) {
    throw new Error(data.message || data.error || 'post_failed')
  }
  return { id: data.id, url: data.url }
}
