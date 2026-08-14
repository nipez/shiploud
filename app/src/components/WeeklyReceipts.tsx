import { useEffect, useMemo, useState } from 'react'
import type { Metrics } from '../types'
import { normalizeHandle } from '../types'
import { fetchEventsSummary, fetchXStats, refreshXStats, type XStatsResponse } from '../api'
import { localEventCounts, track } from '../track'
import { localRepliedCount7d } from '../replied'

type Props = {
  metrics: Metrics
  xHandle: string
  onSaveMetrics: (metrics: Metrics) => void
}

type Counts = {
  draft_copied: number
  draft_saved_for_later: number
  draft_marked_posted: number
  drafts_generated: number
  replies_posted: number
}

function mergeCounts(remote: Record<string, number> | null, local: Record<string, number>): Counts {
  const cloud = Boolean(remote && Object.keys(remote).length > 0)
  const src = cloud ? remote! : local
  const fromEvents = src.x_replied ?? 0
  // Cloud x_replied when the API has events; otherwise local events, then the mark list.
  const replies_posted = cloud ? fromEvents : fromEvents > 0 ? fromEvents : localRepliedCount7d()
  return {
    draft_copied: src.draft_copied ?? 0,
    draft_saved_for_later: src.draft_saved_for_later ?? 0,
    draft_marked_posted: src.draft_marked_posted ?? 0,
    drafts_generated: src.drafts_generated ?? 0,
    replies_posted,
  }
}

function fmtDelta(d: number | null, label = '7d'): string | null {
  if (d === null) return null
  if (d === 0) return `±0 ${label}`
  return d > 0 ? `+${d} ${label}` : `${d} ${label}`
}

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return 'never'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function applyStatsToMetrics(metrics: Metrics, stats: XStatsResponse): Metrics {
  if (!stats.latest) return metrics
  const at = stats.latest.checked_at
  const weekStart =
    stats.weekStart?.followers ??
    metrics.followersWeekStart
  const weekStartAt =
    stats.weekStart?.checked_at ?? metrics.followersWeekStartAt
  return {
    followersNow: stats.latest.followers,
    followersNowAt: at,
    followersWeekStart: weekStart,
    followersWeekStartAt: weekStartAt,
  }
}

export default function WeeklyReceipts({ metrics, xHandle, onSaveMetrics }: Props) {
  const [counts, setCounts] = useState<Counts>(() => mergeCounts(null, localEventCounts()))
  const [source, setSource] = useState<'cloud' | 'local'>('local')
  const [nowInput, setNowInput] = useState(
    metrics.followersNow !== null ? String(metrics.followersNow) : '',
  )
  const [startInput, setStartInput] = useState(
    metrics.followersWeekStart !== null ? String(metrics.followersWeekStart) : '',
  )
  const [savedFlash, setSavedFlash] = useState(false)
  const [xStats, setXStats] = useState<XStatsResponse | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [xError, setXError] = useState('')
  const [showManual, setShowManual] = useState(false)

  const handle = normalizeHandle(xHandle || '')

  useEffect(() => {
    setNowInput(metrics.followersNow !== null ? String(metrics.followersNow) : '')
    setStartInput(metrics.followersWeekStart !== null ? String(metrics.followersWeekStart) : '')
  }, [metrics])

  useEffect(() => {
    let cancelled = false
    const local = localEventCounts()
    setCounts(mergeCounts(null, local))
    void fetchEventsSummary()
      .then((res) => {
        if (cancelled || !res) return
        setCounts(mergeCounts(res.counts, local))
        setSource('cloud')
      })
      .catch(() => {
        if (!cancelled) setSource('local')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!handle) {
      setXStats(null)
      return
    }
    void fetchXStats(handle).then((res) => {
      if (cancelled || !res) return
      setXStats(res)
    })
    return () => {
      cancelled = true
    }
    // intentionally only when handle changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle])

  const liveFollowers = xStats?.latest?.followers ?? metrics.followersNow
  const liveDelta =
    xStats?.delta7 ??
    (metrics.followersNow !== null && metrics.followersWeekStart !== null
      ? metrics.followersNow - metrics.followersWeekStart
      : null)
  const lastChecked = xStats?.latest?.checked_at ?? metrics.followersNowAt
  const fetchSource = xStats?.latest?.source ?? xStats?.source

  const deltaLabel = useMemo(() => fmtDelta(liveDelta, '7d'), [liveDelta])

  function parseNum(raw: string): number | null {
    const t = raw.trim()
    if (!t) return null
    const n = Number(t)
    if (!Number.isFinite(n) || n < 0) return null
    return Math.floor(n)
  }

  function handleSaveFollowers() {
    const now = parseNum(nowInput)
    const start = parseNum(startInput)
    const at = new Date().toISOString()
    onSaveMetrics({
      followersNow: now,
      followersNowAt: now !== null ? at : metrics.followersNowAt,
      followersWeekStart: start,
      followersWeekStartAt: start !== null ? at : metrics.followersWeekStartAt,
    })
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1400)
  }

  async function handleRefresh() {
    if (!handle) {
      setXError('Set an X handle in Setup first.')
      return
    }
    setRefreshing(true)
    setXError('')
    try {
      const res = await refreshXStats(handle)
      setXStats(res)
      if (res.ok && res.latest) {
        onSaveMetrics(applyStatsToMetrics(metrics, res))
        track('x_followers_refreshed', {
          handle: res.handle,
          followers: res.latest.followers,
          source: res.source || res.latest.source,
        })
      } else {
        setXError(res.message || res.error || 'Could not refresh public profile.')
        setShowManual(true)
      }
    } catch (e) {
      setXError(e instanceof Error ? e.message : 'Refresh failed')
      setShowManual(true)
    } finally {
      setRefreshing(false)
    }
  }

  const rows: { label: string; value: number }[] = [
    { label: 'Drafts generated', value: counts.drafts_generated },
    { label: 'Copied', value: counts.draft_copied },
    { label: 'Saved for later', value: counts.draft_saved_for_later },
    { label: 'Marked posted', value: counts.draft_marked_posted },
    { label: 'Replies posted', value: counts.replies_posted },
  ]

  return (
    <section className="card-soft space-y-3 border-orange/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-orange">
            Receipts, not vibes
          </p>
          <h3 className="text-base font-extrabold text-navy sm:text-lg">This week</h3>
        </div>
        <span className="rounded-full border border-line bg-cream-2 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-muted">
          {source === 'cloud' ? 'Last 7 days' : 'Local · last 7 days'}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {rows.map((r) => (
          <li
            key={r.label}
            className="rounded-2xl border border-line bg-cream-2/80 px-2.5 py-2 text-center"
          >
            <p className="text-lg font-black tabular-nums text-navy">{r.value}</p>
            <p className="text-[10px] font-extrabold leading-tight text-muted">{r.label}</p>
          </li>
        ))}
      </ul>
      <p className="text-[11px] font-semibold text-muted">
        Replies posted is I posted it on the feed — not View post or copy.
      </p>

      <div className="space-y-2 border-t border-line pt-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-extrabold text-navy">Followers</p>
          {deltaLabel && <p className="text-xs font-black text-orange-deep">{deltaLabel}</p>}
        </div>
        <p className="text-xs font-semibold text-muted">
          From your public X profile. Not impressions/engagement.
          {handle ? (
            <>
              {' '}
              · <span className="font-extrabold text-navy">{handle}</span>
            </>
          ) : (
            <> · set handle in Setup</>
          )}
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[7rem]">
            <p className="text-[10px] font-black uppercase tracking-wide text-muted">Now</p>
            <p className="text-2xl font-black tabular-nums text-navy">
              {liveFollowers !== null && liveFollowers !== undefined
                ? liveFollowers.toLocaleString()
                : '—'}
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wide text-muted">
              Last checked
            </p>
            <p className="text-xs font-semibold text-navy">{fmtWhen(lastChecked)}</p>
            {fetchSource && (
              <p className="text-[10px] font-semibold text-muted">via {fetchSource}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing || !handle}
            className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-extrabold text-navy hover:border-orange/40 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {xError && <p className="text-sm font-extrabold text-red-600">{xError}</p>}

        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="text-xs font-extrabold text-muted underline-offset-2 hover:text-navy hover:underline"
        >
          {showManual ? 'Hide manual override' : 'Manual override (backup)'}
        </button>

        {showManual && (
          <div className="space-y-2 rounded-2xl border border-line bg-cream-2/60 p-3">
            <p className="text-xs font-semibold text-muted">
              Use if public fetch fails. Same fields as before.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="min-w-[7.5rem] flex-1 space-y-1">
                <span className="block text-[10px] font-black uppercase tracking-wide text-muted">
                  Week start
                </span>
                <input
                  inputMode="numeric"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  placeholder="e.g. 8"
                  className="input-soft min-h-11 w-full text-base tabular-nums sm:text-sm"
                />
              </label>
              <label className="min-w-[7.5rem] flex-1 space-y-1">
                <span className="block text-[10px] font-black uppercase tracking-wide text-muted">
                  Followers now
                </span>
                <input
                  inputMode="numeric"
                  value={nowInput}
                  onChange={(e) => setNowInput(e.target.value)}
                  placeholder="e.g. 12"
                  className="input-soft min-h-11 w-full text-base tabular-nums sm:text-sm"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSaveFollowers}
                  className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-extrabold text-navy hover:border-orange/40"
                >
                  Save
                </button>
              </div>
            </div>
            {savedFlash && <p className="text-sm font-extrabold text-orange">Logged.</p>}
          </div>
        )}
      </div>
    </section>
  )
}
