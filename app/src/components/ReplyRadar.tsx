import { useState } from 'react'
import type { ReplyStatus, ReplyTarget } from '../types'
import { uid } from '../storage'
import { ensureHttps } from '../url'
import type { FormEvent, ReactNode } from 'react'

type Props = {
  replies: ReplyTarget[]
  onAdd: (r: ReplyTarget) => void
  onUpdate: (id: string, patch: Partial<ReplyTarget>) => void
  onDelete: (id: string) => void
}

export default function ReplyRadar({ replies, onAdd, onUpdate, onDelete }: Props) {
  const [account, setAccount] = useState('')
  const [postSummary, setPostSummary] = useState('')
  const [url, setUrl] = useState('')
  const [suggestedReply, setSuggestedReply] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!account.trim() || !suggestedReply.trim()) return
    onAdd({
      id: uid('reply'),
      account: account.trim(),
      postSummary: postSummary.trim(),
      url: ensureHttps(url) || url.trim(),
      suggestedReply: suggestedReply.trim(),
      status: 'todo',
      createdAt: new Date().toISOString(),
    })
    setAccount('')
    setPostSummary('')
    setUrl('')
    setSuggestedReply('')
  }

  async function copyReply(r: ReplyTarget) {
    try {
      await navigator.clipboard.writeText(r.suggestedReply)
      setCopiedId(r.id)
      window.setTimeout(() => setCopiedId(null), 1500)
    } catch {
      window.prompt('Copy manually:', r.suggestedReply)
    }
  }

  const sorted = replies.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-extrabold uppercase tracking-wider text-orange">03 · Reply radar</p>
        <h2 className="text-xl font-extrabold tracking-tight text-navy sm:text-2xl">Who to engage</h2>
        <p className="text-sm text-muted">
          Manual targets for now. Seeded with 3 indie-hacker style examples.
        </p>
      </header>

      <form onSubmit={handleAdd} className="card-soft space-y-3 p-4 sm:p-5">
        <p className="text-sm font-extrabold text-navy">Add reply target</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="@account"
            className="input-soft min-h-11 text-sm"
            required
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://x.com/…"
            className="input-soft min-h-11 font-mono text-sm"
          />
        </div>
        <input
          value={postSummary}
          onChange={(e) => setPostSummary(e.target.value)}
          placeholder="Post summary"
          className="input-soft min-h-11 w-full text-sm"
        />
        <textarea
          value={suggestedReply}
          onChange={(e) => setSuggestedReply(e.target.value)}
          placeholder="Suggested reply…"
          rows={4}
          required
          className="input-soft w-full resize-y text-base leading-relaxed sm:text-sm"
        />
        <button type="submit" className="btn-pill min-h-11 px-5 py-2.5 text-sm">
          Add target
        </button>
      </form>

      <ul className="space-y-4">
        {sorted.map((r) => {
          const href = ensureHttps(r.url)
          return (
            <li key={r.id} className="card-soft overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-line bg-cream-2/80 px-4 py-2.5">
                <span className="font-extrabold text-orange">{r.account}</span>
                <StatusPill status={r.status} />
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex min-h-11 items-center text-sm font-bold text-muted hover:text-orange"
                  >
                    open ↗
                  </a>
                )}
              </div>
              <div className="space-y-3 px-4 py-3">
                {r.postSummary && (
                  <p className="break-words text-sm font-semibold text-muted">{r.postSummary}</p>
                )}
                <div className="break-words rounded-2xl border border-line bg-cream-2 px-3 py-3 text-base font-semibold leading-relaxed whitespace-pre-wrap text-navy sm:text-sm">
                  {r.suggestedReply}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
                <button
                  type="button"
                  onClick={() => void copyReply(r)}
                  className="btn-pill min-h-11 px-4 py-2.5 text-sm"
                >
                  {copiedId === r.id ? 'Copied ✓' : 'Copy reply'}
                </button>
                {r.status === 'todo' && (
                  <>
                    <SmallBtn onClick={() => onUpdate(r.id, { status: 'replied' })}>
                      Mark replied
                    </SmallBtn>
                    <SmallBtn onClick={() => onUpdate(r.id, { status: 'skipped' })}>
                      Skip
                    </SmallBtn>
                  </>
                )}
                {r.status !== 'todo' && (
                  <SmallBtn onClick={() => onUpdate(r.id, { status: 'todo' })}>Reopen</SmallBtn>
                )}
                <SmallBtn danger onClick={() => onDelete(r.id)}>
                  Delete
                </SmallBtn>
              </div>
            </li>
          )
        })}
        {sorted.length === 0 && (
          <li className="rounded-[28px] border border-dashed border-line bg-card/60 px-4 py-8 text-center text-sm font-semibold text-muted">
            No reply targets yet. Add one above.
          </li>
        )}
      </ul>
    </section>
  )
}

function StatusPill({ status }: { status: ReplyStatus }) {
  const map: Record<ReplyStatus, string> = {
    todo: 'border-orange/30 text-orange-deep bg-orange/10',
    replied: 'border-line text-muted bg-cream',
    skipped: 'border-navy/15 text-muted bg-cream-2',
  }
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${map[status]}`}
    >
      {status}
    </span>
  )
}

function SmallBtn({
  children,
  onClick,
  danger,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 py-2.5 text-sm font-extrabold ${
        danger
          ? 'border-red-300 bg-red-50 text-red-700'
          : 'border-line bg-card text-navy hover:border-orange/40'
      }`}
    >
      {children}
    </button>
  )
}
