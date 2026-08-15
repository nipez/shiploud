import { useEffect, useState, type ReactNode } from 'react'
import type { Draft, JournalEntry, Metrics, Setup } from '../types'
import { activeProject, normalizeHandle } from '../types'
import { todayISO, uid } from '../storage'
import { generateDraftsSmart } from '../generateSmart'
import { fetchXStats, refreshXStats, type XStatsResponse } from '../api'
import { track } from '../track'
import { ScreenHead } from './ScreenHead'

type Props = {
  journals: JournalEntry[]
  setup: Setup
  metrics: Metrics
  onSave: (entry: JournalEntry) => void
  onGeneratedDrafts: (drafts: Draft[]) => void
  onSetActiveProject: (projectId: string) => void
  onSaveMetrics: (metrics: Metrics) => void
  onToast: (msg: string) => void
  children?: ReactNode
}

function applyStatsToMetrics(metrics: Metrics, stats: XStatsResponse): Metrics {
  if (!stats.latest) return metrics
  const at = stats.latest.checked_at
  return {
    followersNow: stats.latest.followers,
    followersNowAt: at,
    followersWeekStart: stats.weekStart?.followers ?? metrics.followersWeekStart,
    followersWeekStartAt: stats.weekStart?.checked_at ?? metrics.followersWeekStartAt,
  }
}

function previousFollowers(stats: XStatsResponse): number | null {
  const hist = stats.history ?? []
  if (hist.length >= 2) return hist[hist.length - 2]?.followers ?? null
  return stats.weekStart?.followers ?? null
}

export default function Today({
  journals,
  setup,
  metrics,
  onSave,
  onGeneratedDrafts,
  onSetActiveProject,
  onSaveMetrics,
  onToast,
  children,
}: Props) {
  const today = todayISO()
  const existing = journals.find((j) => j.date === today) ?? journals[0]
  const project = activeProject(setup)
  const xHandle = normalizeHandle(project?.xHandle || '')

  const [shipped, setShipped] = useState(existing?.shipped ?? '')
  const [numbers, setNumbers] = useState(existing?.numbers ?? '')
  const [blockerLesson, setBlockerLesson] = useState(existing?.blockerLesson ?? '')
  const [link, setLink] = useState(existing?.link ?? '')
  const [xStats, setXStats] = useState<XStatsResponse | null>(null)

  useEffect(() => {
    const e = journals.find((j) => j.date === today) ?? journals[0]
    if (!e) return
    setShipped(e.shipped)
    setNumbers(e.numbers)
    setBlockerLesson(e.blockerLesson)
    setLink(e.link)
  }, [journals, today])

  useEffect(() => {
    if (!xHandle) {
      setXStats(null)
      return
    }
    let cancelled = false
    const sessionKey = `shiploud-x-refresh:${xHandle}`
    void (async () => {
      const stored = await fetchXStats(xHandle)
      if (cancelled) return
      if (stored) setXStats(stored)
      const checkedAt = stored?.latest?.checked_at
      const ageMs = checkedAt ? Date.now() - new Date(checkedAt).getTime() : Number.POSITIVE_INFINITY
      const alreadyRefreshed = (() => {
        try {
          return sessionStorage.getItem(sessionKey) === today
        } catch {
          return false
        }
      })()
      if (Number.isFinite(ageMs) && ageMs < 60 * 60 * 1000) return
      if (alreadyRefreshed && ageMs < 6 * 60 * 60 * 1000) return
      try {
        const fresh = await refreshXStats(xHandle)
        if (cancelled) return
        setXStats(fresh)
        if (fresh.ok && fresh.latest) {
          onSaveMetrics(applyStatsToMetrics(metrics, fresh))
          track('x_followers_refreshed', {
            handle: fresh.handle,
            followers: fresh.latest.followers,
            source: fresh.source || fresh.latest.source,
          })
          try {
            sessionStorage.setItem(sessionKey, today)
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* keep last good snapshot */
      }
    })()
    return () => {
      cancelled = true
    }
    // Refresh at most once per handle/session; metrics identity is not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xHandle, today])

  function currentEntry(): JournalEntry {
    const base = journals.find((j) => j.date === today)
    return {
      id: base?.id ?? uid('journal'),
      date: today,
      shipped: shipped.trim(),
      numbers: numbers.trim(),
      blockerLesson: blockerLesson.trim(),
      link: link.trim(),
      updatedAt: new Date().toISOString(),
      projectId: project?.id,
    }
  }

  function handleSave() {
    onSave(currentEntry())
    if (project?.id) onSetActiveProject(project.id)
    track('journal_saved')
    onToast("Saved. Make drafts when you're ready.")
  }

  async function handleGenerate() {
    const entry = currentEntry()
    onSave(entry)
    if (project?.id) onSetActiveProject(project.id)
    track('journal_saved')
    const { drafts, meta } = await generateDraftsSmart(entry, setup)
    onGeneratedDrafts(drafts)
    track('drafts_generated', { source: meta.source, count: meta.count })
  }

  const liveFollowers = xStats?.latest?.followers ?? metrics.followersNow
  const prevFollowers = xStats ? previousFollowers(xStats) : metrics.followersWeekStart
  const followerDelta =
    liveFollowers != null && prevFollowers != null ? liveFollowers - prevFollowers : xStats?.delta7 ?? null
  const numbersFollowers = numbers.match(/~?(\d+)\s*followers/i)
  const numbersMismatch =
    liveFollowers != null &&
    numbersFollowers != null &&
    Number(numbersFollowers[1]) !== liveFollowers

  function useLiveFollowersInNumbers() {
    if (liveFollowers == null) return
    const next = numbersFollowers
      ? numbers.replace(/~?\d+\s*followers/i, `~${liveFollowers} followers`)
      : numbers.trim()
        ? `${numbers.trim()} · ~${liveFollowers} followers`
        : `~${liveFollowers} followers`
    setNumbers(next)
    onToast(`${liveFollowers} followers written into Numbers`)
  }

  return (
    <section>
      <div className="grid items-start gap-x-[22px] gap-y-6 min-[1000px]:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <ScreenHead
          className="order-1 mb-0 min-[1000px]:col-start-1 min-[1000px]:self-end"
          eyebrow="today's loop →"
          title="What did you ship today?"
          sub="Jot it down, pick a draft, tap Post. Two minutes, then back to building."
          action={
            liveFollowers != null ? (
              <span
                className={`inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] px-3 py-1 text-[12px] font-black ${
                  followerDelta != null && followerDelta > 0
                    ? 'border-sticker-mint bg-sticker-mint/30 text-navy'
                    : 'border-line bg-cream-2 text-muted'
                }`}
              >
                {liveFollowers.toLocaleString()} followers
                {followerDelta != null && followerDelta > 0
                  ? ` · +${followerDelta}`
                  : followerDelta != null && followerDelta < 0
                    ? ` · ${followerDelta}`
                    : ''}
              </span>
            ) : null
          }
        />
        {children}
        <form
          className="card-soft order-2 flex w-full flex-col gap-3.5 rounded-3xl p-[22px] min-[1000px]:order-3 min-[1000px]:col-start-1"
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
        >
          <Field label="What shipped" hint="Concrete. One or two sentences.">
            <textarea
              value={shipped}
              onChange={(e) => setShipped(e.target.value)}
              rows={2}
              className="input-soft w-full resize-y text-[13.5px] font-bold leading-normal"
              placeholder="Shipped X to URL…"
            />
          </Field>
          <Field label="Numbers" hint="Only real ones. $0 is allowed.">
            <textarea
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              rows={2}
              className="input-soft w-full resize-y text-[13.5px] font-bold leading-normal"
              placeholder="~9 followers · $0 MRR"
            />
          </Field>
          {liveFollowers != null && (
            <p className="text-[12px] font-bold text-muted">
              {followerDelta != null && followerDelta > 0 ? (
                <>
                  Public check: {liveFollowers.toLocaleString()} followers · +{followerDelta} since
                  the last snapshot. Real ones — nice.
                </>
              ) : (
                <>
                  Public check: {liveFollowers.toLocaleString()} followers
                  {xStats?.latest?.checked_at
                    ? ` · ${new Date(xStats.latest.checked_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                    : ''}
                  . Logged on Receipts, not typed here.
                </>
              )}
              {numbersMismatch && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={useLiveFollowersInNumbers}
                    className="font-black text-orange underline underline-offset-2 hover:text-orange-deep"
                  >
                    Use {liveFollowers} in Numbers
                  </button>
                </>
              )}
            </p>
          )}
          <Field label="Blocker / lesson" hint="What got in the way.">
            <textarea
              value={blockerLesson}
              onChange={(e) => setBlockerLesson(e.target.value)}
              rows={2}
              className="input-soft w-full resize-y text-[13.5px] font-bold leading-normal"
              placeholder="X login blocked → dogfood before pitch…"
            />
          </Field>
          <Field label="Link" hint="Optional">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="input-soft min-h-11 w-full font-mono text-[13.5px] font-bold"
              placeholder="https://"
            />
          </Field>

          <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              className="btn-pill whitespace-nowrap px-[22px] py-3 text-sm"
            >
              Make drafts
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-5 py-3 text-sm font-extrabold text-navy hover:border-navy"
            >
              Save
            </button>
          </div>
          <p className="text-[11.5px] font-bold text-muted">Empty journal = empty drafts. That's the deal.</p>
        </form>
      </div>
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-[5px]">
      <span className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] font-black text-navy">{label}</span>
        {hint && <span className="text-[11px] font-bold text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  )
}
