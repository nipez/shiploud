/** Local “I posted it” marks for radar cards. Source of truth for the card, not cloud events. */

export const REPLIED_KEY = 'shiploud-replied-v1'

export type RepliedMark = {
  tweetId: string
  handle: string
  markedAt: string
  draft?: string
}

function isMark(v: unknown): v is RepliedMark {
  if (!v || typeof v !== 'object') return false
  const m = v as Partial<RepliedMark>
  return (
    typeof m.tweetId === 'string' &&
    m.tweetId.length > 0 &&
    typeof m.handle === 'string' &&
    typeof m.markedAt === 'string'
  )
}

function readAll(): RepliedMark[] {
  try {
    const raw = localStorage.getItem(REPLIED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isMark)
  } catch {
    return []
  }
}

function writeAll(marks: RepliedMark[]): void {
  try {
    localStorage.setItem(REPLIED_KEY, JSON.stringify(marks.slice(-300)))
  } catch {
    /* ignore quota */
  }
}

export function loadRepliedMap(): Record<string, RepliedMark> {
  const map: Record<string, RepliedMark> = {}
  for (const m of readAll()) map[m.tweetId] = m
  return map
}

export function markReplied(mark: RepliedMark): Record<string, RepliedMark> {
  const next = readAll().filter((m) => m.tweetId !== mark.tweetId)
  next.push(mark)
  writeAll(next)
  return loadRepliedMap()
}

export function unmarkReplied(tweetId: string): Record<string, RepliedMark> {
  writeAll(readAll().filter((m) => m.tweetId !== tweetId))
  return loadRepliedMap()
}

/** Last-7-days count from the local mark list (fallback when events are empty). */
export function localRepliedCount7d(): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  let n = 0
  for (const m of readAll()) {
    const t = Date.parse(m.markedAt)
    if (Number.isFinite(t) && t >= cutoff) n += 1
  }
  return n
}
