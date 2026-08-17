import type { XStatsResponse } from './api'

export type FollowerPoint = {
  followers: number
  checked_at: string
  source?: string
}

export function growthFromStats(
  stats: XStatsResponse | null,
  launchOverride: number | null,
): {
  latest: number | null
  first: number | null
  firstAt: string | null
  delta: number | null
  points: FollowerPoint[]
} {
  const history = stats?.history ?? []
  const latest = stats?.latest?.followers ?? history[history.length - 1]?.followers ?? null
  const recordedFirst = stats?.first?.followers ?? history[0]?.followers ?? null
  const recordedFirstAt = stats?.first?.checked_at ?? history[0]?.checked_at ?? null
  const first = launchOverride ?? recordedFirst
  const firstAt = recordedFirstAt
  const delta = latest != null && first != null ? latest - first : stats?.deltaAll ?? null

  const points: FollowerPoint[] = history.map((h) => ({
    followers: h.followers,
    checked_at: h.checked_at,
    source: h.source,
  }))
  if (
    launchOverride != null &&
    points.length > 0 &&
    launchOverride !== points[0].followers
  ) {
    const firstDay = new Date(points[0].checked_at)
    if (!Number.isNaN(firstDay.getTime())) {
      firstDay.setUTCDate(firstDay.getUTCDate() - 1)
      points.unshift({
        followers: launchOverride,
        checked_at: firstDay.toISOString(),
        source: 'launch',
      })
    }
  }

  return { latest, first, firstAt, delta, points }
}

export function formatDelta(delta: number | null): string {
  if (delta == null) return ''
  if (delta > 0) return `+${delta}`
  if (delta < 0) return String(delta)
  return '±0'
}
