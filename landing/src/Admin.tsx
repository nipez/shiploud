import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

const API_BASE = 'https://shiploud-api.nickperez.workers.dev'
const TOKEN_KEY = 'shiploud-admin-token'

type RangeKey = '7d' | '30d' | 'all'

type Insights = {
  range: { key: RangeKey; since: string | null; label: string }
  generated_at: string
  kpis: {
    waitlist: number
    users: number
    active_users: number
    invites_created: number
    invites_used: number
    events: number
    session_login: number
    journal_saved: number
    drafts_generated: number
    draft_copied: number
    x_posted: number
    x_replied: number
  }
  waitlist: { email: string; source: string; created_at: string }[]
  waitlist_by_source: { source: string; count: number }[]
  waitlist_by_day: { day: string; count: number }[]
  users: {
    id: string
    email: string
    display_name: string | null
    role: string
    created_at: string
  }[]
  invites: {
    code: string
    created_at: string
    used_at: string | null
    created_by_email: string | null
    created_by_name: string | null
    used_by_email: string | null
    used_by_name: string | null
  }[]
  events_by_name: { name: string; count: number }[]
  events_by_day: { day: string; count: number }[]
  funnel: { name: string; label: string; count: number }[]
  snapshots: {
    handle: string
    followers: number
    following: number | null
    posts_count: number | null
    checked_at: string
    source: string
  }[]
}

const SOURCE_LABELS: Record<string, string> = {
  'marketing-hero': 'Marketing hero',
  'marketing-pricing': 'Marketing pricing',
  marketing: 'Marketing',
}

const EVENT_LABELS: Record<string, string> = {
  session_login: 'Sessions started',
  setup_saved: 'Setup saved',
  journal_saved: 'Journals saved',
  drafts_generated: 'Drafts generated',
  draft_copied: 'Drafts copied',
  draft_saved_for_later: 'Saved for later',
  draft_marked_posted: 'Marked posted',
  reply_copied: 'Replies copied',
  reply_handle_clicked: 'Reply on X clicked',
  reply_radar_refreshed: 'Radar refreshed',
  x_followers_refreshed: 'Followers refreshed',
  x_connected: 'X connected',
  x_posted: 'Posted to X',
  x_replied: 'Replies posted',
}

function Logo({ className = '' }: { className?: string }) {
  return (
    <a href="/" className={`inline-flex items-center gap-2.5 font-black tracking-tight text-navy ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-orange shadow-[0_3px_0_#C9440A]" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
          <circle cx="11" cy="13" r="2.4" fill="#fff" />
          <circle cx="21" cy="13" r="2.4" fill="#fff" />
          <path d="M10 20c2.2 2.4 9.8 2.4 12 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      <span>
        Ship<span className="text-orange">Loud</span>
      </span>
    </a>
  )
}

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

function clearToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return day
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] || source
}

function eventLabel(name: string): string {
  return EVENT_LABELS[name] || name
}

function personLabel(name: string | null, email: string | null): string {
  if (name && email) return `${name} · ${email}`
  return name || email || '—'
}

function rangeStatus(insights: Insights | null, range: RangeKey): string {
  if (!insights) return 'Loading recorded ShipLoud tables…'
  if (range === 'all') return 'Showing All time · full recorded history.'
  const since = insights.range.since ? formatWhen(insights.range.since) : ''
  return `Showing ${insights.range.label}${since ? ` · since ${since}` : ''}.`
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: number
  hint?: string
  tone: 'sky' | 'mint' | 'yellow' | 'lilac' | 'pink' | 'orange' | 'cream'
}) {
  const tones: Record<typeof tone, string> = {
    sky: 'bg-sticker-sky/35',
    mint: 'bg-sticker-mint/40',
    yellow: 'bg-sticker-yellow/50',
    lilac: 'bg-sticker-lilac/40',
    pink: 'bg-sticker-pink/35',
    orange: 'bg-orange/15',
    cream: 'bg-cream-2',
  }
  return (
    <div className={`rounded-[22px] border-2 border-navy/10 px-4 py-4 ${tones[tone]}`}>
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums tracking-tight text-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs font-semibold text-muted">{hint}</p> : null}
    </div>
  )
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="card-soft overflow-hidden border-2 border-navy/10">
      <div className="border-b border-navy/8 px-5 py-4">
        <h2 className="text-lg font-black tracking-tight text-navy">{title}</h2>
        {hint ? <p className="mt-1 text-sm font-semibold text-muted">{hint}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm font-semibold text-muted">{children}</p>
}

function HBars({
  rows,
  color,
}: {
  rows: { label: string; count: number }[]
  color: string
}) {
  if (rows.length === 0) return <Empty>No data in this range.</Empty>
  const max = Math.max(...rows.map((r) => r.count), 0)
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const pct = max > 0 ? Math.max(row.count > 0 ? 4 : 0, Math.round((row.count / max) * 100)) : 0
        return (
          <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <p className="mb-1 truncate text-sm font-extrabold text-navy">{row.label}</p>
              <div className="h-2.5 overflow-hidden rounded-full bg-navy/8">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <span className="text-sm font-black tabular-nums text-navy">{row.count}</span>
          </div>
        )
      })}
    </div>
  )
}

function DayBars({ days, color }: { days: { day: string; count: number }[]; color: string }) {
  if (days.length === 0) return <Empty>No activity in this range.</Empty>
  const max = Math.max(...days.map((d) => d.count), 1)
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1.5 pt-6 pb-10" style={{ minWidth: Math.max(days.length * 28, 120) }}>
        {days.map((d) => {
          const h = d.count > 0 ? Math.max(6, Math.round((d.count / max) * 120)) : 3
          return (
            <div key={d.day} className="flex w-6 shrink-0 flex-col items-center" title={`${formatDay(d.day)}: ${d.count}`}>
              <span className="mb-1 text-[10px] font-extrabold tabular-nums text-navy">
                {d.count > 0 ? d.count : ''}
              </span>
              <div
                className={`w-4 rounded-t-md ${d.count > 0 ? color : 'bg-navy/10'}`}
                style={{ height: h }}
              />
              <span className="mt-1 origin-top-left -rotate-45 text-[9px] font-bold whitespace-nowrap text-muted">
                {formatDay(d.day)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Admin() {
  const [pass, setPass] = useState('')
  const [token, setToken] = useState<string | null>(() => readToken())
  const [range, setRange] = useState<RangeKey>('all')
  const [insights, setInsights] = useState<Insights | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(Boolean(readToken()))
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    document.title = 'Insights — ShipLoud'
  }, [])

  async function loadInsights(t: string, nextRange = range) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/admin/insights?range=${nextRange}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = (await res.json().catch(() => ({}))) as Insights & { error?: string }
      if (res.status === 401) {
        clearToken()
        setToken(null)
        setInsights(null)
        setError('Session expired — sign in again.')
        return
      }
      if (res.status === 403) {
        clearToken()
        setToken(null)
        setInsights(null)
        setError('Admin only.')
        return
      }
      if (!res.ok || !data.kpis || !Array.isArray(data.waitlist)) {
        setError(data.error || 'Could not load insights.')
        return
      }
      setInsights(data)
    } catch {
      setError('Network hiccup — try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) void loadInsights(token, range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, range])

  useEffect(() => {
    if (!insights) return
    if (window.location.pathname.replace(/\/+$/, '') === '/admin/waitlist') {
      document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [insights])

  async function onLogin(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        token?: string
        error?: string
        user?: { role?: string }
      }
      if (!res.ok || !data.token) {
        setError(data.error === 'invalid_pass' ? 'Wrong passphrase.' : 'Could not sign in.')
        return
      }
      if (data.user?.role && data.user.role !== 'admin') {
        setError('Admin only.')
        return
      }
      writeToken(data.token)
      setToken(data.token)
      setPass('')
    } catch {
      setError('Network hiccup — try again.')
    } finally {
      setBusy(false)
    }
  }

  function onLogout() {
    clearToken()
    setToken(null)
    setInsights(null)
    setError('')
  }

  async function copyEmails() {
    const text = (insights?.waitlist ?? []).map((r) => r.email).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Could not copy.')
    }
  }

  const kpis = insights?.kpis

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-navy/5 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo className="text-lg" />
          <div className="flex items-center gap-3">
            {token && (
              <button
                type="button"
                onClick={onLogout}
                className="text-sm font-bold text-navy/80 transition hover:text-orange"
              >
                Sign out
              </button>
            )}
            <a href="/" className="text-sm font-bold text-navy/80 transition hover:text-orange">
              ← Back to site
            </a>
          </div>
        </div>
      </header>

      <main className="px-4 py-10 sm:px-6 sm:py-12">
        {!token ? (
          <div className="card-soft mx-auto max-w-md border-2 border-navy/10 p-6 sm:p-8">
            <p className="font-script text-2xl text-orange">admin →</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-navy">Insights</h1>
            <p className="mt-2 text-sm font-semibold text-muted">
              Passphrase for Nicholas. Live stats from your D1 tables — not a public report.
            </p>
            <form onSubmit={onLogin} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-muted">
                  Passphrase
                </span>
                <input
                  type="password"
                  name="passphrase"
                  autoComplete="current-password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-full border-2 border-navy/10 bg-white px-4 py-3 text-sm font-semibold text-navy outline-none transition focus:border-orange focus:ring-4 focus:ring-orange/20 disabled:opacity-70"
                />
              </label>
              <button type="submit" disabled={busy || !pass.trim()} className="btn-pill w-full px-6 py-3 text-sm disabled:opacity-70">
                {busy ? 'Signing in…' : 'Open insights'}
              </button>
              {error && (
                <p className="text-sm font-bold text-orange-deep" role="alert">
                  {error}
                </p>
              )}
            </form>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="font-script text-2xl text-orange">admin →</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-navy sm:text-4xl">
                  ShipLoud insights
                </h1>
                <p className="mt-2 text-sm font-semibold text-muted">
                  Live stats from your D1 tables. Waitlist, founders, invites, and product events — not Google Analytics.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="insights-range">
                  Date range
                </label>
                <select
                  id="insights-range"
                  value={range}
                  onChange={(e) => setRange(e.target.value as RangeKey)}
                  className="rounded-full border-2 border-navy/10 bg-white px-4 py-2.5 text-sm font-extrabold text-navy outline-none focus:border-orange"
                >
                  <option value="all">All time</option>
                  <option value="30d">Last 30 days</option>
                  <option value="7d">Last 7 days</option>
                </select>
                <button
                  type="button"
                  onClick={() => token && void loadInsights(token, range)}
                  disabled={loading}
                  className="btn-pill px-5 py-2.5 text-sm disabled:opacity-70"
                >
                  {loading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border-2 border-navy/10 bg-sticker-sky/25 px-4 py-3 text-sm font-extrabold text-navy">
              {rangeStatus(insights, range)}
            </div>

            {error && (
              <p className="mb-4 text-sm font-bold text-orange-deep" role="alert">
                {error}
              </p>
            )}

            <section className="mb-6">
              <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-muted">Audience</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Waitlist" value={kpis?.waitlist ?? 0} hint="Marketing signups" tone="sky" />
                <KpiCard label="Users" value={kpis?.users ?? 0} hint="Accounts created" tone="mint" />
                <KpiCard label="Active builders" value={kpis?.active_users ?? 0} hint="Users with events" tone="yellow" />
                <KpiCard label="Sessions" value={kpis?.session_login ?? 0} hint="session_login events" tone="lilac" />
              </div>
            </section>

            <section className="mb-6">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted">Write → post → reply</p>
                <p className="text-sm font-semibold text-muted">
                  Counted from product events. Empty cells are zeros, not estimates.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Journals saved" value={kpis?.journal_saved ?? 0} tone="yellow" />
                <KpiCard label="Drafts generated" value={kpis?.drafts_generated ?? 0} tone="lilac" />
                <KpiCard label="Posted to X" value={kpis?.x_posted ?? 0} hint="Original posts via API" tone="pink" />
                <KpiCard label="Replies posted" value={kpis?.x_replied ?? 0} hint="I posted it" tone="orange" />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <KpiCard label="Drafts copied" value={kpis?.draft_copied ?? 0} tone="cream" />
                <KpiCard
                  label="Invites"
                  value={kpis?.invites_created ?? 0}
                  hint={`${kpis?.invites_used ?? 0} used`}
                  tone="cream"
                />
                <KpiCard label="Events" value={kpis?.events ?? 0} hint="All tracked actions" tone="cream" />
              </div>
            </section>

            <div id="waitlist" className="mb-6 scroll-mt-24">
              <Panel
                title="Waitlist signups"
                hint={`${insights?.waitlist.length ?? 0} ${(insights?.waitlist.length ?? 0) === 1 ? 'email' : 'emails'} in this range.`}
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyEmails()}
                    disabled={!insights?.waitlist.length}
                    className="rounded-full border-2 border-navy/10 bg-white px-4 py-2 text-sm font-extrabold text-navy transition hover:border-orange/40 disabled:opacity-70"
                  >
                    {copied ? 'Copied' : 'Copy emails'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-navy/10 bg-cream-2 text-xs font-extrabold uppercase tracking-wide text-muted">
                        <th className="px-3 py-3">Signed up</th>
                        <th className="px-3 py-3">Email</th>
                        <th className="px-3 py-3">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && !insights ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-10 text-center font-semibold text-muted">
                            Loading waitlist…
                          </td>
                        </tr>
                      ) : !insights?.waitlist.length ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-10 text-center font-semibold text-muted">
                            No signups in this range.
                          </td>
                        </tr>
                      ) : (
                        insights.waitlist.map((r) => (
                          <tr key={`${r.email}-${r.created_at}`} className="border-b border-navy/5 odd:bg-cream-2/60 last:border-0">
                            <td className="px-3 py-3 font-semibold whitespace-nowrap text-muted">
                              {formatWhen(r.created_at)}
                            </td>
                            <td className="px-3 py-3 font-extrabold text-navy">{r.email}</td>
                            <td className="px-3 py-3 font-semibold text-muted">{sourceLabel(r.source)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-2 lg:items-start">
              <Panel title="Waitlist by source" hint="Where the email form was submitted.">
                <HBars
                  color="bg-sticker-sky"
                  rows={(insights?.waitlist_by_source ?? []).map((r) => ({
                    label: sourceLabel(r.source),
                    count: r.count,
                  }))}
                />
              </Panel>
              <Panel title="Product funnel" hint="Same person can fire a step more than once.">
                <HBars
                  color="bg-sticker-pink"
                  rows={(insights?.funnel ?? []).map((r) => ({
                    label: r.label,
                    count: r.count,
                  }))}
                />
              </Panel>
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-2 lg:items-start">
              <Panel title="Events by name" hint="Allowlisted product actions only.">
                <HBars
                  color="bg-orange"
                  rows={(insights?.events_by_name ?? []).map((r) => ({
                    label: eventLabel(r.name),
                    count: r.count,
                  }))}
                />
              </Panel>
              <Panel
                title="Latest public follower snapshots"
                hint="fxtwitter profile checks — not X analytics, and not filtered by range."
              >
                {!insights?.snapshots.length ? (
                  <Empty>No snapshots stored yet.</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[28rem] text-left text-sm">
                      <thead>
                        <tr className="border-b border-navy/10 text-xs font-extrabold uppercase tracking-wide text-muted">
                          <th className="pb-2">Handle</th>
                          <th className="pb-2">Followers</th>
                          <th className="pb-2">Checked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insights.snapshots.map((s) => (
                          <tr key={s.handle} className="border-b border-navy/5 last:border-0">
                            <td className="py-2 font-extrabold text-navy">@{s.handle}</td>
                            <td className="py-2 font-black tabular-nums text-navy">{s.followers}</td>
                            <td className="py-2 font-semibold text-muted">{formatWhen(s.checked_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-2 lg:items-start">
              <Panel title="Founders" hint="Accounts created in this range.">
                {!insights?.users.length ? (
                  <Empty>No users in this range.</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[28rem] text-left text-sm">
                      <thead>
                        <tr className="border-b border-navy/10 text-xs font-extrabold uppercase tracking-wide text-muted">
                          <th className="pb-2">Name</th>
                          <th className="pb-2">Email</th>
                          <th className="pb-2">Role</th>
                          <th className="pb-2">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insights.users.map((u) => (
                          <tr key={u.id} className="border-b border-navy/5 last:border-0">
                            <td className="py-2 font-extrabold text-navy">{u.display_name || '—'}</td>
                            <td className="py-2 font-semibold text-muted">{u.email}</td>
                            <td className="py-2 font-semibold text-muted">{u.role}</td>
                            <td className="py-2 font-semibold whitespace-nowrap text-muted">
                              {formatWhen(u.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
              <Panel title="Invites" hint="Invite codes created in this range.">
                {!insights?.invites.length ? (
                  <Empty>No invites in this range.</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[28rem] text-left text-sm">
                      <thead>
                        <tr className="border-b border-navy/10 text-xs font-extrabold uppercase tracking-wide text-muted">
                          <th className="pb-2">Code</th>
                          <th className="pb-2">Created by</th>
                          <th className="pb-2">Used by</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insights.invites.map((i) => (
                          <tr key={i.code} className="border-b border-navy/5 last:border-0">
                            <td className="py-2 font-extrabold text-navy">{i.code}</td>
                            <td className="py-2 font-semibold text-muted">
                              {personLabel(i.created_by_name, i.created_by_email)}
                            </td>
                            <td className="py-2 font-semibold text-muted">
                              {i.used_at
                                ? `${personLabel(i.used_by_name, i.used_by_email)} · ${formatWhen(i.used_at)}`
                                : 'Open'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>

            <div className="mb-6 grid gap-6">
              <Panel
                title="Waitlist per day"
                hint={`${insights?.waitlist_by_day.length ?? 0} days in this range.`}
              >
                <DayBars days={insights?.waitlist_by_day ?? []} color="bg-sticker-sky" />
              </Panel>
              <Panel
                title="Product events per day"
                hint={`${insights?.events_by_day.length ?? 0} days in this range.`}
              >
                <DayBars days={insights?.events_by_day ?? []} color="bg-orange" />
              </Panel>
            </div>

            <footer className="flex flex-col gap-2 border-t border-navy/10 pt-5 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
              <p>
                Generated {insights?.generated_at ? formatWhen(insights.generated_at) : '—'}. Internal
                ShipLoud data (not Google Analytics).
              </p>
              <a href="/" className="font-extrabold text-navy transition hover:text-orange">
                ← Back to site
              </a>
            </footer>
          </div>
        )}
      </main>
    </div>
  )
}
