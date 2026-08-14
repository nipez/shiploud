import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Setup } from '../types'
import {
  activeProject,
  handleHasTag,
  handleIsUncategorized,
  usedBuilderTags,
} from '../types'
import { fetchRadar, fetchRadarReplies, repliesForItem, type RadarItem, type RadarMedia, type RadarResponse } from '../api'
import { track } from '../track'
import { xReplyIntentUrl } from '../url'
import { loadRepliedMap, markReplied, unmarkReplied, type RepliedMark } from '../replied'

const LAST_KEY = 'shiploud-radar-last-v6'

/** Known pad lines the API still attaches — never paint these as “ideas”. */
const GENERIC_IDEA =
  /^(curious which (line|part|bit) you|same place\. what made you post|which bit of that is the part you keep|curious which part of that you keep coming back|been chewing on that too|same question on my list|same instinct\. what did you do instead|that'?s a real filter\.|nice get-it-out\.|love seeing it live\.|congrats on the ship\.)/i

function stripAttachedReplies(item: RadarItem): RadarItem {
  if (!item.suggestedReply && (!item.suggestedReplies || item.suggestedReplies.length === 0)) return item
  return { ...item, suggestedReply: '', suggestedReplies: [] }
}

function usableIdeas(replies: string[], tweet: string, source: 'ai' | 'template'): string[] {
  if (source === 'template') return []
  return repliesForItem({ suggestedReply: replies[0] || '', suggestedReplies: replies, text: tweet })
    .filter((r) => !GENERIC_IDEA.test(r.trim()))
    .slice(0, 3)
}

type LastBucket = { handles: string; items: RadarItem[]; savedAt: number }

function handlesKey(handles: string[]): string {
  return handles.slice().sort().join(',')
}

function readBucket(raw: string | null): LastBucket | null {
  if (!raw) return null
  try {
    const bucket = JSON.parse(raw) as LastBucket
    if (!bucket || !Array.isArray(bucket.items)) return null
    return bucket
  } catch {
    return null
  }
}

function loadLast(handles: string[]): RadarItem[] {
  try {
    const key = handlesKey(handles)
    const local = readBucket(localStorage.getItem(LAST_KEY))
    const session = readBucket(sessionStorage.getItem(LAST_KEY))
    const bucket = local?.handles === key ? local : session?.handles === key ? session : null
    return (bucket?.items ?? []).map(stripAttachedReplies)
  } catch {
    return []
  }
}

function saveLast(handles: string[], items: RadarItem[]): void {
  try {
    const bucket: LastBucket = { handles: handlesKey(handles), items: items.map(stripAttachedReplies), savedAt: Date.now() }
    const raw = JSON.stringify(bucket)
    localStorage.setItem(LAST_KEY, raw)
    sessionStorage.setItem(LAST_KEY, raw)
  } catch {
    /* ignore */
  }
}

function mergeRadarItems(prev: RadarItem[], incoming: RadarItem[]): RadarItem[] {
  const map = new Map<string, RadarItem>()
  for (const it of prev) map.set(`${it.handle}:${it.tweetId}`, it)
  for (const it of incoming) map.set(`${it.handle}:${it.tweetId}`, it)
  return [...map.values()].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export function feedStatus(opts: {
  loading: boolean
  itemCount: number
  handleCount: number
  pendingHandles: string[]
  elapsedSec: number
}): { text: string; progress: number | null } {
  const { loading, itemCount, handleCount, pendingHandles, elapsedSec } = opts
  if (!loading) return { text: '', progress: null }
  if (pendingHandles.length > 0) {
    const done = Math.max(0, handleCount - pendingHandles.length)
    const pct = handleCount > 0 ? done / handleCount : 0.35
    if (pendingHandles.length === 1) {
      return { text: `Refreshing @${pendingHandles[0]}…`, progress: Math.min(0.95, Math.max(0.2, pct)) }
    }
    return { text: `Loading ${done} of ${handleCount}…`, progress: Math.min(0.95, Math.max(0.12, pct)) }
  }
  if (itemCount > 0) {
    return { text: 'Refreshing…', progress: Math.min(0.9, 0.28 + elapsedSec * 0.1) }
  }
  const secs = elapsedSec > 0 ? ` ${elapsedSec}s` : ''
  return { text: `Fetching posts from your builders…${secs}`, progress: Math.min(0.9, 0.16 + elapsedSec * 0.08) }
}

function relativeTime(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  const d = Math.floor(s / 86400)
  if (d < 7) return `${d}d`
  try {
    return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function displayHandle(handle: string): string {
  const h = handle.replace(/^@+/, '')
  return h ? `@${h}` : ''
}

function formatCount(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')}M`
  }
  if (n >= 10_000) return `${Math.round(n / 1000)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

function displayNameOf(item: RadarItem): string {
  const name = (item.displayName || '').trim()
  if (name) return name
  return item.handle.replace(/^@+/, '')
}

function tweetUrl(item: RadarItem): string {
  if (item.url && /^https?:\/\//i.test(item.url)) {
    return item.url.replace(/^https?:\/\/(www\.)?twitter\.com/i, 'https://x.com')
  }
  const h = item.handle.replace(/^@+/, '')
  return `https://x.com/${h}/status/${item.tweetId}`
}

type Props = {
  setup: Setup
}

export default function RadarFeed({ setup }: Props) {
  const project = activeProject(setup)
  const handles = useMemo(
    () =>
      (project?.favoriteBuilders ?? [])
        .map((h) => h.replace(/^@+/, '').trim())
        .filter((h) => /^[a-z0-9_]{1,15}$/i.test(h)),
    [project?.favoriteBuilders],
  )
  const voice = project?.voice?.trim() || ''
  const handlesSig = handles.join(',')

  const [items, setItems] = useState<RadarItem[]>(() => loadLast(handles))
  const [loading, setLoading] = useState(handles.length > 0)
  const [error, setError] = useState<string | null>(null)
  const [pendingHandles, setPendingHandles] = useState<string[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({})
  const [ideas, setIdeas] = useState<Record<string, string[]>>({})
  const [ideasOpen, setIdeasOpen] = useState<Record<string, boolean>>({})
  const [generating, setGenerating] = useState<Set<string>>(() => new Set())
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [replied, setReplied] = useState<Record<string, RepliedMark>>(() => loadRepliedMap())
  const [awaitingConfirm, setAwaitingConfirm] = useState<Record<string, boolean>>({})
  const inFlight = useRef(0)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    if (!loading) {
      setElapsed(0)
      return
    }
    const t0 = Date.now()
    const id = window.setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - t0) / 1000))), 500)
    return () => window.clearInterval(id)
  }, [loading])

  const paint = useCallback((next: RadarItem[], merge: boolean) => {
    if (next.length === 0) return
    const incoming = next.map(stripAttachedReplies)
    const painted = merge ? mergeRadarItems(itemsRef.current, incoming) : incoming
    itemsRef.current = painted
    setItems(painted)
    saveLast(handles, painted)
  }, [handles])

  const load = useCallback(
    async (force: boolean) => {
      if (handles.length === 0) {
        setItems([])
        setLoading(false)
        setError(null)
        setPendingHandles([])
        return
      }
      const seq = ++inFlight.current
      setLoading(true)
      if (force) setError(null)

      const finishEmpty = (hadItems: boolean) => {
        if (hadItems) {
          setError('Couldn’t load posts — try Refresh.')
          return
        }
        const last = loadLast(handles)
        if (last.length > 0) {
          itemsRef.current = last
          setItems(last)
        } else {
          setItems([])
        }
        setError('Couldn’t load posts — try Refresh.')
      }

      const applyLive = (res: RadarResponse, merge: boolean) => {
        if (res.items.length > 0) {
          paint(res.items, merge)
          setError(res.error ? 'Couldn’t load posts — try Refresh.' : null)
          return
        }
        finishEmpty(itemsRef.current.length > 0)
      }

      try {
        if (!force) {
          const cached = await fetchRadar({ handles, voice, force: false, fast: true })
          if (seq !== inFlight.current) return
          if (cached.items.length > 0) {
            paint(cached.items, false)
            setError(null)
          }
          const pending = cached.pendingHandles ?? []
          setPendingHandles(pending)
          if (pending.length === 0 && cached.items.length > 0) {
            setLoading(false)
            return
          }
          const liveHandles = pending.length > 0 ? pending : handles
          const live = await fetchRadar({ handles: liveHandles, voice, force: false })
          if (seq !== inFlight.current) return
          applyLive(live, cached.items.length > 0 || itemsRef.current.length > 0)
          setPendingHandles([])
        } else {
          setPendingHandles(handles)
          const live = await fetchRadar({ handles, voice, force: true })
          if (seq !== inFlight.current) return
          applyLive(live, false)
          setPendingHandles([])
        }
      } catch {
        if (seq !== inFlight.current) return
        finishEmpty(itemsRef.current.length > 0)
        setPendingHandles([])
      } finally {
        if (seq === inFlight.current) setLoading(false)
      }
    },
    [handles, voice, paint],
  )

  useEffect(() => {
    const last = loadLast(handles)
    if (last.length > 0) {
      itemsRef.current = last
      setItems(last)
    }
    void load(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlesSig, voice])

  function draftFor(item: RadarItem): string {
    const id = `${item.handle}:${item.tweetId}`
    return (customDrafts[id] || '').trim()
  }

  async function loadIdeas(item: RadarItem) {
    const id = `${item.handle}:${item.tweetId}`
    setIdeasOpen((prev) => ({ ...prev, [id]: true }))
    if (generating.has(id)) return
    setGenerating((prev) => new Set(prev).add(id))
    try {
      const res = await fetchRadarReplies({
        text: item.text,
        voice,
        handle: item.handle,
        avoid: ideas[id] ?? [],
      })
      const next = usableIdeas(res.replies, item.text, res.source)
      setIdeas((prev) => ({ ...prev, [id]: next }))
    } catch {
      setIdeas((prev) => ({ ...prev, [id]: [] }))
    } finally {
      setGenerating((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  function applyIdea(item: RadarItem, reply: string) {
    const id = `${item.handle}:${item.tweetId}`
    setCustomDrafts((prev) => ({ ...prev, [id]: reply }))
  }

  function openReplyIntent(item: RadarItem) {
    const id = `${item.handle}:${item.tweetId}`
    track('x_reply_intent', { handle: item.handle, tweetId: item.tweetId })
    setAwaitingConfirm((prev) => ({ ...prev, [id]: true }))
  }

  function confirmPosted(item: RadarItem) {
    const id = `${item.handle}:${item.tweetId}`
    const draft = draftFor(item)
    setReplied(
      markReplied({
        tweetId: item.tweetId,
        handle: item.handle,
        markedAt: new Date().toISOString(),
        draft: draft ? draft.slice(0, 140) : undefined,
      }),
    )
    setAwaitingConfirm((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    track('x_replied', { handle: item.handle, tweetId: item.tweetId })
  }

  function dismissConfirm(item: RadarItem) {
    const id = `${item.handle}:${item.tweetId}`
    setAwaitingConfirm((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function undoPosted(item: RadarItem) {
    setReplied(unmarkReplied(item.tweetId))
  }

  async function copyReply(item: RadarItem) {
    const id = `${item.handle}:${item.tweetId}`
    const text = draftFor(item)
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      track('reply_copied', { handle: item.handle })
      window.setTimeout(() => setCopiedId(null), 1500)
    } catch {
      window.prompt('Copy manually:', text)
      track('reply_copied', { handle: item.handle })
    }
  }

  function refresh() {
    track('reply_radar_refreshed', { count: handles.length })
    void load(true)
  }

  const status = feedStatus({
    loading,
    itemCount: items.length,
    handleCount: handles.length,
    pendingHandles,
    elapsedSec: elapsed,
  })

  const tags = project?.builderTags
  const favs = project?.favoriteBuilders ?? []
  const categoryChips = usedBuilderTags(tags, favs)
  const showUncategorized = favs.some((h) => handleIsUncategorized(tags, h))

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      if (category === 'uncategorized') {
        if (!handleIsUncategorized(tags, item.handle)) return false
      } else if (category !== 'all') {
        if (!handleHasTag(tags, item.handle, category)) return false
      }
      if (q && !(item.text || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [items, query, category, tags])

  useEffect(() => {
    if (category === 'all') return
    if (category === 'uncategorized') {
      if (!showUncategorized) setCategory('all')
      return
    }
    if (!categoryChips.some((t) => t.toLowerCase() === category.toLowerCase())) {
      setCategory('all')
    }
  }, [category, categoryChips, showUncategorized])

  if (handles.length === 0) {
    return (
      <div className="space-y-2">
        <Header loading={false} onRefresh={refresh} disabled />
        <MoreBuildersLink />
        <p className="rounded-[28px] border border-dashed border-line bg-card/60 px-4 py-4 text-sm font-semibold text-muted">
          Add favorite builders to fill this feed.{' '}
          <a href="#follows" className="font-extrabold text-orange hover:underline">
            Suggested follows
          </a>
          {' · '}
          <a href="#setup" className="font-extrabold text-orange hover:underline">
            Setup
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Header loading={loading} onRefresh={refresh} disabled={loading} />
      <MoreBuildersLink />
      {status.text && (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-muted" aria-live="polite">
            {status.text}
          </p>
          {status.progress != null && (
            <div
              className="h-1 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(status.progress * 100)}
            >
              <div
                className="h-full rounded-full bg-orange transition-all duration-300"
                style={{ width: `${Math.max(8, Math.round(status.progress * 100))}%` }}
              />
            </div>
          )}
        </div>
      )}
      <FeedFilters
        query={query}
        onQuery={setQuery}
        category={category}
        onCategory={setCategory}
        tags={categoryChips}
        showUncategorized={showUncategorized}
      />
      {error && <p className="text-sm font-semibold text-orange-deep">{error}</p>}
      {loading && items.length === 0 && (
        <div className="space-y-3" aria-hidden>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
      {visible.map((item) => {
        const id = `${item.handle}:${item.tweetId}`
        const href = tweetUrl(item)
        const draft = customDrafts[id] || ''
        const draftEmpty = !draft.trim()
        const itemIdeas = ideas[id] ?? []
        const showIdeas = Boolean(ideasOpen[id])
        const marked = replied[item.tweetId]
        const awaiting = Boolean(awaitingConfirm[id]) && !marked
        return (
          <article key={id} className="card-soft overflow-hidden">
            <div className="m-2 rounded-2xl border border-line bg-white px-3 py-3 sm:m-2.5 sm:px-4 sm:py-3.5">
              <TweetBody item={item} href={href} />
            </div>
            {marked ? (
              <div className="border-t border-line bg-cream-2/70 px-3 py-2.5 sm:px-4">
                <p className="text-sm font-extrabold text-navy">
                  Replied {displayHandle(marked.handle)}
                  {marked.markedAt ? (
                    <span className="font-semibold text-muted">
                      {' '}
                      · {relativeTime(marked.markedAt) || 'just now'}
                    </span>
                  ) : null}
                </p>
                <button
                  type="button"
                  onClick={() => undoPosted(item)}
                  className="mt-1 text-sm font-extrabold text-orange hover:underline"
                >
                  Undo
                </button>
              </div>
            ) : (
              <div className="border-t border-line bg-cream-2/70 px-3 py-2.5 sm:px-4">
                <textarea
                  value={draft}
                  onChange={(e) =>
                    setCustomDrafts((prev) => ({ ...prev, [id]: e.target.value }))
                  }
                  placeholder="Write a reply"
                  rows={2}
                  maxLength={280}
                  className="input-soft min-h-[2.75rem] w-full resize-none px-2.5 py-1.5 text-[13px] font-semibold leading-snug"
                />
                <p className="mt-1.5 text-xs font-semibold text-muted">
                  {awaiting
                    ? 'Opened X with your reply. We can’t see if you posted — tap I posted it if you did.'
                    : 'X blocks apps from sending replies. This opens X with your text ready.'}
                </p>
                <div className="mt-1.5">
                  <button
                    type="button"
                    onClick={() => void loadIdeas(item)}
                    disabled={generating.has(id)}
                    className="text-sm font-extrabold text-orange hover:underline disabled:opacity-50"
                  >
                    {generating.has(id) ? 'Finding ideas…' : 'Need ideas?'}
                  </button>
                  {showIdeas && !generating.has(id) && itemIdeas.length > 0 && (
                    <ul className="mt-1.5 space-y-1" aria-label="Reply ideas">
                      {itemIdeas.map((reply, i) => {
                        const selected = draft.trim() === reply
                        return (
                          <li key={`${id}-idea-${i}`}>
                            <button
                              type="button"
                              onClick={() => applyIdea(item, reply)}
                              className={`w-full rounded-xl px-2.5 py-1.5 text-left text-[13px] font-semibold leading-snug ${
                                selected
                                  ? 'bg-orange/15 text-navy ring-1 ring-orange/35'
                                  : 'text-muted hover:bg-card/80 hover:text-navy'
                              }`}
                            >
                              {reply}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5 sm:px-4 sm:py-3">
              {marked ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => track('reply_handle_clicked', { handle: item.handle })}
                  className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 py-2.5 text-sm font-extrabold text-navy hover:border-orange/40"
                >
                  View post
                </a>
              ) : awaiting ? (
                <>
                  <button
                    type="button"
                    onClick={() => confirmPosted(item)}
                    className="btn-pill min-h-12 px-6 py-3 text-base"
                  >
                    I posted it
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissConfirm(item)}
                    className="min-h-11 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-extrabold text-navy hover:border-orange/40"
                  >
                    Not yet
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyReply(item)}
                    disabled={draftEmpty}
                    className="min-h-11 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-extrabold text-navy hover:border-orange/40 disabled:opacity-50"
                  >
                    {copiedId === id ? 'Copied ✓' : 'Copy reply'}
                  </button>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => track('reply_handle_clicked', { handle: item.handle })}
                    className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 py-2.5 text-sm font-extrabold text-navy hover:border-orange/40"
                  >
                    View post
                  </a>
                </>
              ) : (
                <>
                  {draftEmpty ? (
                    <button
                      type="button"
                      disabled
                      className="btn-pill min-h-12 px-6 py-3 text-base opacity-50"
                    >
                      Reply on X
                    </button>
                  ) : (
                    <a
                      href={xReplyIntentUrl(item.tweetId, draft.trim())}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => openReplyIntent(item)}
                      className="btn-pill min-h-12 px-6 py-3 text-base"
                    >
                      Reply on X
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => void copyReply(item)}
                    disabled={draftEmpty}
                    className="min-h-11 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-extrabold text-navy hover:border-orange/40 disabled:opacity-50"
                  >
                    {copiedId === id ? 'Copied ✓' : 'Copy reply'}
                  </button>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => track('reply_handle_clicked', { handle: item.handle })}
                    className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 py-2.5 text-sm font-extrabold text-navy hover:border-orange/40"
                  >
                    View post
                  </a>
                  {draftEmpty && (
                    <p className="basis-full text-xs font-semibold text-muted">Type a reply first.</p>
                  )}
                </>
              )}
            </div>
          </article>
        )
      })}
      {!loading && items.length === 0 && !error && (
        <p className="rounded-[28px] border border-dashed border-line bg-card/60 px-4 py-4 text-sm font-semibold text-muted">
          No public posts right now — try Refresh.
        </p>
      )}
      {!loading && items.length > 0 && visible.length === 0 && (
        <p className="rounded-[28px] border border-dashed border-line bg-card/60 px-4 py-4 text-sm font-semibold text-muted">
          {query.trim()
            ? `No posts mentioning “${query.trim()}”.`
            : category === 'uncategorized'
              ? 'No posts from uncategorized people.'
              : category !== 'all'
                ? `No posts from people tagged ${category}.`
                : 'No posts match this filter.'}
        </p>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <article className="card-soft overflow-hidden">
      <div className="m-2 animate-pulse rounded-2xl border border-line bg-white px-3 py-3 sm:m-2.5 sm:px-4 sm:py-3.5">
        <div className="flex gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-cream ring-1 ring-line" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <div className="h-3 w-36 rounded-full bg-cream" />
            <div className="h-3 w-full rounded-full bg-cream" />
            <div className="h-3 w-4/5 rounded-full bg-cream" />
          </div>
        </div>
      </div>
      <div className="animate-pulse border-t border-line bg-cream-2/70 px-3 py-2.5 sm:px-4">
        <div className="h-10 w-full rounded-xl bg-cream" />
      </div>
    </article>
  )
}

function TweetBody({ item, href }: { item: RadarItem; href: string }) {
  const name = displayNameOf(item)
  const handle = displayHandle(item.handle)
  const time = item.createdAt ? relativeTime(item.createdAt) : ''

  return (
    <div className="flex gap-3">
      <a href={href} target="_blank" rel="noreferrer" className="shrink-0">
        <Avatar name={name} src={item.avatarUrl} />
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="truncate text-[15px] font-extrabold leading-tight text-navy">{name}</span>
          <span className="truncate text-[13px] font-semibold text-muted">{handle}</span>
          {time && (
            <>
              <span className="text-[13px] font-semibold text-muted/70">·</span>
              <span className="text-[13px] font-semibold text-muted">{time}</span>
            </>
          )}
        </div>
        <PostText text={item.text} />
        <MediaGrid media={item.media ?? []} />
        <MetricsRow likes={item.likes} reposts={item.reposts} replies={item.replies} />
      </div>
    </div>
  )
}

function Avatar({ name, src }: { name: string; src: string }) {
  const [failed, setFailed] = useState(!src)
  const letter = (name.replace(/^@+/, '').trim()[0] || '?').toUpperCase()
  if (failed) {
    return (
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-sm font-extrabold text-orange ring-1 ring-line"
        aria-hidden
      >
        {letter}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      width={40}
      height={40}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-10 w-10 rounded-full object-cover ring-1 ring-line"
    />
  )
}

function PostText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    setExpanded(false)
  }, [text])

  useEffect(() => {
    const el = ref.current
    if (!el || expanded) return
    setOverflows(el.scrollHeight > el.clientHeight + 12)
  }, [text, expanded])

  return (
    <div className="mt-1">
      <p
        ref={ref}
        className={`whitespace-pre-wrap break-words text-[15px] font-semibold leading-relaxed text-navy ${
          expanded ? '' : 'max-h-[28rem] overflow-hidden'
        }`}
      >
        {text}
      </p>
      {overflows && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 text-sm font-extrabold text-orange hover:underline"
        >
          Show more
        </button>
      )}
    </div>
  )
}

function MediaGrid({ media }: { media: RadarMedia[] }) {
  const items = media.slice(0, 4)
  if (items.length === 0) return null
  const cols = items.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
  return (
    <div className={`mt-2.5 grid ${cols} gap-1 overflow-hidden rounded-2xl border border-line bg-cream`}>
      {items.map((m, i) => (
        <MediaTile key={`${m.url}-${i}`} media={m} solo={items.length === 1} />
      ))}
    </div>
  )
}

function MediaTile({ media, solo }: { media: RadarMedia; solo: boolean }) {
  const frame = solo ? 'aspect-video max-h-72 w-full' : 'aspect-video w-full'
  if (media.type === 'video' || media.type === 'gif') {
    const gif = media.type === 'gif'
    return (
      <video
        src={media.url}
        poster={media.thumbnailUrl}
        controls={!gif}
        muted={gif}
        loop={gif}
        autoPlay={gif}
        playsInline
        preload="metadata"
        className={`${frame} bg-navy/10 object-cover`}
      />
    )
  }
  return (
    <img
      src={media.url}
      alt=""
      referrerPolicy="no-referrer"
      className={`${frame} object-cover`}
    />
  )
}

function MetricsRow({
  likes,
  reposts,
  replies,
}: {
  likes: number | null
  reposts: number | null
  replies: number | null
}) {
  const bits: Array<{ label: string; n: number }> = []
  if (replies != null) bits.push({ label: '💬', n: replies })
  if (reposts != null) bits.push({ label: '↻', n: reposts })
  if (likes != null) bits.push({ label: '♡', n: likes })
  if (bits.length === 0) return null
  return (
    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-bold text-muted">
      {bits.map((b) => (
        <span key={b.label}>
          <span className="mr-1 font-semibold text-muted/80">{b.label}</span>
          {formatCount(b.n)}
        </span>
      ))}
    </p>
  )
}

function MoreBuildersLink() {
  return (
    <p className="text-sm font-semibold text-muted">
      <a href="#follows" className="font-extrabold text-orange hover:underline">
        More builders to follow →
      </a>
    </p>
  )
}

function FeedFilters({
  query,
  onQuery,
  category,
  onCategory,
  tags,
  showUncategorized,
}: {
  query: string
  onQuery: (q: string) => void
  category: string
  onCategory: (c: string) => void
  tags: string[]
  showUncategorized: boolean
}) {
  const chips: Array<{ id: string; label: string }> = [{ id: 'all', label: 'All' }]
  for (const t of tags) chips.push({ id: t, label: t })
  if (showUncategorized) chips.push({ id: 'uncategorized', label: 'Uncategorized' })

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-muted">Filter people, or search what they posted.</p>
      <label className="block">
        <span className="sr-only">Posts mentioning</span>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          className="input-soft min-h-11 w-full text-sm"
          placeholder="Posts mentioning …"
          type="search"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
        {chips.map((c) => {
          const on = category === c.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onCategory(c.id)}
              aria-pressed={on}
              className={
                on
                  ? 'inline-flex min-h-8 items-center rounded-full bg-orange px-3 text-xs font-extrabold text-white'
                  : 'inline-flex min-h-8 items-center rounded-full border border-line bg-card px-3 text-xs font-extrabold text-navy hover:border-orange/40'
              }
            >
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Header({
  loading,
  onRefresh,
  disabled,
}: {
  loading: boolean
  onRefresh: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h3 className="text-lg font-extrabold tracking-tight text-navy">Your feed</h3>
        <p className="text-sm text-muted">
          Write a reply, then Reply on X. After you post, tap I posted it.
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={disabled}
        className="min-h-11 rounded-full border border-line bg-card px-4 py-2 text-sm font-extrabold text-navy hover:border-orange/40 disabled:opacity-50"
      >
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  )
}
