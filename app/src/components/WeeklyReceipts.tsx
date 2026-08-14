import { useEffect, useState } from 'react'
import type { Metrics } from '../types'
import { normalizeHandle } from '../types'
import { fetchEventsSummary, fetchXStats, refreshXStats, type XStatsResponse } from '../api'
import { localEventCounts, track } from '../track'
import { localRepliedCount7d } from '../replied'
import { ScreenHead } from './ScreenHead'

type Props = {
  metrics: Metrics
  xHandle: string
  onSaveMetrics: (metrics: Metrics) => void
  standalone?: boolean
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

export default function WeeklyReceipts({ metrics, xHandle, onSaveMetrics, standalone = false }: Props) {
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
      }
    } catch (e) {
      setXError(e instanceof Error ? e.message : 'Refresh failed')
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

  const followerDisplay =
    liveFollowers !== null && liveFollowers !== undefined ? liveFollowers.toLocaleString() : '—'
  const deltaChip = liveDelta === null ? null : liveDelta > 0 ? `+${liveDelta}` : liveDelta === 0 ? '±0' : `${liveDelta}`

  return (
    <section>
      {standalone && (
        <ScreenHead
          eyebrow="receipts, not vibes →"
          title="This week"
          sub={'Only what actually happened. No impressions, no engagement theater, no "we grew you 40%."'}
          action={
            <span className="whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-3 py-[3px] text-[11px] font-black tracking-[0.06em] text-muted">
              LAST 7 DAYS
            </span>
          }
        />
      )}

      <div className="card-soft mb-[18px] rounded-3xl p-[22px]">
        {!standalone && (
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-orange">Receipts, not vibes</p>
              <h3 className="text-base font-extrabold text-navy sm:text-lg">This week</h3>
            </div>
            <span className="rounded-full border border-line bg-cream-2 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-muted">
              {source === 'cloud' ? 'Last 7 days' : 'Local · last 7 days'}
            </span>
          </div>
        )}
        <ul className="mb-3.5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {rows.map((r) => (
            <li key={r.label} className="rounded-2xl border border-line bg-cream-2 px-3.5 py-3.5 text-center">
              <p className="text-[26px] font-black leading-none tabular-nums text-navy">{r.value}</p>
              <p className="mt-1 text-[11px] font-extrabold leading-snug text-muted">{r.label}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs font-bold text-muted">
          Replies posted counts "I posted it" on the radar — not View post, not copy. Honor system.
        </p>
      </div>

      <div className="card-soft rounded-3xl p-[22px]">
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-black tracking-[0.08em] text-muted">FOLLOWERS</p>
          {handle ? (
            <span className="rounded-full border-[1.5px] border-line bg-cream-2 px-2.5 py-0.5 text-[11px] font-extrabold text-muted">
              {handle}
            </span>
          ) : (
            <span className="text-[11px] font-bold text-muted">set handle in Setup</span>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing || !handle}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-4 py-2 text-[12.5px] font-extrabold text-navy hover:border-navy disabled:opacity-50"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
              <path d="M21 12a9 9 0 1 1-2.6-6.3" />
              <path d="M21 3v6h-6" />
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="mb-3.5 flex flex-wrap items-center gap-[18px]">
          <span className="text-[44px] font-black leading-none tabular-nums text-navy">{followerDisplay}</span>
          {deltaChip && (
            <span className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-sticker-mint bg-sticker-mint/30 px-3 py-1 text-[12.5px] font-black">
              {deltaChip} · 7d
            </span>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="text-[10.5px] font-black tracking-[0.08em] text-muted">LAST CHECKED</span>
            <span className="text-[13px] font-extrabold text-navy">
              {fmtWhen(lastChecked)}{' '}
              <span className="font-bold text-muted">
                · via {fetchSource || 'fxtwitter'} · public profile, not X analytics
              </span>
            </span>
          </div>
        </div>

        {xError && <p className="mb-3 text-sm font-extrabold text-red-600">{xError}</p>}

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="whitespace-nowrap text-xs font-extrabold text-muted">Manual override (backup)</span>
          <input
            inputMode="numeric"
            value={nowInput}
            onChange={(e) => setNowInput(e.target.value)}
            placeholder="e.g. 12"
            className="input-soft w-[100px] rounded-full px-4 py-2 text-[12.5px] font-bold tabular-nums"
          />
          <button
            type="button"
            onClick={handleSaveFollowers}
            className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-4 py-2 text-[12.5px] font-extrabold text-navy hover:border-navy"
          >
            Save
          </button>
          {savedFlash && <p className="text-sm font-extrabold text-orange">Logged.</p>}
        </div>
      </div>
    </section>
  )
}
