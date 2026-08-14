import { useState } from 'react'
import type { Draft, ReplyTarget, Setup } from '../types'
import { uid } from '../storage'
import { ensureHttps, tweetIdFromUrl, xReplyIntentUrl } from '../url'
import { track } from '../track'
import RadarFeed from './RadarFeed'
import PostToX from './PostToX'
import type { XConnectionState } from '../useXConnection'
import type { FormEvent } from 'react'

type Props = {
  drafts: Draft[]
  replies: ReplyTarget[]
  setup: Setup
  onMarkPosted: (id: string) => void
  onMarkReplied: (id: string) => void
  onAddReply: (r: ReplyTarget) => void
  xConnection: XConnectionState
}

export default function Queue({
  drafts,
  replies,
  setup,
  onMarkPosted,
  onMarkReplied,
  onAddReply,
  xConnection,
}: Props) {
  const approved = drafts
    .filter((d) => d.status === 'approved')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const todoReplies = replies
    .filter((r) => r.status === 'todo')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const [copied, setCopied] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [account, setAccount] = useState('')
  const [postSummary, setPostSummary] = useState('')
  const [url, setUrl] = useState('')
  const [suggestedReply, setSuggestedReply] = useState('')

  async function copy(id: string, text: string, kind: 'draft' | 'reply' = 'draft') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      track(kind === 'reply' ? 'reply_copied' : 'draft_copied')
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      window.prompt('Copy manually:', text)
      track(kind === 'reply' ? 'reply_copied' : 'draft_copied')
    }
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!account.trim() || !suggestedReply.trim()) return
    onAddReply({
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
    setShowAdd(false)
  }

  return (
    <section className="space-y-6 sm:space-y-8">
      <header className="space-y-1">
        <h2 className="text-xl font-extrabold tracking-tight text-navy sm:text-2xl">
          {xConnection.connected ? 'Post to X, or copy.' : 'Copy → paste into X.'}
        </h2>
        <p className="text-sm text-muted">
          {approved.length === 0
            ? 'Nothing ready yet — approve a draft first.'
            : `${approved.length} ready to ship.`}
          {xConnection.connected
            ? ' Posts from your account. Radar still uses public posts.'
            : ''}
        </p>
      </header>

      <div className="space-y-3">
        {approved.length === 0 && (
          <p className="rounded-[28px] border border-dashed border-line bg-card/60 px-4 py-6 text-center text-sm font-semibold text-muted">
            No posts saved for later. Save a draft from Journal.
          </p>
        )}
        {approved.map((d) => (
          <article key={d.id} className="card-soft overflow-hidden border-orange/25">
            <div className="break-words px-3 py-3 text-base font-semibold leading-relaxed whitespace-pre-wrap text-navy sm:px-4 sm:py-4 sm:text-sm">
              {d.text}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line px-3 py-2.5 sm:px-4 sm:py-3">
              <PostToX
                text={d.text}
                connected={xConnection.connected}
                configured={xConnection.configured}
                handle={xConnection.handle}
                onConnect={() => void xConnection.connect()}
                onPosted={() => {
                  onMarkPosted(d.id)
                  track('draft_marked_posted')
                }}
              />
              <button
                type="button"
                onClick={() => void copy(d.id, d.text, 'draft')}
                className={
                  xConnection.connected
                    ? 'min-h-11 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-extrabold text-navy hover:border-orange/40'
                    : 'btn-pill min-h-11 px-4 py-2.5 text-sm'
                }
              >
                {copied === d.id ? 'Copied ✓' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onMarkPosted(d.id)
                  track('draft_marked_posted')
                }}
                className="min-h-11 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-extrabold text-navy hover:border-orange/40"
              >
                Mark posted
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="space-y-3 border-t border-line pt-6">
        <RadarFeed setup={setup} />

        {(todoReplies.length > 0 || showAdd) && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Saved replies</p>
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="min-h-9 rounded-full border border-line bg-card px-3 text-xs font-extrabold text-navy hover:border-orange/40"
            >
              {showAdd ? 'Cancel' : 'Add'}
            </button>
          </div>
        )}

        {showAdd && (
          <form onSubmit={handleAdd} className="card-soft space-y-3 p-4 sm:p-5">
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
              placeholder="What they posted (optional)"
              className="input-soft min-h-11 w-full text-sm"
            />
            <textarea
              value={suggestedReply}
              onChange={(e) => setSuggestedReply(e.target.value)}
              placeholder="Your reply…"
              rows={3}
              required
              className="input-soft w-full resize-y text-base leading-relaxed sm:text-sm"
            />
            <button type="submit" className="btn-pill min-h-11 px-5 py-2.5 text-sm">
              Save reply
            </button>
          </form>
        )}

        {todoReplies.map((r) => {
          const href = ensureHttps(r.url)
          const replyToId = tweetIdFromUrl(r.url)
          return (
            <article key={r.id} className="card-soft overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-line bg-cream-2/80 px-3 py-2 sm:px-4 sm:py-2.5">
                <span className="font-extrabold text-orange">{r.account}</span>
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
              {r.postSummary && (
                <p className="break-words px-3 pt-2.5 text-sm font-semibold text-muted sm:px-4 sm:pt-3">
                  {r.postSummary}
                </p>
              )}
              <div className="break-words px-3 py-2.5 text-base font-semibold leading-relaxed whitespace-pre-wrap text-navy sm:px-4 sm:py-3 sm:text-sm">
                {r.suggestedReply}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5 sm:px-4 sm:py-3">
                {replyToId ? (
                  <a
                    href={xReplyIntentUrl(replyToId, r.suggestedReply)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => track('x_reply_intent', { handle: r.account })}
                    className="btn-pill min-h-12 px-6 py-3 text-base"
                  >
                    Reply on X
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => void copy(r.id, r.suggestedReply, 'reply')}
                  className={
                    replyToId
                      ? 'min-h-11 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-extrabold text-navy hover:border-orange/40'
                      : 'btn-pill min-h-11 px-4 py-2.5 text-sm'
                  }
                >
                  {copied === r.id ? 'Copied ✓' : 'Copy reply'}
                </button>
                <button
                  type="button"
                  onClick={() => onMarkReplied(r.id)}
                  className="min-h-11 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-extrabold text-navy hover:border-orange/40"
                >
                  Done
                </button>
                {replyToId ? (
                  <p className="basis-full text-xs font-semibold text-muted">
                    X blocks apps from sending replies. This opens X with your text ready.
                  </p>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
