import { useEffect, useMemo, useRef, useState } from 'react'
import type { Draft, JournalEntry, ReplyTarget, Setup as SetupType } from './types'
import { activeProject, dropHandleTags, normalizeHandle, setHandleTags } from './types'
import { resetData } from './storage'
import { generateDraftsFromJournal, isShortEnough } from './generate'
import { useCloudSync } from './useCloudSync'
import { createInvite, isAdminRole } from './api'
import { useXConnection } from './useXConnection'
import { localEventCounts } from './track'
import Today from './components/Today'
import Drafts from './components/Drafts'
import Queue from './components/Queue'
import Setup from './components/Setup'
import Follows from './components/Follows'
import Login from './components/Login'
import WeeklyReceipts from './components/WeeklyReceipts'
import Toast from './components/Toast'

type Tab = 'today' | 'radar' | 'builders' | 'receipts' | 'setup'

const HASH_ALIASES: Record<string, Tab> = {
  today: 'today',
  journal: 'today',
  drafts: 'today',
  posts: 'today',
  queue: 'radar',
  radar: 'radar',
  replies: 'radar',
  feed: 'radar',
  follows: 'builders',
  suggestions: 'builders',
  builders: 'builders',
  receipts: 'receipts',
  setup: 'setup',
}

function parseHash(): Tab {
  const hash = window.location.hash.replace('#', '')
  if (hash in HASH_ALIASES) return HASH_ALIASES[hash]
  return 'today'
}

function SmileMark({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="6.5" cy="7.5" r="1.6" fill="#fff" />
      <circle cx="13.5" cy="7.5" r="1.6" fill="#fff" />
      <path
        d="M5.5 12c1.2 1.7 3 2.6 4.5 2.6s3.3-.9 4.5-2.6"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function NavIcon({ id }: { id: Tab }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor' } as const
  switch (id) {
    case 'today':
      return (
        <svg {...common} strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      )
    case 'radar':
      return (
        <svg {...common} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.8 8.8 0 0 1-3.2-.6L3 21l1.8-5.4a8 8 0 0 1-1.3-4.1A8.4 8.4 0 0 1 12 3.2a8.4 8.4 0 0 1 9 8.3Z" />
        </svg>
      )
    case 'builders':
      return (
        <svg {...common} strokeWidth="2.4" strokeLinecap="round">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
          <path d="M17 8h5M19.5 5.5v5" />
        </svg>
      )
    case 'receipts':
      return (
        <svg {...common} strokeWidth="2.4" strokeLinecap="round">
          <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
        </svg>
      )
    case 'setup':
      return (
        <svg {...common} strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h0a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
        </svg>
      )
  }
}

function NavBtn({
  id,
  label,
  active,
  chip,
  onClick,
}: {
  id: Tab
  label: string
  active: boolean
  chip?: number | null
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-full px-3.5 py-[11px] text-left text-sm font-extrabold ${
        active ? 'bg-orange text-white shadow-[0_3px_0_#C9440A]' : 'bg-transparent text-navy'
      }`}
    >
      <NavIcon id={id} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {chip != null && chip > 0 && (
        <span
          className={`rounded-full px-2 py-px text-[11px] font-black ${
            active ? 'bg-white/20 text-white' : 'bg-orange/15 text-orange-deep'
          }`}
        >
          {chip}
        </span>
      )}
    </button>
  )
}

export default function App() {
  const {
    data,
    persist,
    persistImmediate,
    syncStatus,
    statusLabel,
    needsLogin,
    login,
    loginEmail,
    signup,
    logout,
    bootError,
    apiConfigured,
    user,
  } = useCloudSync()

  const xConnection = useXConnection(!needsLogin)
  const [tab, setTab] = useState<Tab>(parseHash)
  const [menuOpen, setMenuOpen] = useState(false)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<number | null>(null)

  function showToast(message: string) {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2400)
  }

  useEffect(() => {
    window.location.hash = tab
  }, [tab])

  useEffect(() => {
    const onHash = () => setTab(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const draftsOpen = useMemo(
    () =>
      data?.drafts.filter(
        (d) => d.status !== 'approved' && d.status !== 'posted' && isShortEnough(d.text),
      ).length ?? 0,
    [data],
  )

  const autoShortRef = useRef(false)
  useEffect(() => {
    if (!data || syncStatus === 'loading') return
    if (autoShortRef.current) return
    const project = activeProject(data.setup)
    const pending = data.drafts.filter(
      (d) =>
        d.status !== 'approved' &&
        d.status !== 'posted' &&
        (!d.projectId || !project?.id || d.projectId === project.id),
    )
    const shorts = pending.filter((d) => isShortEnough(d.text))
    if (shorts.length > 0) {
      autoShortRef.current = true
      return
    }
    const journal =
      data.journals
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))[0] ??
      null
    if (!journal) {
      autoShortRef.current = true
      return
    }
    autoShortRef.current = true
    const fresh = generateDraftsFromJournal(journal, data.setup)
    const usable = fresh.filter((d) => isShortEnough(d.text)).slice(0, 3)
    const kept = data.drafts.filter((d) => {
      if (d.status === 'approved' || d.status === 'posted') return true
      if (!isShortEnough(d.text)) return false
      if (!project?.id) return false
      if (d.projectId === project.id) return false
      if (!d.projectId && project.id === data.setup.activeProjectId) return false
      return true
    })
    persistImmediate({ ...data, drafts: [...usable, ...kept] })
  }, [data, syncStatus, persistImmediate])

  if (needsLogin) {
    return <Login onPassphraseLogin={login} onEmailLogin={loginEmail} onSignup={signup} />
  }

  if (!data || syncStatus === 'loading') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-4 text-muted">
        <p className="font-semibold">{syncStatus === 'loading' ? 'Syncing…' : 'Loading…'}</p>
        {bootError && <p className="text-center text-xs text-muted">Fallback: {bootError}</p>}
      </div>
    )
  }

  const store = data
  const project = activeProject(store.setup)

  function saveJournal(entry: JournalEntry) {
    const others = store.journals.filter((j) => j.date !== entry.date)
    persist({ ...store, journals: [entry, ...others] })
  }

  function clearPendingAndPrepend(
    nextDrafts: Draft[],
    clearPendingForProjectId?: string,
    immediate = false,
  ) {
    const kept = store.drafts.filter((d) => {
      if (d.status !== 'approved' && d.status !== 'posted' && !isShortEnough(d.text)) return false
      if (d.status === 'approved' || d.status === 'posted') return true
      if (!clearPendingForProjectId) return false
      if (d.projectId === clearPendingForProjectId) return false
      if (!d.projectId && clearPendingForProjectId === store.setup.activeProjectId) return false
      return true
    })
    const usable = nextDrafts.filter((d) => isShortEnough(d.text)).slice(0, 3)
    const next = { ...store, drafts: [...usable, ...kept] }
    if (immediate) persistImmediate(next)
    else persist(next)
  }

  function addDrafts(drafts: Draft[]) {
    clearPendingAndPrepend(drafts, store.setup.activeProjectId, true)
    setTab('today')
  }

  function updateDraft(id: string, patch: Partial<Draft>) {
    persist({
      ...store,
      drafts: store.drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })
  }

  function deleteDraft(id: string) {
    persist({ ...store, drafts: store.drafts.filter((d) => d.id !== id) })
  }

  function regenDrafts(nextDrafts: Draft[], clearPendingForProjectId?: string) {
    clearPendingAndPrepend(nextDrafts, clearPendingForProjectId, true)
  }

  function addReply(r: ReplyTarget) {
    persist({ ...store, replies: [r, ...store.replies] })
  }

  function updateReply(id: string, patch: Partial<ReplyTarget>) {
    persist({
      ...store,
      replies: store.replies.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })
  }

  function saveSetup(setup: SetupType) {
    persist({ ...store, setup })
    showToast('setup saved')
  }

  function addFavoriteBuilder(handle: string) {
    const proj = activeProject(store.setup)
    if (!proj) return
    const h = normalizeHandle(handle)
    if (!h) return
    const have = proj.favoriteBuilders.map(normalizeHandle).filter(Boolean)
    if (have.includes(h)) return
    persistImmediate({
      ...store,
      setup: {
        ...store.setup,
        projects: store.setup.projects.map((p) =>
          p.id === proj.id ? { ...p, favoriteBuilders: [...have, h] } : p,
        ),
        updatedAt: new Date().toISOString(),
      },
    })
    showToast('handle added')
  }

  function removeFavoriteBuilder(handle: string) {
    const proj = activeProject(store.setup)
    if (!proj) return
    const n = normalizeHandle(handle)
    if (!n) return
    persistImmediate({
      ...store,
      setup: {
        ...store.setup,
        projects: store.setup.projects.map((p) =>
          p.id === proj.id
            ? {
                ...p,
                favoriteBuilders: p.favoriteBuilders.filter((h) => normalizeHandle(h) !== n),
                builderTags: dropHandleTags(p.builderTags, n),
              }
            : p,
        ),
        updatedAt: new Date().toISOString(),
      },
    })
    showToast('handle removed')
  }

  function setFavoriteBuilderTags(handle: string, tags: string[]) {
    const proj = activeProject(store.setup)
    if (!proj) return
    const h = normalizeHandle(handle)
    if (!h) return
    persistImmediate({
      ...store,
      setup: {
        ...store.setup,
        projects: store.setup.projects.map((p) =>
          p.id === proj.id ? { ...p, builderTags: setHandleTags(p.builderTags, h, tags) } : p,
        ),
        updatedAt: new Date().toISOString(),
      },
    })
  }

  function setActiveProject(projectId: string) {
    persist({
      ...store,
      setup: { ...store.setup, activeProjectId: projectId, updatedAt: new Date().toISOString() },
    })
  }

  function handleReset() {
    setMenuOpen(false)
    if (window.confirm('Reset to starter data?')) {
      persist(resetData())
      setTab('today')
    }
  }

  async function handleInviteFounder() {
    setMenuOpen(false)
    setInviteError(null)
    setInviteBusy(true)
    try {
      const code = await createInvite()
      setInviteCode(code)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'invite_failed')
      setInviteCode(null)
    } finally {
      setInviteBusy(false)
    }
  }

  const weekCounts = localEventCounts()
  const weekLine = `${weekCounts.drafts_generated || draftsOpen} drafts · ${weekCounts.draft_marked_posted || 0} posted · ${weekCounts.x_replied || 0} replies marked`
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const projectLine = [project?.goal, project?.voice].filter(Boolean).join(' · ') || '$10K MRR and beyond · short lines, numbers, no guru speak'

  const navItems: { id: Tab; label: string; chip?: number }[] = [
    { id: 'today', label: 'Today', chip: draftsOpen },
    { id: 'radar', label: 'Reply radar' },
    { id: 'builders', label: 'Builders' },
    { id: 'receipts', label: 'Receipts' },
  ]

  const sidebar = (
    <aside className="card-soft sticky top-3.5 m-3.5 flex h-[calc(100vh-28px)] w-[240px] shrink-0 flex-col rounded-[26px] px-3.5 pb-3.5 pt-[18px]">
      <div className="mb-4 flex items-center gap-2.5 px-1.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange shadow-[0_3px_0_#C9440A]">
          <SmileMark />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-black leading-none tracking-[-0.01em]">
            <span className="text-navy">Ship</span>
            <span className="text-orange">Loud</span>
          </span>
          <span className="sticker-hand self-start -rotate-2 bg-sticker-yellow !rounded-lg !border-2 !px-2 !py-0 !text-[15px]">
            beta
          </span>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((n) => (
          <NavBtn
            key={n.id}
            id={n.id}
            label={n.label}
            active={tab === n.id}
            chip={n.chip}
            onClick={() => setTab(n.id)}
          />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2.5">
        <div className="rounded-[18px] border border-line bg-cream-2 px-3.5 py-3">
          <p className="mb-[7px] text-[10px] font-black tracking-[0.09em] text-muted">ACTIVE PROJECT</p>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange" />
            <span className="min-w-0 flex-1 truncate text-sm font-black">{project?.name || 'ShipLoud'}</span>
            <button
              type="button"
              onClick={() => setTab('setup')}
              className="text-xs font-extrabold text-orange hover:text-orange-deep"
            >
              Switch
            </button>
          </div>
          <p className="mt-2 text-[11.5px] font-bold leading-snug text-muted">{projectLine}</p>
        </div>
        <div className="flex items-center gap-2 px-1.5">
          <span
            className={`h-[9px] w-[9px] shrink-0 rounded-full ${
              xConnection.connected ? 'border-2 border-navy bg-sticker-mint' : 'bg-line'
            }`}
          />
          <span className="truncate text-xs font-extrabold text-muted">
            {xConnection.connected ? `X: @${xConnection.handle || 'x'}` : 'X not connected'}
          </span>
        </div>
        <NavBtn id="setup" label="Setup" active={tab === 'setup'} onClick={() => setTab('setup')} />
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-dvh items-stretch">
      <div className="hidden lg:block">{sidebar}</div>
      <main className="min-w-0 flex-1 px-4 pb-24 pt-[22px] sm:px-9 lg:pb-[72px]">
        <div className="mx-auto max-w-[1060px]">
          <div className="mb-3.5 flex items-center justify-end gap-2 text-xs font-extrabold text-muted">
            <span className="h-[7px] w-[7px] rounded-full border-[1.5px] border-navy bg-sticker-mint" />
            <span>{statusLabel || 'Synced'}</span>
            <span className="text-line">·</span>
            <span>{todayLabel}</span>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="More options"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:text-navy"
              >
                ···
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 min-w-[10.5rem] overflow-hidden rounded-2xl border border-line bg-card py-1 shadow-lg">
                  {apiConfigured && (
                    <button
                      type="button"
                      onClick={() => void handleInviteFounder()}
                      disabled={inviteBusy}
                      className="block w-full px-4 py-2.5 text-left text-sm font-extrabold text-navy hover:bg-cream-2"
                    >
                      {inviteBusy ? 'Creating invite…' : 'Invite a founder'}
                    </button>
                  )}
                  {apiConfigured && isAdminRole(user?.role) && (
                    <a
                      href="https://www.getshiploud.com/admin"
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className="block w-full px-4 py-2.5 text-left text-sm font-extrabold text-navy hover:bg-cream-2"
                    >
                      Waitlist
                    </a>
                  )}
                  {apiConfigured && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        logout()
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm font-extrabold text-navy hover:bg-cream-2"
                    >
                      Log out
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="block w-full px-4 py-2.5 text-left text-sm font-extrabold text-muted hover:bg-cream-2 hover:text-navy"
                  >
                    Reset data
                  </button>
                </div>
              )}
            </div>
          </div>

          {(xConnection.banner || xConnection.error) && (
            <div
              className={`mb-4 flex items-start justify-between gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold ${
                xConnection.error && !xConnection.banner
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-orange/30 bg-orange/10 text-navy'
              }`}
            >
              <p>{xConnection.banner || xConnection.error}</p>
              <button
                type="button"
                className="shrink-0 text-xs font-extrabold text-muted hover:text-navy"
                onClick={() => xConnection.clearBanner()}
              >
                Dismiss
              </button>
            </div>
          )}

          {tab === 'today' && (
            <Today
              journals={data.journals}
              setup={data.setup}
              onSave={saveJournal}
              onGeneratedDrafts={addDrafts}
              onSetActiveProject={setActiveProject}
              onToast={showToast}
            >
              <Drafts
                drafts={data.drafts}
                journals={data.journals}
                setup={data.setup}
                onUpdate={updateDraft}
                onDelete={deleteDraft}
                onRegen={regenDrafts}
                xConnection={xConnection}
                onOpenSetup={() => setTab('setup')}
                onToast={showToast}
                weekLine={weekLine}
                onSeeReceipts={() => setTab('receipts')}
              />
            </Today>
          )}
          {tab === 'radar' && (
            <Queue
              drafts={data.drafts}
              replies={data.replies}
              setup={data.setup}
              onMarkPosted={(id) =>
                updateDraft(id, { status: 'posted', updatedAt: new Date().toISOString() })
              }
              onMarkReplied={(id) => updateReply(id, { status: 'replied' })}
              onAddReply={addReply}
              xConnection={xConnection}
              onToast={showToast}
            />
          )}
          {tab === 'builders' && (
            <Follows
              favoriteBuilders={project?.favoriteBuilders ?? []}
              builderTags={project?.builderTags}
              onAdd={addFavoriteBuilder}
              onRemove={removeFavoriteBuilder}
              onSetTags={setFavoriteBuilderTags}
            />
          )}
          {tab === 'receipts' && (
            <WeeklyReceipts
              metrics={data.metrics}
              xHandle={project?.xHandle ?? ''}
              onSaveMetrics={(metrics) => persist({ ...store, metrics })}
              standalone
            />
          )}
          {tab === 'setup' && (
            <Setup
              setup={data.setup}
              onSave={saveSetup}
              onBack={() => setTab('today')}
              xConnection={xConnection}
              onSetActiveProject={setActiveProject}
            />
          )}
        </div>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream-2/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {([...navItems, { id: 'setup' as Tab, label: 'Setup' }]).map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setTab(n.id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[10px] font-extrabold ${
                tab === n.id ? 'text-orange' : 'text-muted'
              }`}
            >
              <NavIcon id={n.id} />
              <span className="whitespace-nowrap">{n.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {(inviteCode || inviteError) && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-navy/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setInviteCode(null)
            setInviteError(null)
          }}
        >
          <div className="card-soft w-full max-w-sm p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-base font-extrabold text-navy">Invite a founder</h2>
            {inviteError ? (
              <p className="mb-4 text-sm font-semibold text-red-700">{inviteError}</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted">Copy this code once — it can only be used for one signup.</p>
                <p className="mb-4 select-all rounded-xl border border-line bg-cream-2 px-3 py-3 text-center font-mono text-lg font-extrabold tracking-wider text-navy">
                  {inviteCode}
                </p>
              </>
            )}
            <button
              type="button"
              className="min-h-11 w-full rounded-full border border-line bg-card px-4 text-sm font-extrabold text-navy"
              onClick={() => {
                setInviteCode(null)
                setInviteError(null)
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  )
}
