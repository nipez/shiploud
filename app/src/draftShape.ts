import type { Draft } from './types'
import type { DraftShape } from './generate'

export const DRAFT_SHAPES: { id: DraftShape; label: string }[] = [
  { id: 'receipt', label: 'Receipt' },
  { id: 'lesson', label: 'Lesson' },
  { id: 'straight', label: 'Straight' },
]

export function shapeFromLabel(label?: string | null): DraftShape | null {
  const t = (label || '').trim().toLowerCase()
  if (t === 'receipt' || t === 'lesson' || t === 'straight') return t
  return null
}

function newestLabeled(drafts: Draft[], status: Draft['status']): DraftShape | null {
  const ranked = drafts
    .filter((d) => d.status === status)
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  for (const d of ranked) {
    const shape = shapeFromLabel(d.label)
    if (shape) return shape
  }
  return null
}

export function lastPostedShape(drafts: Draft[]): DraftShape | null {
  return newestLabeled(drafts, 'posted')
}

/**
 * Prefer the last shape they posted, then the last one they kept.
 * That's the honest "learns from you" — no X impressions.
 */
export function preferredShape(drafts: Draft[]): DraftShape | null {
  return lastPostedShape(drafts) ?? newestLabeled(drafts, 'approved')
}

export function sortDraftsByPreferredShape<T extends { label?: string; createdAt: string }>(
  drafts: T[],
  preferred: DraftShape | null,
): T[] {
  if (!preferred) return drafts
  return drafts.slice().sort((a, b) => {
    const aHit = shapeFromLabel(a.label) === preferred ? 1 : 0
    const bHit = shapeFromLabel(b.label) === preferred ? 1 : 0
    if (bHit !== aHit) return bHit - aHit
    return b.createdAt.localeCompare(a.createdAt)
  })
}
