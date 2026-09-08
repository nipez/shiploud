import { normalizeHandle } from './types'

/** Match API `RADAR_MAX_HANDLES` — radar only reads this many favorites. */
export const RADAR_MAX_HANDLES = 10

/** X handle charset + length (without @). */
export const HANDLE_BARE_RE = /^[a-zA-Z0-9_]{1,15}$/

export type ImportHandlesResult = {
  /** Normalized `@handle` values to append (already filtered). */
  toAdd: string[]
  added: number
  skippedDuplicates: number
  skippedInvalid: number
  skippedCap: number
}

/** Split pasted text on commas, whitespace, or newlines into raw tokens. */
export function splitHandlePaste(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export function isValidBareHandle(bare: string): boolean {
  return HANDLE_BARE_RE.test(bare)
}

/**
 * Normalize, validate, dedupe against existing favorites, and respect radar cap.
 * Does not call X — local favorites only.
 */
export function planHandleImport(
  text: string,
  existing: string[],
  maxHandles: number = RADAR_MAX_HANDLES,
): ImportHandlesResult {
  const have = new Set(
    existing.map((h) => normalizeHandle(h).toLowerCase()).filter(Boolean),
  )
  const slots = Math.max(0, maxHandles - have.size)
  const toAdd: string[] = []
  const seenInPaste = new Set<string>()
  let skippedDuplicates = 0
  let skippedInvalid = 0
  let skippedCap = 0

  for (const raw of splitHandlePaste(text)) {
    const normalized = normalizeHandle(raw)
    const bare = normalized.replace(/^@/, '')
    if (!normalized || !isValidBareHandle(bare)) {
      skippedInvalid += 1
      continue
    }
    const key = normalized.toLowerCase()
    if (have.has(key) || seenInPaste.has(key)) {
      skippedDuplicates += 1
      continue
    }
    if (toAdd.length >= slots) {
      skippedCap += 1
      continue
    }
    seenInPaste.add(key)
    toAdd.push(normalized)
  }

  return {
    toAdd,
    added: toAdd.length,
    skippedDuplicates,
    skippedInvalid,
    skippedCap,
  }
}

/** Short status line, e.g. "Added 12, skipped 3 duplicates, 1 invalid". */
export function formatImportSummary(r: ImportHandlesResult): string {
  if (
    r.added === 0 &&
    r.skippedDuplicates === 0 &&
    r.skippedInvalid === 0 &&
    r.skippedCap === 0
  ) {
    return 'Paste at least one @handle.'
  }
  const parts: string[] = []
  parts.push(r.added === 1 ? 'Added 1' : `Added ${r.added}`)
  if (r.skippedDuplicates > 0) {
    parts.push(
      r.skippedDuplicates === 1
        ? 'skipped 1 duplicate'
        : `skipped ${r.skippedDuplicates} duplicates`,
    )
  }
  if (r.skippedInvalid > 0) {
    parts.push(
      r.skippedInvalid === 1 ? '1 invalid' : `${r.skippedInvalid} invalid`,
    )
  }
  if (r.skippedCap > 0) {
    parts.push(
      r.skippedCap === 1
        ? `1 didn’t fit (max ${RADAR_MAX_HANDLES})`
        : `${r.skippedCap} didn’t fit (max ${RADAR_MAX_HANDLES})`,
    )
  }
  return parts.join(', ')
}
