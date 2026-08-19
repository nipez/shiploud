import { useEffect, useState, type ReactNode } from 'react'
import { fetchAdminPeople, type AdminUserRow, type AdminWaitlistRow } from '../api'
import { ScreenHead } from './ScreenHead'

const SOURCE_LABELS: Record<string, string> = {
  'marketing-hero': 'Hero',
  'marketing-pricing': 'Pricing',
  marketing: 'Marketing',
}

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] || source
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function People() {
  const [waitlist, setWaitlist] = useState<AdminWaitlistRow[] | null>(null)
  const [users, setUsers] = useState<AdminUserRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchAdminPeople()
        if (cancelled) return
        setWaitlist(next.waitlist)
        setUsers(next.users)
        setError(null)
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'people_failed'
        setError(msg === 'forbidden' ? 'Admin only.' : msg === 'unauthorized' ? 'Sign in again.' : 'Couldn’t load people.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function copyWaitlist() {
    const text = (waitlist ?? []).map((r) => r.email).join('\n')
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Copy emails:', text)
    }
  }

  return (
    <section>
      <ScreenHead
        eyebrow="admin →"
        title="People"
        sub="Waitlist emails and founder accounts from D1. Same lists as Insights — not a guess."
        action={
          <a
            href="https://www.getshiploud.com/admin"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-4 py-[9px] text-[12.5px] font-extrabold text-navy hover:border-navy"
          >
            Full insights →
          </a>
        }
      />
      {error && (
        <p className="mb-4 text-sm font-semibold text-orange-deep" role="alert">
          {error}
        </p>
      )}
      <div className="grid items-start gap-6 min-[900px]:grid-cols-2">
        <ListCard
          title="Waitlist"
          hint={waitlist ? `${waitlist.length} signup${waitlist.length === 1 ? '' : 's'}` : 'Loading…'}
          action={
            <button
              type="button"
              onClick={() => void copyWaitlist()}
              disabled={!waitlist?.length}
              className="text-[12.5px] font-black text-orange hover:text-orange-deep disabled:opacity-40"
            >
              {copied ? 'Copied' : 'Copy emails'}
            </button>
          }
        >
          {waitlist == null ? (
            <p className="px-4 py-8 text-center text-sm font-bold text-muted">Loading waitlist…</p>
          ) : waitlist.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm font-bold text-muted">No waitlist emails yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {waitlist.map((r) => (
                <li key={`${r.email}-${r.created_at}`} className="flex flex-col gap-0.5 px-4 py-3">
                  <span className="break-all text-[13.5px] font-black text-navy">{r.email}</span>
                  <span className="text-[11.5px] font-bold text-muted">
                    {formatWhen(r.created_at)} · {sourceLabel(r.source)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ListCard>
        <ListCard
          title="Users"
          hint={users ? `${users.length} account${users.length === 1 ? '' : 's'}` : 'Loading…'}
        >
          {users == null ? (
            <p className="px-4 py-8 text-center text-sm font-bold text-muted">Loading users…</p>
          ) : users.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm font-bold text-muted">No accounts yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {users.map((u) => (
                <li key={u.id} className="flex flex-col gap-0.5 px-4 py-3">
                  <span className="text-[13.5px] font-black text-navy">{u.display_name || u.email}</span>
                  <span className="break-all text-[11.5px] font-bold text-muted">
                    {u.display_name ? `${u.email} · ` : ''}
                    {u.role} · {formatWhen(u.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ListCard>
      </div>
    </section>
  )
}

function ListCard({
  title,
  hint,
  action,
  children,
}: {
  title: string
  hint: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="card-soft overflow-hidden rounded-3xl">
      <div className="flex items-center gap-2 border-b border-line bg-cream-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-black text-navy">{title}</p>
          <p className="text-[11.5px] font-bold text-muted">{hint}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
