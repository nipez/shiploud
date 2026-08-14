/** Public builder profiles via fxtwitter, cached in D1 (~24h). */

import { validHandle } from './radar'

export const PROFILE_CACHE_TTL_MS = 24 * 60 * 60 * 1000
export const PROFILE_MAX_HANDLES = 30

export type BuilderProfile = {
  handle: string
  name: string
  avatarUrl: string
  bio: string
  followers: number | null
}

const FETCH_HEADERS: HeadersInit = {
  Accept: 'application/json',
  'User-Agent': 'ShipLoudBot/0.1 (+https://www.getshiploud.com)',
}

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase()
}

export function capProfileHandles(raw: unknown): string[] {
  const list: string[] = []
  const seen = new Set<string>()
  const src = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[,\s]+/) : []
  for (const item of src) {
    if (typeof item !== 'string') continue
    const h = validHandle(item)
    if (!h || seen.has(h)) continue
    seen.add(h)
    list.push(h)
    if (list.length >= PROFILE_MAX_HANDLES) break
  }
  return list
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  return null
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : ''
}

function asCount(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return Math.floor(v)
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) {
    const n = Number(v)
    if (n >= 0) return Math.floor(n)
  }
  return null
}

function httpsUrl(v: unknown): string {
  const s = asString(v).trim()
  if (!/^https:\/\//i.test(s)) return ''
  if (/\s/.test(s)) return ''
  return s
}

function pickUser(data: unknown): Record<string, unknown> | null {
  const root = asRecord(data)
  if (!root) return null
  const nested = asRecord(root.user) || asRecord(asRecord(root.data)?.user) || asRecord(root.data)
  if (nested && (nested.screen_name || nested.username || nested.name || nested.followers != null)) {
    return nested
  }
  if (root.screen_name || root.username || root.followers != null || root.description) return root
  return null
}

/** Prefer a larger pbs.twimg variant than the default _normal (48px). */
export function biggerAvatar(url: string): string {
  return url.replace(/_normal(\.\w+)(?:\?.*)?$/i, '_bigger$1')
}

export function parseBuilderProfile(data: unknown, expectedHandle: string): BuilderProfile | null {
  const user = pickUser(data)
  if (!user) return null
  const handle =
    normalizeHandle(asString(user.screen_name || user.username || user.handle) || expectedHandle) ||
    expectedHandle
  const name = asString(user.name || user.display_name || user.displayName).trim()
  const bio = asString(user.description || user.bio).replace(/\s+/g, ' ').trim()
  const avatarUrl = biggerAvatar(
    httpsUrl(user.avatar_url) ||
      httpsUrl(user.avatarUrl) ||
      httpsUrl(user.profile_image_url) ||
      httpsUrl(user.profileImageUrl),
  )
  const followers =
    asCount(user.followers) ?? asCount(user.followers_count) ?? asCount(user.followersCount)
  if (!name && !avatarUrl && followers === null && !bio) return null
  return { handle, name, avatarUrl, bio, followers }
}

function stub(handle: string): BuilderProfile {
  return { handle, name: '', avatarUrl: '', bio: '', followers: null }
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: FETCH_HEADERS,
      redirect: 'follow',
    })
    if (!res.ok) return null
    return (await res.json()) as unknown
  } catch {
    return null
  }
}

async function fetchLiveProfile(handle: string): Promise<BuilderProfile | null> {
  const encoded = encodeURIComponent(handle)
  const urls = [
    `https://api.fxtwitter.com/${encoded}`,
    `https://api.fxtwitter.com/2/profile/${encoded}`,
    `https://api.vxtwitter.com/${encoded}`,
  ]
  for (const url of urls) {
    const data = await fetchJson(url)
    if (!data) continue
    const parsed = parseBuilderProfile(data, handle)
    if (parsed) return parsed
  }
  return null
}

function cacheFresh(fetchedAt: string, now: number): boolean {
  const t = Date.parse(fetchedAt)
  if (!Number.isFinite(t)) return false
  return now - t < PROFILE_CACHE_TTL_MS
}

type CacheRow = {
  handle: string
  name: string | null
  avatar_url: string | null
  bio: string | null
  followers: number | null
  fetched_at: string
}

function fromRow(row: CacheRow): BuilderProfile {
  return {
    handle: row.handle,
    name: row.name || '',
    avatarUrl: row.avatar_url || '',
    bio: row.bio || '',
    followers: typeof row.followers === 'number' && Number.isFinite(row.followers) ? row.followers : null,
  }
}

async function readCache(
  db: D1Database,
  handle: string,
): Promise<{ profile: BuilderProfile; fetchedAt: string } | null> {
  try {
    const row = await db
      .prepare(
        'SELECT handle, name, avatar_url, bio, followers, fetched_at FROM builder_profiles WHERE handle = ?',
      )
      .bind(handle)
      .first<CacheRow>()
    if (!row) return null
    return { profile: fromRow(row), fetchedAt: row.fetched_at }
  } catch {
    return null
  }
}

async function writeCache(db: D1Database, profile: BuilderProfile): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO builder_profiles (handle, name, avatar_url, bio, followers, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(handle) DO UPDATE SET
           name = excluded.name,
           avatar_url = excluded.avatar_url,
           bio = excluded.bio,
           followers = excluded.followers,
           fetched_at = excluded.fetched_at`,
      )
      .bind(
        profile.handle,
        profile.name || null,
        profile.avatarUrl || null,
        profile.bio || null,
        profile.followers,
        new Date().toISOString(),
      )
      .run()
  } catch {
    /* table may not exist yet */
  }
}

export async function getBuilderProfiles(
  db: D1Database,
  handles: string[],
): Promise<BuilderProfile[]> {
  const unique = capProfileHandles(handles)
  if (unique.length === 0) return []
  const now = Date.now()

  return Promise.all(
    unique.map(async (handle) => {
      const cached = await readCache(db, handle)
      if (cached && cacheFresh(cached.fetchedAt, now)) return cached.profile
      try {
        const live = await fetchLiveProfile(handle)
        if (live) {
          await writeCache(db, live)
          return live
        }
      } catch {
        /* fail soft per-handle */
      }
      if (cached) return cached.profile
      return stub(handle)
    }),
  )
}
