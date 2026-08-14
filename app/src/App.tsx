import { useEffect, useMemo, useRef, useState } from 'react'
import type { Draft, JournalEntry, ReplyTarget, Setup as SetupType } from './types'
import { activeProject, dropHandleTags, isSetupEmpty, normalizeHandle, setHandleTags } from './types'
import { resetData } from './storage'
import { generateDraftsFromJournal, isShortEnough } from './generate'
import { useCloudSync } from './useCloudSync'
import { createInvite, isAdminRole } from './api'
import { useXConnection } from './useXConnection'
import Today from './components/Today'
import Drafts from './components/Drafts'
import Queue from './components/Queue'
import Setup from './components/Setup'
import Follows from './components/Follows'
import Login from './components/Login'
import EarlySticker from './components/EarlySticker'
import { CANONICAL_SHIPLOUD_URL } from './url'

type Tab = 'journal' | 'feed' | 'follows'

const TABS: { id: Tab; label: string; shortLabel: string }[] = [
  { id: 'journal', label: 'Journal', shortLabel: 'Journal' },
  { id: 'feed', label: 'Feed', shortLabel: 'Feed' },
  { id: 'follows', label: 'Suggested follows', shortLabel: 'Follows' },
]

/** Old hashes keep working; parseHash maps them to the new tab ids. */
const HASH_ALIASES: Record<string, Tab> = {
  today: 'journal',
  drafts: 'journal',
  posts: 'journal',
  queue: 'feed',
  radar: 'feed',
  replies: 'feed',
  journal: 'journal',
  feed: 'feed',
  follows: 'follows',
  suggestions: 'follows',
  builders: 'follows',
}

const DRAFTS_HASHES = new Set(['drafts', 'posts'])

const BANNER_KEY = 'shiploud-setup-banner-dismissed'

function Logo() {
  return (
    <div className="inline-flex min-w-0 items-center gap-1.5 sm:gap-2.5">
      <a
        href={CANONICAL_SHIPLOUD_URL}
        className="inline-flex min-w-0 items-center gap-1.5 sm:gap-2 font-extrabold tracking-tight text-[15px] sm:text-base text-navy transition hover:opacity-90"
        aria-label="ShipLoud home"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line bg-card shadow-sm">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden>
            <path
              d="M8 22 L16 6 L24 22"
              stroke="#FF6A2B"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M11 17 H21" stroke="#FF6A2B" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </span>
        <span className="truncate whitespace-nowrap">
          Ship<span className="text-orange">Loud</span>
        </span>
      </a>
      <EarlySticker />
      <a
        href={CANONICAL_SHIPLOUD_URL}
        className="hidden sm:inline text-xs font-extrabold text-muted transition hover:text-orange"
      >
        Home
      </a>
    </div>
  )
}

function TabIcon({ id }: { id: Tab }) {
  const common = 'h-5 w-5'
  switch (id) {
    case 'journal':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )
    case 'feed':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    case 'follows':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
      )
  }
}

function parseHash(): { tab: Tab; setup: boolean; focusDrafts: boolean } {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'setup') return { tab: 'journal', setup: true, focusDrafts: false }
  if (hash in HASH_ALIASES) {
    return { tab: HASH_ALIASES[hash], setup: false, focusDrafts: DRAFTS_HASHES.has(hash) }
  }
  return { tab: 'journal', setup: false, focusDrafts: false }
}

function scrollToDrafts() {
  document.getElementById('drafts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  const initial = parseHash()
  const [tab, setTab] = useState<Tab>(initial.tab)
  const [showSetup, setShowSetup] = useState(initial.setup)
  const [menuOpen, setMenuOpen] = useState(false)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(BANNER_KEY) === '1'
    } catch {
      return false
    }
  })
  const menuRef = useRef<HTMLDivElement>(null)
  const scrollDraftsRef = useRef(initial.focusDrafts)

  useEffect(() => {
    window.location.hash = showSetup ? 'setup' : tab
  }, [tab, showSetup])

  useEffect(() => {
    const onHash = () => {
      const next = parseHash()
      setShowSetup(next.setup)
      if (!next.setup) setTab(next.tab)
      if (next.focusDrafts) scrollDraftsRef.current = true
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!data || showSetup || tab !== 'journal') return
    if (!scrollDraftsRef.current) return
    scrollDraftsRef.current = false
    const id = window.setTimeout(scrollToDrafts, 50)
    return () => window.clearTimeout(id)
  }, [data, showSetup, tab])

  useEffect(() => {
    if (!menuOpen) return
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const approvedCount = useMemo(
    () => data?.drafts.filter((d) => d.status === 'approved').length ?? 0,
    [data],
  )
  const draftsOpen = useMemo(
    () =>
      data?.drafts.filter(
        (d) => d.status !== 'approved' && d.status !== 'posted' && isShortEnough(d.text),
      ).length ?? 0,
    [data],
  )

  // After cloud/local load: if active project has no usable short pending drafts but has a journal,
  // regenerate once and flush so cloud never re-serves essay blobs.
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
    const usable = fresh.filter((d) => isShortEnough(d.text))
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
    return (
      <Login
        onPassphraseLogin={login}
        onEmailLogin={loginEmail}
        onSignup={signup}
      />
    )
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
      // Never keep overlong pending essays — product rule.
      if (d.status !== 'approved' && d.status !== 'posted' && !isShortEnough(d.text)) {
        return false
      }
      if (d.status === 'approved' || d.status === 'posted') return true
      if (!clearPendingForProjectId) return false
      if (d.projectId === clearPendingForProjectId) return false
      if (!d.projectId && clearPendingForProjectId === store.setup.activeProjectId) return false
      return true
    })
    // Only keep usable shorts from the fresh batch too (belt + suspenders).
    const usable = nextDrafts.filter((d) => isShortEnough(d.text))
    const next = { ...store, drafts: [...usable, ...kept] }
    if (immediate) persistImmediate(next)
    else persist(next)
  }

  function addDrafts(drafts: Draft[]) {
    // Replace pending for active project — don't append onto old long essays.
    clearPendingAndPrepend(drafts, store.setup.activeProjectId, true)
    setShowSetup(false)
    setTab('journal')
    scrollDraftsRef.current = true
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

  /** Clear pending for active project, then prepend fresh batch. Flush cloud immediately. */
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
  }

  function addFavoriteBuilder(handle: string) {
    const project = activeProject(store.setup)
    if (!project) return
    const h = normalizeHandle(handle)
    if (!h) return
    const have = project.favoriteBuilders.map(normalizeHandle).filter(Boolean)
    if (have.includes(h)) return
    persistImmediate({
      ...store,
      setup: {
        ...store.setup,
        projects: store.setup.projects.map((proj) =>
          proj.id === project.id ? { ...proj, favoriteBuilders: [...have, h] } : proj,
        ),
        updatedAt: new Date().toISOString(),
      },
    })
  }

  function removeFavoriteBuilder(handle: string) {
    const project = activeProject(store.setup)
    if (!project) return
    const n = normalizeHandle(handle)
    if (!n) return
    persistImmediate({
      ...store,
      setup: {
        ...store.setup,
        projects: store.setup.projects.map((proj) =>
          proj.id === project.id
            ? {
                ...proj,
                favoriteBuilders: proj.favoriteBuilders.filter((h) => normalizeHandle(h) !== n),
                builderTags: dropHandleTags(proj.builderTags, n),
              }
            : proj,
        ),
        updatedAt: new Date().toISOString(),
      },
    })
  }

  function setFavoriteBuilderTags(handle: string, tags: string[]) {
    const project = activeProject(store.setup)
    if (!project) return
    const h = normalizeHandle(handle)
    if (!h) return
    persistImmediate({
      ...store,
      setup: {
        ...store.setup,
        projects: store.setup.projects.map((proj) =>
          proj.id === project.id
            ? { ...proj, builderTags: setHandleTags(proj.builderTags, h, tags) }
            : proj,
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

  function badgeFor(t: Tab): number | null {
    if (t === 'feed') return approvedCount
    if (t === 'journal') return draftsOpen
    return null
  }

  function handleReset() {
    setMenuOpen(false)
    if (window.confirm('Reset to starter data?')) {
      persist(resetData())
      setShowSetup(false)
      setTab('journal')
    }
  }

  function openSetup() {
    setMenuOpen(false)
    setShowSetup(true)
  }

  function closeSetup() {
    setShowSetup(false)
    setTab('journal')
  }

  function dismissBanner() {
    setBannerDismissed(true)
    try {
      sessionStorage.setItem(BANNER_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  function goTab(id: Tab) {
    setShowSetup(false)
    setTab(id)
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

  return (
    <div className="min-h-dvh max-w-full overflow-x-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0">
      <header
        className="sticky top-0 z-20 border-b border-line bg-cream-2/90 backdrop-blur-md"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-2.5 sm:py-3">
          <Logo />
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 text-xs text-muted">
            <span
              className="hidden max-w-[9rem] truncate sm:inline font-semibold"
              title={statusLabel}
            >
              {statusLabel}
            </span>
            {!showSetup && (
              <button
                type="button"
                onClick={openSetup}
                aria-label="Open setup"
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm font-extrabold transition ${
                  isSetupEmpty(data.setup)
                    ? 'border-orange/45 bg-orange/15 text-orange-deep hover:bg-orange/25'
                    : 'border-line bg-card text-navy hover:border-orange/40'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Setup</span>
                {isSetupEmpty(data.setup) && (
                  <span className="hidden rounded-full bg-orange px-1.5 py-0.5 text-[10px] font-black text-white sm:inline">
                    Add
                  </span>
                )}
              </button>
            )}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="More options"
                aria-expanded={menuOpen}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line bg-card text-navy hover:border-orange/40"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <circle cx="5" cy="12" r="1.75" />
                  <circle cx="12" cy="12" r="1.75" />
                  <circle cx="19" cy="12" r="1.75" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-30 mt-1.5 min-w-[10.5rem] overflow-hidden rounded-2xl border border-line bg-card py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={openSetup}
                    className="block w-full px-4 py-2.5 text-left text-sm font-extrabold text-navy hover:bg-cream-2"
                  >
                    Your setup
                  </button>
                  {xConnection.configured ? (
                    xConnection.connected ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false)
                            openSetup()
                          }}
                          className="block w-full px-4 py-2.5 text-left text-sm font-extrabold text-navy hover:bg-cream-2"
                        >
                          Connected as @{xConnection.handle || 'x'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false)
                            void xConnection.disconnect()
                          }}
                          className="block w-full px-4 py-2.5 text-left text-sm font-extrabold text-navy hover:bg-cream-2"
                        >
                          Disconnect X
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          void xConnection.connect()
                        }}
                        className="block w-full px-4 py-2.5 text-left text-sm font-extrabold text-navy hover:bg-cream-2"
                      >
                        Connect X
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="block w-full px-4 py-2.5 text-left text-sm font-extrabold text-muted opacity-70"
                    >
                      X posting not configured
                    </button>
                  )}
                  {apiConfigured && (
                    <button
                      type="button"
                      onClick={() => void handleInviteFounder()}
                      disabled={inviteBusy}
                      className="block w-full px-4 py-2.5 text-left text-sm font-extrabold text-navy hover:bg-cream-2 disabled:opacity-60"
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
        </div>

      </header>


      {(inviteCode || inviteError) && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-navy/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Invite code"
          onClick={() => {
            setInviteCode(null)
            setInviteError(null)
          }}
        >
          <div
            className="card-soft w-full max-w-sm p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-base font-extrabold text-navy">Invite a founder</h2>
            {inviteError ? (
              <p className="mb-4 text-sm font-semibold text-red-700">{inviteError}</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted">
                  Copy this code once — it can only be used for one signup.
                </p>
                <p className="mb-4 select-all rounded-xl border border-line bg-cream-2 px-3 py-3 text-center font-mono text-lg font-extrabold tracking-wider text-navy">
                  {inviteCode}
                </p>
                <button
                  type="button"
                  className="btn-pill mb-2 flex min-h-11 w-full items-center justify-center text-sm"
                  onClick={() => {
                    if (inviteCode) void navigator.clipboard?.writeText(inviteCode)
                  }}
                >
                  Copy code
                </button>
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

      {(xConnection.banner || xConnection.error) && (
        <div className="mx-auto w-full max-w-3xl px-4 pt-3">
          <div
            className={`flex items-start justify-between gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold ${
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
        </div>
      )}

      <div className="mx-auto flex w-full max-w-5xl">
        {!showSetup && (
          <aside
            className="hidden w-56 shrink-0 sm:block"
            style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))' }}
          >
            <nav
              className="sticky top-20 mt-5 space-y-1 rounded-[28px] border border-line bg-card/90 p-2 shadow-sm"
              aria-label="Primary"
            >
              {TABS.map((t) => {
                const active = tab === t.id
                const badge = badgeFor(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => goTab(t.id)}
                    className={`flex w-full min-h-11 items-center gap-2.5 rounded-2xl px-3 text-left text-sm font-extrabold transition ${
                      active
                        ? 'bg-orange text-white shadow-[0_3px_0_#C9440A]'
                        : 'text-muted hover:bg-orange/10 hover:text-navy'
                    }`}
                  >
                    <TabIcon id={t.id} />
                    <span className="min-w-0 flex-1 truncate">{t.label}</span>
                    {badge !== null && badge > 0 && (
                      <span
                        className={`rounded-full px-1.5 text-[10px] font-black ${
                          active ? 'bg-white/20 text-white' : 'bg-orange/15 text-orange-deep'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>
        )}
        <div className="min-w-0 flex-1">
      <main
        className="mx-auto w-full max-w-3xl py-5 sm:py-8"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        {showSetup ? (
          <Setup setup={data.setup} onSave={saveSetup} onBack={closeSetup} xConnection={xConnection} />
        ) : (
          <>
            {tab === 'journal' && (
              <Today
                journals={data.journals}
                setup={data.setup}
                metrics={data.metrics}
                showSetupBanner={!bannerDismissed && isSetupEmpty(data.setup)}
                onSave={saveJournal}
                onGeneratedDrafts={addDrafts}
                onOpenSetup={openSetup}
                onSetActiveProject={setActiveProject}
                onDismissSetupBanner={dismissBanner}
                onSaveMetrics={(metrics) => persist({ ...store, metrics })}
              >
                <Drafts
                  drafts={data.drafts}
                  journals={data.journals}
                  setup={data.setup}
                  onUpdate={updateDraft}
                  onDelete={deleteDraft}
                  onRegen={regenDrafts}
                  xConnection={xConnection}
                  embedded
                />
              </Today>
            )}
            {tab === 'feed' && (
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
              />
            )}
            {tab === 'follows' && (
              <Follows
                favoriteBuilders={activeProject(data.setup)?.favoriteBuilders ?? []}
                builderTags={activeProject(data.setup)?.builderTags}
                onAdd={addFavoriteBuilder}
                onRemove={removeFavoriteBuilder}
                onSetTags={setFavoriteBuilderTags}
              />
            )}
          </>
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-24 pt-2 text-center text-[11px] font-bold text-muted sm:pb-10">
        <p>ShipLoud · you’re early · thanks for trying it</p>
        <p className="mt-2 flex items-center justify-center gap-3">
          <a
            href="https://www.getshiploud.com/privacy"
            className="transition hover:text-orange"
            target="_blank"
            rel="noreferrer"
          >
            Privacy
          </a>
          <span aria-hidden>·</span>
          <a
            href="https://www.getshiploud.com/terms"
            className="transition hover:text-orange"
            target="_blank"
            rel="noreferrer"
          >
            Terms
          </a>
          {isAdminRole(user?.role) && (
            <>
              <span aria-hidden>·</span>
              <a
                href="https://www.getshiploud.com/admin"
                className="transition hover:text-orange"
                target="_blank"
                rel="noreferrer"
              >
                Waitlist
              </a>
            </>
          )}
        </p>
      </footer>
        </div>
      </div>

      {!showSetup && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream-2/95 backdrop-blur-md sm:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          aria-label="Primary"
        >
          <div className="mx-auto grid max-w-3xl grid-cols-3">
            {TABS.map((t) => {
              const active = tab === t.id
              const badge = badgeFor(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => goTab(t.id)}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[10px] font-extrabold transition ${
                    active ? 'text-orange' : 'text-muted'
                  }`}
                >
                  <span className="relative inline-flex">
                    <TabIcon id={t.id} />
                    {badge !== null && badge > 0 && (
                      <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[9px] font-black text-white">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </span>
                  <span>{t.shortLabel}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
