import type { AppData, Draft, Metrics, Project, Setup } from './types'
import { emptyMetrics, emptyProjectFields, normalizeBuilderTags, normalizeHandle } from './types'
import { DEFAULT_SETUP, SEED } from './seed'
import { isShortEnough, X_LIMIT } from './xLength'
import {
  CANONICAL_SHIPLOUD_URL,
  isShipLoudPagesDev,
  rewritePagesDevUrls,
  stripTrailingSlash,
} from './url'

const KEY = 'shiploud-dogfood-v0'

type LegacySetup = Partial<Setup> & {
  building?: string
  who?: string
  goal?: string
  voice?: string
  favorites?: string[]
  favoriteBuilders?: string[]
  projects?: unknown[]
  activeProjectId?: string
  updatedAt?: string
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function normalizeFavs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((h) => normalizeHandle(String(h))).filter(Boolean)
}

function projectHasContext(p: Project): boolean {
  return Boolean(
    p.building.trim() ||
      p.who.trim() ||
      p.goal.trim() ||
      p.voice.trim() ||
      p.favoriteBuilders.length,
  )
}

function parseProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<Project> & { favorites?: string[] }
  if (typeof p.name !== 'string') return null
  const favs =
    Array.isArray(p.favoriteBuilders)
      ? normalizeFavs(p.favoriteBuilders)
      : Array.isArray(p.favorites)
        ? normalizeFavs(p.favorites)
        : []
  const xHandleRaw = asString((p as { xHandle?: unknown }).xHandle)
  return {
    id: typeof p.id === 'string' && p.id ? p.id : uid('project'),
    name: p.name.trim() || 'Untitled',
    building: asString(p.building),
    who: asString(p.who),
    goal: asString(p.goal),
    voice: asString(p.voice),
    favoriteBuilders: favs,
    builderTags: normalizeBuilderTags((p as { builderTags?: unknown }).builderTags, favs),
    url: asString(p.url),
    xHandle: xHandleRaw ? normalizeHandle(xHandleRaw) : '',
  }
}

/** True when blob still has account-level globals that belong on a project. */
export function setupNeedsProjectMigration(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  const s = raw as LegacySetup
  const hasGlobalContext =
    typeof s.building === 'string' ||
    typeof s.who === 'string' ||
    typeof s.goal === 'string' ||
    typeof s.voice === 'string' ||
    Array.isArray(s.favorites) ||
    Array.isArray(s.favoriteBuilders)
  if (!hasGlobalContext) return false
  // If every project already has its own context fields, treat globals as leftover.
  const projects = Array.isArray(s.projects) ? s.projects.map(parseProject).filter(Boolean) : []
  if (projects.length === 0) return true
  return true
}

function pickMergeTarget(
  projects: Project[],
  activeProjectId: string,
): Project {
  const byActive = projects.find((p) => p.id === activeProjectId)
  if (byActive) return byActive
  const byName = projects.find((p) => p.name.trim().toLowerCase() === 'shiploud')
  if (byName) return byName
  return projects[0]
}

function migrateSetup(raw: unknown): Setup {
  const fallback = structuredClone(DEFAULT_SETUP)
  if (!raw || typeof raw !== 'object') return fallback

  const s = raw as LegacySetup
  let projects: Project[] = Array.isArray(s.projects)
    ? (s.projects.map(parseProject).filter(Boolean) as Project[])
    : []

  if (projects.length === 0) {
    projects = structuredClone(fallback.projects)
  }

  let activeProjectId =
    typeof s.activeProjectId === 'string' ? s.activeProjectId : projects[0].id
  if (!projects.some((p) => p.id === activeProjectId)) {
    activeProjectId = projects[0].id
  }

  const globalBuilding = asString(s.building)
  const globalWho = asString(s.who)
  const globalGoal = asString(s.goal)
  const globalVoice = asString(s.voice)
  const globalFavs =
    Array.isArray(s.favoriteBuilders)
      ? normalizeFavs(s.favoriteBuilders)
      : Array.isArray(s.favorites)
        ? normalizeFavs(s.favorites)
        : []

  const hasGlobals =
    globalBuilding || globalWho || globalGoal || globalVoice || globalFavs.length > 0

  if (hasGlobals) {
    const target = pickMergeTarget(projects, activeProjectId)
    projects = projects.map((p) => {
      if (p.id !== target.id) return p
      if (projectHasContext(p)) {
        // Keep project fields; only fill empties from globals.
        return {
          ...p,
          building: p.building.trim() || globalBuilding,
          who: p.who.trim() || globalWho,
          goal: p.goal.trim() || globalGoal,
          voice: p.voice.trim() || globalVoice,
          favoriteBuilders: p.favoriteBuilders.length ? p.favoriteBuilders : globalFavs,
        }
      }
      return {
        ...p,
        building: globalBuilding || p.building,
        who: globalWho || p.who,
        goal: globalGoal || p.goal,
        voice: globalVoice || p.voice,
        favoriteBuilders: globalFavs.length ? globalFavs : p.favoriteBuilders,
      }
    })
  }

  return {
    activeProjectId,
    projects,
    updatedAt:
      typeof s.updatedAt === 'string' && s.updatedAt
        ? s.updatedAt
        : new Date().toISOString(),
  }
}

function isShipLoudProject(p: Project): boolean {
  const name = p.name.trim().toLowerCase()
  return p.id === 'project-shiploud' || name === 'shiploud'
}

/**
 * One-time / on-load cleanup:
 * - ShipLoud project.url → https://www.getshiploud.com if empty or still pages.dev
 * - Rewrite shiploud.pages.dev / shiploud-app.pages.dev in journals, drafts (incl. Queue), replies
 */
export function migratePagesDevUrls(data: AppData): AppData {
  const projects = data.setup.projects.map((p) => {
    let url = (p.url ?? '').trim()
    if (isShipLoudProject(p) && (!url || isShipLoudPagesDev(url))) {
      url = CANONICAL_SHIPLOUD_URL
    } else if (url && isShipLoudPagesDev(url)) {
      url = CANONICAL_SHIPLOUD_URL
    } else if (url) {
      url = stripTrailingSlash(url)
    }
    let xHandle = (p.xHandle ?? '').trim()
    if (xHandle) xHandle = normalizeHandle(xHandle)
    else if (isShipLoudProject(p)) xHandle = '@dreamandbuildit'
    return { ...p, url, xHandle }
  })

  const replacement = CANONICAL_SHIPLOUD_URL

  return {
    ...data,
    metrics: data.metrics ?? emptyMetrics(),
    setup: { ...data.setup, projects },
    journals: data.journals.map((j) => ({
      ...j,
      shipped: rewritePagesDevUrls(j.shipped ?? '', replacement),
      numbers: rewritePagesDevUrls(j.numbers ?? '', replacement),
      blockerLesson: rewritePagesDevUrls(j.blockerLesson ?? '', replacement),
      link: (() => {
        const link = (j.link ?? '').trim()
        if (!link) return link
        if (isShipLoudPagesDev(link)) return replacement
        const rewritten = rewritePagesDevUrls(link, replacement)
        return stripTrailingSlash(rewritten)
      })(),
    })),
    drafts: data.drafts.map((d) => ({
      ...d,
      text: rewritePagesDevUrls(d.text ?? '', replacement),
    })),
    replies: data.replies.map((r) => ({
      ...r,
      suggestedReply: rewritePagesDevUrls(r.suggestedReply ?? '', replacement),
    })),
  }
}

/** True when blob still contains ShipLoud pages.dev hosts or ShipLoud url needs fix. */
export function needsPagesDevMigration(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  try {
    if (/(?:shiploud|shiploud-app)\.pages\.dev/i.test(JSON.stringify(raw))) return true
  } catch {
    /* ignore */
  }
  const s = raw as Partial<AppData>
  const projects = Array.isArray(s.setup?.projects) ? s.setup!.projects : []
  for (const p of projects) {
    if (!p || typeof p !== 'object') continue
    const proj = p as Project
    const name = typeof proj.name === 'string' ? proj.name.trim().toLowerCase() : ''
    const id = typeof proj.id === 'string' ? proj.id : ''
    const url = typeof proj.url === 'string' ? proj.url.trim() : ''
    if ((id === 'project-shiploud' || name === 'shiploud') && (!url || isShipLoudPagesDev(url))) {
      return true
    }
  }
  return false
}

/**
 * Drop pending (non-approved/posted) drafts that won't fit one X post.
 * Old cloud blobs may still hold 400–500 char essay templates — never keep them as options.
 * Approved/posted drafts are left alone (user already chose them).
 * Returns { drafts, stripped } so callers can persist migration.
 */
export function stripOverlongPendingDrafts(drafts: Draft[]): { drafts: Draft[]; stripped: boolean } {
  let stripped = false
  const next = drafts.filter((d) => {
    if (d.status === 'approved' || d.status === 'posted') return true
    if (isShortEnough(d.text ?? '', X_LIMIT)) return true
    stripped = true
    return false
  })
  return { drafts: next, stripped }
}

export function hasOverlongPendingDrafts(drafts: Draft[]): boolean {
  return drafts.some(
    (d) => d.status !== 'approved' && d.status !== 'posted' && !isShortEnough(d.text ?? '', X_LIMIT),
  )
}

function normalizeMetrics(raw: unknown): Metrics {
  const base = emptyMetrics()
  if (!raw || typeof raw !== 'object') return base
  const m = raw as Partial<Metrics>
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : null
  const ts = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
  return {
    followersNow: num(m.followersNow),
    followersNowAt: ts(m.followersNowAt),
    followersWeekStart: num(m.followersWeekStart),
    followersWeekStartAt: ts(m.followersWeekStartAt),
    followersLaunch: num(m.followersLaunch),
  }
}

/** Migrate older blobs so cloud sync never wipes setup / project context. */
export function normalizeAppData(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Partial<AppData>
  if (!Array.isArray(s.journals) || !Array.isArray(s.drafts) || !Array.isArray(s.replies)) {
    return null
  }

  const setupMissing = !s.setup || typeof s.setup !== 'object'
  const setup = setupMissing
    ? structuredClone(DEFAULT_SETUP)
    : migrateSetup(s.setup)

  const metrics = normalizeMetrics((s as { metrics?: unknown }).metrics)

  const migrated = migratePagesDevUrls({
    journals: s.journals,
    drafts: s.drafts,
    replies: s.replies,
    setup,
    metrics,
  })
  // Product rule: never keep overlong pending essays in state (cloud or local).
  const { drafts } = stripOverlongPendingDrafts(migrated.drafts)
  return { ...migrated, drafts, metrics }
}

/** Detect whether normalize rewrote setup (missing setup or old global fields). */
export function didMigrateSetup(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  const s = raw as { setup?: unknown; drafts?: unknown; metrics?: unknown }
  if (!('setup' in s) || s.setup === null || s.setup === undefined) return true
  if (setupNeedsProjectMigration(s.setup)) return true
  if (needsPagesDevMigration(raw)) return true
  if (!('metrics' in s) || s.metrics === null || s.metrics === undefined) return true
  // Force rewrite when ShipLoud is missing xHandle (public follower tracking).
  try {
    const setup = (s as { setup?: { projects?: Array<{ id?: string; name?: string; xHandle?: string }> } }).setup
    const projects = setup?.projects ?? []
    for (const proj of projects) {
      const name = typeof proj.name === 'string' ? proj.name.trim().toLowerCase() : ''
      const id = typeof proj.id === 'string' ? proj.id : ''
      if ((id === 'project-shiploud' || name === 'shiploud') && !(proj.xHandle || '').trim()) {
        return true
      }
    }
  } catch {
    /* ignore */
  }
  // Force cloud rewrite when pending essays would be stripped on normalize.
  if (Array.isArray(s.drafts) && hasOverlongPendingDrafts(s.drafts as Draft[])) return true
  return false
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const seed = structuredClone(SEED)
      localStorage.setItem(KEY, JSON.stringify(seed))
      return seed
    }
    const parsed = JSON.parse(raw) as unknown
    const normalized = normalizeAppData(parsed)
    if (!normalized) {
      const seed = structuredClone(SEED)
      localStorage.setItem(KEY, JSON.stringify(seed))
      return seed
    }
    saveData(normalized)
    return normalized
  } catch {
    return structuredClone(SEED)
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function resetData(): AppData {
  const next = structuredClone(SEED)
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function newEmptyProject(name = 'New project'): Project {
  return {
    id: uid('project'),
    name,
    ...emptyProjectFields(),
  }
}
