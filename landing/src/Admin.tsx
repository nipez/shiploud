import { useEffect, useState, type FormEvent } from 'react'

const API_BASE = 'https://shiploud-api.nickperez.workers.dev'
const TOKEN_KEY = 'shiploud-admin-token'

type WaitlistRow = {
  email: string
  source: string
  created_at: string
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

export default function Admin() {
  const [pass, setPass] = useState('')
  const [token, setToken] = useState<string | null>(() => readToken())
  const [rows, setRows] = useState<WaitlistRow[]>([])
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [loadingList, setLoadingList] = useState(Boolean(readToken()))
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    document.title = 'Waitlist — ShipLoud'
  }, [])

  async function loadList(t: string) {
    setLoadingList(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/waitlist`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = (await res.json().catch(() => ({}))) as {
        emails?: WaitlistRow[]
        count?: number
        error?: string
      }
      if (res.status === 401) {
        clearToken()
        setToken(null)
        setRows([])
        setCount(0)
        setError('Session expired — sign in again.')
        return
      }
      if (res.status === 403) {
        clearToken()
        setToken(null)
        setRows([])
        setCount(0)
        setError('Admin only.')
        return
      }
      if (!res.ok || !Array.isArray(data.emails)) {
        setError(data.error || 'Could not load waitlist.')
        return
      }
      setRows(data.emails)
      setCount(typeof data.count === 'number' ? data.count : data.emails.length)
    } catch {
      setError('Network hiccup — try again.')
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (token) void loadList(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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
    setRows([])
    setCount(0)
    setError('')
  }

  async function copyEmails() {
    const text = rows.map((r) => r.email).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Could not copy.')
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-navy/5 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
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
              ← Home
            </a>
          </div>
        </div>
      </header>

      <main className="px-4 py-12 sm:px-6 sm:py-16">
        {!token ? (
          <div className="card-soft mx-auto max-w-md border-2 border-navy/10 p-6 sm:p-8">
            <p className="font-script text-2xl text-orange">admin →</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-navy">Waitlist</h1>
            <p className="mt-2 text-sm font-semibold text-muted">
              Passphrase for Nicholas. Not a public list.
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
                {busy ? 'Signing in…' : 'Open waitlist'}
              </button>
              {error && (
                <p className="text-sm font-bold text-orange-deep" role="alert">
                  {error}
                </p>
              )}
            </form>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-script text-2xl text-orange">admin →</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-navy sm:text-4xl">Waitlist</h1>
                <p className="mt-2 text-sm font-semibold text-muted">
                  {loadingList ? 'Loading…' : `${count} ${count === 1 ? 'email' : 'emails'}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => token && void loadList(token)}
                  disabled={loadingList}
                  className="rounded-full border-2 border-navy/10 bg-white px-4 py-2.5 text-sm font-extrabold text-navy transition hover:border-orange/40 disabled:opacity-70"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void copyEmails()}
                  disabled={rows.length === 0}
                  className="btn-pill px-5 py-2.5 text-sm disabled:opacity-70"
                >
                  {copied ? 'Copied' : 'Copy emails'}
                </button>
              </div>
            </div>

            {error && (
              <p className="mb-4 text-sm font-bold text-orange-deep" role="alert">
                {error}
              </p>
            )}

            <div className="card-soft overflow-hidden border-2 border-navy/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-navy/10 bg-cream-2 text-xs font-extrabold uppercase tracking-wide text-muted">
                      <th className="px-4 py-3 sm:px-5">Email</th>
                      <th className="px-4 py-3 sm:px-5">Source</th>
                      <th className="px-4 py-3 sm:px-5">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingList && rows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-10 text-center font-semibold text-muted">
                          Loading waitlist…
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-10 text-center font-semibold text-muted">
                          No emails yet.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.email} className="border-b border-navy/5 last:border-0">
                          <td className="px-4 py-3 font-extrabold text-navy sm:px-5">{r.email}</td>
                          <td className="px-4 py-3 font-semibold text-muted sm:px-5">{r.source}</td>
                          <td className="px-4 py-3 font-semibold text-muted sm:px-5">{formatWhen(r.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
