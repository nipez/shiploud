export type DraftStatus = 'idea' | 'ready' | 'approved' | 'posted'
export type ReplyStatus = 'todo' | 'replied' | 'skipped'

export type Project = {
  id: string
  name: string
  building: string
  who: string
  goal: string
  voice: string
  favoriteBuilders: string[]
  /** handle -> category tags. Empty / missing = uncategorized. Multi-tag OK. */
  builderTags?: Record<string, string[]>
  /** Product / landing URL — optional but encouraged. */
  url: string
  /** Public X/Twitter handle for follower tracking (e.g. @dreamandbuildit). */
  xHandle: string
}

export type Setup = {
  activeProjectId: string
  projects: Project[]
  updatedAt: string
}

export type JournalEntry = {
  id: string
  date: string
  shipped: string
  numbers: string
  blockerLesson: string
  link: string
  updatedAt: string
  projectId?: string
}

export type Draft = {
  id: string
  text: string
  status: DraftStatus
  source: 'seed' | 'journal-template' | 'ai' | 'manual'
  createdAt: string
  updatedAt: string
  projectId?: string
  projectName?: string
  /** Optional UI badge e.g. "Thread starter" */
  label?: string
}

export type ReplyTarget = {
  id: string
  account: string
  postSummary: string
  url: string
  suggestedReply: string
  status: ReplyStatus
  createdAt: string
}

/** Manual follower check-ins — no X API. */
export type Metrics = {
  followersNow: number | null
  followersNowAt: string | null
  followersWeekStart: number | null
  followersWeekStartAt: string | null
  /** Optional launch baseline if the first public check missed day one. */
  followersLaunch: number | null
}

export type AppData = {
  journals: JournalEntry[]
  drafts: Draft[]
  replies: ReplyTarget[]
  setup: Setup
  metrics: Metrics
}

export function emptyMetrics(): Metrics {
  return {
    followersNow: null,
    followersNowAt: null,
    followersWeekStart: null,
    followersWeekStartAt: null,
    followersLaunch: null,
  }
}

export function emptyProjectFields(): Pick<
  Project,
  'building' | 'who' | 'goal' | 'voice' | 'favoriteBuilders' | 'builderTags' | 'url' | 'xHandle'
> {
  return {
    building: '',
    who: '',
    goal: '',
    voice: '',
    favoriteBuilders: [],
    builderTags: {},
    url: '',
    xHandle: '',
  }
}

/** True when the active project's founder context hasn't been filled in yet. */
export function isSetupEmpty(setup: Setup | null | undefined): boolean {
  if (!setup) return true
  const p = activeProject(setup)
  if (!p) return true
  return !p.building.trim() && !p.who.trim() && !p.goal.trim() && !p.voice.trim()
}

export function normalizeHandle(raw: string): string {
  const t = raw.trim().replace(/^@+/, '')
  return t ? `@${t}` : ''
}

export function activeProject(setup: Setup): Project | undefined {
  return (
    setup.projects.find((p) => p.id === setup.activeProjectId) ?? setup.projects[0]
  )
}

export const SUGGESTED_BUILDER_TAGS = ['AI Agents', 'Vibecoders', 'Mobile apps', 'Indie SaaS'] as const

export type BuilderTags = Record<string, string[]>

export function handleTagKey(raw: string): string {
  return normalizeHandle(raw).toLowerCase()
}

export function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

/** Prefer an existing/suggested spelling when the user types a near-match. */
export function canonicalizeTag(raw: string, known: string[] = []): string {
  const n = normalizeTag(raw)
  if (!n) return ''
  const pool = [...known, ...SUGGESTED_BUILDER_TAGS]
  const hit = pool.find((k) => k.toLowerCase() === n.toLowerCase())
  return hit || n
}

export function tagsForHandle(tags: BuilderTags | undefined, handle: string): string[] {
  if (!tags) return []
  const key = handleTagKey(handle)
  if (!key) return []
  for (const [k, v] of Object.entries(tags)) {
    if (handleTagKey(k) === key && Array.isArray(v)) return v
  }
  return []
}

export function handleIsUncategorized(tags: BuilderTags | undefined, handle: string): boolean {
  return tagsForHandle(tags, handle).length === 0
}

export function handleHasTag(tags: BuilderTags | undefined, handle: string, tag: string): boolean {
  const want = normalizeTag(tag).toLowerCase()
  if (!want) return false
  return tagsForHandle(tags, handle).some((t) => t.toLowerCase() === want)
}

export function setHandleTags(
  tags: BuilderTags | undefined,
  handle: string,
  next: string[],
  known: string[] = [],
): BuilderTags {
  const n = normalizeHandle(handle)
  const key = n.toLowerCase()
  const out: BuilderTags = {}
  for (const [k, v] of Object.entries(tags ?? {})) {
    if (handleTagKey(k) !== key) out[k] = v
  }
  if (n) {
    const cleaned: string[] = []
    const seen = new Set<string>()
    for (const raw of next) {
      const t = canonicalizeTag(raw, [...known, ...cleaned])
      const k = t.toLowerCase()
      if (!t || seen.has(k)) continue
      seen.add(k)
      cleaned.push(t)
    }
    out[n] = cleaned
  }
  return out
}

export function dropHandleTags(tags: BuilderTags | undefined, handle: string): BuilderTags {
  const key = handleTagKey(handle)
  const out: BuilderTags = {}
  for (const [k, v] of Object.entries(tags ?? {})) {
    if (handleTagKey(k) !== key) out[k] = v
  }
  return out
}

/** Tags actually assigned to current favorites, suggested names first. */
export function usedBuilderTags(tags: BuilderTags | undefined, favoriteBuilders: string[]): string[] {
  const found = new Map<string, string>()
  for (const h of favoriteBuilders) {
    for (const t of tagsForHandle(tags, h)) {
      const k = t.toLowerCase()
      if (!found.has(k)) found.set(k, t)
    }
  }
  const out: string[] = []
  for (const s of SUGGESTED_BUILDER_TAGS) {
    if (found.has(s.toLowerCase())) {
      out.push(found.get(s.toLowerCase())!)
      found.delete(s.toLowerCase())
    }
  }
  for (const t of found.values()) out.push(t)
  return out
}

export function normalizeBuilderTags(raw: unknown, favoriteBuilders: string[]): BuilderTags {
  const canonical = new Map<string, string>()
  for (const h of favoriteBuilders) {
    const n = normalizeHandle(h)
    if (n) canonical.set(n.toLowerCase(), n)
  }
  const out: BuilderTags = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const key = handleTagKey(k)
      const handle = canonical.get(key)
      if (!handle) continue
      const list = Array.isArray(v) ? v : []
      const cleaned: string[] = []
      const seen = new Set<string>()
      for (const item of list) {
        const t = canonicalizeTag(String(item), [...SUGGESTED_BUILDER_TAGS, ...cleaned])
        const tk = t.toLowerCase()
        if (!t || seen.has(tk)) continue
        seen.add(tk)
        cleaned.push(t)
      }
      out[handle] = cleaned
    }
  }
  return out
}
