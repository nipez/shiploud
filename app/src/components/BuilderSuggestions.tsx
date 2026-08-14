import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { fetchBuilderPreview, fetchBuilderProfiles, type BuilderPreviewPost, type BuilderProfile } from '../api'
import {
  displayHandle,
  handleKey,
  suggestionsLikeFavorites,
  suggestionsTitle,
  xProfileUrl,
  type BuilderSuggestion,
  BUILDER_GRAPH,
} from '../builderGraph'
import { tagsForHandle, usedBuilderTags, type BuilderTags } from '../types'
import BuilderTagPicker from './BuilderTagPicker'

const ADD_TIP = 'Show their posts in your ShipLoud feed. Doesn’t follow them on X.'

type Props = {
  favoriteBuilders: string[]
  builderTags?: BuilderTags
  onAdd?: (handle: string) => void
  onSetTags?: (handle: string, tags: string[]) => void
  /** setup = Setup section; page = Suggested follows tab; compact = tiny teaser */
  variant?: 'setup' | 'page' | 'compact'
  /** @deprecated use variant="compact" */
  compact?: boolean
}

export default function BuilderSuggestions({
  favoriteBuilders,
  builderTags,
  onAdd,
  onSetTags,
  variant,
  compact,
}: Props) {
  const mode = variant ?? (compact ? 'compact' : 'setup')
  const [justAdded, setJustAdded] = useState<Set<string>>(() => new Set())
  const [profiles, setProfiles] = useState<Record<string, BuilderProfile>>({})

  const pending = useMemo(
    () => suggestionsLikeFavorites(favoriteBuilders, mode === 'compact' ? 5 : undefined),
    [favoriteBuilders, mode],
  )

  const items = useMemo(() => {
    if (mode === 'compact' || justAdded.size === 0) return pending
    const have = new Set(pending.map((b) => handleKey(b.handle)))
    const extra = BUILDER_GRAPH.filter((b) => justAdded.has(handleKey(b.handle)) && !have.has(handleKey(b.handle)))
    return [...extra, ...pending]
  }, [pending, justAdded, mode])

  useEffect(() => {
    if (mode === 'compact' || items.length === 0) return
    let cancelled = false
    void fetchBuilderProfiles(items.map((b) => b.handle)).then((list) => {
      if (cancelled) return
      const next: Record<string, BuilderProfile> = {}
      for (const p of list) next[handleKey(p.handle)] = p
      setProfiles((prev) => ({ ...prev, ...next }))
    })
    return () => {
      cancelled = true
    }
  }, [mode, items])

  if (items.length === 0) {
    if (mode === 'page') {
      return (
        <p className="rounded-[28px] border border-dashed border-line bg-card/60 px-4 py-6 text-sm font-semibold text-muted">
          You’re following everyone we curated. Add anyone with the box above.
        </p>
      )
    }
    return null
  }

  const title = suggestionsTitle(favoriteBuilders)

  if (mode === 'compact') {
    return (
      <div className="rounded-[28px] border border-dashed border-line bg-card/60 px-4 py-4">
        <p className="text-sm font-extrabold text-navy">{title}</p>
        <p className="mt-0.5 text-xs font-semibold text-muted">
          A starter list we put together — indie founders and vibe-coders who build in public. Same list for everyone, not personalized.
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((b) => (
            <li key={b.handle}>
              <span className="inline-flex rounded-full border border-line bg-cream-2 px-2.5 py-1 text-xs font-extrabold text-navy">
                {displayHandle(b.handle)}
              </span>
            </li>
          ))}
        </ul>
        <a href="#follows" className="mt-2 inline-flex min-h-9 items-center text-sm font-extrabold text-orange hover:underline">
          See all suggested follows
        </a>
      </div>
    )
  }

  function addToFeed(handle: string) {
    setJustAdded((prev) => new Set(prev).add(handleKey(handle)))
    onAdd?.(handle)
  }

  return (
    <div className={mode === 'setup' ? 'space-y-3 border-t border-line pt-4' : 'space-y-3.5'}>
      {mode === 'setup' && (
        <div className="space-y-0.5">
          <h3 className="text-sm font-extrabold text-navy">{title}</h3>
          <p className="text-xs font-semibold text-muted">
            A starter list we put together — indie founders and vibe-coders who build in public. Same list for everyone, not personalized.
          </p>
        </div>
      )}
      <ul className="grid gap-3.5 overflow-visible sm:grid-cols-2">
        {items.map((b) => (
          <SuggestionCard
            key={b.handle}
            item={b}
            profile={profiles[handleKey(b.handle)]}
            added={justAdded.has(handleKey(b.handle))}
            onAdd={onAdd ? addToFeed : undefined}
            tags={tagsForHandle(builderTags, b.handle)}
            extraTags={usedBuilderTags(builderTags, favoriteBuilders)}
            onSetTags={onSetTags}
            previewEnabled={mode === 'page'}
            tight={mode === 'page'}
            showTags={mode !== 'page'}
          />
        ))}
      </ul>
    </div>
  )
}

function formatFollowers(n: number): string {
  if (n < 1000) return n.toLocaleString('en-US')
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  if (n < 1_000_000) {
    const k = n / 1000
    return k >= 100 ? `${Math.round(k)}K` : `${k.toFixed(1).replace(/\.0$/, '')}K`
  }
  const m = n / 1_000_000
  return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, '')}M`
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

function SuggestionCard({
  item,
  profile,
  added,
  onAdd,
  tags,
  extraTags,
  onSetTags,
  previewEnabled,
  tight,
  showTags,
}: {
  item: BuilderSuggestion
  profile?: BuilderProfile
  added: boolean
  onAdd?: (handle: string) => void
  tags: string[]
  extraTags: string[]
  onSetTags?: (handle: string, tags: string[]) => void
  previewEnabled: boolean
  tight?: boolean
  showTags?: boolean
}) {
  const handle = displayHandle(item.handle)
  const name = profile?.name || handle.replace(/^@/, '')
  const bio = (profile?.bio || '').trim() || item.why
  const followers = profile?.followers ?? null
  const avatar = profile?.avatarUrl || ''
  const [sheetOpen, setSheetOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [posts, setPosts] = useState<BuilderPreviewPost[]>([])

  function loadPreview() {
    if (status === 'loading' || status === 'ready') return
    setStatus('loading')
    void fetchBuilderPreview(item.handle).then((list) => {
      if (list === null) {
        setStatus('error')
        return
      }
      setPosts(list)
      setStatus('ready')
    })
  }

  function openSheet() {
    if (!previewEnabled) return
    setSheetOpen(true)
    loadPreview()
  }

  function onCardClick(e: ReactMouseEvent<HTMLLIElement>) {
    if (!previewEnabled) return
    const el = e.target as HTMLElement | null
    if (el?.closest('button, a, [data-no-preview]')) return
    openSheet()
  }

  useEffect(() => {
    if (!sheetOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [sheetOpen])

  return (
    <li
      className={`relative flex flex-col overflow-visible rounded-[22px] border border-line bg-card shadow-[0_8px_24px_rgba(43,27,77,.05)] ${
        tight ? 'gap-2.5 px-[18px] py-4' : 'gap-3 px-3.5 py-3.5'
      } ${previewEnabled ? 'cursor-pointer' : ''}`}
      onClick={onCardClick}
    >
      <div className="mb-[9px] flex items-center gap-[11px]">
        <Avatar name={name} src={avatar} size={tight ? 40 : 48} />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-[14.5px] font-black leading-tight text-navy">{name}</p>
          <p className="truncate text-xs font-bold text-muted">
            {handle}
            {followers != null ? ` · ${formatFollowers(followers)} followers` : ''}
          </p>
        </div>
      </div>
      <p className="mb-[13px] line-clamp-2 min-h-[37px] text-[12.5px] font-bold leading-normal text-muted">{bio}</p>
      <div className="mt-auto space-y-2.5" data-no-preview>
        <div className="flex flex-wrap items-center gap-2">
          {onAdd &&
            (added ? (
              <span
                className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-sticker-mint bg-sticker-mint/25 px-[15px] py-[7px] text-xs font-black text-navy"
                title="Their posts show in your ShipLoud feed"
              >
                ✓ In your feed
              </span>
            ) : (
              <AddToFeedButton onClick={() => onAdd(handle)} />
            ))}
          <a
            href={xProfileUrl(item.handle)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-[15px] py-[7px] text-xs font-extrabold text-navy no-underline hover:border-navy"
          >
            Follow on X
          </a>
        </div>
        {added && onSetTags && showTags !== false && (
          <BuilderTagPicker
            selected={tags}
            extraTags={extraTags}
            onChange={(next) => onSetTags(handle, next)}
          />
        )}
      </div>
      {previewEnabled && sheetOpen && (
        <PreviewSheet name={name} handle={handle} status={status} posts={posts} onClose={() => setSheetOpen(false)} />
      )}
    </li>
  )
}

function PreviewSheet({
  name,
  handle,
  status,
  posts,
  onClose,
}: {
  name: string
  handle: string
  status: 'idle' | 'loading' | 'ready' | 'error'
  posts: BuilderPreviewPost[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Recent posts from ${handle}`}>
      <button type="button" className="absolute inset-0 bg-navy/40" aria-label="Close preview" onClick={onClose} />
      <div className="relative z-10 max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-card p-4 shadow-xl sm:rounded-3xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold text-navy">{name}</p>
            <p className="truncate font-mono text-xs font-semibold text-muted">{handle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-cream-2 text-base font-extrabold text-navy hover:border-orange/40"
          >
            ×
          </button>
        </div>
        <PreviewBody status={status} posts={posts} />
      </div>
    </div>
  )
}

function PreviewBody({
  status,
  posts,
}: {
  status: 'idle' | 'loading' | 'ready' | 'error'
  posts: BuilderPreviewPost[]
}) {
  if (status === 'idle' || status === 'loading') {
    return <p className="text-xs font-semibold text-muted">Loading posts…</p>
  }
  if (status === 'error') {
    return <p className="text-xs font-semibold text-muted">Couldn’t load posts</p>
  }
  if (posts.length === 0) {
    return <p className="text-xs font-semibold text-muted">No recent public posts</p>
  }
  return (
    <ul className="space-y-2.5">
      {posts.map((p, i) => (
        <li key={`${p.createdAt}-${i}`} className="flex gap-2.5">
          {p.mediaUrl ? (
            <img
              src={p.mediaUrl}
              alt=""
              width={48}
              height={48}
              referrerPolicy="no-referrer"
              className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-line"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-3 text-xs font-semibold leading-snug text-navy">{p.text}</p>
            {p.createdAt ? (
              <p className="mt-0.5 text-[11px] font-extrabold text-muted">{relativeTime(p.createdAt)}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

function AddToFeedButton({ onClick }: { onClick: () => void }) {
  return (
    <span className="group/add relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        title={ADD_TIP}
        aria-label="Add to feed"
        className="btn-pill min-h-9 px-3.5 text-xs"
      >
        Add to feed
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+8px)] left-0 z-20 w-56 rounded-xl border border-line bg-navy px-2.5 py-2 text-left text-[11px] font-bold leading-snug text-cream opacity-0 shadow-lg transition-opacity duration-150 group-hover/add:opacity-100 group-focus-within/add:opacity-100"
      >
        {ADD_TIP}
      </span>
    </span>
  )
}

function Avatar({ name, src, size = 48 }: { name: string; src: string; size?: number }) {
  const [failed, setFailed] = useState(!src)
  useEffect(() => {
    setFailed(!src)
  }, [src])
  const letter = (name.replace(/^@+/, '').trim()[0] || '?').toUpperCase()
  const colors = ['#FFE566', '#FF8FB8', '#7DFFB3', '#7EC8FF', '#C9A8FF']
  const color = colors[letter.charCodeAt(0) % colors.length]
  if (failed) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full border-2 border-navy font-black text-navy"
        style={{ width: size, height: size, background: color, fontSize: size > 38 ? 16 : 15 }}
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
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full border-2 border-navy object-cover"
      style={{ width: size, height: size }}
    />
  )
}
