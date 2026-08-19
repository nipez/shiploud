/** Public fxtwitter counts already on each radar card. No predicted impressions. */

export type HeatCounts = {
  likes: number | null
  reposts: number | null
  replies: number | null
}

export function hasHeatCounts(item: HeatCounts): boolean {
  return item.likes != null || item.reposts != null || item.replies != null
}

/** Replies weigh more — that's where a founder can actually enter the room. */
export function heatScore(item: HeatCounts): number {
  if (!hasHeatCounts(item)) return 0
  return (item.likes ?? 0) + 2 * (item.reposts ?? 0) + 3 * (item.replies ?? 0)
}

export function formatHeatCounts(item: HeatCounts): string {
  if (!hasHeatCounts(item)) return ''
  const parts: string[] = []
  if (item.likes != null) parts.push(`${item.likes.toLocaleString()} likes`)
  if (item.reposts != null) parts.push(`${item.reposts.toLocaleString()} reposts`)
  if (item.replies != null) parts.push(`${item.replies.toLocaleString()} replies`)
  return parts.join(' · ')
}

/**
 * Mark the most active cards in this feed. Threshold is the median of cards
 * that have counts, floored at 3. Never invents a score from empty fields.
 */
export function hotKeys<T extends HeatCounts & { key: string }>(items: T[], maxHot = 3): Set<string> {
  const scored = items
    .filter(hasHeatCounts)
    .map((item) => ({ key: item.key, score: heatScore(item) }))
    .filter((row) => row.score > 0)
  if (scored.length === 0) return new Set()
  const ranked = scored.slice().sort((a, b) => b.score - a.score)
  const mid = ranked[Math.floor(ranked.length / 2)]
  const floor = Math.max(3, mid?.score ?? 3)
  return new Set(
    ranked
      .filter((row) => row.score >= floor)
      .slice(0, maxHot)
      .map((row) => row.key),
  )
}

export function compareByHeatThenRecency<T extends HeatCounts & { createdAt?: string }>(a: T, b: T): number {
  const diff = heatScore(b) - heatScore(a)
  if (diff !== 0) return diff
  return (b.createdAt || '').localeCompare(a.createdAt || '')
}
